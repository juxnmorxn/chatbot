import { getTursoClient } from '../database/turso';
import { Logger } from '../utils/logger';
import { normalizeText, computeNameMatchScore, cleanPersonName, generateSearchFragments, phoneticNormalize } from '../utils/fuzzy-matcher';

const logger = new Logger('TursoService');

export interface SmartOltOnuRecord {
  unique_external_id: string;
  sn: string;
  name: string;
  name_normalized?: string;
  phone?: string;
  address?: string;
  zone_name?: string;
  speed_profile?: string;
  olt_name?: string;
  ip_address?: string;
  coordenadas_gps?: string;
  google_maps_url?: string;
  raw_data?: string;
  updated_at?: string;
}

export interface WisphubClientRecord {
  id_servicio: number | string;
  nombre: string;
  nombre_normalized?: string;
  servicio?: string;
  ip?: string;
  estado?: string;
  estado_facturas?: string;
  precio_plan?: string | number;
  saldo?: string | number;
  plan_internet?: string;
  router?: string;
  sn_onu?: string;
  telefono?: string;
  telefonos_adicionales?: string;
  coordenadas_gps?: string;
  google_maps_url?: string;
  ubicacion_notas?: string;
  direccion?: string;
  dia_corte?: string | null;
  fecha_corte?: string | null;
  raw_data?: string;
  updated_at?: string;
}

export interface AuditIpItem {
  id: string;
  folio: string;
  cliente: string;
  servicio: string;
  smartolt_ip: string | null;
  wisphub_ip: string | null;
  ip_status: 'MISMATCH' | 'MATCH' | 'NO_IP' | 'ONLY_SMARTOLT' | 'ONLY_WISPHUB';
  tr069_status?: 'ACTIVE' | 'OMCI' | 'MISSING';
  ipv6_status?: 'DUAL_STACK' | 'IPV4_ONLY' | 'MISSING';
  onu_external_id?: string | null;
  wisphub_estado: string | null;
  wisphub_facturas: string | null;
  wisphub_plan: string | null;
  zona_o_router: string | null;
  sn_smartolt: string | null;
  sn_wisphub: string | null;
  smartolt_id: string | null;
  wisphub_id: string | number | null;
}

export interface Session {
  phone: string;
  step: string;
  client_id: string | null;
  service_id: string | null;
  client_name: string | null;
  onu_id: string | null;
  opt_out: number;
  last_interaction: string;
  metadata: string | null;
  human_takeover_until?: string | null;
  human_takeover_status?: string | null;
  department?: 'SOPORTE' | 'ATENCION' | string | null;
  last_instance?: string | null;
}

export interface TicketRecord {
  id?: number;
  folio: string;
  phone: string;
  client_name?: string | null;
  onu_id?: string | null;
  issue_summary: string;
  checks_performed?: string | null;
  has_photo?: number;
  has_speedtest?: number;
  all_devices?: number;
  status: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';
  is_out_of_hours?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
}

export interface TechnicianRecord {
  id: number;
  name: string;
  phone: string;
  pin: string;
  is_active: number;
  role: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

function parseOnuTr069Status(rawJson?: any): 'ACTIVE' | 'OMCI' | 'MISSING' {
  if (!rawJson) return 'MISSING';
  try {
    const raw = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    const tr069 = String(raw.tr069 || raw.tr069_status || raw.tr069_enabled || '').toLowerCase();
    const profile = String(raw.tr069_profile || raw.tr069_profile_name || '').toLowerCase();
    const configMethod = String(raw.configuration_method || '').toLowerCase();

    if (tr069 === 'enabled' || tr069 === 'active' || tr069 === '1' || profile.includes('smartolt') || configMethod.includes('tr069') || configMethod.includes('tr-069')) {
      return 'ACTIVE';
    }
    if (configMethod.includes('omci')) {
      return 'OMCI';
    }
    return 'MISSING';
  } catch {
    return 'MISSING';
  }
}

function parseOnuIpv6Status(rawJson?: any): 'DUAL_STACK' | 'IPV4_ONLY' | 'MISSING' {
  if (!rawJson) return 'MISSING';
  try {
    const raw = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    const proto = String(raw.ip_protocol || raw.ip_mode || '').toLowerCase();
    const v6Addr = raw.ipv6_address || raw.ipv6 || raw.ipv6_prefix;
    const v6Mode = String(raw.ipv6_address_mode || '').toLowerCase();

    if (proto.includes('ipv4ipv6') || proto.includes('dual') || proto.includes('v6') || (v6Mode && v6Mode !== 'none' && v6Mode !== 'disabled' && v6Mode !== '') || v6Addr) {
      return 'DUAL_STACK';
    }
    return 'IPV4_ONLY';
  } catch {
    return 'MISSING';
  }
}

export class TursoService {
  /**
   * Obtiene la sesión activa de un número de teléfono
   */
  static async getSession(phone: string): Promise<Session | null> {
    try {
      const client = getTursoClient();
      const result = await client.execute({
        sql: 'SELECT * FROM sessions WHERE phone = ? LIMIT 1',
        args: [phone],
      });

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        phone: String(row.phone),
        step: String(row.step || 'INICIO'),
        client_id: row.client_id ? String(row.client_id) : null,
        service_id: row.service_id ? String(row.service_id) : null,
        client_name: row.client_name ? String(row.client_name) : null,
        onu_id: row.onu_id ? String(row.onu_id) : null,
        opt_out: Number(row.opt_out || 0),
        last_interaction: String(row.last_interaction || new Date().toISOString()),
        metadata: row.metadata ? String(row.metadata) : null,
        human_takeover_until: row.human_takeover_until ? String(row.human_takeover_until) : null,
        human_takeover_status: row.human_takeover_status ? String(row.human_takeover_status) : 'BOT',
        department: (row.department ? String(row.department) : 'SOPORTE') as 'SOPORTE' | 'ATENCION',
        last_instance: row.last_instance ? String(row.last_instance) : null,
      };
    } catch (error: any) {
      logger.error(`Error al obtener sesión de ${phone}:`, error?.message || error);
      return null;
    }
  }

