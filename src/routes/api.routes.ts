import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { AdminController } from '../controllers/admin.controller';
import { getAdminDashboardHtml } from '../views/admin.html';
import { requireAdminAuth } from '../utils/auth';
import { config } from '../config/env';

const router = Router();

// Panel Web de Administración (UI SPA)
router.get('/', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

router.get('/admin', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

router.get('/panel', (_req, res) => {
  res.send(getAdminDashboardHtml());
});

// ==========================================
// AUTENTICACIÓN Y ROLES RBAC
// ==========================================
router.post('/api/admin/auth/login', AdminController.login);
router.post('/api/admin/auth/logout', AdminController.logout);
router.get('/api/admin/auth/me', requireAdminAuth(), AdminController.getMe);
router.get('/api/admin/users', requireAdminAuth(['superadmin']), AdminController.getAdminUsers);
router.post('/api/admin/users', requireAdminAuth(['superadmin']), AdminController.createAdminUser);
router.delete('/api/admin/users/:id', requireAdminAuth(['superadmin']), AdminController.deleteAdminUser);

// ==========================================
// SSE EN TIEMPO REAL (LIVE STREAM)
// ==========================================
router.get('/api/admin/live-stream', AdminController.liveStreamSSE);

// ==========================================
// LIVE CHAT & HUMAN TAKEOVER (WHATSAPP)
// ==========================================
router.get('/api/admin/chats', AdminController.getChatConversations);
router.get('/api/admin/chats/:phone/messages', AdminController.getChatMessages);
router.post('/api/admin/chats/send', AdminController.sendManualChatMessage);
router.post('/api/admin/chats/takeover', AdminController.toggleHumanTakeover);
router.post('/api/admin/chats/:phone/close', AdminController.closeChatCase);
router.post('/api/admin/chats/close', AdminController.closeChatCase);


// ==========================================
// APIS ADMINISTRATIVAS PARA VARIABLES Y CONFIGURACIÓN
// ==========================================
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

// ==========================================
// WISPHUB Y AUDITORÍA DE CRUCE DE IPS
// ==========================================
router.post('/api/wisphub/sync', AdminController.syncWisphub);
router.get('/api/wisphub/stats', AdminController.getWisphubStats);
router.get('/api/audit/ip-cross', AdminController.getAuditIpCross);

// ==========================================
// IPAM & GESTIÓN DE POOLS / VLANS / ONUS
// ==========================================
router.get('/api/ipam/pools', AdminController.getIpamPools);
router.get('/api/ipam/available', AdminController.getIpamAvailable);
router.get('/api/smartolt/unconfigured', AdminController.getSmartOltUnconfigured);
router.post('/api/smartolt/authorize', AdminController.authorizeSmartOltOnu);

// ==========================================
// GESTIÓN DE TÉCNICOS AUTORIZADOS Y PINS
// ==========================================
router.get('/api/technicians', AdminController.getTechnicians);
router.post('/api/technicians', AdminController.createTechnician);
router.put('/api/technicians/:id', AdminController.updateTechnician);
router.post('/api/technicians/:id/update', AdminController.updateTechnician);
router.delete('/api/technicians/:id', AdminController.deleteTechnician);
router.post('/api/technicians/:id/toggle', AdminController.toggleTechnician);

// ==========================================
// MESA DE TICKETS DE SOPORTE & KANBAN
// ==========================================
router.get('/api/tickets', AdminController.getTickets);
router.patch('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.post('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.post('/api/tickets/:folio/assign', AdminController.assignTicketTechnician);
router.get('/api/tickets/stats', AdminController.getTicketStats);
router.post('/api/sessions/:phone/toggle-pause', AdminController.toggleBotPause);

// ==========================================
// RUTAS DE LIMPIEZA Y REINICIO DE PRUEBAS
// ==========================================
router.delete('/api/sessions/clear-all', AdminController.clearAllSessions);
router.post('/api/sessions/clear-all', AdminController.clearAllSessions);
router.delete('/api/sessions/:phone', AdminController.deleteSession);
router.delete('/api/logs/clear-all', AdminController.clearAllLogs);
router.post('/api/logs/clear-all', AdminController.clearAllLogs);
router.delete('/api/tickets/clear-all', AdminController.clearAllTickets);
router.post('/api/tickets/clear-all', AdminController.clearAllTickets);

// ==========================================
// HEALTHCHECKS
// ==========================================
router.get('/api/health', HealthController.check);
router.get('/health', HealthController.check);

// ==========================================
// WEBHOOKS
// ==========================================
router.post('/webhook', WebhookController.handleWebhook);
router.post('/api/webhook', WebhookController.handleWebhook);
router.post('/webhook/mercadopago', WebhookController.handleMercadoPagoWebhook);
router.get('/webhook/mercadopago', WebhookController.handleMercadoPagoWebhook);

export default router;

