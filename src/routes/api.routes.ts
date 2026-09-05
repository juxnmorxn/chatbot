import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { config } from '../config/env';

const router = Router();

// Bienvenida / Raíz
router.get('/', (_req, res) => {
  res.json({
    app: 'Chatbot WhatsApp ISP Backend',
    isp: config.isp.name,
    status: 'online',
    healthCheck: '/api/health',
    webhook: '/webhook',
  });
});

// Healthchecks para cron-job.org / Render
router.get('/api/health', HealthController.check);
router.get('/health', HealthController.check);

// Webhooks de Evolution API
router.post('/webhook', WebhookController.handleWebhook);
router.post('/api/webhook', WebhookController.handleWebhook);

export default router;