  /**
   * Crea o actualiza una sesión existente en Turso
   */
  static async upsertSession(data: Partial<Session> & { phone: string }): Promise<Session> {
    const existing = await this.getSession(data.phone);
    const now = new Date().toISOString();

    const merged: Session = {
      phone: data.phone,
      step: data.step ?? existing?.step ?? 'INICIO',
      client_id: data.client_id ?? existing?.client_id ?? null,
      service_id: data.service_id ?? existing?.service_id ?? null,
      client_name: data.client_name ?? existing?.client_name ?? null,
      onu_id: data.onu_id ?? existing?.onu_id ?? null,
      opt_out: data.opt_out ?? existing?.opt_out ?? 0,
      last_interaction: now,
      metadata: data.metadata ?? existing?.metadata ?? null,
      human_takeover_until: data.human_takeover_until !== undefined ? data.human_takeover_until : (existing?.human_takeover_until ?? null),
      human_takeover_status: data.human_takeover_status ?? existing?.human_takeover_status ?? 'BOT',
      department: data.department ?? existing?.department ?? 'SOPORTE',
      last_instance: data.last_instance ?? existing?.last_instance ?? null,
    };

    try {
      const client = getTursoClient();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, step, client_id, service_id, client_name, onu_id, opt_out, last_interaction, metadata, human_takeover_until, human_takeover_status, department, last_instance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            step = excluded.step,
            client_id = COALESCE(excluded.client_id, sessions.client_id),
            service_id = COALESCE(excluded.service_id, sessions.service_id),
            client_name = COALESCE(excluded.client_name, sessions.client_name),
            onu_id = COALESCE(excluded.onu_id, sessions.onu_id),
            opt_out = excluded.opt_out,
            last_interaction = excluded.last_interaction,
            metadata = COALESCE(excluded.metadata, sessions.metadata),
            human_takeover_until = excluded.human_takeover_until,
            human_takeover_status = excluded.human_takeover_status,
            department = COALESCE(excluded.department, sessions.department),
            last_instance = COALESCE(excluded.last_instance, sessions.last_instance)
        `,
        args: [
          merged.phone,
          merged.step,
          merged.client_id,
          merged.service_id,
          merged.client_name,
          merged.onu_id,
          merged.opt_out,
          merged.last_interaction,
          merged.metadata ?? null,
          merged.human_takeover_until ?? null,
          merged.human_takeover_status ?? 'BOT',
          merged.department ?? 'SOPORTE',
          merged.last_instance ?? null,
        ],
      });

      return merged;
    } catch (error: any) {
      logger.error(`Error al actualizar sesión de ${data.phone}:`, error?.message || error);
      return merged;
    }
  }

  /**
   * Reasigna o transfiere el departamento / área de una sesión (ej. 'Oficina Actopan', 'Cobranza Matriz', etc.)
   */
  static async updateDepartment(phone: string, department: string, targetInstance?: string): Promise<void> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      const cleanDept = (department || 'General').trim();
      if (targetInstance) {
        await client.execute({
          sql: `
            INSERT INTO sessions (phone, department, last_instance, last_interaction)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
              department = excluded.department,
              last_instance = excluded.last_instance,
              last_interaction = excluded.last_interaction
          `,
          args: [phone, cleanDept, targetInstance.trim(), now],
        });
      } else {
        await client.execute({
          sql: `
            INSERT INTO sessions (phone, department, last_interaction)
            VALUES (?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET
              department = excluded.department,
              last_interaction = excluded.last_interaction
          `,
          args: [phone, cleanDept, now],
        });
      }
      logger.info(`Departamento de ${phone} transferido a: ${cleanDept}${targetInstance ? ` (Instancia: ${targetInstance})` : ''}`);
    } catch (error: any) {
      logger.error(`Error al actualizar departamento de ${phone}:`, error?.message || error);
    }
  }

  /**
   * Actualiza la última instancia de WhatsApp utilizada para un cliente
   */
  static async updateLastInstance(phone: string, instanceName: string): Promise<void> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, last_instance, last_interaction)
          VALUES (?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            last_instance = excluded.last_instance,
            last_interaction = excluded.last_interaction
        `,
        args: [phone, instanceName, now],
      });
    } catch (error: any) {
      logger.error(`Error al actualizar last_instance de ${phone}:`, error?.message || error);
    }
  }

  /**
   * Actualiza el estado de intervención humana directamente en Turso
   */
  static async setHumanTakeover(
    phone: string,
    untilIso: string | null,
    status: 'OPERATOR_ACTIVE' | 'OPERATOR_WAITING_CLIENT' | 'RESOLVED' | 'BOT' = 'OPERATOR_ACTIVE'
  ): Promise<void> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, human_takeover_until, human_takeover_status, last_interaction)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            human_takeover_until = excluded.human_takeover_until,
            human_takeover_status = excluded.human_takeover_status,
            last_interaction = excluded.last_interaction
        `,
        args: [phone, untilIso, status, now],
      });
    } catch (error: any) {
      logger.error(`Error al persistir human takeover para ${phone}:`, error?.message || error);
    }
  }

  /**
   * Finaliza la intervención humana y reinicia el estado
   */
  static async clearHumanTakeover(phone: string): Promise<void> {
    await this.setHumanTakeover(phone, null, 'BOT');
  }

  /**
   * Actualiza el paso actual de la conversación y metadatos opcionales (UPSERT)
   */
  static async updateStep(phone: string, step: string, metadataObj?: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const metadataStr = metadataObj ? JSON.stringify(metadataObj) : null;

    try {
      const client = getTursoClient();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, step, last_interaction, metadata)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            step = excluded.step,
            last_interaction = excluded.last_interaction,
            metadata = COALESCE(excluded.metadata, sessions.metadata)
        `,
        args: [phone, step, now, metadataStr],
      });
    } catch (error: any) {
      logger.error(`Error al actualizar step de ${phone}:`, error?.message || error);
    }
  }

  /**
   * Activa o desactiva la exclusión de mensajes automáticos (Regla Anti-Spam / Opt-Out)
   */
  static async setOptOut(phone: string, optOut: boolean): Promise<void> {
    try {
      const client = getTursoClient();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, opt_out, last_interaction)
          VALUES (?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            opt_out = excluded.opt_out,
            last_interaction = excluded.last_interaction
        `,
        args: [phone, optOut ? 1 : 0, new Date().toISOString()],
      });
      logger.info(`Estado de Opt-Out para ${phone} actualizado a: ${optOut}`);
    } catch (error: any) {
      logger.error(`Error al cambiar opt-out para ${phone}:`, error?.message || error);
    }
  }

  /**
   * Verifica si el usuario solicitó no recibir mensajes
   */
  static async isOptedOut(phone: string): Promise<boolean> {
    const session = await this.getSession(phone);
    return session ? session.opt_out === 1 : false;
  }

  /**
   * Registra un mensaje entrante o saliente con su intención, acción tomada e instancia
   */
  static async logMessage(
    phone: string,
    direction: 'IN' | 'OUT',
    message: string,
    intent: string | null = null,
    actionTaken: string | null = null,
    instanceName?: string | null
  ): Promise<void> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO conversation_logs (phone, direction, message, intent, action_taken, instance_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [phone, direction, message, intent, actionTaken, instanceName || null, now],
      });
    } catch (error: any) {
      logger.error(`Error al registrar log de conversación para ${phone}:`, error?.message || error);
    }
  }

  /**
   * Obtiene los últimos logs de conversación para auditoría en el panel
   */
  static async getLogs(limit: number = 60, phone?: string): Promise<any[]> {
    try {
      const client = getTursoClient();
      let query = `
        SELECT l.*, s.client_name 
        FROM conversation_logs l
        LEFT JOIN sessions s ON l.phone = s.phone
      `;
      const args: any[] = [];

      if (phone) {
        query += ` WHERE l.phone = ?`;
        args.push(phone);
      }

      query += ` ORDER BY l.id DESC LIMIT ?`;
      args.push(limit);

      const result = await client.execute({ sql: query, args });
      return result.rows;
    } catch (error: any) {
      logger.error('Error al obtener logs de conversación:', error?.message || error);
      return [];
    }
  }

  /**
   * Obtiene los últimos mensajes en orden cronológico para alimentar el contexto de Groq
   */
  static async getHistorialReciente(phone: string, limit: number = 8): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const client = getTursoClient();
      const result = await client.execute({
        sql: `
          SELECT direction, message 
          FROM conversation_logs 
          WHERE phone = ? 
          ORDER BY id DESC 
          LIMIT ?
        `,
        args: [phone, limit],
      });

      const rows = [...result.rows].reverse();
      return rows.map((r: any) => ({
        role: (r.direction === 'IN' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(r.message || ''),
      }));
    } catch (error: any) {
      logger.error(`Error al obtener historial reciente de ${phone}:`, error?.message || error);
      return [];
    }
  }

  /**
   * Guarda o actualiza un lote de registros de ONUs provenientes de SmartOLT en Turso DB
   */
  static async saveSmartOltOnus(onus: SmartOltOnuRecord[]): Promise<number> {
    if (!onus || onus.length === 0) return 0;
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();

      // Procesar en batches para no exceder límites de argumentos de libSQL
      const batchSize = 40;
      let totalInserted = 0;

      for (let i = 0; i < onus.length; i += batchSize) {
        const batch = onus.slice(i, i + batchSize);
        const statements = batch.map(item => {
          const normName = normalizeText(item.name || '');
          return {
            sql: `
              INSERT INTO smartolt_onus (
                unique_external_id, sn, name, name_normalized, phone, address,
                zone_name, speed_profile, olt_name, ip_address, raw_data, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(unique_external_id) DO UPDATE SET
                sn = excluded.sn,
                name = excluded.name,
                name_normalized = excluded.name_normalized,
                phone = excluded.phone,
                address = excluded.address,
                zone_name = excluded.zone_name,
                speed_profile = excluded.speed_profile,
                olt_name = excluded.olt_name,
                ip_address = CASE WHEN excluded.ip_address IS NOT NULL AND excluded.ip_address != '' THEN excluded.ip_address ELSE smartolt_onus.ip_address END,
                raw_data = excluded.raw_data,
                updated_at = excluded.updated_at
            `,
            args: [
              item.unique_external_id,
              item.sn || '',
              item.name || '',
              normName,
              item.phone || '',
              item.address || '',
              item.zone_name || '',
              item.speed_profile || '',
              item.olt_name || '',
              item.ip_address || '',
              item.raw_data || '',
              now,
            ],
          };
        });

        await client.batch(statements, 'write');
        totalInserted += batch.length;
      }

      logger.info(`Sincronización exitosa: ${totalInserted} ONUs guardadas en Turso DB`);
      return totalInserted;
    } catch (error: any) {
      logger.error('Error al guardar lote de ONUs en Turso DB:', error?.message || error);
      throw error;
    }
  }

  /**
   * Elimina una ONU de la base de datos local Turso DB liberando de inmediato su IP
   */
  static async deleteSmartOltOnu(identifier: string): Promise<boolean> {
    if (!identifier) return false;
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `DELETE FROM smartolt_onus WHERE unique_external_id = ? OR sn = ?`,
        args: [identifier, identifier.toUpperCase()],
      });
      const deleted = (res.rowsAffected || 0) > 0;
      if (deleted) {
        logger.info(`ONU ${identifier} eliminada de Turso DB. IP liberada para reasignación.`);
      }
      return deleted;
    } catch (error: any) {
      logger.error(`Error al eliminar ONU ${identifier} en Turso DB:`, error?.message || error);
      return false;
    }
  }

  /**
   * Elimina de Turso DB todas las ONUs que ya no existen en SmartOLT (Reconciliación y liberación masiva de IPs)
   * Solo opera si el conjunto de ONUs activas es representativo (>500) para proteger contra respuestas parciales o vacías.
   */
  static async pruneSmartOltOnus(activeIds: Set<string>): Promise<number> {
    if (!activeIds || activeIds.size < 500) {
      logger.warn(`Pruning omitido: el lote de ONUs activas es demasiado pequeño (${activeIds?.size || 0})`);
      return 0;
    }
    try {
      const client = getTursoClient();
      const existingRes = await client.execute(`SELECT unique_external_id FROM smartolt_onus`);
      const toDelete: string[] = [];

      for (const row of existingRes.rows) {
        const id = String(row.unique_external_id || '');
        if (id && !activeIds.has(id)) {
          toDelete.push(id);
        }
      }

      if (toDelete.length === 0) {
        logger.info('Reconciliación de inventario: No hay ONUs huérfanas o eliminadas.');
        return 0;
      }

      logger.info(`Reconciliando inventario: Se detectaron ${toDelete.length} ONUs eliminadas en SmartOLT. Purgando y liberando IPs...`);

      const batchSize = 50;
      let totalDeleted = 0;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        await client.execute({
          sql: `DELETE FROM smartolt_onus WHERE unique_external_id IN (${placeholders})`,
          args: batch,
        });
        totalDeleted += batch.length;
      }

      logger.info(`✅ Reconciliación completada: ${totalDeleted} ONUs purgadas de Turso DB. IPs liberadas exitosamente.`);
      return totalDeleted;
    } catch (error: any) {
      logger.error('Error al purgar ONUs eliminadas en Turso DB:', error?.message || error);
      return 0;
    }
  }

  /**
   * Guarda o actualiza un lote de clientes provenientes de WispHub en Turso DB
   */
  static async saveWisphubClients(clients: WisphubClientRecord[]): Promise<number> {
    if (!clients || clients.length === 0) return 0;
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();

      const batchSize = 40;
      let totalInserted = 0;

      for (let i = 0; i < clients.length; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);
        const statements = batch.map(c => {
          const normName = normalizeText(c.nombre || '');
          let diaCorte = c.dia_corte || '';
          let fechaCorte = c.fecha_corte || '';

          if (!diaCorte && (fechaCorte || c.raw_data)) {
            try {
              if (!fechaCorte && c.raw_data) {
                const raw = JSON.parse(c.raw_data);
                fechaCorte = raw.fecha_corte || '';
              }
              if (fechaCorte) {
                const parts = fechaCorte.split(/[-/]/);
                if (parts.length === 3) {
                  // DD/MM/YYYY -> parts[0] es el día (1 a 31)
                  // YYYY-MM-DD -> parts[2] es el día
                  if (parts[0].length <= 2) {
                    diaCorte = String(parseInt(parts[0], 10) || parts[0]);
                  } else {
                    diaCorte = String(parseInt(parts[2], 10) || parts[2]);
                  }
                }
              }
            } catch {}
          }

          return {
            sql: `
              INSERT INTO wisphub_clients (
                id_servicio, nombre, nombre_normalized, servicio, ip, estado,
                estado_facturas, precio_plan, saldo, plan_internet, router,
                sn_onu, telefono, telefonos_adicionales, coordenadas_gps, google_maps_url, ubicacion_notas,
                direccion, dia_corte, fecha_corte, raw_data, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id_servicio) DO UPDATE SET
                nombre = excluded.nombre,
                nombre_normalized = excluded.nombre_normalized,
                servicio = excluded.servicio,
                ip = excluded.ip,
                estado = excluded.estado,
                estado_facturas = excluded.estado_facturas,
                precio_plan = excluded.precio_plan,
                saldo = excluded.saldo,
                plan_internet = excluded.plan_internet,
                router = excluded.router,
                sn_onu = excluded.sn_onu,
                telefono = COALESCE(NULLIF(excluded.telefono, ''), wisphub_clients.telefono),
                telefonos_adicionales = COALESCE(excluded.telefonos_adicionales, wisphub_clients.telefonos_adicionales),
                coordenadas_gps = COALESCE(excluded.coordenadas_gps, wisphub_clients.coordenadas_gps),
                google_maps_url = COALESCE(excluded.google_maps_url, wisphub_clients.google_maps_url),
                ubicacion_notas = COALESCE(excluded.ubicacion_notas, wisphub_clients.ubicacion_notas),
                direccion = COALESCE(NULLIF(excluded.direccion, ''), wisphub_clients.direccion),
                dia_corte = COALESCE(excluded.dia_corte, wisphub_clients.dia_corte),
                fecha_corte = COALESCE(excluded.fecha_corte, wisphub_clients.fecha_corte),
                raw_data = excluded.raw_data,
                updated_at = excluded.updated_at
            `,
            args: [
              Number(c.id_servicio),
              c.nombre || '',
              normName,
              c.servicio || '',
              c.ip || '',
              c.estado || 'Activo',
              c.estado_facturas || 'Pagadas',
              String(c.precio_plan || '0'),
              String(c.saldo || '0'),
              c.plan_internet || '',
              c.router || '',
              c.sn_onu || '',
              c.telefono || '',
              c.telefonos_adicionales || null,
              c.coordenadas_gps || null,
              c.google_maps_url || null,
              c.ubicacion_notas || null,
              c.direccion || '',
              diaCorte || null,
              fechaCorte || null,
              c.raw_data || '',
              now,
            ],
          };
        });

        await client.batch(statements, 'write');
        totalInserted += batch.length;
      }

      logger.info(`Sincronización exitosa: ${totalInserted} clientes de WispHub guardados en Turso DB`);
      return totalInserted;
    } catch (error: any) {
      logger.error('Error al guardar clientes de WispHub en Turso DB:', error?.message || error);
      throw error;
    }
  }

  /**
   * Obtiene clientes candidatos para notificaciones automáticas de cobranza según fecha de corte o estado
   */
  static async getNotificationCandidates(
    type: 'RECORDATORIO_PREVIO' | 'DIA_CORTE' | 'SUSPENSION',
    diasAnticipacion: number = 3
  ): Promise<WisphubClientRecord[]> {
    try {
      const client = getTursoClient();
      const now = new Date();
      // Calcular día objetivo en hora local México
      const nowMx = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const currentDay = nowMx.getDate();

      if (type === 'SUSPENSION') {
        const res = await client.execute(`
          SELECT * FROM wisphub_clients 
          WHERE LOWER(estado) LIKE '%susp%' OR LOWER(estado) LIKE '%cort%' OR LOWER(estado_facturas) LIKE '%pend%'
          LIMIT 200
        `);
        return res.rows as any[];
      }

      const targetDay = type === 'RECORDATORIO_PREVIO' ? (currentDay + diasAnticipacion) : currentDay;
      const targetDayStr = String(targetDay);
      const targetDayPadded = targetDayStr.padStart(2, '0');

      const res = await client.execute({
        sql: `
          SELECT * FROM wisphub_clients 
          WHERE (dia_corte = ? OR dia_corte = ? OR fecha_corte LIKE ?)
            AND telefono IS NOT NULL AND LENGTH(telefono) >= 10
          LIMIT 300
        `,
        args: [targetDayStr, targetDayPadded, `%-${targetDayPadded}`],
      });

      return res.rows as any[];
    } catch (err: any) {
      logger.error(`Error al obtener candidatos para ${type}:`, err?.message || err);
      return [];
    }
  }

  /**
   * Actualiza y vincula el teléfono de un cliente de WispHub en Turso DB cuando el usuario interactúa por WhatsApp
   * Si ya tiene un teléfono principal, añade los nuevos números a telefonos_adicionales (familiares / líneas secundarias).
   */
  static async updateWisphubClientPhone(idServicio: string | number, phone: string): Promise<boolean> {
    try {
      const client = getTursoClient();
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) return false;

      // 1. Obtener registro actual
      const current = await client.execute({
        sql: `SELECT telefono, telefonos_adicionales FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
        args: [Number(idServicio)],
      });

      if (current.rows.length === 0) return false;
      const row = current.rows[0];
      const mainPhone = String(row.telefono || '').replace(/\D/g, '');
      let extraPhones: string[] = [];
      try {
        if (row.telefonos_adicionales) {
          extraPhones = JSON.parse(String(row.telefonos_adicionales));
        }
      } catch {
        extraPhones = String(row.telefonos_adicionales || '').split(',').map(s => s.trim().replace(/\D/g, '')).filter(Boolean);
      }

      const now = new Date().toISOString();

      if (!mainPhone || mainPhone.length < 10) {
        // Guardar como teléfono principal
        await client.execute({
          sql: `UPDATE wisphub_clients SET telefono = ?, updated_at = ? WHERE id_servicio = ?`,
          args: [cleanPhone, now, Number(idServicio)],
        });
        return true;
      } else if (mainPhone !== cleanPhone && !extraPhones.includes(cleanPhone)) {
        // Añadir a teléfonos adicionales (familiares / números secundarios)
        extraPhones.push(cleanPhone);
        await client.execute({
          sql: `UPDATE wisphub_clients SET telefonos_adicionales = ?, updated_at = ? WHERE id_servicio = ?`,
          args: [JSON.stringify(extraPhones), now, Number(idServicio)],
        });
        logger.info(`[Multi-Teléfono] Teléfono adicional ${cleanPhone} vinculado a cliente servicio ${idServicio} (Total asociados: ${extraPhones.length + 1})`);
        return true;
      }

      return true;
    } catch (err: any) {
      logger.warn(`No se pudo vincular teléfono en WispHub para servicio ${idServicio}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Actualiza o registra las coordenadas GPS, enlace de Google Maps y dirección de un cliente
   * Funciona buscando por id_servicio, teléfono (principal o adicional) o número de serie ONU.
   */
  static async updateClientLocation(
    identifier: string | number,
    loc: {
      lat?: number | string;
      lng?: number | string;
      url?: string;
      direccion?: string;
      notas?: string;
    }
  ): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();

      let coordsStr = '';
      if (loc.lat !== undefined && loc.lng !== undefined && loc.lat !== '' && loc.lng !== '') {
        coordsStr = `${loc.lat},${loc.lng}`.trim();
      }

      let mapsUrl = (loc.url || '').trim();
      if (!mapsUrl && coordsStr) {
        mapsUrl = `https://www.google.com/maps?q=${coordsStr}`;
      }

      const idNum = Number(identifier);
      const isNum = !isNaN(idNum) && idNum > 0;
      const cleanPhone = String(identifier).replace(/\D/g, '');
      const rawStr = String(identifier).trim();

      let updatedCount = 0;

      // 1. Actualizar por id_servicio en wisphub_clients
      if (isNum) {
        const res = await client.execute({
          sql: `
            UPDATE wisphub_clients 
            SET 
              coordenadas_gps = COALESCE(NULLIF(?, ''), coordenadas_gps),
              google_maps_url = COALESCE(NULLIF(?, ''), google_maps_url),
              ubicacion_notas = COALESCE(NULLIF(?, ''), ubicacion_notas),
              direccion = COALESCE(NULLIF(?, ''), direccion),
              updated_at = ?
            WHERE id_servicio = ?
          `,
          args: [coordsStr || null, mapsUrl || null, loc.notas || null, loc.direccion || null, now, idNum],
        });
        if ((res.rowsAffected || 0) > 0) {
          updatedCount++;
          // Sincronizar en tiempo real con WispHub API
          try {
            const { WispHubService } = require('./wisphub.service');
            WispHubService.actualizarCliente(idNum, {
              latitud: loc.lat,
              longitud: loc.lng,
              direccion: loc.direccion,
            }).catch(() => {});
          } catch {}
        }
      }

      // 2. Actualizar por teléfono en wisphub_clients
      if (cleanPhone.length >= 10) {
        const resWh = await client.execute({
          sql: `
            UPDATE wisphub_clients 
            SET 
              coordenadas_gps = COALESCE(NULLIF(?, ''), coordenadas_gps),
              google_maps_url = COALESCE(NULLIF(?, ''), google_maps_url),
              ubicacion_notas = COALESCE(NULLIF(?, ''), ubicacion_notas),
              direccion = COALESCE(NULLIF(?, ''), direccion),
              updated_at = ?
            WHERE telefono LIKE ? OR telefonos_adicionales LIKE ?
          `,
          args: [coordsStr || null, mapsUrl || null, loc.notas || null, loc.direccion || null, now, `%${cleanPhone}%`, `%${cleanPhone}%`],
        });
        if ((resWh.rowsAffected || 0) > 0) updatedCount++;
      }

      // 3. Actualizar en smartolt_onus si coincide teléfono o SN
      if (cleanPhone.length >= 10 || rawStr.length >= 6) {
        await client.execute({
          sql: `
            UPDATE smartolt_onus 
            SET 
              coordenadas_gps = COALESCE(NULLIF(?, ''), coordenadas_gps),
              google_maps_url = COALESCE(NULLIF(?, ''), google_maps_url),
              updated_at = ?
            WHERE phone LIKE ? OR sn = ? OR unique_external_id = ?
          `,
          args: [coordsStr || null, mapsUrl || null, now, `%${cleanPhone}%`, rawStr.toUpperCase(), rawStr],
        });
      }

      // 4. Actualizar tickets abiertos asociados a este teléfono
      if (cleanPhone.length >= 10) {
        await client.execute({
          sql: `
            UPDATE tickets 
            SET 
              coordenadas_gps = COALESCE(NULLIF(?, ''), coordenadas_gps),
              google_maps_url = COALESCE(NULLIF(?, ''), google_maps_url),
              updated_at = ?
            WHERE phone LIKE ? AND status != 'RESUELTO'
          `,
          args: [coordsStr || null, mapsUrl || null, now, `%${cleanPhone}%`],
        });
      }

      logger.info(`[Ubicación] Georreferencia guardada para identificador "${identifier}": ${coordsStr || mapsUrl}`);
      return true;
    } catch (err: any) {
      logger.error(`Error al actualizar ubicación para ${identifier}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Actualiza el listado de teléfonos de un cliente (teléfono principal y adicionales/familiares)
   */
  static async updateWisphubClientTelefonos(
    idServicio: string | number,
    principal: string,
    adicionales: string[] = []
  ): Promise<boolean> {
    try {
      const client = getTursoClient();
      const cleanPrincipal = (principal || '').replace(/\D/g, '');
      const cleanExtras = (adicionales || []).map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10 && p !== cleanPrincipal);
      const uniqueExtras = Array.from(new Set(cleanExtras));
      const now = new Date().toISOString();

      await client.execute({
        sql: `
          UPDATE wisphub_clients 
          SET 
            telefono = ?,
            telefonos_adicionales = ?,
            updated_at = ?
          WHERE id_servicio = ?
        `,
        args: [
          cleanPrincipal || null,
          uniqueExtras.length > 0 ? JSON.stringify(uniqueExtras) : null,
          now,
          Number(idServicio),
        ],
      });

      logger.info(`[Teléfonos] Actualizados teléfonos de servicio ${idServicio}: Principal=${cleanPrincipal}, Adicionales=${uniqueExtras.join(', ')}`);
      return true;
    } catch (err: any) {
      logger.error(`Error al actualizar teléfonos de cliente ${idServicio}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Obtiene el directorio consolidado de clientes con soporte para búsqueda, filtros avanzados y paginación
   */
  static async getClientsDirectory(options: {
    search?: string;
    status?: string; // 'ALL' | 'ACTIVO' | 'SUSPENDIDO' | 'CON_GPS' | 'SIN_GPS'
    limit?: number;
    offset?: number;
  }): Promise<{
    clients: any[];
    total: number;
    totalActive: number;
    totalSuspended: number;
    totalWithGps: number;
    totalWithoutGps: number;
  }> {
    try {
      const client = getTursoClient();
      const limit = Math.min(Math.max(Number(options.limit || 50), 1), 200);
      const offset = Math.max(Number(options.offset || 0), 0);
      const search = (options.search || '').trim().toLowerCase();
      const statusFilter = (options.status || 'ALL').toUpperCase();

      // Métricas globales rápidas
      const metricsRes = await client.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(estado) LIKE '%act%' THEN 1 ELSE 0 END) as total_active,
          SUM(CASE WHEN LOWER(estado) LIKE '%susp%' OR LOWER(estado) LIKE '%cort%' THEN 1 ELSE 0 END) as total_suspended,
          SUM(CASE WHEN (coordenadas_gps IS NOT NULL AND LENGTH(coordenadas_gps) > 3) OR (google_maps_url IS NOT NULL AND LENGTH(google_maps_url) > 5) THEN 1 ELSE 0 END) as total_with_gps
        FROM wisphub_clients
      `);

      const total = Number(metricsRes.rows[0]?.total || 0);
      const totalActive = Number(metricsRes.rows[0]?.total_active || 0);
      const totalSuspended = Number(metricsRes.rows[0]?.total_suspended || 0);
      const totalWithGps = Number(metricsRes.rows[0]?.total_with_gps || 0);
      const totalWithoutGps = Math.max(0, total - totalWithGps);

      const whereClauses: string[] = [];
      const args: any[] = [];

      if (search) {
        const cleanSearch = search.replace(/[^a-z0-9]/gi, '');
        const normSearch = normalizeText(search);
        whereClauses.push(`(
          LOWER(w.nombre) LIKE ? OR
          w.nombre_normalized LIKE ? OR
          w.telefono LIKE ? OR
          w.telefonos_adicionales LIKE ? OR
          w.ip LIKE ? OR
          LOWER(w.sn_onu) LIKE ? OR
          LOWER(w.direccion) LIKE ? OR
          LOWER(w.servicio) LIKE ? OR
          CAST(w.id_servicio AS TEXT) LIKE ?
        )`);
        args.push(
          `%${search}%`,
          `%${normSearch}%`,
          `%${cleanSearch}%`,
          `%${cleanSearch}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`
        );
      }

      if (statusFilter === 'ACTIVO') {
        whereClauses.push(`LOWER(w.estado) LIKE '%act%'`);
      } else if (statusFilter === 'SUSPENDIDO') {
        whereClauses.push(`(LOWER(w.estado) LIKE '%susp%' OR LOWER(w.estado) LIKE '%cort%')`);
      } else if (statusFilter === 'CON_GPS') {
        whereClauses.push(`((w.coordenadas_gps IS NOT NULL AND LENGTH(w.coordenadas_gps) > 3) OR (w.google_maps_url IS NOT NULL AND LENGTH(w.google_maps_url) > 5))`);
      } else if (statusFilter === 'SIN_GPS') {
        whereClauses.push(`(w.coordenadas_gps IS NULL OR LENGTH(w.coordenadas_gps) <= 3) AND (w.google_maps_url IS NULL OR LENGTH(w.google_maps_url) <= 5)`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Total filtrado
      const countSql = `SELECT COUNT(*) as filtered_count FROM wisphub_clients w ${whereSql}`;
      const countRes = await client.execute({ sql: countSql, args });
      const filteredTotal = Number(countRes.rows[0]?.filtered_count || 0);

      // Consulta de registros con LEFT JOIN hacia smartolt_onus para complementar SN, potencia y OLT
      const querySql = `
        SELECT 
          w.id_servicio,
          w.nombre,
          w.servicio,
          w.ip,
          w.estado,
          w.estado_facturas,
          w.precio_plan,
          w.saldo,
          w.plan_internet,
          w.router,
          COALESCE(NULLIF(w.sn_onu, ''), o.sn) as sn_onu,
          w.telefono,
          w.telefonos_adicionales,
          COALESCE(NULLIF(w.coordenadas_gps, ''), o.coordenadas_gps) as coordenadas_gps,
          COALESCE(NULLIF(w.google_maps_url, ''), o.google_maps_url) as google_maps_url,
          w.ubicacion_notas,
          w.direccion,
          w.dia_corte,
          w.fecha_corte,
          w.updated_at,
          o.unique_external_id as smartolt_id,
          o.zone_name as zona_smartolt,
          o.olt_name as olt_smartolt
        FROM wisphub_clients w
        LEFT JOIN smartolt_onus o ON (
          (w.sn_onu IS NOT NULL AND LENGTH(w.sn_onu) >= 6 AND o.sn = w.sn_onu) OR
          (w.ip IS NOT NULL AND LENGTH(w.ip) >= 7 AND o.ip_address = w.ip)
        )
        ${whereSql}
        ORDER BY w.nombre ASC
        LIMIT ? OFFSET ?
      `;

      const rowsRes = await client.execute({
        sql: querySql,
        args: [...args, limit, offset],
      });

      const clients = rowsRes.rows.map(row => {
        let extraPhones: string[] = [];
        try {
          if (row.telefonos_adicionales) {
            extraPhones = JSON.parse(String(row.telefonos_adicionales));
          }
        } catch {
          extraPhones = String(row.telefonos_adicionales || '')
            .split(',')
            .map(s => s.trim().replace(/\D/g, ''))
            .filter(Boolean);
        }

        let mapsUrl = String(row.google_maps_url || '').trim();
        const coords = String(row.coordenadas_gps || '').trim();
        if (!mapsUrl && coords) {
          mapsUrl = `https://www.google.com/maps?q=${coords}`;
        }

        return {
          id_servicio: row.id_servicio,
          nombre: String(row.nombre || ''),
          servicio: String(row.servicio || ''),
          ip: String(row.ip || ''),
          estado: String(row.estado || 'Activo'),
          estado_facturas: String(row.estado_facturas || 'Pagadas'),
          precio_plan: row.precio_plan,
          saldo: row.saldo,
          plan_internet: String(row.plan_internet || ''),
          router: String(row.router || ''),
          sn_onu: String(row.sn_onu || ''),
          telefono_principal: String(row.telefono || '').replace(/\D/g, ''),
          telefonos_adicionales: extraPhones,
          coordenadas_gps: coords || null,
          google_maps_url: mapsUrl || null,
          ubicacion_notas: row.ubicacion_notas ? String(row.ubicacion_notas) : null,
          direccion: String(row.direccion || ''),
          dia_corte: row.dia_corte ? String(row.dia_corte) : null,
          fecha_corte: row.fecha_corte ? String(row.fecha_corte) : null,
          smartolt_id: row.smartolt_id ? String(row.smartolt_id) : null,
          zona_smartolt: row.zona_smartolt ? String(row.zona_smartolt) : null,
          olt_smartolt: row.olt_smartolt ? String(row.olt_smartolt) : null,
          updated_at: row.updated_at ? String(row.updated_at) : null,
        };
      });

      return {
        clients,
        total: filteredTotal,
        totalActive,
        totalSuspended,
        totalWithGps,
        totalWithoutGps,
      };
    } catch (err: any) {
      logger.error('Error al consultar directorio de clientes:', err?.message || err);
      return {
        clients: [],
        total: 0,
        totalActive: 0,
        totalSuspended: 0,
        totalWithGps: 0,
        totalWithoutGps: 0,
      };
    }
  }

  /**
   * Obtiene la ficha detallada de un cliente con su historial de tickets y datos técnicos
   */
  static async getClientDetail(idServicio: string | number): Promise<any | null> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `
          SELECT 
            w.*,
            o.unique_external_id as smartolt_id,
            o.zone_name as zona_smartolt,
            o.olt_name as olt_smartolt,
            o.speed_profile as perfil_velocidad
          FROM wisphub_clients w
          LEFT JOIN smartolt_onus o ON (
            (w.sn_onu IS NOT NULL AND LENGTH(w.sn_onu) >= 6 AND o.sn = w.sn_onu) OR
            (w.ip IS NOT NULL AND LENGTH(w.ip) >= 7 AND o.ip_address = w.ip)
          )
          WHERE w.id_servicio = ?
          LIMIT 1
        `,
        args: [Number(idServicio)],
      });

      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      let extraPhones: string[] = [];
      try {
        if (row.telefonos_adicionales) {
          extraPhones = JSON.parse(String(row.telefonos_adicionales));
        }
      } catch {
        extraPhones = String(row.telefonos_adicionales || '').split(',').map(s => s.trim().replace(/\D/g, '')).filter(Boolean);
      }

      const mainPhone = String(row.telefono || '').replace(/\D/g, '');
      const allPhones = [mainPhone, ...extraPhones].filter(Boolean);

      // Obtener tickets recientes asociados
      let tickets: any[] = [];
      if (allPhones.length > 0) {
        const placeholders = allPhones.map(() => '?').join(',');
        const tRes = await client.execute({
          sql: `SELECT * FROM tickets WHERE phone IN (${placeholders}) ORDER BY created_at DESC LIMIT 10`,
          args: allPhones,
        });
        tickets = tRes.rows as any[];
      }

      let mapsUrl = String(row.google_maps_url || '').trim();
      const coords = String(row.coordenadas_gps || '').trim();
      if (!mapsUrl && coords) {
        mapsUrl = `https://www.google.com/maps?q=${coords}`;
      }

      return {
        id_servicio: row.id_servicio,
        nombre: String(row.nombre || ''),
        servicio: String(row.servicio || ''),
        ip: String(row.ip || ''),
        estado: String(row.estado || 'Activo'),
        estado_facturas: String(row.estado_facturas || 'Pagadas'),
        precio_plan: row.precio_plan,
        saldo: row.saldo,
        plan_internet: String(row.plan_internet || ''),
        router: String(row.router || ''),
        sn_onu: String(row.sn_onu || ''),
        telefono_principal: mainPhone,
        telefonos_adicionales: extraPhones,
        todos_los_telefonos: allPhones,
        coordenadas_gps: coords || null,
        google_maps_url: mapsUrl || null,
        ubicacion_notas: row.ubicacion_notas ? String(row.ubicacion_notas) : null,
        direccion: String(row.direccion || ''),
        dia_corte: row.dia_corte ? String(row.dia_corte) : null,
        fecha_corte: row.fecha_corte ? String(row.fecha_corte) : null,
        smartolt_id: row.smartolt_id ? String(row.smartolt_id) : null,
        zona_smartolt: row.zona_smartolt ? String(row.zona_smartolt) : null,
        olt_smartolt: row.olt_smartolt ? String(row.olt_smartolt) : null,
        perfil_velocidad: row.perfil_velocidad ? String(row.perfil_velocidad) : null,
        tickets,
        updated_at: row.updated_at ? String(row.updated_at) : null,
      };
    } catch (err: any) {
      logger.error(`Error al obtener detalle de cliente ${idServicio}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Búsqueda flexible (Fuzzy Matching) de clientes / ONUs por nombre
   * Tolerante a errores ortográficos, mayúsculas/minúsculas y acentos.
   */
  static async searchOnusFuzzy(
    query: string,
    limit: number = 5
  ): Promise<Array<SmartOltOnuRecord & { matchScore: number }>> {
    const rawQuery = (query || '').trim();
    if (!rawQuery) return [];

    const cleanedQuery = cleanPersonName(rawQuery);
    const normQuery = normalizeText(cleanedQuery || rawQuery);
    if (!normQuery) return [];

    try {
      const client = getTursoClient();

      // 1. Búsqueda directa por número de serie o teléfono en SmartOLT
      const directMatch = await client.execute({
        sql: `
          SELECT * FROM smartolt_onus 
          WHERE sn LIKE ? OR phone LIKE ? OR unique_external_id = ?
          LIMIT 3
        `,
        args: [`%${normQuery}%`, `%${normQuery}%`, rawQuery],
      });

      if (directMatch.rows.length > 0) {
        return directMatch.rows.map((row: any) => ({
          unique_external_id: String(row.unique_external_id),
          sn: String(row.sn || ''),
          name: String(row.name || ''),
          name_normalized: String(row.name_normalized || ''),
          phone: String(row.phone || ''),
          address: String(row.address || ''),
          zone_name: String(row.zone_name || ''),
          speed_profile: String(row.speed_profile || ''),
          olt_name: String(row.olt_name || ''),
          ip_address: String(row.ip_address || row.ip || ''),
          matchScore: 100,
        }));
      }

      // 1.1 Si la consulta es un teléfono (10 o más dígitos), buscar también en WispHub (teléfono principal o adicionales)
      const digits = rawQuery.replace(/\D/g, '');
      if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        const whMatch = await client.execute({
          sql: `
            SELECT * FROM wisphub_clients 
            WHERE telefono LIKE ? OR telefonos_adicionales LIKE ? 
            LIMIT 3
          `,
          args: [`%${last10}`, `%${last10}%`],
        });

        if (whMatch.rows.length > 0) {
          return whMatch.rows.map((r: any) => ({
            unique_external_id: String(r.id_servicio),
            sn: String(r.sn_onu || ''),
            name: String(r.nombre || ''),
            name_normalized: String(r.nombre_normalized || ''),
            phone: String(r.telefono || ''),
            address: String(r.direccion || ''),
            zone_name: String(r.servicio || ''),
            speed_profile: String(r.plan_internet || ''),
            olt_name: 'WispHub',
            ip_address: String(r.ip || ''),
            matchScore: 95,
          }));
        }
      }

      // 2. Extraer palabras clave de la consulta para filtrar candidatos en SQL
      const STOP_QUERY = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'onu', 'casa', 'soy', 'yo', 'me', 'llamo', 'mi', 'nombre', 'es', 'hola']);
      const queryWords = normQuery.split(' ').filter(w => w.length > 1 && !STOP_QUERY.has(w));
      const candidateRowsMap = new Map<string, any>();

      // A. Búsqueda por fragmentos fonéticos y trigramas (tolera errores tipográficos como "mribel", "marivel", "arrivel")
      const fragments = generateSearchFragments(cleanedQuery || normQuery);
      if (fragments.length > 0) {
        const fragClauses = fragments.map(() => 'name_normalized LIKE ?').join(' OR ');
        const fragRes = await client.execute({
          sql: `SELECT * FROM smartolt_onus WHERE ${fragClauses} LIMIT 400`,
          args: fragments.map(f => `%${f}%`),
        });
        for (const r of fragRes.rows) {
          candidateRowsMap.set(String(r.unique_external_id), r);
        }
      }

      if (queryWords.length > 0) {
        // B. Búsqueda con AND (todas las palabras presentes)
        if (queryWords.length >= 2) {
          const andClauses = queryWords.map(() => 'name_normalized LIKE ?').join(' AND ');
          const andRes = await client.execute({
            sql: `SELECT * FROM smartolt_onus WHERE ${andClauses} LIMIT 100`,
            args: queryWords.map(w => `%${w}%`),
          });
          for (const r of andRes.rows) {
            candidateRowsMap.set(String(r.unique_external_id), r);
          }
        }

        // C. Búsqueda prioritaria por primer nombre
        const firstName = queryWords[0];
        if (firstName && firstName.length >= 3) {
          const fnRes = await client.execute({
            sql: `SELECT * FROM smartolt_onus WHERE name_normalized LIKE ? LIMIT 150`,
            args: [`%${firstName}%`],
          });
          for (const r of fnRes.rows) {
            candidateRowsMap.set(String(r.unique_external_id), r);
          }
        }
      }

      let rowsToEvaluate = Array.from(candidateRowsMap.values());
      if (rowsToEvaluate.length < 50) {
        const sampleResult = await client.execute('SELECT * FROM smartolt_onus LIMIT 600');
        for (const r of sampleResult.rows) {
          candidateRowsMap.set(String(r.unique_external_id), r);
        }
        rowsToEvaluate = Array.from(candidateRowsMap.values());
      }

      // 3. Evaluar cada candidato con el algoritmo de scoring difuso
      const scored: Array<SmartOltOnuRecord & { matchScore: number }> = [];

      for (const row of rowsToEvaluate) {
        const candidateName = String(row.name || '');
        const score = computeNameMatchScore(cleanedQuery || rawQuery, candidateName);

        // Umbral mínimo de similitud: 50%
        if (score >= 50) {
          scored.push({
            unique_external_id: String(row.unique_external_id),
            sn: String(row.sn || ''),
            name: candidateName,
            name_normalized: String(row.name_normalized || ''),
            phone: String(row.phone || ''),
            address: String(row.address || ''),
            zone_name: String(row.zone_name || ''),
            speed_profile: String(row.speed_profile || ''),
            olt_name: String(row.olt_name || ''),
            ip_address: String(row.ip_address || row.ip || ''),
            matchScore: score,
          });
        }
      }

      // Ordenar por mayor puntuación de coincidencia
      scored.sort((a, b) => b.matchScore - a.matchScore);
      return scored.slice(0, limit);
    } catch (error: any) {
      logger.error(`Error en búsqueda difusa de ONUs para "${query}":`, error?.message || error);
      return [];
    }
  }

  /**
   * Obtiene una ONU específica por su unique_external_id o SN
   */
  static async getOnuById(idOrSn: string): Promise<SmartOltOnuRecord | null> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `SELECT * FROM smartolt_onus WHERE unique_external_id = ? OR sn = ? LIMIT 1`,
        args: [idOrSn, idOrSn],
      });
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        unique_external_id: String(row.unique_external_id),
        sn: String(row.sn || ''),
        name: String(row.name || ''),
        name_normalized: String(row.name_normalized || ''),
        phone: String(row.phone || ''),
        address: String(row.address || ''),
        zone_name: String(row.zone_name || ''),
        speed_profile: String(row.speed_profile || ''),
        olt_name: String(row.olt_name || ''),
        updated_at: String(row.updated_at || ''),
      };
    } catch (error: any) {
      logger.error(`Error al obtener ONU por ID ${idOrSn}:`, error?.message || error);
      return null;
    }
  }

  /**
   * Búsqueda flexible de clientes en WispHub (wisphub_clients) con algoritmo difuso tolerante
   */
  static async searchWisphubClientsFuzzy(
    query: string,
    limit: number = 5
  ): Promise<Array<WisphubClientRecord & { matchScore: number }>> {
    const rawQuery = (query || '').trim();
    if (!rawQuery) return [];

    const cleanedQuery = cleanPersonName(rawQuery);
    const normQuery = normalizeText(cleanedQuery || rawQuery);
    if (!normQuery) return [];

    try {
      const client = getTursoClient();

      // 1. Búsqueda directa por ID de servicio, teléfono, SN o IP
      const directMatch = await client.execute({
        sql: `
          SELECT * FROM wisphub_clients 
          WHERE id_servicio = ? OR telefono LIKE ? OR sn_onu LIKE ? OR ip = ?
          LIMIT 3
        `,
        args: [rawQuery, `%${normQuery}%`, `%${normQuery}%`, rawQuery],
      });

      if (directMatch.rows.length > 0) {
        return directMatch.rows.map((row: any) => ({
          id_servicio: Number(row.id_servicio),
          nombre: String(row.nombre || ''),
          nombre_normalized: String(row.nombre_normalized || ''),
          servicio: String(row.servicio || ''),
          ip: String(row.ip || ''),
          estado: String(row.estado || 'Activo'),
          estado_facturas: String(row.estado_facturas || 'Pagadas'),
          precio_plan: String(row.precio_plan || '0'),
          saldo: String(row.saldo || '0'),
          plan_internet: String(row.plan_internet || ''),
          router: String(row.router || ''),
          sn_onu: String(row.sn_onu || ''),
          telefono: String(row.telefono || ''),
          direccion: String(row.direccion || ''),
          updated_at: String(row.updated_at || ''),
          matchScore: 100,
        }));
      }

      // 2. Extraer palabras clave de búsqueda
      const STOP_QUERY = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'casa', 'soy', 'yo', 'me', 'llamo', 'mi', 'nombre', 'es', 'hola']);
      const queryWords = normQuery.split(' ').filter(w => w.length > 1 && !STOP_QUERY.has(w));
      const candidateRowsMap = new Map<string, any>();

      // A. Búsqueda por fragmentos fonéticos y trigramas
      const fragments = generateSearchFragments(cleanedQuery || normQuery);
      if (fragments.length > 0) {
        const fragClauses = fragments.map(() => 'nombre_normalized LIKE ?').join(' OR ');
        const fragRes = await client.execute({
          sql: `SELECT * FROM wisphub_clients WHERE ${fragClauses} LIMIT 400`,
          args: fragments.map(f => `%${f}%`),
        });
        for (const r of fragRes.rows) {
          candidateRowsMap.set(String(r.id_servicio), r);
        }
      }

      if (queryWords.length > 0) {
        if (queryWords.length >= 2) {
          const andClauses = queryWords.map(() => 'nombre_normalized LIKE ?').join(' AND ');
          const andRes = await client.execute({
            sql: `SELECT * FROM wisphub_clients WHERE ${andClauses} LIMIT 100`,
            args: queryWords.map(w => `%${w}%`),
          });
          for (const r of andRes.rows) {
            candidateRowsMap.set(String(r.id_servicio), r);
          }
        }

        const firstName = queryWords[0];
        if (firstName && firstName.length >= 3) {
          const fnRes = await client.execute({
            sql: `SELECT * FROM wisphub_clients WHERE nombre_normalized LIKE ? LIMIT 150`,
            args: [`%${firstName}%`],
          });
          for (const r of fnRes.rows) {
            candidateRowsMap.set(String(r.id_servicio), r);
          }
        }
      }

      let rowsToEvaluate = Array.from(candidateRowsMap.values());
      if (rowsToEvaluate.length < 50) {
        const sampleResult = await client.execute('SELECT * FROM wisphub_clients LIMIT 600');
        for (const r of sampleResult.rows) {
          candidateRowsMap.set(String(r.id_servicio), r);
        }
        rowsToEvaluate = Array.from(candidateRowsMap.values());
      }

      const scored: Array<WisphubClientRecord & { matchScore: number }> = [];

      for (const row of rowsToEvaluate) {
        const candidateName = String(row.nombre || '');
        const score = computeNameMatchScore(cleanedQuery || rawQuery, candidateName);

        if (score >= 40) {
          scored.push({
            id_servicio: Number(row.id_servicio),
            nombre: String(row.nombre || ''),
            nombre_normalized: String(row.nombre_normalized || ''),
            servicio: String(row.servicio || ''),
            ip: String(row.ip || ''),
            estado: String(row.estado || 'Activo'),
            estado_facturas: String(row.estado_facturas || 'Pagadas'),
            precio_plan: String(row.precio_plan || '0'),
            saldo: String(row.saldo || '0'),
            plan_internet: String(row.plan_internet || ''),
            router: String(row.router || ''),
            sn_onu: String(row.sn_onu || ''),
            telefono: String(row.telefono || ''),
            direccion: String(row.direccion || ''),
            updated_at: String(row.updated_at || ''),
            matchScore: score,
          });
        }
      }

      scored.sort((a, b) => b.matchScore - a.matchScore);
      return scored.slice(0, limit);
    } catch (error: any) {
      logger.error('Error en búsqueda difusa de WispHub en Turso:', error?.message || error);
      return [];
    }
  }

  /**
   * Busca un cliente en WispHub por cualquier identificador disponible
   */
  static async getWisphubClientByAny(params: {
    id?: string | number | null;
    phone?: string | null;
    sn?: string | null;
    name?: string | null;
    ip?: string | null;
  }): Promise<WisphubClientRecord | null> {
    try {
      const client = getTursoClient();
      const { id, phone, sn, name, ip } = params;

      // 1. Búsqueda prioritaria por IP en el sistema
      const ipBuscada = (ip && ip !== 'N/A') ? ip : (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(id || '')) ? String(id) : null);
      if (ipBuscada) {
        const res = await client.execute({
          sql: `SELECT * FROM wisphub_clients WHERE ip = ? LIMIT 1`,
          args: [ipBuscada],
        });
        if (res.rows.length > 0) return res.rows[0] as any;
      }

      // 2. Si tenemos número de contrato / ID numérico (estrictamente numérico o con prefijo)
      if (id && !String(id).startsWith('HWTC') && !String(id).startsWith('ONU-') && !String(id).startsWith('ZTEG')) {
        const idStr = String(id).trim();
        // Solo extraer si es numérico
        if (/^\d+$/.test(idStr)) {
          const res = await client.execute({
            sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
            args: [Number(idStr)],
          });
          if (res.rows.length > 0) {
            const row = res.rows[0];
            if (!name || computeNameMatchScore(name, String(row.nombre || '')) >= 40) {
              return row as any;
            }
          }

          // Si no coincidió por id_servicio directo, buscar por prefijo de contrato en el nombre/servicio (ej: "0696" o "696")
          const padded = idStr.padStart(4, '0');
          const prefixRes = await client.execute({
            sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre LIKE ? OR servicio LIKE ? LIMIT 10`,
            args: [`%${idStr}%`, `%${padded}%`, `%${idStr}%`],
          });
          for (const row of prefixRes.rows) {
            if (!name || computeNameMatchScore(name, String(row.nombre || '')) >= 40) {
              return row as any;
            }
          }
        }
      }

      // 3. Búsqueda por SN de ONU o cruce con SmartOLT si es un serial tipo HWTC/ZTEG
      const snVal = sn || (id && (String(id).startsWith('HWTC') || String(id).startsWith('ZTEG') || String(id).startsWith('ONU-')) ? String(id) : null);
      if (snVal) {
        const res = await client.execute({
          sql: `SELECT * FROM wisphub_clients WHERE sn_onu LIKE ? LIMIT 1`,
          args: [`%${snVal}%`],
        });
        if (res.rows.length > 0) return res.rows[0] as any;

        // Cruce con SmartOLT para obtener el nombre o IP registrada de la ONU
        const oltRow = await client.execute({
          sql: `SELECT name, ip_address FROM smartolt_onus WHERE unique_external_id = ? OR sn = ? LIMIT 1`,
          args: [snVal, snVal],
        });
        if (oltRow.rows.length > 0) {
          const oName = String(oltRow.rows[0].name || '');
          const oIp = String(oltRow.rows[0].ip_address || '');
          if (oIp && oIp !== 'N/A') {
            const whByIp = await client.execute({
              sql: `SELECT * FROM wisphub_clients WHERE ip = ? LIMIT 1`,
              args: [oIp],
            });
            if (whByIp.rows.length > 0) return whByIp.rows[0] as any;
          }
          if (oName) {
            const numMatch = oName.match(/^0*(\d+)/);
            if (numMatch) {
              const padded = numMatch[1].padStart(4, '0');
              const prefixRes = await client.execute({
                sql: `SELECT * FROM wisphub_clients WHERE servicio LIKE ? OR nombre LIKE ? OR servicio LIKE ? LIMIT 5`,
                args: [`%${numMatch[1]}%`, `%${padded}%`, `%${numMatch[1]}%`],
              });
              for (const row of prefixRes.rows) {
                if (computeNameMatchScore(oName, String(row.nombre || '')) >= 40) {
                  return row as any;
                }
              }
            }
            const fuzzy = await this.searchWisphubClientsFuzzy(oName, 1);
            if (fuzzy.length > 0 && fuzzy[0].matchScore >= 50) {
              return fuzzy[0];
            }
          }
        }
      }

      // 4. Búsqueda por Teléfono
      if (phone) {
        const phoneClean = phone.replace(/\D/g, '').slice(-10);
        if (phoneClean.length >= 7) {
          const res = await client.execute({
            sql: `SELECT * FROM wisphub_clients WHERE telefono LIKE ? LIMIT 1`,
            args: [`%${phoneClean}%`],
          });
          if (res.rows.length > 0) return res.rows[0] as any;
        }
      }

      // 5. Búsqueda por Nombre difuso (Fuzzy)
      if (name) {
        const fuzzy = await this.searchWisphubClientsFuzzy(name, 1);
        if (fuzzy.length > 0 && fuzzy[0].matchScore >= 50) {
          return fuzzy[0];
        }
      }

      return null;
    } catch (error: any) {
      logger.error('Error al buscar cliente WispHub por datos generales en Turso:', error?.message || error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de sincronización de SmartOLT
   */
  static async getSmartOltSyncStats(): Promise<{ count: number; lastSync: string | null }> {
    try {
      const client = getTursoClient();
      const res = await client.execute(`
        SELECT COUNT(*) as total, MAX(updated_at) as last_sync 
        FROM smartolt_onus
      `);
      const row = res.rows[0];
      return {
        count: Number(row?.total || 0),
        lastSync: row?.last_sync ? String(row.last_sync) : null,
      };
    } catch (error: any) {
      logger.error('Error al obtener estadísticas de SmartOLT en Turso:', error?.message || error);
      return { count: 0, lastSync: null };
    }
  }

  /**
   * Obtiene estadísticas de sincronización de WispHub
   */
  static async getWisphubSyncStats(): Promise<{ count: number; lastSync: string | null }> {
    try {
      const client = getTursoClient();
      const res = await client.execute(`
        SELECT COUNT(*) as total, MAX(updated_at) as last_sync 
        FROM wisphub_clients
      `);
      const row = res.rows[0];
      return {
        count: Number(row?.total || 0),
        lastSync: row?.last_sync ? String(row.last_sync) : null,
      };
    } catch (error: any) {
      logger.error('Error al obtener estadísticas de WispHub en Turso:', error?.message || error);
      return { count: 0, lastSync: null };
    }
  }

  /**
   * Obtiene todas las ONUs registradas en SmartOLT desde Turso DB
   */
  static async getAllSmartOltOnus(): Promise<SmartOltOnuRecord[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute('SELECT * FROM smartolt_onus');
      return res.rows.map((row) => ({
        unique_external_id: String(row.unique_external_id || ''),
        sn: String(row.sn || ''),
        name: String(row.name || ''),
        name_normalized: row.name_normalized ? String(row.name_normalized) : undefined,
        phone: row.phone ? String(row.phone) : undefined,
        address: row.address ? String(row.address) : undefined,
        zone_name: row.zone_name ? String(row.zone_name) : undefined,
        speed_profile: row.speed_profile ? String(row.speed_profile) : undefined,
        olt_name: row.olt_name ? String(row.olt_name) : undefined,
        ip_address: row.ip_address ? String(row.ip_address) : undefined,
        raw_data: row.raw_data ? String(row.raw_data) : undefined,
        updated_at: row.updated_at ? String(row.updated_at) : undefined,
      }));
    } catch (error: any) {
      logger.error('Error al obtener todas las ONUs de SmartOLT desde Turso:', error?.message || error);
      return [];
    }
  }

  /**
   * Obtiene todos los clientes registrados en WispHub desde Turso DB
   */
  static async getAllWispHubClientes(): Promise<WisphubClientRecord[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute('SELECT * FROM wisphub_clients');
      return res.rows.map((row) => ({
        id_servicio: row.id_servicio as number | string,
        nombre: String(row.nombre || ''),
        nombre_normalized: row.nombre_normalized ? String(row.nombre_normalized) : undefined,
        servicio: row.servicio ? String(row.servicio) : undefined,
        ip: row.ip ? String(row.ip) : undefined,
        estado: row.estado ? String(row.estado) : undefined,
        estado_facturas: row.estado_facturas ? String(row.estado_facturas) : undefined,
        precio_plan: row.precio_plan as string | number,
        saldo: row.saldo as string | number,
        plan_internet: row.plan_internet ? String(row.plan_internet) : undefined,
        router: row.router ? String(row.router) : undefined,
        sn_onu: row.sn_onu ? String(row.sn_onu) : undefined,
        telefono: row.telefono ? String(row.telefono) : undefined,
        direccion: row.direccion ? String(row.direccion) : undefined,
        raw_data: row.raw_data ? String(row.raw_data) : undefined,
        updated_at: row.updated_at ? String(row.updated_at) : undefined,
      }));
    } catch (error: any) {
      logger.error('Error al obtener todos los clientes de WispHub desde Turso:', error?.message || error);
      return [];
    }
  }

  /**
   * Realiza el cruce de datos entre SmartOLT y WispHub (detección de discrepancias de IP, TR-069 e IPv6)
   * 100% solo lectura. Cruza por número de folio/contrato (ej: 2861) y por nombre normalizado.
   */
  static async getAuditIpCross(options: {
    filter?: 'all' | 'mismatches' | 'matches' | 'only_olt' | 'only_wisphub' | 'no_ip' | 'missing_tr069' | 'missing_ipv6';
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    summary: {
      totalSmartOlt: number;
      totalWisphub: number;
      mismatches: number;
      matches: number;
      onlySmartOlt: number;
      onlyWisphub: number;
      noIp: number;
      missingTr069: number;
      missingIpv6: number;
    };
    items: AuditIpItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const filter = options.filter || 'all';
    const search = (options.search || '').toLowerCase().trim();
    const limit = options.limit || 50;
    const page = options.page || 1;
    const offset = options.offset !== undefined ? options.offset : (page - 1) * limit;

    try {
      const client = getTursoClient();

      // 1. Obtener todas las ONUs de SmartOLT
      const resOlt = await client.execute('SELECT * FROM smartolt_onus');
      // 2. Obtener todos los clientes de WispHub
      const resWh = await client.execute('SELECT * FROM wisphub_clients');

      const oltRows = resOlt.rows;
      const whRows = resWh.rows;

      // Indexar WispHub por Folio numérico (lista de clientes por folio), Número de Serie y Nombre Normalizado
      const whByFolio = new Map<string, any[]>();
      const whByName = new Map<string, any[]>();
      const whBySn = new Map<string, any>();
      const whUsedIds = new Set<string | number>();

      for (const row of whRows) {
        const servicioStr = String(row.servicio || row.nombre || '');
        const folioMatch = servicioStr.match(/^([0-9]{1,6})[-\s_]/) || servicioStr.match(/([0-9]{1,6})[-\s_]/);
        if (folioMatch && folioMatch[1]) {
          const numFolio = String(parseInt(folioMatch[1], 10));
          const list = whByFolio.get(numFolio) || [];
          list.push(row);
          whByFolio.set(numFolio, list);
        }
        const normName = String(row.nombre_normalized || normalizeText(cleanPersonName(String(row.nombre || ''))));
        if (normName && normName.length >= 4) {
          const list = whByName.get(normName) || [];
          list.push(row);
          whByName.set(normName, list);
        }
        const sn = String(row.sn_onu || '').trim().toUpperCase();
        if (sn && sn.length >= 8) {
          whBySn.set(sn, row);
        }
      }

      const matchedItems: AuditIpItem[] = [];

      // 3. Procesar registros de SmartOLT y buscar su par en WispHub
      for (const olt of oltRows) {
        const oltName = String(olt.name || '');
        const oltFolioMatch = oltName.match(/([0-9]{1,6})[-\s_]/);
        const oltNumFolio = oltFolioMatch ? String(parseInt(oltFolioMatch[1], 10)) : '';
        const oltNormName = String(olt.name_normalized || normalizeText(cleanPersonName(oltName)));
        const oltSn = String(olt.sn || '').trim().toUpperCase();
        const oltIp = olt.ip_address ? String(olt.ip_address).trim() : null;

        let whMatch: any = null;

        // 1. Prioridad: Coincidencia por Número de Serie de ONU (SN)
        if (oltSn && whBySn.has(oltSn)) {
          const cand = whBySn.get(oltSn);
          if (!whUsedIds.has(cand.id_servicio)) {
            whMatch = cand;
          }
        }

        // 2. Coincidencia por Folio numérico CON VALIDACIÓN DE NOMBRE
        // Previene falsos positivos con folios duplicados de antenas u otras OLTs
        if (!whMatch && oltNumFolio && whByFolio.has(oltNumFolio)) {
          const candidates = whByFolio.get(oltNumFolio) || [];
          let bestCandidate: any = null;
          let bestScore = -1;

          for (const cand of candidates) {
            if (whUsedIds.has(cand.id_servicio)) continue;
            const candName = String(cand.nombre || cand.servicio || '');
            const score = computeNameMatchScore(cleanPersonName(oltName), candName);
            if (score > bestScore) {
              bestScore = score;
              bestCandidate = cand;
            }
          }

          if (bestCandidate && bestScore >= 35) {
            whMatch = bestCandidate;
          } else if (bestCandidate && candidates.length === 1 && bestScore >= 20) {
            whMatch = bestCandidate;
          }
        }

        // 3. Coincidencia por Nombre Normalizado
        if (!whMatch && oltNormName && oltNormName.length >= 5) {
          const nameCandidates = whByName.get(oltNormName) || [];
          for (const cand of nameCandidates) {
            if (!whUsedIds.has(cand.id_servicio)) {
              whMatch = cand;
              break;
            }
          }
        }

        const tr069Status = parseOnuTr069Status(olt.raw_data);
        const ipv6Status = parseOnuIpv6Status(olt.raw_data);

        if (whMatch) {
          whUsedIds.add(whMatch.id_servicio);
          const whIp = whMatch.ip ? String(whMatch.ip).trim() : null;

          let ipStatus: AuditIpItem['ip_status'] = 'NO_IP';
          if (oltIp && whIp) {
            ipStatus = (oltIp.toLowerCase() === whIp.toLowerCase()) ? 'MATCH' : 'MISMATCH';
          } else if (!oltIp && !whIp) {
            ipStatus = 'NO_IP';
          } else {
            ipStatus = 'NO_IP';
          }

          matchedItems.push({
            id: `MATCH-${olt.unique_external_id}-${whMatch.id_servicio}`,
            folio: oltNumFolio || String(whMatch.id_servicio),
            cliente: String(whMatch.nombre || cleanPersonName(oltName)),
            servicio: String(whMatch.servicio || oltName),
            smartolt_ip: oltIp,
            wisphub_ip: whIp,
            ip_status: ipStatus,
            tr069_status: tr069Status,
            ipv6_status: ipv6Status,
            onu_external_id: String(olt.unique_external_id),
            wisphub_estado: String(whMatch.estado || 'Activo'),
            wisphub_facturas: String(whMatch.estado_facturas || 'Pagadas'),
            wisphub_plan: String(whMatch.plan_internet || ''),
            zona_o_router: String(olt.zone_name || whMatch.router || ''),
            sn_smartolt: String(olt.sn || ''),
            sn_wisphub: String(whMatch.sn_onu || ''),
            smartolt_id: String(olt.unique_external_id),
            wisphub_id: whMatch.id_servicio ? Number(whMatch.id_servicio) : null,
          });
        } else {
          // Solo en SmartOLT
          matchedItems.push({
            id: `OLT-${olt.unique_external_id}`,
            folio: oltNumFolio || 'N/A',
            cliente: cleanPersonName(oltName) || oltName,
            servicio: oltName,
            smartolt_ip: oltIp,
            wisphub_ip: null,
            ip_status: 'ONLY_SMARTOLT',
            tr069_status: tr069Status,
            ipv6_status: ipv6Status,
            onu_external_id: String(olt.unique_external_id),
            wisphub_estado: null,
            wisphub_facturas: null,
            wisphub_plan: null,
            zona_o_router: String(olt.zone_name || olt.olt_name || ''),
            sn_smartolt: String(olt.sn || ''),
            sn_wisphub: null,
            smartolt_id: String(olt.unique_external_id),
            wisphub_id: null,
          });
        }
      }

      // 4. Agregar registros de WispHub que no tuvieron par en SmartOLT
      for (const wh of whRows) {
        if (wh.id_servicio && !whUsedIds.has(wh.id_servicio as any)) {
          const servicioStr = String(wh.servicio || wh.nombre || '');
          const folioMatch = servicioStr.match(/^([0-9]{1,6})[-\s_]/);
          const whIp = wh.ip ? String(wh.ip).trim() : null;

          matchedItems.push({
            id: `WH-${wh.id_servicio}`,
            folio: folioMatch ? folioMatch[1] : String(wh.id_servicio),
            cliente: String(wh.nombre || ''),
            servicio: servicioStr,
            smartolt_ip: null,
            wisphub_ip: whIp,
            ip_status: 'ONLY_WISPHUB',
            tr069_status: 'MISSING',
            ipv6_status: 'MISSING',
            onu_external_id: null,
            wisphub_estado: String(wh.estado || 'Activo'),
            wisphub_facturas: String(wh.estado_facturas || 'Pagadas'),
            wisphub_plan: String(wh.plan_internet || ''),
            zona_o_router: String(wh.router || ''),
            sn_smartolt: null,
            sn_wisphub: String(wh.sn_onu || ''),
            smartolt_id: null,
            wisphub_id: wh.id_servicio ? Number(wh.id_servicio) : null,
          });
        }
      }

      // 5. Calcular resumen global
      const summary = {
        totalSmartOlt: oltRows.length,
        totalWisphub: whRows.length,
        mismatches: matchedItems.filter(i => i.ip_status === 'MISMATCH').length,
        matches: matchedItems.filter(i => i.ip_status === 'MATCH').length,
        onlySmartOlt: matchedItems.filter(i => i.ip_status === 'ONLY_SMARTOLT').length,
        onlyWisphub: matchedItems.filter(i => i.ip_status === 'ONLY_WISPHUB').length,
        noIp: matchedItems.filter(i => i.ip_status === 'NO_IP').length,
        missingTr069: matchedItems.filter(i => i.smartolt_id && i.tr069_status !== 'ACTIVE').length,
        missingIpv6: matchedItems.filter(i => i.smartolt_id && i.ipv6_status !== 'DUAL_STACK').length,
      };

      // 6. Aplicar filtro
      let filtered = matchedItems;
      const f = String(filter || 'all').trim().toLowerCase();
      if (f === 'mismatches' || f === 'mismatch' || f === 'discrepancias' || f === 'discrepancia') {
        filtered = filtered.filter(i => i.ip_status === 'MISMATCH');
      } else if (f === 'matches' || f === 'match' || f === 'correctos' || f === 'correcto' || f === 'coinciden' || f === 'coincide') {
        filtered = filtered.filter(i => i.ip_status === 'MATCH');
      } else if (f === 'only_olt' || f === 'only_smartolt' || f === 'smartolt' || f === 'solo_smartolt') {
        filtered = filtered.filter(i => i.ip_status === 'ONLY_SMARTOLT');
      } else if (f === 'only_wisphub' || f === 'wisphub' || f === 'solo_wisphub') {
        filtered = filtered.filter(i => i.ip_status === 'ONLY_WISPHUB');
      } else if (f === 'no_ip' || f === 'sin_ip') {
        filtered = filtered.filter(i => i.ip_status === 'NO_IP');
      } else if (f === 'missing_tr069' || f === 'falta_tr069' || f === 'sin_tr069') {
        filtered = filtered.filter(i => i.smartolt_id && i.tr069_status !== 'ACTIVE');
      } else if (f === 'missing_ipv6' || f === 'falta_ipv6' || f === 'sin_ipv6') {
        filtered = filtered.filter(i => i.smartolt_id && i.ipv6_status !== 'DUAL_STACK');
      } else if (f === 'pending' || f === 'pendientes' || f === 'pendientes_tr069_ipv6') {
        filtered = filtered.filter(i => i.smartolt_id && (i.tr069_status !== 'ACTIVE' || i.ipv6_status !== 'DUAL_STACK'));
      } else if (f === 'ready' || f === 'completados' || f === 'listos' || f === 'provisioned') {
        filtered = filtered.filter(i => i.smartolt_id && i.tr069_status === 'ACTIVE' && i.ipv6_status === 'DUAL_STACK');
      }

      // 7. Aplicar búsqueda por texto si existe
      if (search) {
        filtered = filtered.filter(i =>
          (i.cliente && String(i.cliente).toLowerCase().includes(search)) ||
          (i.folio && String(i.folio).toLowerCase().includes(search)) ||
          (i.servicio && String(i.servicio).toLowerCase().includes(search)) ||
          (i.smartolt_ip && String(i.smartolt_ip).toLowerCase().includes(search)) ||
          (i.wisphub_ip && String(i.wisphub_ip).toLowerCase().includes(search)) ||
          (i.zona_o_router && String(i.zona_o_router).toLowerCase().includes(search)) ||
          (i.sn_smartolt && String(i.sn_smartolt).toLowerCase().includes(search)) ||
          (i.sn_wisphub && String(i.sn_wisphub).toLowerCase().includes(search)) ||
          (i.wisphub_plan && String(i.wisphub_plan).toLowerCase().includes(search))
        );
      }

      // Priorizar discrepancias al inicio cuando se muestra 'all'
      if (filter === 'all' && !search) {
        filtered.sort((a, b) => {
          const priority = (st: string) => st === 'MISMATCH' ? 0 : (st === 'MATCH' ? 1 : 2);
          return priority(a.ip_status) - priority(b.ip_status);
        });
      }

      const totalCount = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      return {
        summary,
        items: paginated,
        total: totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      };
    } catch (error: any) {
      logger.error('Error al realizar cruce de IPs SmartOLT vs WispHub:', error?.message || error);
      return {
        summary: { totalSmartOlt: 0, totalWisphub: 0, mismatches: 0, matches: 0, onlySmartOlt: 0, onlyWisphub: 0, noIp: 0, missingTr069: 0, missingIpv6: 0 },
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };
    }
  }

  /**
   * Crea un nuevo ticket de soporte en Turso DB para ajustes manuales en SmartOLT
   */
  static async createTicket(ticket: {
    folio?: string;
    phone: string;
    client_name?: string | null;
    onu_id?: string | null;
    issue_summary: string;
    checks_performed?: string | null;
    has_photo?: number;
    has_speedtest?: number;
    all_devices?: number;
    status?: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';
    is_out_of_hours?: number;
    notes?: string | null;
  }): Promise<TicketRecord> {
    const now = new Date().toISOString();
    const folio = ticket.folio || `TK-${Date.now().toString().slice(-6)}`;
    const status = ticket.status || 'ABIERTO';
    const isOutOfHours = ticket.is_out_of_hours ?? 0;

    try {
      const client = getTursoClient();
      await client.execute({
        sql: `
          INSERT INTO tickets (
            folio, phone, client_name, onu_id, issue_summary, checks_performed,
            has_photo, has_speedtest, all_devices, status, is_out_of_hours, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          folio,
          ticket.phone,
          ticket.client_name || null,
          ticket.onu_id || null,
          ticket.issue_summary,
          ticket.checks_performed || null,
          ticket.has_photo ? 1 : 0,
          ticket.has_speedtest ? 1 : 0,
          ticket.all_devices ? 1 : 0,
          status,
          isOutOfHours,
          ticket.notes || null,
          now,
          now,
        ],
      });

      logger.info(`Ticket ${folio} creado exitosamente en Turso para ${ticket.phone}`);
      return {
        folio,
        phone: ticket.phone,
        client_name: ticket.client_name,
        onu_id: ticket.onu_id,
        issue_summary: ticket.issue_summary,
        checks_performed: ticket.checks_performed,
        has_photo: ticket.has_photo ? 1 : 0,
        has_speedtest: ticket.has_speedtest ? 1 : 0,
        all_devices: ticket.all_devices ? 1 : 0,
        status,
        is_out_of_hours: isOutOfHours,
        notes: ticket.notes,
        created_at: now,
        updated_at: now,
      };
    } catch (error: any) {
      logger.error('Error al crear ticket en Turso:', error?.message || error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de tickets para el panel administrativo
   */
  static async getTickets(status?: string, limit: number = 60): Promise<TicketRecord[]> {
    try {
      const client = getTursoClient();
      let sql = `SELECT * FROM tickets`;
      const args: any[] = [];

      if (status && status !== 'TODOS') {
        sql += ` WHERE status = ?`;
        args.push(status.toUpperCase());
      }

      sql += ` ORDER BY id DESC LIMIT ?`;
      args.push(limit);

      const res = await client.execute({ sql, args });
      return res.rows.map((r: any) => ({
        id: Number(r.id),
        folio: String(r.folio),
        phone: String(r.phone),
        client_name: r.client_name ? String(r.client_name) : null,
        onu_id: r.onu_id ? String(r.onu_id) : null,
        issue_summary: String(r.issue_summary || ''),
        checks_performed: r.checks_performed ? String(r.checks_performed) : null,
        has_photo: Number(r.has_photo || 0),
        has_speedtest: Number(r.has_speedtest || 0),
        all_devices: Number(r.all_devices || 0),
        status: (r.status || 'ABIERTO') as any,
        is_out_of_hours: Number(r.is_out_of_hours || 0),
        notes: r.notes ? String(r.notes) : null,
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
        resolved_at: r.resolved_at ? String(r.resolved_at) : null,
      }));
    } catch (error: any) {
      logger.error('Error al obtener tickets en Turso:', error?.message || error);
      return [];
    }
  }

  /**
   * Actualiza el estatus y notas de un ticket
   */
  static async updateTicketStatus(folio: string, status: string, notes?: string): Promise<boolean> {
    const now = new Date().toISOString();
    const resolvedAt = ['RESUELTO', 'CERRADO'].includes(status.toUpperCase()) ? now : null;

    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `
          UPDATE tickets SET
            status = ?,
            notes = COALESCE(?, notes),
            resolution_notes = COALESCE(?, resolution_notes),
            updated_at = ?,
            resolved_at = COALESCE(?, resolved_at)
          WHERE folio = ?
        `,
        args: [status.toUpperCase(), notes || null, notes || null, now, resolvedAt, folio],
      });

      return res.rowsAffected > 0;
    } catch (error: any) {
      logger.error(`Error al actualizar ticket ${folio}:`, error?.message || error);
      return false;
    }
  }

  /**
   * Obtiene métricas resumidas de tickets para el dashboard
   */
  static async getTicketStats(): Promise<{ total: number; abiertos: number; enProceso: number; resueltos: number; fueraHorario: number }> {
    try {
      const client = getTursoClient();
      const res = await client.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ABIERTO' THEN 1 ELSE 0 END) as abiertos,
          SUM(CASE WHEN status = 'EN_PROCESO' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN status = 'RESUELTO' THEN 1 ELSE 0 END) as resueltos,
          SUM(CASE WHEN is_out_of_hours = 1 AND status != 'RESUELTO' THEN 1 ELSE 0 END) as fuera_horario
        FROM tickets
      `);
      const row = res.rows[0];
      return {
        total: Number(row?.total || 0),
        abiertos: Number(row?.abiertos || 0),
        enProceso: Number(row?.en_proceso || 0),
        resueltos: Number(row?.resueltos || 0),
        fueraHorario: Number(row?.fuera_horario || 0),
      };
    } catch (error: any) {
      logger.error('Error al obtener estadísticas de tickets:', error?.message || error);
      return { total: 0, abiertos: 0, enProceso: 0, resueltos: 0, fueraHorario: 0 };
    }
  }

  /**
   * Elimina todas las sesiones activas en Turso (Modo Pruebas)
   */
  static async clearAllSessions(): Promise<number> {
    const client = getTursoClient();
    const res = await client.execute('DELETE FROM sessions');
    logger.info('Todas las sesiones han sido eliminadas de Turso DB.');
    return res.rowsAffected || 0;
  }

  /**
   * Elimina la sesión de un teléfono específico
   */
  static async deleteSession(phone: string): Promise<boolean> {
    const client = getTursoClient();
    const cleanPhone = phone.replace(/\D/g, '');
    await client.execute({ sql: 'DELETE FROM sessions WHERE phone = ? OR phone = ?', args: [phone, cleanPhone] });
    logger.info(`Sesión del teléfono ${phone} eliminada.`);
    return true;
  }

  /**
   * Elimina completamente la conversación (sesión y mensajes) de un teléfono específico
   */
  static async deleteChatAndLogs(phone: string): Promise<boolean> {
    const client = getTursoClient();
    const cleanPhone = phone.replace(/\D/g, '');
    await client.execute({ sql: 'DELETE FROM sessions WHERE phone = ? OR phone = ?', args: [phone, cleanPhone] });
    await client.execute({ sql: 'DELETE FROM conversation_logs WHERE phone = ? OR phone = ?', args: [phone, cleanPhone] });
    logger.info(`Sesión e historial de chat eliminados para ${phone}`);
    return true;
  }

  /**
   * Elimina todo el historial de conversaciones de Turso (Modo Pruebas)
   */
  static async clearAllLogs(): Promise<number> {
    const client = getTursoClient();
    const res = await client.execute('DELETE FROM conversation_logs');
    logger.info('Todo el historial de conversaciones ha sido eliminado de Turso DB.');
    return res.rowsAffected || 0;
  }

  /**
   * Elimina todos los tickets registrados en Turso (Modo Pruebas)
   */
  static async clearAllTickets(): Promise<number> {
    const client = getTursoClient();
    const res = await client.execute('DELETE FROM tickets');
    logger.info('Todos los tickets han sido eliminados de Turso DB.');
    return res.rowsAffected || 0;
  }

  /**
   * Elimina un ticket individual por folio
   */
  static async deleteTicket(folio: string): Promise<boolean> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'DELETE FROM tickets WHERE folio = ?',
        args: [folio],
      });
      logger.info(`Ticket ${folio} eliminado de Turso DB.`);
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al eliminar ticket ${folio}:`, error?.message || error);
      return false;
    }
  }


  // ==========================================
  // GESTIÓN DE TÉCNICOS AUTORIZADOS Y PINS
  // ==========================================

  /**
   * Obtiene la lista completa de técnicos registrados
   */
  static async getTechnicians(): Promise<TechnicianRecord[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute('SELECT * FROM technicians ORDER BY name ASC');
      return res.rows.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name || ''),
        phone: String(r.phone || ''),
        pin: String(r.pin || ''),
        is_active: Number(r.is_active || 1),
        role: String(r.role || 'TECNICO'),
        notes: r.notes ? String(r.notes) : null,
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
      }));
    } catch (error: any) {
      logger.error('Error al obtener lista de técnicos:', error?.message || error);
      return [];
    }
  }

  /**
   * Obtiene un técnico por ID
   */
  static async getTechnicianById(id: number): Promise<TechnicianRecord | null> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'SELECT * FROM technicians WHERE id = ? LIMIT 1',
        args: [id],
      });
      if (res.rows.length === 0) return null;
      const r: any = res.rows[0];
      return {
        id: Number(r.id),
        name: String(r.name || ''),
        phone: String(r.phone || ''),
        pin: String(r.pin || ''),
        is_active: Number(r.is_active || 1),
        role: String(r.role || 'TECNICO'),
        notes: r.notes ? String(r.notes) : null,
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
      };
    } catch (error: any) {
      logger.error(`Error al obtener técnico por id ${id}:`, error?.message || error);
      return null;
    }
  }

  /**
   * Registra un nuevo técnico con su PIN de 5 dígitos
   */
  static async createTechnician(data: {
    name: string;
    phone: string;
    pin: string;
    role?: string;
    notes?: string;
    is_active?: number;
  }): Promise<TechnicianRecord> {
    const client = getTursoClient();
    const now = new Date().toISOString();
    const cleanPhone = data.phone.replace(/\D/g, '');
    const cleanPin = (data.pin || '').replace(/\D/g, '').slice(0, 5);

    if (cleanPin.length !== 5) {
      throw new Error('El PIN debe tener exactamente 5 dígitos numéricos.');
    }
    if (!data.name.trim()) {
      throw new Error('El nombre del técnico es obligatorio.');
    }
    if (cleanPhone.length < 10) {
      throw new Error('El número de teléfono debe tener al menos 10 dígitos.');
    }

    const res = await client.execute({
      sql: `
        INSERT INTO technicians (name, phone, pin, is_active, role, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        data.name.trim(),
        cleanPhone,
        cleanPin,
        data.is_active ?? 1,
        data.role || 'TECNICO',
        data.notes || '',
        now,
        now,
      ],
    });

    logger.info(`Técnico registrado exitosamente: ${data.name} (${cleanPhone})`);
    return {
      id: Number(res.lastInsertRowid || 0),
      name: data.name.trim(),
      phone: cleanPhone,
      pin: cleanPin,
      is_active: data.is_active ?? 1,
      role: data.role || 'TECNICO',
      notes: data.notes || '',
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Actualiza los datos de un técnico existente
   */
  static async updateTechnician(
    id: number,
    data: {
      name?: string;
      phone?: string;
      pin?: string;
      role?: string;
      notes?: string;
      is_active?: number;
    }
  ): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();

      const sets: string[] = ['updated_at = ?'];
      const args: any[] = [now];

      if (data.name !== undefined) {
        sets.push('name = ?');
        args.push(data.name.trim());
      }
      if (data.phone !== undefined) {
        sets.push('phone = ?');
        args.push(data.phone.replace(/\D/g, ''));
      }
      if (data.pin !== undefined) {
        const cleanPin = data.pin.replace(/\D/g, '').slice(0, 5);
        if (cleanPin.length !== 5) throw new Error('El PIN debe tener exactamente 5 dígitos.');
        sets.push('pin = ?');
        args.push(cleanPin);
      }
      if (data.role !== undefined) {
        sets.push('role = ?');
        args.push(data.role);
      }
      if (data.notes !== undefined) {
        sets.push('notes = ?');
        args.push(data.notes);
      }
      if (data.is_active !== undefined) {
        sets.push('is_active = ?');
        args.push(data.is_active);
      }

      args.push(id);

      const res = await client.execute({
        sql: `UPDATE technicians SET ${sets.join(', ')} WHERE id = ?`,
        args,
      });

      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al actualizar técnico ${id}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Elimina un técnico por ID
   */
  static async deleteTechnician(id: number): Promise<boolean> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'DELETE FROM technicians WHERE id = ?',
        args: [id],
      });
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al eliminar técnico ${id}:`, error?.message || error);
      return false;
    }
  }

  /**
   * Alterna el estado activo/inactivo de un técnico
   */
  static async toggleTechnicianActive(id: number): Promise<{ success: boolean; is_active: number }> {
    try {
      const client = getTursoClient();
      await client.execute({
        sql: `UPDATE technicians SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`,
        args: [new Date().toISOString(), id],
      });
      const check = await client.execute({ sql: 'SELECT is_active FROM technicians WHERE id = ?', args: [id] });
      const current = check.rows.length > 0 ? Number(check.rows[0].is_active) : 0;
      return { success: check.rows.length > 0, is_active: current };
    } catch (error: any) {
      logger.error(`Error al cambiar estado de técnico ${id}:`, error?.message || error);
      return { success: false, is_active: 0 };
    }
  }

  /**
   * Verifica si un número o PIN pertenece a un técnico activo y autorizado
   */
  static async isAuthorizedTechnician(phone: string, pin?: string): Promise<TechnicianRecord | null> {
    try {
      const client = getTursoClient();
      const cleanPhone = (phone || '').replace(/\D/g, '');
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      // 1. Si enviaron PIN, buscar por PIN y verificar que esté activo
      if (pin) {
        const cleanPin = pin.replace(/\D/g, '');
        if (cleanPin.length >= 4 && cleanPin.length <= 8) {
          const pinRes = await client.execute({
            sql: 'SELECT * FROM technicians WHERE pin = ? AND is_active = 1 LIMIT 1',
            args: [cleanPin],
          });
          if (pinRes.rows.length > 0) {
            const r: any = pinRes.rows[0];
            return {
              id: Number(r.id),
              name: String(r.name || ''),
              phone: String(r.phone || ''),
              pin: String(r.pin || ''),
              is_active: Number(r.is_active || 1),
              role: String(r.role || 'TECNICO'),
              notes: r.notes ? String(r.notes) : null,
              created_at: String(r.created_at || ''),
              updated_at: String(r.updated_at || ''),
            };
          }
        }
      }

      // 2. Si no hay teléfono, retornar null
      if (!last10 && !cleanPhone) return null;

      // 3. Buscar entre técnicos activos comparando números limpios
      const phoneRes = await client.execute('SELECT * FROM technicians WHERE is_active = 1');

      for (const row of phoneRes.rows) {
        const r: any = row;
        const dbPhoneClean = String(r.phone || '').replace(/\D/g, '');
        const dbLast10 = dbPhoneClean.length >= 10 ? dbPhoneClean.slice(-10) : dbPhoneClean;
        if (
          dbPhoneClean === cleanPhone ||
          (last10 && dbLast10 && (last10 === dbLast10 || cleanPhone.endsWith(dbLast10) || dbPhoneClean.endsWith(last10)))
        ) {
          return {
            id: Number(r.id),
            name: String(r.name || ''),
            phone: String(r.phone || ''),
            pin: String(r.pin || ''),
            is_active: Number(r.is_active || 1),
            role: String(r.role || 'TECNICO'),
            notes: r.notes ? String(r.notes) : null,
            created_at: String(r.created_at || ''),
            updated_at: String(r.updated_at || ''),
          };
        }
      }

      return null;
    } catch (error: any) {
      logger.error(`Error al verificar autorización de técnico ${phone}:`, error?.message || error);
      return null;
    }
  }

  // ==========================================
  // GESTIÓN DE USUARIOS DEL PANEL (RBAC)
  // ==========================================

  static async getAdminUserByUsername(username: string): Promise<AdminUserRecord | null> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'SELECT * FROM admin_users WHERE username = ? AND is_active = 1 LIMIT 1',
        args: [username.toLowerCase().trim()],
      });
      if (res.rows.length === 0) return null;
      const r: any = res.rows[0];
      return {
        id: Number(r.id),
        username: String(r.username),
        password_hash: String(r.password_hash),
        name: String(r.name),
        role: r.role as any,
        is_active: Number(r.is_active || 1),
        created_at: String(r.created_at),
        last_login: r.last_login ? String(r.last_login) : null,
      };
    } catch (error: any) {
      logger.error(`Error al obtener admin user ${username}:`, error?.message || error);
      return null;
    }
  }

  static async getAdminUserById(id: number): Promise<AdminUserRecord | null> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'SELECT id, username, name, role, is_active, created_at, last_login FROM admin_users WHERE id = ? LIMIT 1',
        args: [id],
      });
      if (res.rows.length === 0) return null;
      const r: any = res.rows[0];
      return {
        id: Number(r.id),
        username: String(r.username),
        name: String(r.name),
        role: r.role as any,
        is_active: Number(r.is_active || 1),
        created_at: String(r.created_at),
        last_login: r.last_login ? String(r.last_login) : null,
      };
    } catch (error: any) {
      logger.error(`Error al obtener admin user #${id}:`, error?.message || error);
      return null;
    }
  }

  static async listAdminUsers(): Promise<Omit<AdminUserRecord, 'password_hash'>[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute('SELECT id, username, name, role, is_active, created_at, last_login FROM admin_users ORDER BY id ASC');
      return res.rows.map((r: any) => ({
        id: Number(r.id),
        username: String(r.username),
        name: String(r.name),
        role: r.role as any,
        is_active: Number(r.is_active || 1),
        created_at: String(r.created_at),
        last_login: r.last_login ? String(r.last_login) : null,
      }));
    } catch (error: any) {
      logger.error('Error al listar admin users:', error?.message || error);
      return [];
    }
  }

  static async createAdminUser(data: {
    username: string;
    password_hash: string;
    name: string;
    role: 'superadmin' | 'soporte' | 'tecnico' | 'facturacion';
  }): Promise<{ success: boolean; message: string }> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO admin_users (username, password_hash, name, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
        args: [data.username.toLowerCase().trim(), data.password_hash, data.name.trim(), data.role, now],
      });
      return { success: true, message: `Usuario @${data.username} creado exitosamente.` };
    } catch (error: any) {
      const msg = error?.message?.includes('UNIQUE') ? 'El nombre de usuario ya existe.' : (error?.message || 'Error al crear');
      return { success: false, message: msg };
    }
  }

  static async deleteAdminUser(id: number): Promise<boolean> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: 'DELETE FROM admin_users WHERE id = ?',
        args: [id],
      });
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al eliminar admin user #${id}:`, error?.message || error);
      return false;
    }
  }

  static async updateAdminLastLogin(id: number): Promise<void> {
    try {
      const client = getTursoClient();
      await client.execute({
        sql: 'UPDATE admin_users SET last_login = ? WHERE id = ?',
        args: [new Date().toISOString(), id],
      });
    } catch {}
  }

  // ==========================================
  // GESTIÓN ENRIQUECIDA DE TICKETS & KANBAN
  // ==========================================

  static async getAllTicketsDetailed(statusFilter?: string, limit: number = 200): Promise<any[]> {
    try {
      const client = getTursoClient();
      let query = `SELECT * FROM tickets`;
      const args: any[] = [];
      if (statusFilter && statusFilter !== 'ALL') {
        query += ` WHERE status = ?`;
        args.push(statusFilter);
      }
      query += ` ORDER BY id DESC LIMIT ?`;
      args.push(limit);

      const res = await client.execute({ sql: query, args });
      return res.rows;
    } catch (error: any) {
      logger.error('Error al obtener tickets detallados:', error?.message || error);
      return [];
    }
  }



  static async assignTicketTechnician(folio: string, technicianName: string): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      const res = await client.execute({
        sql: `UPDATE tickets SET assigned_technician_name = ?, status = 'VISITA_TECNICA', updated_at = ? WHERE folio = ?`,
        args: [technicianName, now, folio],
      });
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al asignar técnico al ticket ${folio}:`, error?.message || error);
      return false;
    }
  }

  // ==========================================
  // LIVE CHAT & CONVERSACIONES EN TIEMPO REAL
  // ==========================================

  static async getRecentChatConversations(limit: number = 50): Promise<ChatConversationItem[]> {
    try {
      const client = getTursoClient();
      const query = `
        SELECT 
          s.phone,
          s.client_name,
          s.onu_id,
          s.step,
          s.last_interaction,
          s.metadata,
          s.human_takeover_until,
          s.human_takeover_status,
          s.department,
          s.last_instance,
          (
            SELECT l.message 
            FROM conversation_logs l 
            WHERE l.phone = s.phone 
            ORDER BY l.id DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT l.direction 
            FROM conversation_logs l 
            WHERE l.phone = s.phone 
            ORDER BY l.id DESC 
            LIMIT 1
          ) as last_direction
        FROM sessions s
        ORDER BY s.last_interaction DESC
        LIMIT ?
      `;
      const res = await client.execute({ sql: query, args: [limit] });

      return res.rows.map((r: any) => {
        let meta: any = {};
        try { meta = JSON.parse(r.metadata || '{}'); } catch {}
        const untilIso = r.human_takeover_until ? String(r.human_takeover_until) : (meta.humanTakeoverUntil || null);
        const isPaused = Boolean(untilIso && new Date(untilIso).getTime() > Date.now());

        return {
          phone: String(r.phone),
          client_name: r.client_name ? String(r.client_name) : null,
          onu_id: r.onu_id ? String(r.onu_id) : null,
          step: String(r.step || 'CONVERSACIONAL'),
          last_interaction: String(r.last_interaction || ''),
          last_message: r.last_message ? String(r.last_message) : '[Sin mensajes previos]',
          last_direction: (r.last_direction || 'IN') as 'IN' | 'OUT',
          is_human_paused: isPaused,
          human_takeover_until: untilIso,
          human_takeover_status: r.human_takeover_status ? String(r.human_takeover_status) : (isPaused ? 'OPERATOR_ACTIVE' : 'BOT'),
          department: (r.department ? String(r.department) : 'ATENCION') as 'SOPORTE' | 'ATENCION',
          last_instance: r.last_instance ? String(r.last_instance) : null,
        };
      });
    } catch (error: any) {
      logger.error('Error al obtener conversaciones recientes:', error?.message || error);
      return [];
    }
  }

  static async getChatMessagesByPhone(phone: string, limit: number = 60): Promise<any[]> {
    try {
      const client = getTursoClient();
      const cleanPhone = phone.replace(/\D/g, '');
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      const res = await client.execute({
        sql: `
          SELECT * FROM conversation_logs 
          WHERE phone = ? OR phone LIKE ? 
          ORDER BY id ASC 
          LIMIT ?
        `,
        args: [phone, `%${last10}`, limit],
      });
      return res.rows;
    } catch (error: any) {
      logger.error(`Error al obtener mensajes para ${phone}:`, error?.message || error);
      return [];
    }
  }

  // ==========================================
  // CONTINGENCIA Y CAÍDAS MASIVAS DE RED (OUTAGES)
  // ==========================================

  static async createOutage(data: {
    zone_name: string;
    estimated_time?: string;
    notes?: string;
  }): Promise<{ id: number; zone_name: string; status: string }> {
    const client = getTursoClient();
    const zone = data.zone_name.trim();
    const estimated = (data.estimated_time || '').trim();
    const notes = (data.notes || '').trim();
    const now = new Date().toISOString();

    const res = await client.execute({
      sql: `INSERT INTO network_outages (zone_name, status, estimated_time, notes, created_at) VALUES (?, 'active', ?, ?, ?)`,
      args: [zone, estimated, notes, now],
    });

    const id = Number(res.lastInsertRowid || 0);
    logger.info(`[Outage] Nueva contingencia de red declarada para zona "${zone}" (ID: ${id})`);
    return { id, zone_name: zone, status: 'active' };
  }

  static async getActiveOutages(): Promise<NetworkOutage[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `SELECT * FROM network_outages WHERE status = 'active' ORDER BY id DESC`,
        args: [],
      });
      return res.rows as unknown as NetworkOutage[];
    } catch (error: any) {
      logger.error('Error al obtener contingencias activas:', error?.message || error);
      return [];
    }
  }

  static async getAllOutages(limit: number = 50): Promise<NetworkOutage[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `SELECT * FROM network_outages ORDER BY id DESC LIMIT ?`,
        args: [limit],
      });
      return res.rows as unknown as NetworkOutage[];
    } catch (error: any) {
      logger.error('Error al obtener historial de contingencias:', error?.message || error);
      return [];
    }
  }

  static async resolveOutage(id: number): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      const res = await client.execute({
        sql: `UPDATE network_outages SET status = 'resolved', resolved_at = ? WHERE id = ?`,
        args: [now, id],
      });
      logger.info(`[Outage] Contingencia ID ${id} marcada como normalizada/resuelta.`);
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al resolver contingencia ID ${id}:`, error?.message || error);
      return false;
    }
  }

  static async checkActiveOutageForZone(zoneName?: string | null): Promise<NetworkOutage | null> {
    try {
      const client = getTursoClient();
      // 1. Verificar si hay caída "General" / "Todas" activa
      const generalRes = await client.execute({
        sql: `SELECT * FROM network_outages WHERE status = 'active' AND (LOWER(zone_name) IN ('general', 'todas', 'todos', 'red general', 'global')) LIMIT 1`,
        args: [],
      });
      if (generalRes.rows.length > 0) {
        return generalRes.rows[0] as unknown as NetworkOutage;
      }

      if (!zoneName) return null;
      const cleanZone = zoneName.trim().toLowerCase();

      // 2. Verificar si coincide con la zona específica del cliente
      const zoneRes = await client.execute({
        sql: `SELECT * FROM network_outages WHERE status = 'active'`,
        args: [],
      });

      for (const row of zoneRes.rows) {
        const outZone = String(row.zone_name || '').toLowerCase();
        if (cleanZone.includes(outZone) || outZone.includes(cleanZone)) {
          return row as unknown as NetworkOutage;
        }
      }

      return null;
    } catch (error: any) {
      logger.error('Error al verificar caídas activas para zona:', error?.message || error);
      return null;
    }
  }

  static async getDistinctZones(): Promise<string[]> {
    try {
      const client = getTursoClient();
      const [onusZones, whDirecciones] = await Promise.all([
        client.execute(`SELECT DISTINCT zone_name FROM smartolt_onus WHERE zone_name IS NOT NULL AND zone_name != ''`),
        client.execute(`SELECT DISTINCT direccion FROM wisphub_clients WHERE direccion IS NOT NULL AND direccion != '' LIMIT 100`),
      ]);

      const set = new Set<string>();
      for (const r of onusZones.rows) {
        if (r.zone_name) set.add(String(r.zone_name).trim());
      }
      for (const r of whDirecciones.rows) {
        if (r.direccion) {
          const part = String(r.direccion).split(',')[0].trim();
          if (part && part.length >= 3 && part.length <= 40) set.add(part);
        }
      }

      return Array.from(set).sort();
    } catch (error: any) {
      logger.error('Error al obtener zonas únicas:', error?.message || error);
      return [];
    }
  }

  // ==========================================
  // INSTANCIAS DE WHATSAPP Y ÁREAS DINÁMICAS
  // ==========================================

  static async upsertWhatsAppInstance(data: {
    instance_name: string;
    area_name: string;
    phone_number?: string | null;
    description?: string | null;
    is_active?: number;
  }): Promise<void> {
    try {
      const client = getTursoClient();
      const instName = data.instance_name.trim();
      const area = (data.area_name || instName).trim();
      const phone = data.phone_number ? data.phone_number.trim() : null;
      const desc = data.description ? data.description.trim() : null;
      const active = data.is_active ?? 1;
      const now = new Date().toISOString();

      await client.execute({
        sql: `
          INSERT INTO whatsapp_instances (instance_name, area_name, phone_number, description, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(instance_name) DO UPDATE SET
            area_name = excluded.area_name,
            phone_number = COALESCE(excluded.phone_number, whatsapp_instances.phone_number),
            description = COALESCE(excluded.description, whatsapp_instances.description),
            is_active = excluded.is_active,
            updated_at = excluded.updated_at
        `,
        args: [instName, area, phone, desc, active, now, now],
      });
      logger.info(`Instancia de WhatsApp "${instName}" registrada para el área "${area}".`);
    } catch (error: any) {
      logger.error(`Error al registrar instancia de WhatsApp ${data.instance_name}:`, error?.message || error);
    }
  }

  static async getWhatsAppInstancesFromDb(): Promise<WhatsAppInstanceRecord[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute(`SELECT * FROM whatsapp_instances ORDER BY area_name ASC`);
      return res.rows.map((r: any) => ({
        instance_name: String(r.instance_name),
        area_name: String(r.area_name || r.instance_name),
        phone_number: r.phone_number ? String(r.phone_number) : null,
        description: r.description ? String(r.description) : null,
        is_active: Number(r.is_active ?? 1),
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
      }));
    } catch (error: any) {
      logger.error('Error al obtener instancias de WhatsApp de Turso:', error?.message || error);
      return [];
    }
  }

  static async getInstanceByArea(areaName: string): Promise<WhatsAppInstanceRecord | null> {
    try {
      const client = getTursoClient();
      const clean = areaName.trim();
      const res = await client.execute({
        sql: `SELECT * FROM whatsapp_instances WHERE LOWER(area_name) = LOWER(?) OR LOWER(instance_name) = LOWER(?) LIMIT 1`,
        args: [clean, clean],
      });
      if (res.rows.length === 0) return null;
      const r: any = res.rows[0];
      return {
        instance_name: String(r.instance_name),
        area_name: String(r.area_name || r.instance_name),
        phone_number: r.phone_number ? String(r.phone_number) : null,
        description: r.description ? String(r.description) : null,
        is_active: Number(r.is_active ?? 1),
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
      };
    } catch (error: any) {
      logger.error(`Error al buscar instancia para área ${areaName}:`, error?.message || error);
      return null;
    }
  }

  static async deleteWhatsAppInstanceRecord(instanceName: string): Promise<boolean> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `DELETE FROM whatsapp_instances WHERE instance_name = ?`,
        args: [instanceName.trim()],
      });
      return (res.rowsAffected || 0) > 0;
    } catch (error: any) {
      logger.error(`Error al eliminar registro de instancia ${instanceName}:`, error?.message || error);
      return false;
    }
  }

  static async getAllDistinctAreas(): Promise<Array<{ area_name: string; instance_name: string; phone_number: string | null }>> {
    try {
      const list = await this.getWhatsAppInstancesFromDb();
      if (list.length > 0) {
        return list.map(i => ({
          area_name: i.area_name,
          instance_name: i.instance_name,
          phone_number: i.phone_number ?? null,
        }));
      }
      return [
        { area_name: 'Soporte Técnico', instance_name: 'soporte', phone_number: null },
        { area_name: 'Atención al Cliente', instance_name: 'atencion', phone_number: null },
      ];
    } catch (error: any) {
      logger.error('Error al obtener áreas de WhatsApp:', error?.message || error);
      return [];
    }
  }

  // ==========================================
  // HISTORIAL Y GESTIÓN DE CAMBIOS DE MÓDEM (REEMPLAZO DE ONU)
  // ==========================================

  /**
   * Guarda un registro de cambio de módem en Turso DB
   */
  static async saveModemSwap(swap: ModemSwapRecord): Promise<number> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `
          INSERT INTO modem_swaps (
            client_name, old_sn, new_sn, old_onu_id, new_onu_id,
            ip_address, vlan, zone, speed_profile, old_data_json,
            technician_phone, technician_name, status, error_message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          swap.client_name,
          swap.old_sn,
          swap.new_sn,
          swap.old_onu_id || null,
          swap.new_onu_id || null,
          swap.ip_address || null,
          swap.vlan || null,
          swap.zone || null,
          swap.speed_profile || null,
          swap.old_data_json || null,
          swap.technician_phone || null,
          swap.technician_name || null,
          swap.status || 'COMPLETADO',
          swap.error_message || null,
          swap.created_at || new Date().toISOString(),
        ],
      });
      return Number(res.lastInsertRowid || 0);
    } catch (error: any) {
      logger.error('Error al guardar registro de cambio de módem en Turso:', error?.message || error);
      return 0;
    }
  }

  /**
   * Actualiza el estado o datos de un cambio de módem
   */
  static async updateModemSwap(id: number, data: Partial<ModemSwapRecord>): Promise<void> {
    try {
      const client = getTursoClient();
      const fields: string[] = [];
      const args: any[] = [];

      if (data.status !== undefined) { fields.push('status = ?'); args.push(data.status); }
      if (data.new_onu_id !== undefined) { fields.push('new_onu_id = ?'); args.push(data.new_onu_id); }
      if (data.error_message !== undefined) { fields.push('error_message = ?'); args.push(data.error_message); }

      if (fields.length === 0) return;
      args.push(id);

      await client.execute({
        sql: `UPDATE modem_swaps SET ${fields.join(', ')} WHERE id = ?`,
        args,
      });
    } catch (error: any) {
      logger.error(`Error al actualizar cambio de módem #${id}:`, error?.message || error);
    }
  }

  /**
   * Obtiene la lista de cambios de módem realizados
   */
  static async getModemSwaps(limit: number = 50): Promise<ModemSwapRecord[]> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `
          SELECT * FROM modem_swaps
          ORDER BY id DESC
          LIMIT ?
        `,
        args: [limit],
      });

      return res.rows.map(row => ({
        id: Number(row.id),
        client_name: String(row.client_name || ''),
        old_sn: String(row.old_sn || ''),
        new_sn: String(row.new_sn || ''),
        old_onu_id: row.old_onu_id ? String(row.old_onu_id) : null,
        new_onu_id: row.new_onu_id ? String(row.new_onu_id) : null,
        ip_address: row.ip_address ? String(row.ip_address) : null,
        vlan: row.vlan ? String(row.vlan) : null,
        zone: row.zone ? String(row.zone) : null,
        speed_profile: row.speed_profile ? String(row.speed_profile) : null,
        old_data_json: row.old_data_json ? String(row.old_data_json) : null,
        technician_phone: row.technician_phone ? String(row.technician_phone) : null,
        technician_name: row.technician_name ? String(row.technician_name) : null,
        status: (row.status as any) || 'COMPLETADO',
        error_message: row.error_message ? String(row.error_message) : null,
        created_at: String(row.created_at || ''),
      }));
    } catch (error: any) {
      logger.error('Error al obtener lista de cambios de módem:', error?.message || error);
      return [];
    }
  }

  /**
   * Elimina una ONU de la caché local de SmartOLT (por ej. cuando se reemplaza o borra)
   */
  static async deleteOnuFromSmartOltCache(uniqueExternalId: string): Promise<void> {
    try {
      const client = getTursoClient();
      await client.execute({
        sql: `DELETE FROM smartolt_onus WHERE unique_external_id = ? OR sn = ?`,
        args: [uniqueExternalId, uniqueExternalId],
      });
      logger.info(`ONU ${uniqueExternalId} eliminada de la caché local smartolt_onus.`);
    } catch (error: any) {
      logger.error(`Error al eliminar ONU ${uniqueExternalId} de la caché:`, error?.message || error);
    }
  }

  /**
   * Actualiza las referencias de ONU en sesiones activas y WispHub tras un cambio de módem
   */
  static async updateClientOnuReferences(oldSn: string, newSn: string, newOnuId: string): Promise<void> {
    try {
      const client = getTursoClient();
      // Actualizar sesiones que tengan el onu_id anterior
      await client.execute({
        sql: `UPDATE sessions SET onu_id = ?, service_id = ? WHERE onu_id = ? OR service_id = ?`,
        args: [newOnuId, newSn, oldSn, oldSn],
      });

      // Actualizar wisphub_clients si coincide el sn_onu anterior
      await client.execute({
        sql: `UPDATE wisphub_clients SET sn_onu = ?, updated_at = ? WHERE sn_onu = ?`,
        args: [newSn, new Date().toISOString(), oldSn],
      });

      logger.info(`Referencias de cliente actualizadas de SN ${oldSn} a ${newSn} (${newOnuId})`);
    } catch (error: any) {
      logger.error(`Error al actualizar referencias de cliente (${oldSn} -> ${newSn}):`, error?.message || error);
    }
  }
}

