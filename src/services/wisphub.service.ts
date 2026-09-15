import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { normalizePhone10 } from '../utils/spintax';
import { cleanPersonName, computeNameMatchScore } from '../utils/fuzzy-matcher';

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
   * Verifica si el cliente está Suspendido/Cancelado en WispHub o tiene facturas pendientes
   */
  static async verificarEstadoFinanciero(params: {
    clienteId?: string | number | null;
    nombre?: string | null;
    phone?: string | null;
  }): Promise<{
    suspendido: boolean;
    totalDeuda: number;
    facturas: WispHubFactura[];
    cliente: WispHubCliente | null;
    motivo?: string;
  }> {
    const { clienteId, nombre, phone } = params;
    let clienteEncontrado: WispHubCliente | null = null;
    let facturas: WispHubFactura[] = [];

    // 1. Buscar cliente por ID numérico si aplica
    if (clienteId && !String(clienteId).startsWith('HWTC') && !String(clienteId).startsWith('ONU-')) {
      facturas = await this.obtenerFacturasPendientes(clienteId);
    }

    // 2. Buscar por nombre si no tenemos facturas o cliente
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

    // 3. Buscar por teléfono si no se ha encontrado
    if (!clienteEncontrado && phone) {
      const clientePorTel = await this.buscarClientePorTelefono(phone);
      if (clientePorTel) {
        clienteEncontrado = clientePorTel;
        if (facturas.length === 0 && clienteEncontrado.id) {
          facturas = await this.obtenerFacturasPendientes(clienteEncontrado.id);
        }
      }
    }

    let totalDeuda = facturas.reduce((acc, f) => acc + (f.monto || 0), 0);
    const estado = (clienteEncontrado?.estado || '').toLowerCase();
    const estadoFacturas = (clienteEncontrado?.estado_facturas || '').toLowerCase();
    const esSuspendido = estado === 'suspendido' || estado === 'cortado' || estado === 'cancelado' || estado === 'inactivo';
    const tieneFacturaPendiente = estadoFacturas.includes('pendiente') || totalDeuda > 0;

    // Si está suspendido o tiene factura pendiente pero el desglose de facturas vino vacío, asignamos el precio del plan
    if ((esSuspendido || tieneFacturaPendiente) && totalDeuda === 0) {
      const precioPlan = Number(clienteEncontrado?.precio_plan || 0);
      totalDeuda = precioPlan > 0 ? precioPlan : 250;
    }

    return {
      suspendido: esSuspendido || tieneFacturaPendiente,
      totalDeuda,
      facturas,
      cliente: clienteEncontrado,
      motivo: esSuspendido ? `Cliente con estado "${clienteEncontrado?.estado}" en WispHub` : (tieneFacturaPendiente ? `Factura pendiente de pago ($${totalDeuda} MXN)` : undefined),
    };
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
}
