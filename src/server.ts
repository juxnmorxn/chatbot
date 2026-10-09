import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDatabase } from './database/db';
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
    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`====================================================`);
      logger.info(`🚀 Servidor ejecutándose en el puerto: ${config.port}`);
      logger.info(`🖥️ Panel Administrativo Web en: http://localhost:${config.port}/admin`);
      logger.info(`🌐 Healthcheck disponible en:   http://localhost:${config.port}/api/health`);
      logger.info(`📩 Webhook Evolution API en:    http://localhost:${config.port}/webhook`);
      logger.info(`☁️ Entorno: ${config.nodeEnv}`);
      logger.info(`====================================================`);
    });

    // 2. Inicializar Base de Datos Local libSQL
    await initDatabase().catch((err) => {
      logger.error('Error al inicializar base de datos Base de Datos Local:', err?.message || err);
    });

    // 3. Inicializar caché de configuración dinámica
    await SettingsService.init().catch((err) => {
      logger.error('Error al inicializar SettingsService:', err?.message || err);
    });

    // 4. Sincronizar mapeos WhatsApp LID <-> Teléfono y re-habilitar Webhook en Evolution API
    const { WebhookController } = await import('./controllers/webhook.controller');
    const { EvolutionService } = await import('./services/evolution.service');
    WebhookController.syncLidMappings().catch((err) => {
      logger.warn('Aviso: syncLidMappings falló en segundo plano:', err?.message || err);
    });
    EvolutionService.verifyAndEnableWebhook().catch((err) => {
      logger.warn('Aviso: verifyAndEnableWebhook falló en segundo plano:', err?.message || err);
    });

    // Sincronización en segundo plano de SmartOLT hacia Base de Datos Local (Cada 60 minutos = 1 llamada/hora de las 15 permitidas)
    const { SmartOLTService } = await import('./services/smartolt.service');
    const { WispHubService } = await import('./services/wisphub.service');
    const { DbService } = await import('./services/db.service');

    // Verificación inicial 10 segundos después del arranque
    setTimeout(async () => {
      try {
        const stats = await DbService.getSmartOltSyncStats();
        if (stats.count === 0) {
          logger.info('Inventario de SmartOLT vacío en Base de Datos Local. Intentando sincronización inicial...');
          await SmartOLTService.syncAllOnusToLocalDb(false);
        } else {
          logger.info(`Inventario SmartOLT listo en Base de Datos Local: ${stats.count} ONUs (Última sync: ${stats.lastSync || 'Previa'})`);
        }

        // Verificación e importación inicial de WispHub
        const whStats = await DbService.getWisphubSyncStats();
        if (whStats.count === 0) {
          logger.info('Tabla wisphub_clients vacía en Base de Datos Local. Iniciando sincronización inicial de WispHub...');
          await WispHubService.syncAllClientesToLocalDb();
        } else {
          logger.info(`Clientes WispHub listos en Base de Datos Local: ${whStats.count} clientes (Última sync: ${whStats.lastSync || 'Previa'})`);
        }

        // Reconciliación cruzada de datos SmartOLT <-> WispHub <-> GPS y normalización de SN
        await DbService.syncClientDataAndGps().catch((err) => {
          logger.warn('Aviso: syncClientDataAndGps inicial falló:', err?.message || err);
        });
      } catch (err: any) {
        logger.warn('No se pudo ejecutar sincronización inicial:', err?.message || err);
      }
    }, 10000);

    // Ciclo recurrente de reconciliación de SmartOLT cada 2 horas
    // Mantiene Base de Datos Local sincronizado, purga ONUs eliminadas en la OLT y libera IPs automáticamente
    setInterval(async () => {
      try {
        logger.info('Ejecutando ciclo de reconciliación de inventario SmartOLT (cada 2 horas)...');
        await SmartOLTService.syncAllOnusToLocalDb(false);
      } catch (err: any) {
        logger.warn('Error en reconciliación periódica de SmartOLT:', err?.message || err);
      }
    }, 2 * 60 * 60 * 1000);

    // Ciclo recurrente de WispHub cada 12 horas
    setInterval(async () => {
      try {
        logger.info('Ejecutando sincronización periódica de WispHub (cada 12 horas)...');
        await WispHubService.syncAllClientesToLocalDb();
      } catch (err: any) {
        logger.warn('Error en sincronización periódica de WispHub:', err?.message || err);
      }
    }, 12 * 60 * 60 * 1000);

    // Keepalive de salud del servidor
    const axios = (await import('axios')).default;
    setInterval(async () => {
      try {
        await axios.get(`http://localhost:${config.port}/api/health`, { timeout: 5000 });
        const appUrl = SettingsService.get('APP_URL', 'APP_URL', config.appUrl);
        if (appUrl && appUrl.startsWith('http') && !appUrl.includes('localhost')) {
          await axios.get(`${appUrl.replace(/\/$/, '')}/api/health`, { timeout: 8000 }).catch(() => { });
        }
      } catch { }
    }, 4 * 60 * 1000);
  } catch (error: any) {
    logger.error('Error crítico al iniciar el servidor:', error?.message || error);
    process.exit(1);
  }
}

startServer();
