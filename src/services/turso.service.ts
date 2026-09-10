import { getTursoClient } from '../database/turso';
import { Logger } from '../utils/logger';

const logger = new Logger('TursoService');

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
}
