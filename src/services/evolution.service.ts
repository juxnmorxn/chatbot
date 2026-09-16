import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax, randomDelay } from '../utils/spintax';
import { LidRegistry } from '../utils/lid-registry';

const logger = new Logger('EvolutionService');

export interface BotButton {
  id: string;
  title: string;
}

export class EvolutionService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  private static getApi(): AxiosInstance {
    const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
    const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);

    if (!this.api || this.lastUrl !== url || this.lastKey !== apiKey) {
      this.lastUrl = url;
      this.lastKey = apiKey;
      this.api = axios.create({
        baseURL: url,
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 12000,
      });
    }
    return this.api;
  }

  static getInstanceName(): string {
    return SettingsService.get('INSTANCE_NAME', 'INSTANCE_NAME', config.evolution.instanceName);
  }

  private static formatRecipient(phone: string): string {
    const trimmed = phone.trim();
    if (trimmed.includes('@lid')) {
      return trimmed;
    }

    let clean = trimmed.replace(/\D/g, '');
    if (clean.length === 10) {
      clean = `521${clean}`;
    } else if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
      clean = `521${clean.slice(2)}`;
    }

    // Si el contacto tiene un LID registrado, redirigir al LID para garantizar entrega
    const mappedLid = LidRegistry.getLid(clean);
    if (mappedLid) {
      logger.info(`[LID Router] Redirigiendo envío de ${clean} a hilo activo LID: ${mappedLid}`);
      return mappedLid;
    }

    if (trimmed.includes('@s.whatsapp.net')) {
      return trimmed;
    }

    return clean;
  }

  /**
   * Envía un mensaje de texto simple con simulación de presencia 'composing' y spintax
   */
  static async enviarTexto(
    phone: string,
    mensajeRaw: string,
    opciones: { delayMin?: number; delayMax?: number; isBroadcast?: boolean } = {}
  ): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const mensaje = parseSpintax(mensajeRaw);

    // Regla Anti-Ban: Jitter de 8 a 15 segundos si es difusión, o de 1.5 a 3s si es interactivo
    if (opciones.isBroadcast) {
      const waitTime = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
      logger.info(`[Anti-Ban] Aplicando jitter de difusión: ${waitTime}ms para ${recipient}`);
      await new Promise((r) => setTimeout(r, waitTime));
    } else {
      await randomDelay(opciones.delayMin || 1200, opciones.delayMax || 2500);
    }

    try {
      logger.info(`Enviando mensaje de texto a ${recipient}`);
      const api = this.getApi();
      const instance = this.getInstanceName();
      const response = await api.post(`/message/sendText/${instance}`, {
        number: recipient,
        text: mensaje,
        options: {
          delay: 1500,
          presence: 'composing',
        },
      });

      const sentId = response.data?.key?.id;
      if (sentId) {
        this.registrarMensajeEnviadoPorBot(sentId);
      }

      return true;
    } catch (error: any) {
      logger.error(`Error al enviar mensaje a ${recipient}:`, error?.response?.data || error?.message || error);
      return false;
    }
  }

  private static botSentMessageIds = new Set<string>();

  /**
   * Registra el ID de un mensaje enviado por el bot para no confundirlo con intervención humana
   */
  static registrarMensajeEnviadoPorBot(id: string): void {
    if (!id) return;
    this.botSentMessageIds.add(id);
    // Limpiar después de 3 minutos
    setTimeout(() => {
      this.botSentMessageIds.delete(id);
    }, 180000);
  }

  /**
   * Verifica si un mensaje saliente (fromMe) fue emitido por el bot o por un operador humano
   */
  static esMensajeEnviadoPorBot(id: string): boolean {
    return this.botSentMessageIds.has(id);
  }

  /**
   * Envía presencia a WhatsApp ('composing' = escribiendo..., 'paused' = pausa)
   */
  static async enviarPresencia(phone: string, presence: 'composing' | 'paused' = 'composing', delayMs: number = 3000): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    try {
      const api = this.getApi();
      const instance = this.getInstanceName();
      await api.post(`/chat/sendPresence/${instance}`, {
        number: recipient,
        presence,
        delay: delayMs,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Envía un menú interactivo formateado de forma clara y moderna
   * Usa texto estructurado con emojis y números para garantizar 100% de entrega en WhatsApp móvil
   */
  static async enviarBotones(
    phone: string,
    textoPrincipal: string,
    botones: BotButton[],
    pieDePagina: string = 'CloudWareMx Soporte Automático'
  ): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const texto = parseSpintax(textoPrincipal);

    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const opcionesTexto = botones
      .map((b, i) => `${numberEmojis[i] || `*${i + 1}.*`} ${b.title}`)
      .join('\n');

    const mensajeCompleto = `${texto}\n\n${opcionesTexto}\n\n_${pieDePagina}_\n_Por favor responde con el número de tu opción (ej. 1, 2 o 3) o describe tu duda._`;

    logger.info(`Enviando menú estructurado a ${recipient}: ${botones.map((b) => b.title).join(' | ')}`);
    return this.enviarTexto(recipient, mensajeCompleto);
  }

  /**
   * Descarga el archivo base64 de un mensaje multimedia (audio, imagen o documento) desde Evolution API
   */
  static async getBase64FromMedia(messageObj: any): Promise<{ buffer: Buffer; mimeType: string; base64: string } | null> {
    try {
      // 1. Si el payload del webhook ya incluye base64 directo
      const directBase64 = messageObj.base64 || messageObj.message?.base64;
      if (directBase64 && typeof directBase64 === 'string') {
        const cleanBase64 = directBase64.replace(/^data:[^;]+;base64,/, '');
        const mimeType = messageObj.mimetype || messageObj.message?.mimetype || 'audio/ogg';
        return {
          buffer: Buffer.from(cleanBase64, 'base64'),
          mimeType,
          base64: cleanBase64,
        };
      }

      // 2. Si no, consultar el endpoint de descarga de Evolution API
      const api = this.getApi();
      const instance = this.getInstanceName();
      logger.info(`Solicitando base64 de archivo multimedia para mensaje a Evolution API...`);

      const response = await api.post(`/chat/getBase64FromMediaMessage/${instance}`, {
        message: messageObj,
        convertToMp4: false,
      });

      const resData = response.data;
      const base64Data = resData?.base64 || resData?.data?.base64;
      const mimeType = resData?.mimetype || resData?.data?.mimetype || messageObj.message?.audioMessage?.mimetype || messageObj.message?.imageMessage?.mimetype || 'audio/ogg';

      if (base64Data && typeof base64Data === 'string') {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        return {
          buffer: Buffer.from(cleanBase64, 'base64'),
          mimeType,
          base64: cleanBase64,
        };
      }

      return null;
    } catch (error: any) {
      logger.warn('No se pudo descargar base64 de Evolution API:', error?.response?.data || error?.message || error);
      return null;
    }
  }

  /**
   * Verifica el estado de la instancia en Evolution API y re-habilita el webhook
   */
  static async verifyAndEnableWebhook(webhookBaseUrl?: string): Promise<{ state: string; webhookOk: boolean }> {
    const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
    const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
    const instance = this.getInstanceName();

    if (!apiKey || apiKey.includes('tu_api_key')) {
      return { state: 'unconfigured', webhookOk: false };
    }

    try {
      const api = this.getApi();
      let state = 'close';
      try {
        const stateRes = await api.get(`/instance/connectionState/${instance}`);
        state = stateRes.data?.instance?.state || 'close';
      } catch (err: any) {
        logger.warn(`Error al consultar estado de instancia Evolution "${instance}":`, err?.message || err);
      }

      let webhookOk = false;
      const targetUrl = webhookBaseUrl || (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/webhook` : 'https://chatbot-rr1w.onrender.com/webhook');

      try {
        await api.post(`/webhook/set/${instance}`, {
          webhook: {
            enabled: true,
            url: targetUrl,
            byEvents: false,
            base64: true,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE'
            ],
          },
        });
        webhookOk = true;
        logger.info(`Webhook de Evolution API re-sincronizado exitosamente hacia: ${targetUrl} (Estado WhatsApp: ${state})`);
      } catch (e: any) {
        logger.warn('No se pudo re-sincronizar webhook en Evolution:', e?.response?.data || e?.message || e);
      }

      return { state, webhookOk };
    } catch (err: any) {
      logger.error('Error al verificar Evolution API:', err?.message || err);
      return { state: 'error', webhookOk: false };
    }
  }
}

