import { Request, Response } from 'express';
import { BotOrchestrator, IncomingMessageEvent } from '../orchestrator/bot.orchestrator';
import { Logger } from '../utils/logger';

const logger = new Logger('WebhookController');

export class WebhookController {
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

      // Regla: Ignorar mensajes enviados por el propio bot
      if (fromMe) {
        return;
      }

      // Regla: Ignorar estados de WhatsApp y grupos (solo chats privados)
      if (remoteJid.includes('status@broadcast') || remoteJid.endsWith('@g.us')) {
        logger.debug(`Mensaje grupal o de estado ignorado: ${remoteJid}`);
        return;
      }

      const phone = remoteJid.replace('@s.whatsapp.net', '');
      const senderName = messageObj.pushName || '';

      const extracted = WebhookController.extractMessageContent(messageObj);

      if (!extracted.text && !extracted.buttonId && !extracted.isMedia) {
        logger.debug(`No se encontró texto ni acción en el mensaje de ${phone}`);
        return;
      }

      const incomingEvent: IncomingMessageEvent = {
        phone,
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
