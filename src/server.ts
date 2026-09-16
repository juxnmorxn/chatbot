import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initTursoDatabase } from './database/turso';
import { SettingsService } from './services/settings.service';
import apiRoutes from './routes/api.routes';
import { Logger } from './utils/logger';

const logger = new Logger('Server');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
app.use('/', apiRoutes);

// Manejadores globales de errores para evitar que caídas de red o promesas no controladas detengan el servidor (Evita error 502 en Render)
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception capturada globalmente:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection capturada globalmente:', reason);
});

// Arranque del servidor
async function startServer() {
  try {
    logger.info(`Iniciando Chatbot ISP para "${config.isp.name}"...`);

    // 1. Levantar Express de inmediato para que Render / Webhook no den 502 por timeout de arranque
    app.listen(config.port, () => {
      logger.info(`====================================================`);
      logger.info(`🚀 Servidor ejecutándose en el puerto: ${config.port}`);
      logger.info(`🖥️ Panel Administrativo Web en: http://localhost:${config.port}/admin`);
      logger.info(`🌐 Healthcheck disponible en:   http://localhost:${config.port}/api/health`);
      logger.info(`📩 Webhook Evolution API en:    http://localhost:${config.port}/webhook`);
      logger.info(`☁️ Entorno: ${config.nodeEnv}`);
      logger.info(`====================================================`);
    });

    // 2. Inicializar Turso libSQL
    await initTursoDatabase().catch((err) => {
      logger.error('Error al inicializar base de datos Turso:', err?.message || err);
    });

    // 3. Inicializar caché de configuración dinámica
    await SettingsService.init().catch((err) => {
      logger.error('Error al inicializar SettingsService:', err?.message || err);
    });

    // 4. Sincronizar mapeos WhatsApp LID <-> Teléfono en segundo plano
    const { WebhookController } = await import('./controllers/webhook.controller');
    WebhookController.syncLidMappings().catch((err) => {
      logger.warn('Aviso: syncLidMappings falló en segundo plano:', err?.message || err);
    });

    // Sincronización en segundo plano de SmartOLT hacia Turso DB (Cada 60 minutos = 1 llamada/hora de las 15 permitidas)
    const { SmartOLTService } = await import('./services/smartolt.service');
    const { WispHubService } = await import('./services/wisphub.service');
    const { TursoService } = await import('./services/turso.service');
    
    // Verificación inicial 10 segundos después del arranque
    setTimeout(async () => {
      try {
        const stats = await TursoService.getSmartOltSyncStats();
        if (stats.count === 0) {
          logger.info('Inventario de SmartOLT vacío en Turso. Intentando sincronización inicial...');
          await SmartOLTService.syncAllOnusToTurso(false);
        } else {
          logger.info(`Inventario SmartOLT listo en Turso: ${stats.count} ONUs (Última sync: ${stats.lastSync || 'Previa'})`);
        }

        // Verificación e importación inicial de WispHub
        const whStats = await TursoService.getWisphubSyncStats();
        if (whStats.count === 0) {
          logger.info('Tabla wisphub_clients vacía en Turso. Iniciando sincronización inicial de WispHub...');
          await WispHubService.syncAllClientesToTurso();
        } else {
          logger.info(`Clientes WispHub listos en Turso: ${whStats.count} clientes (Última sync: ${whStats.lastSync || 'Previa'})`);
        }
      } catch (err: any) {
        logger.warn('No se pudo ejecutar sincronización inicial:', err?.message || err);
      }
    }, 10000);

    // Ciclo recurrente de SmartOLT cada 60 minutos
    setInterval(async () => {
      try {
        logger.info('Ejecutando sincronización horaria de inventario SmartOLT...');
        await SmartOLTService.syncAllOnusToTurso(false);
      } catch (err: any) {
        logger.warn('Error en sincronización horaria de SmartOLT:', err?.message || err);
      }
    }, 60 * 60 * 1000);

    // Ciclo recurrente de WispHub cada 10 minutos (100% Solo Lectura de API hacia Turso DB)
    setInterval(async () => {
      try {
        logger.info('Ejecutando sincronización periódica de WispHub (cada 10 min)...');
        await WispHubService.syncAllClientesToTurso();
      } catch (err: any) {
        logger.warn('Error en sincronización periódica de WispHub:', err?.message || err);
      }
    }, 10 * 60 * 1000);
  } catch (error: any) {
    logger.error('Error crítico al iniciar el servidor:', error?.message || error);
    process.exit(1);
  }
}

startServer();
