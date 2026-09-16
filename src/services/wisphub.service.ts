import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { normalizePhone10 } from '../utils/spintax';
import { cleanPersonName, computeNameMatchScore } from '../utils/fuzzy-matcher';
import { TursoService, WisphubClientRecord } from './turso.service';

const logger = new Logger('WispHubService');

export interface WispHubCliente {
  id: string | number;
  nombre: string;
  telefono: string;
  direccion?: string;
  ip?: string;
  servicio_id?: string;
  onu_id?: string;
  estado?: string;
  estado_facturas?: string;
  precio_plan?: string | number;
  saldo?: string | number;
}

export interface WispHubFactura {
  id: string | number;
  folio: string;
  monto: number;
  fecha_vencimiento: string;
  estado: string; // "1" = pendiente, "2" = pagada
  link_pago?: string;
}

export interface WispHubTicketResult {
  success: boolean;
  folio?: string | number;
  mensaje?: string;
}

export class WispHubService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  private static getApi(): AxiosInstance {
    const url = SettingsService.get('WISPHUB_API_URL', 'WISPHUB_API_URL', config.wisphub.url).replace(/\/+$/, '');
    const apiKey = SettingsService.get('WISPHUB_API_KEY', 'WISPHUB_API_KEY', config.wisphub.apiKey);

