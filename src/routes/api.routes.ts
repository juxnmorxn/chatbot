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
router.get('/api/logs', AdminController.getLogs);
router.get('/api/whatsapp/status', AdminController.getWhatsAppStatus);
router.post('/api/whatsapp/disconnect', AdminController.disconnectWhatsApp);
router.post('/api/test/:service', AdminController.testService);
router.post('/api/smartolt/sync', AdminController.syncSmartOlt);
router.get('/api/smartolt/stats', AdminController.getSmartOltStats);
router.get('/api/smartolt/search', AdminController.searchClients);

// WispHub y Auditoría de Cruce de IPs (SmartOLT vs WispHub)
router.post('/api/wisphub/sync', AdminController.syncWisphub);
router.get('/api/wisphub/stats', AdminController.getWisphubStats);
router.get('/api/audit/ip-cross', AdminController.getAuditIpCross);

// IPAM y Gestión de Pools / VLANs / Activación de ONUs
router.get('/api/ipam/pools', AdminController.getIpamPools);
router.get('/api/ipam/available', AdminController.getIpamAvailable);
router.get('/api/smartolt/unconfigured', AdminController.getSmartOltUnconfigured);
router.post('/api/smartolt/authorize', AdminController.authorizeSmartOltOnu);

// Mesa de Tickets de Soporte
router.get('/api/tickets', AdminController.getTickets);
router.patch('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.post('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.get('/api/tickets/stats', AdminController.getTicketStats);
router.post('/api/sessions/:phone/toggle-pause', AdminController.toggleBotPause);

// Rutas de limpieza y reinicio de pruebas
router.delete('/api/sessions/clear-all', AdminController.clearAllSessions);
router.post('/api/sessions/clear-all', AdminController.clearAllSessions);
router.delete('/api/sessions/:phone', AdminController.deleteSession);
router.delete('/api/logs/clear-all', AdminController.clearAllLogs);
router.post('/api/logs/clear-all', AdminController.clearAllLogs);
router.delete('/api/tickets/clear-all', AdminController.clearAllTickets);
router.post('/api/tickets/clear-all', AdminController.clearAllTickets);

// Healthchecks para cron-job.org / Render
router.get('/api/health', HealthController.check);
router.get('/health', HealthController.check);

// Webhooks de Evolution API
router.post('/webhook', WebhookController.handleWebhook);
router.post('/api/webhook', WebhookController.handleWebhook);

export default router;
