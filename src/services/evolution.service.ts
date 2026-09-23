import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax, randomDelay } from '../utils/spintax';
import { LidRegistry } from '../utils/lid-registry';

const logger = new Logger('EvolutionService');

export interface BotButton {
  id: string;
  title: string;
}

export class EvolutionService {
  private static api: AxiosInstance | null = null;
  private static lastUrl: string = '';
  private static lastKey: string = '';

  private static getApi(): AxiosInstance {
    let url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
    if (process.env.EVOLUTION_URL && process.env.EVOLUTION_URL.includes('evolution_api') && url.includes('localhost:8080')) {
      url = process.env.EVOLUTION_URL.replace(/\/+$/, '');
    }
    const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);

    if (!this.api || this.lastUrl !== url || this.lastKey !== apiKey) {
      this.lastUrl = url;
      this.lastKey = apiKey;
      this.api = axios.create({
        baseURL: url,
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 12000,
      });
    }
    return this.api;
  }

  static getInstanceName(): string {
    return SettingsService.get('INSTANCE_NAME', 'INSTANCE_NAME', config.evolution.instanceName);
  }

  private static formatRecipient(phone: string): string {
    const trimmed = phone.trim();
    if (trimmed.includes('@lid')) {
      return trimmed;
    }

    let clean = trimmed.replace(/\D/g, '');
    if (clean.length === 10) {
      clean = `521${clean}`;
    } else if (clean.startsWith('52') && !clean.startsWith('521') && clean.length === 12) {
      clean = `521${clean.slice(2)}`;
    }

    // Si el contacto tiene un LID registrado, redirigir al LID para garantizar entrega
    const mappedLid = LidRegistry.getLid(clean);
    if (mappedLid) {
      logger.info(`[LID Router] Redirigiendo envío de ${clean} a hilo activo LID: ${mappedLid}`);
      return mappedLid;
    }

    if (trimmed.includes('@s.whatsapp.net')) {
      return trimmed;
    }

    return clean;
  }

  /**
   * Envía un mensaje de texto simple con simulación de presencia 'composing' y spintax
   */
  static async enviarTexto(
    phone: string,
    mensajeRaw: string,
    opciones: { delayMin?: number; delayMax?: number; isBroadcast?: boolean; instant?: boolean; instanceName?: string } = {}
  ): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const mensaje = parseSpintax(mensajeRaw);
    const instance = opciones.instanceName || this.getInstanceName();

    // Regla Anti-Ban: Jitter de 8 a 15 segundos si es difusión, o de 1.2 a 2.5s si es interactivo regular
    // En modo instantáneo (técnicos / activaciones) no se añade retraso artificial
    if (opciones.instant) {
      // Modo instantáneo directo para técnicos
    } else if (opciones.isBroadcast) {
      const waitTime = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
      logger.info(`[Anti-Ban] Aplicando jitter de difusión: ${waitTime}ms para ${recipient} (Instancia: ${instance})`);
      await new Promise((r) => setTimeout(r, waitTime));
    } else if (opciones.delayMin !== 0 || opciones.delayMax !== 0) {
      await randomDelay(opciones.delayMin || 1200, opciones.delayMax || 2500);
    }

    try {
      logger.info(`Enviando mensaje de texto a ${recipient} vía [${instance}]${opciones.instant ? ' (Modo Instantáneo)' : ''}`);
      const api = this.getApi();
      const response = await api.post(`/message/sendText/${instance}`, {
        number: recipient,
        text: mensaje,
        options: {
          delay: 0,
        },
      });

      const sentId = response.data?.key?.id;
      if (sentId) {
        this.registrarMensajeEnviadoPorBot(sentId);
      }

      return true;
    } catch (error: any) {
      logger.error(`Error al enviar mensaje a ${recipient} en instancia [${instance}]:`, error?.response?.data || error?.message || error);
      return false;
    }
  }

  private static botSentMessageIds = new Set<string>();

  /**
   * Registra el ID de un mensaje enviado por el bot para no confundirlo con intervención humana
   */
  static registrarMensajeEnviadoPorBot(id: string): void {
    if (!id) return;
    this.botSentMessageIds.add(id);
    // Limpiar después de 3 minutos
    setTimeout(() => {
      this.botSentMessageIds.delete(id);
    }, 180000);
  }

  /**
   * Verifica si un mensaje saliente (fromMe) fue emitido por el bot o por un operador humano
   */
  static esMensajeEnviadoPorBot(id: string): boolean {
    return this.botSentMessageIds.has(id);
  }

  /**
   * Envía presencia a WhatsApp ('composing' = escribiendo..., 'paused' = pausa)
   */
  static async enviarPresencia(phone: string, presence: 'composing' | 'paused' = 'composing', delayMs: number = 3000, instanceName?: string): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const instance = instanceName || this.getInstanceName();
    try {
      const api = this.getApi();
      await api.post(`/chat/sendPresence/${instance}`, {
        number: recipient,
        presence,
        delay: delayMs,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Envía un menú interactivo formateado de forma clara y moderna
   * Usa texto estructurado con emojis y números para garantizar 100% de entrega en WhatsApp móvil
   */
  static async enviarBotones(
    phone: string,
    textoPrincipal: string,
    botones: BotButton[],
    pieDePagina: string = 'CloudWareMx Soporte Automático',
    opciones: { delayMin?: number; delayMax?: number; isBroadcast?: boolean; instant?: boolean; instanceName?: string } = {}
  ): Promise<boolean> {
    const recipient = this.formatRecipient(phone);
    const texto = parseSpintax(textoPrincipal);

    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const opcionesTexto = botones
      .map((b, i) => `${numberEmojis[i] || `*${i + 1}.*`} ${b.title}`)
      .join('\n');

    const mensajeCompleto = `${texto}\n\n${opcionesTexto}\n\n_${pieDePagina}_\n_Por favor responde con el número de tu opción (ej. 1, 2 o 3) o describe tu duda._`;

    const instance = opciones.instanceName || this.getInstanceName();
    logger.info(`Enviando menú estructurado a ${recipient} vía [${instance}]: ${botones.map((b) => b.title).join(' | ')}`);
    return this.enviarTexto(recipient, mensajeCompleto, opciones);
  }

  /**
   * Descarga el archivo base64 de un mensaje multimedia (audio, imagen o documento) desde Evolution API
   */
  static async getBase64FromMedia(messageObj: any, instanceName?: string): Promise<{ buffer: Buffer; mimeType: string; base64: string } | null> {
    try {
      // 1. Si el payload del webhook ya incluye base64 directo
      const directBase64 = messageObj.base64 || messageObj.message?.base64;
      if (directBase64 && typeof directBase64 === 'string') {
        const cleanBase64 = directBase64.replace(/^data:[^;]+;base64,/, '');
        const mimeType = messageObj.mimetype || messageObj.message?.mimetype || 'audio/ogg';
        return {
          buffer: Buffer.from(cleanBase64, 'base64'),
          mimeType,
          base64: cleanBase64,
        };
      }

      // 2. Si no, consultar el endpoint de descarga de Evolution API
      const api = this.getApi();
      const instance = instanceName || this.getInstanceName();
      logger.info(`Solicitando base64 de archivo multimedia para mensaje a Evolution API [${instance}]...`);

      const response = await api.post(`/chat/getBase64FromMediaMessage/${instance}`, {
        message: messageObj,
        convertToMp4: false,
      });

      const resData = response.data;
      const base64Data = resData?.base64 || resData?.data?.base64;
      const mimeType = resData?.mimetype || resData?.data?.mimetype || messageObj.message?.audioMessage?.mimetype || messageObj.message?.imageMessage?.mimetype || 'audio/ogg';

      if (base64Data && typeof base64Data === 'string') {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        return {
          buffer: Buffer.from(cleanBase64, 'base64'),
          mimeType,
          base64: cleanBase64,
        };
      }

      return null;
    } catch (error: any) {
      logger.warn('No se pudo descargar base64 de Evolution API:', error?.response?.data || error?.message || error);
      return null;
    }
  }

  /**
   * Verifica el estado de la instancia en Evolution API y re-habilita el webhook
   */
  static async verifyAndEnableWebhook(instanceName?: string, webhookBaseUrl?: string): Promise<{ state: string; webhookOk: boolean }> {
    const url = SettingsService.get('EVOLUTION_URL', 'EVOLUTION_URL', config.evolution.url).replace(/\/+$/, '');
    const apiKey = SettingsService.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', config.evolution.apiKey);
    const instance = instanceName || this.getInstanceName();

    if (!apiKey || apiKey.includes('tu_api_key')) {
      return { state: 'unconfigured', webhookOk: false };
    }

    try {
      const api = this.getApi();
      let state = 'close';
      try {
        const stateRes = await api.get(`/instance/connectionState/${instance}`);
        state = stateRes.data?.instance?.state || 'close';
      } catch (err: any) {
        logger.warn(`Error al consultar estado de instancia Evolution "${instance}":`, err?.message || err);
      }

      let webhookOk = false;
      let baseAppUrl = SettingsService.get('APP_URL', 'APP_URL', config.appUrl).replace(/\/+$/, '');
      if (!baseAppUrl || baseAppUrl.includes('localhost') || baseAppUrl.includes('127.0.0.1')) {
        baseAppUrl = process.env.EVOLUTION_URL?.includes('evolution_api')
          ? `http://chatbot_app:${config.port || 3000}`
          : `http://2.25.241.239:${config.port || 3000}`;
      }
      const targetUrl = webhookBaseUrl || `${baseAppUrl}/webhook`;

      try {
        await api.post(`/webhook/set/${instance}`, {
          webhook: {
            enabled: true,
            url: targetUrl,
            byEvents: false,
            base64: true,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE'
            ],
          },
        });
        webhookOk = true;
        logger.info(`Webhook de Evolution API re-sincronizado exitosamente hacia: ${targetUrl} (Instancia: ${instance}, Estado WhatsApp: ${state})`);
      } catch (e: any) {
        logger.warn(`No se pudo re-sincronizar webhook en Evolution para [${instance}]:`, e?.response?.data || e?.message || e);
      }

      return { state, webhookOk };
    } catch (err: any) {
      logger.error(`Error al verificar Evolution API en instancia [${instance}]:`, err?.message || err);
      return { state: 'error', webhookOk: false };
    }
  }

  /**
   * Extrae el código de invitación de un enlace o texto de WhatsApp
   */
  static extractGroupInviteCode(linkOrCode: string): string {
    const clean = (linkOrCode || '').trim();
    const match = clean.match(/(?:chat\.whatsapp\.com\/|invite\/)?([a-zA-Z0-9_-]{20,28})/i);
    return match ? match[1] : clean.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Consulta la información de un grupo mediante enlace de invitación o código y opcionalmente une al bot
   */
  static async resolveAndJoinGroupInvite(linkOrCode: string, instanceName?: string): Promise<{ success: boolean; jid?: string; name?: string; message?: string }> {
    const clean = (linkOrCode || '').trim();

    // Si ya es un JID directo (ej: 1203630XXXXX@g.us)
    if (clean.endsWith('@g.us')) {
      return {
        success: true,
        jid: clean,
        name: 'Grupo WhatsApp',
        message: `JID de grupo ${clean} validado.`,
      };
    }

    const code = this.extractGroupInviteCode(clean);
    if (!code) {
      return { success: false, message: 'Enlace o código de invitación inválido.' };
    }

    const api = this.getApi();
    const instance = instanceName || this.getInstanceName();

    try {
      let groupJid = '';
      let groupName = '';

      // 1. Obtener información de la invitación
      try {
        const infoRes = await api.get(`/group/inviteInfo/${instance}`, {
          params: { inviteCode: code },
          timeout: 8000,
        });
        const d = infoRes.data;
        groupJid = d?.id || d?.jid || d?.groupId || '';
        groupName = d?.subject || d?.name || 'Grupo Activaciones';
      } catch (err: any) {
        logger.warn(`No se pudo obtener inviteInfo para "${code}" en [${instance}]:`, err?.response?.data || err?.message);
      }

      // 2. Unir a la instancia al grupo si no está unida
      try {
        const joinRes = await api.post(`/group/acceptInviteCode/${instance}`, null, {
          params: { inviteCode: code },
          timeout: 8000,
        });
        const jd = joinRes.data;
        if (!groupJid) {
          groupJid = jd?.id || jd?.groupId || jd?.jid || '';
        }
      } catch (joinErr: any) {
        try {
          await api.post(`/group/joinGroup/${instance}`, { inviteCode: code });
        } catch {}
      }

      // 3. Si aún no tenemos el JID, consultar la lista de grupos activos
      if (!groupJid) {
        const allGroups = await this.fetchAllGroups(instance);
        const found = allGroups.find(
          (g) => (groupName && g.subject.toLowerCase() === groupName.toLowerCase()) || g.subject.toLowerCase().includes('activac')
        );
        if (found) {
          groupJid = found.id;
          groupName = found.subject;
        }
      }

      if (groupJid) {
        return {
          success: true,
          jid: groupJid,
          name: groupName || 'Grupo Activaciones',
          message: `Grupo "${groupName || groupJid}" vinculado exitosamente en instancia [${instance}].`,
        };
      }

      return {
        success: false,
        message: 'No se pudo resolver el ID del grupo con ese enlace. Asegúrate de que la instancia de WhatsApp esté conectada.',
      };
    } catch (error: any) {
      logger.error('Error al resolver enlace de grupo:', error?.response?.data || error?.message || error);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Error al conectar con Evolution API',
      };
    }
  }

  /**
   * Obtiene la lista de todos los grupos donde la instancia de WhatsApp es miembro
   */
  static async fetchAllGroups(instanceName?: string): Promise<Array<{ id: string; subject: string; size?: number }>> {
    try {
      const api = this.getApi();
      const instance = instanceName || this.getInstanceName();
      const res = await api.get(`/group/fetchAllGroups/${instance}`, {
        params: { getParticipants: false },
        timeout: 8000,
      });
      const data = res.data;
      const groups = Array.isArray(data) ? data : (data?.groups || data?.response || []);
      return groups
        .map((g: any) => ({
          id: String(g.id || g.jid || ''),
          subject: String(g.subject || g.name || 'Sin nombre'),
          size: g.size || g.participants?.length || 0,
        }))
        .filter((g: any) => g.id.includes('@g.us'));
    } catch (err: any) {
      logger.warn('Error al obtener lista de grupos:', err?.response?.data || err?.message);
      return [];
    }
  }
  static async fetchAllInstances(): Promise<Array<{
    name: string;
    connectionStatus: string;
    ownerJid: string | null;
    phone: string | null;
    profileName: string | null;
    profilePictureUrl: string | null;
    isActive: boolean;
    updatedAt?: string;
  }>> {
    try {
      const api = this.getApi();
      const currentActive = this.getInstanceName();
      const res = await api.get('/instance/fetchInstances', { timeout: 8000 });
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.instances || res.data?.response || []);
      
      const instances = rawList.map((inst: any) => {
        const name = String(inst.instance?.instanceName || inst.name || inst.instanceName || '');
        const state = String(inst.instance?.state || inst.connectionStatus || inst.state || 'close').toLowerCase();
        const ownerJid = inst.instance?.owner || inst.owner || inst.ownerJid || null;
        let phone: string | null = null;
        if (ownerJid) {
          phone = String(ownerJid).split('@')[0].replace(/\D/g, '');
        }
        const profileName = inst.instance?.profileName || inst.profileName || null;
        const profilePictureUrl = inst.instance?.profilePictureUrl || inst.profilePictureUrl || inst.profilePicUrl || null;
        
        return {
          name,
          connectionStatus: state,
          ownerJid: ownerJid ? String(ownerJid) : null,
          phone,
          profileName: profileName ? String(profileName) : null,
          profilePictureUrl: profilePictureUrl ? String(profilePictureUrl) : null,
          isActive: name.toLowerCase() === currentActive.toLowerCase(),
          updatedAt: inst.instance?.updatedAt || inst.updatedAt || undefined,
        };
      }).filter((item: any) => Boolean(item.name));

      // Si la lista vino vacía pero tenemos la instancia activa configurada, agregarla como fallback
      if (instances.length === 0 && currentActive) {
        const { state } = await this.verifyAndEnableWebhook(currentActive);
        instances.push({
          name: currentActive,
          connectionStatus: state,
          ownerJid: null,
          phone: null,
          profileName: 'Instancia Principal',
          profilePictureUrl: null,
          isActive: true,
        });
      }

      return instances;
    } catch (err: any) {
      logger.warn('Error al obtener lista de instancias Evolution API:', err?.response?.data || err?.message || err);
      // Fallback a instancia activa
      const currentActive = this.getInstanceName();
      return [{
        name: currentActive,
        connectionStatus: 'close',
        ownerJid: null,
        phone: null,
        profileName: 'Instancia Principal',
        profilePictureUrl: null,
        isActive: true,
      }];
    }
  }

  /**
   * Crea una nueva instancia de WhatsApp en Evolution API y sincroniza su webhook automáticamente
   */
  static async createInstance(name: string): Promise<{ success: boolean; instance?: any; message: string }> {
    const cleanName = String(name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (!cleanName) {
      return { success: false, message: 'El nombre de la instancia es inválido (solo letras, números y guiones).' };
    }

    try {
      const api = this.getApi();
      const res = await api.post('/instance/create', {
        instanceName: cleanName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });

      // Configurar webhook inmediatamente en la nueva instancia
      await this.verifyAndEnableWebhook(cleanName);

      logger.info(`Nueva instancia WhatsApp "${cleanName}" creada exitosamente en Evolution API.`);
      return {
        success: true,
        instance: res.data?.instance || res.data,
        message: `Instancia "${cleanName}" creada. Escanea el código QR con WhatsApp para vincularla.`,
      };
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al crear instancia en Evolution API';
      logger.error(`Error al crear instancia "${cleanName}":`, errorMsg);
      return { success: false, message: Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg) };
    }
  }

  /**
   * Obtiene el código QR base64 para vincular una instancia específica
   */
  static async getInstanceQr(name?: string): Promise<{ state: string; qr: string | null; pairingCode?: string | null }> {
    const instance = name || this.getInstanceName();
    try {
      const api = this.getApi();
      let state = 'close';
      try {
        const stateRes = await api.get(`/instance/connectionState/${instance}`, { timeout: 4000 });
        state = stateRes.data?.instance?.state || 'close';
      } catch (stateErr: any) {
        // Si la instancia no existe en Evolution API, crearla automáticamente
        if (stateErr?.response?.status === 404 || String(stateErr?.response?.data?.message || '').toLowerCase().includes('not found')) {
          logger.info(`Instancia "${instance}" no encontrada en Evolution API. Creándola automáticamente...`);
          await this.createInstance(instance);
        }
      }

      if (state === 'open') {
        return { state: 'open', qr: null };
      }

      let qrRes = await api.get(`/instance/connect/${instance}`, { timeout: 6000 });
      let qr = qrRes.data?.base64 || qrRes.data?.qrcode?.base64 || qrRes.data?.code || qrRes.data?.qrcode?.code || null;
      let pairingCode = qrRes.data?.pairingCode || qrRes.data?.qrcode?.pairingCode || null;

      // Si retornó { count: 0 } o vino vacío, intentar consultar fetchInstances
      if (!qr && state !== 'open') {
        try {
          const fetchRes = await api.get('/instance/fetchInstances', { timeout: 6000 });
          const raw = Array.isArray(fetchRes.data) ? fetchRes.data : (fetchRes.data?.instances || []);
          const found = raw.find((i: any) => (i.name || i.instance?.instanceName || '').toLowerCase() === instance.toLowerCase());
          if (found) {
            qr = found.qrcode?.base64 || found.instance?.qrcode?.base64 || found.qrcode?.code || null;
            pairingCode = found.qrcode?.pairingCode || found.instance?.qrcode?.pairingCode || null;
            state = found.connectionStatus || found.instance?.state || state;
          }
        } catch {}
      }

      return { state, qr, pairingCode };
    } catch (err: any) {
      logger.warn(`No se pudo obtener QR para instancia "${instance}":`, err?.response?.data || err?.message || err);
      return { state: 'close', qr: null };
    }
  }

  /**
   * Desconecta (logout) una instancia de WhatsApp
   */
  static async disconnectInstance(name?: string): Promise<boolean> {
    const instance = name || this.getInstanceName();
    try {
      const api = this.getApi();
      await api.delete(`/instance/logout/${instance}`, { timeout: 6000 });
      logger.info(`Instancia "${instance}" desvinculada exitosamente.`);
      return true;
    } catch (err: any) {
      logger.warn(`Error al desvincular instancia "${instance}":`, err?.response?.data || err?.message || err);
      return false;
    }
  }

  /**
   * Elimina completamente una instancia de Evolution API
   */
  static async deleteInstance(name: string): Promise<boolean> {
    const cleanName = String(name || '').trim();
    if (!cleanName) return false;
    try {
      const api = this.getApi();
      await api.delete(`/instance/delete/${cleanName}`, { timeout: 6000 });
      logger.info(`Instancia "${cleanName}" eliminada de Evolution API.`);
      return true;
    } catch (err: any) {
      logger.warn(`Error al eliminar instancia "${cleanName}":`, err?.response?.data || err?.message || err);
      return false;
    }
  }

  /**
   * Reinicia una instancia en Evolution API
   */
  static async restartInstance(name?: string): Promise<boolean> {
    const instance = name || this.getInstanceName();
    try {
      const api = this.getApi();
      await api.post(`/instance/restart/${instance}`, {}, { timeout: 6000 });
      return true;
    } catch {
      return false;
    }
  }
}

