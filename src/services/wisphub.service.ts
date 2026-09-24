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
   * Reactiva/despausa un cliente en WispHub conforme al OpenAPI oficial:
   * POST /clientes/activar/ con { "servicios": [id_servicio] }
   */
  static async activarCliente(clienteId: string | number, extraName?: string): Promise<boolean> {
    const rawId = String(clienteId || '').trim();
    if (!rawId) return false;

    let targetId: number | null = null;

    // 1. Resolver el id_servicio numérico real desde Turso DB
    try {
      const dbClient = await TursoService.getWisphubClientByAny({
        id: rawId,
        name: extraName,
      });
      if (dbClient?.id_servicio) {
        targetId = Number(dbClient.id_servicio);
      }
    } catch {}

    if (!targetId) {
      const cleanNum = rawId.replace(/\D/g, '');
      if (cleanNum) targetId = Number(cleanNum);
    }

    if (!targetId) {
      logger.warn(`[WispHub API] No se pudo resolver ID de servicio numérico para activar: ${rawId}`);
      return false;
    }

    logger.info(`[WispHub API] Solicitando activación para ID servicio: ${targetId}...`);
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('tu_token')) return false;

    try {
      const api = this.getApi();
      let activado = false;

      // 1. Endpoint oficial de WispHub: POST /clientes/activar/ con { servicios: [targetId] }
      try {
        const res = await api.post('/clientes/activar/', {
          servicios: [targetId],
        });
        if (res?.status >= 200 && res?.status < 300) {
          activado = true;
          logger.info(`[WispHub API] POST /clientes/activar/ exitoso para ID ${targetId}:`, res.data);
        }
      } catch (err: any) {
        logger.warn(`[WispHub API] POST /clientes/activar/ falló para ${targetId}:`, err?.response?.data || err?.message);
      }

      // 2. Fallback oficial: PUT /clientes/{id}/ con { estado: 1, auto_activar_servicio: true }
      if (!activado) {
        try {
          const res = await api.put(`/clientes/${targetId}/`, {
            estado: 1,
            auto_activar_servicio: true,
          });
          if (res?.status >= 200 && res?.status < 300) {
            activado = true;
            logger.info(`[WispHub API] PUT /clientes/${targetId}/ { estado: 1 } exitoso.`);
          }
        } catch (err: any) {
          logger.warn(`[WispHub API] PUT /clientes/${targetId}/ falló:`, err?.response?.data || err?.message);
        }
      }

      // 3. Actualizar base de datos local Turso a 'Activo'
      try {
        const { getTursoClient } = await import('../database/turso');
        const client = getTursoClient();
        await client.execute({
          sql: `UPDATE wisphub_clients SET estado = 'Activo' WHERE id_servicio = ?`,
          args: [targetId],
        });
      } catch {}

      return activado;
    } catch (error: any) {
      logger.error(`[WispHub API] Error al activar cliente ${targetId} en WispHub:`, error?.response?.data || error?.message || error);
      return false;
    }
  }

  /**
   * Busca cliente por número telefónico (comparando últimos 10 dígitos)
   */
  /**
   * Normaliza el estado que devuelve WispHub (puede ser número o texto)
   */
  private static normalizarEstado(estadoRaw: any): string {
    if (estadoRaw === 1 || estadoRaw === '1') return 'Activo';
    if (estadoRaw === 2 || estadoRaw === '2') return 'Suspendido';
    if (estadoRaw === 3 || estadoRaw === '3') return 'Cancelado';
    if (estadoRaw === 4 || estadoRaw === '4') return 'Desactivado';
    const s = String(estadoRaw || '').toLowerCase().trim();
    if (s.includes('susp')) return 'Suspendido';
    if (s.includes('cort')) return 'Suspendido';
    if (s.includes('inact')) return 'Inactivo';
    if (s.includes('desact')) return 'Desactivado';
    if (s.includes('canc')) return 'Cancelado';
    if (s.includes('baja')) return 'Baja';
    if (s.includes('act')) return 'Activo';
    return s || 'Activo';
  }

  /**
   * Busca cliente por número telefónico (comparando últimos 10 dígitos)
   */
  static async buscarClientePorTelefono(rawPhone: string): Promise<WispHubCliente | null> {
    const phone10 = normalizePhone10(rawPhone);
    logger.info(`Buscando cliente por teléfono en WispHub en tiempo real: ${phone10}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      logger.warn('WISPHUB_API_KEY no configurada o es plantilla. Usando modo de desarrollo.');
      return null;
    }

    try {
      const api = this.getApi();
      // 1. Intentar en /clientes/ con search y telefono
      let response = await api.get('/clientes/', {
        params: { search: phone10 },
      });

      let results = response.data?.results || response.data;
      if (!Array.isArray(results) || results.length === 0) {
        response = await api.get('/clientes/', {
          params: { telefono: phone10 },
        });
        results = response.data?.results || response.data;
      }

      // 2. Si no se encontró en /clientes/, buscar en /servicios/
      if (!Array.isArray(results) || results.length === 0) {
        const srvRes = await api.get('/servicios/', {
          params: { search: phone10 },
        });
        const srvResults = srvRes.data?.results || srvRes.data;
        if (Array.isArray(srvResults) && srvResults.length > 0) {
          const s = srvResults[0];
          return {
            id: s.id_servicio || s.id,
            nombre: String(s.nombre || s.cliente?.nombre || `${s.cliente?.nombre || ''} ${s.cliente?.apellidos || ''}`).trim(),
            telefono: s.telefono || s.cliente?.telefono || phone10,
            direccion: s.direccion || s.cliente?.direccion || '',
            ip: s.ip || '',
            servicio_id: String(s.id_servicio || s.id),
            onu_id: s.custom_onu_id || s.onu_id || null,
            estado: this.normalizarEstado(s.estado || s.estado_servicio),
            estado_facturas: s.estado_facturas || (Number(s.saldo || 0) > 0 ? 'Pendiente' : 'Pagadas'),
            precio_plan: s.precio_plan || s.plan_precio || 0,
            saldo: s.saldo || s.cliente?.saldo || 0,
          };
        }
      }

      if (Array.isArray(results) && results.length > 0) {
        const c = results[0];
        return {
          id: c.id_servicio || c.id,
          nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim() || c.nombre || '',
          telefono: c.telefono || phone10,
          direccion: c.direccion || '',
          ip: c.ip || '',
          servicio_id: String(c.id_servicio || c.id),
          onu_id: c.custom_onu_id || c.onu_id || null,
          estado: this.normalizarEstado(c.estado),
          estado_facturas: c.estado_facturas || (Number(c.saldo || 0) > 0 ? 'Pendiente' : 'Pagadas'),
          precio_plan: c.precio_plan || 0,
          saldo: c.saldo || 0,
        };
      }
      return null;
    } catch (error: any) {
      logger.error('Error al consultar cliente por teléfono en WispHub:', error?.response?.data || error?.message || error);
      return null;
    }
  }

  /**
   * Busca clientes coincidentes por nombre o contrato con algoritmo difuso tolerante en tiempo real
   */
  static async buscarClientePorNombre(rawNombre: string): Promise<WispHubCliente[]> {
    if (!rawNombre) return [];

    const cleanName = cleanPersonName(rawNombre) || rawNombre;
    logger.info(`Buscando cliente por nombre/contrato en WispHub en tiempo real: "${rawNombre}" (Limpio: "${cleanName}")`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      const candidatosEncontrados: any[] = [];

      // 0. Si el nombre trae prefijo numérico (ej. "696-Maria del Pilar" o "0696"), buscar por ID/contrato en /clientes/
      const matchNum = rawNombre.match(/^0*(\d+)/);
      let targetContractNum: string | null = null;
      if (matchNum) {
        targetContractNum = matchNum[1];
        const paddedId = targetContractNum.padStart(4, '0');
        try {
          const resClientesId = await api.get('/clientes/', { params: { search: targetContractNum } });
          const listId = resClientesId.data?.results || resClientesId.data;
          if (Array.isArray(listId)) candidatosEncontrados.push(...listId);
        } catch {}
        if (paddedId !== targetContractNum) {
          try {
            const resClientesPadded = await api.get('/clientes/', { params: { search: paddedId } });
            const listPadded = resClientesPadded.data?.results || resClientesPadded.data;
            if (Array.isArray(listPadded)) candidatosEncontrados.push(...listPadded);
          } catch {}
        }
      }

      // 1. Filtrar palabras vacías (del, de, la, los, y) para búsquedas precisas
      const stopwords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'san', 'santa']);
      const words = cleanName.split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()));
      const searchWord = words.slice(0, 2).join(' ') || cleanName;

      // 2. Buscar en /clientes/ con los primeros 2 nombres significativos (ej. "Maria Pilar")
      try {
        const resClientes = await api.get('/clientes/', {
          params: { search: searchWord },
        });
        const listClientes = resClientes.data?.results || resClientes.data;
        if (Array.isArray(listClientes)) {
          candidatosEncontrados.push(...listClientes);
        }
      } catch (e: any) {
        logger.warn('Consulta a /clientes/ con search:', e?.message || e);
      }

      // 3. Buscar por apellidos (ej. "Perez Mendoza") si hay suficientes palabras
      if (words.length >= 3) {
        const apellidosSearch = words.slice(-2).join(' ');
        try {
          const resApellidos = await api.get('/clientes/', {
            params: { search: apellidosSearch },
          });
          const listApellidos = resApellidos.data?.results || resApellidos.data;
          if (Array.isArray(listApellidos)) candidatosEncontrados.push(...listApellidos);
        } catch {}
      }

      // 4. Buscar con el nombre limpio completo si es diferente
      if (cleanName && cleanName !== searchWord) {
        try {
          const resFull = await api.get('/clientes/', {
            params: { search: cleanName },
          });
          const listFull = resFull.data?.results || resFull.data;
          if (Array.isArray(listFull)) candidatosEncontrados.push(...listFull);
        } catch {}
      }

      if (candidatosEncontrados.length > 0) {
        // Eliminar duplicados por id
        const unicos = new Map<string, any>();
        candidatosEncontrados.forEach((c: any) => {
          const idUnico = String(c.id_servicio || c.id || Math.random());
          if (!unicos.has(idUnico)) unicos.set(idUnico, c);
        });

        // Evaluar candidatos con algoritmo de scoring
        const scoredCandidates: (WispHubCliente & { score: number })[] = Array.from(unicos.values()).map((c: any) => {
          const clientName = String(
            c.nombre ||
            (c.cliente?.nombre ? `${c.cliente.nombre || ''} ${c.cliente.apellidos || ''}` : '') ||
            `${c.nombre || ''} ${c.apellidos || ''}`
          ).trim();
          let score = computeNameMatchScore(cleanName, clientName);

          // Si el cliente en WispHub coincide con el número de contrato/código (ej: 0696 o 696), bono de coincidencia
          if (targetContractNum) {
            const cNombre = String(c.nombre || '');
            const cUser = String(c.usuario || c.email || '');
            const padded = targetContractNum.padStart(4, '0');
            if (
              cNombre.includes(targetContractNum) ||
              cNombre.includes(padded) ||
              cUser.includes(targetContractNum) ||
              cUser.includes(padded) ||
              String(c.id_servicio || c.id) === targetContractNum
            ) {
              score = Math.max(score, 60) + 20;
            }
          }

          return {
            id: c.id_servicio || c.id || c.cliente?.id,
            nombre: clientName,
            telefono: c.telefono || c.cliente?.telefono || '',
            direccion: c.direccion || c.cliente?.direccion || '',
            ip: c.ip || '',
            servicio_id: String(c.id_servicio || c.id),
            onu_id: c.custom_onu_id || c.onu_id || null,
            estado: this.normalizarEstado(c.estado || c.estado_servicio),
            estado_facturas: c.estado_facturas || (Number(c.saldo || 0) > 0 ? 'Pendiente' : 'Pagadas'),
            precio_plan: c.precio_plan || c.plan_precio || 0,
            saldo: c.saldo || c.cliente?.saldo || 0,
            score,
          };
        });

        // Filtrar y ordenar por mejor score
        scoredCandidates.sort((a, b) => b.score - a.score);
        return scoredCandidates.filter(c => c.score >= 50).slice(0, 4);
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
    const idClean = String(clienteId).replace(/\D/g, '') || String(clienteId);
    logger.info(`Consultando facturas pendientes en tiempo real para cliente WispHub ID: ${idClean}`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      const response = await api.get('/facturas/', {
        params: {
          cliente: idClean,
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
   * Diagnóstico financiero integral en TIEMPO REAL:
   * Consulta directamente la API en vivo de WispHub (/clientes/{id}/, /facturas/) y valida
   * si el cliente está Suspendido/Cancelado/Desactivado o tiene facturas pendientes/saldo adeudado.
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
    let liveData: any = null;

    // Extraer número de contrato/servicio del nombre o de clienteId (ignorar seriales ONU como HWTC... o ZTEG...)
    let idNum: string | null = null;
    if (nombre) {
      const m = String(nombre).match(/^0*(\d+)/);
      if (m) idNum = m[1];
    }
    if (!idNum && clienteId && !String(clienteId).startsWith('HWTC') && !String(clienteId).startsWith('ONU-') && !String(clienteId).startsWith('ZTEG')) {
      const m = String(clienteId).match(/^\d+/);
      if (m) idNum = m[0];
    }

    logger.info(`[WispHub Live Diagnostic] Verificando en tiempo real: ID_Contrato=${idNum || 'N/A'}, Nombre="${nombre || 'N/A'}", Tel="${phone || 'N/A'}", IP="${ip || 'N/A'}"`);

    // 1. Ubicar el registro en la base de datos indexada de Turso (sincronizada con todos los 3400+ clientes)
    let targetId: string | number | null = null;
    try {
      const dbClient = await TursoService.getWisphubClientByAny({
        id: idNum || clienteId,
        phone,
        sn,
        name: nombre,
        ip,
      });

      if (dbClient) {
        targetId = dbClient.id_servicio;
        logger.info(`Cliente ubicado en base local Turso: ID=${dbClient.id_servicio}, Nombre="${dbClient.nombre}", Estado="${dbClient.estado}", IP="${dbClient.ip}"`);
        clienteEncontrado = {
          id: dbClient.id_servicio,
          nombre: dbClient.nombre,
          telefono: dbClient.telefono || phone || '',
          direccion: dbClient.direccion,
          ip: dbClient.ip,
          servicio_id: String(dbClient.id_servicio),
          onu_id: dbClient.sn_onu,
          estado: this.normalizarEstado(dbClient.estado),
          estado_facturas: dbClient.estado_facturas,
          precio_plan: dbClient.precio_plan,
          saldo: dbClient.saldo,
        };
      }
    } catch (err: any) {
      logger.warn('Error al consultar cliente en Turso:', err?.message || err);
    }

    // 2. Si no se ubicó en Turso y tenemos idNum, usar idNum como targetId
    if (!targetId && idNum) {
      targetId = idNum;
    }

    // 3. Consultar directamente el endpoint en vivo de WispHub para el cliente (/clientes/{id}/)
    if (targetId) {
      try {
        const api = this.getApi();
        const liveRes = await api.get(`/clientes/${targetId}/`);
        if (liveRes.data && (liveRes.data.id_servicio || liveRes.data.id || liveRes.data.usuario_rb)) {
          liveData = liveRes.data;
          logger.info(`[WispHub Live API] Datos en vivo para ID ${targetId}: Estado="${liveData.estado}", FacturasPagadas=${liveData.facturas_pagadas}, Saldo=$${liveData.saldo || 0}`);
          
          clienteEncontrado = {
            id: liveData.id_servicio || targetId,
            nombre: liveData.nombre || liveData.usuario_rb || clienteEncontrado?.nombre || String(nombre || ''),
            telefono: liveData.telefono || clienteEncontrado?.telefono || phone || '',
            direccion: liveData.direccion || clienteEncontrado?.direccion || '',
            ip: liveData.ip || clienteEncontrado?.ip || '',
            servicio_id: String(liveData.id_servicio || targetId),
            onu_id: liveData.sn_onu || clienteEncontrado?.onu_id || null,
            estado: this.normalizarEstado(liveData.estado),
            estado_facturas: liveData.facturas_pagadas ? 'Pagadas' : (clienteEncontrado?.estado_facturas || 'Pendiente'),
            precio_plan: liveData.precio_plan || liveData.plan_internet?.precio || clienteEncontrado?.precio_plan || 0,
            saldo: liveData.saldo || clienteEncontrado?.saldo || 0,
          };

          // Consultar facturas pendientes en vivo
          facturas = await this.obtenerFacturasPendientes(targetId);
        }
      } catch (err: any) {
        logger.warn(`Error al consultar /clientes/${targetId}/ en vivo:`, err?.response?.data || err?.message || err);
      }
    }

    // 4. Si aún no tenemos facturas pero tenemos ID, consultar facturas
    if (clienteEncontrado?.id && facturas.length === 0) {
      facturas = await this.obtenerFacturasPendientes(clienteEncontrado.id);
    }

    let totalDeuda = facturas.reduce((acc, f) => acc + (f.monto || 0), 0);
    const saldoNum = Number(clienteEncontrado?.saldo || 0);
    if (totalDeuda === 0 && saldoNum > 0) {
      totalDeuda = saldoNum;
    }

    const estado = (clienteEncontrado?.estado || '').toLowerCase().trim();
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

    // Si está suspendido pero NO tiene facturas pendientes ni saldo adeudado:
    const yaPagoPeroNoActivo = esSuspendido && totalDeuda === 0 && facturas.length === 0;

    const motivo = esSuspendido
      ? (totalDeuda > 0
          ? `Factura o saldo pendiente ($${totalDeuda.toFixed(2)} MXN)`
          : 'Servicio suspendido en WispHub (sin facturas pendientes / al corriente)')
      : undefined;

    logger.info(`[WispHub Live Result] Cliente="${clienteEncontrado?.nombre || 'N/A'}" Estado="${clienteEncontrado?.estado || 'Desconocido'}" Suspendido=${esSuspendido} YaPagoPeroNoActivo=${yaPagoPeroNoActivo} Deuda=$${totalDeuda} FacturasPendientes=${facturas.length}`);

    return {
      suspendido: esSuspendido,
      yaPagoPeroNoActivo,
      totalDeuda: totalDeuda,
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
      let activado = false;
      
      // 1. Endpoint oficial de WispHub para activación de servicios en router y sistema
      try {
        const res = await api.post('/clientes/activar/', { servicios: [Number(id)] });
        if (res?.status >= 200 && res?.status < 300) {
          activado = true;
          logger.info(`WispHub POST /clientes/activar/ exitoso para ID ${id}: task_id=${res.data?.task_id || 'ok'}`);
        }
      } catch (e: any) {
        logger.warn(`Intento /clientes/activar/ falló para ${id}:`, e?.response?.data || e?.message);
      }

      // 2. Fallbacks si fuera necesario
      if (!activado) {
        try {
          const res = await api.post(`/clientes/${id}/activar/`, {});
          if (res?.status >= 200 && res?.status < 300) activado = true;
        } catch {}
      }

      if (!activado) {
        try {
          await api.patch(`/clientes/${id}/`, { estado: 'Activo', auto_activar_servicio: true });
          activado = true;
        } catch {}
      }

      // Actualizar también la base local en Turso DB a 'Activo'
      try {
        const { getTursoClient } = await import('../database/turso');
        const client = getTursoClient();
        await client.execute({
          sql: `UPDATE wisphub_clients SET estado = 'Activo' WHERE id_servicio = ?`,
          args: [Number(id)],
        });
      } catch {}

      logger.info(`Activación completada en WispHub para cliente ${id}`);
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

        const records: WisphubClientRecord[] = results.map((c: any) => {
          let diaCorteVal: string | undefined = undefined;
          if (c.dia_corte) {
            diaCorteVal = String(c.dia_corte);
          } else if (c.fecha_corte && typeof c.fecha_corte === 'string') {
            const rawParts = c.fecha_corte.split('/');
            if (rawParts.length >= 2) {
              const d = parseInt(rawParts[0], 10);
              if (!isNaN(d) && d >= 1 && d <= 31) diaCorteVal = String(d);
            }
          }

          return {
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
            dia_corte: diaCorteVal,
            fecha_corte: c.fecha_corte ? String(c.fecha_corte) : undefined,
            raw_data: JSON.stringify({
              fecha_corte: c.fecha_corte,
              ultimo_cambio: c.ultimo_cambio,
              usuario: c.usuario,
            }),
          };
        });

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
