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

  /**
   * Formatea el teléfono para Evolution API asegurando que no tenga símbolos ni espacios
   */
  private static formatRecipient(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    // Si viene en formato internacional ej. 521... o local 55...
    if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
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
   * Envía un mensaje con botones de respuesta rápida
   * Con fallback automático a lista numerada si la instancia no soporta botones interactivos
   */
  static async enviarBotones(
    phone: string,
    textoPrincipal: string,
    botones: BotButton[],
    pieDePagina: string = 'JedNet Soporte Automático'
  ): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const texto = parseSpintax(textoPrincipal);
    const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name);

    await randomDelay(1200, 2400);

    try {
      const api = this.getApi();
      const instance = this.getInstanceName();
      const evolutionButtons = botones.map((b) => ({
        buttonId: b.id,
        buttonText: { displayText: b.title },
        type: 1,
      }));

      logger.info(`Enviando menú de botones a ${recipient}: ${botones.map((b) => b.title).join(' | ')}`);

      const response = await api.post(`/message/sendButtons/${instance}`, {
        number: recipient,
        title: ispName,
        description: texto,
        footer: pieDePagina,
        buttons: evolutionButtons,
        options: {
          delay: 1200,
          presence: 'composing',
        },
      });

      if (response.status === 200 || response.status === 201) {
        return true;
      }
      throw new Error(`Status inesperado: ${response.status}`);
    } catch (error: any) {
      logger.warn(`No se pudieron enviar botones interactivos a ${recipient}. Usando lista de texto fallback:`, error?.message || error);

      // Fallback a texto con opciones numeradas
      const opcionesTexto = botones.map((b, i) => `*${i + 1}.* ${b.title}`).join('\n');
      const mensajeFallback = `${texto}\n\n${opcionesTexto}\n\n_Escribe el número de tu opción o describe lo que necesitas._`;
      return this.enviarTexto(recipient, mensajeFallback);
    }
  }
}
