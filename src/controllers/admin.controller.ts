import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { TursoService } from '../services/turso.service';
import { getTursoClient } from '../database/turso';
import { GroqService } from '../services/groq.service';
import { WispHubService } from '../services/wisphub.service';
import { SmartOLTService } from '../services/smartolt.service';
import { BotOrchestrator } from '../orchestrator/bot.orchestrator';
import axios from 'axios';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

const logger = new Logger('AdminController');

export class AdminController {
  /**
   * Obtiene las variables configuradas
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await SettingsService.getAll();
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza las configuraciones en Turso DB
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ success: false, error: 'Objeto de settings requerido' });
        return;
      }

      await SettingsService.updateAll(settings);
      res.json({ success: true, message: 'Configuraciones guardadas exitosamente en Turso DB' });
    } catch (error: any) {
      logger.error('Error al actualizar settings:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Genera una súper clave maestra para Evolution API
   */
  static generateEvolutionKey(req: Request, res: Response): void {
    const masterKey = SettingsService.generateEvolutionMasterKey();
    res.json({ success: true, masterKey });
  }

  /**
   * Lista las sesiones activas de clientes desde Turso
   */
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const client = getTursoClient();
      const result = await client.execute('SELECT * FROM sessions ORDER BY last_interaction DESC LIMIT 50');
      res.json({ success: true, sessions: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el historial de mensajes, problemas y soluciones registrados en Turso
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 60;
      const phone = req.query.phone as string | undefined;
      const logs = await TursoService.getLogs(limit, phone);
      res.json({ success: true, logs });
    } catch (error: any) {
      logger.error('Error al obtener logs:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todas las sesiones registradas en Turso (Modo Pruebas)
   */
  static async clearAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllSessions();
      res.json({ success: true, message: `Se eliminaron ${count} sesiones de la base de datos.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina una sesión individual por teléfono
   */
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || '');
      await TursoService.deleteSession(phone);
      res.json({ success: true, message: `Sesión de ${phone} eliminada exitosamente.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todo el historial de conversaciones (Modo Pruebas)
   */
  static async clearAllLogs(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllLogs();
      res.json({ success: true, message: `Se vaciaron ${count} registros de historial.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todos los tickets registrados en Turso (Modo Pruebas)
   */
  static async clearAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllTickets();
      res.json({ success: true, message: `Se eliminaron ${count} tickets de prueba.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Busca clientes en SmartOLT / Turso para diagnóstico
   */
  static async searchClients(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q || '');
      const client = getTursoClient();
      const dbRows = await client.execute({
        sql: 'SELECT name, unique_external_id, sn, phone FROM smartolt_onus WHERE name LIKE ? LIMIT 20',
        args: [`%${q}%`]
      });
      const fuzzy = await TursoService.searchOnusFuzzy(q, 10);
      res.json({ success: true, query: q, rawCount: dbRows.rows.length, rawMatches: dbRows.rows, fuzzyMatches: fuzzy });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || e });
    }
  }

  /**
   * Prueba de conectividad con los servicios externos
   */
  static async testService(req: Request, res: Response): Promise<void> {
    const { service } = req.params;

    try {
      if (service === 'groq') {
        const testRes = await GroqService.clasificarMensaje('Hola, ¿cuánto debo de mi servicio de internet?');
        res.json({ success: true, message: 'Groq conectado correctamente', data: testRes });
        return;
      }

      if (service === 'wisphub') {
        const testRes = await WispHubService.buscarClientePorTelefono('0000000000');
        res.json({ success: true, message: 'WispHub API respondió correctamente', data: testRes });
        return;
      }

      if (service === 'smartolt') {
        const testRes = await SmartOLTService.obtenerEstadoONU('TEST-ONU');
        res.json({ success: true, message: 'SmartOLT API respondió correctamente', data: testRes });
        return;
      }

      if (service === 'turso') {
        const client = getTursoClient();
        await client.execute('SELECT 1');
        res.json({ success: true, message: 'Turso DB conectado y operando en la nube' });
        return;
      }

      res.status(400).json({ success: false, error: 'Servicio no reconocido' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el estado de conexión de WhatsApp y el QR actual
   */
  static async getWhatsAppStatus(req: Request, res: Response): Promise<void> {
    try {
      const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
      const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
      const instance = config.evolution.instanceName;

      let state = 'close';
      try {
        const stateRes = await axios.get(`${url}/instance/connectionState/${instance}`, {
          headers: { apikey: apiKey },
          timeout: 4000,
        });
        state = stateRes.data?.instance?.state || 'close';
      } catch (err: any) {
        logger.warn('No se pudo obtener estado de instancia:', err?.message || err);
      }

      let qr = null;
      if (state !== 'open') {
        try {
          const qrRes = await axios.get(`${url}/instance/connect/${instance}`, {
            headers: { apikey: apiKey },
            timeout: 5000,
          });
          qr = qrRes.data?.base64 || null;
        } catch (err: any) {
          logger.warn('No se pudo obtener QR:', err?.message || err);
        }
      }

      res.json({ success: true, state, qr });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Desconecta la sesión de WhatsApp para generar un QR nuevo limpio
   */
  static async disconnectWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
      const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
      const instance = config.evolution.instanceName;

      await axios.delete(`${url}/instance/logout/${instance}`, {
        headers: { apikey: apiKey },
        timeout: 6000,
      });

      res.json({ success: true, message: 'Sesión desvinculada exitosamente' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.response?.data || error?.message || error });
    }
  }

  /**
   * Dispara la sincronización de SmartOLT hacia Turso DB
   */
  static async syncSmartOlt(req: Request, res: Response): Promise<void> {
    try {
      const force = req.body?.force === true;
      const result = await SmartOLTService.syncAllOnusToTurso(force);
      res.json(result);
    } catch (error: any) {
      logger.error('Error en syncSmartOlt controller:', error?.message || error);
      res.status(500).json({ success: false, count: 0, message: error?.message || 'Error al sincronizar' });
    }
  }

  /**
   * Obtiene estadísticas de ONUs guardadas en Turso DB
   */
  static async getSmartOltStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await TursoService.getSmartOltSyncStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la lista de tickets de soporte
   */
  static async getTickets(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 60;
      const rawTickets = await TursoService.getTickets(status, limit);
      const tickets = rawTickets.map((t) => ({
        ...t,
        bot_paused: BotOrchestrator.estaBotPausado(t.phone),
      }));
      res.json({ success: true, tickets });
    } catch (error: any) {
      logger.error('Error al obtener tickets:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza el estatus y notas de un ticket
   */
  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const folio = String(req.params.folio || '');
      const { status, notes } = req.body;

      if (!status || !['ABIERTO', 'EN_PROCESO', 'RESUELTO'].includes(status)) {
        res.status(400).json({ success: false, error: 'Estatus inválido. Valores permitidos: ABIERTO, EN_PROCESO, RESUELTO' });
        return;
      }

      const ok = await TursoService.updateTicketStatus(folio, status, notes);
      if (ok) {
        res.json({ success: true, message: `Ticket ${folio} actualizado a ${status}` });
      } else {
        res.status(404).json({ success: false, error: 'Ticket no encontrado o no modificado' });
      }
    } catch (error: any) {
      logger.error('Error al actualizar ticket:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene métricas resumidas de tickets
   */
  static async getTicketStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await TursoService.getTicketStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      logger.error('Error al obtener stats de tickets:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Pausa o reactiva el bot para un teléfono específico (Human Takeover)
   */
  static async toggleBotPause(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || '');
      const { pause, minutes } = req.body;

      if (pause === false) {
        BotOrchestrator.reanudarBot(phone);
        res.json({ success: true, message: `Bot reactivado para ${phone}`, paused: false });
      } else {
        const mins = parseInt(minutes, 10) || 60;
        BotOrchestrator.activarPausaOperador(phone, mins, 'Pausado manualmente desde panel web');
        res.json({ success: true, message: `Bot silenciado para ${phone} por ${mins} minutos`, paused: true, minutes: mins });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }
}
