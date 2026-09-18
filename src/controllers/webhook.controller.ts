import { Request, Response } from 'express';
import { BotOrchestrator, IncomingMessageEvent } from '../orchestrator/bot.orchestrator';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { EvolutionService } from '../services/evolution.service';
import { GroqService } from '../services/groq.service';
import { TursoService } from '../services/turso.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { WispHubService } from '../services/wisphub.service';
import { Logger } from '../utils/logger';
import { LidRegistry } from '../utils/lid-registry';

const logger = new Logger('WebhookController');

export class WebhookController {
  private static processedMessageIds = new Map<string, number>();
  private static messageBuffers = new Map<string, {
    texts: string[];
    timeout: NodeJS.Timeout;
    event: IncomingMessageEvent;
  }>();

  /**
   * Cancela cualquier búfer o respuesta automática pendiente para un teléfono
   */
  static cancelPendingDebounce(phone: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    const entry = this.messageBuffers.get(cleanPhone);
    if (entry) {
      clearTimeout(entry.timeout);
      this.messageBuffers.delete(cleanPhone);
      logger.info(`[Debounce] Búfer y respuesta cancelados para ${cleanPhone} por intervención humana.`);
    }
  }

  private static isDuplicate(messageId: string): boolean {
    const now = Date.now();
    // Limpiar entradas antiguas (más de 60s)
    for (const [id, timestamp] of this.processedMessageIds.entries()) {
      if (now - timestamp > 60000) {
        this.processedMessageIds.delete(id);
      }
    }
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    this.processedMessageIds.set(messageId, now);
    return false;
  }

