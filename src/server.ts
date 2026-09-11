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

// Arranque del servidor
async function startServer() {
  try {
    logger.info(`Iniciando Chatbot ISP para "${config.isp.name}"...`);

    // Inicializar Turso libSQL
    await initTursoDatabase();

    // Inicializar caché de configuración dinámica
    await SettingsService.init();

    // Sincronizar mapeos WhatsApp LID <-> Teléfono en memoria
    const { WebhookController } = await import('./controllers/webhook.controller');
    await WebhookController.syncLidMappings();

    // Levantar Express
    app.listen(config.port, () => {
      logger.info(`====================================================`);
      logger.info(`🚀 Servidor ejecutándose en el puerto: ${config.port}`);
      logger.info(`🖥️ Panel Administrativo Web en: http://localhost:${config.port}/admin`);
      logger.info(`🌐 Healthcheck disponible en:   http://localhost:${config.port}/api/health`);
      logger.info(`📩 Webhook Evolution API en:    http://localhost:${config.port}/webhook`);
      logger.info(`☁️ Entorno: ${config.nodeEnv}`);
      logger.info(`====================================================`);
    });
  } catch (error: any) {
    logger.error('Error crítico al iniciar el servidor:', error?.message || error);
    process.exit(1);
  }
}

startServer();