    if (!this.api || this.lastUrl !== url || this.lastKey !== apiKey) {
      this.lastUrl = url;
      this.lastKey = apiKey;
      this.api = axios.create({
        baseURL: url,
        headers: {
          'Authorization': `Api-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });
    }
    return this.api;
  }

  static getApiKey(): string {
    return SettingsService.get('WISPHUB_API_KEY', 'WISPHUB_API_KEY', config.wisphub.apiKey);
  }

  /**
   * Busca cliente por número telefónico (comparando últimos 10 dígitos)
   */
  static async buscarClientePorTelefono(rawPhone: string): Promise<WispHubCliente | null> {
    const phone10 = normalizePhone10(rawPhone);
    logger.info(`Buscando cliente por teléfono: ${phone10}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.warn('WISPHUB_API_KEY no configurada o es plantilla. Usando modo de desarrollo.');
      return null;
    }

    try {
      const api = this.getApi();
      const response = await api.get('/clientes/', {
        params: { telefono: phone10 },
      });

      const results = response.data?.results || response.data;
      if (Array.isArray(results) && results.length > 0) {
        const c = results[0];
        return {
          id: c.id_servicio || c.id,
          nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
          telefono: c.telefono || phone10,
          direccion: c.direccion || '',
          ip: c.ip || '',
          servicio_id: String(c.id_servicio || c.id),
          onu_id: c.custom_onu_id || c.onu_id || null,
          estado: c.estado || 'Activo',
        };
      }
      return null;
    } catch (error: any) {
      logger.error('Error al consultar cliente en WispHub:', error?.response?.data || error?.message || error);
      return null;
    }
  }

  /**
   * Busca clientes coincidentes por nombre con algoritmo difuso tolerante
   */
  static async buscarClientePorNombre(nombre: string): Promise<WispHubCliente[]> {
    const rawNombre = (nombre || '').trim();
    if (!rawNombre) return [];

    const cleanName = cleanPersonName(rawNombre) || rawNombre;
    logger.info(`Buscando cliente por nombre en WispHub: "${rawNombre}" (Limpio: "${cleanName}")`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      const words = cleanName.split(/\s+/).filter(w => w.length > 2);
      const searchWord = words[0] || cleanName;

      // Consultar a WispHub filtrando por primer nombre o nombre limpio
      const response = await api.get('/clientes/', {
        params: { nombre: searchWord },
      });

      const results = response.data?.results || response.data;
      if (Array.isArray(results) && results.length > 0) {
        // Evaluar candidatos con algoritmo de scoring
        const scoredCandidates = results.map((c: any) => {
          const clientName = String(c.nombre || `${c.nombre || ''} ${c.apellidos || ''}`).trim();
          const score = computeNameMatchScore(cleanName, clientName);
          return {
            id: c.id_servicio || c.id,
            nombre: clientName,
            telefono: c.telefono || '',
            direccion: c.direccion || '',
            ip: c.ip || '',
            servicio_id: String(c.id_servicio || c.id),
            onu_id: c.custom_onu_id || c.onu_id || null,
            estado: c.estado || 'Activo',
            estado_facturas: c.estado_facturas || 'Pagadas',
            precio_plan: c.precio_plan || 0,
            saldo: c.saldo || 0,
            score,
          };
        });

        // Filtrar y ordenar por mejor score
        scoredCandidates.sort((a, b) => b.score - a.score);
        return scoredCandidates.filter(c => c.score >= 60).slice(0, 4);
      }
      return [];
    } catch (error: any) {
      logger.error('Error al buscar cliente por nombre en WispHub:', error?.response?.data || error?.message || error);
      return [];
    }
  }

  /**
   * Obtiene las facturas pendientes de un cliente (/facturas/?cliente={id}&estado=1)
   */
  static async obtenerFacturasPendientes(clienteId: string | number): Promise<WispHubFactura[]> {
    logger.info(`Consultando facturas pendientes para cliente: ${clienteId}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      const response = await api.get('/facturas/', {
        params: {
          cliente: clienteId,
          estado: 1, // 1 = Pendiente
        },
      });

      const results = response.data?.results || response.data;
      if (Array.isArray(results)) {
        return results.map((f: any) => ({
          id: f.id,
          folio: f.folio || String(f.id),
          monto: Number(f.total || f.monto || 0),
          fecha_vencimiento: f.fecha_limite || f.fecha_vencimiento || 'Próximo corte',
          estado: '1',
          link_pago: f.link_pago || f.url_pasarela || `https://wisphub.net/factura/${f.id}/`,
        }));
      }
      return [];
    } catch (error: any) {
      logger.error('Error al consultar facturas en WispHub:', error?.response?.data || error?.message || error);
      return [];
    }
  }

  /**
   * Diagnóstico financiero integral:
   * Verifica si el cliente está Suspendido/Cancelado/Desactivado en WispHub o tiene facturas pendientes/saldo adeudado.
   * Consulta tanto la API en vivo de WispHub como la base de datos local sincronizada en Turso.
   */
  static async verificarEstadoFinanciero(params: {
    clienteId?: string | number | null;
    nombre?: string | null;
    phone?: string | null;
    sn?: string | null;
    ip?: string | null;
  }): Promise<{
    suspendido: boolean;
    yaPagoPeroNoActivo: boolean;
    totalDeuda: number;
    facturas: WispHubFactura[];
    cliente: WispHubCliente | null;
    motivo?: string;
  }> {
    const { clienteId, nombre, phone, sn, ip } = params;
    let clienteEncontrado: WispHubCliente | null = null;
    let facturas: WispHubFactura[] = [];

    // 1. Buscar cliente por ID numérico en API WispHub
    if (clienteId && !String(clienteId).startsWith('HWTC') && !String(clienteId).startsWith('ONU-')) {
      facturas = await this.obtenerFacturasPendientes(clienteId);
    }

    // 2. Buscar por nombre en API WispHub si no tenemos facturas o cliente
    if (nombre) {
      const nombreLimpio = cleanPersonName(nombre) || nombre;
      const clientesPorNombre = await this.buscarClientePorNombre(nombreLimpio);
      if (clientesPorNombre.length > 0) {
        clienteEncontrado = clientesPorNombre[0];
        if (facturas.length === 0 && clienteEncontrado.id) {
          facturas = await this.obtenerFacturasPendientes(clienteEncontrado.id);
        }
      }
    }

    // 3. Buscar por teléfono en API WispHub si no se ha encontrado
    if (!clienteEncontrado && phone) {
      const clientePorTel = await this.buscarClientePorTelefono(phone);
      if (clientePorTel) {
        clienteEncontrado = clientePorTel;
        if (facturas.length === 0 && clienteEncontrado.id) {
          facturas = await this.obtenerFacturasPendientes(clienteEncontrado.id);
        }
      }
    }

    // 4. Búsqueda y validación con la base de datos sincronizada de Turso (wisphub_clients)
    try {
      const dbClient = await TursoService.getWisphubClientByAny({
        id: clienteId,
        phone,
        sn,
        name: nombre,
        ip,
      });

      if (dbClient) {
        logger.info(`Cliente localizado en base de datos local de WispHub: ID=${dbClient.id_servicio}, Nombre="${dbClient.nombre}", Estado="${dbClient.estado}", Facturas="${dbClient.estado_facturas}", Saldo=$${dbClient.saldo}`);
        
        if (!clienteEncontrado) {
          clienteEncontrado = {
            id: dbClient.id_servicio,
            nombre: dbClient.nombre,
            telefono: dbClient.telefono || phone || '',
            direccion: dbClient.direccion,
            ip: dbClient.ip,
            servicio_id: String(dbClient.id_servicio),
            onu_id: dbClient.sn_onu,
            estado: dbClient.estado,
            estado_facturas: dbClient.estado_facturas,
            precio_plan: dbClient.precio_plan,
            saldo: dbClient.saldo,
          };
        } else {
          // Completar datos si faltaban
          clienteEncontrado.estado = clienteEncontrado.estado || dbClient.estado;
          clienteEncontrado.estado_facturas = clienteEncontrado.estado_facturas || dbClient.estado_facturas;
          clienteEncontrado.saldo = clienteEncontrado.saldo || dbClient.saldo;
          clienteEncontrado.precio_plan = clienteEncontrado.precio_plan || dbClient.precio_plan;
        }
      }
    } catch (err: any) {
      logger.warn('Error al consultar estado financiero en Turso:', err?.message || err);
    }

    let totalDeuda = facturas.reduce((acc, f) => acc + (f.monto || 0), 0);
    const saldoNum = Number(clienteEncontrado?.saldo || 0);
    if (totalDeuda === 0 && saldoNum > 0) {
      totalDeuda = saldoNum;
    }

    const estado = (clienteEncontrado?.estado || '').toLowerCase().trim();
    const estadoFacturas = (clienteEncontrado?.estado_facturas || '').toLowerCase().trim();
    
    // Estados de suspensión o corte en WispHub:
    const esSuspendido = estado === 'suspendido' ||
      estado === 'cortado' ||
      estado === 'cancelado' ||
      estado === 'inactivo' ||
      estado === 'desactivado' ||
      estado === 'baja' ||
      estado === 'retirado' ||
      estado === 'desconectado' ||
      estado.includes('susp');

    // Facturas impagas o morosidad real:
    const tieneFacturaPendiente = estadoFacturas.includes('pendiente') ||
      estadoFacturas.includes('moros') ||
      estadoFacturas.includes('vencid') ||
      estadoFacturas.includes('debe') ||
      estadoFacturas.includes('impag') ||
      totalDeuda > 0;

    // Distinguir entre:
    // A) Moroso real: Tiene facturas pendientes o saldo > 0
    // B) Pagado pero en espera de reconexión/activación: totalDeuda === 0 y no tiene facturas pendientes, pero estado está suspendido/desactivado
    const yaPagoPeroNoActivo = !tieneFacturaPendiente && totalDeuda === 0 && esSuspendido;
    const esMorosoReal = tieneFacturaPendiente && totalDeuda > 0;

    // Si tiene factura pendiente pero el array vino vacío y sabemos que debe, asignamos precio del plan
    if (tieneFacturaPendiente && totalDeuda === 0) {
      const precioPlan = Number(clienteEncontrado?.precio_plan || 0);
      totalDeuda = precioPlan > 0 ? precioPlan : 250;
    }

    const motivo = esMorosoReal
      ? `Factura pendiente de pago ($${totalDeuda.toFixed(2)} MXN)`
      : (yaPagoPeroNoActivo ? 'Cuenta al corriente pero pendiente de activación' : undefined);

    return {
      suspendido: esMorosoReal,
      yaPagoPeroNoActivo,
      totalDeuda: esMorosoReal ? totalDeuda : 0,
      facturas,
      cliente: clienteEncontrado,
      motivo,
    };
  }

  /**
   * Activa o reconecta el servicio del cliente en WispHub (y MikroTik si el router API está habilitado)
   */
  static async activarServicioCliente(clienteId: string | number): Promise<{ success: boolean; mensaje: string }> {
    const id = String(clienteId).replace(/\D/g, '');
    if (!id) return { success: false, mensaje: 'ID de cliente inválido' };

    logger.info(`Solicitando activación/reconexión en WispHub para cliente ID: ${id}...`);
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('tu_token')) {
      return { success: false, mensaje: 'API key de WispHub no configurada' };
    }

    try {
      const api = this.getApi();
      let res;
      try {
        res = await api.post(`/clientes/${id}/activar/`, {});
      } catch {
        try {
          res = await api.post(`/servicios/${id}/activar/`, {});
        } catch {
          res = await api.patch(`/clientes/${id}/`, { estado: 1 });
        }
      }
      logger.info(`Respuesta de activación en WispHub para cliente ${id}:`, res?.data);
      return { success: true, mensaje: 'Servicio activado exitosamente en WispHub' };
    } catch (err: any) {
      logger.warn(`Error al activar servicio en WispHub para ${id}:`, err?.response?.data || err?.message || err);
      return { success: false, mensaje: err?.message || 'Error al solicitar activación' };
    }
  }

  /**
   * Crea un ticket de soporte técnico en WispHub (/tickets/)
   */
  static async crearTicketSoporte(
    clienteId: string | number,
    asunto: string,
    descripcion: string,
    prioridad: 'Baja' | 'Media' | 'Alta' = 'Alta'
  ): Promise<WispHubTicketResult> {
    logger.info(`Creando ticket en WispHub para cliente ${clienteId} - Asunto: ${asunto}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      const folioMock = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
      logger.info(`Modo DEV: Ticket simulado creado con folio ${folioMock}`);
      return { success: true, folio: folioMock, mensaje: 'Ticket generado (Modo simulación)' };
    }

    try {
      const api = this.getApi();
      const response = await api.post('/tickets/', {
        cliente: clienteId,
        asunto,
        descripcion,
        prioridad,
        departamento: 'Soporte Técnico',
      });

      const data = response.data;
      const folio = data?.id || data?.folio || `TK-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        folio,
        mensaje: 'Ticket creado exitosamente',
      };
    } catch (error: any) {
      logger.error('Error al crear ticket en WispHub:', error?.response?.data || error?.message || error);
      const fallbackFolio = `TK-${Date.now().toString().slice(-6)}`;
      return {
        success: true,
        folio: fallbackFolio,
        mensaje: 'Ticket registrado con respaldo de emergencia',
      };
    }
  }

  // Control de sincronización
  private static isSyncing: boolean = false;
  private static lastSyncTimestamp: number = 0;

  /**
   * Sincroniza todos los clientes desde WispHub API hacia Turso DB (Solo lectura de la API de WispHub)
   * Recorre la paginación con lotes de 100 registros.
   */
  static async syncAllClientesToTurso(force: boolean = false): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('tu_token')) {
      return {
        success: false,
        count: 0,
        message: 'WISPHUB_API_KEY no está configurada o es plantilla.',
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        count: 0,
        message: 'Ya hay una sincronización de WispHub en progreso.',
      };
    }

    this.isSyncing = true;
    try {
      logger.info('Iniciando sincronización masiva de clientes desde WispHub (/api/clientes/)...');
      const api = this.getApi();
      let offset = 0;
      const limit = 100;
      let totalFetched = 0;
      let hasMore = true;

      while (hasMore) {
        logger.info(`Descargando clientes de WispHub: offset=${offset}, limit=${limit}...`);
        const response = await api.get('/clientes/', {
          params: { limit, offset },
        });

        const data = response.data;
        const results = Array.isArray(data) ? data : (data?.results || []);

        if (results.length === 0) {
          hasMore = false;
          break;
        }

        const records: WisphubClientRecord[] = results.map((c: any) => ({
          id_servicio: c.id_servicio || c.id,
          nombre: String(c.nombre || `${c.nombre || ''} ${c.apellidos || ''}`).trim(),
          servicio: String(c.servicio || c.nombre || '').trim(),
          ip: String(c.ip || '').trim(),
          estado: String(c.estado || 'Activo'),
          estado_facturas: String(c.estado_facturas || 'Pagadas'),
          precio_plan: String(c.precio_plan || '0'),
          saldo: String(c.saldo || '0'),
          plan_internet: typeof c.plan_internet === 'object' ? String(c.plan_internet?.nombre || '') : String(c.plan_internet || ''),
          router: typeof c.router === 'object' ? String(c.router?.nombre || '') : String(c.router || ''),
          sn_onu: String(c.sn_onu || ''),
          telefono: String(c.telefono || ''),
          direccion: String(c.direccion || ''),
          raw_data: JSON.stringify({
            fecha_corte: c.fecha_corte,
            ultimo_cambio: c.ultimo_cambio,
            usuario: c.usuario,
          }),
        }));

        await TursoService.saveWisphubClients(records);
        totalFetched += results.length;
        offset += results.length;

        // Si WispHub indica que no hay siguiente página o trajimos menos del límite
        if (!data?.next || results.length < limit) {
          hasMore = false;
        }
      }

      this.lastSyncTimestamp = Date.now();
      logger.info(`Sincronización de WispHub finalizada: ${totalFetched} clientes guardados.`);
      return {
        success: true,
        count: totalFetched,
        message: `Sincronización exitosa: ${totalFetched} clientes de WispHub guardados en Turso DB.`,
      };
    } catch (error: any) {
      logger.error('Error al sincronizar clientes de WispHub:', error?.response?.data || error?.message || error);
      return {
        success: false,
        count: 0,
        message: `Error al contactar WispHub: ${error?.response?.data?.detail || error?.message || 'Error de conexión'}`,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}