  /**
   * Sincroniza mapeos existentes de Teléfono <-> LID desde los mensajes de Evolution API al arrancar
   */
  static async syncLidMappings(): Promise<void> {
    try {
      const evoUrl = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
      const evoKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
      const instance = SettingsService.get('INSTANCE_NAME', 'INSTANCE_NAME', config.evolution.instanceName);

      const url = `${evoUrl}/chat/findMessages/${instance}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: evoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: { key: { fromMe: false } },
          orderBy: { messageTimestamp: 'desc' },
          take: 100,
        }),
      });
      if (!res.ok) return;
      const data: any = await res.json();
      const records = data.messages?.records || [];
      for (const m of records) {
        const k = m.key;
        if (k?.remoteJid?.endsWith('@lid') && k?.remoteJidAlt?.includes('@s.whatsapp.net')) {
          const phone = k.remoteJidAlt.split('@')[0].replace(/\D/g, '');
          LidRegistry.register(phone, k.remoteJid.trim());
        }
      }
      logger.info(`Sincronizados ${LidRegistry.count()} mapeos WhatsApp LID en memoria.`);
    } catch (err: any) {
      logger.warn('No se pudieron precargar mapeos LID al inicio:', err?.message || err);
    }
  }

  private static extractPhone(key: any, data: any): string {
    const remoteJid: string = key?.remoteJid || '';
    const remoteJidAlt: string = key?.remoteJidAlt || '';
    const participant: string = key?.participant || '';
    const senderPnJid: string = data?.senderPnJid || '';

    // Si viene remoteJidAlt con @s.whatsapp.net (modo LID activo)
    if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
      const realPhone = remoteJidAlt.split('@')[0].replace(/\D/g, '');
      if (remoteJid.endsWith('@lid')) {
        LidRegistry.register(realPhone, remoteJid.trim());
      }
      return realPhone;
    }

    // Si viene participant con @s.whatsapp.net
    if (participant && participant.includes('@s.whatsapp.net')) {
      const realPhone = participant.split('@')[0].replace(/\D/g, '');
      if (remoteJid.endsWith('@lid')) {
        LidRegistry.register(realPhone, remoteJid.trim());
      }
      return realPhone;
    }

    // Si viene senderPnJid
    if (senderPnJid && senderPnJid.includes('@s.whatsapp.net')) {
      const realPhone = senderPnJid.split('@')[0].replace(/\D/g, '');
      return realPhone;
    }

    // Si el remoteJid directo es un número telefónico estándar
    if (remoteJid.includes('@s.whatsapp.net')) {
      return remoteJid.split('@')[0].replace(/\D/g, '');
    }

    // Si es un LID (@lid), consultar el registro
    if (remoteJid.endsWith('@lid')) {
      const resolved = LidRegistry.getPhone(remoteJid);
      if (resolved) {
        return resolved;
      }
      return remoteJid.replace('@lid', '').replace(/\D/g, '');
    }

    return remoteJid.replace(/\D/g, '');
  }

  /**
   * Recibe eventos de Evolution API (messages.upsert)
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    // Respondemos de inmediato HTTP 200 para que Evolution API no reintente ni bloquee la cola
    res.status(200).json({ received: true });

    try {
      const payload = req.body;
      const rawEvent = String(payload?.event || payload?.type || '');
      const normalizedEvent = rawEvent.toLowerCase().replace(/_/g, '.');

      // Solo procesamos eventos de nuevos mensajes
      if (normalizedEvent && normalizedEvent !== 'messages.upsert') {
        logger.debug(`Evento ignorado: ${rawEvent}`);
        return;
      }

      // El mensaje puede venir en payload.data o payload directo
      const data = payload?.data || payload;
      const messageObj = Array.isArray(data) ? data[0] : data;

      if (!messageObj || !messageObj.key) {
        return;
      }

      const key = messageObj.key;
      const fromMe = key.fromMe;
      const remoteJid: string = key.remoteJid || '';
      const messageId: string = key.id || '';

      // Regla: Ignorar mensajes duplicados (mismo id procesado en los últimos 60 seg)
      if (messageId && WebhookController.isDuplicate(messageId)) {
        logger.debug(`Mensaje duplicado descartado: ${messageId}`);
        return;
      }

      // Regla: Detección de mensajes salientes (fromMe)
      if (fromMe) {
        // 1. Si fue enviado por nuestro bot a través de la API, lo ignoramos normalmente
        if (messageId && EvolutionService.esMensajeEnviadoPorBot(messageId)) {
          return;
        }

        // 2. Si NO fue enviado por el bot -> ¡Un operador humano respondió manualmente desde WhatsApp Web o su celular!
        const phone = WebhookController.extractPhone(key, data);
        const extracted = WebhookController.extractMessageContent(messageObj);
        const textOperador = (extracted.text || '').toLowerCase().trim();
        logger.info(`[Human Takeover] Mensaje de operador detectado para ${phone}: "${extracted.text || ''}"`);

        // Cancelamos cualquier respuesta automática pendiente en la cola de espera
        WebhookController.cancelPendingDebounce(phone);

        // Detectar si el operador escribió frase de despedida/cierre (ej. "buen día", "excelente día", "lindo día", "que tenga buen día", "hasta luego")
        const esCierreOperador = /\b(buen\s*(dia|día)|excelente\s*(dia|día)|lindo\s*(dia|día)|que\s*tengas?\s*buen\s*(dia|día)|hasta\s*luego|hasta\s*pronto|un\s*gusto\s*atenderle|a\s*la\s*orden)\b/i.test(textOperador);

        if (esCierreOperador) {
          logger.info(`[Human Takeover] Operador cerró la conversación con frase de despedida ("${extracted.text}"). Finalizando sesión para ${phone}.`);
          BotOrchestrator.finalizarIntervencionHumana(phone).catch(() => {});
          try {
            const { AdminController } = require('./admin.controller');
            AdminController.broadcastSSE('chat:status', { phone, is_paused: false, status: 'RESOLVED' });
          } catch {}
        } else {
          // Pausamos el bot con ventana adaptativa inteligente de 4 horas (o hasta 10 AM siguiente día)
          BotOrchestrator.activarPausaOperador(phone, 240, 'Operador respondió desde WhatsApp Web/Móvil').catch(() => {});
          try {
            const { AdminController } = require('./admin.controller');
            AdminController.broadcastSSE('chat:status', { phone, is_paused: true, status: 'OPERATOR_ACTIVE' });
          } catch {}
        }

        // Auditoría en Turso
        if (extracted.text) {
          TursoService.logMessage(phone, 'OUT', extracted.text, null, 'INTERVENCION_HUMANA').catch(() => {});
        }
        return;
      }

      // Regla: Ignorar estados de WhatsApp y grupos (solo chats privados)
      if (remoteJid.includes('status@broadcast') || remoteJid.endsWith('@g.us')) {
        logger.debug(`Mensaje grupal o de estado ignorado: ${remoteJid}`);
        return;
      }

      const phone = WebhookController.extractPhone(key, data);
      const senderName = messageObj.pushName || '';

      const extracted = WebhookController.extractMessageContent(messageObj);

      // --- MANEJO DE NOTAS DE VOZ / AUDIOS CON GROQ WHISPER ---
      if (extracted.isAudio) {
        logger.info(`[Audio recibido] Descargando nota de voz de ${phone} para transcripción con Groq Whisper...`);
        const media = await EvolutionService.getBase64FromMedia(messageObj);
        if (media && media.buffer) {
          const trans = await GroqService.transcribirAudio(media.buffer, media.mimeType);
          if (trans) {
            extracted.text = trans;
            logger.info(`[Audio Transcrito] ${phone}: "${trans}"`);
          }
        }
      }

      // --- MANEJO DE IMÁGENES CON GROQ VISION (SPEEDTEST, PAGOS, LUCES MÓDEM HUAWEI) ---
      let imageAnalysis: any = null;
      if (extracted.isMedia && !extracted.isAudio) {
        logger.info(`[Imagen recibida] Descargando imagen de ${phone} para análisis visual con Groq Vision...`);
        const media = await EvolutionService.getBase64FromMedia(messageObj);
        if (media && media.buffer) {
          imageAnalysis = await GroqService.analizarImagen(media.buffer, media.mimeType);
        }
      }

      if (!extracted.text && !extracted.buttonId && !extracted.isMedia) {
        logger.debug(`No se encontró texto ni acción en el mensaje de ${phone}`);
        return;
      }

      const incomingEvent: IncomingMessageEvent = {
        phone,
        remoteJid,
        senderName,
        text: extracted.text,
        buttonId: extracted.buttonId,
        isMedia: extracted.isMedia,
        imageAnalysis,
      };

      // Si el bot está en pausa por intervención humana activa:
      const estadoPausa = BotOrchestrator.estaBotPausado(phone);
      if (estadoPausa.pausado) {
        // Enviar a procesarMensaje para que extienda la ventana deslizable (+60m), guarde log y emita SSE
        setImmediate(() => {
          BotOrchestrator.procesarMensaje(incomingEvent).catch((err) => {
            logger.error(`Error en BotOrchestrator (paused) para ${phone}:`, err?.message || err);
          });
        });
        return;
      }


      // Si es un clic de botón o archivo multimedia sin texto, procesamos de inmediato
      if (extracted.buttonId || (extracted.isMedia && !extracted.text)) {
        setImmediate(() => {
          BotOrchestrator.procesarMensaje(incomingEvent).catch((err) => {
            logger.error(`Error en BotOrchestrator para ${phone}:`, err?.message || err);
          });
        });
        return;
      }

      // Si es mensaje de texto o audio transcrito:
      // 1. Activar estado "Escribiendo..." (composing) en WhatsApp para simulación humana inmediata
      EvolutionService.enviarPresencia(phone, 'composing', 5000).catch(() => {});

      // 2. Programar en el búfer de debounce (5 segundos para agrupar ráfagas y dar ventana al operador)
      WebhookController.scheduleDebouncedMessage(incomingEvent);
    } catch (error: any) {
      logger.error('Error al procesar webhook de Evolution API:', error?.message || error);
    }
  }

  /**
   * Programa la ejecución de un mensaje agrupando ráfagas de texto en una sola idea
   * y brindando una ventana de espera humana para que el operador pueda intervenir si lo desea
   */
  private static scheduleDebouncedMessage(event: IncomingMessageEvent): void {
    const cleanPhone = event.phone.replace(/\D/g, '');
    const text = event.text || '';

    let entry = this.messageBuffers.get(cleanPhone);
    if (entry) {
      clearTimeout(entry.timeout);
      if (text) entry.texts.push(text);
      entry.event = event;
    } else {
      entry = {
        texts: text ? [text] : [],
        event,
        timeout: null as any,
      };
    }

    // Ventana humana de 5 segundos
    entry.timeout = setTimeout(() => {
      this.messageBuffers.delete(cleanPhone);

      // Si el operador intervino manualmente durante los 5 segundos, abortar respuesta automática
      if (BotOrchestrator.estaBotPausado(cleanPhone).pausado) {
        logger.info(`[Debounce] Búfer descartado para ${cleanPhone} porque el operador tomó el control.`);
        return;
      }

      const combinedText = entry!.texts.join(' \n');
      const finalEvent: IncomingMessageEvent = {
        ...entry!.event,
        text: combinedText,
      };

      BotOrchestrator.procesarMensaje(finalEvent).catch((err) => {
        logger.error(`Error en BotOrchestrator para ${cleanPhone}:`, err?.message || err);
      });
    }, 5000);

    this.messageBuffers.set(cleanPhone, entry);
  }

  /**
   * Extrae texto, respuestas de botones, notas de voz, ubicaciones y archivos multimedia de los payloads de WhatsApp
   */
  private static extractMessageContent(msg: any): { text?: string; buttonId?: string; isMedia?: boolean; isAudio?: boolean } {
    const message = msg.message || {};

    // 1. Botón interactivo tradicional
    if (message.buttonsResponseMessage?.selectedButtonId) {
      return {
        buttonId: message.buttonsResponseMessage.selectedButtonId,
        text: message.buttonsResponseMessage.selectedDisplayText,
      };
    }

    // 2. Template Button Reply
    if (message.templateButtonReplyMessage?.selectedId) {
      return {
        buttonId: message.templateButtonReplyMessage.selectedId,
        text: message.templateButtonReplyMessage.selectedDisplayText,
      };
    }

    // 3. Interactive Response (Listas o Native Flow v2)
    if (message.interactiveResponseMessage) {
      const nativeFlow = message.interactiveResponseMessage.nativeFlowResponseMessage;
      if (nativeFlow?.paramsJson) {
        try {
          const parsed = JSON.parse(nativeFlow.paramsJson);
          return { buttonId: parsed.id || parsed.buttonId };
        } catch {
          // ignore
        }
      }
      if (message.interactiveResponseMessage.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return {
          buttonId: message.interactiveResponseMessage.listResponseMessage.singleSelectReply.selectedRowId,
        };
      }
    }

    // 4. Mensaje de texto plano
    if (message.conversation) {
      return { text: message.conversation };
    }

    // 5. Mensaje de texto extendido
    if (message.extendedTextMessage?.text) {
      return { text: message.extendedTextMessage.text };
    }

    // 6. Ubicación / GPS compartido por WhatsApp
    if (message.locationMessage || message.liveLocationMessage) {
      const loc = message.locationMessage || message.liveLocationMessage;
      const lat = loc.degreesLatitude;
      const lon = loc.degreesLongitude;
      const addr = loc.address || loc.name || '';
      const text = `Ubicación GPS: ${lat}, ${lon}${addr ? ` (${addr})` : ''}`;
      return { text, isMedia: false };
    }

    // 7. Notas de voz y audios de WhatsApp (para transcripción Whisper)
    if (message.audioMessage || message.pttMessage) {
      return {
        isAudio: true,
        isMedia: true,
      };
    }

    // 8. Archivos multimedia (imágenes, documentos para comprobantes de pago o evidencia)
    if (message.imageMessage || message.documentMessage) {
      const caption = message.imageMessage?.caption || message.documentMessage?.caption || '';
      return {
        text: caption,
        isMedia: true,
      };
    }

    return {};
  }

  /**
   * Webhook de Mercado Pago para procesar pagos en tiempo real
   */
  static async handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
    // Responder inmediatamente 200 OK a Mercado Pago
    res.status(200).send('OK');

    try {
      const body = req.body || {};
      const query = req.query || {};
      const paymentId = body.data?.id || query['data.id'] || query.id || body.id;
      const type = body.type || query.type || body.topic || query.topic;

      logger.info(`[MercadoPago Webhook] Notificación recibida: type=${type}, action=${body.action}, paymentId=${paymentId}`);

      if ((type === 'payment' || body.action?.includes('payment') || query.topic === 'payment') && paymentId) {
        const payment = await MercadoPagoService.obtenerDetallePago(paymentId);
        if (!payment) return;

        logger.info(`[MercadoPago Webhook] Pago ${paymentId}: status=${payment.status}, amount=$${payment.transaction_amount}, ref=${payment.external_reference}`);

        if (payment.status === 'approved') {
          // Parse external_reference (WISPHUB:{clienteId}:{contratoId}:{phone}:{folioFactura})
          const externalRef = payment.external_reference || '';
          const parts = externalRef.split(':');

          const wisphubId = parts[1] || '';
          const contratoId = parts[2] || '';
          let phone = parts[3] || '';
          const folioFactura = parts[4] || '';

          if (!phone && payment.payer?.phone?.number) {
            phone = payment.payer.phone.number;
          }

          const monto = payment.transaction_amount || 0;
          const payerName = payment.payer?.first_name || payment.payer?.name || 'Cliente';

          logger.info(`[MercadoPago Webhook] ¡Pago APROBADO de $${monto} MXN! Cliente ID: ${wisphubId}, Contrato: ${contratoId}, Tel: ${phone}`);

          // 1. Reactivar en WispHub si estaba suspendido
          if (wisphubId && wisphubId !== '0') {
            try {
              await WispHubService.activarCliente(wisphubId);
              logger.info(`[MercadoPago Webhook] Cliente WispHub ID ${wisphubId} reactivado exitosamente.`);
            } catch (err: any) {
              logger.warn(`[MercadoPago Webhook] Error reactivando cliente en WispHub:`, err?.message || err);
            }
          }

          // 2. Enviar WhatsApp de confirmación inmediata al cliente si tenemos su teléfono
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const targetJid = LidRegistry.getLid(cleanPhone) || (cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`);

            const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', 'CloudWareMx');
            const mensajeExito =
              `🎉 *¡Tu pago ha sido aprobado con éxito!*\n\n` +
              `Estimado(a) *${payerName}*, confirmamos la recepción de tu pago por *$${monto.toFixed(2)} MXN* a través de *Mercado Pago*.\n\n` +
              `✅ Tu servicio de internet ha sido verificado y reactivado automáticamente en el sistema.\n` +
              `¡Gracias por tu pago puntual con *${ispName}*! 🚀`;

            await EvolutionService.enviarTexto(targetJid, mensajeExito);
            await TursoService.logMessage(cleanPhone, 'OUT', mensajeExito, 'REPORTAR_PAGO', 'PAGO_MERCADOPAGO_APROBADO');
            await TursoService.updateStep(cleanPhone, 'INICIO');
          }
        }
      }
    } catch (err: any) {
      logger.error('Error procesando webhook de Mercado Pago:', err?.message || err);
    }
  }
}


