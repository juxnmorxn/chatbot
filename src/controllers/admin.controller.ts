import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service';
import { TursoService } from '../services/turso.service';
import { getTursoClient } from '../database/turso';
import { GroqService } from '../services/groq.service';
import { WispHubService } from '../services/wisphub.service';
import { SmartOLTService } from '../services/smartolt.service';
import { IpamService } from '../services/ipam.service';
import { EvolutionService } from '../services/evolution.service';
import { BotOrchestrator } from '../orchestrator/bot.orchestrator';
import { WebhookController } from './webhook.controller';
import { hashPassword, verifyPassword, generateSessionToken, AuthenticatedRequest } from '../utils/auth';
import axios from 'axios';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

const logger = new Logger('AdminController');

export class AdminController {
  private static sseClients: Set<Response> = new Set();

  /**
   * Emite eventos en tiempo real a todos los clientes SSE conectados
   */
  public static broadcastSSE(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of AdminController.sseClients) {
      try {
        client.write(payload);
      } catch {
        AdminController.sseClients.delete(client);
      }
    }
  }

  /**
   * Endpoint de Server-Sent Events (SSE) para transmisión en vivo
   */
  static liveStreamSSE(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para Nginx / Render proxies
    res.flushHeaders?.();

    AdminController.sseClients.add(res);

    // Enviar evento de conexión inicial
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Heartbeat cada 25 segundos para evitar timeouts de proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        AdminController.sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      AdminController.sseClients.delete(res);
    });
  }

  // ==========================================
  // AUTENTICACIÓN Y ROLES (RBAC)
  // ==========================================

  /**
   * Inicia sesión en el panel y retorna el JWT/Token firmado
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
        return;
      }

      const user = await TursoService.getAdminUserByUsername(String(username).trim().toLowerCase());
      if (!user) {
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        return;
      }

      if (user.is_active !== 1) {
        res.status(403).json({ success: false, error: 'Usuario desactivado. Contacte al superadmin.' });
        return;
      }

      const isValid = verifyPassword(String(password), user.password_hash || '');
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        return;
      }

      await TursoService.updateAdminLastLogin(user.id);

      const token = generateSessionToken({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      logger.error('Error en login:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Cierra sesión
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  }

  /**
   * Retorna los datos del usuario autenticado
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.adminUser) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }
    res.json({ success: true, user: authReq.adminUser });
  }

  /**
   * Lista todos los administradores/usuarios del panel
   */
  static async getAdminUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await TursoService.listAdminUsers();
      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Crea un nuevo usuario para el panel
   */
  static async createAdminUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, name, role } = req.body || {};
      if (!username || !password || !name || !role) {
        res.status(400).json({ success: false, error: 'Todos los campos son requeridos (username, password, name, role)' });
        return;
      }

      const validRoles = ['superadmin', 'soporte', 'tecnico', 'facturacion'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ success: false, error: 'Rol inválido. Permitidos: superadmin, soporte, tecnico, facturacion' });
        return;
      }

      const password_hash = hashPassword(String(password));
      const result = await TursoService.createAdminUser({
        username: String(username).trim().toLowerCase(),
        password_hash,
        name: String(name).trim(),
        role: role as any,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error('Error al crear usuario admin:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina un usuario del panel
   */
  static async deleteAdminUser(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de usuario inválido' });
        return;
      }

      const ok = await TursoService.deleteAdminUser(id);
      if (ok) {
        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
      } else {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  // ==========================================
  // LIVE CHAT & WHATSAPP INTERACTIVO
  // ==========================================

  /**
   * Obtiene la lista de conversaciones recientes de WhatsApp
   */
  static async getChatConversations(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const conversations = await TursoService.getRecentChatConversations(limit);
      res.json({ success: true, conversations });
    } catch (error: any) {
      logger.error('Error al obtener conversaciones:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el historial de mensajes de un chat específico
   */
  static async getChatMessages(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || '');
      const limit = parseInt(req.query.limit as string, 10) || 80;
      const messages = await TursoService.getChatMessagesByPhone(phone, limit);
      const session = await TursoService.getSession(phone);
      const isPaused = BotOrchestrator.estaBotPausado(phone, session);
      res.json({
        success: true,
        messages,
        session,
        is_paused: isPaused.pausado,
        takeover: isPaused,
      });
    } catch (error: any) {
      logger.error(`Error al obtener mensajes de ${req.params.phone}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Reasigna o transfiere una conversación a otro departamento (SOPORTE | ATENCION)
   */
  static async transferChatDepartment(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || req.body?.phone || '').trim();
      const department = String(req.body?.department || 'SOPORTE').toUpperCase() as 'SOPORTE' | 'ATENCION';
      if (!phone) {
        res.status(400).json({ success: false, error: 'Teléfono requerido' });
        return;
      }
      await TursoService.updateDepartment(phone, department);

      // Cancelar cualquier debounce pendiente de la IA y pausar bot en modo Human Takeover por defecto (240m)
      WebhookController.cancelPendingDebounce(phone);
      const takeoverRes = await BotOrchestrator.activarPausaOperador(
        phone,
        240,
        `Transferencia manual al departamento de ${department === 'SOPORTE' ? 'Soporte Técnico' : 'Atención al Cliente'}`,
        'OPERATOR_ACTIVE'
      );

      AdminController.broadcastSSE('chat:department', {
        phone,
        department,
        is_paused: true,
        takeover: takeoverRes,
      });

      res.json({
        success: true,
        department,
        is_paused: true,
        takeover: takeoverRes,
        message: `Chat transferido a ${department === 'SOPORTE' ? 'Soporte Técnico' : 'Atención al Cliente'}. Bot pausado para atención humana.`,
      });
    } catch (error: any) {
      logger.error('Error al transferir departamento:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Dispara el ciclo de recordatorios de cobranza automáticos respetando los switches
   */
  static async runBillingNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { NotificationService } = await import('../services/notification.service');
      const result = await NotificationService.ejecutarRecordatoriosPreventivos();
      res.json({ success: true, result });
    } catch (error: any) {
      logger.error('Error al ejecutar recordatorios de cobranza:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Envía un mensaje manual de WhatsApp y activa el Human Takeover adaptativo
   */
  static async sendManualChatMessage(req: Request, res: Response): Promise<void> {
    try {
      const { phone, message, autoPauseMinutes, mode } = req.body || {};
      if (!phone || !message) {
        res.status(400).json({ success: false, error: 'Teléfono y mensaje son obligatorios' });
        return;
      }

      const cleanPhone = String(phone).trim();
      const text = String(message).trim();

      // Cancelar cualquier mensaje pendiente de la IA
      WebhookController.cancelPendingDebounce(cleanPhone);

      // Enviar el mensaje vía Evolution API en la instancia correspondiente
      const instance = (req.body.instanceName || BotOrchestrator.getActiveInstance(cleanPhone) || '').trim();
      const sent = await EvolutionService.enviarTexto(cleanPhone, text, { instanceName: instance || undefined });
      if (!sent) {
        res.status(500).json({ success: false, error: 'No se pudo enviar el mensaje a través de WhatsApp' });
        return;
      }

      // Registrar en el historial de Turso
      await TursoService.logMessage(cleanPhone, 'OUT', text, 'HUMAN_TAKEOVER', 'Mensaje enviado por operador humano');

      // Activar pausa automática del bot por defecto 240m (o especificado)
      const forzarHastaManana = mode === 'next_morning';
      const pauseMins = parseInt(autoPauseMinutes, 10) || (mode === '1h' ? 60 : 240);
      const takeoverRes = await BotOrchestrator.activarPausaOperador(
        cleanPhone,
        pauseMins,
        'Intervención manual por agente humano desde panel',
        'OPERATOR_ACTIVE',
        forzarHastaManana
      );

      // Broadcast evento SSE
      AdminController.broadcastSSE('chat:message', {
        phone: cleanPhone,
        direction: 'OUT',
        message: text,
        created_at: new Date().toISOString(),
        is_paused: true,
        takeover: takeoverRes,
      });

      res.json({
        success: true,
        message: `Mensaje enviado. Bot en pausa (${takeoverRes.descripcion}).`,
        takeover: takeoverRes,
      });
    } catch (error: any) {
      logger.error('Error al enviar mensaje manual de chat:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Pausa o reactiva el bot para un número de WhatsApp
   */
  static async toggleHumanTakeover(req: Request, res: Response): Promise<void> {
    try {
      const { phone, pause, minutes, mode } = req.body || {};
      if (!phone) {
        res.status(400).json({ success: false, error: 'Número de teléfono requerido' });
        return;
      }

      const cleanPhone = String(phone).trim();
      if (pause === false || mode === 'resume') {
        await BotOrchestrator.reanudarBot(cleanPhone);
        AdminController.broadcastSSE('chat:status', { phone: cleanPhone, is_paused: false, status: 'BOT' });
        res.json({ success: true, is_paused: false, message: `Bot reactivado para ${cleanPhone}` });
      } else {
        const forzarHastaManana = mode === 'next_morning';
        const mins = mode === '1h' ? 60 : (parseInt(minutes, 10) || 240);
        WebhookController.cancelPendingDebounce(cleanPhone);
        const takeoverRes = await BotOrchestrator.activarPausaOperador(
          cleanPhone,
          mins,
          'Pausado manualmente desde panel',
          'OPERATOR_ACTIVE',
          forzarHastaManana
        );
        AdminController.broadcastSSE('chat:status', { phone: cleanPhone, is_paused: true, takeover: takeoverRes });
        res.json({
          success: true,
          is_paused: true,
          takeover: takeoverRes,
          message: `Bot pausado para ${cleanPhone} (${takeoverRes.descripcion})`,
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Finaliza el caso de atención humana y reactiva el bot limpiamente
   */
  static async closeChatCase(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || req.body?.phone || '').trim();
      const removeSession = req.body?.removeSession === true || req.query?.removeSession === 'true';
      if (!phone) {
        res.status(400).json({ success: false, error: 'Teléfono requerido' });
        return;
      }

      await BotOrchestrator.finalizarIntervencionHumana(phone);
      if (removeSession) {
        await TursoService.deleteSession(phone);
      }
      AdminController.broadcastSSE('chat:status', { phone, is_paused: false, status: 'RESOLVED', removed: removeSession });
      res.json({
        success: true,
        message: `Caso cerrado exitosamente para ${phone}. El bot atenderá limpiamente las próximas consultas.`,
      });
    } catch (error: any) {
      logger.error('Error al cerrar caso de chat:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina completamente la conversación (sesión y mensajes) de un teléfono (Solo Superadmin)
   */
  static async deleteChatConversation(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).adminUser;
      if (authUser && authUser.role !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Acceso denegado: solo el superadministrador puede eliminar conversaciones.' });
        return;
      }

      const phone = String(req.params.phone || req.body?.phone || '').trim();
      if (!phone) {
        res.status(400).json({ success: false, error: 'Teléfono requerido' });
        return;
      }

      await TursoService.deleteChatAndLogs(phone);
      await BotOrchestrator.reanudarBot(phone);
      AdminController.broadcastSSE('chat:deleted', { phone });
      res.json({
        success: true,
        message: `Conversación y mensajes eliminados permanentemente para ${phone}.`,
      });
    } catch (error: any) {
      logger.error('Error al eliminar conversación:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Asigna un técnico a un ticket de soporte y actualiza a VISITA_TECNICA
   */
  static async assignTicketTechnician(req: Request, res: Response): Promise<void> {
    try {
      const folio = String(req.params.folio || '');
      const { technicianName } = req.body || {};

      if (!technicianName) {
        res.status(400).json({ success: false, error: 'Nombre del técnico requerido' });
        return;
      }

      const ok = await TursoService.assignTicketTechnician(folio, String(technicianName).trim());
      if (ok) {
        AdminController.broadcastSSE('tickets:update', { folio, status: 'VISITA_TECNICA', technician: technicianName });
        res.json({ success: true, message: `Ticket ${folio} asignado a ${technicianName} en Visita Técnica.` });
      } else {
        res.status(404).json({ success: false, error: 'Ticket no encontrado' });
      }
    } catch (error: any) {
      logger.error('Error al asignar técnico:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

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
   * Obtiene el historial de mensajes, problemas y soluciones registrados en Turso
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 60;
      const phone = req.query.phone as string | undefined;
      const logs = await TursoService.getLogs(limit, phone);
      res.json({ success: true, logs });
    } catch (error: any) {
      logger.error('Error al obtener logs:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todas las sesiones registradas en Turso (Modo Pruebas)
   */
  static async clearAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllSessions();
      res.json({ success: true, message: `Se eliminaron ${count} sesiones de la base de datos.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina una sesión individual por teléfono
   */
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || '');
      if (phone === 'clear-all') {
        return AdminController.clearAllSessions(req, res);
      }
      await TursoService.deleteSession(phone);
      res.json({ success: true, message: `Sesión de ${phone} eliminada exitosamente.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todo el historial de conversaciones (Modo Pruebas)
   */
  static async clearAllLogs(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllLogs();
      res.json({ success: true, message: `Se vaciaron ${count} registros de historial.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todos los tickets registrados en Turso (Modo Pruebas)
   */
  static async clearAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const count = await TursoService.clearAllTickets();
      AdminController.broadcastSSE('tickets:update', { action: 'clear_all', count });
      res.json({ success: true, message: `Se eliminaron ${count} tickets de prueba.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina un ticket individual por folio
   */
  static async deleteTicket(req: Request, res: Response): Promise<void> {
    try {
      const folio = String(req.params.folio || '');
      if (folio === 'clear-all') {
        return AdminController.clearAllTickets(req, res);
      }
      const ok = await TursoService.deleteTicket(folio);
      if (ok) {
        AdminController.broadcastSSE('tickets:update', { action: 'delete', folio });
        res.json({ success: true, message: `Ticket ${folio} eliminado exitosamente.` });
      } else {
        res.status(404).json({ success: false, error: 'Ticket no encontrado o no eliminado' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }


  /**
   * Busca clientes en SmartOLT / Turso para diagnóstico
   */
  static async searchClients(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q || '');
      const client = getTursoClient();
      const dbRows = await client.execute({
        sql: 'SELECT name, unique_external_id, sn, phone FROM smartolt_onus WHERE name LIKE ? LIMIT 20',
        args: [`%${q}%`]
      });
      const fuzzy = await TursoService.searchOnusFuzzy(q, 10);
      res.json({ success: true, query: q, rawCount: dbRows.rows.length, rawMatches: dbRows.rows, fuzzyMatches: fuzzy });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || e });
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

  /**
   * Obtiene el estado de conexión de WhatsApp y el QR actual
   */
  static async getWhatsAppStatus(req: Request, res: Response): Promise<void> {
    try {
      const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
      const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
      const instance = config.evolution.instanceName;

      let state = 'close';
      try {
        const stateRes = await axios.get(`${url}/instance/connectionState/${instance}`, {
          headers: { apikey: apiKey },
          timeout: 4000,
        });
        state = stateRes.data?.instance?.state || 'close';
      } catch (err: any) {
        logger.warn('No se pudo obtener estado de instancia:', err?.message || err);
      }

      let qr = null;
      if (state !== 'open') {
        try {
          const qrRes = await axios.get(`${url}/instance/connect/${instance}`, {
            headers: { apikey: apiKey },
            timeout: 5000,
          });
          qr = qrRes.data?.base64 || null;
        } catch (err: any) {
          logger.warn('No se pudo obtener QR:', err?.message || err);
        }
      }

      res.json({ success: true, state, qr });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Desconecta la sesión de WhatsApp para generar un QR nuevo limpio
   */
  static async disconnectWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
      const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
      const instance = SettingsService.get('INSTANCE_NAME', 'INSTANCE_NAME', config.evolution.instanceName);

      await axios.delete(`${url}/instance/logout/${instance}`, {
        headers: { apikey: apiKey },
        timeout: 6000,
      });

      res.json({ success: true, message: 'Sesión desvinculada exitosamente' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.response?.data || error?.message || error });
    }
  }

  /**
   * Obtiene la lista de todas las instancias / números de WhatsApp disponibles
   */
  static async getWhatsAppInstances(_req: Request, res: Response): Promise<void> {
    try {
      const instances = await EvolutionService.fetchAllInstances();
      res.json({ success: true, count: instances.length, instances });
    } catch (error: any) {
      logger.error('Error al listar instancias WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Crea una nueva instancia de WhatsApp para vincular otro número
   */
  static async createWhatsAppInstance(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body || {};
      if (!name) {
        res.status(400).json({ success: false, error: 'El nombre de la instancia es obligatorio' });
        return;
      }
      const result = await EvolutionService.createInstance(name);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error('Error al crear instancia WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el código QR de una instancia específica
   */
  static async getWhatsAppInstanceQr(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      const qrData = await EvolutionService.getInstanceQr(instance);
      res.json({ success: true, instance, ...qrData });
    } catch (error: any) {
      logger.error(`Error al obtener QR de instancia ${req.params.instance}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Selecciona una instancia como la principal activa para el bot
   */
  static async selectWhatsAppInstance(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      if (!instance) {
        res.status(400).json({ success: false, error: 'Nombre de instancia requerido' });
        return;
      }
      await SettingsService.set('INSTANCE_NAME', instance);
      await EvolutionService.verifyAndEnableWebhook(instance);
      res.json({ success: true, message: `Instancia "${instance}" seleccionada como activa para el chatbot.` });
    } catch (error: any) {
      logger.error(`Error al seleccionar instancia ${req.params.instance}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Desconecta (logout) una instancia de WhatsApp
   */
  static async disconnectWhatsAppInstance(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      const ok = await EvolutionService.disconnectInstance(instance);
      if (ok) {
        res.json({ success: true, message: `Instancia "${instance}" desvinculada exitosamente.` });
      } else {
        res.status(400).json({ success: false, error: 'No se pudo desvincular la instancia' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina completamente una instancia de WhatsApp de Evolution API
   */
  static async deleteWhatsAppInstance(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      const ok = await EvolutionService.deleteInstance(instance);
      if (ok) {
        res.json({ success: true, message: `Instancia "${instance}" eliminada de Evolution API.` });
      } else {
        res.status(400).json({ success: false, error: 'No se pudo eliminar la instancia' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Re-sincroniza el webhook de una instancia específica
   */
  static async syncInstanceWebhook(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      const resWebhook = await EvolutionService.verifyAndEnableWebhook(instance);
      res.json({ success: true, instance, ...resWebhook });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Resuelve el JID y nombre de un grupo de WhatsApp a partir de un link de invitación
   * y automáticamente guarda el grupo para notificaciones de activaciones.
   */
  static async resolveWhatsAppGroup(req: Request, res: Response): Promise<void> {
    try {
      const { link } = req.body;
      if (!link || typeof link !== 'string') {
        res.status(400).json({ success: false, error: 'Enlace o código de invitación requerido' });
        return;
      }

      const result = await EvolutionService.resolveAndJoinGroupInvite(link);
      if (result.success && result.jid) {
        await SettingsService.set('ACTIVATIONS_GROUP_JID', result.jid);
        res.json({
          success: true,
          jid: result.jid,
          name: result.name,
          message: `Grupo "${result.name || result.jid}" vinculado y guardado exitosamente.`,
        });
      } else {
        res.status(400).json({ success: false, error: result.message || 'No se pudo resolver el grupo' });
      }
    } catch (error: any) {
      logger.error('Error al resolver grupo de WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la lista de grupos donde la instancia de WhatsApp está presente
   */
  static async getWhatsAppGroups(req: Request, res: Response): Promise<void> {
    try {
      const groups = await EvolutionService.fetchAllGroups();
      res.json({ success: true, groups });
    } catch (error: any) {
      logger.error('Error al obtener grupos de WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Dispara la sincronización de SmartOLT hacia Turso DB
   */
  static async syncSmartOlt(req: Request, res: Response): Promise<void> {
    try {
      const force = req.body?.force === true;
      const result = await SmartOLTService.syncAllOnusToTurso(force);
      res.json(result);
    } catch (error: any) {
      logger.error('Error en syncSmartOlt controller:', error?.message || error);
      res.status(500).json({ success: false, count: 0, message: error?.message || 'Error al sincronizar' });
    }
  }

  /**
   * Obtiene estadísticas de ONUs guardadas en Turso DB
   */
  static async getSmartOltStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await TursoService.getSmartOltSyncStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la lista de tickets de soporte (con soporte para vista Kanban detallada)
   */
  static async getTickets(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 150;
      const rawTickets = await TursoService.getAllTicketsDetailed(status, limit);
      const tickets = rawTickets.map((t: any) => ({
        ...t,
        bot_paused: BotOrchestrator.estaBotPausado(String(t.phone)),
      }));
      res.json({ success: true, tickets });
    } catch (error: any) {
      logger.error('Error al obtener tickets:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza el estatus y notas de un ticket
   */
  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const folio = String(req.params.folio || '');
      const { status, notes } = req.body;

      const validStatuses = ['ABIERTO', 'EN_PROCESO', 'VISITA_TECNICA', 'RESUELTO', 'CANCELADO', 'CERRADO'];
      if (!status || !validStatuses.includes(status.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: `Estatus inválido. Valores permitidos: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const ok = await TursoService.updateTicketStatus(folio, status.toUpperCase(), notes);
      if (ok) {
        AdminController.broadcastSSE('tickets:update', { folio, status: status.toUpperCase(), notes });
        res.json({ success: true, message: `Ticket ${folio} actualizado a ${status.toUpperCase()}` });
      } else {
        res.status(404).json({ success: false, error: 'Ticket no encontrado o no modificado' });
      }
    } catch (error: any) {
      logger.error('Error al actualizar ticket:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene métricas resumidas de tickets
   */
  static async getTicketStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await TursoService.getTicketStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      logger.error('Error al obtener stats de tickets:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Pausa o reactiva el bot para un teléfono específico (Human Takeover)
   */
  static async toggleBotPause(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || '');
      const { pause, minutes } = req.body;

      if (pause === false) {
        BotOrchestrator.reanudarBot(phone);
        res.json({ success: true, message: `Bot reactivado para ${phone}`, paused: false });
      } else {
        const mins = parseInt(minutes, 10) || 60;
        BotOrchestrator.activarPausaOperador(phone, mins, 'Pausado manualmente desde panel web');
        res.json({ success: true, message: `Bot silenciado para ${phone} por ${mins} minutos`, paused: true, minutes: mins });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Dispara la sincronización completa de clientes de WispHub a Turso DB (100% solo lectura de API)
   */
  static async syncWisphub(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Iniciando sincronización manual de clientes WispHub...');
      const result = await WispHubService.syncAllClientesToTurso();
      res.json({
        success: result.success,
        message: result.message || `Sincronización completada: ${result.count} clientes procesados en Turso DB.`,
        stats: result,
      });
    } catch (error: any) {
      logger.error('Error al sincronizar WispHub:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene estadísticas de sincronización de WispHub en Turso
   */
  static async getWisphubStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await TursoService.getWisphubSyncStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      logger.error('Error al obtener stats de WispHub:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Realiza la auditoría de cruce de IPs entre SmartOLT y WispHub
   */
  static async getAuditIpCross(req: Request, res: Response): Promise<void> {
    try {
      const filter = (req.query.filter as any) || 'all';
      const search = (req.query.search as string) || '';
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const result = await TursoService.getAuditIpCross({ filter, search, page, limit });
      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Error al auditar cruce de IPs:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el resumen de pools y ocupación por VLAN (IPAM)
   */
  static async getIpamPools(_req: Request, res: Response): Promise<void> {
    try {
      const pools = await IpamService.getPoolSummary();
      res.json({ success: true, pools });
    } catch (error: any) {
      logger.error('Error al obtener resumen de pools IPAM:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Guarda o actualiza un pool de VLAN en IPAM
   */
  static async saveIpamPool(req: Request, res: Response): Promise<void> {
    try {
      const { vlan, name, segment, gateway, netmask, startHost, endHost, oltId, oltName } = req.body || {};
      if (!vlan || !segment || !gateway) {
        res.status(400).json({ success: false, error: 'VLAN, Segmento CIDR y Gateway son requeridos.' });
        return;
      }
      const ok = await IpamService.saveVlanPool({
        vlan,
        name,
        segment,
        gateway,
        netmask,
        startHost,
        endHost,
        oltId,
        oltName,
      });
      if (ok) {
        res.json({ success: true, message: `Pool VLAN ${vlan} (${segment}) guardado exitosamente.` });
      } else {
        res.status(500).json({ success: false, error: 'No se pudo guardar el pool' });
      }
    } catch (error: any) {
      logger.error('Error al guardar pool IPAM:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina un pool de VLAN en IPAM
   */
  static async deleteIpamPool(req: Request, res: Response): Promise<void> {
    try {
      const vlan = String(req.params.vlan || '').trim();
      if (!vlan) {
        res.status(400).json({ success: false, error: 'VLAN requerida' });
        return;
      }
      const ok = await IpamService.deleteVlanPool(vlan);
      if (ok) {
        res.json({ success: true, message: `Pool VLAN ${vlan} eliminado exitosamente.` });
      } else {
        res.status(400).json({ success: false, error: 'No se pudo eliminar el pool' });
      }
    } catch (error: any) {
      logger.error(`Error al eliminar pool VLAN ${req.params.vlan}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Auto-descubre subredes a partir de ONUs y clientes WispHub en base de datos
   */
  static async autoDiscoverIpamPools(_req: Request, res: Response): Promise<void> {
    try {
      const pools = await IpamService.getPoolSummary();
      res.json({ success: true, message: 'Auto-descubrimiento de subredes completado.', count: pools.length, pools });
    } catch (error: any) {
      logger.error('Error en auto-descubrimiento IPAM:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el listado de IPs disponibles calculadas en tiempo real
   */
  static async getIpamAvailable(req: Request, res: Response): Promise<void> {
    try {
      const vlan = req.query.vlan as string | undefined;
      const olt = req.query.olt as string | undefined;
      const available = await IpamService.getAvailableIps(vlan, olt);
      res.json({ success: true, count: available.length, available });
    } catch (error: any) {
      logger.error('Error al obtener IPs disponibles IPAM:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la lista de ONUs sin configurar en SmartOLT
   */
  static async getSmartOltUnconfigured(req: Request, res: Response): Promise<void> {
    try {
      const oltId = req.query.olt_id as string | undefined;
      const unconfigured = await SmartOLTService.getUnconfiguredOnus(oltId);
      res.json({ success: true, count: unconfigured.length, unconfigured });
    } catch (error: any) {
      logger.error('Error al obtener ONUs sin configurar:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Autoriza una ONU en SmartOLT
   */
  static async authorizeSmartOltOnu(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      if (!payload || !payload.sn || !payload.olt_id || !payload.vlan || !payload.ip_address) {
        res.status(400).json({ success: false, error: 'Faltan campos requeridos (sn, olt_id, vlan, ip_address)' });
        return;
      }

      const result = await SmartOLTService.authorizeOnu(payload);
      res.json(result);
    } catch (error: any) {
      logger.error('Error al autorizar ONU en SmartOLT:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Configura TR-069 y WAN IPv4/IPv6 Dual Stack en una ONU existente
   */
  static async configureSmartOltTr069(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.onu_id || req.body?.id || '').trim();
      if (!id) {
        res.status(400).json({ success: false, error: 'ID o Serial de la ONU es requerido' });
        return;
      }

      const options = req.body || {};
      const result = await SmartOLTService.configureOnuTr069AndIpv6(id, options);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error('Error al configurar TR-069/IPv6:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  // ==========================================
  // GESTIÓN DE TÉCNICOS AUTORIZADOS
  // ==========================================

  /**
   * Obtiene la lista de técnicos registrados
   */
  static async getTechnicians(_req: Request, res: Response): Promise<void> {
    try {
      const technicians = await TursoService.getTechnicians();
      res.json({ success: true, count: technicians.length, technicians });
    } catch (error: any) {
      logger.error('Error al listar técnicos:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Registra un nuevo técnico
   */
  static async createTechnician(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, pin, role, notes, is_active } = req.body;
      if (!name || !phone || !pin) {
        res.status(400).json({ success: false, error: 'Nombre, teléfono WhatsApp y PIN de 5 dígitos son obligatorios.' });
        return;
      }

      const tech = await TursoService.createTechnician({
        name,
        phone,
        pin,
        role,
        notes,
        is_active: is_active === undefined ? 1 : Number(is_active),
      });

      res.json({ success: true, message: `Técnico ${tech.name} registrado exitosamente.`, technician: tech });
    } catch (error: any) {
      logger.error('Error al crear técnico:', error?.message || error);
      res.status(400).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza un técnico existente
   */
  static async updateTechnician(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de técnico inválido' });
        return;
      }

      const { name, phone, pin, role, notes, is_active } = req.body;
      const ok = await TursoService.updateTechnician(id, {
        name,
        phone,
        pin,
        role,
        notes,
        is_active: is_active === undefined ? undefined : Number(is_active),
      });

      if (ok) {
        res.json({ success: true, message: 'Datos del técnico actualizados correctamente.' });
      } else {
        res.status(404).json({ success: false, error: 'Técnico no encontrado' });
      }
    } catch (error: any) {
      logger.error(`Error al actualizar técnico ${req.params.id}:`, error?.message || error);
      res.status(400).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina un técnico
   */
  static async deleteTechnician(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de técnico inválido' });
        return;
      }

      const ok = await TursoService.deleteTechnician(id);
      if (ok) {
        res.json({ success: true, message: 'Técnico eliminado del sistema.' });
      } else {
        res.status(404).json({ success: false, error: 'Técnico no encontrado' });
      }
    } catch (error: any) {
      logger.error(`Error al eliminar técnico ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Cambia el estado activo/inactivo de un técnico
   */
  static async toggleTechnician(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de técnico inválido' });
        return;
      }

      const result = await TursoService.toggleTechnicianActive(id);
      if (result.success) {
        res.json({
          success: true,
          is_active: result.is_active,
          message: result.is_active === 1 ? 'Técnico activado exitosamente.' : 'Técnico desactivado exitosamente.'
        });
      } else {
        res.status(404).json({ success: false, error: 'Técnico no encontrado' });
      }
    } catch (error: any) {
      logger.error(`Error al alternar estado de técnico ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  // ==========================================
  // GESTIÓN DE CLIENTES, MULTI-TELÉFONOS & GEOLOCALIZACIÓN
  // ==========================================

  /**
   * Obtiene la lista paginada de clientes con filtros de búsqueda y geolocalización
   */
  static async getClients(req: Request, res: Response): Promise<void> {
    try {
      const search = String(req.query.search || '');
      const status = String(req.query.status || 'ALL');
      const limit = parseInt(String(req.query.limit || '50'), 10);
      const page = parseInt(String(req.query.page || '1'), 10);
      const offset = Math.max(0, (page - 1) * limit);

      const data = await TursoService.getClientsDirectory({
        search,
        status,
        limit,
        offset,
      });

      res.json({
        success: true,
        clients: data.clients,
        total: data.total,
        totalActive: data.totalActive,
        totalSuspended: data.totalSuspended,
        totalWithGps: data.totalWithGps,
        totalWithoutGps: data.totalWithoutGps,
        page,
        limit,
      });
    } catch (error: any) {
      logger.error('Error al obtener lista de clientes:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la ficha completa de un cliente
   */
  static async getClientDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      if (!id) {
        res.status(400).json({ success: false, error: 'ID de cliente requerido' });
        return;
      }

      const client = await TursoService.getClientDetail(id);
      if (!client) {
        res.status(404).json({ success: false, error: 'Cliente no encontrado' });
        return;
      }

      res.json({ success: true, client });
    } catch (error: any) {
      logger.error(`Error al obtener detalle de cliente ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza manualmente las coordenadas GPS o Google Maps URL de un cliente
   */
  static async updateClientLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const { lat, lng, url, direccion, notas } = req.body || {};

      if (!id) {
        res.status(400).json({ success: false, error: 'ID de cliente requerido' });
        return;
      }

      const ok = await TursoService.updateClientLocation(id, {
        lat,
        lng,
        url,
        direccion,
        notas,
      });

      if (ok) {
        // Emitir SSE para actualizar UI en vivo
        AdminController.broadcastSSE('client:location_updated', {
          id,
          lat,
          lng,
          url,
          direccion,
          updated_at: new Date().toISOString(),
        });

        res.json({ success: true, message: 'Ubicación y coordenadas actualizadas exitosamente.' });
      } else {
        res.status(500).json({ success: false, error: 'No se pudo actualizar la ubicación' });
      }
    } catch (error: any) {
      logger.error(`Error al actualizar ubicación de cliente ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Actualiza el teléfono principal y los teléfonos familiares/adicionales de un cliente
   */
  static async updateClientPhones(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const { principal, adicionales } = req.body || {};

      if (!id) {
        res.status(400).json({ success: false, error: 'ID de cliente requerido' });
        return;
      }

      const ok = await TursoService.updateWisphubClientTelefonos(
        id,
        principal || '',
        Array.isArray(adicionales) ? adicionales : []
      );

      if (ok) {
        // Emitir SSE
        AdminController.broadcastSSE('client:phones_updated', {
          id,
          principal,
          adicionales,
          updated_at: new Date().toISOString(),
        });

        res.json({ success: true, message: 'Números de teléfono actualizados exitosamente.' });
      } else {
        res.status(500).json({ success: false, error: 'No se pudieron actualizar los teléfonos' });
      }
    } catch (error: any) {
      logger.error(`Error al actualizar teléfonos de cliente ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }
}

