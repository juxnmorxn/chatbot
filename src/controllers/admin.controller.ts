import { Request, Response } from 'express';
import { createClient } from '@libsql/client';
import { SettingsService } from '../services/settings.service';
import { DbService } from '../services/db.service';
import { 
  getDbClient, 
  getDatabaseStatsInfo, 
  getTableDataAndSchema, 
  executeCustomQuery, 
  optimizeDatabase as dbOptimize,
  getLocalDbFilePath,
  resetDatabaseConnection,
  initDatabase
} from '../database/db';
import { GroqService } from '../services/groq.service';
import fs from 'fs';
import path from 'path';
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

      const user = await DbService.getAdminUserByUsername(String(username).trim().toLowerCase());
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

      await DbService.updateAdminLastLogin(user.id);

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
      const users = await DbService.listAdminUsers();
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
      const result = await DbService.createAdminUser({
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

      const ok = await DbService.deleteAdminUser(id);
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
      const conversations = await DbService.getRecentChatConversations(limit);
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
      const messages = await DbService.getChatMessagesByPhone(phone, limit);
      const session = await DbService.getSession(phone);
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
   * Reasigna o transfiere una conversación a otro departamento u oficina (ej. Oficina Actopan, Cobranza Matriz)
   */
  static async transferChatDepartment(req: Request, res: Response): Promise<void> {
    try {
      const phone = String(req.params.phone || req.body?.phone || '').trim();
      const department = String(req.body?.department || 'General').trim();
      const targetInstance = req.body?.targetInstance ? String(req.body.targetInstance).trim() : undefined;
      const notifyClient = Boolean(req.body?.notifyClient);
      const customMessage = req.body?.customMessage ? String(req.body.customMessage).trim() : '';

      if (!phone) {
        res.status(400).json({ success: false, error: 'Teléfono requerido' });
        return;
      }

      // Si no especificaron targetInstance, buscar si este departamento está mapeado a una instancia
      let resolvedInstance = targetInstance;
      if (!resolvedInstance) {
        const instRec = await DbService.getInstanceByArea(department);
        if (instRec) resolvedInstance = instRec.instance_name;
      }

      await DbService.updateDepartment(phone, department, resolvedInstance);

      // Cancelar cualquier debounce pendiente de la IA y pausar bot en modo Human Takeover por defecto (240m)
      WebhookController.cancelPendingDebounce(phone);
      const takeoverRes = await BotOrchestrator.activarPausaOperador(
        phone,
        240,
        `Transferencia manual al área de ${department}`,
        'OPERATOR_ACTIVE'
      );

      // Si se solicitó notificar al cliente vía WhatsApp
      if (notifyClient) {
        const notifText = customMessage || `Tu conversación ha sido transferida al área de *${department}*. En un momento un asesor continuará con tu atención por este medio.`;
        await EvolutionService.enviarTexto(phone, notifText, { instanceName: resolvedInstance || undefined });
        await DbService.logMessage(phone, 'OUT', notifText, 'TRANSFERENCIA_AREA', `Transferido a ${department}`);
      }

      AdminController.broadcastSSE('chat:department', {
        phone,
        department,
        instanceName: resolvedInstance,
        is_paused: true,
        takeover: takeoverRes,
      });

      res.json({
        success: true,
        department,
        instanceName: resolvedInstance,
        is_paused: true,
        takeover: takeoverRes,
        message: `Chat transferido a ${department}.${resolvedInstance ? ` Respuestas asignadas a línea [${resolvedInstance}].` : ''} Bot pausado para atención humana.`,
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

      // Enviar el mensaje vía Evolution API en la instancia correspondiente al chat / área
      let instance = (req.body.instanceName || '').trim();
      if (!instance) {
        const session = await DbService.getSession(cleanPhone);
        if (session?.last_instance) {
          instance = session.last_instance;
        } else if (session?.department) {
          const instRec = await DbService.getInstanceByArea(session.department);
          if (instRec) instance = instRec.instance_name;
        }
        if (!instance) {
          instance = BotOrchestrator.getActiveInstance(cleanPhone);
        }
      }
      const sent = await EvolutionService.enviarTexto(cleanPhone, text, { instanceName: instance || undefined });
      if (!sent) {
        res.status(500).json({ success: false, error: 'No se pudo enviar el mensaje a través de WhatsApp' });
        return;
      }

      // Registrar en el historial de Base de Datos Local
      await DbService.logMessage(cleanPhone, 'OUT', text, 'HUMAN_TAKEOVER', 'Mensaje enviado por operador humano');

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
        await DbService.deleteSession(phone);
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

      await DbService.deleteChatAndLogs(phone);
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

      const ok = await DbService.assignTicketTechnician(folio, String(technicianName).trim());
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
   * Actualiza las configuraciones en Base de Datos Local
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ success: false, error: 'Objeto de settings requerido' });
        return;
      }

      await SettingsService.updateAll(settings);
      res.json({ success: true, message: 'Configuraciones guardadas exitosamente en Base de Datos Local' });
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
   * Lista las sesiones activas de clientes desde Base de Datos Local
   */
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const client = getDbClient();
      const result = await client.execute('SELECT * FROM sessions ORDER BY last_interaction DESC LIMIT 50');
      res.json({ success: true, sessions: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el historial de mensajes, problemas y soluciones registrados en Base de Datos Local
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 60;
      const phone = req.query.phone as string | undefined;
      const logs = await DbService.getLogs(limit, phone);
      res.json({ success: true, logs });
    } catch (error: any) {
      logger.error('Error al obtener logs:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todas las sesiones registradas en Base de Datos Local (Modo Pruebas)
   */
  static async clearAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const count = await DbService.clearAllSessions();
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
      await DbService.deleteSession(phone);
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
      const count = await DbService.clearAllLogs();
      res.json({ success: true, message: `Se vaciaron ${count} registros de historial.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Vacía todos los tickets registrados en Base de Datos Local (Modo Pruebas)
   */
  static async clearAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const count = await DbService.clearAllTickets();
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
      const ok = await DbService.deleteTicket(folio);
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
   * Busca clientes en SmartOLT / Base de Datos Local para diagnóstico
   */
  static async searchClients(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q || '');
      const client = getDbClient();
      const dbRows = await client.execute({
        sql: 'SELECT name, unique_external_id, sn, phone FROM smartolt_onus WHERE name LIKE ? LIMIT 20',
        args: [`%${q}%`]
      });
      const fuzzy = await DbService.searchOnusFuzzy(q, 10);
      res.json({ success: true, query: q, rawCount: dbRows.rows.length, rawMatches: dbRows.rows, fuzzyMatches: fuzzy });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || e });
    }
  }

  /**
   * Ejecuta una prueba interna real contra una API y retorna el resultado estructurado
   */
  private static async runInternalTest(service: string, overrideSettings: any = {}): Promise<{ success: boolean; service: string; latencyMs: number; message: string; details?: any; error?: string }> {
    const startTime = Date.now();
    try {
      if (service === 'evolution') {
        const url = (overrideSettings.EVOLUTION_URL || SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url)).replace(/\/+$/, '');
        const apiKey = overrideSettings.EVOLUTION_API_KEY || SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);

        if (!url || !url.startsWith('http')) {
          return { success: false, service: 'evolution', latencyMs: 0, message: 'URL de Evolution API no configurada', error: 'Evolution API URL vacía o inválida (debe iniciar con http:// o https://)' };
        }
        if (!apiKey) {
          return { success: false, service: 'evolution', latencyMs: 0, message: 'API Key de Evolution no configurada', error: 'Evolution API Key vacía' };
        }

        const resp = await axios.get(`${url}/instance/fetchInstances`, {
          headers: { apikey: apiKey },
          timeout: 7000,
        });
        const latencyMs = Date.now() - startTime;
        const raw = Array.isArray(resp.data) ? resp.data : (resp.data?.instances || resp.data?.response || []);
        return {
          success: true,
          service: 'evolution',
          latencyMs,
          message: `Evolution API conectada (${latencyMs}ms). ${raw.length} instancias detectadas.`,
          details: { url, instancesCount: raw.length, status: resp.status }
        };
      }

      if (service === 'groq') {
        const apiKey = overrideSettings.GROQ_API_KEY || SettingsService.get('GROQ_API_KEY', 'GROQ_API_KEY', config.groq.apiKey);
        const model = overrideSettings.GROQ_MODEL || SettingsService.get('GROQ_MODEL', 'GROQ_MODEL', config.groq.model || 'llama-3.1-8b-instant');

        if (!apiKey || apiKey.includes('tu_clave')) {
          return { success: false, service: 'groq', latencyMs: 0, message: 'GROQ_API_KEY no configurada', error: 'Clave de Groq vacía o sin configurar' };
        }

        const Groq = (await import('groq-sdk')).default;
        const groq = new Groq({ apiKey });
        const cleanModel = model.includes('gpt-oss-20b') ? 'llama-3.1-8b-instant' : model;
        const completion = await groq.chat.completions.create({
          model: cleanModel,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 3,
        });
        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          service: 'groq',
          latencyMs,
          message: `Groq AI conectada (${latencyMs}ms). Modelo: ${cleanModel}`,
          details: { model: cleanModel, reply: completion.choices[0]?.message?.content }
        };
      }

      if (service === 'wisphub') {
        const url = (overrideSettings.WISPHUB_API_URL || SettingsService.get('WISPHUB_API_URL', 'WISPHUB_API_URL', config.wisphub.url)).replace(/\/+$/, '');
        const apiKey = overrideSettings.WISPHUB_API_KEY || SettingsService.get('WISPHUB_API_KEY', 'WISPHUB_API_KEY', config.wisphub.apiKey);

        if (!url || !url.startsWith('http')) {
          return { success: false, service: 'wisphub', latencyMs: 0, message: 'WispHub URL no configurada', error: 'URL de WispHub vacía' };
        }
        if (!apiKey || apiKey.includes('tu_token')) {
          return { success: false, service: 'wisphub', latencyMs: 0, message: 'WispHub API Key no configurada', error: 'API Key de WispHub vacía' };
        }

        const resp = await axios.get(`${url}/clientes/`, {
          headers: { 'Authorization': `Api-Key ${apiKey}`, 'Content-Type': 'application/json' },
          params: { limit: 1 },
          timeout: 8000,
        });
        const latencyMs = Date.now() - startTime;
        const count = resp.data?.count !== undefined ? resp.data.count : (Array.isArray(resp.data?.results) ? resp.data.results.length : 0);
        return {
          success: true,
          service: 'wisphub',
          latencyMs,
          message: `WispHub API conectada (${latencyMs}ms). Clientes en WispHub: ${count}`,
          details: { totalClients: count, status: resp.status }
        };
      }

      if (service === 'smartolt') {
        const url = (overrideSettings.SMARTOLT_API_URL || SettingsService.get('SMARTOLT_API_URL', 'SMARTOLT_API_URL', config.smartolt.url)).replace(/\/+$/, '');
        const apiKey = overrideSettings.SMARTOLT_API_KEY || SettingsService.get('SMARTOLT_API_KEY', 'SMARTOLT_API_KEY', config.smartolt.apiKey);

        if (!url || !url.startsWith('http') || url.includes('tu-dominio')) {
          return { success: false, service: 'smartolt', latencyMs: 0, message: 'SmartOLT URL no configurada', error: 'URL de SmartOLT vacía o de ejemplo' };
        }
        if (!apiKey || apiKey.includes('tu_token')) {
          return { success: false, service: 'smartolt', latencyMs: 0, message: 'SmartOLT API Key no configurada', error: 'X-Token de SmartOLT vacío' };
        }

        const resp = await axios.get(`${url}/system/get_olts`, {
          headers: { 'X-Token': apiKey },
          timeout: 10000,
        });
        const latencyMs = Date.now() - startTime;
        const data = resp.data;
        if (data?.status === false && data?.error) {
          return { success: false, service: 'smartolt', latencyMs, message: `Error en SmartOLT: ${data.error}`, error: data.error };
        }
        const olts = Array.isArray(data?.response) ? data.response : (Array.isArray(data) ? data : []);
        return {
          success: true,
          service: 'smartolt',
          latencyMs,
          message: `SmartOLT API conectada (${latencyMs}ms). OLTs registradas: ${olts.length}`,
          details: { oltsCount: olts.length, status: resp.status }
        };
      }

      if (service === 'local_db') {
        const client = getDbClient();
        const [settRes, logsRes] = await Promise.all([
          client.execute('SELECT count(*) as count FROM settings'),
          client.execute('SELECT count(*) as count FROM logs'),
        ]);
        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          service: 'local_db',
          latencyMs,
          message: `Base de Datos Local operativo (${latencyMs}ms). ${settRes.rows[0]?.count || 0} configuraciones y ${logsRes.rows[0]?.count || 0} registros.`,
          details: { settingsCount: settRes.rows[0]?.count, logsCount: logsRes.rows[0]?.count }
        };
      }

      return { success: false, service, latencyMs: 0, message: `Servicio desconocido: ${service}`, error: 'Servicio no soportado' };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Error de conexión';
      return {
        success: false,
        service,
        latencyMs,
        message: `Fallo al verificar ${service}: ${errMsg}`,
        error: errMsg,
        details: { status: err?.response?.status || 'NETWORK_ERROR' }
      };
    }
  }

  /**
   * Endpoint de diagnóstico y prueba de conectividad REAL con los servicios externos
   */
  static async testService(req: Request, res: Response): Promise<void> {
    const service = String(req.params.service || '').toLowerCase();
    const bodySettings = req.body || {};

    try {
      if (service === 'all') {
        const [evo, groq, wh, so, local_db] = await Promise.all([
          AdminController.runInternalTest('evolution', bodySettings),
          AdminController.runInternalTest('groq', bodySettings),
          AdminController.runInternalTest('wisphub', bodySettings),
          AdminController.runInternalTest('smartolt', bodySettings),
          AdminController.runInternalTest('local_db', bodySettings),
        ]);

        const results = { evolution: evo, groq, wisphub: wh, smartolt: so, local_db };
        const allOk = Object.values(results).every((r: any) => r.success);

        res.json({
          success: allOk,
          results,
          message: allOk ? 'Todas las APIs e integraciones están conectadas y respondiendo en tiempo real.' : 'Se detectaron errores o advertencias en algunas integraciones.'
        });
        return;
      }

      const result = await AdminController.runInternalTest(service, bodySettings);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
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
          qr = qrRes.data?.base64 || qrRes.data?.qrcode?.base64 || qrRes.data?.code || qrRes.data?.qrcode?.code || null;
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
   * Obtiene la lista de todas las instancias / números de WhatsApp disponibles con sus áreas mapeadas
   */
  static async getWhatsAppInstances(_req: Request, res: Response): Promise<void> {
    try {
      const [instances, dbRecords] = await Promise.all([
        EvolutionService.fetchAllInstances(),
        DbService.getWhatsAppInstancesFromDb(),
      ]);

      const dbMap = new Map<string, any>();
      for (const rec of dbRecords) {
        dbMap.set(rec.instance_name.toLowerCase(), rec);
      }

      const merged = instances.map(inst => {
        const rec = dbMap.get(inst.name.toLowerCase());
        const areaName = rec?.area_name || (inst.name.toLowerCase().includes('soporte') ? 'Soporte Técnico' : (inst.name.toLowerCase().includes('atencion') ? 'Atención al Cliente' : inst.name));
        return {
          ...inst,
          area_name: areaName,
          description: rec?.description || null,
        };
      });

      res.json({ success: true, count: merged.length, instances: merged });
    } catch (error: any) {
      logger.error('Error al listar instancias WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene la lista de todas las áreas activas configuradas para WhatsApp
   */
  static async getWhatsAppAreas(_req: Request, res: Response): Promise<void> {
    try {
      const [dbAreas, liveInstances] = await Promise.all([
        DbService.getAllDistinctAreas(),
        EvolutionService.fetchAllInstances().catch(() => []),
      ]);

      const liveMap = new Map<string, any>();
      for (const inst of liveInstances) {
        liveMap.set(inst.name.toLowerCase(), inst);
      }

      const areas: Array<{
        area_name: string;
        instance_name: string;
        phone_number: string | null;
        connection_status: string;
        is_connected: boolean;
        profile_name: string | null;
      }> = [];

      // Si tenemos instancias reales en Evolution API, priorizarlas
      if (liveInstances.length > 0) {
        for (const live of liveInstances) {
          const matchedDb = dbAreas.find(a => a.instance_name.toLowerCase() === live.name.toLowerCase());
          let areaName = matchedDb?.area_name;
          if (!areaName) {
            const lower = live.name.toLowerCase();
            if (lower.includes('soporte') || lower.includes('tecnic')) areaName = 'Soporte Técnico';
            else if (lower.includes('atencion') || lower.includes('client')) areaName = 'Atención al Cliente';
            else if (lower.includes('ventas') || lower.includes('contrat')) areaName = 'Ventas';
            else if (lower.includes('cobranza') || lower.includes('pago')) areaName = 'Cobranza';
            else areaName = live.name;
          }

          areas.push({
            area_name: areaName,
            instance_name: live.name,
            phone_number: live.phone || matchedDb?.phone_number || null,
            connection_status: live.connectionStatus || 'close',
            is_connected: live.connectionStatus === 'open',
            profile_name: live.profileName || null,
          });
        }
      } else {
        // Fallback a dbAreas si no hay conexión temporal con Evolution API
        for (const a of dbAreas) {
          areas.push({
            area_name: a.area_name,
            instance_name: a.instance_name,
            phone_number: a.phone_number || null,
            connection_status: 'close',
            is_connected: false,
            profile_name: null,
          });
        }
      }

      res.json({ success: true, count: areas.length, areas });
    } catch (error: any) {
      logger.error('Error al listar áreas de WhatsApp:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Crea una nueva instancia de WhatsApp para vincular otro número y le asigna su área
   */
  static async createWhatsAppInstance(req: Request, res: Response): Promise<void> {
    try {
      const { name, area_name, description } = req.body || {};
      if (!name) {
        res.status(400).json({ success: false, error: 'El nombre de la instancia es obligatorio' });
        return;
      }
      const result = await EvolutionService.createInstance(name);
      if (result.success) {
        const cleanName = String(name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
        const finalArea = String(area_name || cleanName).trim();
        await DbService.upsertWhatsAppInstance({
          instance_name: cleanName,
          area_name: finalArea,
          description: description ? String(description).trim() : null,
        });
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
   * Actualiza el área o descripción de una instancia de WhatsApp
   */
  static async updateWhatsAppInstanceArea(req: Request, res: Response): Promise<void> {
    try {
      const instance = String(req.params.instance || '').trim();
      const { area_name, description, phone_number, is_active } = req.body || {};
      if (!instance || !area_name) {
        res.status(400).json({ success: false, error: 'Instancia y nombre de área son requeridos' });
        return;
      }
      await DbService.upsertWhatsAppInstance({
        instance_name: instance,
        area_name: String(area_name).trim(),
        phone_number: phone_number ? String(phone_number).trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        is_active: is_active !== undefined ? Number(is_active) : undefined,
      });
      res.json({ success: true, message: `Área "${area_name}" asignada a la instancia "${instance}".` });
    } catch (error: any) {
      logger.error(`Error al actualizar área de instancia ${req.params.instance}:`, error?.message || error);
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
      await DbService.deleteWhatsAppInstanceRecord(instance);
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
   * Obtiene la lista de grupos configurados para oficinas y tickets
   */
  static async getOfficeGroups(req: Request, res: Response): Promise<void> {
    try {
      const groups = await DbService.getAllOfficeGroups();
      const currentActivationJid = await DbService.getActivationsGroupJid();
      res.json({ success: true, groups, currentActivationJid });
    } catch (error: any) {
      logger.error('Error al obtener grupos de oficinas:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Guarda o actualiza un grupo de oficina (soporta enlace de invitación o JID directo)
   */
  static async saveOfficeGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, jid, invite_link, role, office, zones, is_active } = req.body;
      let targetJid = String(jid || '').trim();
      let targetName = String(name || '').trim();

      // Si viene enlace pero no JID (o JID inválido), resolver con Evolution API
      if (invite_link && (!targetJid || !targetJid.endsWith('@g.us'))) {
        const resolved = await EvolutionService.resolveAndJoinGroupInvite(invite_link);
        if (resolved.success && resolved.jid) {
          targetJid = resolved.jid;
          if (!targetName) targetName = resolved.name || 'Grupo WhatsApp';
        } else if (!targetJid) {
          res.status(400).json({ success: false, error: resolved.message || 'No se pudo resolver el enlace de invitación de WhatsApp.' });
          return;
        }
      }

      if (!targetJid) {
        res.status(400).json({ success: false, error: 'Se requiere el JID o un enlace de invitación válido del grupo.' });
        return;
      }

      const id = await DbService.saveOfficeGroup({
        name: targetName || 'Grupo WhatsApp',
        jid: targetJid,
        invite_link: invite_link || null,
        role: role || 'TICKETS_OFICINA',
        office: office || null,
        zones: zones || null,
        is_active: is_active !== false && is_active !== 0 ? 1 : 0,
      });

      res.json({
        success: true,
        id,
        jid: targetJid,
        name: targetName,
        message: `Grupo "${targetName}" guardado correctamente.`,
      });
    } catch (error: any) {
      logger.error('Error al guardar grupo de oficina:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Elimina un grupo de oficina
   */
  static async deleteOfficeGroup(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de grupo no válido' });
        return;
      }
      const success = await DbService.deleteOfficeGroup(id);
      res.json({ success, message: success ? 'Grupo eliminado' : 'No se pudo eliminar el grupo' });
    } catch (error: any) {
      logger.error('Error al eliminar grupo de oficina:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Alterna el estado activo de un grupo de oficina
   */
  static async toggleOfficeGroupActive(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const rawActive = req.body.isActive !== undefined ? req.body.isActive : req.body.is_active;
      const isActive = rawActive === true || rawActive === 1 || rawActive === '1' || rawActive === 'true';
      const success = await DbService.toggleOfficeGroupActive(id, isActive);
      res.json({ success, is_active: isActive, message: success ? (isActive ? 'Grupo activado' : 'Grupo desactivado') : 'No se pudo actualizar el estado' });
    } catch (error: any) {
      logger.error('Error al alternar estado de grupo:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Envía un mensaje de prueba al grupo de WhatsApp
   */
  static async testOfficeGroup(req: Request, res: Response): Promise<void> {
    try {
      const { jid, name } = req.body;
      if (!jid || !String(jid).endsWith('@g.us')) {
        res.status(400).json({ success: false, error: 'JID de grupo no válido (debe terminar en @g.us)' });
        return;
      }
      const groupLabel = name ? ` "${name}"` : '';
      const testMsg = `🔔 *Mensaje de Prueba - CloudWareMx*\n\nEl bot de WhatsApp se ha vinculado correctamente a este grupo${groupLabel}.\n\nDesde aquí podrás recibir tickets derivados de oficinas y notificaciones operativas en tiempo real. 🚀`;
      await EvolutionService.enviarTexto(jid, testMsg, { instant: true });
      res.json({ success: true, message: `Mensaje de prueba enviado exitosamente al grupo.` });
    } catch (error: any) {
      logger.error('Error al enviar mensaje de prueba a grupo:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Deriva o transfiere un ticket a un grupo de oficina de WhatsApp
   */
  static async forwardTicketToOffice(req: Request, res: Response): Promise<void> {
    try {
      const folio = req.params.folio;
      const { groupJid, customNotes } = req.body;

      if (!folio || !groupJid) {
        res.status(400).json({ success: false, error: 'Folio de ticket y JID de grupo de destino requeridos.' });
        return;
      }

      const result = await DbService.forwardTicketToOfficeGroup(folio, groupJid, customNotes);
      if (result.success) {
        res.json({ success: true, message: result.message, groupName: result.groupName });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (error: any) {
      logger.error('Error al transferir ticket a grupo:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Dispara la sincronización de SmartOLT hacia Base de Datos Local
   */
  static async syncSmartOlt(req: Request, res: Response): Promise<void> {
    try {
      const force = req.body?.force === true;
      const result = await SmartOLTService.syncAllOnusToLocalDb(force);
      res.json(result);
    } catch (error: any) {
      logger.error('Error en syncSmartOlt controller:', error?.message || error);
      res.status(500).json({ success: false, count: 0, message: error?.message || 'Error al sincronizar' });
    }
  }

  /**
   * Obtiene estadísticas de ONUs guardadas en Base de Datos Local
   */
  static async getSmartOltStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await DbService.getSmartOltSyncStats();
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
      const rawTickets = await DbService.getAllTicketsDetailed(status, limit);
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

      const ok = await DbService.updateTicketStatus(folio, status.toUpperCase(), notes);
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
      const stats = await DbService.getTicketStats();
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
   * Dispara la sincronización completa de clientes de WispHub a Base de Datos Local (100% solo lectura de API)
   */
  static async syncWisphub(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Iniciando sincronización manual de clientes WispHub...');
      const result = await WispHubService.syncAllClientesToLocalDb();
      res.json({
        success: result.success,
        message: result.message || `Sincronización completada: ${result.count} clientes procesados en Base de Datos Local.`,
        stats: result,
      });
    } catch (error: any) {
      logger.error('Error al sincronizar WispHub:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene estadísticas de sincronización de WispHub en Base de Datos Local
   */
  static async getWisphubStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await DbService.getWisphubSyncStats();
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

      const result = await DbService.getAuditIpCross({ filter, search, page, limit });
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
   * Activa o desactiva un pool de VLAN para asignación por el bot
   */
  static async toggleIpamPoolActive(req: Request, res: Response): Promise<void> {
    try {
      const vlan = String(req.params.vlan || req.body?.vlan || '').trim();
      const active = req.body?.active !== false && req.body?.is_active !== 0 && req.body?.is_active !== false;
      if (!vlan) {
        res.status(400).json({ success: false, error: 'VLAN requerida' });
        return;
      }
      const ok = await IpamService.toggleVlanPoolActive(vlan, active);
      if (ok) {
        res.json({
          success: true,
          vlan,
          isActive: active,
          message: active ? `Pool VLAN ${vlan} activado para el bot.` : `Pool VLAN ${vlan} pausado (el bot no asignará IPs de este pool).`
        });
      } else {
        res.status(500).json({ success: false, error: 'No se pudo cambiar el estado del pool' });
      }
    } catch (error: any) {
      logger.error(`Error al alternar estado de pool VLAN ${req.params.vlan}:`, error?.message || error);
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
  // CAMBIO DE MÓDEM (REEMPLAZO DE ONU)
  // ==========================================

  /**
   * Obtiene la lista de ONUs activas para el buscador de cambio de módem
   */
  static async getModemSwapOnus(req: Request, res: Response): Promise<void> {
    try {
      const search = String(req.query.q || '').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '30'), 10), 100);

      if (search) {
        const matches = await DbService.searchOnusFuzzy(search, limit);
        res.json({ success: true, count: matches.length, onus: matches });
      } else {
        const active = await DbService.getAllSmartOltOnus();
        res.json({ success: true, count: active.length, onus: active.slice(0, limit) });
      }
    } catch (error: any) {
      logger.error('Error al listar ONUs para cambio de módem:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene los detalles completos de una ONU para la tarjeta de cambio de módem
   */
  static async getModemSwapOnuDetails(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '').trim();
      if (!id) {
        res.status(400).json({ success: false, error: 'Identificador de ONU requerido' });
        return;
      }

      const details = await SmartOLTService.getOnuDetails(id);
      if (details) {
        res.json({ success: true, details });
      } else {
        res.status(404).json({ success: false, error: 'ONU no encontrada' });
      }
    } catch (error: any) {
      logger.error('Error al obtener detalles de ONU para cambio de módem:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Ejecuta el cambio de módem
   */
  static async executeModemSwap(req: Request, res: Response): Promise<void> {
    try {
      const { old_onu_id, new_sn, technician_name, technician_phone, override_olt_id, override_board, override_port, notify_group } = req.body;

      if (!old_onu_id || !new_sn) {
        res.status(400).json({ success: false, error: 'Se requieren old_onu_id y new_sn' });
        return;
      }

      const user = (req as any).user;
      const techName = technician_name || user?.name || user?.username || 'Administrador Web';

      const result = await SmartOLTService.executeModemSwap({
        oldOnuIdOrSn: old_onu_id,
        newSn: new_sn,
        technicianName: techName,
        technicianPhone: technician_phone || null,
        overrideOltId: override_olt_id,
        overrideBoard: override_board,
        overridePort: override_port,
        notifyGroup: notify_group !== false,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      logger.error('Error al ejecutar cambio de módem:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene el historial de cambios de módem
   */
  static async getModemSwapHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
      const history = await DbService.getModemSwaps(limit);
      res.json({ success: true, count: history.length, history });
    } catch (error: any) {
      logger.error('Error al obtener historial de cambios de módem:', error?.message || error);
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
      const technicians = await DbService.getTechnicians();
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

      const tech = await DbService.createTechnician({
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
      const ok = await DbService.updateTechnician(id, {
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

      const ok = await DbService.deleteTechnician(id);
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

      const explicitActive = req.body?.is_active ?? req.body?.isActive;
      const result = await DbService.toggleTechnicianActive(id, explicitActive);
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

      const search_nombre = req.query.search_nombre ? String(req.query.search_nombre) : undefined;
      const search_servicio = req.query.search_servicio ? String(req.query.search_servicio) : undefined;
      const search_ip = req.query.search_ip ? String(req.query.search_ip) : undefined;
      const search_estado = req.query.search_estado ? String(req.query.search_estado) : undefined;
      const search_plan = req.query.search_plan ? String(req.query.search_plan) : undefined;
      const search_router = req.query.search_router ? String(req.query.search_router) : undefined;
      const search_telefono = req.query.search_telefono ? String(req.query.search_telefono) : undefined;
      const search_direccion = req.query.search_direccion ? String(req.query.search_direccion) : undefined;
      const search_gps = req.query.search_gps ? String(req.query.search_gps) : undefined;

      const data = await DbService.getClientsDirectory({
        search,
        status,
        search_nombre,
        search_servicio,
        search_ip,
        search_estado,
        search_plan,
        search_router,
        search_telefono,
        search_direccion,
        search_gps,
        limit,
        offset,
      });

      res.json({
        success: true,
        clients: data.clients,
        routers: data.routers || [],
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

      const client = await DbService.getClientDetail(id);
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

      const ok = await DbService.updateClientLocation(id, {
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

      const ok = await DbService.updateWisphubClientTelefonos(
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

  /**
   * Despacha la orden de trabajo con geolocalización y datos técnicos a uno o múltiples técnicos vía WhatsApp
   */
  static async dispatchLocationToTechnicians(req: Request, res: Response): Promise<void> {
    try {
      const clientId = String(req.params.id || req.body?.client_id || '');
      const { tech_phones, custom_notes } = req.body || {};

      if (!clientId) {
        res.status(400).json({ success: false, error: 'ID de cliente requerido' });
        return;
      }
      if (!Array.isArray(tech_phones) || tech_phones.length === 0) {
        res.status(400).json({ success: false, error: 'Debes seleccionar al menos un técnico destinatario' });
        return;
      }

      const clientDetail = await DbService.getClientDetail(clientId);
      if (!clientDetail) {
        res.status(404).json({ success: false, error: 'Cliente no encontrado en la base de datos' });
        return;
      }

      const coords = clientDetail.coordenadas_gps || '';
      const mapsUrl = clientDetail.google_maps_url || (coords ? `https://www.google.com/maps?q=${coords}` : '');

      let dispatchMsg =
        `*ASIGNACION DE TRABAJO*\n\n` +
        `*Nombre:* ${clientDetail.nombre}\n` +
        `*IP:* ${clientDetail.ip || 'No asignada'}\n` +
        `*Ubicacion:* ${mapsUrl || (clientDetail.direccion || 'Sin ubicacion registrada')}\n`;

      if (custom_notes && String(custom_notes).trim()) {
        dispatchMsg += `*Descripcion:* ${String(custom_notes).trim()}\n`;
      }

      const { EvolutionService } = await import('../services/evolution.service');
      let sentCount = 0;
      const errors: string[] = [];

      for (const rawPhone of tech_phones) {
        const cleanPhone = String(rawPhone).replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
          try {
            const ok = await EvolutionService.enviarTexto(cleanPhone, dispatchMsg);
            if (ok) {
              sentCount++;
              await DbService.logMessage(cleanPhone, 'OUT', dispatchMsg, 'DESPACHO_TECNICO', 'ADMIN_PANEL');
            } else {
              errors.push(`No se pudo entregar a ${cleanPhone}`);
            }
          } catch (e: any) {
            errors.push(`${cleanPhone}: ${e?.message || e}`);
          }
        }
      }

      AdminController.broadcastSSE('tech:location_dispatched', {
        clientId,
        clientName: clientDetail.nombre,
        techniciansSent: sentCount,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        sent_count: sentCount,
        message: `Orden despachada exitosamente a ${sentCount} técnico(s).`,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      logger.error(`Error al despachar orden de cliente ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  // ==========================================
  // CONTINGENCIAS Y CAÍDAS DE RED (OUTAGES)
  // ==========================================

  static async getActiveOutages(_req: Request, res: Response): Promise<void> {
    try {
      const outages = await DbService.getActiveOutages();
      res.json({ success: true, outages });
    } catch (error: any) {
      logger.error('Error al obtener caídas activas:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  static async getOutagesHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(String(req.query.limit || '50'), 10);
      const outages = await DbService.getAllOutages(limit);
      res.json({ success: true, outages });
    } catch (error: any) {
      logger.error('Error al obtener historial de caídas:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  static async getOutageZones(_req: Request, res: Response): Promise<void> {
    try {
      const zones = await DbService.getDistinctZones();
      res.json({ success: true, zones });
    } catch (error: any) {
      logger.error('Error al obtener zonas:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  static async createOutage(req: Request, res: Response): Promise<void> {
    try {
      const { zone_name, estimated_time, notes } = req.body || {};
      if (!zone_name || !String(zone_name).trim()) {
        res.status(400).json({ success: false, error: 'Nombre de la zona requerido' });
        return;
      }

      const outage = await DbService.createOutage({
        zone_name: String(zone_name).trim(),
        estimated_time: estimated_time ? String(estimated_time).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
      });

      // Broadcast SSE
      AdminController.broadcastSSE('outages:update', {
        action: 'created',
        outage,
      });

      res.json({
        success: true,
        outage,
        message: `Falla masiva declarada para la zona "${zone_name}". El bot aplicará contingencia automática a los abonados afectados.`,
      });
    } catch (error: any) {
      logger.error('Error al declarar caída de red:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  static async resolveOutage(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(String(req.params.id || ''), 10);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ success: false, error: 'ID de contingencia inválido' });
        return;
      }

      const ok = await DbService.resolveOutage(id);
      if (ok) {
        // Broadcast SSE
        AdminController.broadcastSSE('outages:update', {
          action: 'resolved',
          id,
        });

        res.json({
          success: true,
          message: 'Contingencia de red normalizada. El bot regresa a diagnóstico habitual para esta zona.',
        });
      } else {
        res.status(404).json({ success: false, error: 'Contingencia no encontrada' });
      }
    } catch (error: any) {
      logger.error(`Error al normalizar contingencia ${req.params.id}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  // ==========================================
  // GESTIÓN Y EXPLORADOR DE BASE DE DATOS
  // ==========================================

  /**
   * Obtiene estadísticas generales, latencia y lista de tablas de la base de datos
   */
  static async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await getDatabaseStatsInfo();
      res.json({ success: true, ...stats });
    } catch (error: any) {
      logger.error('Error al obtener estadísticas de la BD:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Obtiene los registros y esquema de una tabla específica
   */
  static async getDatabaseTableData(req: Request, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const { page, limit, search, sortBy, sortDir } = req.query;

      const data = await getTableDataAndSchema(String(table), {
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
        search: search ? String(search) : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        sortDir: sortDir ? String(sortDir) : undefined,
      });

      res.json({ success: true, ...data });
    } catch (error: any) {
      logger.error(`Error al consultar tabla ${req.params.table}:`, error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Ejecuta una consulta SQL en vivo en la base de datos
   */
  static async executeDatabaseQuery(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        res.status(400).json({ success: false, error: 'La consulta SQL es requerida' });
        return;
      }

      const result = await executeCustomQuery(sql);
      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Error al ejecutar consulta SQL en BD:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Optimiza y compacta la base de datos (VACUUM)
   */
  static async optimizeDatabase(req: Request, res: Response): Promise<void> {
    try {
      const result = await dbOptimize();
      res.json(result);
    } catch (error: any) {
      logger.error('Error al optimizar BD:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Descarga un respaldo (backup) directo del archivo SQLite local
   */
  static async downloadDatabaseBackup(req: Request, res: Response): Promise<void> {
    try {
      const localPath = getLocalDbFilePath();
      if (!fs.existsSync(localPath)) {
        res.status(404).json({ success: false, error: 'El archivo de base de datos local aún no existe o está usando Base de Datos Local en la nube.' });
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      res.download(localPath, `chatbot_backup_${dateStr}.db`);
    } catch (error: any) {
      logger.error('Error al descargar respaldo de BD:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Cambia el modo / motor de base de datos (Local SQLite vs Base de Datos Local)
   */
  static async switchDatabaseMode(req: Request, res: Response): Promise<void> {
    try {
      const { mode, dbUrl, dbToken } = req.body;

      if (mode === 'local') {
        const localUrl = 'file:./data/chatbot.db';
        resetDatabaseConnection(localUrl, '');
        await initDatabase();
        // Guardar en settings para persistencia
        await SettingsService.set('DATABASE_MODE', 'local');
        await SettingsService.set('DATABASE_URL', localUrl);
        await SettingsService.set('DB_AUTH_TOKEN', '');
        res.json({ 
          success: true, 
          message: 'Base de datos cambiada a SQLite Local en Servidor (VPS KVM 1). Sin límites de consultas.',
          mode: 'local',
          url: localUrl
        });
      } else if (mode === 'local_db') {
        if (!dbUrl) {
          res.status(400).json({ success: false, error: 'La URL de Base de Datos Local es obligatoria para el modo nube' });
          return;
        }
        resetDatabaseConnection(dbUrl, dbToken || '');
        await SettingsService.set('DATABASE_MODE', 'local_db');
        await SettingsService.set('DATABASE_URL', dbUrl);
        await SettingsService.set('DB_AUTH_TOKEN', dbToken || '');
        await initDatabase();
        res.json({ 
          success: true, 
          message: 'Base de datos conectada exitosamente a Base de Datos Local.',
          mode: 'local_db',
          url: dbUrl
        });
      } else {
        res.status(400).json({ success: false, error: 'Modo de base de datos desconocido' });
      }
    } catch (error: any) {
      logger.error('Error al cambiar modo de BD:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }

  /**
   * Clona e importa automáticamente todas las tablas y datos de Base de Datos Local hacia la base de datos local SQLite en VPS
   */
  static async autoMigrateFromRemoteDb(req: Request, res: Response): Promise<void> {
    try {
      const dbUrl = req.body?.dbUrl || (await SettingsService.get('DATABASE_URL')) || config.db.url;
      const dbToken = req.body?.dbToken || (await SettingsService.get('DB_AUTH_TOKEN')) || config.db.authToken;

      if (!dbUrl || dbUrl.startsWith('file:')) {
        res.status(400).json({ success: false, error: 'No se especificó una URL de Base de Datos Local válida para clonar.' });
        return;
      }

      logger.info(`Iniciando clonación y migración de Base de Datos Local (${dbUrl}) hacia SQLite Local...`);

      const remoteClient = createClient({
        url: dbUrl,
        authToken: dbToken,
      });

      const localPath = getLocalDbFilePath();
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const localClient = createClient({
        url: `file:${localPath.replace(/\\/g, '/')}`,
      });

      // 1. Obtener tablas de Base de Datos Local
      const tablesRes = await remoteClient.execute(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'
        ORDER BY name ASC;
      `);

      let totalMigratedRows = 0;
      const migratedTables: Array<{ name: string; rows: number }> = [];

      for (const row of tablesRes.rows) {
        const tableName = String(row.name);
        const createSql = String(row.sql);

        // Crear tabla en local
        await localClient.execute(`DROP TABLE IF EXISTS "${tableName}";`);
        await localClient.execute(createSql);

        // Leer datos de remoto
        const dataRes = await remoteClient.execute(`SELECT * FROM "${tableName}";`);
        const rowCount = dataRes.rows.length;

        if (rowCount > 0) {
          const cols = dataRes.columns;
          const placeholders = cols.map(() => '?').join(', ');
          const insertSql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

          // Lotes de 100
          const batchSize = 100;
          for (let i = 0; i < rowCount; i += batchSize) {
            const chunk = dataRes.rows.slice(i, i + batchSize);
            const stmts = chunk.map(r => ({
              sql: insertSql,
              args: cols.map(c => r[c]),
            }));
            await localClient.batch(stmts, 'write');
          }
        }

        totalMigratedRows += rowCount;
        migratedTables.push({ name: tableName, rows: rowCount });
      }

      // Índices
      const indexRes = await remoteClient.execute(`
        SELECT sql FROM sqlite_master 
        WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
      `);
      for (const row of indexRes.rows) {
        try {
          await localClient.execute(String(row.sql));
        } catch (_) {}
      }

      // Cambiar modo a local
      const localUrl = 'file:./data/chatbot.db';
      resetDatabaseConnection(localUrl, '');
      await SettingsService.set('DATABASE_MODE', 'local');
      await SettingsService.set('DATABASE_URL', localUrl);
      await SettingsService.set('DB_AUTH_TOKEN', '');

      logger.info(`Migración completada con éxito: ${totalMigratedRows} filas transferidas en ${migratedTables.length} tablas.`);

      res.json({
        success: true,
        message: `¡Migración completada con éxito! Se transfirieron ${totalMigratedRows.toLocaleString()} registros de ${migratedTables.length} tablas a SQLite Local en tu VPS.`,
        totalMigratedRows,
        migratedTables,
      });
    } catch (error: any) {
      logger.error('Error durante la migración de Base de Datos Local a local:', error?.message || error);
      res.status(500).json({ success: false, error: error?.message || error });
    }
  }
}

