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
  pon_type?: string;
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
  pon_type?: string;
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

export interface SpeedProfileItem {
  id: string;
  name: string;
  speed: string;
  direction: 'download' | 'upload';
}

export function getSmartOltSpeedProfiles(
  plan?: string,
  catalog?: SpeedProfileItem[]
): { down: string; up: string } {
  const p = (plan || '').toUpperCase();
  const match = p.match(/(\d+)/);
  const requestedMb = match ? parseInt(match[1], 10) : 40;

  if (catalog && catalog.length > 0) {
    // Buscar perfil de descarga que coincida con la velocidad en MB
    const downProfiles = catalog.filter(c => c.direction === 'download');
    const upProfiles = catalog.filter(c => c.direction === 'upload');

    // 1. Coincidencia exacta por nombre (ej: "60MB-DOWN", "500MB-Down", "50M")
    const matchDown = downProfiles.find(c => {
      const numMatch = c.name.match(/(\d+)/);
      return numMatch && parseInt(numMatch[1], 10) === requestedMb;
    });

    const matchUp = upProfiles.find(c => {
      const numMatch = c.name.match(/(\d+)/);
      return numMatch && parseInt(numMatch[1], 10) === requestedMb;
    });

    if (matchDown && matchUp) {
      return { down: matchDown.name, up: matchUp.name };
    }
    if (matchDown) {
      return { down: matchDown.name, up: matchDown.name.replace(/down/i, 'Up') };
    }
  }

  // Fallback estándar
  return {
    down: `${requestedMb}MB-DOWN`,
    up: `${requestedMb}MB-UP`,
  };
}

