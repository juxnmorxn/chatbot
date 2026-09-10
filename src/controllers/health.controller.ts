import { Request, Response } from 'express';
import { getTursoClient } from '../database/turso';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('HealthController');

export class HealthController {
  /**
   * Endpoint de Keep-Alive para cron-job.org y monitores de disponibilidad.
   * Evita que Render congele el servicio en el plan Free.
   */
  static async check(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let dbStatus = 'unknown';

    try {
      const client = getTursoClient();
      await client.execute('SELECT 1 as ping');
      dbStatus = 'connected';
    } catch (error: any) {
      dbStatus = 'disconnected';
      logger.error('Healthcheck DB Ping Error:', error?.message || error);
    }

    const responseTimeMs = Date.now() - startTime;

    const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name);

    res.status(200).json({
      status: 'ok',
      service: 'isp-chatbot-backend',
      isp: ispName,
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      responseTimeMs,
      timestamp: new Date().toISOString(),
      cronjobFriendly: true,
    });
  }
}
