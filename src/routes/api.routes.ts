import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { AdminController } from '../controllers/admin.controller';
import { getAdminDashboardHtml } from '../views/admin.html';
import { config } from '../config/env';

const router = Router();

// Panel Web de Administración (UI)
router.get('/', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

router.get('/admin', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

router.get('/panel', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

// APIs Administrativas para Variables y Llaves en Turso DB
router.get('/api/settings', AdminController.getSettings);
router.post('/api/settings', AdminController.updateSettings);
router.post('/api/settings/generate-evolution-key', AdminController.generateEvolutionKey);
router.get('/api/sessions', AdminController.getSessions);
router.post('/api/test/:service', AdminController.testService);

// Healthchecks para cron-job.org / Render
router.get('/api/health', HealthController.check);
router.get('/health', HealthController.check);

// Webhooks de Evolution API
router.post('/webhook', WebhookController.handleWebhook);
router.post('/api/webhook', WebhookController.handleWebhook);

export default router;