export interface ModemSwapRecord {
  id?: number;
  client_name: string;
  old_sn: string;
  new_sn: string;
  old_onu_id?: string | null;
  new_onu_id?: string | null;
  ip_address?: string | null;
  vlan?: string | null;
  zone?: string | null;
  speed_profile?: string | null;
  old_data_json?: string | null;
  technician_phone?: string | null;
  technician_name?: string | null;
  status?: 'COMPLETADO' | 'ERROR' | 'EN_PROCESO';
  error_message?: string | null;
  created_at?: string;
}

export interface NetworkOutage {
  id: number;
  zone_name: string;
  status: 'active' | 'resolved';
  estimated_time?: string | null;
  notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface AdminUserRecord {
  id: number;
  username: string;
  password_hash?: string;
  name: string;
  role: 'superadmin' | 'soporte' | 'tecnico' | 'facturacion' | 'atencion';
  is_active: number;
  created_at: string;
  last_login: string | null;
}

export interface ChatConversationItem {
  phone: string;
  client_name: string | null;
  onu_id: string | null;
  step: string;
  last_interaction: string;
  last_message: string;
  last_direction: 'IN' | 'OUT';
  is_human_paused: boolean;
  human_takeover_until?: string | null;
  human_takeover_status?: string | null;
  department?: string;
  last_instance?: string | null;
  unread_count?: number;
}

export interface WhatsAppInstanceRecord {
  instance_name: string;
  area_name: string;
  phone_number?: string | null;
  description?: string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}
