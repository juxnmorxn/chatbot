import { getTursoClient } from '../database/turso';
import { Logger } from '../utils/logger';
import { normalizeText, computeNameMatchScore } from '../utils/fuzzy-matcher';

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
  raw_data?: string;
  updated_at?: string;
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
    };

    try {
      const client = getTursoClient();
      await client.execute({
        sql: `
          INSERT INTO sessions (phone, step, client_id, service_id, client_name, onu_id, opt_out, last_interaction, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            step = excluded.step,
            client_id = COALESCE(excluded.client_id, sessions.client_id),
            service_id = COALESCE(excluded.service_id, sessions.service_id),
            client_name = COALESCE(excluded.client_name, sessions.client_name),
            onu_id = COALESCE(excluded.onu_id, sessions.onu_id),
            opt_out = excluded.opt_out,
            last_interaction = excluded.last_interaction,
            metadata = COALESCE(excluded.metadata, sessions.metadata)
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
          merged.metadata,
        ],
      });

      return merged;
    } catch (error: any) {
      logger.error(`Error al guardar sesión para ${data.phone}:`, error?.message || error);
      return merged;
    }
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
   * Registra un mensaje entrante o saliente con su intención y acción tomada
   */
  static async logMessage(
    phone: string,
    direction: 'IN' | 'OUT',
    message: string,
    intent: string | null = null,
    actionTaken: string | null = null
  ): Promise<void> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO conversation_logs (phone, direction, message, intent, action_taken, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [phone, direction, message, intent, actionTaken, now],
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
                zone_name, speed_profile, olt_name, raw_data, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(unique_external_id) DO UPDATE SET
                sn = excluded.sn,
                name = excluded.name,
                name_normalized = excluded.name_normalized,
                phone = excluded.phone,
                address = excluded.address,
                zone_name = excluded.zone_name,
                speed_profile = excluded.speed_profile,
                olt_name = excluded.olt_name,
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
   * Búsqueda flexible (Fuzzy Matching) de clientes / ONUs por nombre
   * Tolerante a errores ortográficos, mayúsculas/minúsculas y acentos.
   */
  static async searchOnusFuzzy(
    query: string,
    limit: number = 5
  ): Promise<Array<SmartOltOnuRecord & { matchScore: number }>> {
    const rawQuery = (query || '').trim();
    if (!rawQuery) return [];

    const normQuery = normalizeText(rawQuery);
    if (!normQuery) return [];

    try {
      const client = getTursoClient();

      // 1. Búsqueda directa por número de serie o teléfono si aplica
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
          matchScore: 100,
        }));
      }

      // 2. Extraer palabras clave de la consulta para filtrar candidatos en SQL
      const queryWords = normQuery.split(' ').filter(w => w.length > 2);
      let candidatesQuery = 'SELECT * FROM smartolt_onus';
      const args: any[] = [];

      if (queryWords.length > 0) {
        const likeClauses = queryWords.map(() => 'name_normalized LIKE ?');
        candidatesQuery += ` WHERE ${likeClauses.join(' OR ')} LIMIT 100`;
        queryWords.forEach(w => args.push(`%${w}%`));
      } else {
        candidatesQuery += ' LIMIT 100';
      }

      const candidatesResult = await client.execute({ sql: candidatesQuery, args });
      
      // Si la búsqueda con LIKE no encontró suficientes candidatos (ej. por error ortográfico en cada palabra),
      // tomamos una muestra más amplia para analizar con algoritmo fonético/Levenshtein
      let rowsToEvaluate = candidatesResult.rows;
      if (rowsToEvaluate.length === 0) {
        const sampleResult = await client.execute('SELECT * FROM smartolt_onus ORDER BY updated_at DESC LIMIT 200');
        rowsToEvaluate = sampleResult.rows;
      }

      // 3. Evaluar cada candidato con el algoritmo de scoring difuso
      const scored: Array<SmartOltOnuRecord & { matchScore: number }> = [];

      for (const row of rowsToEvaluate) {
        const candidateName = String(row.name || '');
        const score = computeNameMatchScore(rawQuery, candidateName);

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
  static async updateTicketStatus(folio: string, status: 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO', notes?: string): Promise<boolean> {
    const now = new Date().toISOString();
    const resolvedAt = status === 'RESUELTO' ? now : null;

    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `
          UPDATE tickets SET
            status = ?,
            notes = COALESCE(?, notes),
            updated_at = ?,
            resolved_at = CASE WHEN ? = 'RESUELTO' THEN ? ELSE resolved_at END
          WHERE folio = ?
        `,
        args: [status, notes || null, now, status, resolvedAt, folio],
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
    await client.execute({ sql: 'DELETE FROM sessions WHERE phone = ?', args: [phone] });
    logger.info(`Sesión del teléfono ${phone} eliminada.`);
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
}