export class SmartOLTService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  // Caché de catálogo de perfiles de velocidad oficial de SmartOLT (TTL 30 minutos)
  private static speedProfilesCatalog: SpeedProfileItem[] = [];
  private static lastSpeedProfilesFetch: number = 0;
  private static readonly SPEED_PROFILES_TTL_MS = 30 * 60 * 1000;

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
        },
        timeout: 15000,
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

      if (data?.status === false && data?.error) {
        logger.error('SmartOLT respondió con error en sincronización:', data.error);
        return {
          success: false,
          count: 0,
          message: `Error de SmartOLT: ${data.error}`,
        };
      }

      const rawOnus = Array.isArray(data)
        ? data
        : data?.onus || data?.response || data?.details || [];

      logger.info(`Se recibieron ${rawOnus.length} ONUs desde la API de SmartOLT.`);

      if (rawOnus.length === 0) {
        return {
          success: true,
          count: 0,
          message: 'SmartOLT respondió exitosamente pero no se encontraron ONUs.',
        };
      }

      const transformed: SmartOltOnuRecord[] = rawOnus.map((item: any) => ({
        unique_external_id: item.unique_external_id || item.external_id || item.sn || item.onu_id || '',
        sn: String(item.sn || item.serial_number || item.onu_sn || '').trim().toUpperCase(),
        name: item.name || item.onu_name || item.client_name || '',
        speed_profile: item.download_speed_profile_name || item.speed_profile || item.plan || '',
        ip_address: item.ip_address || item.ip || null,
        zone_name: item.zone || item.zone_name || item.location || 'Actopan',
        onu_type_name: item.onu_type_name || item.model || item.type || '',
        raw_data: JSON.stringify(item),
        updated_at: new Date().toISOString(),
      }));

      await TursoService.saveSmartOltOnus(transformed);

      // Reconciliación: Purgar de Turso DB las ONUs eliminadas en SmartOLT para liberar sus IPs
      const activeIds = new Set<string>(transformed.map(t => t.unique_external_id).filter(Boolean));
      const prunedCount = await TursoService.pruneSmartOltOnus(activeIds);

      this.lastSyncTimestamp = Date.now();
      logger.info(`✅ Sincronización completada exitosamente: ${transformed.length} ONUs activas guardadas, ${prunedCount} eliminadas/purgadas.`);

      return {
        success: true,
        count: transformed.length,
        message: `Sincronización exitosa: ${transformed.length} ONUs sincronizadas con Turso DB${prunedCount > 0 ? ` (${prunedCount} ONUs eliminadas purgadas y sus IPs liberadas)` : ''}.`,
      };
    } catch (error: any) {
      logger.error('Error al sincronizar ONUs con SmartOLT:', error?.response?.data || error?.message || error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Error de conexión con SmartOLT';
      return {
        success: false,
        count: 0,
        message: `Fallo al sincronizar: ${errMsg}`,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Consulta el estado físico y óptico de la ONU en la OLT con caché de 3 minutos
   */
  static async obtenerEstadoONU(onuId: string): Promise<SmartOltStatusResult> {
    const cleanId = onuId.trim();
    const now = Date.now();
    const cached = this.statusCache.get(cleanId);
    if (cached && (now - cached.timestamp) < this.STATUS_CACHE_TTL_MS) {
      logger.info(`Retornando estado de ONU ${cleanId} desde caché en memoria (${Math.round((now - cached.timestamp)/1000)}s)`);
      return { ...cached.result, fromCache: true };
    }

    logger.info(`Consultando estado físico en vivo en SmartOLT para ONU: ${cleanId}`);
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
      let onuRecord = await TursoService.getOnuById(cleanId);
      if (!onuRecord && cleanId.length < 12) {
        const matches = await TursoService.searchOnusFuzzy(cleanId, 1);
        if (matches.length > 0) onuRecord = matches[0];
      }

      const externalId = onuRecord?.unique_external_id || cleanId;
      const response = await api.get(`/onu/get_onu_status/${encodeURIComponent(externalId)}`);
      const data = response.data;
      logger.info(`Respuesta SmartOLT get_onu_status para ${cleanId}:`, JSON.stringify(data));

      const onuStatus = String(data?.onu_status || (typeof data?.status === 'string' ? data.status : '')).toLowerCase();
      let result: SmartOltStatusResult;

      if (onuStatus.includes('los') || onuStatus.includes('loss of signal') || onuStatus.includes('fiber broken')) {
        result = {
          status: 'LOS',
          rawStatus: data?.onu_status || 'LOS',
          opticalPowerDbm: null,
          descripcion: 'Corte de señal óptica (Fibra rota o desconectada de la caja)',
          sn: onuRecord?.sn || cleanId,
        };
      } else if (onuStatus.includes('power fail') || onuStatus.includes('dying gasp') || onuStatus.includes('power down')) {
        result = {
          status: 'POWER_FAIL',
          rawStatus: data?.onu_status || 'Power fail',
          opticalPowerDbm: null,
          descripcion: 'Pérdida de energía eléctrica en el domicilio (Equipo apagado)',
          sn: onuRecord?.sn || cleanId,
        };
      } else if (onuStatus.includes('online') || onuStatus.includes('up') || onuStatus.includes('working')) {
        let opticalPower: number | null = null;
        let signalQuality = '';
        try {
          const sigRes = await api.get(`/onu/get_onu_signal/${encodeURIComponent(externalId)}`);
          const sigData = sigRes.data;
          signalQuality = sigData?.onu_signal || '';
          const rawSignal = sigData?.onu_signal_1490 || sigData?.onu_signal_value || '';
          const matchDbm = String(rawSignal).match(/([-+]?[0-9]+(?:\.[0-9]+)?)/);
          if (matchDbm && matchDbm[1]) {
            opticalPower = parseFloat(matchDbm[1]);
          }
        } catch (sigErr: any) {
          logger.warn(`No se pudo obtener señal óptica detallada para ${cleanId}:`, sigErr?.message || sigErr);
        }

        const signalText = opticalPower !== null ? `${opticalPower} dBm (${signalQuality || 'Óptimo'})` : 'Óptimo';
        result = {
          status: 'ONLINE',
          rawStatus: data?.onu_status || 'Online',
          opticalPowerDbm: opticalPower,
          uptime: data?.last_status_change ? `Desde ${data.last_status_change}` : (data?.uptime || ''),
          descripcion: `Equipo en línea. Nivel de señal óptica: ${signalText}`,
          sn: onuRecord?.sn || cleanId,
        };
      } else {
        result = {
          status: 'OFFLINE',
          rawStatus: data?.onu_status || 'Offline',
          opticalPowerDbm: null,
          descripcion: 'Equipo desconectado o fuera de línea.',
          sn: onuRecord?.sn || cleanId,
        };
      }

      this.statusCache.set(cleanId, { result, timestamp: Date.now() });
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

  static async getOnuStatus(snOrExternalId: string): Promise<SmartOltStatusResult> {
    return this.obtenerEstadoONU(snOrExternalId);
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
      let onuRecord = await TursoService.getOnuById(onuId);
      const externalId = onuRecord?.unique_external_id || onuId;

      const api = this.getApi();
      const form = new FormData();
      form.append('onu_external_id', externalId);
      const response = await api.post(`/onu/reboot_onu/${encodeURIComponent(externalId)}`, form);
      const resData = response.data;

      if (resData?.status === true || response.status === 200 || resData?.response === 'success') {
        return {
          success: true,
          message: resData?.message || 'Orden de reinicio enviada correctamente a la OLT.',
        };
      } else {
        return {
          success: false,
          message: resData?.message || resData?.error || 'SmartOLT rechazó la solicitud de reinicio.',
        };
      }
    } catch (error: any) {
      logger.error(`Error al reiniciar ONU ${onuId} en SmartOLT:`, error?.response?.data || error?.message || error);
      return {
        success: false,
        message: 'No se pudo completar el reinicio remoto en la OLT.',
      };
    }
  }

  static async rebootOnu(snOrExternalId: string): Promise<{ success: boolean; message: string }> {
    return this.rebootONU(snOrExternalId);
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
        pon_type: item.pon_type || 'gpon',
        board: item.board || item.slot || '0',
        port: item.port || item.pon || '0',
        sn: String(item.sn || item.serial_number || item.onu_sn || '').trim().toUpperCase(),
        onu_type: item.onu_type_name || item.onu_type || item.model || 'HG8145X6-10',
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
   * Normaliza cadenas para SmartOLT eliminando acentos (á->a), diacríticos, eñes (ñ->n) y caracteres especiales
   * para evitar errores de validación de SmartOLT ("Invalid characters", etc.).
   */
  static normalizeSmartOltString(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
      // Descomponer caracteres con acentos
      .normalize('NFD')
      // Eliminar marcas de acento (á->a, é->e, í->i, ó->o, ú->u, etc.)
      .replace(/[\u0300-\u036f]/g, '')
      // Reemplazo específico para eñes
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      // Eliminar caracteres especiales no permitidos por SmartOLT (permitir letras, números, espacios, guiones, puntos y barras)
      .replace(/[^a-zA-Z0-9\s.\-_#/]/g, ' ')
      // Reducir espacios consecutivos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Ejecuta la autorización y aprovisionamiento automático de la ONU en SmartOLT
   */
  static async authorizeOnu(payload: AuthorizeOnuPayload): Promise<AuthorizeOnuResult> {
    const cleanName = this.normalizeSmartOltString(payload.name);
    const cleanAddress = this.normalizeSmartOltString(payload.address);
    const cleanZone = this.normalizeSmartOltString(payload.zone);
    const cleanComment = this.normalizeSmartOltString(payload.comment);

    logger.info(`Iniciando autorización en SmartOLT para SN: ${payload.sn}, Cliente: "${cleanName}", OLT: ${payload.olt_id}, VLAN: ${payload.vlan}, IP: ${payload.ip_address}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.info('Modo DEV: Autorización simulada exitosa.');
      return {
        success: true,
        message: `ONU ${payload.sn} autorizada exitosamente en modo simulación. IP asignada: ${payload.ip_address}, VLAN: ${payload.vlan}`,
        onu_id: `SIM-${payload.sn}`,
        details: { ...payload, name: cleanName },
      };
    }

    try {
      const api = this.getApi();

      // SmartOLT API requiere multipart/form-data (FormData)
      const form = new FormData();
      form.append('olt_id', String(payload.olt_id));
      form.append('pon_type', payload.pon_type || 'gpon');
      form.append('board', String(payload.board));
      form.append('port', String(payload.port));
      form.append('sn', String(payload.sn).trim().toUpperCase());
      form.append('onu_type', String(payload.onu_type || 'HG8145X6-10'));
      form.append('name', cleanName);
      
      // Modo de Operación WAN: Routing con IP estática y acceso remoto habilitado
      form.append('mode', 'Routing');
      form.append('onu_mode', 'Routing');
      form.append('wan_mode', 'Static');
      form.append('wan_ip_mode', 'Static IP');
      form.append('wan_remote_access', 'enabled_from_everywhere');
      form.append('remote_access', 'enabled_from_everywhere');
      
      // VLAN y Configuración IP / Máscara / Gateway / DNS
      form.append('vlan', String(payload.vlan));
      form.append('ip_address', String(payload.ip_address));
      form.append('subnet_mask', String(payload.netmask || '255.255.255.0'));
      form.append('netmask', String(payload.netmask || '255.255.255.0'));
      form.append('default_gateway', String(payload.gateway || '172.19.2.254'));
      form.append('gateway', String(payload.gateway || '172.19.2.254'));
      form.append('dns1', '8.8.8.8');
      form.append('dns2', '8.8.4.4');
      
      // Perfiles de velocidad y VLAN
      form.append('line_profile', String(payload.line_profile || 'VLAN'));
      form.append('download_speed_profile_name', String(payload.download_speed_profile_name || '40MB-DOWN'));
      form.append('upload_speed_profile_name', String(payload.upload_speed_profile_name || '40MB-UP'));
      if (cleanAddress) form.append('address', cleanAddress);
      if (cleanZone) form.append('zone', cleanZone);
      if (cleanComment) form.append('comment', cleanComment);

      const response = await api.post('/onu/authorize_onu', form);
      const resData = response.data;
      logger.info('Respuesta de autorización SmartOLT:', JSON.stringify(resData));

      if (resData?.status === true || response.status === 200 || resData?.response_code === 'success' || resData?.response === 'success' || (typeof resData?.response === 'string' && resData.response.toLowerCase().includes('saved'))) {
        const onuExternalId = resData?.unique_external_id || resData?.onu_id || payload.sn;

        // SmartOLT Aprovisionamiento TR-069 / OMCI y WAN Static IP Dual Stack
        if (payload.ip_address && onuExternalId) {
          const isSanAgustin = String(payload.olt_id) === '2' || (payload.zone || '').toLowerCase().includes('san agustin');
          const mgmtVlan = isSanAgustin ? '60' : '99';

          // 1. Configurar Management IP en la VLAN de gestión (99 Actopan / 60 San Agustín)
          try {
            logger.info(`Configurando Management IP en VLAN ${mgmtVlan} para ${onuExternalId}...`);
            const mgmtForm = new FormData();
            mgmtForm.append('vlan', mgmtVlan);
            const mgmtHeaders = typeof (mgmtForm as any).getHeaders === 'function' ? (mgmtForm as any).getHeaders() : undefined;
            await api.post(`/onu/set_onu_mgmt_ip_static_ip/${onuExternalId}`, mgmtForm, { headers: mgmtHeaders });
            logger.info(`Management IP asignada con éxito para ${onuExternalId}`);
          } catch (mErr: any) {
            logger.warn(`No se pudo asignar Management IP para ${onuExternalId}:`, mErr?.response?.data || mErr?.message);
          }

          // 2. Habilitar Perfil TR-069 SmartOLT sobre la interfaz de gestión (mgmt)
          let tr069Enabled = false;
          try {
            logger.info(`Habilitando Perfil TR-069 'SmartOLT' para ${onuExternalId}...`);
            const tr069Form = new FormData();
            tr069Form.append('tr069_profile', 'SmartOLT');
            tr069Form.append('tr069_interface', 'mgmt');
            const tr069Headers = typeof (tr069Form as any).getHeaders === 'function' ? (tr069Form as any).getHeaders() : undefined;
            await api.post(`/onu/enable_tr069/${onuExternalId}`, tr069Form, { headers: tr069Headers });
            tr069Enabled = true;
            logger.info(`Perfil TR-069 SmartOLT habilitado con éxito para ${onuExternalId}`);
          } catch (trErr: any) {
            logger.warn(`No se pudo habilitar TR-069 para ${onuExternalId} (se usará OMCI):`, trErr?.response?.data || trErr?.message);
          }

          // 3. Configurar WAN en Static IP con Dual Stack IPv4/IPv6 y Auto
          try {
            logger.info(`Configurando WAN Static IP para ${onuExternalId} (${payload.ip_address})...`);
            const staticForm = new FormData();
            staticForm.append('ipv4_address', String(payload.ip_address));
            staticForm.append('subnet_mask', String(payload.netmask || '255.255.255.0'));
            staticForm.append('gateway', String(payload.gateway || '172.19.2.254'));
            staticForm.append('dns1', '8.8.8.8');
            staticForm.append('dns2', '8.8.4.4');
            staticForm.append('configuration_method', tr069Enabled ? 'TR069' : 'OMCI');
            staticForm.append('ip_protocol', 'ipv4ipv6');
            staticForm.append('ipv6_address_mode', 'Auto');
            staticForm.append('ipv6_prefix_delegation_mode', 'DHCPv6-PD');

            const staticHeaders = typeof (staticForm as any).getHeaders === 'function' ? (staticForm as any).getHeaders() : undefined;
            const staticRes = await api.post(`/onu/set_onu_wan_mode_static_ip/${onuExternalId}`, staticForm, {
              headers: staticHeaders
            });
            logger.info(`WAN Static IP (${tr069Enabled ? 'TR069' : 'OMCI'}) configurada exitosamente para ${onuExternalId}:`, JSON.stringify(staticRes.data));

            // 4. Habilitar acceso remoto a la WAN IP
            await api.post(`/onu/enable_allow_remote_access_to_wan_ip/${onuExternalId}`).catch((e) => {
              logger.warn(`No se pudo habilitar acceso remoto a WAN IP para ${onuExternalId}:`, e?.message);
            });
          } catch (wanErr: any) {
            logger.error(`Error al aplicar WAN Static IP para ${onuExternalId}:`, wanErr?.response?.data || wanErr?.message || wanErr);
          }
        }

        // Forzar registro en Turso DB
        TursoService.saveSmartOltOnus([
          {
            unique_external_id: onuExternalId,
            sn: payload.sn,
            name: payload.name,
            speed_profile: payload.download_speed_profile_name || '40MB',
            ip_address: payload.ip_address,
            zone_name: payload.zone || 'Actopan',
            raw_data: JSON.stringify(payload),
            updated_at: new Date().toISOString(),
          },
        ]).catch(() => {});

        return {
          success: true,
          message: resData?.message || resData?.response || `Módem ${payload.sn} autorizado y configurado en Static IP en SmartOLT.`,
          onu_id: onuExternalId,
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
   * Configura o actualiza una ONU existente para habilitar TR-069 y WAN Static IP Dual Stack IPv4/IPv6
   */
  static async configureOnuTr069AndIpv6(onuIdOrExternalId: string, options?: {
    ip_address?: string;
    netmask?: string;
    gateway?: string;
    vlan?: string;
    zone?: string;
    olt_id?: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const api = this.getApi();
      const cleanId = onuIdOrExternalId.trim();

      // 1. Obtener registro de Turso o detalles para conocer IP, Zona, etc.
      let onuRecord = await TursoService.getOnuById(cleanId);
      if (!onuRecord && cleanId.length < 12) {
        const matches = await TursoService.searchOnusFuzzy(cleanId, 1);
        if (matches.length > 0) onuRecord = matches[0];
      }

      const externalId = onuRecord?.unique_external_id || cleanId;
      let rawData: any = {};
      if (onuRecord?.raw_data) {
        try { rawData = JSON.parse(onuRecord.raw_data); } catch {}
      }

      const ip = options?.ip_address || onuRecord?.ip_address || rawData?.ip_address || rawData?.ip;
      const zone = options?.zone || onuRecord?.zone_name || rawData?.zone || rawData?.zone_name || 'Actopan';
      const oltId = options?.olt_id || rawData?.olt_id || (zone.toLowerCase().includes('san agustin') ? '2' : '1');
      const isSanAgustin = String(oltId) === '2' || zone.toLowerCase().includes('san agustin');
      const mgmtVlan = isSanAgustin ? '60' : '99';

      const results: string[] = [];

      // A. Configurar Management IP en la VLAN de gestión (99 Actopan / 60 San Agustín)
      try {
        logger.info(`Configurando Management IP en VLAN ${mgmtVlan} para ${externalId}...`);
        const mgmtForm = new FormData();
        mgmtForm.append('vlan', mgmtVlan);
        const mgmtHeaders = typeof (mgmtForm as any).getHeaders === 'function' ? (mgmtForm as any).getHeaders() : undefined;
        await api.post(`/onu/set_onu_mgmt_ip_static_ip/${externalId}`, mgmtForm, { headers: mgmtHeaders });
        results.push(`VLAN Gestión ${mgmtVlan}`);
      } catch (mErr: any) {
        logger.warn(`No se pudo asignar Management IP para ${externalId}:`, mErr?.response?.data || mErr?.message);
      }

      // B. Habilitar Perfil TR-069 SmartOLT sobre la interfaz de gestión (mgmt)
      let tr069Ok = false;
      try {
        logger.info(`Habilitando Perfil TR-069 'SmartOLT' para ${externalId}...`);
        const tr069Form = new FormData();
        tr069Form.append('tr069_profile', 'SmartOLT');
        tr069Form.append('tr069_interface', 'mgmt');
        const tr069Headers = typeof (tr069Form as any).getHeaders === 'function' ? (tr069Form as any).getHeaders() : undefined;
        await api.post(`/onu/enable_tr069/${externalId}`, tr069Form, { headers: tr069Headers });
        tr069Ok = true;
        results.push("TR-069 'SmartOLT' Activo");
      } catch (trErr: any) {
        logger.warn(`No se pudo habilitar TR-069 para ${externalId}:`, trErr?.response?.data || trErr?.message);
      }

      // C. Configurar WAN en Static IP con Dual Stack IPv4/IPv6 si tenemos IP
      if (ip) {
        try {
          logger.info(`Configurando WAN Static IP para ${externalId} (${ip})...`);
          const staticForm = new FormData();
          staticForm.append('ipv4_address', String(ip));
          staticForm.append('subnet_mask', String(options?.netmask || '255.255.255.0'));
          staticForm.append('gateway', String(options?.gateway || '172.19.2.254'));
          staticForm.append('dns1', '8.8.8.8');
          staticForm.append('dns2', '8.8.4.4');
          staticForm.append('configuration_method', tr069Ok ? 'TR069' : 'OMCI');
          staticForm.append('ip_protocol', 'ipv4ipv6');
          staticForm.append('ipv6_address_mode', 'Auto');
          staticForm.append('ipv6_prefix_delegation_mode', 'DHCPv6-PD');

          const staticHeaders = typeof (staticForm as any).getHeaders === 'function' ? (staticForm as any).getHeaders() : undefined;
          await api.post(`/onu/set_onu_wan_mode_static_ip/${externalId}`, staticForm, { headers: staticHeaders });
          results.push(`Dual Stack IPv4/IPv6 (${tr069Ok ? 'TR-069' : 'OMCI'})`);

          // D. Habilitar acceso remoto a la WAN IP
          await api.post(`/onu/enable_allow_remote_access_to_wan_ip/${externalId}`).catch(() => {});
          results.push('Acceso remoto WAN');
        } catch (wanErr: any) {
          logger.error(`Error al aplicar WAN Static IP para ${externalId}:`, wanErr?.response?.data || wanErr?.message);
        }
      }

      // Actualizar registro local en Turso DB
      if (onuRecord) {
        const updatedRaw = {
          ...rawData,
          tr069: 'Enabled',
          tr069_profile: 'SmartOLT',
          configuration_method: tr069Ok ? 'TR069' : 'OMCI',
          ip_protocol: 'ipv4ipv6',
          ipv6_address_mode: 'Auto',
        };
        await TursoService.saveSmartOltOnus([{
          ...onuRecord,
          raw_data: JSON.stringify(updatedRaw),
          updated_at: new Date().toISOString(),
        }]);
      }

      return {
        success: true,
        message: `Configuración aplicada a ${externalId}: ${results.join(', ')}`,
      };
    } catch (error: any) {
      logger.error(`Error al configurar TR-069 e IPv6 para ${onuIdOrExternalId}:`, error?.response?.data || error?.message || error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Fallo de conexión';
      return {
        success: false,
        message: `Error al configurar en SmartOLT: ${errMsg}`,
      };
    }
  }

  /**
   * Obtiene y almacena en caché el catálogo oficial de perfiles de velocidad configurados en SmartOLT
   */
  static async getSpeedProfilesCatalog(): Promise<SpeedProfileItem[]> {
    const now = Date.now();
    if (this.speedProfilesCatalog.length > 0 && (now - this.lastSpeedProfilesFetch) < this.SPEED_PROFILES_TTL_MS) {
      return this.speedProfilesCatalog;
    }
    try {
      const api = this.getApi();
      const res = await api.get('/system/get_speed_profiles');
      if (res.data?.response && Array.isArray(res.data.response)) {
        this.speedProfilesCatalog = res.data.response;
        this.lastSpeedProfilesFetch = now;
        logger.info(`Catálogo SmartOLT cargado: ${this.speedProfilesCatalog.length} perfiles de velocidad.`);
      }
    } catch (err: any) {
      logger.warn('No se pudo descargar catálogo de perfiles de SmartOLT:', err?.message || err);
    }
    return this.speedProfilesCatalog;
  }

  /**
   * Actualiza el perfil de velocidad (Paquete) de una ONU en SmartOLT en tiempo real
   */
  static async updateSpeedProfile(
    idOrSn: string,
    plan: string
  ): Promise<{ success: boolean; message: string; downProfile: string; upProfile: string; onuRecord?: SmartOltOnuRecord | null }> {
    const catalog = await this.getSpeedProfilesCatalog();
    const profiles = getSmartOltSpeedProfiles(plan, catalog);
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
      const form = new FormData();
      form.append('download_speed_profile_name', profiles.down);
      form.append('upload_speed_profile_name', profiles.up);

      // Endpoint oficial de SmartOLT: POST /onu/update_onu_speed_profiles/{{onu_external_id}}
      let response;
      try {
        response = await api.post(`/onu/update_onu_speed_profiles/${encodeURIComponent(externalId)}`, form);
      } catch (err: any) {
        // Fallback con cuerpo si el path difiere
        const fallbackForm = new FormData();
        fallbackForm.append('onu_external_id', externalId);
        fallbackForm.append('download_speed_profile_name', profiles.down);
        fallbackForm.append('upload_speed_profile_name', profiles.up);
        response = await api.post('/onu/update_onu_speed_profiles', fallbackForm);
      }

      const resData = response.data;
      logger.info('Respuesta cambio de paquete SmartOLT:', JSON.stringify(resData));

      if (resData?.status === true || response.status === 200 || resData?.response_code === 'success' || resData?.response === 'success') {
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
          message: resData?.response || resData?.message || `Perfil de velocidad actualizado exitosamente a ${profiles.down}.`,
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

  /**
   * Elimina una ONU de SmartOLT y la purga inmediatamente de Turso DB para liberar su IP
   */
  static async deleteOnu(onuExternalId: string): Promise<{ success: boolean; message: string }> {
    if (!onuExternalId) return { success: false, message: 'ID de ONU requerido' };
    try {
      const api = this.getApi();
      const response = await api.post(`/onu/delete/${onuExternalId}`);
      const resData = response.data;

      if (resData?.status === true || resData?.response_code === 'success' || response.status === 200) {
        await TursoService.deleteSmartOltOnu(onuExternalId);
        logger.info(`ONU ${onuExternalId} eliminada de SmartOLT y de Turso DB. IP liberada.`);
        return {
          success: true,
          message: resData?.response || resData?.message || `ONU ${onuExternalId} eliminada correctamente de SmartOLT e IP liberada en el sistema.`,
        };
      } else {
        return {
          success: false,
          message: resData?.message || resData?.error || 'SmartOLT rechazó la eliminación de la ONU.',
        };
      }
    } catch (error: any) {
      logger.error(`Error al eliminar ONU ${onuExternalId} en SmartOLT:`, error?.response?.data || error?.message || error);
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Error de conexión';
      return {
        success: false,
        message: `Error en SmartOLT: ${errMsg}`,
      };
    }
  }
}
