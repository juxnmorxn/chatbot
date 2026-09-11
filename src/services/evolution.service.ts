import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax, randomDelay } from '../utils/spintax';

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
    // Si viene con formato JID de WhatsApp (@lid o @s.whatsapp.net), mantenerlo intacto para entrega directa al hilo
    if (trimmed.includes('@lid') || trimmed.includes('@s.whatsapp.net')) {
      return trimmed;
    }
    let clean = trimmed.replace(/\D/g, '');
    // Número mexicano de 10 dígitos (ej. 7711711557) -> agregar prefijo internacional 521
    if (clean.length === 10) {
      clean = `521${clean}`;
    } else if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
      // Formato WhatsApp México requiere 521 si es móvil
      clean = `521${clean.slice(2)}`;
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
      await api.post(`/message/sendText/${instance}`, {
        number: recipient,
        text: mensaje,
        options: {
          delay: 1500,
          presence: 'composing',
        },
      });
      return true;
    } catch (error: any) {
      logger.error(`Error al enviar mensaje a ${recipient}:`, error?.response?.data || error?.message || error);
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
}
