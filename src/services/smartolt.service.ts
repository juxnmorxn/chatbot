import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { TursoService, SmartOltOnuRecord } from './turso.service';
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
  fromCache?: boolean;
}

export interface SmartOltRebootResult {
  success: boolean;
  message: string;
}

export interface SmartOltSyncResult {
  success: boolean;
  count: number;
  message: string;
}

export class SmartOLTService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  // Caché de estado en tiempo real (TTL 3 minutos) para no agotar el límite de 300 calls/hora
  private static statusCache: Map<string, { result: SmartOltStatusResult; timestamp: number }> = new Map();
  private static readonly STATUS_CACHE_TTL_MS = 3 * 60 * 1000;

  // Control de cooldown para la sincronización masiva (límite estricto de 15 calls/hora = mínimo 4 minutos entre llamadas)
  private static lastSyncTimestamp: number = 0;
  private static isSyncing: boolean = false;
  private static readonly MIN_SYNC_INTERVAL_MS = 4 * 60 * 1000;

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
        timeout: 12000,
      });
    }
    return this.api;
  }

  static getApiKey(): string {
    return SettingsService.get('SMARTOLT_API_KEY', 'SMARTOLT_API_KEY', config.smartolt.apiKey);
  }

  /**
   * Sincroniza todas las ONUs desde SmartOLT hacia Turso DB
   * Protegido con cooldown de 4 minutos para respetar el límite de 15 llamadas/hora
   */
  static async syncAllOnusToTurso(force: boolean = false): Promise<SmartOltSyncResult> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('tu_token')) {
      return {
        success: false,
        count: 0,
        message: 'SMARTOLT_API_KEY no está configurada. Configúrala en la pantalla de administración.',
      };
    }

    const now = Date.now();
    const elapsed = now - this.lastSyncTimestamp;

    if (!force && elapsed < this.MIN_SYNC_INTERVAL_MS) {
      const waitSeconds = Math.ceil((this.MIN_SYNC_INTERVAL_MS - elapsed) / 1000);
      logger.warn(`Sincronización en cooldown para proteger la API de SmartOLT (esperar ${waitSeconds}s)`);
      const stats = await TursoService.getSmartOltSyncStats();
      return {
        success: true,
        count: stats.count,
        message: `La API de SmartOLT está protegida. Última sincronización reciente. Se reusaron los ${stats.count} registros existentes.`,
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        count: 0,
        message: 'Ya hay una sincronización en progreso en este momento.',
      };
    }

    this.isSyncing = true;
    try {
      logger.info('Iniciando sincronización masiva desde SmartOLT (/onu/get_all_onus_details)...');
      const api = this.getApi();
      const response = await api.get('/onu/get_all_onus_details');
      const data = response.data;

      // SmartOLT responde típicamente con { status: true, onus: [...] } o directamente el array
      const rawOnus = Array.isArray(data) ? data : (data?.onus || data?.response || []);

      if (!Array.isArray(rawOnus) || rawOnus.length === 0) {
        this.lastSyncTimestamp = Date.now();
        return {
          success: true,
          count: 0,
          message: 'SmartOLT respondió correctamente pero no se encontraron ONUs registradas.',
        };
      }

      logger.info(`Recibidas ${rawOnus.length} ONUs de SmartOLT. Normalizando y guardando en Turso DB...`);

      const records: SmartOltOnuRecord[] = rawOnus.map((onu: any) => {
        // En SmartOLT el nombre del cliente suele venir en name, description o comment
        const clientName = String(onu.name || onu.description || onu.client || onu.comment || '').trim();
        const sn = String(onu.sn || onu.serial_number || '').trim();
        const id = String(onu.unique_external_id || onu.id || sn || `ONU-${Math.random()}`);

        return {
          unique_external_id: id,
          sn,
          name: clientName,
          phone: onu.phone || onu.telefono || '',
          address: onu.address || onu.direccion || '',
          zone_name: onu.zone_name || onu.zone || '',
          speed_profile: onu.speed_profile_name || onu.speed_profile || onu.plan || '',
          olt_name: onu.olt_name || onu.olt || '',
          raw_data: JSON.stringify({
            board: onu.board,
            slot: onu.slot,
            port: onu.port,
            onu: onu.onu,
            vlan: onu.vlan,
            mode: onu.mode,
          }),
        };
      });

      const totalSaved = await TursoService.saveSmartOltOnus(records);
      this.lastSyncTimestamp = Date.now();

      return {
        success: true,
        count: totalSaved,
        message: `Sincronización completada exitosamente: ${totalSaved} clientes/ONUs guardados en Turso DB.`,
      };
    } catch (error: any) {
      logger.error('Error al sincronizar ONUs con SmartOLT:', error?.response?.data || error?.message || error);
      return {
        success: false,
        count: 0,
        message: `Error al contactar SmartOLT: ${error?.response?.data?.message || error?.message || 'Fallo de conexión'}`,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Consulta el estado físico y óptico de la ONU en la OLT con caché de 3 minutos
   */
  static async obtenerEstadoONU(onuId: string): Promise<SmartOltStatusResult> {
    // 1. Revisar caché local para no saturar las 300 llamadas/hora
    const now = Date.now();
    const cached = this.statusCache.get(onuId);
    if (cached && (now - cached.timestamp) < this.STATUS_CACHE_TTL_MS) {
      logger.info(`Retornando estado de ONU ${onuId} desde caché en memoria (${Math.round((now - cached.timestamp)/1000)}s)`);
      return { ...cached.result, fromCache: true };
    }

    logger.info(`Consultando estado físico en vivo en SmartOLT para ONU: ${onuId}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.warn('SMARTOLT_API_KEY no configurada. Retornando simulación de estado.');
      return {
        status: 'ONLINE',
        rawStatus: 'Online',
        opticalPowerDbm: -21.4,
        uptime: '4d 12h',
        descripcion: 'La ONU está en línea y con potencia óptica normal (-21.4 dBm).',
        fromCache: false,
      };
    }

    try {
      const api = this.getApi();
      const response = await api.get(`/onu/get_onu_status/${onuId}`);
      const data = response.data;

      const raw = String(data?.status || data?.onu_status || '').toLowerCase();
      const rxPower = data?.rx_power ? parseFloat(data.rx_power) : null;

      let result: SmartOltStatusResult;

      if (raw.includes('los') || raw.includes('loss of signal') || raw.includes('fiber broken')) {
        result = {
          status: 'LOS',
          rawStatus: data?.status || 'LOS',
          opticalPowerDbm: null,
          descripcion: 'Corte de señal óptica (Fibra rota o desconectada de la caja)',
        };
      } else if (raw.includes('power fail') || raw.includes('dying gasp') || raw.includes('power down')) {
        result = {
          status: 'POWER_FAIL',
          rawStatus: data?.status || 'Power fail',
          opticalPowerDbm: null,
          descripcion: 'Pérdida de energía eléctrica en el domicilio (Equipo apagado)',
        };
      } else if (raw.includes('online') || raw.includes('up') || raw.includes('working')) {
        result = {
          status: 'ONLINE',
          rawStatus: data?.status || 'Online',
          opticalPowerDbm: rxPower,
          uptime: data?.uptime || '',
          descripcion: `Equipo en línea. Nivel de señal óptica: ${rxPower !== null ? `${rxPower} dBm` : 'Normal'}`,
        };
      } else {
        result = {
          status: 'OFFLINE',
          rawStatus: data?.status || 'Offline',
          opticalPowerDbm: null,
          descripcion: 'Equipo desconectado o fuera de línea.',
        };
      }

      // Guardar en la caché en memoria de 3 minutos
      this.statusCache.set(onuId, { result, timestamp: Date.now() });
      return { ...result, fromCache: false };
    } catch (error: any) {
      logger.error('Error al consultar estado de ONU en SmartOLT:', error?.response?.data || error?.message || error);
      return {
        status: 'DESCONOCIDO',
        rawStatus: 'Error de comunicación',
        descripcion: 'No fue posible contactar a la OLT en este momento.',
        fromCache: false,
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
