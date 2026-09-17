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

export interface UnconfiguredOnu {
  olt_id: string | number;
  olt_name?: string;
  board: string | number;
  port: string | number;
  sn: string;
  onu_type?: string;
  onu_type_name?: string;
  onu_signal?: string;
  onu_signal_1490?: string;
}

export interface AuthorizeOnuPayload {
  olt_id: string | number;
  board: string | number;
  port: string | number;
  sn: string;
  onu_type?: string;
  name: string;
  onu_mode?: string;
  vlan: string;
  ip_address: string;
  netmask?: string;
  gateway: string;
  line_profile?: string;
  download_speed_profile_name?: string;
  upload_speed_profile_name?: string;
  address?: string;
  zone?: string;
  comment?: string;
}

export interface AuthorizeOnuResult {
  success: boolean;
  message: string;
  onu_id?: string;
  details?: any;
}

export function getSmartOltSpeedProfiles(plan?: string): { down: string; up: string } {
  const p = (plan || '').toUpperCase();
  const match = p.match(/(\d+)\s*(?:M|MEGAS|MB)?/);
  const mb = match ? match[1] : '40';
  return {
    down: `${mb}MB-DOWN`,
    up: `${mb}MB-UP`,
  };
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
          ip_address: String(onu.ip_address || onu.ip || onu.ipv4_address || onu.wan_ip || '').trim(),
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
      logger.info(`Respuesta SmartOLT get_onu_status para ${onuId}:`, JSON.stringify(data));

      // Importante: data.status es booleano (true/false) de éxito HTTP en SmartOLT.
      // El estado del módem está en data.onu_status (ej. "Online", "LOS", "Power fail", "Offline").
      const onuStatus = String(data?.onu_status || (typeof data?.status === 'string' ? data.status : '')).toLowerCase();

      let result: SmartOltStatusResult;

      if (onuStatus.includes('los') || onuStatus.includes('loss of signal') || onuStatus.includes('fiber broken')) {
        result = {
          status: 'LOS',
          rawStatus: data?.onu_status || 'LOS',
          opticalPowerDbm: null,
          descripcion: 'Corte de señal óptica (Fibra rota o desconectada de la caja)',
        };
      } else if (onuStatus.includes('power fail') || onuStatus.includes('dying gasp') || onuStatus.includes('power down')) {
        result = {
          status: 'POWER_FAIL',
          rawStatus: data?.onu_status || 'Power fail',
          opticalPowerDbm: null,
          descripcion: 'Pérdida de energía eléctrica en el domicilio (Equipo apagado)',
        };
      } else if (onuStatus.includes('online') || onuStatus.includes('up') || onuStatus.includes('working')) {
        // Consultar niveles de señal óptica reales en SmartOLT
        let opticalPower: number | null = null;
        let signalQuality = '';
        try {
          const sigRes = await api.get(`/onu/get_onu_signal/${onuId}`);
          logger.info(`Respuesta SmartOLT get_onu_signal para ${onuId}:`, JSON.stringify(sigRes.data));
          const sigData = sigRes.data;
          signalQuality = sigData?.onu_signal || '';
          const rawSignal = sigData?.onu_signal_1490 || sigData?.onu_signal_value || '';
          const matchDbm = String(rawSignal).match(/([-+]?[0-9]+(?:\.[0-9]+)?)/);
          if (matchDbm && matchDbm[1]) {
            opticalPower = parseFloat(matchDbm[1]);
          }
        } catch (sigErr: any) {
          logger.warn(`No se pudo obtener señal óptica detallada para ${onuId}:`, sigErr?.message || sigErr);
        }

        const signalText = opticalPower !== null ? `${opticalPower} dBm (${signalQuality || 'Óptimo'})` : 'Óptimo';
        result = {
          status: 'ONLINE',
          rawStatus: data?.onu_status || 'Online',
          opticalPowerDbm: opticalPower,
          uptime: data?.last_status_change ? `Desde ${data.last_status_change}` : (data?.uptime || ''),
          descripcion: `Equipo en línea. Nivel de señal óptica: ${signalText}`,
        };
      } else {
        result = {
          status: 'OFFLINE',
          rawStatus: data?.onu_status || 'Offline',
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

  /**
   * Obtiene la lista de ONUs sin autorizar / sin configurar en SmartOLT
   */
  static async getUnconfiguredOnus(oltId?: string): Promise<UnconfiguredOnu[]> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('tu_token')) {
      logger.warn('Modo DEV / Sin API Key: Retornando lista vacía o simulada de unconfigured ONUs.');
      return [];
    }

    try {
      const api = this.getApi();
      const params = oltId ? { olt_id: oltId } : undefined;
      const response = await api.get('/onu/unconfigured_onus', { params });
      const data = response.data;

      const rawOnus = Array.isArray(data)
        ? data
        : data?.onus || data?.response || data?.unconfigured_onus || [];

      return rawOnus.map((item: any) => ({
        olt_id: item.olt_id || item.olt || '',
        olt_name: item.olt_name || (String(item.olt_id) === '2' ? 'OLT-SanAgustin' : 'OLT5800-Actopan'),
        board: item.board || item.slot || '0',
        port: item.port || item.pon || '0',
        sn: String(item.sn || item.serial_number || item.onu_sn || '').trim().toUpperCase(),
        onu_type: item.onu_type || item.onu_type_name || item.model || 'ZTE-F660',
        onu_type_name: item.onu_type_name || item.onu_type || item.model || '',
        onu_signal: item.onu_signal || item.signal || item.rx_power || '',
        onu_signal_1490: item.onu_signal_1490 || item.onu_signal_value || '',
      }));
    } catch (error: any) {
      logger.error('Error al obtener ONUs sin configurar en SmartOLT:', error?.response?.data || error?.message || error);
      return [];
    }
  }

  /**
   * Busca una ONU sin configurar por los últimos caracteres de su SN (ej: últimos 6 dígitos)
   */
  static async findUnconfiguredOnuBySnSuffix(suffix: string): Promise<UnconfiguredOnu | null> {
    const cleanSuffix = suffix.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanSuffix.length < 4) {
      logger.warn(`Sufijo SN '${suffix}' demasiado corto para búsqueda segura.`);
      return null;
    }

    try {
      const unconfigured = await this.getUnconfiguredOnus();
      logger.info(`Buscando ONU con sufijo '${cleanSuffix}' entre ${unconfigured.length} ONUs no configuradas...`);

      // 1. Coincidencia exacta por terminación
      const matchExact = unconfigured.find((o) => o.sn.toUpperCase().endsWith(cleanSuffix));
      if (matchExact) return matchExact;

      // 2. Coincidencia por contener el sufijo (si el técnico pasó parte intermedia o completa)
      const matchContains = unconfigured.find((o) => o.sn.toUpperCase().includes(cleanSuffix));
      if (matchContains) return matchContains;

      return null;
    } catch (error: any) {
      logger.error('Error al buscar ONU sin configurar por sufijo:', error?.message || error);
      return null;
    }
  }

  /**
   * Ejecuta la autorización y aprovisionamiento automático de la ONU en SmartOLT
   */
  static async authorizeOnu(payload: AuthorizeOnuPayload): Promise<AuthorizeOnuResult> {
    logger.info(`Iniciando autorización en SmartOLT para SN: ${payload.sn}, OLT: ${payload.olt_id}, VLAN: ${payload.vlan}, IP: ${payload.ip_address}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.info('Modo DEV: Autorización simulada exitosa.');
      return {
        success: true,
        message: `ONU ${payload.sn} autorizada exitosamente en modo simulación. IP asignada: ${payload.ip_address}, VLAN: ${payload.vlan}`,
        onu_id: `SIM-${payload.sn}`,
        details: payload,
      };
    }

    try {
      const api = this.getApi();

      const bodyData = {
        olt_id: payload.olt_id,
        board: payload.board,
        port: payload.port,
        sn: payload.sn,
        onu_type: payload.onu_type || 'ZTE-F660',
        name: payload.name,
        onu_mode: payload.onu_mode || 'Routing',
        vlan: payload.vlan,
        ip_address: payload.ip_address,
        netmask: payload.netmask || '255.255.255.0',
        gateway: payload.gateway,
        line_profile: payload.line_profile || 'VLAN',
        download_speed_profile_name: payload.download_speed_profile_name || '40MB-DOWN',
        upload_speed_profile_name: payload.upload_speed_profile_name || '40MB-UP',
        address: payload.address || '',
        zone: payload.zone || 'Actopan',
        comment: payload.comment || 'Activado vía Bot WhatsApp CloudWare',
      };

      const response = await api.post('/onu/authorize_onu', bodyData);
      const resData = response.data;
      logger.info('Respuesta de autorización SmartOLT:', JSON.stringify(resData));

      if (resData?.status === true || response.status === 200 || resData?.response === 'success') {
        // Forzar sincronización no bloqueante o registrar en Turso
        TursoService.saveSmartOltOnus([
          {
            unique_external_id: resData?.unique_external_id || resData?.onu_id || payload.sn,
            sn: payload.sn,
            name: payload.name,
            speed_profile: payload.download_speed_profile_name || '40MB',
            ip_address: payload.ip_address,
            raw_data: JSON.stringify(bodyData),
            updated_at: new Date().toISOString(),
          },
        ]).catch(() => {});

        return {
          success: true,
          message: resData?.message || `Módem ${payload.sn} autorizado correctamente en SmartOLT.`,
          onu_id: resData?.unique_external_id || resData?.onu_id || payload.sn,
          details: resData,
        };
      } else {
        return {
          success: false,
          message: resData?.message || resData?.error || 'SmartOLT rechazó la solicitud de autorización.',
          details: resData,
        };
      }
    } catch (error: any) {
      logger.error('Error al autorizar ONU en SmartOLT:', error?.response?.data || error?.message || error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Fallo de conexión';
      return {
        success: false,
        message: `Error en SmartOLT: ${errMsg}`,
      };
    }
  }

  /**
   * Actualiza el perfil de velocidad (Paquete) de una ONU en SmartOLT en tiempo real
   */
  static async updateSpeedProfile(
    idOrSn: string,
    plan: string
  ): Promise<{ success: boolean; message: string; downProfile: string; upProfile: string; onuRecord?: SmartOltOnuRecord | null }> {
    const profiles = getSmartOltSpeedProfiles(plan);
    logger.info(`Actualizando perfil de velocidad para ONU ${idOrSn} a ${profiles.down} / ${profiles.up}`);

    // 1. Buscar registro en Turso DB para tener datos completos del cliente
    let onuRecord = await TursoService.getOnuById(idOrSn);
    if (!onuRecord) {
      const fuzzy = await TursoService.searchOnusFuzzy(idOrSn, 1);
      if (fuzzy.length > 0 && fuzzy[0].matchScore >= 50) {
        onuRecord = fuzzy[0];
      }
    }

    const externalId = onuRecord?.unique_external_id || idOrSn;
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.info('Modo DEV: Actualización de perfil de velocidad simulada.');
      if (onuRecord) {
        TursoService.saveSmartOltOnus([
          {
            ...onuRecord,
            speed_profile: profiles.down,
            updated_at: new Date().toISOString(),
          },
        ]).catch(() => {});
      }
      return {
        success: true,
        message: `Perfil actualizado a ${profiles.down} (Modo Simulación)`,
        downProfile: profiles.down,
        upProfile: profiles.up,
        onuRecord,
      };
    }

    try {
      const api = this.getApi();
      const bodyData = {
        onu_external_id: externalId,
        download_speed_profile_name: profiles.down,
        upload_speed_profile_name: profiles.up,
      };

      let response;
      try {
        response = await api.post('/onu/update_onu_speed_profiles', bodyData);
      } catch (err: any) {
        // Reintentar con endpoint alternativo si el principal difiere por versión
        response = await api.post('/onu/set_speed_profiles', bodyData);
      }

      const resData = response.data;
      logger.info('Respuesta cambio de paquete SmartOLT:', JSON.stringify(resData));

      if (resData?.status === true || response.status === 200 || resData?.response === 'success') {
        if (onuRecord) {
          TursoService.saveSmartOltOnus([
            {
              ...onuRecord,
              speed_profile: profiles.down,
              updated_at: new Date().toISOString(),
            },
          ]).catch(() => {});
        }

        return {
          success: true,
          message: resData?.message || `Perfil de velocidad actualizado exitosamente a ${profiles.down}.`,
          downProfile: profiles.down,
          upProfile: profiles.up,
          onuRecord,
        };
      } else {
        return {
          success: false,
          message: resData?.message || resData?.error || 'SmartOLT no pudo actualizar el perfil.',
          downProfile: profiles.down,
          upProfile: profiles.up,
          onuRecord,
        };
      }
    } catch (error: any) {
      logger.error('Error al actualizar perfil de velocidad en SmartOLT:', error?.response?.data || error?.message || error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Fallo de comunicación con SmartOLT';
      return {
        success: false,
        message: `Error en SmartOLT: ${errMsg}`,
        downProfile: profiles.down,
        upProfile: profiles.up,
        onuRecord,
      };
    }
  }
}
