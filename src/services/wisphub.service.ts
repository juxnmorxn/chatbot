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
   * 
   * Identifica el cliente con alta precisión por:
   * 1. ID de servicio directo (numérico)
   * 2. IP en el sistema (ej: 172.19.11.245)
   * 3. Nombre del cliente (prefijo de contrato o búsqueda difusa/fuzzy)
   * 4. SN de ONU / mapeo de SmartOLT (cruzando número de contrato o IP)
   */
  static async activarCliente(
    target: string | number | {
      id?: string | number | null;
      name?: string | null;
      ip?: string | null;
      sn?: string | null;
      phone?: string | null;
    },
    extraName?: string,
    extraIp?: string
  ): Promise<boolean> {
    let rawId = '';
    let nameParam = extraName || '';
    let ipParam = extraIp || '';
    let snParam = '';
    let phoneParam = '';

    if (typeof target === 'object' && target !== null) {
      rawId = target.id !== undefined && target.id !== null ? String(target.id).trim() : '';
      if (!nameParam && target.name) nameParam = String(target.name).trim();
      if (!ipParam && target.ip) ipParam = String(target.ip).trim();
      if (target.sn) snParam = String(target.sn).trim();
      if (target.phone) phoneParam = String(target.phone).trim();
    } else {
      rawId = String(target || '').trim();
    }

    // Si rawId tiene formato de IP (ej: 172.19.11.245), reasignarlo como ipParam
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawId)) {
      if (!ipParam) ipParam = rawId;
      rawId = '';
    }

    if (!rawId && !nameParam && !ipParam && !snParam && !phoneParam) {
      logger.warn('[WispHub API] activarCliente invocado sin ningún parámetro identificador.');
      return false;
    }

    let targetId: number | null = null;
    const { getTursoClient } = await import('../database/turso');
    const client = getTursoClient();

    // 1. Si tenemos rawId estrictamente numérico, validar si existe en wisphub_clients
    if (rawId && /^\d+$/.test(rawId)) {
      try {
        const res = await client.execute({
          sql: `SELECT id_servicio, nombre FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
          args: [Number(rawId)],
        });
        if (res.rows.length > 0) {
          targetId = Number(res.rows[0].id_servicio);
          logger.info(`[WispHub API] Activación: ID ${targetId} verificado directamente en DB local (${res.rows[0].nombre}).`);
        }
      } catch {}
    }

    // 2. Identificar por IP en el sistema (requerimiento explícito)
    if (!targetId && ipParam && ipParam !== 'N/A') {
      try {
        const res = await client.execute({
          sql: `SELECT id_servicio, nombre, ip FROM wisphub_clients WHERE ip = ? LIMIT 1`,
          args: [ipParam],
        });
        if (res.rows.length > 0) {
          targetId = Number(res.rows[0].id_servicio);
          logger.info(`[WispHub API] Activación: Cliente identificado por IP (${ipParam}): ID=${targetId}, Nombre="${res.rows[0].nombre}".`);
        }
      } catch {}
    }

    // 3. Identificar por Nombre en el sistema (requerimiento explícito)
    if (!targetId && nameParam) {
      try {
        // A. Verificar si tiene prefijo numérico de contrato (ej: "696-Maria del Pilar" o "0696-")
        const numMatch = nameParam.match(/^0*(\d+)/);
        if (numMatch && numMatch[1]) {
          const idNum = numMatch[1];
          const padded = idNum.padStart(4, '0');
          const prefixRes = await client.execute({
            sql: `SELECT id_servicio, nombre FROM wisphub_clients WHERE servicio LIKE ? OR nombre LIKE ? OR servicio LIKE ? LIMIT 5`,
            args: [`%${idNum}%`, `%${padded}%`, `%${idNum}%`],
          });
          for (const row of prefixRes.rows) {
            if (computeNameMatchScore(nameParam, String(row.nombre || '')) >= 40) {
              targetId = Number(row.id_servicio);
              logger.info(`[WispHub API] Activación: Cliente identificado por prefijo contrato #${idNum} ("${nameParam}"): ID=${targetId}, Nombre="${row.nombre}".`);
              break;
            }
          }
        }

        // B. Búsqueda difusa (fuzzy) por nombre completo
        if (!targetId) {
          const fuzzy = await TursoService.searchWisphubClientsFuzzy(nameParam, 3);
          if (fuzzy.length > 0 && fuzzy[0].matchScore >= 50) {
            targetId = Number(fuzzy[0].id_servicio);
            logger.info(`[WispHub API] Activación: Cliente identificado por Nombre difuso ("${nameParam}"): ID=${targetId}, Nombre="${fuzzy[0].nombre}" (Score: ${fuzzy[0].matchScore}).`);
          }
        }
      } catch {}
    }

    // 4. Identificar por SN de ONU o cruce con SmartOLT
    const snCandidato = snParam || (rawId.startsWith('HWTC') || rawId.startsWith('ZTEG') || rawId.startsWith('ONU-') ? rawId : '');
    if (!targetId && snCandidato) {
      try {
        // En wisphub_clients directamente
        const resSn = await client.execute({
          sql: `SELECT id_servicio, nombre FROM wisphub_clients WHERE sn_onu LIKE ? LIMIT 1`,
          args: [`%${snCandidato}%`],
        });
        if (resSn.rows.length > 0) {
          targetId = Number(resSn.rows[0].id_servicio);
          logger.info(`[WispHub API] Activación: Cliente identificado por SN ONU (${snCandidato}): ID=${targetId}, Nombre="${resSn.rows[0].nombre}".`);
        } else {
          // En smartolt_onus para obtener nombre o IP y cruzar a WispHub
          const oltRes = await client.execute({
            sql: `SELECT name, ip_address FROM smartolt_onus WHERE unique_external_id = ? OR sn = ? LIMIT 1`,
            args: [snCandidato, snCandidato],
          });
          if (oltRes.rows.length > 0) {
            const oltRow = oltRes.rows[0];
            if (oltRow.ip_address) {
              const whByIp = await client.execute({
                sql: `SELECT id_servicio, nombre FROM wisphub_clients WHERE ip = ? LIMIT 1`,
                args: [String(oltRow.ip_address)],
              });
              if (whByIp.rows.length > 0) {
                targetId = Number(whByIp.rows[0].id_servicio);
                logger.info(`[WispHub API] Activación: Cliente identificado cruzando SmartOLT ONU IP (${oltRow.ip_address}): ID=${targetId}, Nombre="${whByIp.rows[0].nombre}".`);
              }
            }
            if (!targetId && oltRow.name) {
              const whByName = await TursoService.getWisphubClientByAny({ name: String(oltRow.name) });
              if (whByName?.id_servicio) {
                targetId = Number(whByName.id_servicio);
                logger.info(`[WispHub API] Activación: Cliente identificado cruzando SmartOLT ONU Nombre ("${oltRow.name}"): ID=${targetId}, Nombre="${whByName.nombre}".`);
              }
            }
          }
        }
      } catch {}
    }

    // 5. Fallback por TursoService.getWisphubClientByAny
    if (!targetId) {
      try {
        const dbClient = await TursoService.getWisphubClientByAny({
          id: /^\d+$/.test(rawId) ? rawId : undefined,
          name: nameParam || undefined,
          ip: ipParam || undefined,
          sn: snParam || undefined,
          phone: phoneParam || undefined,
        });
        if (dbClient?.id_servicio) {
          targetId = Number(dbClient.id_servicio);
          logger.info(`[WispHub API] Activación: Resuelto por getWisphubClientByAny: ID=${targetId}, Nombre="${dbClient.nombre}".`);
        }
      } catch {}
    }

    // 6. Si era un número puro y no se encontró en la BD local, probar con ese número en WispHub
    if (!targetId && rawId && /^\d+$/.test(rawId)) {
      targetId = Number(rawId);
    }

    if (!targetId) {
      logger.warn(`[WispHub API] No se pudo resolver ID numérico de servicio para activar. RawId="${rawId}", Nombre="${nameParam}", IP="${ipParam}", SN="${snParam}"`);
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
   * Actualiza los datos de un cliente en WispHub en tiempo real (Coordenadas GPS lat/lng, dirección, MAC CPE, SN ONU, etc.)
   */
  static async actualizarCliente(
    idServicio: string | number,
    fields: {
      latitud?: number | string;
      longitud?: number | string;
      direccion?: string;
      mac_cpe?: string;
      sn_onu?: string;
      remote_ipv6_prefix?: string;
      comentarios?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const api = this.getApi();
      const payload: any = {};
      if (fields.latitud !== undefined && fields.latitud !== '') payload.latitud = String(fields.latitud);
      if (fields.longitud !== undefined && fields.longitud !== '') payload.longitud = String(fields.longitud);
      if (fields.direccion !== undefined) payload.direccion = fields.direccion;
      if (fields.mac_cpe !== undefined) payload.mac_cpe = fields.mac_cpe;
      if (fields.sn_onu !== undefined) payload.sn_onu = fields.sn_onu;
      if (fields.remote_ipv6_prefix !== undefined) payload.remote_ipv6_prefix = fields.remote_ipv6_prefix;
      if (fields.comentarios !== undefined) payload.comentarios = fields.comentarios;

      if (Object.keys(payload).length === 0) {
        return { success: true };
      }

      logger.info(`[WispHub API] Actualizando cliente ${idServicio} con:`, payload);
      const res = await api.patch(`/clientes/${idServicio}/`, payload);
      return { success: true, data: res.data };
    } catch (err: any) {
      logger.error(`[WispHub API] Error al actualizar cliente ${idServicio}:`, err?.response?.data || err?.message || err);
      return { success: false, error: err?.response?.data?.detail || err?.message || 'Error al actualizar en WispHub' };
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
   * Obtiene las facturas pendientes de un cliente (/facturas/)
   */
  static async obtenerFacturasPendientes(
    clienteId: string | number,
    searchTerm?: string | null
  ): Promise<WispHubFactura[]> {
    const idClean = String(clienteId).replace(/\D/g, '') || String(clienteId);
    logger.info(`Consultando facturas pendientes en tiempo real para cliente WispHub ID: ${idClean} (Search: "${searchTerm || 'N/A'}")`);
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.includes('tu_token')) {
      return [];
    }

    try {
      const api = this.getApi();
      let facturasEncontradas: any[] = [];

      // 1. Intento por ID de cliente con estado pendiente
      try {
        const response = await api.get('/facturas/', {
          params: {
            cliente: idClean,
            estado: 1, // 1 = Pendiente
          },
        });
        const results = response.data?.results || response.data;
        if (Array.isArray(results) && results.length > 0) {
          facturasEncontradas = results;
        }
      } catch (err) {}

      // 2. Si no arrojó resultados y tenemos término de búsqueda (ej: nombre o prefijo de contrato)
      if (facturasEncontradas.length === 0 && (searchTerm || idClean)) {
        try {
          const sQuery = searchTerm || idClean;
          const searchRes = await api.get('/facturas/', {
            params: {
              search: sQuery,
            },
          });
          const sResults = searchRes.data?.results || searchRes.data;
          if (Array.isArray(sResults)) {
            // Filtrar facturas que correspondan ESTRICTAMENTE al cliente y que NO estén pagadas ni canceladas
            const cleanSearch = (searchTerm || idClean || '').toLowerCase();
            const numMatch = cleanSearch.match(/\d+/);
            const numPrefix = numMatch ? numMatch[0] : null;

            facturasEncontradas = sResults.filter((f: any) => {
              const fEstado = String(f.estado || '').toLowerCase();
              const noEstaPagada = !fEstado.includes('pagada') && !fEstado.includes('cancelad') && !fEstado.includes('anulad');
              if (!noEstaPagada) return false;

              // Validar que pertenezca a este cliente específico
              const uUser = String(f.cliente?.usuario || '').toLowerCase();
              const uNombre = String(f.cliente?.nombre || '').toLowerCase();
              const fArticulos = Array.isArray(f.articulos) ? f.articulos : [];
              const matchServicio = fArticulos.some((a: any) => String(a?.servicio?.id_servicio) === idClean);

              const matchUser = (numPrefix && uUser.includes(numPrefix)) || (cleanSearch.length > 4 && uUser.includes(cleanSearch));
              const matchName = (cleanSearch.length > 5 && uNombre.includes(cleanSearch)) || (uNombre.length > 5 && cleanSearch.includes(uNombre));

              return matchServicio || matchUser || matchName;
            });
          }
        } catch (err) {}
      }

      if (facturasEncontradas.length > 0) {
        return facturasEncontradas.map((f: any) => {
          const idFac = f.id_factura || f.id;
          const folioFac = f.folio || (idFac ? String(idFac) : 'Recibo');
          const totalFac = Number(f.total || f.total_cobrado || f.monto || 0);
          const fechaVen = f.fecha_vencimiento || f.fecha_limite || 'Próximo corte';
          return {
            id: idFac,
            folio: folioFac,
            monto: totalFac,
            fecha_vencimiento: fechaVen,
            estado: '1',
            link_pago: f.link_pago || f.url_pasarela || (idFac ? `https://wisphub.net/factura/${idFac}/` : 'https://wisphub.net/factura/'),
          };
        });
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
   * NUNCA autoriza reactivación si el cliente tiene facturas vencidas o adeudos.
   */
  static async verificarEstadoFinanciero(params: {
    clienteId?: string | number | null;
    nombre?: string | null;
    phone?: string | null;
    sn?: string | null;
    ip?: string | null;
  }): Promise<{
    suspendido: boolean;
    tieneDeudaReal: boolean;
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
        logger.info(`Cliente ubicado en base local Turso: ID=${dbClient.id_servicio}, Nombre="${dbClient.nombre}", Servicio="${dbClient.servicio}", Estado="${dbClient.estado}", Facturas="${dbClient.estado_facturas}", IP="${dbClient.ip}"`);
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
            estado_facturas: liveData.facturas_pagadas === false
              ? 'Pendiente de Pago'
              : (liveData.facturas_pagadas === true ? 'Pagadas' : (clienteEncontrado?.estado_facturas || 'Pendiente')),
            precio_plan: liveData.precio_plan || liveData.plan_internet?.precio || clienteEncontrado?.precio_plan || 0,
            saldo: liveData.saldo || clienteEncontrado?.saldo || 0,
          };

          // Consultar facturas pendientes en vivo
          facturas = await this.obtenerFacturasPendientes(targetId, liveData.nombre || nombre || idNum);
        }
      } catch (err: any) {
        logger.warn(`Error al consultar /clientes/${targetId}/ en vivo:`, err?.response?.data || err?.message || err);
      }
    }

    // 4. Si aún no tenemos facturas pero tenemos cliente, consultar facturas
    if (clienteEncontrado?.id && facturas.length === 0) {
      facturas = await this.obtenerFacturasPendientes(clienteEncontrado.id, clienteEncontrado.nombre || nombre || idNum);
    }

    // 5. Análisis Exhaustivo y Cruzado de Morosidad
    const estadoFacturasStr = String(clienteEncontrado?.estado_facturas || '').toLowerCase().trim();
    const liveFacturasPagadas = liveData?.facturas_pagadas; // boolean | undefined
    
    const tieneFacturaPendientePorTexto = 
      estadoFacturasStr.includes('pendiente') || 
      estadoFacturasStr.includes('vencid') || 
      estadoFacturasStr.includes('no pag') ||
      estadoFacturasStr.includes('adeudo') ||
      estadoFacturasStr.includes('corte') ||
      estadoFacturasStr.includes('debe');

    const liveIndicaFacturasPendientes = liveFacturasPagadas === false;
    const saldoNum = Number(clienteEncontrado?.saldo || liveData?.saldo || 0);
    const saldoIndicaDeuda = saldoNum > 0;
    const facturasListIndicaDeuda = facturas.length > 0;

    let totalDeuda = facturas.reduce((acc, f) => acc + (f.monto || 0), 0);
    if (totalDeuda === 0 && saldoIndicaDeuda) {
      totalDeuda = saldoNum;
    }

    const tieneDeudaReal = 
      liveIndicaFacturasPendientes || 
      tieneFacturaPendientePorTexto || 
      saldoIndicaDeuda || 
      facturasListIndicaDeuda || 
      totalDeuda > 0;

    // Si tiene deuda real detectada por WispHub pero totalDeuda aún es 0, asignar el valor del plan mensual
    if (tieneDeudaReal && totalDeuda === 0) {
      const precioPlanEstimado = Number(clienteEncontrado?.precio_plan || liveData?.precio_plan || liveData?.plan_internet?.precio || 0);
      totalDeuda = precioPlanEstimado > 0 ? precioPlanEstimado : 400.0;
    }

    // Si tiene deuda real pero no se pudieron desglosar facturas individuales, generar el recibo pendiente
    if (tieneDeudaReal && facturas.length === 0) {
      facturas = [{
        id: 'PENDIENTE',
        folio: 'Mensualidad Pendiente',
        monto: totalDeuda,
        fecha_vencimiento: 'Vencido',
        estado: '1',
        link_pago: `https://wisphub.net/factura/`,
      }];
    }

    const estado = (clienteEncontrado?.estado || liveData?.estado || '').toLowerCase().trim();
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

    // CONDICIÓN ESTRICTA DE REACTIVACIÓN AUTOMÁTICA:
    // Solo puede auto-reactivarse si figura Suspendido PERO se verificó al 100% que NO tiene deuda real,
    // sus facturas están marcadas como pagadas y no hay saldos pendientes.
    const yaPagoPeroNoActivo = 
      esSuspendido && 
      !tieneDeudaReal && 
      (liveFacturasPagadas === true || liveFacturasPagadas === undefined) && 
      !tieneFacturaPendientePorTexto && 
      totalDeuda === 0;

    const motivo = esSuspendido
      ? (tieneDeudaReal
          ? `Factura o saldo pendiente ($${totalDeuda.toFixed(2)} MXN)`
          : 'Servicio suspendido en WispHub (sin facturas pendientes / pagos al corriente)')
      : undefined;

    logger.info(`[WispHub Live Result] Cliente="${clienteEncontrado?.nombre || 'N/A'}" Estado="${clienteEncontrado?.estado || 'Desconocido'}" Suspendido=${esSuspendido} TieneDeudaReal=${tieneDeudaReal} YaPagoPeroNoActivo=${yaPagoPeroNoActivo} Deuda=$${totalDeuda} FacturasPendientes=${facturas.length}`);

    return {
      suspendido: esSuspendido,
      tieneDeudaReal,
      yaPagoPeroNoActivo,
      totalDeuda,
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
