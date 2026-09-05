import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('SmartOLTService');

export type SmartOltStatusType = 'ONLINE' | 'LOS' | 'POWER_FAIL' | 'OFFLINE' | 'DESCONOCIDO';

export interface SmartOltStatusResult {
  status: SmartOltStatusType;
  rawStatus: string;
  opticalPowerDbm?: number | null;
  uptime?: string;
  sn?: string;
  descripcion: string;
}

export interface SmartOltRebootResult {
  success: boolean;
  message: string;
}

export class SmartOLTService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  private static getApi(): AxiosInstance {
    const url = SettingsService.get('SMARTOLT_API_URL', 'SMARTOLT_API_URL', config.smartolt.url).replace(/\/+$/, '');
    const apiKey = SettingsService.get('SMARTOLT_API_KEY', 'SMARTOLT_API_KEY', config.smartolt.apiKey);

    if (!this.api || this.lastUrl !== url || this.lastKey !== apiKey) {
      this.lastUrl = url;
      this.lastKey = apiKey;
      this.api = axios.create({
        baseURL: url,
        headers: {
          'X-Token': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 9000,
      });
    }
    return this.api;
  }

  static getApiKey(): string {
    return SettingsService.get('SMARTOLT_API_KEY', 'SMARTOLT_API_KEY', config.smartolt.apiKey);
  }

  /**
   * Consulta el estado físico y óptico de la ONU en la OLT
   */
  static async obtenerEstadoONU(onuId: string): Promise<SmartOltStatusResult> {
    logger.info(`Consultando estado físico en SmartOLT para ONU: ${onuId}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.warn('SMARTOLT_API_KEY no configurada. Retornando simulación de estado.');
      return {
        status: 'ONLINE',
        rawStatus: 'Online',
        opticalPowerDbm: -21.4,
        uptime: '4d 12h',
        descripcion: 'La ONU está en línea y con potencia óptica normal (-21.4 dBm).',
      };
    }

    try {
      const api = this.getApi();
      const response = await api.get(`/onu/get_onu_status/${onuId}`);
      const data = response.data;

      const raw = String(data?.status || data?.onu_status || '').toLowerCase();
      const rxPower = data?.rx_power ? parseFloat(data.rx_power) : null;

      if (raw.includes('los') || raw.includes('loss of signal') || raw.includes('fiber broken')) {
        return {
          status: 'LOS',
          rawStatus: data?.status || 'LOS',
          opticalPowerDbm: null,
          descripcion: 'Corte de señal óptica (Fibra rota o desconectada de la caja)',
        };
      }

      if (raw.includes('power fail') || raw.includes('dying gasp') || raw.includes('power down')) {
        return {
          status: 'POWER_FAIL',
          rawStatus: data?.status || 'Power fail',
          opticalPowerDbm: null,
          descripcion: 'Pérdida de energía eléctrica en el domicilio (Equipo apagado)',
        };
      }

      if (raw.includes('online') || raw.includes('up') || raw.includes('working')) {
        return {
          status: 'ONLINE',
          rawStatus: data?.status || 'Online',
          opticalPowerDbm: rxPower,
          uptime: data?.uptime || '',
          descripcion: `Equipo en línea. Nivel de señal óptica: ${rxPower !== null ? `${rxPower} dBm` : 'Normal'}`,
        };
      }

      return {
        status: 'OFFLINE',
        rawStatus: data?.status || 'Offline',
        opticalPowerDbm: null,
        descripcion: 'Equipo desconectado o fuera de línea.',
      };
    } catch (error: any) {
      logger.error('Error al consultar estado de ONU en SmartOLT:', error?.response?.data || error?.message || error);
      return {
        status: 'DESCONOCIDO',
        rawStatus: 'Error de comunicación',
        descripcion: 'No fue posible contactar a la OLT en este momento.',
      };
    }
  }

  /**
   * Envía la orden de reinicio remoto a la ONU (/onu/reboot/{id})
   */
  static async rebootONU(onuId: string): Promise<SmartOltRebootResult> {
    logger.info(`Enviando orden de reinicio remoto para ONU: ${onuId}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.info('Modo DEV: Reinicio simulado con éxito.');
      return {
        success: true,
        message: 'Orden de reinicio enviada exitosamente (Modo simulación). La ONU tardará ~2 minutos en sincronizar.',
      };
    }

    try {
      const api = this.getApi();
      const response = await api.post(`/onu/reboot/${onuId}`);
      return {
        success: response.data?.status === true || response.status === 200,
        message: response.data?.message || 'Orden de reinicio enviada correctamente a la OLT.',
      };
    } catch (error: any) {
      logger.error('Error al reiniciar ONU en SmartOLT:', error?.response?.data || error?.message || error);
      return {
        success: false,
        message: 'No se pudo completar el reinicio remoto en la OLT.',
      };
    }
  }
}
