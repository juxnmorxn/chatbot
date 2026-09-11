import { Request, Response } from 'express';
import { BotOrchestrator, IncomingMessageEvent } from '../orchestrator/bot.orchestrator';
import { Logger } from '../utils/logger';

const logger = new Logger('WebhookController');

export class WebhookController {
  private static processedMessageIds = new Map<string, number>();

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

  private static lidToPhoneMap = new Map<string, string>();

  private static extractPhone(key: any, data: any): string {
    const remoteJid: string = key?.remoteJid || '';
    const remoteJidAlt: string = key?.remoteJidAlt || '';
    const participant: string = key?.participant || '';
    const senderPnJid: string = data?.senderPnJid || '';

    // Si viene remoteJidAlt con @s.whatsapp.net (modo LID activo)
    if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
      const realPhone = remoteJidAlt.split('@')[0].replace(/\D/g, '');
      if (remoteJid.endsWith('@lid')) {
        const lid = remoteJid.split('@')[0];
        WebhookController.lidToPhoneMap.set(lid, realPhone);
      }
      return realPhone;
    }

    // Si viene participant con @s.whatsapp.net
    if (participant && participant.includes('@s.whatsapp.net')) {
      const realPhone = participant.split('@')[0].replace(/\D/g, '');
      if (remoteJid.endsWith('@lid')) {
        const lid = remoteJid.split('@')[0];
        WebhookController.lidToPhoneMap.set(lid, realPhone);
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

    // Si es un LID (@lid), consultar la caché de resolución previa
    if (remoteJid.endsWith('@lid')) {
      const lid = remoteJid.split('@')[0];
      if (WebhookController.lidToPhoneMap.has(lid)) {
        return WebhookController.lidToPhoneMap.get(lid)!;
      }
      return lid.replace(/\D/g, '');
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

      // Regla: Ignorar mensajes enviados por el propio bot
      if (fromMe) {
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
      };

      // Ejecución asíncrona en el orquestador
      setImmediate(() => {
        BotOrchestrator.procesarMensaje(incomingEvent).catch((err) => {
          logger.error(`Error en BotOrchestrator para ${phone}:`, err?.message || err);
        });
      });
    } catch (error: any) {
      logger.error('Error al procesar webhook de Evolution API:', error?.message || error);
    }
  }

  /**
   * Extrae texto, respuestas de botones y archivos multimedia de los payloads de WhatsApp
   */
  private static extractMessageContent(msg: any): { text?: string; buttonId?: string; isMedia?: boolean } {
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

    // 6. Archivos multimedia (imágenes, documentos para comprobantes de pago)
    if (message.imageMessage || message.documentMessage) {
      const caption = message.imageMessage?.caption || message.documentMessage?.caption || '';
      return {
        text: caption,
        isMedia: true,
      };
    }

    return {};
  }
}
