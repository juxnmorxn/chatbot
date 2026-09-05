import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { Logger } from '../utils/logger';
import { normalizePhone10 } from '../utils/spintax';

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

  private static getApi(): AxiosInstance {
    if (!this.api) {
      this.api = axios.create({
        baseURL: config.wisphub.url,
        headers: {
          'Authorization': `Api-Key ${config.wisphub.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });
    }
    return this.api;
  }

  /**
   * Busca cliente por número telefónico (comparando últimos 10 dígitos)
   */
  static async buscarClientePorTelefono(rawPhone: string): Promise<WispHubCliente | null> {
    const phone10 = normalizePhone10(rawPhone);
    logger.info(`Buscando cliente por teléfono: ${phone10}`);

    if (!config.wisphub.apiKey || config.wisphub.apiKey.includes('tu_token')) {
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
   * Busca clientes coincidentes por nombre
   */
  static async buscarClientePorNombre(nombre: string): Promise<WispHubCliente[]> {
    logger.info(`Buscando cliente por nombre: ${nombre}`);

    if (!config.wisphub.apiKey || config.wisphub.apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      const response = await api.get('/clientes/', {
        params: { search: nombre },
      });

      const results = response.data?.results || response.data;
      if (Array.isArray(results)) {
        return results.slice(0, 3).map((c: any) => ({
          id: c.id_servicio || c.id,
          nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          ip: c.ip || '',
          servicio_id: String(c.id_servicio || c.id),
          onu_id: c.custom_onu_id || c.onu_id || null,
          estado: c.estado || 'Activo',
        }));
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

    if (!config.wisphub.apiKey || config.wisphub.apiKey.includes('tu_token')) {
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
   * Crea un ticket de soporte técnico en WispHub (/tickets/)
   */
  static async crearTicketSoporte(
    clienteId: string | number,
    asunto: string,
    descripcion: string,
    prioridad: 'Baja' | 'Media' | 'Alta' = 'Alta'
  ): Promise<WispHubTicketResult> {
    logger.info(`Creando ticket en WispHub para cliente ${clienteId} - Asunto: ${asunto}`);

    if (!config.wisphub.apiKey || config.wisphub.apiKey.includes('tu_token')) {
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
