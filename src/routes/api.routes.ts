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
router.delete('/api/admin/chats/:phone', AdminController.deleteChatConversation);
router.post('/api/admin/chats/:phone/delete', AdminController.deleteChatConversation);
router.post('/api/admin/chats/:phone/department', AdminController.transferChatDepartment);
router.post('/api/notifications/run-billing-cycle', AdminController.runBillingNotifications);


// ==========================================
// APIS ADMINISTRATIVAS PARA VARIABLES Y CONFIGURACIÓN
// ==========================================
router.get('/api/settings', AdminController.getSettings);
router.post('/api/settings', AdminController.updateSettings);
router.post('/api/settings/generate-evolution-key', AdminController.generateEvolutionKey);
router.get('/api/sessions', AdminController.getSessions);
router.get('/api/logs', AdminController.getLogs);
router.get('/api/whatsapp/status', AdminController.getWhatsAppStatus);
router.get('/api/whatsapp/instances', AdminController.getWhatsAppInstances);
router.post('/api/whatsapp/instances', AdminController.createWhatsAppInstance);
router.get('/api/whatsapp/instances/:instance/qr', AdminController.getWhatsAppInstanceQr);
router.post('/api/whatsapp/instances/:instance/select', AdminController.selectWhatsAppInstance);
router.post('/api/whatsapp/instances/:instance/disconnect', AdminController.disconnectWhatsAppInstance);
router.delete('/api/whatsapp/instances/:instance', AdminController.deleteWhatsAppInstance);
router.post('/api/whatsapp/instances/:instance/sync-webhook', AdminController.syncInstanceWebhook);
router.post('/api/whatsapp/disconnect', AdminController.disconnectWhatsApp);
router.post('/api/whatsapp/resolve-group', AdminController.resolveWhatsAppGroup);
router.get('/api/whatsapp/groups', AdminController.getWhatsAppGroups);
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
// DIRECTORIO DE CLIENTES, MULTI-TELÉFONOS Y GPS
// ==========================================
router.get('/api/admin/clients', AdminController.getClients);
router.get('/api/admin/clients/:id', AdminController.getClientDetail);
router.post('/api/admin/clients/:id/location', AdminController.updateClientLocation);
router.post('/api/admin/clients/:id/phones', AdminController.updateClientPhones);

// ==========================================
// IPAM & GESTIÓN DE POOLS / VLANS / ONUS
// ==========================================
router.get('/api/ipam/pools', AdminController.getIpamPools);
router.post('/api/ipam/pools', AdminController.saveIpamPool);
router.delete('/api/ipam/pools/:vlan', AdminController.deleteIpamPool);
router.post('/api/ipam/pools/auto-discover', AdminController.autoDiscoverIpamPools);
router.get('/api/ipam/available', AdminController.getIpamAvailable);
router.get('/api/smartolt/unconfigured', AdminController.getSmartOltUnconfigured);
router.post('/api/smartolt/authorize', AdminController.authorizeSmartOltOnu);
router.post('/api/smartolt/configure-tr069/:id', AdminController.configureSmartOltTr069);
router.post('/api/smartolt/configure-tr069', AdminController.configureSmartOltTr069);

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
router.get('/api/tickets/stats', AdminController.getTicketStats);
router.delete('/api/tickets/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllTickets);
router.post('/api/tickets/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllTickets);
router.patch('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.post('/api/tickets/:folio/status', AdminController.updateTicketStatus);
router.post('/api/tickets/:folio/assign', AdminController.assignTicketTechnician);
router.delete('/api/tickets/:folio', requireAdminAuth(['superadmin']), AdminController.deleteTicket);
router.post('/api/tickets/:folio/delete', requireAdminAuth(['superadmin']), AdminController.deleteTicket);

// ==========================================
// RUTAS DE LIMPIEZA Y REINICIO DE PRUEBAS (SOLO SUPERADMIN)
// ==========================================
router.delete('/api/sessions/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllSessions);
router.post('/api/sessions/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllSessions);
router.delete('/api/logs/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllLogs);
router.post('/api/logs/clear-all', requireAdminAuth(['superadmin']), AdminController.clearAllLogs);
router.post('/api/sessions/:phone/toggle-pause', AdminController.toggleBotPause);
router.delete('/api/sessions/:phone', requireAdminAuth(['superadmin']), AdminController.deleteSession);
router.post('/api/sessions/:phone/delete', requireAdminAuth(['superadmin']), AdminController.deleteSession);


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

