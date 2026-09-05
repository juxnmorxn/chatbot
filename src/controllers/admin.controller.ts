import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { getTursoClient } from '../database/turso';
import { GroqService } from '../services/groq.service';
import { WispHubService } from '../services/wisphub.service';
import { SmartOLTService } from '../services/smartolt.service';
import { EvolutionService } from '../services/evolution.service';
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
}
