import { TursoService, Session } from '../services/turso.service';
import { GroqService, GroqClassificationResult, GroqImageAnalysisResult, ContratoInstalacionDatos, ActivacionModificacionesParsed } from '../services/groq.service';
import { WispHubService, WispHubCliente } from '../services/wisphub.service';
import { SmartOLTService, SmartOltStatusResult, getSmartOltSpeedProfiles, AuthorizeOnuPayload } from '../services/smartolt.service';
import { MercadoPagoService } from '../services/mercadopago.service';
import { IpamService } from '../services/ipam.service';
import { EvolutionService, BotButton } from '../services/evolution.service';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax } from '../utils/spintax';
import { cleanPersonName, computeNameMatchScore, normalizeText } from '../utils/fuzzy-matcher';

const logger = new Logger('BotOrchestrator');

/**
 * Limpia y formatea el nombre del cliente para mostrarlo cálido, humano y sin códigos o prefijos de contrato:
 * - Elimina prefijos numéricos como "696-", "0696-", "1234 - ", etc.
 * - Si soloPrimerNombre = true, toma el nombre de pila principal (ej. "Maria del Pilar" o "Carlos") evitando apellidos largos.
 */
export function formatDisplayName(rawName?: string | null, soloPrimerNombre: boolean = false): string {
  if (!rawName) return '';
  let clean = rawName.replace(/^[\d\s\-#_.]+/i, '').trim();
  if (!clean) return rawName.trim();

  if (soloPrimerNombre) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length <= 2) {
      return parts.join(' ');
    }
    const firstLower = parts[0].toLowerCase();
    const secondLower = parts[1].toLowerCase();
    if (['maria', 'maría', 'juan', 'jose', 'josé', 'ana', 'luis', 'carlos'].includes(firstLower) && parts.length >= 2) {
      if (['del', 'de', 'la'].includes(secondLower) && parts.length >= 3) {
        return `${parts[0]} ${parts[1]} ${parts[2]}`; // ej. Maria del Pilar
      }
      return `${parts[0]} ${parts[1]}`; // ej. Juan Carlos
    }
    return parts[0];
  }

  return clean;
}

export interface IncomingMessageEvent {
  phone: string;
  remoteJid?: string;
  senderName?: string;
  text?: string;
  buttonId?: string;
  isMedia?: boolean;
  imageAnalysis?: GroqImageAnalysisResult | null;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    name?: string;
    url?: string;
    isLive?: boolean;
  } | null;
  instanceName?: string;
}

export class BotOrchestrator {
  private static readonly MAIN_MENU_BUTTONS: BotButton[] = [
    { id: 'BTN_SALDO', title: '💳 Consultar Saldo' },
    { id: 'BTN_FALLA', title: '🔧 Reportar Falla' },
    { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
  ];

  private static activeInstanceByPhone = new Map<string, string>();

  private static humanTakeoverMap = new Map<string, {
    untilMs: number;
    untilIso: string;
    status: 'OPERATOR_ACTIVE' | 'OPERATOR_WAITING_CLIENT' | 'RESOLVED' | 'BOT';
    reason?: string;
  }>();

  /**
   * Calcula el tiempo de pausa adaptado al horario de atención de oficina (hora Hidalgo, México)
   * Si la pausa ocurre fuera de horario o cerca de la salida (después de 18:00), se extiende hasta las 10:00 AM del siguiente día hábil.
   */
  static calcularPausaInteligente(minutos: number = 240, forzarHastaManana: boolean = false): {
    untilMs: number;
    untilIso: string;
    minutosReales: number;
    descripcion: string;
  } {
    const now = new Date();
    // Hora en zona horaria México (Hidalgo)
    const nowMxStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const nowMx = new Date(nowMxStr);
    const hourMx = nowMx.getHours();

    let targetMs = now.getTime() + minutos * 60 * 1000;
    let descripcion = `${minutos} minutos`;

    if (forzarHastaManana || hourMx >= 18 || hourMx < 8) {
      // Calcular próximo día a las 10:00 AM hora México
      const targetMx = new Date(nowMx);
      if (hourMx >= 18) {
        targetMx.setDate(targetMx.getDate() + 1);
      }
      targetMx.setHours(10, 0, 0, 0);

      // Si cae domingo (0), pasar al lunes
      if (targetMx.getDay() === 0) {
        targetMx.setDate(targetMx.getDate() + 1);
      }

      const diffMs = targetMx.getTime() - nowMx.getTime();
      if (diffMs > 0 && (forzarHastaManana || diffMs > minutos * 60 * 1000)) {
        targetMs = now.getTime() + diffMs;
        const diffMins = Math.ceil(diffMs / 60000);
        descripcion = `Hasta mañana 10:00 AM (${diffMins} min)`;
        return {
          untilMs: targetMs,
          untilIso: new Date(targetMs).toISOString(),
          minutosReales: diffMins,
          descripcion,
        };
      }
    }

    return {
      untilMs: targetMs,
      untilIso: new Date(targetMs).toISOString(),
      minutosReales: minutos,
      descripcion,
    };
  }

  /**
   * Pausa las respuestas automáticas del bot para un número específico y persiste en Turso DB
   */
  static async activarPausaOperador(
    phone: string,
    minutos: number = 240,
    razon?: string,
    status: 'OPERATOR_ACTIVE' | 'OPERATOR_WAITING_CLIENT' = 'OPERATOR_ACTIVE',
    forzarHastaManana: boolean = false
  ): Promise<{ untilIso: string; minutos: number; descripcion: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const calculo = this.calcularPausaInteligente(minutos, forzarHastaManana);

    this.humanTakeoverMap.set(cleanPhone, {
      untilMs: calculo.untilMs,
      untilIso: calculo.untilIso,
      status,
      reason: razon,
    });

    try {
      await TursoService.setHumanTakeover(cleanPhone, calculo.untilIso, status);
    } catch (err: any) {
      logger.warn(`Error al persistir human takeover para ${cleanPhone}:`, err?.message || err);
    }

    logger.info(`[Human Takeover] Bot silenciado para ${cleanPhone} por ${calculo.descripcion} (${razon || 'Operador en WhatsApp'}).`);
    return {
      untilIso: calculo.untilIso,
      minutos: calculo.minutosReales,
      descripcion: calculo.descripcion,
    };
  }

  /**
   * Reactiva el bot para un número específico y limpia estado en Turso DB
   */
  static async reanudarBot(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    this.humanTakeoverMap.delete(cleanPhone);
    try {
      await TursoService.clearHumanTakeover(cleanPhone);
    } catch (err: any) {
      logger.warn(`Error al limpiar human takeover para ${cleanPhone}:`, err?.message || err);
    }
    logger.info(`[Human Takeover] Bot reactivado para ${cleanPhone}.`);
  }

  /**
   * Finaliza la intervención humana cuando el operador envía una despedida (ej. "buen día") o pulsa Finalizar en el panel.
   * Quita la pausa y reinicia el estado de la sesión en Turso para que el siguiente mensaje empiece limpiamente desde 0.
   */
  static async finalizarIntervencionHumana(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    this.humanTakeoverMap.delete(cleanPhone);
    try {
      await TursoService.clearHumanTakeover(cleanPhone);
      const session = await TursoService.getSession(cleanPhone);
      let metaObj: any = {};
      try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}

      metaObj.consultaFinalizada = true;
      metaObj.consultaFinalizadaAt = new Date().toISOString();
      metaObj.comprobacionIniciada = null;
      metaObj.resumenFalla = null;
      metaObj.ticketFolio = null;
      metaObj.pendingServices = [];

      await TursoService.upsertSession({
        phone: cleanPhone,
        step: 'CONSULTA_FINALIZADA',
        metadata: JSON.stringify(metaObj),
        human_takeover_until: null,
        human_takeover_status: 'BOT',
      });
      logger.info(`[Human Takeover] Conversación finalizada por operador para ${cleanPhone}. Próximo mensaje iniciará desde 0.`);
    } catch (err: any) {
      logger.warn(`Error al finalizar intervención humana para ${cleanPhone}:`, err?.message || err);
    }
  }

  /**
   * Consulta si el bot está pausado para un número y cuántos minutos le restan
   * Verifica memoria y base de datos Turso DB de forma resiliente ante reinicios
   */
  static estaBotPausado(phone: string, session?: Session | null): {
    pausado: boolean;
    minutosRestantes: number;
    status: string;
    untilIso: string | null;
  } {
    const cleanPhone = phone.replace(/\D/g, '');
    const entry = this.humanTakeoverMap.get(cleanPhone);

    if (entry) {
      const remainingMs = entry.untilMs - Date.now();
      if (remainingMs > 0) {
        return {
          pausado: true,
          minutosRestantes: Math.ceil(remainingMs / 60000),
          status: entry.status,
          untilIso: entry.untilIso,
        };
      } else {
        this.humanTakeoverMap.delete(cleanPhone);
        TursoService.clearHumanTakeover(cleanPhone).catch(() => {});
      }
    }

    // Si no está en memoria pero la sesión de Turso tiene human_takeover_until
    const dbUntilIso = session?.human_takeover_until;
    if (dbUntilIso) {
      const dbUntilMs = new Date(dbUntilIso).getTime();
      const remainingMs = dbUntilMs - Date.now();
      if (!isNaN(dbUntilMs) && remainingMs > 0) {
        const dbStatus = (session?.human_takeover_status as any) || 'OPERATOR_ACTIVE';
        this.humanTakeoverMap.set(cleanPhone, {
          untilMs: dbUntilMs,
          untilIso: dbUntilIso,
          status: dbStatus,
        });
        return {
          pausado: true,
          minutosRestantes: Math.ceil(remainingMs / 60000),
          status: dbStatus,
          untilIso: dbUntilIso,
        };
      } else {
        // Expiró en DB
        TursoService.clearHumanTakeover(cleanPhone).catch(() => {});
      }
    }

    return { pausado: false, minutosRestantes: 0, status: 'BOT', untilIso: null };
  }

  private static getIspName(): string {
    return SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name);
  }

  /**
   * Determina si la hora actual está fuera del horario laboral de oficina (9:00 AM a 6:00 PM hora Hidalgo, México)
   */
  private static isFueraDeHorario(): boolean {
    try {
      const startStr = SettingsService.get('WORK_HOURS_START', 'WORK_HOURS_START', '09:00');
      const endStr = SettingsService.get('WORK_HOURS_END', 'WORK_HOURS_END', '18:00');
      const [startH, startM] = startStr.split(':').map(n => parseInt(n, 10));
      const [endH, endM] = endStr.split(':').map(n => parseInt(n, 10));

      // Obtener hora local exacta en la zona horaria de Hidalgo / México (America/Mexico_City)
      const nowMexicoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
      const nowMexico = new Date(nowMexicoStr);
      const currentH = nowMexico.getHours();
      const currentM = nowMexico.getMinutes();

      const cur = currentH * 60 + currentM;
      const start = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);
      const end = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);

      return cur < start || cur >= end;
    } catch {
      return false;
    }
  }

  /**
   * Genera el texto con los datos bancarios oficiales configurados en el panel
   */
  /**
   * Limpia y formatea el nombre del cliente para mostrarlo de forma humana, cálida y natural
   * (Elimina prefijos numéricos como '696-', '0696-', contratos, puntos finales y deja solo nombres de pila o nombres limpios).
   */
  private static formatDisplayName(rawName?: string | null, soloPrimerNombre: boolean = false): string {
    if (!rawName) return '';
    let name = rawName
      .replace(/^0*\d+[\s\-_:]+/g, '') // Elimina prefijos numéricos como "696-", "0696-", "1144 - "
      .replace(/\s*\(.*?\)/g, '')
      .replace(/[.\-_]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name) return '';

    // Si solo queremos el primer nombre o nombres de pila (ej. "Maria del Pilar" de "Maria del Pilar Perez Mendoza")
    if (soloPrimerNombre) {
      const parts = name.split(' ');
      if (parts.length >= 2 && ['maria', 'ma.', 'ma', 'jose', 'juan'].includes(parts[0].toLowerCase())) {
        if (parts.length >= 3 && ['del', 'de', 'la'].includes(parts[1].toLowerCase())) {
          return `${parts[0]} ${parts[1]} ${parts[2]}`;
        }
        return `${parts[0]} ${parts[1]}`;
      }
      return parts[0];
    }

    return name;
  }

  private static getFichaBancaria(session: Session | null): string {
    const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA Bancomer');
    const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0152433212 90');
    const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());
    const officeWeekday = SettingsService.get('OFFICE_HOURS_WEEKDAY', 'OFFICE_HOURS_WEEKDAY', '9:00 a 18:00 hrs');
    const officeSaturday = SettingsService.get('OFFICE_HOURS_SATURDAY', 'OFFICE_HOURS_SATURDAY', '9:00 a 15:00 hrs');
    const officeAddress = SettingsService.get('OFFICE_ADDRESS', 'OFFICE_ADDRESS', '').trim();
    const clientName = this.formatDisplayName(session?.client_name) || 'tu nombre completo';

    let txt = `\n🏢 *Pago en Oficina Física:*\n` +
      `• *Lunes a Viernes:* ${officeWeekday}\n` +
      `• *Sábados:* ${officeSaturday}\n` +
      (officeAddress ? `• *Dirección:* ${officeAddress}\n` : '') +
      `\n🏦 *Pago por Transferencia Bancaria:*\n` +
      `• *Banco:* ${bank}\n` +
      `• *CLABE / Cuenta:* \`${account}\`\n` +
      `• *Titular:* ${beneficiary}\n` +
      `• *Concepto / Motivo:* *${session?.client_name || clientName}*\n\n` +
      `📸 *Envío de Comprobante:*\n` +
      `Al realizar tu transferencia, por favor envíanos la captura o foto de tu comprobante por aquí para aplicarlo de inmediato a tu cuenta.`;

    return txt;
  }

  /**
   * Obtiene o genera dinámicamente un enlace de cobro de Mercado Pago con el monto y contrato exacto
   */
  private static async obtenerLinkMercadoPago(params: {
    clientName?: string | null;
    clientId?: string | number | null;
    phone: string;
    monto: number;
    folioFactura?: string | number | null;
  }): Promise<string | null> {
    const { clientName, clientId, phone, monto, folioFactura } = params;

    // 1. Si hay un Access Token de Mercado Pago configurado, crear preferencia dinámica
    try {
      let contratoId = '';
      const matchContrato = (clientName || '').match(/^0*(\d+)/);
      if (matchContrato) contratoId = matchContrato[1];

      const dynamicLink = await MercadoPagoService.crearPreferenciaPago({
        clienteNombre: clientName || 'Cliente',
        clienteId: clientId,
        contratoId: contratoId || clientId,
        phone,
        monto: monto > 0 ? monto : 250,
        folioFactura: folioFactura || null,
      });

      if (dynamicLink) {
        return dynamicLink;
      }
    } catch (err: any) {
      logger.warn('No se pudo generar preferencia dinámica en Mercado Pago:', err?.message || err);
    }

    // 2. Si no se pudo generar dinámicamente, usar link fijo configurado en Settings (si existe)
    const fixedLink = SettingsService.get('PAYMENT_MERCADOPAGO_URL', 'MERCADOPAGO_URL', '').trim();
    return fixedLink || null;
  }

  /**
   * Obtiene la instancia de Evolution API asignada activamente a un teléfono
   */
  static getActiveInstance(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    return this.activeInstanceByPhone.get(clean) || this.activeInstanceByPhone.get(phone) || EvolutionService.getInstanceName();
  }

  /**
   * Envía un mensaje y lo registra automáticamente en la tabla conversation_logs de Turso
   */
  private static async enviarYLoguear(
    phone: string,
    mensaje: string,
    intencion: string | null = null,
    accion: string | null = null,
    targetJid?: string,
    botones?: BotButton[],
    instantOverride?: boolean,
    instanceName?: string
  ): Promise<boolean> {
    const textoFinal = parseSpintax(mensaje);
    const dest = targetJid || phone;
    const cleanKey = phone.replace(/\D/g, '');
    const instance = instanceName || (targetJid && this.activeInstanceByPhone.get(targetJid)) || this.activeInstanceByPhone.get(cleanKey) || this.activeInstanceByPhone.get(phone) || EvolutionService.getInstanceName();

    const esTecnico = instantOverride ?? (
      intencion === 'ACTIVACION_TECNICO' ||
      intencion === 'CAMBIO_PAQUETE_TECNICO' ||
      (accion || '').includes('TECNICO') ||
      (accion || '').includes('ACTIVACION') ||
      (accion || '').includes('CONTRATO')
    );
    let ok = false;
    if (botones && botones.length > 0) {
      ok = await EvolutionService.enviarBotones(dest, textoFinal, botones, undefined, { instant: esTecnico, instanceName: instance });
    } else {
      ok = await EvolutionService.enviarTexto(dest, textoFinal, { instant: esTecnico, instanceName: instance });
    }
    await TursoService.logMessage(phone, 'OUT', textoFinal, intencion, accion);
    return ok;
  }

  /**
   * Punto de entrada principal para todos los mensajes recibidos desde WhatsApp
   * Modo Conversacional Inteligente con Groq (Llama 3.1)
   */
  static async procesarMensaje(event: IncomingMessageEvent): Promise<void> {
    const { phone } = event;
    const targetJid = event.remoteJid || phone;
    const rawText = (event.text || '').trim();
    const buttonId = event.buttonId;
    const instance = (event.instanceName || EvolutionService.getInstanceName()).trim();

    // Registrar la instancia activa para este teléfono
    const cleanPhone = phone.replace(/\D/g, '');
    this.activeInstanceByPhone.set(cleanPhone, instance);
    this.activeInstanceByPhone.set(phone, instance);
    if (event.remoteJid) {
      this.activeInstanceByPhone.set(event.remoteJid, instance);
    }

    // 0. Obtener sesión de Turso DB
    let session = await TursoService.getSession(phone);
    if (instance) {
      TursoService.updateLastInstance(phone, instance).catch(() => {});
    }
    const inputContent = rawText || (buttonId ? `[Botón: ${buttonId}]` : (event.isMedia ? '[Foto/Comprobante]' : '[Desconocido]'));
    const lowerMsg = rawText.toLowerCase().trim();

    // Detección anticipada de comandos y flujos de técnicos de campo
    const esComandoCambioPaquete = /(?:cambiar|modificar|actualizar|subir|bajar)\s+(?:de\s+)?(?:paquete|plan|velocidad|megas)\b/i.test(rawText) ||
      /^cambiar\s+(?:paquete|plan)\b/i.test(lowerMsg);

    const esComandoCambioModem = /^(?:cambio\s+de\s+m[oó]dem|reemplazar\s+m[oó]dem|reemplazo\s+de\s+m[oó]dem|cambiar\s+m[oó]dem|swap\s+modem|swap\s+onu)\b/i.test(lowerMsg) ||
      /\b(?:cambio|reemplazo)\s+de\s+m[oó]dem\b/i.test(lowerMsg);

    const esComandoActivacion = buttonId === 'BTN_ACTIVAR_MODEM' ||
      /^(?:activar|activaci[oó]n|alta|aprovisionar|registrar)\b/i.test(lowerMsg) ||
      /(?:activar|activaci[oó]n|alta|aprovisionar|registrar)\s*(?:de\s+)?(?:cliente|modem|onu|equipo|serie)?[:\s]*/i.test(rawText) ||
      lowerMsg.startsWith('activar') ||
      lowerMsg.startsWith('activaci') ||
      lowerMsg.startsWith('alta') ||
      lowerMsg.startsWith('aprovisionar') ||
      lowerMsg.startsWith('registrar') ||
      (event.imageAnalysis as any)?.tipo === 'CONTRATO_INSTALACION' ||
      (event.imageAnalysis as any)?.tipo_documento === 'CONTRATO_INSTALACION';

    const esPasoTecnicoEnCurso = session?.step?.startsWith('ACTIVACION_') ||
      session?.step === 'PENDIENTE_CONFIRMACION_ACTIVACION_ONU' ||
      session?.step === 'PENDIENTE_SN_ACTIVACION' ||
      session?.step === 'PENDIENTE_SELECCION_IP_CAMBIO_MODEM' ||
      session?.step === 'PENDIENTE_CONFIRMACION_CAMBIO_MODEM';

    const esAccionTecnica = esComandoActivacion || esComandoCambioPaquete || esComandoCambioModem || esPasoTecnicoEnCurso;

    // 1. Verificar si hay Intervención Humana activa (Memoria o Turso DB)
    // EXCEPCIÓN: Comandos técnicos, fotos de contratos y activaciones NUNCA son bloqueados por human takeover
    if (esAccionTecnica) {
      await this.finalizarIntervencionHumana(phone);
    } else {
      const estadoPausa = this.estaBotPausado(phone, session);
      if (estadoPausa.pausado) {
        logger.info(`[Human Takeover] Bot en pausa para ${phone} (${estadoPausa.minutosRestantes}m restantes). Intervención humana activa.`);
        // Registrar mensaje entrante en la auditoría
        await TursoService.logMessage(phone, 'IN', inputContent, 'INTERVENCION_HUMANA', 'MENSAJE_CLIENTE_DURANTE_TAKEOVER');

        // Ventana deslizable: otorgar 60 minutos adicionales de gracia al operador para responder
        await this.activarPausaOperador(phone, 60, 'Ventana deslizable: respuesta del cliente durante atención humana', 'OPERATOR_WAITING_CLIENT');

        // Notificar a la bandeja del operador en tiempo real vía SSE
        try {
          const { AdminController } = require('../controllers/admin.controller');
          AdminController.broadcastSSE('chat:message', {
            phone,
            direction: 'IN',
            message: inputContent,
            created_at: new Date().toISOString(),
            is_paused: true,
            status: 'OPERATOR_WAITING_CLIENT',
          });
        } catch {}

        return;
      }
    }

    // 2. Control de Sesión Inactiva / Stale Session (> 24 horas)
    if (session && session.last_interaction) {
      const diffHours = (Date.now() - new Date(session.last_interaction).getTime()) / (1000 * 60 * 60);
      if (diffHours >= 24) {
        logger.info(`[Auto-Reset] Sesión de ${phone} inactiva por ${Math.round(diffHours)}h (>24h). Reiniciando limpiamente a paso inicial.`);
        await TursoService.clearHumanTakeover(phone);
        let metaReset: any = {};
        try { metaReset = JSON.parse(session.metadata || '{}'); } catch {}
        metaReset.consultaFinalizada = false;
        metaReset.comprobacionIniciada = null;
        metaReset.resumenFalla = null;
        metaReset.ticketFolio = null;
        metaReset.pendingServices = [];

        session = await TursoService.upsertSession({
          phone,
          step: 'CONVERSACIONAL',
          metadata: JSON.stringify(metaReset),
          human_takeover_until: null,
          human_takeover_status: 'BOT',
        });
      }
    }

    // Registrar mensaje entrante en la auditoría de Turso
    await TursoService.logMessage(phone, 'IN', inputContent, null, 'MENSAJE_ENTRANTE');

    if (!session) {
      session = await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
      });
    }

    // Silencio de Cortesía ante respuestas breves de acuse si la consulta ya concluyó o hay reporte activo:
    const confirmacionesCortas = [
      'ok', 'okey', 'oki', 'okis', 'esta bien', 'está bien', 'enterado', 'enterada',
      'de acuerdo', 'quedo al pendiente', 'al pendiente', 'gracias', 'muchas gracias',
      'muchas gracias por la ayuda', 'va', 'sale', 'le aviso', 'te aviso', 'perfecto', 'listo',
      'buen dia', 'buen día', 'saludos', 'buenas tardes', 'buenas noches'
    ];

    let metaObjPre: any = {};
    try { metaObjPre = JSON.parse(session?.metadata || '{}'); } catch {}
    const consultaCerradaPre = metaObjPre.consultaFinalizada === true || session?.step === 'CONSULTA_FINALIZADA';

    if (confirmacionesCortas.includes(lowerMsg) && (consultaCerradaPre || metaObjPre.ticketFolio)) {
      logger.info(`[Silencio de Cortesía] Cliente ${phone} envió confirmación "${lowerMsg}". El bot guarda silencio.`);
      return;
    }

    // 2. Control Anti-Spam (Opt-Out): si el usuario escribe cancelar o baja
    if (['CANCELAR', 'BAJA', 'NO ENVIAR', 'STOP'].includes(rawText.toUpperCase())) {
      await TursoService.setOptOut(phone, true);
      await this.enviarYLoguear(
        phone,
        `{Entendido|Listo}. Has cancelado la suscripción de avisos automáticos de *${this.getIspName()}*. Si en el futuro deseas volver a activarlos, escribe *ACTIVAR*.`,
        'CANCELAR_SUSCRIPCION',
        'OPTOUT_CONFIRMADO',
        targetJid
      );
      return;
    }

    if (rawText.toUpperCase() === 'ACTIVAR' && session?.opt_out === 1) {
      await TursoService.setOptOut(phone, false);
      await this.enviarYLoguear(
        phone,
        `¡Bienvenido de vuelta! 🎉 Has reactivado las notificaciones y soporte de *${this.getIspName()}*. ¿En qué podemos colaborarte el día de hoy?`,
        'ACTIVAR',
        'OPTIN_CONFIRMADO',
        targetJid
      );
      return;
    }

    // Si está en lista de exclusión y no envió 'ACTIVAR', no molestamos
    if (session?.opt_out === 1) {
      logger.info(`El usuario ${phone} tiene opt_out activo. Ignorando mensaje saliente.`);
      return;
    }

    // 2.0 RECEPCIÓN DE UBICACIÓN GPS / GOOGLE MAPS COMPARTIDO (Mapeo automático de clientes)
    if (event.location && (event.location.latitude || event.location.url)) {
      await this.procesarUbicacionCliente(phone, event.location, session, targetJid);
      return;
    }

    // 2.0 RECEPCIÓN DE IMÁGENES / MULTIMEDIA (SPEEDTEST, FOTOS DE MÓDEM, COMPROBANTES DE PAGO, CONTRATOS)
    if (event.isMedia && event.imageAnalysis) {
      await this.procesarImagenInteligente(phone, rawText, event, session, targetJid);
      return;
    }

    // 2.1 CONTINUACIÓN DE COMPROBANTE DE PAGO (TEXTO COMPLEMENTARIO CON NOMBRE/UBICACIÓN TRAS ENVIAR VOUCHER)
    if (session?.step === 'ESPERANDO_DATOS_PAGO') {
      await this.procesarDatosPagoComplementarios(phone, rawText, session, targetJid);
      return;
    }

    // 2.2 ACTIVACIÓN DE ONUS (TÉCNICOS DE CAMPO):
    // A. Esperando Nombre y Folio del cliente
    if (session?.step === 'ACTIVACION_ESPERANDO_NOMBRE') {
      await this.procesarNombreActivacionTecnico(phone, rawText, session, targetJid);
      return;
    }

    // B. Esperando Zona / Región de instalación
    if (session?.step === 'ACTIVACION_ESPERANDO_ZONA') {
      await this.procesarZonaActivacionTecnico(phone, rawText, buttonId, session, targetJid);
      return;
    }

    // C. Confirmación de activación pendiente (SÍ / NO / Modificaciones / Botones / Dígitos SN)
    if (session?.step === 'PENDIENTE_CONFIRMACION_ACTIVACION_ONU' || session?.step === 'PENDIENTE_SN_ACTIVACION') {
      const esConfirmacion = buttonId === 'BTN_CONFIRMAR_ACTIVACION' ||
        /^(si|sí|confirmar|confirmo|adelante|autorizar|dale|ok|1|activar)\b/i.test(lowerMsg);
      const esCancelacion = buttonId === 'BTN_CANCELAR_ACTIVACION' ||
        /^(no|cancelar|cancelo|rechazar|abortar|0)\b/i.test(lowerMsg);

      if (esConfirmacion) {
        await this.procesarConfirmacionActivacionOnu(phone, session, targetJid, true);
        return;
      }
      if (esCancelacion) {
        await this.procesarConfirmacionActivacionOnu(phone, session, targetJid, false);
        return;
      }

      // Si no es confirmación ni cancelación, procesar como modificación en caliente / entrada de SN
      await this.procesarModificacionActivacionEnCaliente(phone, rawText, session, targetJid);
      return;
    }

    // D.1 Selección de IP / Servicio en Cambio de Módem cuando hay múltiples servicios
    if (session?.step === 'PENDIENTE_SELECCION_IP_CAMBIO_MODEM') {
      await this.procesarSeleccionIpCambioModem(phone, rawText, session, targetJid);
      return;
    }

    // D.2 Confirmación de cambio de módem pendiente (SÍ / NO)
    if (session?.step === 'PENDIENTE_CONFIRMACION_CAMBIO_MODEM') {
      const esConfirmacion = buttonId === 'BTN_CONFIRMAR_CAMBIO_MODEM' ||
        /^(si|sí|confirmar|confirmo|adelante|autorizar|dale|ok|1|cambiar|ejecutar|reemplazar)\b/i.test(lowerMsg);
      const esCancelacion = buttonId === 'BTN_CANCELAR_CAMBIO_MODEM' ||
        /^(no|cancelar|cancelo|rechazar|abortar|0)\b/i.test(lowerMsg);

      if (esConfirmacion) {
        await this.procesarConfirmacionCambioModemTecnico(phone, session, targetJid, true);
        return;
      }
      if (esCancelacion) {
        await this.procesarConfirmacionCambioModemTecnico(phone, session, targetJid, false);
        return;
      }
    }

    // 2.0 CONTROL INTELIGENTE DE COMANDOS TÉCNICOS VS CLIENTES
    const authTecnico = await this.verificarAutorizacionTecnico(phone, rawText);

    if (authTecnico.autorizado) {
      // Caso 1: El técnico pregunta por TR-069, SmartOLT o comandos aislados ("activar tr069", "activar smart", "activar ya que se trata")
      if (this.esConsultaTr069OSmartOLT(rawText)) {
        await this.enviarGuiaTr069Tecnico(phone, targetJid);
        return;
      }

      // Caso 2: El técnico solicita cambio de paquete en caliente en SmartOLT
      if (esComandoCambioPaquete) {
        await this.procesarCambioPaqueteTecnico(phone, rawText, session, targetJid);
        return;
      }

      // Caso 3: El técnico envía comando de cambio / reemplazo de módem
      if (esComandoCambioModem) {
        await this.procesarSolicitudCambioModemTecnico(phone, rawText, session, targetJid);
        return;
      }

      // Caso 4: El técnico envía comando de activación
      if (esComandoActivacion) {
        await this.procesarSolicitudActivacionTecnico(phone, rawText, session, targetJid);
        return;
      }
    } else {
      // Remitente NO es técnico registrado:
      // ¿Es un intento EXPLÍCITO de comando de instalación técnica de campo?
      // Solo restringir si explícitamente usa botones técnicos, PIN o sintaxis de OLT ("activar cliente SN...")
      const esIntentoTecnicoExplicito = buttonId === 'BTN_ACTIVAR_MODEM' ||
        /\b(?:pin|clave)\s*[:=\s]*\d{4,8}\b/i.test(rawText) ||
        /^(?:activar|alta|aprovisionar)\s+(?:cliente|modem|onu|equipo|serie)\b/i.test(rawText) ||
        /^(?:activar|alta)\s+[A-Fa-f0-9]{5,16}\b/i.test(rawText);

      if (esIntentoTecnicoExplicito) {
        await this.enviarYLoguear(
          phone,
          `⚠️ *Acceso Restringido - Área Técnica*\n\nTu número (*${phone}*) no está registrado como técnico autorizado para activar equipos en SmartOLT.\n\n👉 Si eres instalador o técnico en campo, solicita tu alta o proporciona tu *PIN de seguridad* al administrador en el panel.`,
          'ACTIVACION_TECNICO',
          'NO_AUTORIZADO',
          targetJid
        );
        return;
      }

      // Si es un cliente residencial solicitando activar su servicio tras pagar ("ya pagué, activen mi servicio", "activar internet")
      const esSolicitudReactivacionCliente = /(?:activar|activen|reactivar|reconectar|reanudaci[oó]n)\s*(?:mi\s+)?(?:servicio|internet|linea|cuenta|paquete|señal)?/i.test(lowerMsg) ||
        /(?:ya\s+(?:pagu[eé]|hice\s+el\s+pago|transfer[ií]|deposit[eé]))\b/i.test(lowerMsg);

      if (esSolicitudReactivacionCliente) {
        await this.procesarSolicitudReactivacionCliente(phone, rawText, session, targetJid);
        return;
      }

      // Si es un cliente residencial preguntando por cambiar su paquete ("quiero cambiar de paquete a 100 megas")
      if (esComandoCambioPaquete) {
        await this.procesarSolicitudCambioPlanCliente(phone, rawText, session, targetJid);
        return;
      }
    }

    // 2.1 CADUCIDAD POR INACTIVIDAD DE PASOS TÉCNICOS TEMPORALES (15 minutos):
    // Si pasaron más de 15 minutos sin responder una comprobación técnica, el paso caduca
    // para evitar que un "Hola" o "Quiero pagar" posterior genere reportes técnicos indebidos.
    const lastInteractionMs = session?.last_interaction ? new Date(session.last_interaction).getTime() : 0;
    const minutosInactividad = lastInteractionMs > 0 ? (Date.now() - lastInteractionMs) / (1000 * 60) : 9999;
    const pasosTemporales = [
      'ACTIVACION_ESPERANDO_NOMBRE',
      'ACTIVACION_ESPERANDO_ZONA',
      'PENDIENTE_CONFIRMACION_ACTIVACION_ONU',
      'PENDIENTE_SELECCION_IP_CAMBIO_MODEM',
      'PENDIENTE_CONFIRMACION_CAMBIO_MODEM',
      'COMPROBACION_STREAMING_TV',
      'MONITOREO_POST_REINICIO',
      'DIAGNOSTICO_TRIAGE_DISPOSITIVOS',
      'DIAGNOSTICO_COMPROBAR_UN_DISPOSITIVO',
      'DIAGNOSTICO_POST_REINICIO',
      'COMPROBACION_TURNO_1',
      'COMPROBACION_EVIDENCIA',
      'ESPERANDO_UBICACION_TECNICO',
      'COMPROBACION_SOPORTE',
      'ESPERANDO_COMPROBANTE',
    ];

    if (pasosTemporales.includes(session?.step || '') && minutosInactividad >= 15) {
      logger.info(`[Timeout] Paso temporal "${session?.step}" de ${phone} caducó (${Math.round(minutosInactividad)}m sin respuesta). Reiniciando a CONVERSACIONAL.`);
      session = await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
      });
    }

    // 2.2 DETECCIÓN UNIVERSAL DE CAMBIO DE SERVICIO O CONSULTA DE OTRO CLIENTE
    const esCambioServicio = /^(cambiar\s*(de\s*)?servicio|otro\s*servicio|mis\s*servicios|tengo\s*otro\s*servicio|tengo\s*dos\s*servicios|el\s*otro\s*contrato|cambiar\s*de\s*paquete|cambiar\s*cuenta|cambiar\s*cliente|otro\s*cliente|otra\s*cuenta)\b/i.test(lowerMsg) ||
      lowerMsg === 'cambiar servicio' ||
      lowerMsg === 'otro servicio' ||
      lowerMsg === 'cambiar de servicio' ||
      lowerMsg === 'mis servicios';

    if (esCambioServicio) {
      logger.info(`[Cambio de Servicio] Solicitud de cambio de servicio/cliente de ${phone}`);
      await this.solicitarSeleccionServicio(phone, session, targetJid, rawText);
      return;
    }

    // 2.3 DETECCIÓN DE CAMBIO DE INTENCIÓN (SALUDOS Y CONSULTAS DE PAGO PRIORITARIAS):
    // Si el usuario escribe un saludo o pregunta por pagos/facturas/contraseña, NUNCA debe
    // tratarse como respuesta técnica a un reporte previo ni generar tickets de falla.
    const esSaludo = /^(hola|buen\s*(dia|día)|buenas\s*(tardes|noches)?|saludos|que\s*tal|hey|hi)\b/i.test(lowerMsg);
    const esConsultaPago = /\b(pagar|pago|saldo|debo|cuanto\s*debo|cuando\s*me\s*toca|factura|recibo|cuenta|tarjeta|transferencia|clabe|banco|mensualidad|costo)\b/i.test(lowerMsg);
    const esConsultaWifi = (
      /\b(cambiar|cambio|modificar|olvid[eé]|saber|cual\s*es|quitar|poner)\b.*\b(contrase[ñn]a|clave|password|wifi|wi-fi|ssid|red)\b/i.test(lowerMsg) ||
      /\b(contrase[ñn]a|password|clave\s*del?\s*(wifi|wi-fi|modem|módem))\b/i.test(lowerMsg)
    ) && !/\b(no\s*tengo|sin\s*wifi|no\s*hay|falla|lento|lenta|intermitente|caid[ao]|sirve|funciona|conecta|no\s*da|sin\s*internet)\b/i.test(lowerMsg);

    if ((esSaludo || esConsultaPago || esConsultaWifi) && pasosTemporales.includes(session?.step || '')) {
      logger.info(`[Intent Override] Cliente ${phone} envió "${rawText}" mientras estaba en paso "${session?.step}". Cancelando espera técnica.`);
      session = await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
      });

      if (esConsultaPago) {
        await this.flujoConsultarSaldo(phone, session, targetJid);
        return;
      }
      if (esConsultaWifi) {
        await this.enviarYLoguear(
          phone,
          `📶 *Cambio de contraseña Wi-Fi:*\n\nPor seguridad de tu red, el cambio de clave o nombre de red se gestiona directamente con nuestro equipo técnico. Por favor responde con el nuevo nombre y contraseña que deseas configurar para tu módem.`,
          'DATOS_WIFI',
          'INSTRUCCIONES_WIFI',
          targetJid
        );
        return;
      }
    }

    // --- ENRUTAMIENTO DE IMÁGENES ANALIZADAS CON VISIÓN (SPEEDTEST, PAGOS, LUCES MÓDEM HUAWEI) ---
    if (event.isMedia) {
      await this.procesarImagenInteligente(phone, rawText, event, session, targetJid);
      return;
    }

    // Pasos técnicos del diagnóstico escalonado:
    // Si el cliente está en la comprobación o dudas de Smart TV / Red 5G (ej: Netflix / YouTube dando círculos)
    if (session?.step === 'COMPROBACION_STREAMING_TV') {
      await this.procesarStreamingTv(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está en el triage de dispositivos (¿1 aparato o todos?)
    if (session?.step === 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS') {
      await this.procesarTriageDispositivos(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está comprobando tras reconectar un solo dispositivo
    if (session?.step === 'DIAGNOSTICO_COMPROBAR_UN_DISPOSITIVO') {
      await this.procesarComprobarUnDispositivo(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está respondiendo tras el reinicio remoto del módem o durante monitoreo
    if (session?.step === 'DIAGNOSTICO_POST_REINICIO' || session?.step === 'MONITOREO_POST_REINICIO') {
      await this.procesarPostReinicio(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está respondiendo si desea ser canalizado con un asesor humano (ej. cobertura en patio)
    if (session?.step === 'ESPERANDO_CANALIZACION_ASESOR') {
      await this.procesarRespuestaCanalizacionAsesor(phone, rawText, session, targetJid);
      return;
    }

    // Si el cliente está enviando su ubicación o domicilio para visita técnica
    if (session?.step === 'ESPERANDO_UBICACION_TECNICO') {
      await this.procesarUbicacionTecnico(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está enviando evidencia (foto o speedtest) tras ticket
    if (session?.step === 'COMPROBACION_EVIDENCIA') {
      await this.procesarEvidenciaTicket(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está respondiendo al Turno 1 de comprobaciones sencillas (retrocompatibilidad)
    if (session?.step === 'COMPROBACION_TURNO_1' || session?.step === 'COMPROBACION_SOPORTE') {
      await this.procesarTurno1Comprobacion(phone, rawText, event, session, targetJid);
      return;
    }

    // Si el cliente está en espera de seleccionar uno de sus múltiples servicios
    if (session?.step === 'ESPERANDO_SELECCION_SERVICIO') {
      await this.procesarSeleccionServicio(phone, rawText, session, targetJid);
      return;
    }

    // Si el usuario nos indica su nombre explícitamente (ej. "me llamo Ricardo", "soy Carlos"), guardarlo en la sesión
    const matchNombre = rawText.match(/^(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,35})$/i);
    if (matchNombre && matchNombre[1]) {
      await this.procesarIdentificacion(phone, rawText, session, targetJid);
      return;
    }

    // Permitir cambiar o consultar otro servicio si el usuario lo solicita
    if (
      lowerMsg === 'cambiar servicio' ||
      lowerMsg === 'otro servicio' ||
      lowerMsg === 'cambiar de servicio' ||
      lowerMsg.includes('tengo otro servicio') ||
      lowerMsg.includes('tengo dos servicios') ||
      lowerMsg.includes('mis servicios')
    ) {
      const nombreABuscar = session?.client_name || phone;
      await this.procesarIdentificacion(phone, rawText, session, targetJid);
      return;
    }

    // Si el cliente envía despedida o agradecimiento (ej. "buen día", "gracias", "excelente día"), cerramos la consulta actual
    const despedidas = [
      'gracias', 'muchas gracias', 'todo bien', 'ya quedo', 'ya quedó', 'listo gracias',
      'excelente gracias', 'muchas gracias por la ayuda', 'todo bien gracias',
      'que tengas buen dia', 'que tengas buen día', 'que tenga buen dia', 'que tenga buen día',
      'excelente dia', 'excelente día', 'lindo dia', 'lindo día', 'hasta luego', 'hasta pronto',
      'buen dia', 'buen día'
    ];
    const esDespedida = despedidas.some(d => lowerMsg === d || (lowerMsg.startsWith(d) && lowerMsg.length < 35));
    if (esDespedida && session?.step !== 'INICIO' && session?.client_name) {
      await this.marcarConsultaFinalizada(phone, session);
      await this.enviarYLoguear(
        phone,
        `¡Con mucho gusto! 😊 En *${this.getIspName()}* estamos siempre para servirte. Si llegas a necesitar apoyo más adelante, solo escríbenos nuevamente. ¡Que tengas un excelente día!`,
        'DESPEDIDA',
        'CONSULTA_CERRADA_SATISFACTORIA',
        targetJid
      );
      return;
    }

    // Evaluar metadatos y tiempo de inactividad de la sesión existente
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}

    // REGLA DE REINICIO CADA 24 HORAS (1440 minutos):
    // Si han transcurrido 24 horas o más desde la última interacción, se reinicia el flujo limpiamente
    // pero preservando la identidad del cliente (nombre, onu_id, client_id).
    if (minutosInactividad >= 1440) {
      logger.info(`Sesión de ${phone} superó las 24 horas de inactividad (${Math.round(minutosInactividad / 60)}h). Reiniciando contexto conversacional limpiamente.`);
      session = await TursoService.upsertSession({
        phone,
        step: session?.client_name ? 'ESPERANDO_PROBLEMA' : 'INICIO',
        metadata: JSON.stringify({
          ...metaObj,
          comprobacionIniciada: null,
          resumenFalla: null,
          consultaFinalizada: false,
        }),
      });
      metaObj = JSON.parse(session?.metadata || '{}');
    }
    const consultaTerminada = metaObj.consultaFinalizada === true || session?.step === 'CONSULTA_FINALIZADA';
    const serviciosRegistrados = Array.isArray(metaObj.registeredServices) && metaObj.registeredServices.length > 1
      ? metaObj.registeredServices
      : [];

    // Si el cliente tiene 2 o más servicios registrados y su consulta previa ya finalizó o pasaron más de 30 min sin actividad:
    if (serviciosRegistrados.length > 1 && (minutosInactividad >= 30 || consultaTerminada)) {
      logger.info(`Cliente multi-servicio ${phone} inicia nueva consulta tras ${Math.round(minutosInactividad)}m de inactividad o consulta previa cerrada.`);

      let textoOpciones = `¡Hola de nuevo, *${session?.client_name || 'Cliente'}*! 👋 Detectamos que cuentas con *${serviciosRegistrados.length} servicios* registrados a tu nombre:\n\n`;
      serviciosRegistrados.forEach((c: any, idx: number) => {
        const ubicacion = c.address || c.zone_name ? `\n📍 *Ubicación / Zona:* ${c.address || c.zone_name}` : '';
        const plan = c.speed_profile ? `\n📦 *Plan:* ${c.speed_profile}` : '';
        const sn = c.sn ? `\n🆔 *SN:* ${c.sn}` : '';
        textoOpciones += `*${idx + 1}️⃣ Opción ${idx + 1}:*${ubicacion}${plan}${sn}\n\n`;
      });
      textoOpciones += `Para tu consulta de hoy, ¿con cuál de tus servicios necesitas apoyo?\n👉 *Por favor responde con el número de la opción (ejemplo: 1 ó 2).*`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_SELECCION_SERVICIO',
        metadata: JSON.stringify({
          ...metaObj,
          pendingServices: serviciosRegistrados,
          initialQuery: rawText,
          consultaFinalizada: false,
        }),
      });

      await this.enviarYLoguear(phone, textoOpciones, 'IDENTIFICAR_CLIENTE', 'NUEVA_CONSULTA_SELECCION_SERVICIO', targetJid);
      return;
    }

    // Si el cliente está en espera de identificarse
    if (session?.step === 'ESPERANDO_IDENTIFICACION') {
      await this.procesarIdentificacion(phone, rawText, session, targetJid);
      return;
    }

    // Si el cliente NO está identificado en absoluto (ni por SmartOLT ni por nombre en Turso)
    if (!session?.onu_id && !session?.client_name) {
      // 1. Intentar vinculación rápida automática si el teléfono coincide con alguna ONU en Turso
      const onusPorTel = await TursoService.searchOnusFuzzy(phone, 5);
      const coincidentesTel = onusPorTel.filter(o => o.matchScore >= 90);

      if (coincidentesTel.length > 1) {
        // El cliente tiene 2 o más servicios registrados con este mismo número
        let textoOpciones = `¡Hola, *${coincidentesTel[0].name}*! 👋 Detectamos que tu número tiene *${coincidentesTel.length} servicios* registrados:\n\n`;
        coincidentesTel.slice(0, 4).forEach((c, idx) => {
          const ubicacion = c.address || c.zone_name ? `\n📍 *Ubicación:* ${c.address || c.zone_name}` : '';
          const plan = c.speed_profile ? `\n📦 *Plan:* ${c.speed_profile}` : '';
          textoOpciones += `*${idx + 1}️⃣ Opción ${idx + 1}:*${ubicacion}${plan}\n\n`;
        });
        textoOpciones += `¿Con cuál de tus servicios necesitas apoyo el día de hoy?\n👉 *Por favor responde con el número de tu opción (ejemplo: 1 ó 2).*`;

        await TursoService.upsertSession({
          phone,
          client_name: coincidentesTel[0].name,
          step: 'ESPERANDO_SELECCION_SERVICIO',
          metadata: JSON.stringify({
            registeredServices: coincidentesTel.slice(0, 4).map(c => ({
              unique_external_id: c.unique_external_id,
              sn: c.sn,
              name: c.name,
              speed_profile: c.speed_profile,
              zone_name: c.zone_name,
              address: c.address,
            })),
            pendingServices: coincidentesTel.slice(0, 4).map(c => ({
              unique_external_id: c.unique_external_id,
              sn: c.sn,
              name: c.name,
              speed_profile: c.speed_profile,
              zone_name: c.zone_name,
              address: c.address,
            })),
            initialQuery: rawText,
            serviceHistory: [],
            consultaFinalizada: false,
          }),
        });

        await this.enviarYLoguear(phone, textoOpciones, 'IDENTIFICAR_CLIENTE', 'AUTO_SELECCION_MULTISERVICIO', targetJid);
        return;
      } else if (coincidentesTel.length === 1) {
        const o = coincidentesTel[0];
        session = await TursoService.upsertSession({
          phone,
          client_id: o.unique_external_id,
          service_id: o.sn,
          client_name: o.name,
          onu_id: o.unique_external_id,
          metadata: JSON.stringify({ speed_profile: o.speed_profile, zone: o.zone_name, address: o.address, sn: o.sn }),
          step: 'IDENTIFICADO',
        });
        logger.info(`Cliente ${phone} auto-vinculado a ONU única ${o.unique_external_id}`);
      } else {
        // Si no está identificado, clasificamos el mensaje con Groq para ver si trae nombre o es saludo/queja
        const clasif = await GroqService.clasificarMensaje(rawText, {
          clientName: null,
          currentStep: 'INICIO',
        });

        // Si el usuario pregunta por canales de TV o televisión por cable (incluso antes de identificarse)
        if (clasif.intencion === 'CONSULTAR_TV_CANALES' || clasif.consulta_canales_cable) {
          const msjTv =
            `¡Hola! 👋 Te informamos con mucho gusto: en *${this.getIspName()}* nos dedicamos de forma exclusiva a proveer *servicio de internet de alta velocidad* (fibra óptica e inalámbrico). 🌐\n\n` +
            `📺 *Nosotros no vendemos ni manejamos servicio de televisión por cable ni canales de TV.* Por ello, la señal o sintonización de canales tradicionales no depende de nuestro servicio.\n\n` +
            `💡 *Si tu televisor es Smart TV:* Puedes utilizar nuestro internet para ver plataformas de video y streaming (como YouTube, Netflix, Disney+, etc.). Para que tus videos carguen rápido y sin pausas, te sugerimos conectar tu pantalla a la red Wi-Fi *5G* (con tu misma contraseña de siempre).\n\n` +
            `¿Hay alguna consulta sobre tu conexión de internet en la que te podamos apoyar? 😊`;

          await this.enviarYLoguear(phone, msjTv, 'CONSULTAR_TV_CANALES', 'ACLARACION_SOLO_INTERNET_NO_TV', targetJid);
          return;
        }

        if (clasif.nombre_mencionado) {
          // Preservar la queja o intención inicial para no preguntar doble tras identificarse
          const sesionConMeta = await TursoService.upsertSession({
            phone,
            metadata: JSON.stringify({
              ...metaObjPre,
              initialQuery: rawText,
              initialIntent: clasif.intencion,
              initialClasif: clasif,
              resumen_queja: clasif.resumen_queja,
            }),
          });
          await this.procesarIdentificacion(phone, rawText, sesionConMeta, targetJid);
          return;
        }

        // Si es un saludo o no dio su nombre, le solicitamos amablemente su nombre completo
        if (clasif.intencion === 'SALUDO' || clasif.intencion === 'DESCONOCIDO') {
          await this.enviarYLoguear(
            phone,
            `¡Hola! 👋 Bienvenido al centro de atención y soporte de *${this.getIspName()}*.\n\nPara poder ayudarte y revisar tu conexión a detalle, ¿me indicas tu *Nombre completo* (con apellidos) o tu número de contrato?`,
            'SALUDO',
            'SOLICITAR_IDENTIFICACION',
            targetJid
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
          return;
        }

        // Si reporta falla o cualquier consulta directamente sin estar registrado, guardamos su intención y le pedimos el nombre
        const queja = clasif.resumen_queja ? ` sobre: _"${clasif.resumen_queja}"_` : '';
        await this.enviarYLoguear(
          phone,
          `Entendido tu reporte${queja}. Para poder revisar tu servicio a detalle y ver qué sucede, ¿me indicas tu *Nombre completo* (con apellidos) o número de contrato?`,
          'FALLA_INTERNET',
          'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
          targetJid
        );
        await TursoService.upsertSession({
          phone,
          step: 'ESPERANDO_IDENTIFICACION',
          metadata: JSON.stringify({
            initialQuery: rawText,
            initialIntent: clasif.intencion,
            initialClasif: clasif,
            resumen_queja: clasif.resumen_queja,
          }),
        });
        return;
      }
    }

    // 3. Cliente ya conocido / identificado: Clasificamos con Groq para ejecutar acciones en SmartOLT / WispHub
    const clasificacion = await GroqService.clasificarMensaje(rawText, {
      clientName: session?.client_name,
      currentStep: session?.step,
    });

    // Si el cliente reporta que no ve su red Wi-Fi o foco WLAN apagado, canalizar directo a flujo de falla técnica
    if (clasificacion.red_wifi_no_visible) {
      clasificacion.intencion = 'FALLA_INTERNET';
    }

    // Si es una acción específica de telecomunicaciones (Niveles, Plan/Velocidad, Falla, Saldo, Reboot, Asesor, Wi-Fi, Mudanza/Cobertura, Agenda Cuadrilla, Canales TV)
    if (['CONSULTAR_NIVELES', 'CONSULTAR_PLAN', 'FALLA_INTERNET', 'REINICIAR_MODEM', 'CONSULTAR_SALDO', 'REPORTAR_PAGO', 'HABLAR_HUMANO', 'CANCELAR_SUSCRIPCION', 'DATOS_WIFI', 'CAMBIO_DOMICILIO', 'ESTATUS_TECNICO_AGENDA', 'CONSULTAR_TV_CANALES'].includes(clasificacion.intencion)) {
      await this.ejecutarIntencion(phone, clasificacion, session, rawText, targetJid, event);
      return;
    }

    // 4. Si el cliente ya está identificado y envía saludo o mensaje general, verificar si se encuentra suspendido en WispHub
    if (session?.client_name) {
      try {
        let meta: any = {};
        try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
        const estadoFinanciero = await WispHubService.verificarEstadoFinanciero({
          clienteId: session?.client_id,
          nombre: session?.client_name,
          phone,
          sn: meta.sn,
          ip: meta.ip,
        });

        const tieneDeudaReal = estadoFinanciero.totalDeuda > 0 || (estadoFinanciero.facturas && estadoFinanciero.facturas.length > 0);

        if (tieneDeudaReal) {
          const facturas = estadoFinanciero.facturas || [];
          let detalleFacturas = '';
          if (facturas.length > 0) {
            detalleFacturas = '\n📋 *Detalle de tu(s) recibo(s) pendiente(s):*\n';
            facturas.forEach((f, idx) => {
              detalleFacturas += `• *Recibo #${idx + 1}:* Folio ${f.folio} | *$${f.monto.toFixed(2)} MXN* (Vence: ${f.fecha_vencimiento})\n`;
              if (f.link_pago) {
                detalleFacturas += `  👉 *Pagar con Mercado Pago:* ${f.link_pago}\n`;
              }
            });
          }

          const mpUrl = await this.obtenerLinkMercadoPago({
            clientName: session.client_name,
            clientId: session.client_id,
            phone,
            monto: estadoFinanciero.totalDeuda > 0 ? estadoFinanciero.totalDeuda : 250,
            folioFactura: facturas[0]?.folio || null,
          });
          const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA Bancomer');
          const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0152433212 90');
          const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());

          let onlinePaySection = '';
          if (mpUrl) {
            onlinePaySection = `\n🛒 *Pagar en línea con Mercado Pago / Tarjeta (Acreditación inmediata):*\n👉 ${mpUrl}\n`;
          }

          const nombreCliente = formatDisplayName(session.client_name, true) || 'Cliente';
          const mensajeMoroso =
            `¡Hola, *${nombreCliente}*! 👋\n\n` +
            `Revisé tu cuenta en nuestro sistema y detectamos que registras un saldo/recibo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*.\n` +
            `${detalleFacturas}` +
            `${onlinePaySection}\n` +
            `💳 *También puedes pagar por Transferencia Bancaria:*\n` +
            `• Banco: *${bank}* | CLABE: *${account}*\n` +
            `• Beneficiario: *${beneficiary}*\n` +
            `• Concepto / Referencia: *${session.client_name || phone}*\n\n` +
            `📸 En cuanto realices tu pago, envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* por este chat para reactivarte de inmediato.`;

          await this.enviarYLoguear(phone, mensajeMoroso, 'CONSULTAR_SALDO', 'AVISO_SUSPENSION_SALUDO', targetJid);
          await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
          return;
        } else if (estadoFinanciero.suspendido) {
          logger.info(`Cliente ${phone} (${session.client_name}) está suspendido en WispHub pero SIN adeudos (pagos al corriente). Solicitando reactivación...`);
          const idWispHub = estadoFinanciero.cliente?.id ||
            (session.service_id && !String(session.service_id).startsWith('HWTC') && !String(session.service_id).startsWith('ONU-') && !String(session.service_id).startsWith('ZTEG') ? session.service_id : null) ||
            (session.client_id && !String(session.client_id).startsWith('HWTC') && !String(session.client_id).startsWith('ONU-') && !String(session.client_id).startsWith('ZTEG') ? session.client_id : null);
          const ipCliente = estadoFinanciero.cliente?.ip;
          const nombreClienteActivar = session.client_name || estadoFinanciero.cliente?.nombre;

          if (idWispHub || ipCliente || nombreClienteActivar) {
            await WispHubService.activarCliente({
              id: idWispHub,
              name: nombreClienteActivar,
              ip: ipCliente,
              sn: session.onu_id,
            }).catch(() => {});
          }

          if (estadoFinanciero.cliente?.id) {
            await TursoService.upsertSession({
              phone,
              service_id: String(estadoFinanciero.cliente.id),
              metadata: JSON.stringify({
                wisphub_id: estadoFinanciero.cliente.id,
                wisphub_ip: estadoFinanciero.cliente.ip,
                ip: estadoFinanciero.cliente.ip,
              }),
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        logger.warn('Error al verificar suspensión en mensaje conversacional:', err?.message || err);
      }
    }

    // 5. Si es saludo o conversación general y no está suspendido, respondemos de forma inteligente con Groq enriquecido con los datos reales de su plan en la BD
    const historial = await TursoService.getHistorialReciente(phone, 8);

    // Contexto enriquecido de SmartOLT si tiene ONU
    let infoOltContext = '';
    if (session?.onu_id) {
      const diag = await SmartOLTService.obtenerEstadoONU(session.onu_id);
      infoOltContext = `El cliente tiene la ONU ${session.onu_id}, estado en central: ${diag.status}, potencia: ${diag.opticalPowerDbm || 'N/A'} dBm.`;
    }

    const clienteCtx = await this.obtenerContextoClienteCompleto(phone, session);

    logger.info(`Generando respuesta conversacional con Groq para ${phone} (Plan: "${clienteCtx.planInternet || 'N/A'}", ${clienteCtx.velocidadMegas || 'N/A'} Mbps)...`);
    const respuestaIA = await GroqService.generarRespuestaConversacional(rawText, historial, {
      clientName: session?.client_name,
      ispName: this.getIspName(),
      planInternet: clienteCtx.planInternet,
      precioPlan: clienteCtx.precioPlan,
      velocidadMegas: clienteCtx.velocidadMegas,
      ip: clienteCtx.ip,
      estadoServicio: clienteCtx.estadoServicio,
      infoOlt: infoOltContext,
    });

    await this.enviarYLoguear(
      phone,
      respuestaIA,
      'IA_CONVERSACIONAL',
      'RESPUESTA_GENERADA',
      targetJid
    );

    await TursoService.updateStep(phone, 'CONVERSACIONAL');
  }

  /**
   * Manejador de botones interactivos de WhatsApp
   */
  private static async manejarBoton(phone: string, buttonId: string, session: Session | null): Promise<void> {
    switch (buttonId) {
      case 'BTN_SALDO':
        await this.flujoConsultarSaldo(phone, session);
        break;

      case 'BTN_FALLA':
        await this.flujoReportarFalla(phone, session);
        break;

      case 'BTN_ASESOR':
        await this.flujoHablarAsesor(phone, session);
        break;

      case 'BTN_REBOOT':
        await this.flujoReiniciarModem(phone, session);
        break;

      case 'BTN_MENU':
        await this.enviarMenuPrincipal(phone, session?.client_name);
        break;

      default:
        logger.warn(`Botón desconocido recibido: ${buttonId}`);
        await this.enviarMenuPrincipal(phone, session?.client_name);
        break;
    }
  }

  /**
   * Ejecuta la acción correspondiente según la intención extraída por Groq
   */
  private static async ejecutarIntencion(
    phone: string,
    c: GroqClassificationResult,
    session: Session | null,
    mensajeOriginal: string,
    targetJid?: string,
    event?: IncomingMessageEvent
  ): Promise<void> {
    switch (c.intencion) {
      case 'CONSULTAR_NIVELES':
        await this.flujoConsultarNiveles(phone, session, targetJid);
        break;

      case 'SALUDO':
        if (!session?.client_id && !session?.client_name) {
          // Cliente nuevo / no registrado: solicitamos nombre o contrato para ubicarlo
          await this.enviarYLoguear(
            phone,
            `¡Hola! 👋 Bienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\nPara poder ubicar tu cuenta en nuestro sistema y brindarte una mejor atención, ¿podrías indicarme tu *Nombre completo* o tu *Número de contrato / teléfono*?`,
            'SALUDO',
            'SOLICITAR_IDENTIFICACION',
            targetJid
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        } else {
          // Cliente ya registrado / conocido: saludo cordial y directo a su problema
          const nombre = session.client_name ? ` *${session.client_name}*` : '';
          await this.enviarYLoguear(
            phone,
            `¡Hola${nombre}! 👋 Bienvenido al centro de atención de *${this.getIspName()}*.\n\n¿En qué podemos apoyarte el día de hoy? Cuéntame cuál es tu duda o si presentas alguna falla con tu servicio.`,
            'SALUDO',
            'SALUDO_PERSONALIZADO',
            targetJid
          );
          await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
        }
        break;

      case 'CONSULTAR_SALDO':
        await this.flujoConsultarSaldo(phone, session, targetJid);
        break;

      case 'CONSULTAR_PLAN':
        await this.flujoConsultarPlan(phone, session, targetJid);
        break;

      case 'REPORTAR_PAGO':
        await this.flujoReportarPago(phone, mensajeOriginal, event, session, targetJid);
        break;

      case 'FALLA_INTERNET':
        await this.flujoFallaInteligente(phone, c, session, targetJid);
        break;

      case 'CONSULTAR_TV_CANALES': {
        const nombreLimpio = formatDisplayName(session?.client_name, true);
        const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
        const msjTv =
          `¡Hola${nombre}! 👋 Te informamos con mucho gusto: en *${this.getIspName()}* nos dedicamos de forma exclusiva a proveer *servicio de internet de alta velocidad* (fibra óptica e inalámbrico). 🌐\n\n` +
          `📺 *Nosotros no vendemos ni manejamos servicio de televisión por cable ni canales de TV.* Por ello, los canales tradicionales de televisión no forman parte de nuestro servicio.\n\n` +
          `💡 *Si tu televisor es Smart TV:* Puedes utilizar nuestro internet para disfrutar de tus aplicaciones de video y streaming (como YouTube, Netflix, Disney+, etc.). Para que tus videos carguen rápido y sin pausas, te sugerimos conectar tu pantalla a tu red Wi-Fi *5G* (con tu misma contraseña de siempre).\n\n` +
          `¿Hay alguna consulta sobre tu conexión de internet en la que te podamos apoyar? 😊`;

        await this.enviarYLoguear(phone, msjTv, 'CONSULTAR_TV_CANALES', 'ACLARACION_SOLO_INTERNET_NO_TV', targetJid);
        await this.marcarConsultaFinalizada(phone, session);
        break;
      }

      case 'REINICIAR_MODEM':
        await this.flujoReiniciarModem(phone, session, targetJid);
        break;

      case 'DATOS_WIFI':
        await this.enviarYLoguear(
          phone,
          `📶 *Cambio de contraseña Wi-Fi:*\n\nPor seguridad de tu red, el cambio de clave o nombre de red se gestiona directamente con nuestro equipo técnico. Por favor responde con el nuevo nombre y contraseña que deseas configurar para tu módem.`,
          'DATOS_WIFI',
          'INSTRUCCIONES_WIFI',
          targetJid
        );
        break;

      case 'HABLAR_HUMANO':
        await this.flujoHablarAsesor(phone, session, targetJid);
        break;

      case 'CAMBIO_DOMICILIO': {
        const nombre = session?.client_name ? ` *${session.client_name}*` : '';
        const ticket = await TursoService.createTicket({
          phone,
          client_name: session?.client_name,
          onu_id: session?.onu_id,
          issue_summary: 'Solicitud de Cambio de Domicilio / Validación de Cobertura',
          checks_performed: `Cliente solicitó información o trámite para cambio de casa: "${mensajeOriginal}"`,
          status: 'ABIERTO',
          is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
        });

        if (session?.client_id) {
          await WispHubService.crearTicketSoporte(
            session.client_id,
            `Cambio de Domicilio - ${ticket.folio}`,
            `Cliente solicita cambio de domicilio. Requiere validar cobertura en nueva dirección. Folio: ${ticket.folio}`,
            'Media'
          ).catch(() => {});
        }

        let meta: any = {};
        try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

        await TursoService.upsertSession({
          phone,
          step: 'ESPERANDO_UBICACION_TECNICO',
          metadata: JSON.stringify({
            ...meta,
            ticketFolio: ticket.folio,
            motivoUbicacion: 'CAMBIO_DOMICILIO',
          }),
        });

        const msjCambio =
          `¡Hola${nombre}! 📍 Con gusto te apoyamos para reubicar tu servicio a tu nueva casa.\n\n` +
          `Para validar la cobertura de fibra óptica y los postes disponibles:\n` +
          `👉 *Por favor compártenos tu ubicación actual por WhatsApp* o tu *dirección completa con referencias (calle, número, colonia y entrecalles)*.\n\n` +
          `Ya te generé tu reporte *#${ticket.folio}* para que el equipo de campo confirme la factibilidad de tu nuevo domicilio.`;

        await this.enviarYLoguear(phone, msjCambio, 'CAMBIO_DOMICILIO', `CAMBIO_DOMICILIO_${ticket.folio}`, targetJid);
        break;
      }

      case 'ESTATUS_TECNICO_AGENDA': {
        const nombre = session?.client_name ? ` *${session.client_name}*` : '';
        const ticket = await TursoService.createTicket({
          phone,
          client_name: session?.client_name,
          onu_id: session?.onu_id,
          issue_summary: 'Consulta de Estatus de Cuadrilla / Agenda de Instalación',
          checks_performed: `Cliente consultó horario o estatus de visita técnica: "${mensajeOriginal}"`,
          status: 'ABIERTO',
          is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
        });

        if (session?.client_id) {
          await WispHubService.crearTicketSoporte(
            session.client_id,
            `Agenda Cuadrilla - ${ticket.folio}`,
            `Consulta sobre horario/estatus de técnico. Detalle: ${mensajeOriginal}. Folio: ${ticket.folio}`,
            'Media'
          ).catch(() => {});
        }

        const msjAgenda =
          `Hola${nombre}. 🛠️ Nuestro asistente virtual no gestiona la agenda ni el GPS en tiempo real de los técnicos en campo.\n\n` +
          `📋 Ya registré tu consulta con el reporte *#${ticket.folio}* y notifiqué al coordinador de cuadrillas para que revise la ruta del personal técnico y se comunique directamente contigo.\n\n` +
          `¡Muchas gracias por tu paciencia!`;

        await this.enviarYLoguear(phone, msjAgenda, 'ESTATUS_TECNICO_AGENDA', `CONSULTA_AGENDA_${ticket.folio}`, targetJid);
        await this.marcarConsultaFinalizada(phone, session);
        break;
      }

      case 'CANCELAR_SUSCRIPCION':
        await TursoService.setOptOut(phone, true);
        await this.enviarYLoguear(
          phone,
          `Has sido dado de baja de nuestros avisos automáticos de *${this.getIspName()}*. Escribe *ACTIVAR* si deseas regresar en cualquier momento.`,
          'CANCELAR_SUSCRIPCION',
          'BAJA_REGISTRADA'
        );
        break;

      case 'IDENTIFICAR_CLIENTE':
        await this.procesarIdentificacion(phone, c.nombre_mencionado || c.telefono_mencionado || mensajeOriginal, session);
        break;

      case 'DESCONOCIDO':
      default:
        // Si el cliente NO está identificado en absoluto (ni por CRM ni por nombre en Turso)
        if (!session?.client_id && !session?.client_name) {
          const intro = c.resumen_queja ? `Entendido sobre: _"${c.resumen_queja}"_.\n\n` : '';
          await this.enviarYLoguear(
            phone,
            `${intro}¡Hola! Bienvenido al centro de atención de *${this.getIspName()}*.\n\nPara poder ubicar tu cuenta y darte una atención ágil, ¿podrías indicarme tu *Nombre completo* o *Número de contrato*?`,
            'DESCONOCIDO',
            'SOLICITAR_IDENTIFICACION'
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        } else {
          // El cliente ya es conocido: reconocemos lo que dijo y ofrecemos ayuda personalizada
          const nombre = session.client_name ? ` *${session.client_name}*` : '';
          const contextoDicho = c.resumen_queja && c.resumen_queja.length > 3
            ? `Entiendo que nos comentas sobre: _"${c.resumen_queja}"_.\n\n`
            : '';
          await this.enviarYLoguear(
            phone,
            `${contextoDicho}Hola${nombre}, como asistente de *${this.getIspName()}*, estoy aquí para ayudarte con fallas de internet, estado de cuenta o soporte técnico. ¿En qué podemos apoyarte hoy?`,
            'DESCONOCIDO',
            'ORIENTACION_CONVERSACIONAL'
          );
        }
        break;
    }
  }

  /**
   * Flujo de Reportar Pago: Entrega la ficha bancaria configurada o confirma recepción de comprobante
   */
  private static async flujoReportarPago(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent | undefined,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    if (event?.isMedia) {
      const nombre = session?.client_name ? ` a nombre de *${session.client_name}*` : '';
      await this.enviarYLoguear(
        phone,
        `¡Muchas gracias por tu comprobante! 📸 Hemos recibido la captura de tu pago${nombre}.\n\nNuestro equipo administrativo validará la transferencia en el sistema para aplicar tu abono a la brevedad. ¡Que tengas un excelente día!`,
        'REPORTAR_PAGO',
        'COMPROBANTE_RECIBIDO',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si envió texto solicitando datos o información de pago
    const ficha = this.getFichaBancaria(session);
    await this.enviarYLoguear(
      phone,
      ficha,
      'REPORTAR_PAGO',
      'FICHA_PAGO_ENVIADA',
      targetJid
    );
  }



  /**
   * Flujo de Asistencia y Comprobaciones Técnicas Amigables con Diagnóstico Silencioso:
   * 0. Revisa contingencias o caídas masivas activas en Turso (si hay caída en su zona o General, avisa y detiene flujo).
   * 1. Revisa internamente morosidad en WispHub (si adeuda, envía ficha de pago sin tickets falsos).
   * 2. Revisa internamente estado físico en SmartOLT:
   *    - Si hay corte en cableado (LOS): genera reporte #TK-XXXX y pide ubicación/dirección para técnico.
   *    - Si módem apagado (Power fail): avisa que revise la corriente sin tocar la fibra.
   *    - Si está en línea (Online): reinicia el módem automáticamente por detrás (sin preguntar al cliente)
   *      y realiza comprobación amigable en 2 turnos cortos (encendido + cuidado con fibra + 1 o todos).
   */
  private static async flujoFallaInteligente(
    phone: string,
    c: GroqClassificationResult,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    // Si el cliente no está registrado aún en el sistema pero ya reportó un problema de internet
    if (!session?.client_id && !session?.client_name) {
      const queja = c.resumen_queja ? ` sobre: _"${c.resumen_queja}"_` : '';
      await this.enviarYLoguear(
        phone,
        `Entendido tu reporte${queja}. Veo que presentas inconvenientes con tu conexión de internet.\n\nPara poder verificar tu línea y ayudarte de inmediato, ¿podrías indicarme tu *Nombre completo* o número de contrato?`,
        'FALLA_INTERNET',
        'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    const nombreLimpio = formatDisplayName(session.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    const detalleQueja = c.resumen_queja || 'Falla o lentitud de internet';
    let meta: any = {};
    try { meta = JSON.parse(session.metadata || '{}'); } catch {}

    // --- 0. VERIFICACIÓN SILENCIOSA DE CONTINGENCIA / CAÍDA MASIVA DE RED POR ZONA O GENERAL ---
    let zonaCliente = meta.zone || meta.zone_name || meta.address || '';
    if (!zonaCliente && session.onu_id) {
      try {
        const onuInfo = await TursoService.getOnuById(session.onu_id);
        zonaCliente = onuInfo?.zone_name || onuInfo?.address || '';
      } catch {}
    }
    if (!zonaCliente && phone) {
      try {
        const whClient = await TursoService.getWisphubClientByAny({ phone });
        zonaCliente = whClient?.direccion || whClient?.servicio || '';
      } catch {}
    }

    const outage = await TursoService.checkActiveOutageForZone(zonaCliente);
    if (outage) {
      logger.info(`[Contingencia] Cliente ${phone} en zona "${zonaCliente || 'N/A'}" contenido por caída masiva activa (ID: ${outage.id}, Zona: "${outage.zone_name}")`);
      const esGeneral = (outage.zone_name || '').toLowerCase() === 'general' || (outage.zone_name || '').toLowerCase() === 'todas';
      const zonaStr = esGeneral ? 'general en toda la red' : `en tu zona (*${outage.zone_name}*)`;
      const notasStr = outage.notes ? `\n🛠️ *Detalle del incidente:* ${outage.notes}` : '';
      const tiempoStr = outage.estimated_time ? `\n⏳ *Tiempo estimado de solución:* ${outage.estimated_time}` : '';

      const mensajeContingencia =
        `¡Hola${nombre}! ⚠️ Te informamos que actualmente presentamos una falla ${zonaStr}.\n` +
        `${notasStr}` +
        `${tiempoStr}\n\n` +
        `👷‍♂️ Nuestro equipo técnico ya se encuentra en sitio trabajando para restablecer el servicio a la brevedad posible.\n\n` +
        `💡 *No es necesario reiniciar tu módem ni mover cables*; te notificaremos por este medio en cuanto el enlace quede 100% normalizado. Agradecemos mucho tu paciencia y comprensión.`;

      await this.enviarYLoguear(
        phone,
        mensajeContingencia,
        'FALLA_MASIVA',
        `CONTINGENCIA_ZONA_${outage.zone_name.toUpperCase()}`,
        targetJid
      );

      await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
        metadata: JSON.stringify({
          ...meta,
          lastOutageNotified: outage.id,
          lastOutageZone: outage.zone_name,
          consultaFinalizada: true,
        }),
      });
      return;
    }

    logger.info(`Iniciando diagnóstico interno silencioso para cliente ${phone} (${session.client_name || 'N/A'})...`);

    // --- 1. VERIFICACIÓN SILENCIOSA DE MOROSIDAD O CORTE EN WISPHUB ---
    try {
      const estadoFinanciero = await WispHubService.verificarEstadoFinanciero({
        clienteId: session.client_id,
        nombre: session.client_name,
        phone,
        sn: meta.sn,
        ip: meta.ip,
      });

      const tieneDeudaReal = estadoFinanciero.totalDeuda > 0 || (estadoFinanciero.facturas && estadoFinanciero.facturas.length > 0);

      if (tieneDeudaReal) {
        logger.info(`Cliente ${phone} (${session.client_name}) presenta adeudo real en WispHub: Deuda=$${estadoFinanciero.totalDeuda}`);

        const facturas = estadoFinanciero.facturas || [];
        let detalleFacturas = '';
        if (facturas.length > 0) {
          detalleFacturas = '\n📋 *Detalle de tu(s) recibo(s) pendiente(s):*\n';
          facturas.forEach((f, idx) => {
            detalleFacturas += `• *Recibo #${idx + 1}:* Folio ${f.folio} | *$${f.monto.toFixed(2)} MXN* (Vence: ${f.fecha_vencimiento})\n`;
            if (f.link_pago) {
              detalleFacturas += `  👉 *Pagar en línea con Mercado Pago:* ${f.link_pago}\n`;
            }
          });
        }

        const mpUrl = await this.obtenerLinkMercadoPago({
          clientName: session.client_name,
          clientId: session.client_id,
          phone,
          monto: estadoFinanciero.totalDeuda > 0 ? estadoFinanciero.totalDeuda : 250,
          folioFactura: facturas[0]?.folio || null,
        });
        const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA Bancomer');
        const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0152433212 90');
        const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());

        let onlinePaySection = '';
        if (mpUrl) {
          onlinePaySection = `\n🛒 *Pagar en línea con Mercado Pago / Tarjeta (Acreditación inmediata):*\n👉 ${mpUrl}\n`;
        }

        const mensajeMoroso =
          `Hola${nombre}, revisé tu servicio y detectamos que registras un recibo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*.\n` +
          `${detalleFacturas}` +
          `${onlinePaySection}\n` +
          `💳 *También puedes pagar por Transferencia Bancaria:*\n` +
          `• Banco: *${bank}* | CLABE: *${account}*\n` +
          `• Beneficiario: *${beneficiary}*\n` +
          `• Concepto / Referencia: *${session.client_name || phone}*\n\n` +
          `📸 En cuanto realices tu abono, por favor envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* aquí en el chat para reactivarte de inmediato.`;

        await this.enviarYLoguear(phone, mensajeMoroso, 'CONSULTAR_SALDO', 'AVISO_MOROSIDAD_SILENCIOSA', targetJid);
        await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
        return;
      } else if (estadoFinanciero.suspendido) {
        logger.info(`Cliente ${phone} (${session.client_name}) figura Suspendido en WispHub pero SIN facturas pendientes (pagos al corriente). Solicitando reactivación...`);
        const idWispHub = estadoFinanciero.cliente?.id ||
          (session.service_id && !String(session.service_id).startsWith('HWTC') && !String(session.service_id).startsWith('ONU-') && !String(session.service_id).startsWith('ZTEG') ? session.service_id : null) ||
          (session.client_id && !String(session.client_id).startsWith('HWTC') && !String(session.client_id).startsWith('ONU-') && !String(session.client_id).startsWith('ZTEG') ? session.client_id : null);
        const ipCliente = estadoFinanciero.cliente?.ip || meta.ip;
        const nombreClienteActivar = session.client_name || estadoFinanciero.cliente?.nombre;

        if (idWispHub || ipCliente || nombreClienteActivar) {
          await WispHubService.activarCliente({
            id: idWispHub,
            name: nombreClienteActivar,
            ip: ipCliente,
            sn: meta.sn || session.onu_id,
          }).catch((err) => {
            logger.error('Error al activar cliente en WispHub:', err);
          });
        }

        if (estadoFinanciero.cliente?.id) {
          await TursoService.upsertSession({
            phone,
            service_id: String(estadoFinanciero.cliente.id),
            metadata: JSON.stringify({
              ...meta,
              wisphub_id: estadoFinanciero.cliente.id,
              wisphub_ip: estadoFinanciero.cliente.ip,
              ip: estadoFinanciero.cliente.ip || meta.ip,
            }),
          }).catch(() => {});
        }

        const nombreCliente = formatDisplayName(session.client_name, true) || 'Cliente';
        const msj =
          `Hola *${nombreCliente}*, revisé tu cuenta y *tus pagos se encuentran al corriente* (no registras recibos pendientes). ✅\n\n` +
          `⚠️ Sin embargo, tu servicio figuraba como *Suspendido* en el sistema. Ya enviamos la orden de *reactivación automática* a tu línea.\n\n` +
          `🔄 Por favor desconecta tu módem de la corriente durante 30 segundos y vuélvelo a conectar para que sincronice la señal.\n\n` +
          `¿Me confirmas si al reiniciar ya tienes navegación o si necesitas que revisemos las luces de tu módem?`;

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', 'REACTIVACION_SUSPENDIDO_AL_CORRIENTE', targetJid);
        await TursoService.updateStep(phone, 'COMPROBACION_TURNO_1');
        return;
      }
    } catch (err: any) {
      logger.warn(`Error al consultar morosidad silenciosa en WispHub para ${phone}:`, err?.message || err);
    }

    // --- 2. VERIFICACIÓN SILENCIOSA DE CONECTIVIDAD EN SMARTOLT ---
    const onuId = session.onu_id || (session.client_id ? `ONU-${session.client_id}` : null);
    let diag: SmartOltStatusResult | null = null;
    if (onuId) {
      try {
        diag = await SmartOLTService.obtenerEstadoONU(onuId);
        logger.info(`Diagnóstico silencioso SmartOLT para ${phone} (ONU: ${onuId}): status=${diag.status}`);
      } catch (err: any) {
        logger.warn(`Error en diagnóstico silencioso SmartOLT para ${phone}:`, err?.message || err);
      }
    }

    // CASO ESPECIAL: NO ABREN CIERTAS PÁGINAS O APLICACIONES ESPECÍFICAS (BLOQUEO / ENRUTAMIENTO / DNS)
    if (c.bloqueo_paginas_apps) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session.client_name,
        onu_id: session.onu_id,
        issue_summary: 'Problema de acceso a páginas o aplicaciones específicas (Enrutamiento / DNS / Puertos)',
        checks_performed: `Cliente reporta que no puede acceder a ciertas páginas o apps: "${detalleQueja}". Línea activa. No requiere reinicio de módem.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Enrutamiento/DNS - ${ticket.folio}`,
          `Falla de acceso a páginas o apps específicas: ${detalleQueja}. Folio local: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      const mensajeBloqueo =
        `Hola${nombre}, revisé tu línea en el sistema y tu módem está debidamente conectado a nuestra central.\n\n` +
        `Cuando el detalle ocurre únicamente en ciertas páginas o aplicaciones específicas, esto no depende de la señal de tu módem (no es necesario reiniciarlo).\n\n` +
        `🛠️ Ya te generé tu reporte *#${ticket.folio}* para que el equipo de ingeniería en sistemas revise las rutas de DNS y apertura de puertos de tu servicio.\n\n` +
        `👉 Por favor indícanos: ¿cuáles son las páginas o aplicaciones exactas que no te permiten entrar?`;

      await TursoService.upsertSession({
        phone,
        step: 'COMPROBACION_EVIDENCIA',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: 'Bloqueo o falla de acceso a páginas/apps específicas',
          ticketFolio: ticket.folio,
        }),
      });

      await this.enviarYLoguear(phone, mensajeBloqueo, 'FALLA_INTERNET', `REPORTE_DNS_PAGINAS_${ticket.folio}`, targetJid);
      return;
    }

    // CASO ESPECIAL: WI-FI / SSIDs NO VISIBLES EN DOMICILIO (WLAN APAGADO)
    if (c.red_wifi_no_visible) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session.client_name,
        onu_id: session.onu_id,
        issue_summary: 'Wi-Fi / SSIDs no visibles en domicilio (WLAN deshabilitado en ONT)',
        checks_performed: `Cliente reportó que no aparece la red Wi-Fi: "${c.resumen_queja || 'Red no visible'}". Requiere entrar a la ONT / SmartOLT para habilitar SSIDs.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Wi-Fi No Visible - ${ticket.folio}`,
          `Ticket técnico: ${ticket.issue_summary}. ${ticket.checks_performed}`,
          'Media'
        ).catch(() => {});
      }

      const mensajeWifi =
        `Hola${nombre}, revisé tu equipo en el sistema y detecté que el servicio de Wi-Fi de tu módem requiere una configuración interna.\n\n` +
        `🛠️ Ya te generé tu reporte *#${ticket.folio}*. Nuestro equipo técnico accederá a tu módem para activarlo a la brevedad y te avisamos por aquí en cuanto quede listo para que te conectes.`;

      await TursoService.upsertSession({
        phone,
        step: 'CONSULTA_FINALIZADA',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: 'Wi-Fi no visible / SSIDs deshabilitados',
          ticketFolio: ticket.folio,
          consultaFinalizada: true,
        }),
      });

      await this.enviarYLoguear(phone, mensajeWifi, 'FALLA_INTERNET', `WIFI_DESHABILITADO_${ticket.folio}`, targetJid);
      return;
    }

    // CASO A1: CORTE FÍSICO DE CABLE / FIBRA (SmartOLT LOS)
    if (diag && diag.status === 'LOS') {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session.client_name,
        onu_id: session.onu_id,
        issue_summary: 'Problema en cableado exterior hacia domicilio (SmartOLT LOS detectado en central)',
        checks_performed: 'Verificación en central: SmartOLT reporta LOS (Loss of Signal). Cable cortado o sin señal.',
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Corte de Cableado - ${ticket.folio}`,
          `SmartOLT detectó corte físico (LOS). Se solicita cuadrilla a domicilio. Folio local: ${ticket.folio}`,
          'Alta'
        ).catch(() => {});
      }

      const mensajeCorte =
        `Hola${nombre}, revisamos tu servicio en nuestro sistema y detectamos un inconveniente con la señal física del cable que llega a tu domicilio.\n\n` +
        `🛠️ Hemos registrado tu reporte con el folio *#${ticket.folio}* para canalizar una visita técnica a tu domicilio lo más pronto posible.\n\n` +
        `📞 Un compañero de nuestro equipo se comunicará contigo para coordinar qué día y horario pasan a revisarlo.\n\n` +
        `📍 Por favor compártenos tu *ubicación actual por WhatsApp* o tu *dirección completa con referencias* para registrarla en la orden de visita.`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_UBICACION_TECNICO',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: detalleQueja,
          ticketFolio: ticket.folio,
        }),
      });

      await this.enviarYLoguear(phone, mensajeCorte, 'FALLA_INTERNET', `CORTE_FIBRA_LOS_${ticket.folio}`, targetJid);
      return;
    }

    // CASO A2: ATENUACIÓN ÓPTICA CRÍTICA / SEÑAL FÍSICA DEGRADADA (NIVELES FUERA DE RANGO < -27.5 dBm)
    const powerDbm = diag?.opticalPowerDbm;
    const tieneAtenuacionCritica = powerDbm != null && (powerDbm < -27.5 || powerDbm > -10);
    if (diag && diag.status === 'ONLINE' && tieneAtenuacionCritica) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session.client_name,
        onu_id: session.onu_id,
        issue_summary: `Atenuación óptica crítica en domicilio (${powerDbm} dBm)`,
        checks_performed: `SmartOLT detectó niveles de potencia óptica fuera de norma (${powerDbm} dBm). Se requiere revisión física de fibra/empalmes en domicilio. No reiniciar módem.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Atenuación Crítica - ${ticket.folio}`,
          `Potencia óptica detectada: ${powerDbm} dBm. Requiere visita técnica a domicilio para revisar acometida y conectores. Folio local: ${ticket.folio}`,
          'Alta'
        ).catch(() => {});
      }

      // Al cliente no se le mencionan tecnicismos (regla estricta)
      const mensajeAtenuacion =
        `Hola${nombre}, revisamos tu servicio en nuestro sistema y detectamos una variación en la señal física que llega a tu domicilio.\n\n` +
        `🛠️ Hemos registrado tu reporte con el folio *#${ticket.folio}* para canalizar una visita técnica a tu domicilio lo más pronto posible.\n\n` +
        `📞 Un compañero de nuestro equipo se comunicará contigo para coordinar el día y horario en que el técnico pasará a tu domicilio.\n\n` +
        `📍 Por favor compártenos tu *ubicación por WhatsApp* o tu *dirección completa con referencias* para registrarla en la orden de visita.`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_UBICACION_TECNICO',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: `Variación de señal física (${powerDbm} dBm)`,
          ticketFolio: ticket.folio,
        }),
      });

      await this.enviarYLoguear(phone, mensajeAtenuacion, 'FALLA_INTERNET', `ATENUACION_CRITICA_${ticket.folio}`, targetJid);
      return;
    }

    // CASO B: MÓDEM APAGADO / POWER FAIL
    if (diag && diag.status === 'POWER_FAIL') {
      const mensajePower =
        `Hola${nombre}, revisé tu línea y tu módem aparece apagado o sin corriente eléctrica.\n\n` +
        `Por favor revisa que esté bien conectado a la toma de corriente y encendido. (Por favor *no muevas el cable delgado de internet*).\n\n` +
        `¿Las luces de tu módem logran encender?`;

      await TursoService.upsertSession({
        phone,
        step: 'COMPROBACION_TURNO_1',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: 'Módem sin energía eléctrica detectado en central',
        }),
      });

      await this.enviarYLoguear(phone, mensajePower, 'FALLA_INTERNET', 'MODEM_POWER_FAIL', targetJid);
      return;
    }

    const esSinInternet = c.sin_internet_total ||
      detalleQueja.toLowerCase().includes('no tengo internet') ||
      detalleQueja.toLowerCase().includes('sin internet') ||
      detalleQueja.toLowerCase().includes('sin señal') ||
      detalleQueja.toLowerCase().includes('no da internet') ||
      detalleQueja.toLowerCase().includes('no navega');

    // CASO C0: PREGUNTA SOBRE TELEVISIÓN O CANALES DE TV (NO LOS VENDEMOS)
    if (c.consulta_canales_cable || c.intencion === 'CONSULTAR_TV_CANALES') {
      const msjTv =
        `¡Hola${nombre}! 👋 Te informamos con mucho gusto: en *${this.getIspName()}* nos dedicamos de forma exclusiva a proveer *servicio de internet de alta velocidad* (fibra óptica e inalámbrico). 🌐\n\n` +
        `📺 *Nosotros no vendemos ni manejamos servicio de televisión por cable ni canales de TV.* Por ello, los canales tradicionales de televisión no forman parte de nuestro servicio.\n\n` +
        `💡 *Si tu televisor es Smart TV:* Puedes utilizar nuestro internet para disfrutar de tus aplicaciones de video y streaming (como YouTube, Netflix, Disney+, etc.). Para que tus videos carguen rápido y sin pausas, te sugerimos conectar tu pantalla a la red Wi-Fi *5G* (con tu misma contraseña de siempre).\n\n` +
        `¿Hay alguna consulta sobre tu conexión de internet en la que te podamos ayudar? 😊`;

      await this.enviarYLoguear(phone, msjTv, 'CONSULTAR_TV_CANALES', 'ACLARACION_SOLO_INTERNET_NO_TV', targetJid);
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // CASO C1: SMART TV / STREAMING (Netflix, YouTube, videos que dan círculos o no abren) - CAPTURA 1
    const esStreamingSmartTv = c.problema_streaming_tv ||
      detalleQueja.toLowerCase().includes('netflix') ||
      detalleQueja.toLowerCase().includes('youtube') ||
      detalleQueja.toLowerCase().includes('circulo') ||
      detalleQueja.toLowerCase().includes('círculo') ||
      detalleQueja.toLowerCase().includes('ruedita') ||
      (detalleQueja.toLowerCase().includes('tele') && (detalleQueja.toLowerCase().includes('video') || detalleQueja.toLowerCase().includes('abrir') || detalleQueja.toLowerCase().includes('carga')));

    if (esStreamingSmartTv) {
      logger.info(`[Streaming TV 5G] Cliente ${phone} reporta buffering en Smart TV / apps de video.`);
      const sugerenciaRed = meta.sn ? 'tu red Wi-Fi con terminación *-5G*' : 'tu red Wi-Fi con terminación *-5G*';

      const mensajeStreaming =
        `¡Hola${nombre}! Revisé tu línea en el sistema y tu módem se encuentra encendido y con señal física estable. 📶\n\n` +
        `Cuando aplicaciones de video como Netflix o YouTube se quedan dando círculos o marcan error en tu Smart TV o celular, se debe a interferencia en la red Wi-Fi normal.\n\n` +
        `🚀 *Para que tus videos carguen rápido y sin pausas:*\n` +
        `1️⃣ En los ajustes de Wi-Fi de tu pantalla y celular, busca tu red con terminación *5G* (${sugerenciaRed}).\n` +
        `2️⃣ Conéctate a ella colocando tu *misma contraseña de siempre*.\n\n` +
        `💡 *Recomendación:* La señal 5G ofrece mucha mayor velocidad y evita que los videos se queden cargando (siempre que tu equipo esté relativamente cerca del módem).\n\n` +
        `¿Podrías conectarte a la red 5G y confirmarme si ya cargan fluidos tus videos?`;

      await TursoService.upsertSession({
        phone,
        step: 'COMPROBACION_STREAMING_TV',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: detalleQueja,
          onuIdParaReinicio: onuId,
        }),
      });

      await this.enviarYLoguear(phone, mensajeStreaming, 'FALLA_INTERNET', 'GUIA_STREAMING_TV_5G', targetJid);
      return;
    }

    // CASO C2: UN SOLO APARATO O ZONA DISTANTE YA ESPECIFICADO (evitar doble pregunta)
    if (c.alcance_dispositivos === 'SOLO_UNO') {
      const mensajeUnDispositivo =
        `Entendido${nombre}. Como el detalle se presenta en un solo dispositivo, tu servicio principal y módem están recibiendo buena señal.\n\n` +
        `Por favor realiza estos 2 pasos rápidos:\n` +
        `1️⃣ Apaga el Wi-Fi en ese aparato durante 10 segundos y vuelve a encenderlo.\n` +
        `2️⃣ Acércate a unos pasos del módem (o conéctate a la red 5G si está disponible) para comprobar si la señal mejora.\n\n` +
        `¿Notaste mejoría tras hacer la prueba?`;

      await TursoService.upsertSession({
        phone,
        step: 'DIAGNOSTICO_COMPROBAR_UN_DISPOSITIVO',
        metadata: JSON.stringify({
          ...meta,
          triageAlcance: 'UN_DISPOSITIVO',
          resumenFalla: detalleQueja,
        }),
      });

      await this.enviarYLoguear(phone, mensajeUnDispositivo, 'FALLA_INTERNET', 'TRIAGE_UN_DISPOSITIVO_DIRECTO', targetJid);
      return;
    }

    // CASO C3: EL CLIENTE YA ESPECIFICÓ DIRECTAMENTE QUE ES EN TODOS SUS APARATOS
    if (c.alcance_dispositivos === 'TODOS') {
      if (onuId) {
        SmartOLTService.rebootONU(onuId).then(res => {
          logger.info(`Reinicio de ONU ${onuId} ordenado automáticamente para ${phone}: ${res.message}`);
        }).catch(err => {
          logger.warn(`Error al reiniciar ONU ${onuId}:`, err?.message || err);
        });
      }

      const mensajeReinicioDirecto =
        `Listo${nombre}, acabo de enviar una señal para *reiniciar tu módem remotamente*.\n\n` +
        `⏳ Tardará aprox. 1 a 2 minutos en estabilizarse. En cuanto vuelvan a encender sus luces:\n` +
        `1️⃣ Conéctate a tu red Wi-Fi *5G* cerca del módem.\n` +
        `2️⃣ Haz un test en https://www.speedtest.net\n` +
        `3️⃣ Mándame aquí la *captura de pantalla de tu Speedtest* para verificar tu velocidad.`;

      await TursoService.upsertSession({
        phone,
        step: 'DIAGNOSTICO_POST_REINICIO',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: detalleQueja,
          onuIdParaReinicio: onuId,
          triageAlcance: 'TODOS_DISPOSITIVOS',
          rebootTriggeredAt: new Date().toISOString(),
        }),
      });

      await this.enviarYLoguear(phone, mensajeReinicioDirecto, 'FALLA_INTERNET', 'REINICIO_DIRECTO_TODOS', targetJid);
      return;
    }

    // CASO C4: CASO INDETERMINADO O PRIMER CONTACTO ("No tengo internet", "Lento", etc.)
    const mensajeTriage =
      `Hola${nombre}, tu módem aparece conectado y con buena señal. 📶\n\n` +
      `¿El problema te ocurre en todos tus dispositivos o solo en uno en específico?`;

    await TursoService.upsertSession({
      phone,
      step: 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS',
      metadata: JSON.stringify({
        ...meta,
        resumenFalla: detalleQueja,
        onuIdParaReinicio: onuId,
        tipoFalla: esSinInternet ? 'SIN_INTERNET' : 'LENTITUD',
        sinInternetTotal: esSinInternet,
        reportaLentitud: c.reporta_lentitud,
      }),
    });

    await this.enviarYLoguear(phone, mensajeTriage, 'FALLA_INTERNET', 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS', targetJid);
  }

  /**
   * Atiende las dudas o confirmaciones del cliente cuando se le recomendó conectar su Smart TV / celular a la red 5G
   * (Flujo Captura 1: Netflix / YouTube dando círculos)
   */
  private static async procesarStreamingTv(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const nombreLimpio = formatDisplayName(session?.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    // A. Si pregunta cómo conectarla o no la encuentra
    const pideAyudaConectar = lower.includes('como') || lower.includes('cómo') || lower.includes('donde') || lower.includes('dónde') || lower.includes('no me aparece') || lower.includes('no sale') || lower.includes('no la veo') || lower.includes('buscador');
    const preguntaPorCelular = lower.includes('celular') || lower.includes('telefono') || lower.includes('teléfono') || lower.includes('dispositivo');

    if (pideAyudaConectar && !preguntaPorCelular) {
      const msjComo =
        `Para conectarte en tu pantalla:\n` +
        `1️⃣ Ve al menú de tu televisor en *Configuración* o *Ajustes* ⚙️ > *Red e Internet* > *Wi-Fi*.\n` +
        `2️⃣ En la lista de redes detectadas, busca el nombre que termina en *-5G*.\n` +
        `3️⃣ Selecciónala e ingresa la *misma contraseña* que siempre has usado para tu internet.\n\n` +
        `💡 Si tu pantalla no la detecta al instante, asegúrate de buscarla en la lista de *Redes Wi-Fi* (no en el navegador web). ¿Logras verla en la lista?`;

      await this.enviarYLoguear(phone, msjComo, 'FALLA_INTERNET', 'STREAMING_GUIA_BUSCAR_5G', targetJid);
      return;
    }

    if (preguntaPorCelular) {
      const msjCel =
        `¡También en los celulares! 📱 Puedes conectar tus teléfonos y tablets a la red *5G* con la misma contraseña.\n\n` +
        `💡 Recuerda que la red 5G te dará la velocidad máxima siempre y cuando te encuentres a una distancia moderada del módem (sin muchos muros intermedios).\n\n` +
        `¿Pudiste conectarte a la señal 5G para validar si mejora la conexión?`;

      await this.enviarYLoguear(phone, msjCel, 'FALLA_INTERNET', 'STREAMING_GUIA_CELULARES_5G', targetJid);
      return;
    }

    // B. Si confirma que ya se conectó, va a probar o agradece (Flujo Captura 1: "Si ya me conecte", "Deje checar en transcurso de la tarde")
    const esConfirmacionOEspera = lower.includes('ya') || lower.includes('conecte') || lower.includes('conecté') || lower.includes('checar') || lower.includes('pruebo') || lower.includes('transcurso') || lower.includes('tarde') || lower.includes('ok') || lower.includes('listo') || lower.includes('gracias');

    if (esConfirmacionOEspera) {
      const msjAtento =
        `¡Perfecto${nombre}! Quedamos al pendiente durante el transcurso de la tarde. 😊\n\n` +
        `Prueba tu navegación y si notas cualquier detalle o no mejora, por favor avísanos por este medio para agendarte una visita técnica. ¡Que tengas un excelente día!`;

      await this.enviarYLoguear(phone, msjAtento, 'FALLA_INTERNET', 'STREAMING_CONFIRMACION_PENDIENTE', targetJid);
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // C. Si reporta que sigue fallando o no mejoró
    const esNegativo = lower.includes('sigue') || lower.includes('no mejoro') || lower.includes('no mejoró') || lower.includes('sigue mal') || lower.includes('sigue lento') || lower.includes('no sirvio') || lower.includes('no sirvió') || lower.includes('no funciona');

    if (esNegativo) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: 'Lentitud/buffering persistente en Smart TV y dispositivos tras prueba 5G',
        checks_performed: `Cliente reportó que persiste falla tras prueba en red 5G: "${rawText}". Se solicita visita técnica.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Visita Técnica Streaming - ${ticket.folio}`,
          `Falla persistente en streaming y dispositivos. Folio local: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      const msjEscalar =
        `Enterado${nombre}. Como el detalle persiste, con gusto programaremos una visita técnica para revisar tu equipo y calibrar tu señal en sitio. 🛠️\n\n` +
        `📋 Tu reporte ha sido registrado con el folio *#${ticket.folio}*.\n\n` +
        `📍 Por favor compártenos tu *ubicación por WhatsApp* o tu *dirección completa con referencias* para registrarla en la orden de la cuadrilla.`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_UBICACION_TECNICO',
        metadata: JSON.stringify({
          ...meta,
          ticketFolio: ticket.folio,
        }),
      });

      await this.enviarYLoguear(phone, msjEscalar, 'FALLA_INTERNET', `STREAMING_VISITA_TECNICA_${ticket.folio}`, targetJid);
      return;
    }

    // D. Respuesta libre con Groq si tiene alguna otra duda
    const respuestaIA = await GroqService.generarRespuestaConversacional(rawText, [], {
      clientName: session?.client_name,
      ispName: this.getIspName(),
    });
    await this.enviarYLoguear(phone, respuestaIA, 'FALLA_INTERNET', 'STREAMING_CONVERSACIONAL', targetJid);
  }

  /**
   * Triage de falla técnica: Determina si el problema es en un solo equipo, cobertura en patio/zonas lejanas, o generalizado.
   * Evita reinicios innecesarios si solo es un celular o cobertura en áreas retiradas.
   */
  private static async procesarTriageDispositivos(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esSaludo = /^(hola|buen\s*(dia|día)|buenas\s*(tardes|noches)?|saludos|que\s*tal|hey|hi)\b/i.test(lower);
    const esConsultaPago = /\b(pagar|pago|saldo|debo|cuanto\s*debo|cuando\s*me\s*toca|factura|recibo|cuenta|tarjeta|transferencia|clabe|banco|mensualidad|costo)\b/i.test(lower);

    if (esSaludo || esConsultaPago) {
      const sesionReset = await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL' });
      if (esConsultaPago) {
        await this.flujoConsultarSaldo(phone, sesionReset, targetJid);
      } else {
        const nombreLimpio = formatDisplayName(session?.client_name, true);
        const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
        await this.enviarYLoguear(phone, `¡Hola${nombre}! 👋 ¿En qué te podemos ayudar?`, 'SALUDO', 'SALUDO_CORDIAL', targetJid);
      }
      return;
    }

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
    const nombreLimpio = formatDisplayName(session?.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    const onuId = session?.onu_id || meta.onuIdParaReinicio;

    const esZonaAlejada = /\b(patio|jard[ií]n|terraza|afuera|cochera|arriba|planta\s*alta|segundo\s*piso|fondo|lejos|rec[aá]mara|cuarto\s*de\s*atr[aá]s)\b/i.test(lower) ||
      lower.includes('patio') || lower.includes('afuera') || lower.includes('jardin') || lower.includes('terraza') || lower.includes('cochera');

    const esUnSoloAparato = /\b(uno|solo\s*uno|un\s*solo|en\s*uno|un\s*celular|mi\s*cel|mi\s*tel[eé]fono|la\s*tele|la\s*pantalla|mi\s*lap|mi\s*compu|un\s*dispositivo|mi\s*pantalla|mi\s*computadora)\b/i.test(lower) ||
      lower.includes('telefono') || lower.includes('teléfono') || lower.includes('celular') || lower.includes('solo en mi') || lower.includes('solamente') || esZonaAlejada;

    const sonTodosLosAparatos = (/\b(todo|todos|todas|en\s*todos|la\s*casa|ninguno|no\s*agarra\s*nada|ningun|en\s*ninguno|general|ambos|los\s*dos|los\s*3|los\s*tres)\b/i.test(lower) && !lower.includes('solo en')) && !esZonaAlejada;

    if (esUnSoloAparato && !sonTodosLosAparatos) {
      // Rama 1: Solo un aparato individual o zona distante (cobertura natural Wi-Fi)
      const mensajeUnDispositivo = esZonaAlejada
        ? `Entendido${nombre}. Cuando la señal disminuye o se corta principalmente al estar en zonas retiradas (como el patio o terraza), tu servicio de fibra principal está llegando bien a tu domicilio.\n\n` +
          `Te sugiero realizar estos 2 pasos sencillos:\n` +
          `1️⃣ Acércate un poco más hacia donde está ubicado el módem para verificar si la navegación es fluida.\n` +
          `2️⃣ Desconecta el Wi-Fi en tu teléfono por 10 segundos y vuelve a conectarlo para renovar la conexión.\n\n` +
          `¿Notaste mejoría al acercarte o reconectar tu equipo? *(Responde Sí o No)*`
        : `Entendido${nombre}. Como el detalle se presenta en un solo dispositivo, tu servicio y módem están funcionando bien hacia tu domicilio.\n\n` +
          `Por favor realiza estos 2 pasos rápidos:\n` +
          `1️⃣ Apaga el Wi-Fi en ese aparato durante 10 segundos y vuelve a encenderlo.\n` +
          `2️⃣ Acércate a unos pasos del módem para comprobar si la señal mejora.\n\n` +
          `¿Notaste mejoría tras hacer la prueba? *(Responde Sí o No)*`;

      await TursoService.upsertSession({
        phone,
        step: 'DIAGNOSTICO_COMPROBAR_UN_DISPOSITIVO',
        metadata: JSON.stringify({
          ...meta,
          triageAlcance: esZonaAlejada ? 'ZONA_ALEJADA' : 'UN_DISPOSITIVO',
        }),
      });

      await this.enviarYLoguear(phone, mensajeUnDispositivo, 'FALLA_INTERNET', 'TRIAGE_UN_DISPOSITIVO', targetJid);
      return;
    }

    // Rama 2: Todos los aparatos (o respuesta genérica de fallo total)
    // Disparamos el reinicio remoto en SmartOLT
    if (onuId) {
      SmartOLTService.rebootONU(onuId).then(res => {
        logger.info(`Reinicio de ONU ${onuId} ordenado tras triage general para ${phone}: ${res.message}`);
      }).catch(err => {
        logger.warn(`Error al reiniciar ONU ${onuId} en triage:`, err?.message || err);
      });
    }

    const mensajeReinicio =
      `Listo${nombre}, acabo de enviar una señal para *reiniciar tu módem remotamente*.\n\n` +
      `⏳ Tardará aprox. 1 a 2 minutos en estabilizarse. En cuanto vuelvan a encender sus luces:\n` +
      `1️⃣ Conéctate a tu red Wi-Fi *5G* cerca del módem.\n` +
      `2️⃣ Haz un test en https://www.speedtest.net\n` +
      `3️⃣ Mándame aquí la *captura de pantalla de tu Speedtest* para verificar tu velocidad.`;

    await TursoService.upsertSession({
      phone,
      step: 'DIAGNOSTICO_POST_REINICIO',
      metadata: JSON.stringify({
        ...meta,
        triageAlcance: 'TODOS_DISPOSITIVOS',
        rebootTriggeredAt: new Date().toISOString(),
      }),
    });

    await this.enviarYLoguear(phone, mensajeReinicio, 'FALLA_INTERNET', 'REINICIO_DISPARADO_POST_TRIAGE', targetJid);
  }

  /**
   * Comprueba si la reconexión de Wi-Fi en el dispositivo individual resolvió el problema.
   */
  private static async procesarComprobarUnDispositivo(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esPositivo = /\b(si|sí|ya|quedo|quedó|listo|ya\s*quedo|ya\s*quedó|excelente|funciona|bien|muchas\s*gracias|gracias|perfecto|ya\s*sirve)\b/i.test(lower) &&
      !/\b(no|no\s*quedo|no\s*quedó|sigue\s*igual|sigue\s*mal|nada|no\s*funciona|no\s*sirve)\b/i.test(lower);

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
    const nombreLimpio = formatDisplayName(session?.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    const onuId = session?.onu_id || meta.onuIdParaReinicio;

    if (esPositivo) {
      await this.enviarYLoguear(
        phone,
        `¡Excelente,${nombre}! Me da gusto que tu servicio haya quedado al 100%. 😊 En *${this.getIspName()}* estamos a tus órdenes si requieres algo más. ¡Excelente día!`,
        'FALLA_INTERNET',
        'SOLUCION_UN_DISPOSITIVO_EXITOSA',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si el caso era zona alejada (patio / terraza / distancia Wi-Fi) y aún no mejora al estar en esa zona:
    if (meta.triageAlcance === 'ZONA_ALEJADA') {
      const mensajeZonaAlejada =
        `Entendido${nombre}. Cuando hay mayor distancia o muros hacia el patio o exteriores, la cobertura Wi-Fi del módem disminuye naturalmente.\n\n` +
        `Si deseas que un asesor de nuestro equipo te oriente sobre soluciones para optimizar la cobertura en esas áreas de tu domicilio, con gusto te comunico. 😊\n\n` +
        `¿Deseas que te canalice con un asesor? *(Responde Sí o No)*`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_CANALIZACION_ASESOR',
        metadata: JSON.stringify({
          ...meta,
          resumenFalla: 'Baja cobertura Wi-Fi en patio o zona lejana',
        }),
      });

      await this.enviarYLoguear(phone, mensajeZonaAlejada, 'FALLA_INTERNET', 'ORIENTACION_COBERTURA_DISTANCIA', targetJid);
      return;
    }

    // Si aún no funciona en el dispositivo individual estándar, procedemos a reiniciar el módem
    if (onuId) {
      SmartOLTService.rebootONU(onuId).then(res => {
        logger.info(`Reinicio de ONU ${onuId} tras fallo en prueba individual para ${phone}: ${res.message}`);
      }).catch(err => {
        logger.warn(`Error al reiniciar ONU ${onuId}:`, err?.message || err);
      });
    }

    const mensajeReinicioEscalonado =
      `Enterado${nombre}. Envié un reinicio a tu módem para refrescar la conexión.\n\n` +
      `⏳ Tardará 1 a 2 minutos. En cuanto prendan sus luces:\n` +
      `1️⃣ Conéctate al Wi-Fi *5G* cerca del módem.\n` +
      `2️⃣ Haz una prueba en https://www.speedtest.net\n` +
      `3️⃣ Mándame la *captura de tu Speedtest* para confirmar tu velocidad.`;

    await TursoService.upsertSession({
      phone,
      step: 'DIAGNOSTICO_POST_REINICIO',
      metadata: JSON.stringify({
        ...meta,
        rebootTriggeredAt: new Date().toISOString(),
      }),
    });

    await this.enviarYLoguear(phone, mensajeReinicioEscalonado, 'FALLA_INTERNET', 'REINICIO_ESCALONADO_INDIVIDUAL', targetJid);
  }

  /**
   * Procesa la respuesta si el usuario desea ser canalizado con un asesor humano
   */
  private static async procesarRespuestaCanalizacionAsesor(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esAfirmativo = /\b(si|sí|por\s*favor|claro|de\s*acuerdo|ok|asesor|comunicame|comunícame|quiero)\b/i.test(lower);

    if (esAfirmativo) {
      await this.flujoHablarAsesor(phone, session, targetJid);
      return;
    }

    const nombreLimpio = formatDisplayName(session?.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    await this.enviarYLoguear(
      phone,
      `¡Enterado${nombre}! Si requieres apoyo con cualquier otra consulta, aquí seguimos a tus órdenes. ¡Que tengas un excelente día! 😊`,
      'ATENCION_CLIENTES',
      'CANALIZACION_DECLINADA',
      targetJid
    );
    await this.marcarConsultaFinalizada(phone, session);
  }

  /**
   * Comprueba el estado de navegación tras el reinicio remoto del módem.
   * Si ya quedó -> Cierre satisfactorio.
   * Si sigue fallando -> Genera ticket formal #TK-XXXX y pide evidencia (foto/speedtest).
   */
  private static async procesarPostReinicio(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esPositivo = /\b(si|sí|ya|quedo|quedó|listo|ya\s*quedo|ya\s*quedó|excelente|funciona|bien|muchas\s*gracias|gracias|perfecto|ya\s*sirve|ya\s*funciona|ya\s*agarro|ya\s*agarró)\b/i.test(lower) &&
      !/\b(no|no\s*quedo|no\s*quedó|sigue\s*igual|sigue\s*mal|nada|no\s*funciona|no\s*sirve)\b/i.test(lower);

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
    const nombre = session?.client_name ? ` *${session.client_name}*` : '';

    if (esPositivo) {
      await this.enviarYLoguear(
        phone,
        `¡Excelente noticia${nombre}! 🎉 Tu conexión ha sido restablecida con éxito.\n\nGracias por realizar las comprobaciones. En *${this.getIspName()}* estamos para servirte. ¡Que tengas un excelente día!`,
        'FALLA_INTERNET',
        'POST_REINICIO_EXITOSO',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    const esConfirmacionPasos = lower.includes('cuatro') || lower.includes('puntos') || lower.includes('realizados') || lower.includes('esperando solucion') || lower.includes('esperando solución') || lower.includes('ya lo hice') || lower.includes('listo los pasos');

    if (esConfirmacionPasos) {
      const msjMonitoreo =
        `¡Muchas gracias${nombre}! Serías tan amable de monitorear tu servicio el resto de la tarde. Si notas cualquier detalle o no mejora, nos puedes notificar para que pasen a tu domicilio por favor. ¡Quedamos atentos! 😊`;

      await TursoService.upsertSession({
        phone,
        step: 'MONITOREO_POST_REINICIO',
        metadata: JSON.stringify({
          ...meta,
          monitoreoIniciado: true,
        }),
      });

      await this.enviarYLoguear(phone, msjMonitoreo, 'FALLA_INTERNET', 'MONITOREO_POST_REINICIO', targetJid);
      return;
    }

    const esPersistente = lower.includes('sigue fallando') || lower.includes('sigue igual') || lower.includes('no mejoro') || lower.includes('no mejoró') || lower.includes('sigue mal') || lower.includes('sigue lento') || lower.includes('no funciona') || lower.includes('no sirve') || lower.includes('falla');

    if (esPersistente) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: meta.resumenFalla || rawText || 'Falla persistente tras reinicio y 4 pasos',
        checks_performed: `Protocolo 4 pasos y reinicio completados. Cliente reportó que persiste el problema: "${rawText}". Se agenda visita técnica para revisión / renovación de módem.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Visita Técnica / Módem - ${ticket.folio}`,
          `Falla persistente tras protocolo 4 pasos. Folio local: ${ticket.folio}. Detalle: ${rawText}`,
          'Alta'
        ).catch(() => {});
      }

      const msjVisita =
        `¡Buen día${nombre}! Queremos que tu internet funcione al 100%, así que programaremos una visita y renovaremos tu módem para asegurar que no tenga más fallas. 🛠️\n\n` +
        `📋 Hemos generado tu orden de visita con el reporte *#${ticket.folio}*.\n\n` +
        `📍 Por favor compártenos tu *ubicación por WhatsApp* o tu *dirección completa con referencias* para registrarla en la orden de la cuadrilla.`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_UBICACION_TECNICO',
        metadata: JSON.stringify({
          ...meta,
          ticketFolio: ticket.folio,
          resumenFalla: 'Visita para revisión y renovación de módem',
        }),
      });

      await this.enviarYLoguear(phone, msjVisita, 'FALLA_INTERNET', `VISITA_RENOVACION_MODEM_${ticket.folio}`, targetJid);
      return;
    }

    // Si sigue igual o con falla persistente -> Solicitar evidencia (Speedtest o foto de luces) antes de generar ticket
    const esSinInternet = meta.tipoFalla === 'SIN_INTERNET' ||
      meta.sinInternetTotal === true ||
      (meta.resumenFalla && (meta.resumenFalla.toLowerCase().includes('no tengo internet') || meta.resumenFalla.toLowerCase().includes('sin internet')));

    const solicitudEvidencia = esSinInternet
      ? `📸 Por favor compártenos una *foto clara de las luces de tu módem* para comprobar si hay alguna alerta física o corte de señal.`
      : `📸 Por favor ayúdanos con una *captura de tu prueba de velocidad* realizada desde:\n👉 https://www.speedtest.net\n(o una foto de las luces de tu módem) para analizar el rendimiento exacto de tu línea.`;

    const mensajeEvidencia =
      `Enterado${nombre}. Para poder determinar el origen exacto del detalle y canalizarlo con la solución adecuada:\n\n` +
      `${solicitudEvidencia}`;

    await TursoService.upsertSession({
      phone,
      step: 'COMPROBACION_EVIDENCIA',
      metadata: JSON.stringify({
        ...meta,
        resumenFalla: meta.resumenFalla || rawText || 'Falla persistente tras reinicio de módem',
        persistenciaReinicio: true,
      }),
    });

    await this.enviarYLoguear(phone, mensajeEvidencia, 'FALLA_INTERNET', 'SOLICITUD_EVIDENCIA_POST_REINICIO', targetJid);
  }

  /**
   * Presenta las opciones de servicios registrados para permitir al usuario cambiar de contrato en cualquier momento,
   * o solicita el nombre/datos si desea consultar una cuenta diferente.
   */
  private static async solicitarSeleccionServicio(
    phone: string,
    session: Session | null,
    targetJid?: string,
    rawText?: string
  ): Promise<void> {
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    let listaServicios = Array.isArray(meta.registeredServices) && meta.registeredServices.length > 0
      ? meta.registeredServices
      : [];

    // Si no estaban en metadata pero tenemos el nombre del cliente, buscar en Turso
    if (listaServicios.length <= 1 && session?.client_name) {
      const onus = await TursoService.searchOnusFuzzy(session.client_name, 5);
      const coincidentes = onus.filter(o => o.matchScore >= 75);
      if (coincidentes.length > 1) {
        listaServicios = coincidentes.map(c => ({
          unique_external_id: c.unique_external_id,
          sn: c.sn,
          name: c.name,
          speed_profile: c.speed_profile,
          zone_name: c.zone_name,
          address: c.address,
        }));
      }
    }

    // Si tiene 2 o más servicios en su cuenta
    if (listaServicios.length > 1) {
      let texto = `¡Hola, *${session?.client_name || 'Cliente'}*! 👋 Aquí tienes tus *${listaServicios.length} servicios* registrados:\n\n`;
      listaServicios.forEach((c: any, idx: number) => {
        const ubicacion = c.address || c.zone_name ? `\n📍 *Ubicación / Zona:* ${c.address || c.zone_name}` : '';
        const plan = c.speed_profile ? `\n📦 *Plan:* ${c.speed_profile}` : '';
        const sn = c.sn ? `\n🆔 *SN:* ${c.sn}` : '';
        texto += `*${idx + 1}️⃣ Opción ${idx + 1}:*${ubicacion}${plan}${sn}\n\n`;
      });
      texto += `¿A cuál de tus servicios deseas cambiarte o consultar?\n👉 *Por favor responde con el número de tu opción (ejemplo: 1 ó 2)*, o escribe el nombre completo de otro titular si deseas consultar una cuenta diferente.`;

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_SELECCION_SERVICIO',
        metadata: JSON.stringify({
          ...meta,
          pendingServices: listaServicios,
          registeredServices: listaServicios,
          consultaFinalizada: false,
        }),
      });

      await this.enviarYLoguear(phone, texto, 'IDENTIFICAR_CLIENTE', 'CAMBIO_SERVICIO_LISTADO_OPCIONES', targetJid);
      return;
    }

    // Si solo tiene 1 servicio o no está registrado, le permitimos ingresar el nombre de la otra cuenta
    await TursoService.upsertSession({
      phone,
      step: 'ESPERANDO_IDENTIFICACION',
      metadata: JSON.stringify({
        ...meta,
        pendingServices: [],
        consultaFinalizada: false,
      }),
    });

    const msj = `¡Claro! Con gusto podemos consultar otro servicio.\n\nPor favor indícame el *Nombre completo del titular* o número de contrato del servicio que deseas consultar.`;
    await this.enviarYLoguear(phone, msj, 'IDENTIFICAR_CLIENTE', 'SOLICITUD_OTRO_CLIENTE', targetJid);
  }

  /**
   * Recibe la dirección física o ubicación por WhatsApp para la visita técnica por corte de cable
   */
  private static async procesarUbicacionTecnico(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    const folio = meta.ticketFolio;
    const nombre = session?.client_name ? ` ${session.client_name}` : '';
    const ubicacionTexto = rawText || (event.isMedia ? '[Foto o archivo de ubicación]' : 'Ubicación enviada');

    if (folio) {
      await TursoService.updateTicketStatus(
        folio,
        'ABIERTO',
        `📍 Domicilio / Ubicación indicada por cliente: "${ubicacionTexto}"`
      );
    }

    await this.enviarYLoguear(
      phone,
      `¡Listo${nombre}! Ya anoté tu dirección en tu reporte *#${folio || 'PENDIENTE'}*.\n\n` +
      `Un compañero de nuestro equipo se comunicará contigo para coordinar el día y horario en que el técnico pasará a tu domicilio. ¡Muchas gracias!`,
      'FALLA_INTERNET',
      `UBICACION_CONFIRMADA_${folio}`,
      targetJid
    );

    await this.marcarConsultaFinalizada(phone, session);
  }

  /**
   * Procesa la respuesta del Turno 1 (si falla en 1 o todos los aparatos),
   * genera el ticket en Turso y solicita foto/speedtest de forma natural (Turno 2).
   */
  private static async procesarTurno1Comprobacion(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esSaludo = /^(hola|buen\s*(dia|día)|buenas\s*(tardes|noches)?|saludos|que\s*tal|hey|hi)\b/i.test(lower);
    const esConsultaPago = /\b(pagar|pago|saldo|debo|cuanto\s*debo|cuando\s*me\s*toca|factura|recibo|cuenta|tarjeta|transferencia|clabe|banco|mensualidad|costo)\b/i.test(lower);

    // Si el cliente no está respondiendo a la falla y saluda o pregunta por pagos:
    if (esSaludo || esConsultaPago) {
      const sesionReset = await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL' });
      if (esConsultaPago) {
        await this.flujoConsultarSaldo(phone, sesionReset, targetJid);
      } else {
        const nombre = session?.client_name ? ` *${session.client_name}*` : '';
        await this.enviarYLoguear(phone, `¡Hola${nombre}! 👋 ¿En qué podemos apoyarte el día de hoy?`, 'SALUDO', 'SALUDO_CORDIAL', targetJid);
      }
      return;
    }

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    const esSinInternetTurno1 = meta.tipoFalla === 'SIN_INTERNET' ||
      meta.sinInternetTotal === true ||
      (meta.resumenFalla && (meta.resumenFalla.toLowerCase().includes('no tengo internet') || meta.resumenFalla.toLowerCase().includes('sin internet')));

    const solicitudTurno2 = esSinInternetTurno1
      ? `📸 Por favor mándanos una *foto de las luces de tu módem* para que el personal técnico revise el estado de los focos.`
      : `📸 Por favor mándanos una *foto de las luces de tu módem* o captura de prueba de velocidad realizada desde:\n👉 https://www.speedtest.net`;

    const mensajeTurno2 =
      `Enterado. Para determinar con exactitud el estado de tu enlace y darte la mejor solución:\n\n` +
      `${solicitudTurno2}`;

    await TursoService.upsertSession({
      phone,
      step: 'COMPROBACION_EVIDENCIA',
      metadata: JSON.stringify({
        ...meta,
        resumenFalla: meta.resumenFalla || rawText || 'Reporte de lentitud / falla de internet',
        detalleTriage: rawText,
      }),
    });

    await this.enviarYLoguear(phone, mensajeTurno2, 'FALLA_INTERNET', 'SOLICITUD_EVIDENCIA_TURNO_2', targetJid);
  }

  /**
   * Recibe la foto del módem, captura de Speedtest o texto confirmando persistencia
   * y genera o actualiza el ticket de soporte si el problema no pudo resolverse.
   */
  private static async procesarEvidenciaTicket(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.toLowerCase().trim();
    const esConsultaPago = /\b(pagar|pago|saldo|debo|cuanto\s*debo|cuando\s*me\s*toca|factura|recibo|cuenta|tarjeta|transferencia|clabe|banco|mensualidad|costo)\b/i.test(lower);
    const esSaludo = /^(hola|buen\s*(dia|día)|buenas\s*(tardes|noches)?|saludos|que\s*tal|hey|hi)\b/i.test(lower);
    const esPositivo = /\b(si|sí|ya|quedo|quedó|listo|excelente|funciona|bien|muchas\s*gracias|gracias|perfecto|ya\s*sirve|ya\s*funciona)\b/i.test(lower) &&
      !/\b(no|no\s*quedo|no\s*quedó|sigue\s*igual|sigue\s*mal|nada|no\s*funciona|no\s*sirve)\b/i.test(lower);

    // Si el usuario reporta que ya quedó bien
    if (esPositivo) {
      const nombreLimpio = formatDisplayName(session?.client_name, true);
      const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
      await this.enviarYLoguear(
        phone,
        `¡Excelente noticia${nombre}! 🎉 Me alegra mucho que tu servicio esté funcionando correctamente. En *${this.getIspName()}* estamos a tus órdenes. ¡Que tengas un excelente día!`,
        'FALLA_INTERNET',
        'RESOLUCION_CONFIRMADA_CLIENTE',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si NO es imagen ni archivo y el usuario pregunta otra cosa distinta a la evidencia:
    if (!event.isMedia && (esConsultaPago || esSaludo)) {
      const sesionReset = await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL' });
      if (esConsultaPago) {
        await this.flujoConsultarSaldo(phone, sesionReset, targetJid);
      } else {
        const nombre = session?.client_name ? ` *${session.client_name}*` : '';
        await this.enviarYLoguear(phone, `¡Hola${nombre}! 👋 ¿En qué te podemos ayudar?`, 'SALUDO', 'SALUDO_CORDIAL', targetJid);
      }
      return;
    }

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    const folio = meta.ticketFolio;
    const isMedia = event.isMedia === true;
    const evidencia = isMedia ? 'Foto o captura de pantalla enviada por el cliente' : rawText;
    const outOfHours = this.isFueraDeHorario();
    const notaHorario = outOfHours ? '\n\n⏰ *Nota:* Tu reporte quedó registrado en el sistema y un técnico lo revisará a primera hora.' : '';

    if (folio) {
      await TursoService.updateTicketStatus(
        folio,
        'ABIERTO',
        `Evidencia recibida: "${evidencia}"`
      );

      await this.enviarYLoguear(
        phone,
        `¡Recibido! Ya adjunté tus comentarios a tu reporte *#${folio}*. El equipo técnico ya cuenta con todos los datos para darte seguimiento.${notaHorario}`,
        'FALLA_INTERNET',
        `EVIDENCIA_ADJUNTADA_${folio}`,
        targetJid
      );
    } else {
      // Como el usuario confirmó persistencia o no pudo enviar imagen, creamos el ticket AHORA al final
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: meta.resumenFalla || rawText || 'Falla persistente de internet',
        checks_performed: `Triage y reinicio completados. Cliente reportó: "${rawText || (isMedia ? '[Foto/Captura]' : 'N/A')}"`,
        has_photo: isMedia ? 1 : 0,
        has_speedtest: 0,
        all_devices: meta.triageAlcance === 'TODOS_DISPOSITIVOS' ? 1 : 0,
        status: 'ABIERTO',
        is_out_of_hours: outOfHours ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Soporte Falla - ${ticket.folio}`,
          `Reporte persistente sin solución automática. Diagnóstico: ${ticket.checks_performed}. Folio: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      const nombreLimpio = formatDisplayName(session?.client_name, true);
      const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';

      await this.enviarYLoguear(
        phone,
        `Enterado${nombre}. Hemos generado tu reporte formal de soporte técnico *#${ticket.folio}* para que nuestro equipo técnico revise tu línea a detalle y te dé solución.${notaHorario}\n\n¡Muchas gracias por tu reporte!`,
        'FALLA_INTERNET',
        `TICKET_CREADO_FINAL_${ticket.folio}`,
        targetJid
      );
    }

    await this.marcarConsultaFinalizada(phone, session);
  }

  /**
   * Obtiene la información técnica y de plan más completa del cliente desde Turso DB (wisphub_clients y smartolt_onus)
   */
  private static async obtenerContextoClienteCompleto(phone: string, session: Session | null) {
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    let clientWh: any = null;
    try {
      clientWh = await TursoService.getWisphubClientByAny({
        id: session?.client_id || meta.id_servicio,
        name: session?.client_name,
        ip: meta.ip,
        sn: meta.sn || session?.onu_id,
        phone,
      });
    } catch {}

    let planInternet = clientWh?.plan_internet || meta.speed_profile || '';
    if (!planInternet && session?.onu_id) {
      try {
        const onuInfo = await TursoService.getOnuById(session.onu_id);
        planInternet = onuInfo?.speed_profile || '';
      } catch {}
    }

    const precioPlan = clientWh?.precio_plan || '';
    const ip = clientWh?.ip || meta.ip || '';
    const estadoServicio = clientWh?.estado || 'Activo';

    // Extraer megas numéricos del plan (ej. de "Pakete Basic 40M" -> 40, de "Pakete Elite 200M" -> 200, "100 Mbps" -> 100)
    let velocidadMegas: number | null = null;
    if (planInternet) {
      const matchMegas = planInternet.match(/(\d+)\s*(?:mbps|megas|m\b)/i);
      if (matchMegas) {
        velocidadMegas = parseInt(matchMegas[1], 10);
      }
    }

    return {
      clientWh,
      planInternet,
      precioPlan,
      velocidadMegas,
      ip,
      estadoServicio,
    };
  }

  /**
   * Procesa de forma inteligente imágenes recibidas (Speedtest, Luces de módem Huawei x6/v5, Comprobantes de pago)
   * utilizando visión computacional de Groq.
   */
  private static async procesarImagenInteligente(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const analysis = event.imageAnalysis;
    const nombre = session?.client_name ? ` *${session.client_name}*` : '';
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    logger.info(`[Visión Inteligente] Procesando imagen para ${phone}: Tipo=${analysis?.tipo || 'OTRO'} | Descripción: "${analysis?.descripcion || ''}"`);

    // 0.1 CASO POTENCIA ÓPTICA (MEDIDOR POWER METER / OPTICAL MULTI-METER)
    if (analysis?.tipo === 'POTENCIA_OPTICA' && analysis.potencia_optica?.potencia_dbm !== null && analysis.potencia_optica?.potencia_dbm !== undefined) {
      const dbm = analysis.potencia_optica.potencia_dbm;
      const nm = analysis.potencia_optica.longitud_onda_nm || 1490;
      const optLevel = (dbm >= -27 && dbm <= -14) ? '✅ *Nivel Óptimo de Potencia*' : '⚠️ *Atenuación fuera de rango ideal (-15 a -27 dBm)*';
      
      const pendingEvidence = meta.pendingActivationEvidence || {};
      pendingEvidence.potencia_dbm = dbm;
      pendingEvidence.longitud_onda_nm = nm;
      meta.pendingActivationEvidence = pendingEvidence;
      
      await TursoService.upsertSession({
        phone,
        metadata: JSON.stringify(meta),
      });

      const msj = `📊 *Medición de Potencia Óptica:*\n` +
        `• *Potencia:* \`${dbm} dBm\`\n` +
        `• *Longitud de Onda:* \`${nm} nm\`\n` +
        `${optLevel}\n\n` +
        `✅ Evidencia registrada para el expediente de instalación.`;

      await this.enviarYLoguear(phone, msj, 'ACTIVACION_TECNICO', 'EVIDENCIA_POTENCIA_OPTICA', targetJid);
      return;
    }

    // 0.2 CASO ETIQUETA DE MÓDEM / ONT (Huawei, ZTE, VSOL)
    if (analysis?.tipo === 'ETIQUETA_MODEM' && (analysis.etiqueta_modem?.sn || analysis.etiqueta_modem?.mac)) {
      const sn = analysis.etiqueta_modem?.sn;
      const mac = analysis.etiqueta_modem?.mac;
      const modelo = analysis.etiqueta_modem?.modelo;
      const wifiPass = analysis.etiqueta_modem?.wifi_password;

      const pendingEvidence = meta.pendingActivationEvidence || {};
      if (sn) pendingEvidence.sn = sn;
      if (mac) pendingEvidence.mac = mac;
      if (modelo) pendingEvidence.modelo = modelo;
      if (wifiPass) pendingEvidence.wifi_password = wifiPass;
      meta.pendingActivationEvidence = pendingEvidence;

      await TursoService.upsertSession({
        phone,
        metadata: JSON.stringify(meta),
      });

      const msj = `🏷️ *Etiqueta de Módem Detectada:*\n` +
        (sn ? `• *Serie (SN):* \`${sn}\`\n` : '') +
        (modelo ? `• *Modelo:* \`${modelo}\`\n` : '') +
        (mac ? `• *MAC:* \`${mac}\`\n` : '') +
        (wifiPass ? `• *Clave Wi-Fi:* \`${wifiPass}\`\n` : '') +
        `\n✅ Datos de equipo registrados listos para aprovisionamiento.`;

      await this.enviarYLoguear(phone, msj, 'ACTIVACION_TECNICO', 'EVIDENCIA_ETIQUETA_MODEM', targetJid);
      return;
    }

    // 0. CASO CONTRATO DE INSTALACIÓN / COMODATO (ACTIVACIÓN POR FOTO CON IA)
    if (analysis?.tipo === 'CONTRATO_INSTALACION' && analysis.datos_contrato) {
      await this.procesarActivacionPorContrato(phone, rawText, analysis.datos_contrato, session, targetJid);
      return;
    }

    // 1. CASO SPEEDTEST / TEST DE VELOCIDAD
    if (analysis?.tipo === 'SPEEDTEST') {
      const bajadaNum = analysis.speedtest?.bajada_mbps;
      const subidaNum = analysis.speedtest?.subida_mbps;
      const pingNum = analysis.speedtest?.ping_ms;

      const bajada = bajadaNum ? `${bajadaNum} Mbps` : 'detectada';
      const subida = subidaNum ? `${subidaNum} Mbps` : null;
      const ping = pingNum ? `${pingNum} ms` : null;
      const folio = meta.ticketFolio;

      // Obtener plan y velocidad real del cliente en WispHub / Turso DB
      const clienteCtx = await this.obtenerContextoClienteCompleto(phone, session);
      const planContratado = clienteCtx.planInternet || meta.speed_profile || '';
      const velocidadMegasOficial = clienteCtx.velocidadMegas;

      const planTexto = planContratado
        ? `\n• *Paquete contratado:* ${planContratado}${velocidadMegasOficial ? ` (${velocidadMegasOficial} Mbps de descarga)` : ''}`
        : '';

      const planMegasNum = velocidadMegasOficial;

      // Se considera óptima si entrega al menos el 80% del paquete contratado (o más por balanceo/burst)
      const esVelocidadOptima = Boolean(bajadaNum && planMegasNum && bajadaNum >= planMegasNum * 0.8);

      const resumenMetricas = [
        `• *Descarga (Download):* ${bajada}`,
        subida ? `• *Subida (Upload):* ${subida}` : null,
        ping ? `• *Latencia (Ping):* ${ping}` : null,
      ].filter(Boolean).join('\n');

      const partesCortas = [`*${bajada}* de descarga`];
      if (subida) partesCortas.push(`*${subida}* de subida`);
      if (ping) partesCortas.push(`Latencia: ${ping}`);
      const resumenCorto = partesCortas.join(', ');

      if (esVelocidadOptima) {
        // CASO A: Velocidad entregando 100%+ del paquete contratado
        if (folio) {
          await TursoService.updateTicketStatus(
            folio,
            'RESUELTO',
            `✅ Speedtest óptimo: Bajada=${bajada}${subida ? `, Subida=${subida}` : ''}${ping ? `, Ping=${ping}` : ''} (vs ${planMegasNum || 'N/A'} Mbps contratados). Enlace entregando velocidad completa. Reporte resuelto automáticamente.`
          );

          const msj =
            `¡Recibí tu prueba de velocidad de Speedtest! 📊\n\n` +
            `${resumenMetricas}${planTexto}\n\n` +
            `✅ *¡Excelente noticia!* Tu velocidad de *${bajada}* está entregando el *100% de tu paquete contratado* (*${planContratado || 'Plan Internet'}* de ${planMegasNum || '40'} Mbps)${bajadaNum && planMegasNum && bajadaNum > planMegasNum ? ' (incluso estás recibiendo un poco más de megas por la holgura del enlace)' : ''}.\n\n` +
            `📡 Tu línea de fibra óptica y tu conexión en la central están operando en óptimas condiciones.\n` +
            `💡 *Recomendación:* Si notas lentitud en algún dispositivo o aplicación en particular, puede deberse a la distancia o saturación Wi-Fi de ese equipo. Te sugerimos acercarte al módem o reconectar el Wi-Fi.\n\n` +
            `Dado que tu servicio está entregando la velocidad contratada correctamente, tu reporte previo *#${folio}* ha quedado *resuelto automáticamente*. ¡Muchas gracias!`;

          await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', `SPEEDTEST_OPTIMO_RESUELTO_${folio}`, targetJid);
          await this.marcarConsultaFinalizada(phone, session);
          return;
        }

        // Sin ticket previo pero velocidad óptima
        const msj =
          `¡Listo! Tu prueba marca ${resumenCorto}.\n\n` +
          `✅ Tu enlace está entregando el *100% de tu paquete contratado* (*${planContratado || 'Plan Fibra'}* de ${planMegasNum || '40'} Mbps).\n\n` +
          `Tu fibra óptica y conexión en central están al 100%. Si notas lentitud en algún equipo en particular, suele deberse a distancia o interferencia Wi-Fi. Te sugerimos acercarte al módem o reconectar el equipo.\n\n` +
          `¡En *${this.getIspName()}* seguimos a tus órdenes!`;

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', 'SPEEDTEST_OPTIMO_SIN_TICKET', targetJid);
        await this.marcarConsultaFinalizada(phone, session);
        return;
      }

      // CASO B: Velocidad por debajo de lo contratado (se mantiene/crea ticket de soporte)
      if (folio) {
        await TursoService.updateTicketStatus(
          folio,
          'ABIERTO',
          `⚠️ Speedtest con déficit: Bajada=${bajada}${subida ? `, Subida=${subida}` : ''}${ping ? `, Ping=${ping}` : ''}. Plan=${planContratado || 'N/A'} (${planMegasNum || 'N/A'} Mbps)`
        );

        const msj =
          `¡Recibí tu prueba de velocidad de Speedtest! 📊\n\n` +
          `${resumenMetricas}${planTexto}\n\n` +
          `⚠️ Tu velocidad de *${bajada}* se encuentra por debajo de tu paquete contratado (*${planContratado}* de ${planMegasNum} Mbps).\n\n` +
          `Ya adjunté esta evidencia a tu reporte *#${folio}*. El equipo de soporte técnico revisará el rendimiento de tu enlace para calibrar tu velocidad. ¡Muchas gracias!`;

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', `SPEEDTEST_DEFICIT_${folio}`, targetJid);
        await this.marcarConsultaFinalizada(phone, session);
        return;
      }

      // Si no había ticket previo y la velocidad es baja, creamos el reporte formal de velocidad
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: `Velocidad baja en Speedtest (${bajada} bajada vs plan ${planContratado || 'N/A'})`,
        checks_performed: `Captura de Speedtest con velocidad baja: Bajada=${bajada}${subida ? `, Subida=${subida}` : ''}${ping ? `, Ping=${ping}` : ''}. Plan=${planContratado || 'N/A'} (${planMegasNum || 'N/A'} Mbps)`,
        has_photo: 1,
        has_speedtest: 1,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Speedtest Bajo - ${ticket.folio}`,
          `Prueba de velocidad enviada por cliente con velocidad baja: Bajada=${bajada}${subida ? `, Subida=${subida}` : ''}${ping ? `, Ping=${ping}` : ''}. Plan: ${planContratado || 'N/A'}. Folio: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      const msj =
        `¡Recibí tu prueba de velocidad de Speedtest! 📊\n\n` +
        `${resumenMetricas}${planTexto}\n\n` +
        `⚠️ Tu velocidad de *${bajada}* se encuentra por debajo de tu paquete contratado.\n\n` +
        `Ya registré tus resultados con el reporte *#${ticket.folio}* para que el personal técnico revise la estabilidad y velocidad asignada a tu servicio.`;

      await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', `SPEEDTEST_NUEVO_${ticket.folio}`, targetJid);
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // 2. CASO LUCES DE MÓDEM (Huawei EG8145V5 / HG8245H / OptiXstar / x6 / v5, etc.)
    if (analysis?.tipo === 'MODEM_LUCES') {
      if (analysis.foco_rojo) {
        const ticket = await TursoService.createTicket({
          phone,
          client_name: session?.client_name,
          onu_id: session?.onu_id,
          issue_summary: 'Foco rojo / LOS detectado en foto de módem',
          checks_performed: 'Foto analizada con Visión IA: Módem presenta foco rojo / LOS activo (sin señal de fibra óptica).',
          has_photo: 1,
          status: 'ABIERTO',
          is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
        });

        if (session?.client_id) {
          await WispHubService.crearTicketSoporte(
            session.client_id,
            `Foco Rojo - ${ticket.folio}`,
            `Foto enviada por cliente muestra foco rojo/LOS activo. Folio: ${ticket.folio}`,
            'Alta'
          ).catch(() => {});
        }

        const msj =
          `Hola${nombre}, he revisado la foto de tu módem y observo que tiene un *foco rojo* encendido (indica una interrupción en la señal física de la fibra óptica).\n\n` +
          `🛠️ Hemos registrado tu reporte con el folio *#${ticket.folio}* para canalizar una visita técnica a tu domicilio lo más pronto posible.\n\n` +
          `📞 Un compañero de nuestro equipo se comunicará contigo para coordinar qué día y horario pasan a revisarlo.\n\n` +
          `📍 Por favor compártenos tu *ubicación actual por WhatsApp* o tu *dirección completa con referencias* para registrarla en la orden de visita.`;

        await TursoService.upsertSession({
          phone,
          step: 'ESPERANDO_UBICACION_TECNICO',
          metadata: JSON.stringify({
            ...meta,
            ticketFolio: ticket.folio,
            resumenFalla: 'Foco rojo detectado en foto de módem',
          }),
        });

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', `FOCO_ROJO_FOTO_${ticket.folio}`, targetJid);
        return;
      }

      if (analysis.equipo_apagado) {
        const msj =
          `Hola${nombre}, he revisado la foto de tu equipo y parece estar totalmente apagado o sin corriente eléctrica.\n\n` +
          `Por favor verifica que el cable de corriente esté bien conectado al enchufe y que el botón de encendido posterior esté presionado. (Por favor no muevas el cable delgado de internet).\n\n` +
          `¿Logra encender alguna luz?`;

        await TursoService.upsertSession({
          phone,
          step: 'COMPROBACION_TURNO_1',
          metadata: JSON.stringify({
            ...meta,
            resumenFalla: 'Módem apagado detectado en foto',
          }),
        });

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', 'MODEM_APAGADO_FOTO', targetJid);
        return;
      }

      if (analysis.luces_verdes) {
        if (session?.step === 'DIAGNOSTICO_POST_REINICIO' || session?.step === 'MONITOREO_POST_REINICIO' || meta.esperandoFotoModem) {
          const msj =
            `Hola${nombre}, revisé la foto de tu equipo y las luces se observan correctas. 👍\n\n` +
            `Serías tan amable de monitorear tu servicio el resto de la tarde. Si notas cualquier detalle o no mejora, nos puedes notificar para que pasen a tu domicilio por favor. ¡Quedamos atentos! 😊`;

          await TursoService.upsertSession({
            phone,
            step: 'MONITOREO_POST_REINICIO',
            metadata: JSON.stringify({
              ...meta,
              resumenFalla: 'Foto de módem con luces correctas recibida',
            }),
          });

          await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', 'LUCES_VERDES_MONITOREO', targetJid);
          return;
        }

        const msj =
          `Hola${nombre}, he revisado la foto de tu módem y las luces se observan encendidas y con señal normal (verde/azul). 👍\n\n` +
          `Como la señal física llega bien a tu equipo:\n` +
          `¿La lentitud o problema te pasa en *todos tus aparatos (celulares, pantallas, computadoras)* o *solo en uno en específico*?`;

        await TursoService.upsertSession({
          phone,
          step: 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS',
          metadata: JSON.stringify({
            ...meta,
            resumenFalla: 'Luces verdes normales en foto',
          }),
        });

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', 'LUCES_VERDES_FOTO', targetJid);
        return;
      }
    }

    // 3. CASO COMPROBANTE DE PAGO BANCARIO (BBVA, SPEI, OXXO, TRANSFERENCIAS)
    if (analysis?.tipo === 'COMPROBANTE_PAGO') {
      const datos = analysis.datos_pago;
      const montoRaw = datos?.monto ? datos.monto.replace(/[^\d.]/g, '') : '300.00';
      const monto = `$${montoRaw}`;
      const banco = datos?.banco || 'BBVA';
      const folio = datos?.referencia || '';
      const conceptoImg = (datos?.concepto || '').trim();
      const destinatario = datos?.destinatario || '';

      // Reasignar departamento inmediatamente a ATENCION en Turso DB
      await TursoService.updateDepartment(phone, 'ATENCION').catch(() => {});

      // Buscar si el cliente ya está identificado o si podemos extraer su identidad
      let clienteIdentificado: any = null;

      // 1. Intentar por texto del pie de foto (caption, ej: "Le envio el comprobante de pago del sr. Israel Ponce Ortiz de Cañada Chica")
      if (rawText && rawText.length >= 4) {
        const textoLimpio = cleanPersonName(rawText);
        const matchesCaption = await TursoService.searchOnusFuzzy(textoLimpio || rawText, 3);
        if (matchesCaption.length > 0 && matchesCaption[0].matchScore >= 65) {
          clienteIdentificado = matchesCaption[0];
        }
      }

      // 2. Si no se encontró por caption, buscar por el Concepto extraído de la foto (ej: "ISRAEL PONCE ORTIZ")
      if (!clienteIdentificado && conceptoImg && conceptoImg.length >= 4 && !/^(?:pago|internet|mensualidad|servicio|abono|wifi)\b/i.test(conceptoImg)) {
        const matchesConcepto = await TursoService.searchOnusFuzzy(conceptoImg, 3);
        if (matchesConcepto.length > 0 && matchesConcepto[0].matchScore >= 65) {
          clienteIdentificado = matchesConcepto[0];
        }
      }

      // 3. Si no se encontró, buscar por teléfono en SmartOLT / WispHub
      if (!clienteIdentificado) {
        const matchesTel = await TursoService.searchOnusFuzzy(phone, 3);
        if (matchesTel.length > 0 && matchesTel[0].matchScore >= 85) {
          clienteIdentificado = matchesTel[0];
        }
      }

      // 4. Si la sesión previa ya tenía el nombre
      if (!clienteIdentificado && session?.client_name) {
        clienteIdentificado = {
          name: session.client_name,
          unique_external_id: session.onu_id || session.client_id || '',
          address: '',
          zone_name: '',
        };
      }

      let detalleInfo = `\n• *Monto detectado:* ${monto}`;
      if (banco) detalleInfo += `\n• *Banco / Emisor:* ${banco}`;
      if (folio) detalleInfo += `\n• *Folio de operación:* ${folio}`;

      if (clienteIdentificado) {
        // CLIENTE RECONOCIDO CON ÉXITO
        const nombreTitular = clienteIdentificado.name || session?.client_name;
        const ubicacion = clienteIdentificado.address || clienteIdentificado.zone_name ? ` (${clienteIdentificado.address || clienteIdentificado.zone_name})` : '';

        // Auto-vincular sesión y teléfono
        await TursoService.upsertSession({
          phone,
          client_name: nombreTitular,
          client_id: clienteIdentificado.unique_external_id || clienteIdentificado.id || null,
          onu_id: clienteIdentificado.unique_external_id || null,
          department: 'ATENCION',
          step: 'CONSULTA_FINALIZADA',
          metadata: JSON.stringify({
            ...meta,
            ultimoPago: {
              monto,
              banco,
              folio,
              concepto: conceptoImg,
              destinatario,
              fecha: new Date().toISOString(),
            },
            consultaFinalizada: true,
          }),
        });

        if (clienteIdentificado.unique_external_id) {
          await TursoService.updateWisphubClientPhone(clienteIdentificado.unique_external_id, phone).catch(() => {});
        }

        const msj =
          `¡Hola! 👋 Muchas gracias, recibí tu comprobante de pago por *${monto}* a nombre de *${nombreTitular}*${ubicacion}. 🧾✨\n${detalleInfo}\n\n` +
          `✅ *Pago registrado en el sistema:* La información ya fue enviada a nuestra área de *Atención y Cobranza* para su validación en el banco y aplicación en tu cuenta.\n\n` +
          `¡Agradecemos mucho tu puntualidad! Si necesitas algo más, seguimos a tus órdenes.`;

        await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', `COMPROBANTE_AUTO_IDENTIFICADO_${folio || 'OK'}`, targetJid);
        return;
      } else {
        // CLIENTE AÚN NO RECONOCIDO -> ENTRAR EN VENTANA DE ESPERA DE DATOS
        await TursoService.upsertSession({
          phone,
          department: 'ATENCION',
          step: 'ESPERANDO_DATOS_PAGO',
          metadata: JSON.stringify({
            ...meta,
            pagoPendiente: {
              monto,
              banco,
              folio,
              concepto: conceptoImg,
              destinatario,
              timestamp: Date.now(),
            },
          }),
        });

        const msj =
          `¡Hola! 👋 He recibido tu comprobante de pago por *${monto}*${banco ? ` de *${banco}*` : ''}. 📸\n${detalleInfo}\n\n` +
          `Para registrarlo y aplicarlo correctamente a tu cuenta:\n` +
          `👉 *¿Podrías indicarnos a nombre de quién está contratado el servicio de internet o tu dirección / comunidad?*`;

        await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', 'COMPROBANTE_ESPERANDO_DATOS', targetJid);
        return;
      }
    }

    // 4. OTRO TIPO DE IMAGEN (O EN PASO DE ESPERA)
    if (session?.step === 'COMPROBACION_EVIDENCIA') {
      await this.procesarEvidenciaTicket(phone, rawText, event, session, targetJid);
      return;
    }

    if (session?.step === 'ESPERANDO_COMPROBANTE') {
      const msj =
        `¡Muchas gracias por tu imagen! 📸 Hemos recibido tu archivo adjunto${nombre}.\n\n` +
        `Nuestro equipo administrativo revisará el comprobante en el sistema para aplicar tu abono a la brevedad. ¡Que tengas un excelente día!`;

      await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', 'COMPROBANTE_GENERICO_RECIBIDO', targetJid);
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si envió una imagen en frío sin paso previo
    const desc = analysis?.descripcion ? `_${analysis.descripcion}_\n\n` : '';
    const msj =
      `¡Hola${nombre}! 📸 Recibí tu imagen adjunta.\n\n${desc}` +
      `¿En qué podemos apoyarte el día de hoy con tu servicio de internet? Cuéntame tu duda o reporte.`;

    await this.enviarYLoguear(phone, msj, 'DESCONOCIDO', 'IMAGEN_RECIBIDA_CONVERSACIONAL', targetJid);
  }

  /**
   * Procesa y registra automáticamente las ubicaciones enviadas por WhatsApp (locationMessage, Google Maps, o tiempo real)
   */
  private static async procesarUbicacionCliente(
    phone: string,
    loc: { latitude?: number; longitude?: number; address?: string; name?: string; url?: string; isLive?: boolean },
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lat = loc.latitude;
    const lng = loc.longitude;
    const url = loc.url || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '');
    const coordsStr = lat && lng ? `${lat},${lng}` : '';
    const direccion = loc.address || loc.name || '';

    logger.info(`[Ubicación WhatsApp] Procesando ubicación para ${phone}: Coordenadas=${coordsStr}, URL=${url}`);

    // Si el remitente es un TÉCNICO AUTORIZADO en campo
    const authTecnico = await this.verificarAutorizacionTecnico(phone);
    if (authTecnico.autorizado) {
      let meta: any = {};
      try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
      const targetClientId = meta.pendingActivation?.client_id || meta.pendingActivation?.name || meta.pendingModemSwap?.name || meta.lastActivatedClientId || meta.lastActivatedName;

      const pendingEvidence = meta.pendingActivationEvidence || {};
      pendingEvidence.gps = { lat, lng, coordsStr, url, direccion };
      meta.pendingActivationEvidence = pendingEvidence;
      await TursoService.upsertSession({ phone, metadata: JSON.stringify(meta) });

      if (targetClientId) {
        await TursoService.updateClientLocation(targetClientId, { lat, lng, url, direccion, notas: loc.name });
      }

      // Notificar vía SSE al panel de administración en tiempo real
      try {
        const { AdminController } = require('../controllers/admin.controller');
        AdminController.broadcastSSE('chat:location_received', {
          phone,
          techName: authTecnico.tech?.name,
          coords: coordsStr,
          url,
          direccion,
          targetClient: targetClientId,
          timestamp: new Date().toISOString(),
        });
      } catch {}

      const mensajeTecnico =
        `📍 *Ubicación GPS Recibida y Guardada*\n\n` +
        `• *Coordenadas:* \`${coordsStr || 'GPS'}\`\n` +
        `• *Maps:* ${url || 'https://maps.google.com'}\n` +
        (targetClientId ? `• *Cliente Asignado:* *${targetClientId}*\n` : '') +
        (direccion ? `• *Referencia:* ${direccion}\n` : '') +
        `\n✅ Coordenadas guardadas en base de datos y sincronizadas con el mapa de WispHub.`;

      await this.enviarYLoguear(phone, mensajeTecnico, 'ACTIVACION_TECNICO', 'GPS_TECNICO_GUARDADO', targetJid);
      return;
    }

    // 1. Guardar en base de datos Turso DB (wisphub_clients, smartolt_onus, tickets)
    await TursoService.updateClientLocation(phone, {
      lat,
      lng,
      url,
      direccion,
      notas: loc.name,
    });

    // 2. Notificar vía SSE al panel de administración en tiempo real
    try {
      const { AdminController } = require('../controllers/admin.controller');
      AdminController.broadcastSSE('chat:location_received', {
        phone,
        coords: coordsStr,
        url,
        direccion,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    // 3. Buscar nombre del cliente si está registrado
    let clientName = session?.client_name || '';
    if (!clientName) {
      try {
        const clientDir = await TursoService.getClientsDirectory({ search: phone, limit: 1 });
        if (clientDir && clientDir.clients && clientDir.clients.length > 0) {
          clientName = clientDir.clients[0].nombre;
        }
      } catch {}
    }
    const primerNombre = clientName ? clientName.trim().split(/\s+/)[0] : '';
    const saludo = primerNombre ? `¡Muchas gracias, *${primerNombre}*!` : `¡Muchas gracias!`;

    // 4. Armar respuesta cordial y confirmar el guardado de la ubicación
    const mensaje = 
      `📍 *${saludo} Hemos registrado tu ubicación con éxito.*\n\n` +
      `✅ Las coordenadas de tu domicilio han quedado guardadas en tu expediente técnico de servicio.\n\n` +
      `🗺️ *Ubicación:* ${coordsStr || url || 'Enlace de Google Maps'}\n` +
      (direccion ? `🏠 *Referencia:* ${direccion}\n\n` : `\n`) +
      `Esto nos permite georreferenciar tu instalación y optimizar el tiempo de llegada en caso de visitas técnicas o soporte en sitio. 🛠️🚗\n\n` +
      `¿Hay alguna falla que desees reportar o algún otro trámite en el que te podamos apoyar?`;

    await this.enviarYLoguear(
      phone,
      mensaje,
      'UBICACION_REGISTRADA',
      'UBICACION_GPS_GUARDADA',
      targetJid
    );
  }

  /**
   * Procesa el mensaje de texto enviado por un cliente tras haber enviado un comprobante de pago
   * Busca al titular por nombre, folio o comunidad y vincula el abono
   */
  private static async procesarDatosPagoComplementarios(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
    const pago = meta.pagoPendiente || {};
    const monto = pago.monto || '$300.00';
    const banco = pago.banco || 'BBVA';
    const folio = pago.folio || '';

    logger.info(`[Pago Complementario] Procesando datos para comprobante previo de ${phone}: "${rawText}" (Monto: ${monto})`);

    const textoLimpio = cleanPersonName(rawText);
    const matches = await TursoService.searchOnusFuzzy(textoLimpio || rawText, 5);

    if (matches.length > 0 && matches[0].matchScore >= 55) {
      const matched = matches[0];
      const nombreTitular = matched.name;
      const ubicacion = matched.address || matched.zone_name ? ` (${matched.address || matched.zone_name})` : '';

      await TursoService.upsertSession({
        phone,
        client_name: nombreTitular,
        client_id: matched.unique_external_id || null,
        onu_id: matched.unique_external_id || null,
        department: 'ATENCION',
        step: 'CONSULTA_FINALIZADA',
        metadata: JSON.stringify({
          ...meta,
          pagoPendiente: null,
          ultimoPago: {
            ...pago,
            cliente: nombreTitular,
            fechaRegistro: new Date().toISOString(),
          },
          consultaFinalizada: true,
        }),
      });

      if (matched.unique_external_id) {
        await TursoService.updateWisphubClientPhone(matched.unique_external_id, phone).catch(() => {});
      }

      let detalle = `\n• *Monto:* ${monto}`;
      if (banco) detalle += `\n• *Banco:* ${banco}`;
      if (folio) detalle += `\n• *Folio:* ${folio}`;

      const msj =
        `¡Excelente! 👍 Ya asocié tu comprobante de pago de *${monto}* al servicio de *${nombreTitular}*${ubicacion}. 🧾✨\n${detalle}\n\n` +
        `✅ *Registrado con éxito:* El área de *Atención y Cobranza* verificará la transferencia y aplicará el abono en el sistema a la brevedad.\n\n` +
        `¡Muchas gracias por tu pago y preferencia!`;

      await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', `COMPROBANTE_COMPLEMENTADO_${folio || 'OK'}`, targetJid);
    } else {
      // Si no hubo coincidencia clara, pedir aclaración amablemente
      const msj =
        `Gracias por los datos. Para localizar tu contrato en el sistema con exactitud, ¿nos podrías confirmar tu *Nombre completo* (con apellidos) o tu *número de contrato*?`;
      await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', 'COMPROBANTE_DATOS_AMBIGUOS', targetJid);
    }
  }

  /**
   * Diagnóstico general o reporte de falla iniciado desde botón de menú
   */
  private static async flujoReportarFalla(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    await this.flujoFallaInteligente(
      phone,
      { intencion: 'FALLA_INTERNET', resumen_queja: 'Reporte de falla técnica desde menú' } as any,
      session,
      targetJid
    );
  }

  /**
   * Flujo de Consulta de Niveles / Estado de Conexión:
   * BLOQUEA la entrega de valores técnicos numéricos en dBm al cliente final
   * (reservado para diagnóstico interno del NOC e ingeniería).
   * Traduce la telemetría a lenguaje comprensible y comercial para el usuario.
   */
  private static async flujoConsultarNiveles(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    const onuId = session?.onu_id || (session?.client_id ? `ONU-${session.client_id}` : null);
    const nombre = session?.client_name ? ` ${session.client_name}` : '';

    if (!onuId) {
      await this.enviarYLoguear(
        phone,
        `Para verificar tu línea en el sistema, por favor indícame tu *Nombre completo* o número de contrato:`,
        'CONSULTAR_NIVELES',
        'SOLICITAR_IDENTIFICACION_NIVELES',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    const estadoOnu = await SmartOLTService.obtenerEstadoONU(onuId);
    logger.info(`[NOC-DIAGNOSTICO-INTERNO] Línea para ${phone} (ONU: ${onuId}): Status=${estadoOnu.status}`);

    if (estadoOnu.status === 'LOS') {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: 'Corte de cableado exterior hacia domicilio (LOS detectado en central)',
        checks_performed: 'Verificación en central: SmartOLT reporta LOS (Loss of Signal).',
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      let meta: any = {};
      try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_UBICACION_TECNICO',
        metadata: JSON.stringify({
          ...meta,
          ticketFolio: ticket.folio,
        }),
      });

      await this.enviarYLoguear(
        phone,
        `Hola${nombre}, revisamos tu servicio en nuestro sistema y detectamos un inconveniente con la señal física del cable que llega a tu domicilio.\n\n` +
        `🛠️ Hemos registrado tu reporte con el folio *#${ticket.folio}* para canalizar una visita técnica a tu domicilio lo más pronto posible.\n\n` +
        `📞 Un compañero de nuestro equipo se comunicará contigo para coordinar qué día y horario pasan a revisarlo.\n\n` +
        `📍 Por favor compártenos tu ubicación por aquí o tu dirección completa con referencias para registrarla en la orden de visita.`,
        'CONSULTAR_NIVELES',
        `TICKET_FIBRA_CORTADA_${ticket.folio}`,
        targetJid
      );
      return;
    }

    // Validación de atenuación óptica fuera de rango (< -27.5 dBm ó > -10 dBm)
    const powerLevel = estadoOnu.opticalPowerDbm;
    const tieneAtenuacion = powerLevel != null && (powerLevel < -27.5 || powerLevel > -10);

    if (estadoOnu.status === 'ONLINE' && tieneAtenuacion) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: `Atenuación óptica detectada en consulta (${powerLevel} dBm)`,
        checks_performed: `Niveles ópticos en central: ${powerLevel} dBm fuera de rango (< -27.5 dBm). Requiere visita técnica a domicilio para revisar acometida.`,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Atenuación - ${ticket.folio}`,
          `Nivel óptico: ${powerLevel} dBm. Requiere visita a domicilio. Folio: ${ticket.folio}`,
          'Alta'
        ).catch(() => {});
      }

      await this.enviarYLoguear(
        phone,
        `Hola${nombre}, revisamos tu servicio en nuestro sistema y detectamos una variación en la señal física que llega a tu domicilio.\n\n` +
        `🛠️ Hemos registrado tu reporte con el folio *#${ticket.folio}* para canalizar una visita técnica lo más pronto posible.\n\n` +
        `📞 Un compañero de nuestro equipo se comunicará contigo para coordinar el día y horario en que puedan pasar a tu domicilio.`,
        'CONSULTAR_NIVELES',
        `NIVELES_ATENUACION_${ticket.folio}`,
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    if (estadoOnu.status === 'POWER_FAIL') {
      await this.enviarYLoguear(
        phone,
        `Hola${nombre}, revisé tu línea y tu módem aparece apagado o sin corriente eléctrica.\n\nPor favor verifica que esté bien conectado a la toma de corriente y encendido. (Por favor no muevas el cable delgado de internet).`,
        'CONSULTAR_NIVELES',
        'SMARTOLT_POWER_FAIL',
        targetJid
      );
      return;
    }

    if (estadoOnu.status === 'ONLINE') {
      await this.enviarYLoguear(
        phone,
        `Hola${nombre}, revisé tu línea aquí en el sistema y tu conexión se encuentra en línea y estable. 👍\n\nSi llegas a notar lentitud o alguna falla con tu internet, avísame por aquí para revisarlo contigo.`,
        'CONSULTAR_NIVELES',
        'NIVELES_INFORMADOS_COMERCIAL',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si está Offline
    await this.enviarYLoguear(
      phone,
      `Hola${nombre}, revisé tu línea y tu equipo aparece desconectado en el sistema.\n\nPor favor verifica que el módem esté encendido con sus luces frontales activas.`,
      'CONSULTAR_NIVELES',
      'SMARTOLT_OFFLINE',
      targetJid
    );
  }

  /**
   * Envía la orden de reinicio remoto a la ONU en SmartOLT, previa validación financiera en WispHub
   */
  private static async flujoReiniciarModem(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    const onuId = session?.onu_id || `ONU-${session?.client_id || 'DEFAULT'}`;
    const nombre = session?.client_name ? ` ${session.client_name}` : '';
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    // 1. Verificación previa en WispHub (¿está activo o suspendido/moroso?)
    try {
      const estadoFinanciero = await WispHubService.verificarEstadoFinanciero({
        clienteId: session?.client_id,
        nombre: session?.client_name,
        phone,
        sn: meta.sn,
        ip: meta.ip,
      });

      const tieneDeudaReal = estadoFinanciero.totalDeuda > 0 || (estadoFinanciero.facturas && estadoFinanciero.facturas.length > 0);

      if (tieneDeudaReal) {
        logger.info(`Intento de reinicio bloqueado: Cliente ${phone} (${session?.client_name}) con adeudo real en WispHub: $${estadoFinanciero.totalDeuda}.`);
        const mpUrl = await this.obtenerLinkMercadoPago({
          clientName: session?.client_name,
          clientId: session?.client_id,
          phone,
          monto: estadoFinanciero.totalDeuda > 0 ? estadoFinanciero.totalDeuda : 250,
          folioFactura: null,
        });
        const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA Bancomer');
        const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0152433212 90');
        const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());

        let onlinePaySection = '';
        if (mpUrl) {
          onlinePaySection = `\n🛒 *Pagar en línea con Mercado Pago / Tarjeta (Acreditación inmediata):*\n👉 ${mpUrl}\n`;
        }

        const msj = `Hola${nombre}, revisé tu línea antes de proceder con el reinicio y detectamos que registras un saldo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*.\n` +
          `${onlinePaySection}\n` +
          `💳 *También puedes pagar por Transferencia Bancaria:*\n` +
          `• Banco: *${bank}* | CLABE: *${account}*\n` +
          `• Beneficiario: *${beneficiary}*\n` +
          `• Concepto / Referencia: *${session?.client_name || phone}*\n\n` +
          `📸 En cuanto realices tu pago, por favor envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* en este chat para reactivar tu servicio.`;

        await this.enviarYLoguear(phone, msj, 'CONSULTAR_SALDO', 'REINICIO_BLOQUEADO_POR_ADEUDO', targetJid);
        await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
        return;
      } else if (estadoFinanciero.suspendido) {
        logger.info(`Triage de soporte: Cliente ${phone} (${session?.client_name}) figura suspendido pero sin deuda. Reactivando servicio...`);
        const idWispHub = estadoFinanciero.cliente?.id ||
          (session?.service_id && !String(session.service_id).startsWith('HWTC') && !String(session.service_id).startsWith('ONU-') && !String(session.service_id).startsWith('ZTEG') ? session.service_id : null) ||
          (session?.client_id && !String(session.client_id).startsWith('HWTC') && !String(session.client_id).startsWith('ONU-') && !String(session.client_id).startsWith('ZTEG') ? session.client_id : null);
        const ipCliente = estadoFinanciero.cliente?.ip;
        const nombreClienteActivar = session?.client_name || estadoFinanciero.cliente?.nombre;

        if (idWispHub || ipCliente || nombreClienteActivar) {
          await WispHubService.activarCliente({
            id: idWispHub,
            name: nombreClienteActivar,
            ip: ipCliente,
            sn: session?.onu_id,
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      logger.warn(`Error al verificar estado de pago en WispHub antes de reiniciar:`, err?.message || err);
    }

    const resultado = await SmartOLTService.rebootONU(onuId);

    if (resultado.success) {
      await this.enviarYLoguear(
        phone,
        `Listo${nombre}, mandé la orden de reinicio a tu módem. Tardará entre 2 y 3 minutos en restablecerse. En cuanto terminen de encender las luces, pruébalo y me avisas cómo te funcionó. 👍`,
        'REINICIAR_MODEM',
        'REBOOT_EXITOSO',
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `No fue posible reiniciar el módem automáticamente desde la central. Por favor desconéctalo de la toma de corriente por 30 segundos y vuelve a conectarlo.`,
        'REINICIAR_MODEM',
        'REBOOT_FALLIDO_MANUAL',
        targetJid
      );
    }
  }

  /**
   * Consulta de facturas y saldos pendientes en WispHub
   */
  private static async flujoConsultarSaldo(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    if (!session?.client_id && !session?.client_name) {
      await this.enviarYLoguear(
        phone,
        `Para consultar tu estado de cuenta requerimos tu número de contrato o nombre. Por favor escribe tu *Nombre completo* o *ID de contrato*:`,
        'CONSULTAR_SALDO',
        'SOLICITAR_CONTRATO_SALDO',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    const estadoFinanciero = await WispHubService.verificarEstadoFinanciero({
      clienteId: session?.client_id,
      nombre: session?.client_name,
      phone,
      sn: meta.sn,
      ip: meta.ip,
    });

    const facturas = estadoFinanciero.facturas.length > 0
      ? estadoFinanciero.facturas
      : (session?.client_id ? await WispHubService.obtenerFacturasPendientes(session.client_id) : []);

    const tieneDeudaReal = estadoFinanciero.totalDeuda > 0 || facturas.length > 0;

    if (!tieneDeudaReal) {
      const ficha = this.getFichaBancaria(session);
      const nombreCliente = formatDisplayName(session?.client_name, true) || 'Cliente';

      if (estadoFinanciero.suspendido) {
        const idWispHub = estadoFinanciero.cliente?.id ||
          (session?.service_id && !String(session.service_id).startsWith('HWTC') && !String(session.service_id).startsWith('ONU-') && !String(session.service_id).startsWith('ZTEG') ? session.service_id : null) ||
          (session?.client_id && !String(session.client_id).startsWith('HWTC') && !String(session.client_id).startsWith('ONU-') && !String(session.client_id).startsWith('ZTEG') ? session.client_id : null);
        const ipCliente = estadoFinanciero.cliente?.ip || meta.ip;
        const nombreClienteActivar = session?.client_name || estadoFinanciero.cliente?.nombre;

        if (idWispHub || ipCliente || nombreClienteActivar) {
          await WispHubService.activarCliente({
            id: idWispHub,
            name: nombreClienteActivar,
            ip: ipCliente,
            sn: meta.sn || session?.onu_id,
          }).catch(() => {});
        }
        await this.enviarYLoguear(
          phone,
          `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${nombreCliente}*, no tienes ningún recibo pendiente de pago. ✅\n\n` +
          `⚠️ Detectamos que tu servicio aparecía como *Suspendido* en el sistema. Ya solicitamos la reactivación automática de tu servicio.\n\n` +
          `Por favor reinicia tu módem desconectándolo de la luz 30 segundos. Si deseas consultar datos para futuros pagos:\n${ficha}`,
          'CONSULTAR_SALDO',
          'SUSPENDIDO_SIN_ADEUDO_REACTIVADO',
          targetJid
        );
        await this.marcarConsultaFinalizada(phone, session);
        return;
      }

      await this.enviarYLoguear(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${nombreCliente}*, no tienes pagos pendientes en este momento. ¡Muchas gracias por tu preferencia!\n\n` +
        `Si deseas adelantar tu mensualidad o para futuros pagos, ponemos a tu disposición nuestras opciones:\n${ficha}`,
        'CONSULTAR_SALDO',
        'CUENTA_AL_CORRIENTE',
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    // Si tiene facturas pendientes emitidas en WispHub
    if (facturas.length > 0) {
      const nombreCliente = formatDisplayName(session?.client_name, true) || 'Cliente';
      let totalAdeudo = 0;
      let detalleRecibos = '';

      facturas.forEach((f) => {
        totalAdeudo += f.monto;
        detalleRecibos += `• *Recibo #${f.folio}:* $${f.monto.toFixed(2)} MXN (Vence: ${f.fecha_vencimiento})\n`;
      });

      let textoFacturas = `📋 *Estado de Cuenta - ${this.getIspName()}*\nEstimado(a) *${nombreCliente}*:\n\n` +
        detalleRecibos +
        `\n💰 *Total a pagar: $${totalAdeudo.toFixed(2)} MXN*\n` +
        this.getFichaBancaria(session);

      await this.enviarYLoguear(phone, textoFacturas, 'CONSULTAR_SALDO', 'FACTURAS_PENDIENTES_ENVIADAS', targetJid);
      await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
      return;
    }

    // Saldo adeudado sin facturas listadas
    const nombreCliente = formatDisplayName(session?.client_name, true) || 'Cliente';
    const mensajeMoroso =
      `¡Hola, *${nombreCliente}*! 👋\n\n` +
      `Revisé tu cuenta y detectamos que registras un saldo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*.\n` +
      this.getFichaBancaria(session);

    await this.enviarYLoguear(phone, mensajeMoroso, 'CONSULTAR_SALDO', 'AVISO_SUSPENDIDO_SALDO', targetJid);
    await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
  }

  /**
   * Consulta de paquete contratado, velocidad oficial de descarga y mensualidad en Turso / WispHub
   */
  private static async flujoConsultarPlan(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    if (!session?.client_id && !session?.client_name) {
      await this.enviarYLoguear(
        phone,
        `Para consultar los datos de tu paquete y velocidad contratada, por favor indícame tu *Nombre completo* o número de contrato:`,
        'CONSULTAR_PLAN',
        'SOLICITAR_IDENTIFICACION_PLAN',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    const clienteCtx = await this.obtenerContextoClienteCompleto(phone, session);
    const nombreLimpio = formatDisplayName(session.client_name, true);
    const nombre = nombreLimpio ? ` *${nombreLimpio}*` : '';
    const plan = clienteCtx.planInternet || 'Plan Fibra Óptica';
    const megas = clienteCtx.velocidadMegas ? `*${clienteCtx.velocidadMegas} Mbps* (Megas de descarga)` : 'Velocidad contratada';
    const precio = clienteCtx.precioPlan ? `*$${clienteCtx.precioPlan} MXN*` : 'Tarifa contratada';
    const ip = clienteCtx.ip ? `\n• *IP asignada:* \`${clienteCtx.ip}\`` : '';
    const estado = clienteCtx.estadoServicio ? `\n• *Estado:* ${clienteCtx.estadoServicio} ✅` : '';

    const mensajePlan =
      `📋 *Información de tu Paquete - ${this.getIspName()}*\n\n` +
      `¡Hola${nombre}! Aquí tienes el detalle oficial de tu servicio:\n\n` +
      `• *Plan contratado:* *${plan}*\n` +
      `• *Velocidad:* ${megas}\n` +
      `• *Mensualidad:* ${precio}${ip}${estado}\n\n` +
      `🚀 *¿Deseas medir tu velocidad actual?*\n` +
      `Puedes realizar tu test aquí: 👉 https://www.speedtest.net\n` +
      `_(Para un resultado más exacto, te sugerimos hacer la prueba cerca de tu módem o conectado por cable)._\n\n` +
      `💡 Si requieres realizar un cambio de paquete, aumento de velocidad o tienes dudas, con gusto te apoyamos. ¿En qué más podemos ayudarte hoy?`;

    await this.enviarYLoguear(phone, mensajePlan, 'CONSULTAR_PLAN', 'DETALLE_PLAN_ENVIADO', targetJid);
    await TursoService.updateStep(phone, 'CONVERSACIONAL');
  }

  /**
   * Transferencia a atención con asesor humano
   */
  private static async flujoHablarAsesor(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    const outOfHours = this.isFueraDeHorario();
    const contactoAsesor = config.isp.soporteHumanoPhone ? ` o puedes comunicarte al: *${config.isp.soporteHumanoPhone}*` : '';

    if (outOfHours) {
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: 'Solicitud de atención con asesor humano (Fuera de horario)',
        checks_performed: 'Cliente solicitó hablar con asesor fuera de horario laboral',
        status: 'ABIERTO',
        is_out_of_hours: 1,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Atención Asesor - ${ticket.folio}`,
          `Solicitud de contacto fuera de horario. Folio local: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      await this.enviarYLoguear(
        phone,
        `👨‍💼 *Atención con Asesor:*\n\nTu solicitud ha quedado registrada con el reporte *#${ticket.folio}*. Por la hora, un técnico lo revisará mañana a primera hora para darte seguimiento directo.${contactoAsesor}\n\n¡Muchas gracias por tu paciencia!`,
        'HABLAR_HUMANO',
        `SOLICITUD_ASESOR_REGISTRADA_${ticket.folio}`,
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `👨‍💼 *Atención Personalizada:*\n\nUn asesor humano de *${this.getIspName()}* ha sido notificado sobre tu solicitud${contactoAsesor}.\n\nEn breve uno de nuestros agentes tomará este chat para darte seguimiento directo. ¡Gracias por tu paciencia!`,
        'HABLAR_HUMANO',
        'TRANSFERENCIA_ASESOR',
        targetJid
      );
    }

    await this.marcarConsultaFinalizada(phone, session);
  }

  /**
   * Procesa la identificación de un cliente de forma inteligente y flexible:
   * 1. Busca en SmartOLT (Caché en Turso DB) con algoritmo difuso tolerante a errores ortográficos y de digitación.
   * 2. Si no coincide, busca en WispHub por nombre o contrato.
   * 3. Si parece otra intención (ej. "no tengo internet"), la procesa sin trabar al usuario.
   * 4. Si es un nombre personal (ej. "Carlos", "Juan"), lo memoriza en Turso DB.
   */
  private static async procesarIdentificacion(
    phone: string,
    input: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const rawInput = input.trim();
    let metaPre: any = {};
    try { metaPre = JSON.parse(session?.metadata || '{}'); } catch {}

    // =========================================================================
    // 0.0 IDENTIFICACIÓN DIRECTA POR IP EN EL SISTEMA (ej: "172.19.11.245" o "ip 172.19.11.245")
    // =========================================================================
    const matchIp = rawInput.match(/\b(172\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/);
    if (matchIp) {
      const ipBuscada = matchIp[1];
      logger.info(`[Identificación por IP] Entrada contiene IP "${ipBuscada}". Buscando directamente en Turso...`);
      const whPorIp = await TursoService.getWisphubClientByAny({ ip: ipBuscada });
      if (whPorIp) {
        logger.info(`[Identificación por IP] Cliente localizado en WispHub por IP: ID=${whPorIp.id_servicio}, Nombre="${whPorIp.nombre}"`);
        const meta = {
          ...metaPre,
          ip: whPorIp.ip,
          wisphub_id: whPorIp.id_servicio,
          speed_profile: whPorIp.plan_internet,
          zone: whPorIp.router,
          address: whPorIp.direccion,
          sn: whPorIp.sn_onu,
        };

        const sessionActualizada = await TursoService.upsertSession({
          phone,
          client_id: whPorIp.sn_onu || `WH-${whPorIp.id_servicio}`,
          service_id: String(whPorIp.id_servicio),
          client_name: whPorIp.nombre,
          onu_id: whPorIp.sn_onu || `ONU-${whPorIp.id_servicio}`,
          metadata: JSON.stringify(meta),
          step: 'IDENTIFICADO',
        });

        await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
        return;
      }
    }

    // =========================================================================
    // 0. DESAMBIGUACIÓN CONTEXTUAL POR UBICACIÓN / LOCALIDAD / APELLIDOS
    // Si la sesión ya tenía candidatos pendientes de desambiguación (pendingCandidates)
    // =========================================================================
    if (metaPre.pendingCandidates && Array.isArray(metaPre.pendingCandidates) && metaPre.pendingCandidates.length > 1) {
      const candidates: Array<any> = metaPre.pendingCandidates;
      const lowerRaw = rawInput.toLowerCase().trim();
      const normInput = normalizeText(cleanPersonName(rawInput) || rawInput);

      logger.info(`[Desambiguación Contextual] Evaluando respuesta "${rawInput}" contra ${candidates.length} candidatos previos.`);

      // 1. Filtrar por Ubicación / Comunidad / Zona / Dirección (ej: "De Magdalena", "Magdalena", "Arenal", "Actopan", "Tierras Coloradas", etc.)
      const matchingByLocation = candidates.filter((c: any) => {
        const fullLocation = normalizeText(`${c.address || ''} ${c.zone_name || ''} ${c.direccion || ''} ${c.localidad || ''} ${c.ciudad || ''}`);
        if (!fullLocation) return false;
        if (normInput && normInput.length >= 3 && fullLocation.includes(normInput)) return true;
        // Palabras individuales de la entrada (mínimo 3 letras, ignorando conectores)
        const stopLoc = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'soy', 'colonia', 'fracc', 'mza', 'calle', 'vivo', 'aqui', 'alla', 'por']);
        const inputWords = normInput.split(' ').filter(w => w.length >= 3 && !stopLoc.has(w));
        return inputWords.some(w => fullLocation.includes(w));
      });

      if (matchingByLocation.length === 1) {
        const selected = matchingByLocation[0];
        logger.info(`[Desambiguación Contextual] Candidato único seleccionado por ubicación: "${selected.name}" (${selected.address || selected.zone_name})`);

        const meta = {
          ...metaPre,
          speed_profile: selected.speed_profile,
          zone: selected.zone_name,
          address: selected.address,
          sn: selected.sn,
          pendingCandidates: null,
          lastSearchTerm: null,
        };

        const sessionActualizada = await TursoService.upsertSession({
          phone,
          client_id: selected.unique_external_id || String(selected.id_servicio || selected.id || ''),
          service_id: selected.sn || String(selected.id_servicio || selected.id || ''),
          client_name: selected.name,
          onu_id: selected.unique_external_id || selected.sn || `ONU-${selected.id_servicio || selected.id}`,
          metadata: JSON.stringify(meta),
          step: 'IDENTIFICADO',
        });

        await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
        return;
      }

      // 2. Filtrar por Nombre Completo / Apellidos adicionales proporcionados por el cliente
      const scoredCandidates = candidates.map((c: any) => {
        const score = computeNameMatchScore(rawInput, c.name);
        return { ...c, score };
      }).filter((c: any) => c.score >= 70);

      if (scoredCandidates.length === 1 || (scoredCandidates.length > 1 && scoredCandidates[0].score >= 85 && scoredCandidates[0].score > scoredCandidates[1].score + 15)) {
        const selected = scoredCandidates[0];
        logger.info(`[Desambiguación Contextual] Candidato seleccionado por coincidencia de nombre/apellidos: "${selected.name}"`);

        const meta = {
          ...metaPre,
          speed_profile: selected.speed_profile,
          zone: selected.zone_name,
          address: selected.address,
          sn: selected.sn,
          pendingCandidates: null,
          lastSearchTerm: null,
        };

        const sessionActualizada = await TursoService.upsertSession({
          phone,
          client_id: selected.unique_external_id || String(selected.id_servicio || selected.id || ''),
          service_id: selected.sn || String(selected.id_servicio || selected.id || ''),
          client_name: selected.name,
          onu_id: selected.unique_external_id || selected.sn || `ONU-${selected.id_servicio || selected.id}`,
          metadata: JSON.stringify(meta),
          step: 'IDENTIFICADO',
        });

        await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
        return;
      }
    }

    // Clasificar con Groq para detectar si el texto incluye nombre mencionado, queja/problema o ambos
    const clasificacion = await GroqService.clasificarMensaje(rawInput, {
      clientName: session?.client_name || null,
      currentStep: 'ESPERANDO_IDENTIFICACION',
    });

    // Extraer el nombre si fue mencionado en el mensaje
    let candidateName = clasificacion.nombre_mencionado || '';
    if (!candidateName) {
      const cleaned = cleanPersonName(rawInput)
        .replace(/^(me llamo|soy|mi nombre es|mi nombre|nombre:?)\s+/i, '')
        .trim();
      if (cleaned.length >= 2 && (clasificacion.intencion === 'IDENTIFICAR_CLIENTE' || clasificacion.intencion === 'DESCONOCIDO')) {
        candidateName = cleaned;
      }
    }

    // Si viene acompañada de una queja o intención técnica/financiera, guardarla en metadata para auto-continuar tras identificarse
    const lowerRaw = rawInput.toLowerCase();
    const esReporteFalla = lowerRaw.includes('no tengo internet') || lowerRaw.includes('sin internet') || lowerRaw.includes('no hay internet') || lowerRaw.includes('falla') || lowerRaw.includes('lento') || lowerRaw.includes('lentitud') || lowerRaw.includes('no sirve') || lowerRaw.includes('no funciona') || lowerRaw.includes('faltando') || lowerRaw.includes('netflix') || lowerRaw.includes('youtube') || lowerRaw.includes('circulo') || lowerRaw.includes('círculo');
    const esConsultaSaldo = lowerRaw.includes('saldo') || lowerRaw.includes('debo') || lowerRaw.includes('pagar') || lowerRaw.includes('factura') || lowerRaw.includes('recibo') || lowerRaw.includes('pago');

    if (clasificacion.intencion && !['SALUDO', 'IDENTIFICAR_CLIENTE', 'DESCONOCIDO'].includes(clasificacion.intencion)) {
      metaPre.initialQuery = rawInput;
      metaPre.initialIntent = clasificacion.intencion;
      metaPre.initialClasif = clasificacion;
      metaPre.resumen_queja = clasificacion.resumen_queja;
    } else if (esReporteFalla) {
      metaPre.initialQuery = rawInput;
      metaPre.initialIntent = 'FALLA_INTERNET';
      metaPre.initialClasif = clasificacion;
      metaPre.resumen_queja = clasificacion.resumen_queja || 'Falla o corte de internet reportado por el cliente';
    } else if (esConsultaSaldo) {
      metaPre.initialQuery = rawInput;
      metaPre.initialIntent = 'CONSULTAR_SALDO';
      metaPre.initialClasif = clasificacion;
    }

    const searchTerm = candidateName || cleanPersonName(rawInput) || rawInput;
    const cleanSearchTerm = cleanPersonName(searchTerm) || searchTerm;
    logger.info(`Buscando coincidencias para identificación de ${phone}: "${rawInput}" (Término búsqueda: "${searchTerm}", Limpio: "${cleanSearchTerm}")`);

    // 1. Intentar búsqueda flexible en Turso DB (Caché local de SmartOLT y WispHub)
    try {
      const [coincidenciasOlt, coincidenciasWh] = await Promise.all([
        TursoService.searchOnusFuzzy(cleanSearchTerm, 6).catch(() => []),
        TursoService.searchWisphubClientsFuzzy(cleanSearchTerm, 6).catch(() => []),
      ]);

      // Unificar candidatos deduplicando
      const listaUnificada: Array<{
        unique_external_id: string;
        id_servicio?: number | string;
        sn: string;
        name: string;
        address?: string;
        zone_name?: string;
        speed_profile?: string;
        phone?: string;
        matchScore: number;
        is_wisphub?: boolean;
      }> = [];

      for (const o of coincidenciasOlt) {
        listaUnificada.push({
          unique_external_id: o.unique_external_id,
          sn: o.sn || '',
          name: o.name,
          address: o.address || '',
          zone_name: o.zone_name || '',
          speed_profile: o.speed_profile || '',
          phone: o.phone || '',
          matchScore: o.matchScore,
          is_wisphub: false,
        });
      }

      for (const w of coincidenciasWh) {
        const oltMatch = listaUnificada.find(
          item => (item.sn && w.sn_onu && item.sn.toUpperCase() === w.sn_onu.toUpperCase()) ||
                  computeNameMatchScore(item.name, w.nombre) >= 80
        );
        if (oltMatch) {
          oltMatch.id_servicio = w.id_servicio;
          (oltMatch as any).ip = w.ip;
          (oltMatch as any).wisphub_id = w.id_servicio;
          (oltMatch as any).wisphub_name = w.nombre;
        } else {
          listaUnificada.push({
            unique_external_id: w.sn_onu || `WH-${w.id_servicio}`,
            id_servicio: w.id_servicio,
            sn: w.sn_onu || String(w.id_servicio),
            name: w.nombre,
            address: w.direccion || '',
            zone_name: w.router || '',
            speed_profile: w.plan_internet || '',
            phone: w.telefono || '',
            matchScore: w.matchScore,
            is_wisphub: true,
            ip: w.ip,
          } as any);
        }
      }

      // Ordenar por puntaje
      listaUnificada.sort((a, b) => b.matchScore - a.matchScore);

      if (listaUnificada.length > 0) {
        const mejorScore = listaUnificada[0].matchScore;
        const candidatosRelevantes = listaUnificada.filter(
          c => c.matchScore >= 65 && c.matchScore >= (mejorScore - 15)
        );

        // A. Verificar si hay una COINCIDENCIA EXACTA DIRECTA de Nombre Completo
        const exactNormQuery = normalizeText(cleanSearchTerm);
        const exactMatches = candidatosRelevantes.filter(c => {
          const normCand = normalizeText(cleanPersonName(c.name));
          return normCand === exactNormQuery;
        });

        if (exactMatches.length === 1) {
          const exacto = exactMatches[0];
          logger.info(`Coincidencia exacta directa de nombre completo encontrada: "${exacto.name}" (Score: ${exacto.matchScore})`);

          const meta = {
            ...metaPre,
            speed_profile: exacto.speed_profile,
            zone: exacto.zone_name,
            address: exacto.address,
            sn: exacto.sn,
            wisphub_id: exacto.id_servicio,
            ip: (exacto as any).ip || (exacto as any).wisphub_ip || metaPre.ip,
          };

          const sessionActualizada = await TursoService.upsertSession({
            phone,
            client_id: exacto.unique_external_id || String(exacto.id_servicio || ''),
            service_id: exacto.id_servicio ? String(exacto.id_servicio) : (exacto.sn || String(exacto.unique_external_id || '')),
            client_name: exacto.name,
            onu_id: exacto.unique_external_id,
            metadata: JSON.stringify(meta),
            step: 'IDENTIFICADO',
          });

          await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
          return;
        }

        // B. Agrupar candidatos por persona real (validando nombres completos con apellidos)
        const gruposPorPersona: Array<{ nombrePrincipal: string; servicios: typeof candidatosRelevantes }> = [];
        for (const cand of candidatosRelevantes) {
          const grupoExistente = gruposPorPersona.find(g => 
            computeNameMatchScore(cleanPersonName(cand.name), cleanPersonName(g.nombrePrincipal)) >= 80
          );
          if (grupoExistente) {
            grupoExistente.servicios.push(cand);
          } else {
            gruposPorPersona.push({ nombrePrincipal: cand.name, servicios: [cand] });
          }
        }

        // CASO 1: Múltiples personas DISTINTAS (homónimos)
        if (gruposPorPersona.length > 1) {
          const ejemplosNombres = gruposPorPersona
            .slice(0, 3)
            .map(g => cleanPersonName(g.nombrePrincipal))
            .join('_, _');

          logger.info(`Ambigüedad: se detectaron ${gruposPorPersona.length} personas distintas para "${rawInput}". Guardando candidatos y solicitando desempate.`);

          await TursoService.upsertSession({
            phone,
            step: 'ESPERANDO_IDENTIFICACION',
            metadata: JSON.stringify({
              ...metaPre,
              lastSearchTerm: cleanSearchTerm,
              pendingCandidates: candidatosRelevantes.map(c => ({
                unique_external_id: c.unique_external_id,
                id_servicio: c.id_servicio,
                sn: c.sn,
                name: c.name,
                address: c.address,
                zone_name: c.zone_name,
                speed_profile: c.speed_profile,
                phone: c.phone,
              })),
            }),
          });

          await this.enviarYLoguear(
            phone,
            `Encontramos varias cuentas registradas con ese nombre en nuestro sistema.\n\n` +
            `Para poder ubicar tu módem con exactitud, por favor indícame tu *Nombre con al menos un apellido* (ejemplo: _${ejemplosNombres}_) o tu *Localidad / Zona*.`,
            'IDENTIFICAR_CLIENTE',
            'SOLICITAR_APELLIDOS_AMBIGUEDAD',
            targetJid
          );
          return;
        }

        // CASO 2: Una sola persona con 2 o más servicios en distintas ubicaciones
        const personaUnica = gruposPorPersona[0];
        const serviciosPersona = personaUnica?.servicios || candidatosRelevantes;

        if (serviciosPersona.length > 1) {
          const primerNombre = serviciosPersona[0].name;
          logger.info(`Se detectaron ${serviciosPersona.length} servicios reales para "${primerNombre}". Solicitando selección.`);

          let mensajeOpciones = `¡Hola, *${primerNombre}*! 👋 Detectamos que tienes *${serviciosPersona.length} servicios* registrados en nuestro sistema:\n\n`;

          serviciosPersona.slice(0, 5).forEach((c, idx) => {
            const ubicacion = c.address || c.zone_name ? `\n📍 *Ubicación / Zona:* ${c.address || c.zone_name}` : '';
            const plan = c.speed_profile ? `\n📦 *Plan:* ${c.speed_profile}` : '';
            const sn = c.sn ? `\n🆔 *SN:* ${c.sn}` : '';
            mensajeOpciones += `*${idx + 1}️⃣ Opción ${idx + 1}:*${ubicacion}${plan}${sn}\n\n`;
          });

          mensajeOpciones += `¿Con cuál de tus servicios necesitas apoyo el día de hoy?\n👉 *Por favor responde con el número de la opción (ejemplo: 1 ó 2).*`;

          await TursoService.upsertSession({
            phone,
            client_name: primerNombre,
            step: 'ESPERANDO_SELECCION_SERVICIO',
            metadata: JSON.stringify({
              ...metaPre,
              registeredServices: serviciosPersona.slice(0, 5).map(c => ({
                unique_external_id: c.unique_external_id,
                sn: c.sn,
                name: c.name,
                speed_profile: c.speed_profile,
                zone_name: c.zone_name,
                address: c.address,
              })),
              pendingServices: serviciosPersona.slice(0, 5).map(c => ({
                unique_external_id: c.unique_external_id,
                sn: c.sn,
                name: c.name,
                speed_profile: c.speed_profile,
                zone_name: c.zone_name,
                address: c.address,
              })),
              initialQuery: rawInput,
              serviceHistory: [],
              consultaFinalizada: false,
            }),
          });

          await this.enviarYLoguear(phone, mensajeOpciones, 'IDENTIFICAR_CLIENTE', 'SOLICITUD_SELECCION_MULTISERVICIO', targetJid);
          return;
        }

        // CASO 3: Coincidencia única sólida de una sola persona
        const mejor = serviciosPersona[0] || listaUnificada[0];
        if (mejor.matchScore >= 65) {
          const meta = {
            ...metaPre,
            speed_profile: mejor.speed_profile,
            zone: mejor.zone_name,
            address: mejor.address,
            sn: mejor.sn,
            wisphub_id: mejor.id_servicio,
            ip: (mejor as any).ip || (mejor as any).wisphub_ip || metaPre.ip,
          };

          const sessionActualizada = await TursoService.upsertSession({
            phone,
            client_id: mejor.unique_external_id || String(mejor.id_servicio || ''),
            service_id: mejor.id_servicio ? String(mejor.id_servicio) : (mejor.sn || String(mejor.unique_external_id || '')),
            client_name: mejor.name,
            onu_id: mejor.unique_external_id,
            metadata: JSON.stringify(meta),
            step: 'IDENTIFICADO',
          });

          await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
          return;
        }
      }
    } catch (err: any) {
      logger.warn(`Error durante búsqueda fuzzy de identificación:`, err?.message || err);
    }

    // 2. Intentar buscar en WispHub API en vivo como alternativa de facturación
    try {
      const coincidencias = await WispHubService.buscarClientePorNombre(searchTerm);

      if (coincidencias.length === 1) {
        const c = coincidencias[0];
        const sessionActualizada = await TursoService.upsertSession({
          phone,
          client_id: String(c.id),
          service_id: String(c.servicio_id || c.id),
          client_name: c.nombre,
          onu_id: c.onu_id || `ONU-${c.id}`,
          metadata: JSON.stringify({ ...metaPre, speed_profile: c.precio_plan, address: c.direccion, sn: c.onu_id }),
          step: 'IDENTIFICADO',
        });

        await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
        return;
      }

      if (coincidencias.length > 1) {
        let opciones = `Encontré varios contratos registrados a ese nombre en facturación:\n\n`;
        coincidencias.slice(0, 4).forEach((c, idx) => {
          opciones += `*${idx + 1}️⃣ Opción ${idx + 1}:* ${c.nombre} (ID: ${c.id}, ${c.direccion || 'Sin dirección'})\n\n`;
        });
        opciones += `¿Cuál de ellos deseas consultar?\n👉 *Responde con el número de la opción (ejemplo: 1 ó 2).*`;

        await TursoService.upsertSession({
          phone,
          client_name: coincidencias[0].nombre,
          step: 'ESPERANDO_SELECCION_SERVICIO',
          metadata: JSON.stringify({
            ...metaPre,
            registeredServices: coincidencias.slice(0, 4).map(c => ({
              unique_external_id: c.onu_id || `ONU-${c.id}`,
              sn: String(c.servicio_id || c.id),
              name: c.nombre,
              speed_profile: '',
              zone_name: '',
              address: c.direccion || '',
            })),
            pendingServices: coincidencias.slice(0, 4).map(c => ({
              unique_external_id: c.onu_id || `ONU-${c.id}`,
              sn: String(c.servicio_id || c.id),
              name: c.nombre,
              speed_profile: '',
              zone_name: '',
              address: c.direccion || '',
            })),
            initialQuery: rawInput,
            serviceHistory: [],
            consultaFinalizada: false,
          }),
        });

        await this.enviarYLoguear(phone, opciones, 'IDENTIFICAR_CLIENTE', 'MULTIPLES_COINCIDENCIAS_WISPHUB', targetJid);
        return;
      }
    } catch (err: any) {
      logger.warn(`Error al consultar WispHub durante identificación:`, err?.message || err);
    }

    // 3. Si no hubo coincidencia y el usuario envió SOLO un problema/intención sin nombre
    if (!candidateName && clasificacion.intencion !== 'IDENTIFICAR_CLIENTE' && clasificacion.intencion !== 'DESCONOCIDO' && clasificacion.intencion !== 'SALUDO') {
      logger.info(`El usuario envió la intención "${clasificacion.intencion}" sin nombre identificable. Solicitando nombre y guardando intención.`);
      const queja = clasificacion.resumen_queja ? ` sobre: _"${clasificacion.resumen_queja}"_` : '';
      await this.enviarYLoguear(
        phone,
        `Entendido tu reporte${queja}. Veo que presentas inconvenientes con tu conexión.\n\nPara poder verificar tu línea y ayudarte de inmediato, ¿podrías indicarme tu *Nombre completo* o número de contrato?`,
        'FALLA_INTERNET',
        'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
        targetJid
      );
      await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_IDENTIFICACION',
        metadata: JSON.stringify(metaPre),
      });
      return;
    }

    // 4. Extraer y limpiar el nombre (si se detectó formato de nombre pero no estaba en BD)
    let nombreLimpio = candidateName || cleanPersonName(rawInput) || rawInput;
    nombreLimpio = cleanPersonName(nombreLimpio)
      .replace(/^(me llamo|soy|mi nombre es|mi nombre|nombre:?)\s+/i, '')
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (nombreLimpio.length >= 2) {
      nombreLimpio = nombreLimpio
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Si tiene un formato de nombre creíble (2 a 45 caracteres)
    if (nombreLimpio.length >= 2 && nombreLimpio.length <= 45) {
      const sessionActualizada = await TursoService.upsertSession({
        phone,
        client_name: nombreLimpio,
        metadata: JSON.stringify(metaPre),
        step: 'IDENTIFICADO',
      });

      await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
      return;
    }

    // 5. Si lo escrito es incomprensible, avanzamos al problema amablemente
    await this.enviarYLoguear(
      phone,
      `No te preocupes. ¿Cuál es el problema o consulta que tienes con tu servicio? Estoy aquí para ayudarte.`,
      'DESCONOCIDO',
      'CONTINUAR_SIN_NOMBRE',
      targetJid
    );
    await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
  }

  /**
   * Maneja la selección del cliente cuando tiene 2 o más servicios registrados
   */
  private static async procesarSeleccionServicio(
    phone: string,
    input: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const rawInput = input.trim();
    let pendingServices: any[] = [];
    let meta: any = {};
    try {
      meta = JSON.parse(session?.metadata || '{}');
      if (Array.isArray(meta.pendingServices)) {
        pendingServices = meta.pendingServices;
      }
    } catch {}

    if (pendingServices.length === 0) {
      // Si no hay lista guardada, pedimos que se identifique de nuevo
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      await this.procesarIdentificacion(phone, input, session, targetJid);
      return;
    }

    // 0. DETECTAR SI EL CLIENTE ESTÁ CORRIGIENDO SU NOMBRE O ACLARANDO SU IDENTIDAD
    const lower = rawInput.toLowerCase();
    const esCorreccion = /^(soy|no soy|no es|me llamo|mi nombre|yo soy|disculpa|en realidad|te equivocaste|ninguno)/i.test(lower) ||
      lower.includes('no soy') || lower.includes('no es mi') || lower.includes('te equivocaste') || lower.includes('ninguno');
    const tieneNumeros = /\b[1-9]\b/.test(rawInput);

    if ((esCorreccion || !tieneNumeros) && rawInput.length >= 3) {
      // Extraer el nombre correcto (ej. de "soy virginia no magdalena" -> "virginia")
      let nombreCorregido = rawInput
        .replace(/^(no soy|yo no soy|no es|no)\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\s*(,|;)?\s*(soy|me llamo|mi nombre es)?/i, '')
        .replace(/^(soy|me llamo|mi nombre es|yo soy)\s+/i, '')
        .replace(/\b(no\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\b/gi, '')
        .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
        .trim();

      if (!nombreCorregido || nombreCorregido.length < 2) {
        nombreCorregido = rawInput.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
      }

      logger.info(`[SeleccionServicio] Cliente ${phone} corrigió su identidad: "${rawInput}" -> "${nombreCorregido}". Re-procesando identificación.`);
      
      // Limpiar pendingServices de la sesión anterior
      const sesionReset = await TursoService.upsertSession({
        phone,
        step: 'ESPERANDO_IDENTIFICACION',
        metadata: JSON.stringify({ ...meta, pendingServices: [], registeredServices: [] }),
      });

      await this.procesarIdentificacion(phone, nombreCorregido, sesionReset, targetJid);
      return;
    }

    // 1. Extraer el número de opción: "1", "2", "el 1", "opcion 2", "primero", etc.
    let indexSeleccionado = -1;
    const matchNum = rawInput.match(/\b([1-9])\b/);
    if (matchNum) {
      indexSeleccionado = parseInt(matchNum[1], 10) - 1;
    } else {
      if (lower.includes('primer') || lower.includes('uno')) {
        indexSeleccionado = 0;
      } else if (lower.includes('segund') || lower.includes('dos')) {
        indexSeleccionado = 1;
      } else if (lower.includes('tercer') || lower.includes('tres')) {
        indexSeleccionado = 2;
      } else {
        // Buscar coincidencia por dirección o zona si el cliente escribió parte del domicilio
        const matchIdx = pendingServices.findIndex(s => {
          const zona = (s.zone_name || '').toLowerCase();
          const addr = (s.address || '').toLowerCase();
          return (zona && lower.includes(zona)) || (addr && lower.includes(addr));
        });
        if (matchIdx !== -1) {
          indexSeleccionado = matchIdx;
        }
      }
    }

    // Si no es un índice válido
    if (indexSeleccionado < 0 || indexSeleccionado >= pendingServices.length) {
      await this.enviarYLoguear(
        phone,
        `Por favor responde con el número de tu opción (1 al ${pendingServices.length}) o escribe tu *Nombre completo* para buscar tu servicio.`,
        'SELECCION_SERVICIO',
        'OPCION_INVALIDA',
        targetJid
      );
      return;
    }

    const elegido = pendingServices[indexSeleccionado];

    // Historial acumulativo de servicios utilizados por el cliente
    const prevHistory = Array.isArray(meta.serviceHistory) ? meta.serviceHistory : [];
    const updatedHistory = [
      ...prevHistory,
      {
        unique_external_id: elegido.unique_external_id,
        sn: elegido.sn,
        name: elegido.name,
        address: elegido.address,
        zone_name: elegido.zone_name,
        speed_profile: elegido.speed_profile,
        selected_at: new Date().toISOString(),
      },
    ];
    if (updatedHistory.length > 10) updatedHistory.shift();

    const registered = Array.isArray(meta.registeredServices) && meta.registeredServices.length > 0
      ? meta.registeredServices
      : pendingServices;

    const nuevoMeta = {
      ...meta,
      registeredServices: registered,
      activeService: {
        unique_external_id: elegido.unique_external_id,
        sn: elegido.sn,
        name: elegido.name,
        speed_profile: elegido.speed_profile,
        zone_name: elegido.zone_name,
        address: elegido.address,
        selected_at: new Date().toISOString(),
      },
      serviceHistory: updatedHistory,
      pendingServices: [],
      consultaFinalizada: false,
      lastSelectionAt: new Date().toISOString(),
      speed_profile: elegido.speed_profile,
      zone: elegido.zone_name,
      address: elegido.address,
      sn: elegido.sn,
    };

    const sessionActualizada = await TursoService.upsertSession({
      phone,
      client_id: elegido.unique_external_id,
      service_id: elegido.sn,
      client_name: elegido.name,
      onu_id: elegido.unique_external_id,
      metadata: JSON.stringify(nuevoMeta),
      step: 'IDENTIFICADO',
    });

    await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, meta, targetJid);
  }

  /**
   * Finaliza la identificación del cliente, le da la bienvenida y CONTINÚA automáticamente
   * con el reporte/consulta que había enviado inicialmente, evitando que tenga que repetirlo.
   */
  private static async finalizarIdentificacionYContinuarFlujo(
    phone: string,
    session: Session,
    sessionAnteriorMeta?: any,
    targetJid?: string
  ): Promise<void> {
    let meta: any = {};
    try { meta = JSON.parse(session.metadata || '{}'); } catch {}
    if (sessionAnteriorMeta && typeof sessionAnteriorMeta === 'object') {
      meta = { ...sessionAnteriorMeta, ...meta };
    }

    const nombreLimpio = formatDisplayName(session.client_name, true) || 'Cliente';
    const planTexto = meta.speed_profile ? `\n📦 *Plan:* ${meta.speed_profile}` : '';
    const zonaTexto = meta.address || meta.zone ? `\n📍 *Ubicación:* ${meta.address || meta.zone}` : '';

    const initialQuery = meta.initialQuery;
    let initialIntent = meta.initialIntent;
    const initialClasif = meta.initialClasif;
    const quejaTexto = meta.resumen_queja || (typeof initialQuery === 'string' ? initialQuery : '');

    // Detección proactiva si venía una queja en la consulta inicial para no preguntar doble
    if (!initialIntent && typeof initialQuery === 'string') {
      const qLower = initialQuery.toLowerCase();
      if (qLower.includes('no tengo internet') || qLower.includes('sin internet') || qLower.includes('falla') || qLower.includes('lento') || qLower.includes('faltando') || qLower.includes('netflix') || qLower.includes('youtube') || qLower.includes('circulo') || qLower.includes('círculo')) {
        initialIntent = 'FALLA_INTERNET';
      }
    }

    // Si el usuario reportó un problema o intención antes de identificarse (ej. "esta lento mi internet", "cuanto debo", etc.)
    if (initialIntent && !['SALUDO', 'IDENTIFICAR_CLIENTE', 'DESCONOCIDO'].includes(initialIntent)) {
      logger.info(`[Auto-Continuación] Cliente ${phone} (${session.client_name}) identificado. Continuando de inmediato con el reporte: "${initialIntent}" ("${initialQuery}")`);

      const clasifAEjecutar = initialClasif || {
        intencion: initialIntent,
        resumen_queja: quejaTexto,
        foco_rojo: false,
        equipo_apagado: false,
        reporta_lentitud: true,
        sin_internet_total: false,
        red_wifi_no_visible: false,
        bloqueo_paginas_apps: false,
        problema_streaming_tv: false,
        consulta_canales_cable: false,
        alcance_dispositivos: 'INDETERMINADO',
        ya_reinicio: false,
        nombre_mencionado: session.client_name,
        telefono_mencionado: null,
      };

      await this.ejecutarIntencion(phone, clasifAEjecutar, session, initialQuery || 'Reporte inicial', targetJid);
      return;
    }

    // Si el usuario no tenía reporte previo (solo saludó o se identificó)
    await this.enviarYLoguear(
      phone,
      `¡Hola, *${nombreLimpio}*! 👋 Bienvenido al centro de atención y soporte de *${this.getIspName()}*.\n\n¿En qué podemos apoyarte el día de hoy con tu servicio?`,
      'IDENTIFICAR_CLIENTE',
      'VINCULADO_ESPERANDO_PROBLEMA',
      targetJid
    );
    await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
  }

  /**
   * Marca la consulta actual como concluida para que en la próxima sesión (o tras inactividad)
   * el bot vuelva a solicitar qué servicio desea consultar si el cliente tiene múltiples servicios.
   */
  private static async marcarConsultaFinalizada(phone: string, session: Session | null): Promise<void> {
    try {
      let metaObj: any = {};
      try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
      metaObj.consultaFinalizada = true;
      metaObj.consultaFinalizadaAt = new Date().toISOString();
      await TursoService.upsertSession({
        phone,
        step: 'CONSULTA_FINALIZADA',
        metadata: JSON.stringify(metaObj),
      });
      logger.info(`Consulta marcada como finalizada para ${phone}`);
    } catch (err: any) {
      logger.warn(`Error al marcar consulta finalizada para ${phone}:`, err?.message || err);
    }
  }

  /**
   * Catálogo oficial de Zonas registradas en SmartOLT (con alias para reconocimiento flexible)
   */
  private static readonly SMARTOLT_ZONES: { name: string; aliases: string[] }[] = [
    { name: 'San Agustin Tlaxiaca', aliases: ['san agustin tlaxiaca', 'san agustin', 'san agustín', 'tlaxiaca'] },
    { name: 'San Diego canguihu\'ndo', aliases: ['san diego canguihu\'ndo', 'san diego canguihundo', 'canguihundo', 'canguihu\'ndo'] },
    { name: 'San Jose Tepenene', aliases: ['san jose tepenene', 'san jose', 'tepenene'] },
    { name: 'Col. Tierra y Libertad', aliases: ['col. tierra y libertad', 'colonia tierra y libertad', 'tierra y libertad'] },
    { name: 'Col. Eulalio Angeles', aliases: ['col. eulalio angeles', 'colonia eulalio angeles', 'eulalio angeles'] },
    { name: 'Col. La Estacion', aliases: ['col. la estacion', 'colonia la estacion', 'la estacion', 'la estación'] },
    { name: 'Col. Aviacion', aliases: ['col. aviacion', 'colonia aviacion', 'aviacion', 'aviación'] },
    { name: 'Fracc. Nuevo Actopan', aliases: ['fracc. nuevo actopan', 'fraccionamiento nuevo actopan', 'nuevo actopan'] },
    { name: '20 de Noviembre', aliases: ['20 de noviembre', 'veinte de noviembre', '20 nov'] },
    { name: 'Dos cerritos', aliases: ['dos cerritos', '2 cerritos', 'cerritos'] },
    { name: 'El Cerrito', aliases: ['el cerrito', 'cerrito'] },
    { name: 'El Arenal', aliases: ['el arenal', 'arenal'] },
    { name: 'El Meje', aliases: ['el meje', 'meje'] },
    { name: 'El Nogal', aliases: ['el nogal', 'nogal'] },
    { name: 'El Porvenir', aliases: ['el porvenir', 'porvenir'] },
    { name: 'Canada Chica', aliases: ['canada chica', 'cañada chica'] },
    { name: 'La Estancia', aliases: ['la estancia', 'estancia'] },
    { name: 'La Guadalupe', aliases: ['la guadalupe', 'guadalupe'] },
    { name: 'La Loma', aliases: ['la loma', 'loma'] },
    { name: 'La Pena', aliases: ['la pena', 'la peña', 'pena', 'peña'] },
    { name: 'La 27', aliases: ['la 27', 'la veintisiete'] },
    { name: 'Los Olivos', aliases: ['los olivos', 'olivos'] },
    { name: 'Pozo Grande', aliases: ['pozo grande', 'pozo'] },
    { name: 'Parque Urbano', aliases: ['parque urbano', 'parque'] },
    { name: 'Unidad deportiva', aliases: ['unidad deportiva', 'deportiva'] },
    { name: 'Jesus Luz Meneses', aliases: ['jesus luz meneses', 'luz meneses'] },
    { name: 'Guzman Mayer', aliases: ['guzman mayer', 'mayer'] },
    { name: 'Fundicion baja', aliases: ['fundicion baja', 'fundición baja'] },
    { name: 'Fray Francisco', aliases: ['fray francisco', 'fray'] },
    { name: 'Sta. Monica', aliases: ['sta. monica', 'santa monica', 'santa mónica', 'sta monica'] },
    { name: 'Troncal 1-Rinkon', aliases: ['troncal 1-rinkon', 'troncal rinkon', 'troncal rincon'] },
    { name: 'Rincon', aliases: ['rincon', 'rincón', 'rinkon'] },
    { name: 'zaragoza- santiago', aliases: ['zaragoza- santiago', 'zaragoza santiago', 'zaragoza', 'santiago'] },
    { name: 'Bothibaji', aliases: ['bothibaji', 'bothi'] },
    { name: 'Boxaxni', aliases: ['boxaxni'] },
    { name: 'Boxtha', aliases: ['boxtha'] },
    { name: 'Chicavasco', aliases: ['chicavasco'] },
    { name: 'Cossiohayan', aliases: ['cossiohayan', 'cossio'] },
    { name: 'Dajiedhi', aliases: ['dajiedhi'] },
    { name: 'Daxtha', aliases: ['daxtha'] },
    { name: 'Huaxtho', aliases: ['huaxtho', 'huaxto'] },
    { name: 'Jiadi', aliases: ['jiadi'] },
    { name: 'Palomo', aliases: ['palomo'] },
    { name: 'Xideje', aliases: ['xideje'] },
    { name: 'Actopan', aliases: ['actopan', 'centro actopan', 'actopan centro'] },
  ];

  /**
   * Resuelve una zona oficial de SmartOLT a partir de localidad, colonia, municipio y dirección.
   * Si la localidad o comunidad no se encuentra en el catálogo oficial de SmartOLT,
   * asigna automáticamente por defecto el Municipio correspondiente (ej: "Actopan", "El Arenal", "San Agustin Tlaxiaca", "San Jose Tepenene")
   * evitando que se generen zonas no registradas en la OLT.
   */
  public static resolverZonaOMunicipio(
    localidad?: string | null,
    colonia?: string | null,
    municipio?: string | null,
    direccion?: string | null
  ): string {
    const combined = `${localidad || ''} ${colonia || ''} ${municipio || ''} ${direccion || ''}`.toLowerCase();
    const cleanCombined = normalizeText(combined);

    // 1. Verificar primero si coincide exactamente con alguna zona específica del catálogo de SmartOLT
    for (const item of this.SMARTOLT_ZONES) {
      // Omitir los municipios genéricos en la primera pasada para dar prioridad a comunidades específicas (ej: Chicavasco, Bothibaji)
      if (['Actopan', 'El Arenal', 'San Agustin Tlaxiaca', 'San Jose Tepenene'].includes(item.name)) {
        continue;
      }
      for (const alias of item.aliases) {
        const cleanAlias = normalizeText(alias);
        const regex = new RegExp(`\\b${cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleanCombined)) {
          return item.name;
        }
      }
    }

    // 2. Si no coincide con una comunidad registrada, asignar el Municipio correspondiente por defecto:
    if (
      cleanCombined.includes('arenal') ||
      cleanCombined.includes('el arenal') ||
      cleanCombined.includes('ojo de agua') ||
      cleanCombined.includes('san jeronimo') ||
      cleanCombined.includes('bocja') ||
      cleanCombined.includes('meje')
    ) {
      return 'El Arenal';
    }

    if (
      cleanCombined.includes('san agustin') ||
      cleanCombined.includes('tlaxiaca') ||
      cleanCombined.includes('san agustin tlaxiaca')
    ) {
      return 'San Agustin Tlaxiaca';
    }

    if (
      cleanCombined.includes('san jose') ||
      cleanCombined.includes('tepenene')
    ) {
      return 'San Jose Tepenene';
    }

    if (
      cleanCombined.includes('santiago') ||
      cleanCombined.includes('zaragoza')
    ) {
      return 'zaragoza- santiago';
    }

    if (cleanCombined.includes('actopan')) {
      return 'Actopan';
    }

    // 3. Por defecto absoluto para localidades no reconocidas: Municipio de Actopan
    return 'Actopan';
  }

  /**
   * Parsea los datos del comando de un solo mensaje para activación de clientes:
   * Formato: "activar cliente [6 dígitos SN] [Folio-Nombre] [Plan] [Zona]"
   */
  private static parseActivationMessage(rawText: string): {
    snSuffix: string;
    name: string;
    plan: string;
    zone: string;
    hasAllData: boolean;
  } {
    let text = rawText
      .replace(/^(?:activar|activaci[oó]n|alta|aprovisionar|registrar)\s*(?:de\s+)?(?:cliente|modem|onu|equipo|serie)?\s*[:=\s]*/i, '')
      .trim();

    let snSuffix = '';
    let plan = '40M';
    let zone = 'Actopan'; // Obligatorio por defecto

    // 1. Extraer PIN si viene explícito
    const pinMatch = text.match(/\b(?:pin|clave|pass)\s*[:=\s]*(\d{4,8})\b/i);
    if (pinMatch) {
      text = text.replace(pinMatch[0], ' ').trim();
    }

    // 2. Extraer Plan (ej: 40 megas, 600M, 100MB, etc.)
    const planMatch = text.match(/(?:^|\s)(?:(?:plan|paquete|velocidad)\s*[:=]?\s*)?(\d{1,4}\s*(?:M|MEGAS|MB|MEGA|GIGAS|GB))\b/i);
    if (planMatch && planMatch[1]) {
      const megasNumMatch = planMatch[1].match(/\d+/);
      const megasNum = megasNumMatch ? megasNumMatch[0] : '40';
      plan = `${megasNum}M`;
      text = text.replace(planMatch[0], ' ').trim();
    }

    // 3. Extraer Zona mediante catálogo oficial de SmartOLT (soporta 'el rincón', 'zona rincon', etc.)
    for (const item of this.SMARTOLT_ZONES) {
      let matched = false;
      for (const alias of item.aliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('(?:^|\\s)(?:zona\\s*[:=]?\\s*)?(?:el\\s+|la\\s+|los\\s+|las\\s+)?(' + escaped + ')(?:\\s|$)', 'i');
        const match = text.match(regex);
        if (match) {
          zone = item.name;
          text = text.replace(match[0], ' ').trim();
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // Palabras reservadas del sistema y diccionario que jamás deben ser tomadas como SN
    const RESERVED_SN_WORDS = new Set([
      'TR069', 'TR-069', 'SMART', 'SMARTOLT', 'MODEM', 'ROUTER', 'EQUIPO', 'CLIENTE',
      'ACTOPAN', 'AGUSTIN', 'INTERNET', 'SPEED', 'MEGAS', 'MEGA', 'GIGAS', 'GB', 'MB',
      'DUAL', 'STACK', 'STATIC', 'ESTATICA', 'DHCP', 'PPPOE', 'OMCI', 'AUTO',
      'NONE', 'PLAN', 'PAQUETE', 'SERVICIO', 'ZONA', 'FOLIO', 'NOMBRE', 'AYUDA',
      'PRUEBA', 'NUEVO', 'ALTA', 'TRATA', 'DESPUES', 'LUEGO', 'FAVOR', 'GRACIAS',
      'BUENOS', 'DIAS', 'TARDES', 'NOCHES', 'ESTE', 'ESTA', 'PUEDE', 'PONER', 'CAMBIAR',
      'PARA', 'COMO', 'HAGO', 'TIENE', 'QUIERO', 'LINEA', 'CUENTA'
    ]);

    // 4. Extraer SN explícito o token alfanumérico (evitando palabras reservadas)
    const explicitSn = text.match(/\b(?:sn|serie|onu|modem|mac)\s*[:=\s]*([A-Za-z0-9]{4,16})\b/i);
    if (explicitSn && !RESERVED_SN_WORDS.has(explicitSn[1].toUpperCase())) {
      snSuffix = explicitSn[1].toUpperCase();
      text = text.replace(explicitSn[0], ' ').trim();
    } else {
      const allTokens = text.match(/\b([A-Za-z0-9]{4,16})\b/g) || [];
      for (const token of allTokens) {
        const upper = token.toUpperCase();
        if (RESERVED_SN_WORDS.has(upper)) continue;
        // Priorizar tokens típicos de SN (ZTE..., HWTC..., 5-6 caracteres alfanuméricos hex)
        if (upper.length === 5 || upper.length === 6 || upper.startsWith('ZTE') || upper.startsWith('HWTC') || (/[0-9]/.test(upper) && /[A-Z]/i.test(upper))) {
          snSuffix = upper;
          text = text.replace(new RegExp(`\\b${token}\\b`, 'i'), ' ').trim();
          break;
        }
      }
    }

    // 5. Limpiar etiquetas de nombre, cliente, folio, zona, plan
    text = text
      .replace(/\b(?:nombre|cliente|folio|zona|plan|paquete|velocidad)\s*[:=\s]*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 6. El resto es el Folio y Nombre Completo del cliente
    let name = text;
    if (name) {
      const folioPrefixMatch = name.match(/^(\d{1,6})\s*[-_.\s]+\s*(.+)$/i);
      const folioSuffixMatch = name.match(/^(.+)\s*[-_.\s]+\s*(\d{1,6})$/i);
      if (folioPrefixMatch) {
        name = `${folioPrefixMatch[1]}-${cleanPersonName(folioPrefixMatch[2])}`;
      } else if (folioSuffixMatch) {
        name = `${folioSuffixMatch[2]}-${cleanPersonName(folioSuffixMatch[1])}`;
      } else {
        name = cleanPersonName(name);
      }
    }

    const effectiveSuffix = snSuffix.length > 6 ? snSuffix.slice(-6) : snSuffix;
    const hasAllData = Boolean(effectiveSuffix && name && name.length >= 2);

    return {
      snSuffix: effectiveSuffix,
      name,
      plan,
      zone,
      hasAllData,
    };
  }

  /**
   * Verifica si el remitente es un técnico autorizado.
   * Si no hay ningún técnico registrado en la BD aún, permite la operación para pruebas iniciales.
   */
  private static async verificarAutorizacionTecnico(phone: string, rawText?: string): Promise<{ autorizado: boolean; tech: any | null }> {
    try {
      const allTechs = await TursoService.getTechnicians();
      // Si aún no se ha dado de alta ningún técnico en el panel, se permite acceso para configuración inicial
      if (allTechs.length === 0) {
        return { autorizado: true, tech: null };
      }

      // Buscar si incluyeron un PIN numérico en el texto (4 a 8 dígitos) precedido por pin, clave o pass
      const pinMatch = (rawText || '').match(/\b(?:pin|clave|pass|c[oó]digo)\s*[:=\s]*(\d{4,8})\b/i);
      const pin = pinMatch ? pinMatch[1] : undefined;

      const tech = await TursoService.isAuthorizedTechnician(phone, pin);
      return { autorizado: Boolean(tech), tech };
    } catch (err: any) {
      logger.error('Error al verificar técnico:', err?.message || err);
      return { autorizado: false, tech: null };
    }
  }

  /**
   * Procesa la solicitud de cambio de paquete/velocidad en caliente para técnicos de campo
   * Comando: "cambiar plan [Folio/Nombre/SN] a [Nuevo Paquete]"
   */
  private static async procesarCambioPaqueteTecnico(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const auth = await this.verificarAutorizacionTecnico(phone, rawText);
    if (!auth.autorizado) {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Acceso Restringido - Área Técnica*\n\nTu número (*${phone}*) no está registrado como técnico autorizado para cambiar paquetes o activar equipos.\n\n👉 Solicita tu registro o proporciona tu *PIN de seguridad* al administrador en el panel de control.`,
        'CAMBIO_PAQUETE_TECNICO',
        'NO_AUTORIZADO',
        targetJid
      );
      return;
    }

    // Extraer velocidad solicitada (ej. "600 megas", "100M", "50 MB", "800")
    const cleanLower = rawText.toLowerCase().replace(/^(?:cambiar|modificar|actualizar|subir|bajar)\s+(?:de\s+)?(?:paquete|plan|velocidad|megas)\s*/i, '').trim();
    
    // Buscar patrón de velocidad (ej. "600 megas", "a 600m", "40mb", "600")
    const speedMatch = cleanLower.match(/(?:a\s+)?(\d{2,4})\s*(?:m|mb|megas|mega)?\b/i);
    if (!speedMatch) {
      await this.enviarYLoguear(
        phone,
        `🛠️ *Cambio de Paquete en SmartOLT*\n\nPara modificar el plan de un cliente, envía:\n\n👉 *cambiar plan [Folio o SN o Nombre] a [Nuevo Paquete]*\n\n_Ejemplos:_\n• \`cambiar plan 3000 a 600 megas\`\n• \`cambiar paquete c24b0 800 megas\`\n• \`cambiar plan Juan de Dios Moran a 400 megas\``,
        'CAMBIO_PAQUETE_TECNICO',
        'AYUDA_CAMBIO_PAQUETE',
        targetJid
      );
      return;
    }

    const megas = speedMatch[1];
    const newPlan = `${megas} megas`;

    // Extraer identificador del cliente (eliminar la parte de la velocidad y palabras clave)
    let target = cleanLower
      .replace(speedMatch[0], '')
      .replace(/\b(?:a|al|para|del|cliente|folio|sn|onu|modem|pin\s*\d{5})\b/gi, '')
      .trim();

    if (!target) {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Por favor indica el cliente o SN al que deseas cambiarle el paquete.*\n\nEjemplo: \`cambiar plan 3000 a ${megas} megas\` o \`cambiar plan c24b0 a ${megas} megas\`.`,
        'CAMBIO_PAQUETE_TECNICO',
        'FALTA_DESTINO',
        targetJid
      );
      return;
    }

    await this.enviarYLoguear(
      phone,
      `🔍 Localizando cliente o módem *${target}* en SmartOLT para aplicar ${newPlan}...`,
      'CAMBIO_PAQUETE_TECNICO',
      'BUSCANDO_CLIENTE_CAMBIO',
      targetJid
    );

    // 1. Buscar en Turso DB / SmartOLT
    let onuRecord = await TursoService.getOnuById(target);

    if (!onuRecord) {
      // Búsqueda por folio o prefijo numérico
      const folioMatch = target.match(/^(\d{1,6})/);
      if (folioMatch) {
        const client = await TursoService.getWisphubClientByAny({ id: folioMatch[1] });
        if (client && client.sn_onu) {
          onuRecord = await TursoService.getOnuById(client.sn_onu);
        }
      }
    }

    if (!onuRecord) {
      // Búsqueda difusa por nombre
      const fuzzy = await TursoService.searchOnusFuzzy(target, 1);
      if (fuzzy.length > 0 && fuzzy[0].matchScore >= 45) {
        onuRecord = fuzzy[0];
      }
    }

    if (!onuRecord) {
      await this.enviarYLoguear(
        phone,
        `❌ *No se encontró el cliente o módem "${target}" en el sistema.*\n\n💡 *Consejo:* Intenta buscando por el número de Folio (ej: 3000), por los últimos dígitos del SN (ej: c24b0) o por el nombre del cliente.`,
        'CAMBIO_PAQUETE_TECNICO',
        'CLIENTE_NO_ENCONTRADO',
        targetJid
      );
      return;
    }

    // 2. Ejecutar cambio de velocidad en SmartOLT
    const result = await SmartOLTService.updateSpeedProfile(onuRecord.unique_external_id || onuRecord.sn, newPlan);

    if (result.success) {
      const techInfo = auth.tech ? `• *Técnico:* ${auth.tech.name}\n` : '';
      const cardSuccess = `⚡ *PAQUETE ACTUALIZADO CON ÉXITO*
──────────────────────────────
• *Cliente:* *${onuRecord.name}*
• *Serie (SN):* *${onuRecord.sn}*
• *Nuevo Paquete:* *${megas} Megas* (${result.downProfile} / ${result.upProfile})
• *Zona:* *${onuRecord.zone_name || 'Actopan'}*
${techInfo}──────────────────────────────
✅ Perfil de velocidad aplicado y activo en SmartOLT.`;

      await this.enviarYLoguear(
        phone,
        cardSuccess,
        'CAMBIO_PAQUETE_TECNICO',
        'CAMBIO_PAQUETE_EXITOSO',
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `❌ *Error al cambiar el paquete en SmartOLT:*\n\n${result.message}`,
        'CAMBIO_PAQUETE_TECNICO',
        'ERROR_CAMBIO_PAQUETE',
        targetJid
      );
    }
  }

  /**
   * Detecta si un técnico está preguntando o enviando comandos sobre TR-069, SmartOLT o configuración sin un SN real
   */
  private static esConsultaTr069OSmartOLT(text: string): boolean {
    const clean = text.toLowerCase();
    const hasTechTerms = /\b(?:tr069|tr-069|smartolt|dual\s*stack|modo\s*vlan|ip\s*estatica|static\s*ip|mgmt|gestion)\b/i.test(clean) ||
      clean.includes('activar tr069') ||
      clean.includes('activar smart') ||
      clean.includes('activar ya que se trata');
    const hasRealSn = /\b(?:48575443|zteg|hwtc|[a-f0-9]{12})\b/i.test(clean);
    return hasTechTerms && !hasRealSn;
  }

  /**
   * Envía la guía didáctica explicativa al técnico que pregunta sobre TR-069 o SmartOLT
   */
  private static async enviarGuiaTr069Tecnico(phone: string, targetJid?: string): Promise<void> {
    const guiaMsg = `💡 *Aprovisionamiento Todo-en-Uno en SmartOLT*\n\nHola técnico. En este sistema *no requieres activar TR-069 o la IP por separado*.\n\nTodo se realiza automáticamente en un solo paso al enviar:\n👉 *activar cliente [SN] [Folio-Nombre] [Plan] [Zona]*\n\n_Ejemplo:_ \`activar cliente 8D82B0 2473-Juana Larios 40M Actopan\`\n\nEl bot ejecuta en la OLT y en el módem en menos de 10 segundos:\n1️⃣ Registro en puerto PON con su VLAN de servicio\n2️⃣ Perfil de velocidad configurado\n3️⃣ Management IP en VLAN 99 (o 60)\n4️⃣ Perfil TR-069 'SmartOLT' activado\n5️⃣ WAN Static IP con Dual Stack IPv4/IPv6, Auto y Acceso Remoto habilitado.\n\nEl módem queda navegando sin tocar su web local. 🚀`;

    await this.enviarYLoguear(
      phone,
      guiaMsg,
      'ACTIVACION_TECNICO',
      'GUIA_TR069_TODO_EN_UNO',
      targetJid
    );
  }

  /**
   * Atiende a clientes residenciales que solicitan activar su servicio tras pagar
   */
  private static async procesarSolicitudReactivacionCliente(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const nombreCliente = this.formatDisplayName(session?.client_name, true) || 'estimado cliente';

    // 1. Intentar consultar estado del cliente en WispHub
    let clienteWh: any = null;
    try {
      clienteWh = await WispHubService.buscarClientePorTelefono(phone);
    } catch {}

    const saldoPendiente = clienteWh?.saldo ? Number(clienteWh.saldo) : 0;
    const estadoServicio = (clienteWh?.estado || '').toLowerCase();

    if (estadoServicio === 'activo' && saldoPendiente <= 0) {
      await this.enviarYLoguear(
        phone,
        `¡Hola, *${nombreCliente}*! 👋 Revisamos tu cuenta en el sistema y tu servicio figura como *Activo* y al corriente sin adeudos pendientes.\n\nSi no tienes acceso a internet en este momento:\n1. Verifica que tu módem tenga la luz *PON* en verde fija.\n2. Si la luz *LOS* parpadea en rojo, indícanoslo para canalizar una visita técnica.\n\n¿Deseas que probemos reiniciar tu módem remotamente desde el sistema?`,
        'CONSULTA_CLIENTE',
        'CLIENTE_ACTIVO_SIN_ADEUDO',
        targetJid
      );
      return;
    }

    // Si tiene adeudo o requiere validación de comprobante:
    let msgPago = `¡Hola, *${nombreCliente}*! 👋 Con mucho gusto te apoyamos con la reactivación de tu servicio.\n\n`;
    if (saldoPendiente > 0) {
      msgPago += `📌 Registramos un saldo pendiente de *$${saldoPendiente} MXN* en tu cuenta.\n\n`;
    }
    msgPago += `📸 *Si ya realizaste tu pago o transferencia:*\nPor favor envía por aquí la *foto o captura de pantalla de tu comprobante de pago* indicando tu *Nombre completo* o *Número de contrato* para aplicarlo y reactivar tu internet de inmediato.\n\n💳 Si aún no has realizado tu pago, puedes solicitar los datos bancarios o enlace de Mercado Pago aquí mismo.`;

    await this.enviarYLoguear(
      phone,
      msgPago,
      'CONSULTA_CLIENTE',
      'SOLICITUD_COMPROBANTE_REACTIVACION',
      targetJid
    );
  }

  /**
   * Atiende a clientes residenciales que preguntan por cambiar su plan o contratar más megas
   */
  private static async procesarSolicitudCambioPlanCliente(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const nombreCliente = this.formatDisplayName(session?.client_name, true) || '';
    const saludo = nombreCliente ? `¡Hola, *${nombreCliente}*! 👋` : `¡Hola! 👋`;

    const texto = `${saludo} ¡Con mucho gusto te orientamos sobre el cambio o mejora de tu paquete de internet! 🚀\n\nActualmente contamos con opciones de alta velocidad en fibra óptica:\n• *40 Megas* - Ideal para navegación básica y streaming\n• *60 Megas* - Excelente para familias y teletrabajo\n• *100 Megas* - Máxima fluidez para juegos y múltiples dispositivos\n• *200 Megas* - Velocidad ultra rápida simétrica\n\n👉 Para coordinar el cambio de tu paquete sin costo de migración, ¿a cuántos megas te gustaría cambiarte o deseas que un asesor te contacte por llamada?`;

    await this.enviarYLoguear(
      phone,
      texto,
      'VENTAS_CAMBIO_PLAN',
      'INFORMACION_PLANES_CLIENTE',
      targetJid
    );
  }

  /**
   * Procesa la solicitud de activación/autorización de ONU para técnicos de campo en un solo mensaje
   * Comando: "activar cliente [6 dígitos SN] [Folio-Nombre] [Plan] [Zona]"
   */
  private static async procesarSolicitudActivacionTecnico(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const auth = await this.verificarAutorizacionTecnico(phone, rawText);
    if (!auth.autorizado) {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Acceso Restringido - Área Técnica*\n\nTu número (*${phone}*) no está registrado como técnico autorizado para activar equipos en SmartOLT.\n\n👉 Solicita tu alta o proporciona tu *PIN de seguridad* al administrador en el panel de control.`,
        'ACTIVACION_TECNICO',
        'NO_AUTORIZADO',
        targetJid
      );
      return;
    }

    const parsed = this.parseActivationMessage(rawText);

    // Si el mensaje viene vacío o solo enviaron "activar cliente" sin los datos
    if (!parsed.snSuffix || !parsed.hasAllData) {
      await this.enviarYLoguear(
        phone,
        `🛠️ *Activación de Cliente en SmartOLT (Un Solo Mensaje)*\n\nPara activar el módem, envía el comando *activar cliente* con los datos básicos:\n\n👉 *activar cliente [6 dígitos SN] [Folio-Nombre] [Plan] [Zona]*\n\n_Ejemplos para copiar y rellenar:_\n• \`activar cliente 4317B5 3456-Juan Perez Martinez 40M Actopan\`\n• \`activar cliente c24b0 3000-Juan de Dios Morán Pérez 600 megas cerritos\`\n• \`activar cliente 4317B5 3456-Juan Perez Martinez\` _(Plan 40M y Zona Actopan por defecto)_`,
        'ACTIVACION_TECNICO',
        'AYUDA_ACTIVACION_UN_MENSAJE',
        targetJid
      );
      return;
    }

    await this.enviarYLoguear(
      phone,
      `🔍 Buscando módem con terminación *${parsed.snSuffix}* en SmartOLT...`,
      'ACTIVACION_TECNICO',
      'BUSCANDO_ONU',
      targetJid
    );

    // 1. Buscar la ONU en SmartOLT
    const unconfigured = await SmartOLTService.findUnconfiguredOnuBySnSuffix(parsed.snSuffix);

    if (!unconfigured) {
      await this.enviarYLoguear(
        phone,
        `❌ *Módem no encontrado en SmartOLT*\n\nNo se localizó ninguna ONU sin configurar con terminación *${parsed.snSuffix}*.\n\n💡 *Por favor verifica:*\n1. Que la fibra óptica esté conectada y la luz PON del módem esté encendida/sincronizando.\n2. Que el equipo haya sincronizado en la OLT.\n3. Que los dígitos del SN sean correctos (ej: *${parsed.snSuffix}*).`,
        'ACTIVACION_TECNICO',
        'ONU_NO_ENCONTRADA',
        targetJid
      );
      return;
    }

    // 2. Determinar OLT y Zona (por defecto Actopan obligatorio)
    const isSanAgustin = parsed.zone.toLowerCase().includes('san agustin') ||
      String(unconfigured.olt_id) === '2' ||
      (unconfigured.olt_name || '').toLowerCase().includes('san agustin');

    const targetZone = isSanAgustin ? 'San Agustin Tlaxiaca' : this.resolverZonaOMunicipio(parsed.zone);
    const targetOltId = isSanAgustin ? '2' : '3';
    const targetOltName = isSanAgustin ? 'OLT-SanAgustin' : 'OLT5800-Actopan';
    const defaultVlan = isSanAgustin ? '800' : '510';

    const profiles = getSmartOltSpeedProfiles(parsed.plan);

    // 3. Asignar IP libre en el pool IPAM
    let nextIp = await IpamService.getNextAvailableIp(defaultVlan, targetOltId);

    // Si la VLAN principal estuviera llena, buscar automáticamente en cualquier otra VLAN libre de esa OLT
    if (!nextIp) {
      nextIp = await IpamService.getNextAvailableIp(undefined, targetOltId);
    }

    if (!nextIp) {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Atención:* No se encontraron direcciones IP libres disponibles en el pool de la OLT *${targetOltName}*. Por favor contacta al administrador de red.`,
        'ACTIVACION_TECNICO',
        'SIN_IPS_DISPONIBLES',
        targetJid
      );
      return;
    }

    // 4. Preparar payload de autorización con modo VLAN (no prio)
    const payload: AuthorizeOnuPayload = {
      olt_id: unconfigured.olt_id || targetOltId,
      pon_type: unconfigured.pon_type || 'gpon',
      board: unconfigured.board,
      port: unconfigured.port,
      sn: unconfigured.sn,
      onu_type: SmartOLTService.normalizeOnuType(unconfigured.onu_type_name || unconfigured.onu_type, unconfigured.sn),
      name: parsed.name,
      onu_mode: 'Routing',
      vlan: nextIp.vlan,
      ip_address: nextIp.ip,
      netmask: nextIp.netmask,
      gateway: nextIp.gateway,
      line_profile: 'VLAN mapping', // Modo VLAN mapping obligatorio
      download_speed_profile_name: profiles.down,
      upload_speed_profile_name: profiles.up,
      zone: targetZone,
      comment: `Activado vía Bot WhatsApp por técnico (${phone})`,
    };

    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    metaObj.pendingActivation = payload;
    metaObj.pendingActivationDetails = {
      snSuffix: parsed.snSuffix,
      oltName: targetOltName,
      zone: targetZone,
      signal: unconfigured.onu_signal_1490 || unconfigured.onu_signal || 'Detectada',
      model: payload.onu_type || 'EG8041V5',
    };

    await TursoService.upsertSession({
      phone,
      step: 'PENDIENTE_CONFIRMACION_ACTIVACION_ONU',
      metadata: JSON.stringify(metaObj),
    });

    const signalText = unconfigured.onu_signal_1490 || unconfigured.onu_signal || 'Detectado';
    const planDisplay = parsed.plan.replace(/MB|M/i, ' Megas');

    // Ficha simple y directa para el técnico (solo lo básico esencial)
    const cardMsg = `📋 *RESUMEN DE ACTIVACIÓN*
──────────────────────────────
• *Cliente / Folio:* *${parsed.name}*
• *Zona:* *${targetZone}*
• *Paquete:* *${planDisplay}*
• *Serie (SN):* *${unconfigured.sn}*
• *Nivel Óptico:* *${signalText}*
──────────────────────────────
⚠️ *¿Confirmas la activación de este módem en SmartOLT?*

👉 Responde *SÍ* para activar o *NO* para cancelar.`;

    await this.enviarYLoguear(
      phone,
      cardMsg,
      'ACTIVACION_TECNICO',
      'ESPERANDO_CONFIRMACION',
      targetJid
    );
  }

  /**
   * Procesa el Nombre y Folio proporcionado por el técnico
   */
  private static async procesarNombreActivacionTecnico(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    await this.procesarSolicitudActivacionTecnico(phone, rawText, session, targetJid);
  }

  /**
   * Procesa la Zona/Región de instalación, asigna IP/VLAN en modo VLAN y genera la confirmación
   */
  private static async procesarZonaActivacionTecnico(
    phone: string,
    rawText: string,
    buttonId: string | undefined,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    await this.procesarSolicitudActivacionTecnico(phone, rawText, session, targetJid);
  }

  /**
   * Procesa la confirmación explícita (SÍ / NO) de la activación de la ONU
   */
  private static async procesarConfirmacionActivacionOnu(
    phone: string,
    session: Session | null,
    targetJid: string | undefined,
    confirmar: boolean = true
  ): Promise<void> {
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    const payload: AuthorizeOnuPayload = metaObj.pendingActivation;

    if (!confirmar || !payload) {
      metaObj.pendingActivation = null;
      metaObj.pendingActivationDetails = null;
      metaObj.pendingOnu = null;
      metaObj.pendingName = null;
      metaObj.pendingPlan = null;
      await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
        metadata: JSON.stringify(metaObj),
      });

      await this.enviarYLoguear(
        phone,
        `❌ *Activación cancelada.* No se realizaron modificaciones en la OLT. Para activar otro equipo, envía *activar cliente [6 dígitos SN] [Folio-Nombre]*.`,
        'ACTIVACION_TECNICO',
        'ACTIVACION_CANCELADA',
        targetJid
      );
      return;
    }

    await this.enviarYLoguear(
      phone,
      `⏳ Aprovisionando y autorizando módem *${payload.sn}* en SmartOLT... Por favor espera un momento.`,
      'ACTIVACION_TECNICO',
      'EJECUTANDO_AUTORIZACION',
      targetJid
    );

    const result = await SmartOLTService.authorizeOnu(payload);

    metaObj.pendingActivation = null;
    metaObj.pendingActivationDetails = null;
    metaObj.pendingOnu = null;
    metaObj.pendingName = null;
    metaObj.pendingPlan = null;
    await TursoService.upsertSession({
      phone,
      step: 'CONVERSACIONAL',
      metadata: JSON.stringify(metaObj),
    });

    if (result.success) {
      const planDisplay = (payload.download_speed_profile_name || '40MB').replace(/MB-DOWN|MB/i, ' Megas');
      const successMsg = `🎉 *¡MÓDEM AUTORIZADO CON ÉXITO!*
──────────────────────────────
• *Cliente:* *${payload.name}*
• *Zona:* *${payload.zone || 'Actopan'}*
• *Paquete:* *${planDisplay}*
• *Serie (SN):* *${payload.sn}*
──────────────────────────────
📡 *PARÁMETROS DE RED / CONECTIVIDAD:*
• *VLAN:* *${payload.vlan}*
• *IP Asignada:* *${payload.ip_address}*
• *Máscara:* *${payload.netmask || '255.255.255.0'}*
• *Gateway:* *${payload.gateway || '172.19.2.254'}*
• *DNS:* *8.8.8.8 / 8.8.4.4*
──────────────────────────────
✅ Módem aprovisionado en la OLT con su VLAN y Perfil de Velocidad.`;

      await this.enviarYLoguear(
        phone,
        successMsg,
        'ACTIVACION_TECNICO',
        'ACTIVACION_EXITOSA',
        targetJid
      );

      // Notificación automática al grupo de WhatsApp de Activaciones
      let groupMsg = `${payload.name}\n${payload.ip_address}\n${payload.zone || 'Actopan'}\nLISTO`;
      const ev = metaObj.pendingActivationEvidence || {};
      const extraTags: string[] = [];
      if (ev.potencia_dbm) extraTags.push(`📊 Potencia: ${ev.potencia_dbm} dBm`);
      if (ev.speedtest?.down) extraTags.push(`🚀 Test: ${ev.speedtest.down} Mbps`);
      if (ev.gps?.coordsStr) extraTags.push(`📍 GPS: ${ev.gps.coordsStr}`);
      if (ev.wifi_password) extraTags.push(`🔐 Wi-Fi: ${ev.wifi_password}`);
      if (extraTags.length > 0) {
        groupMsg += `\n${extraTags.join(' | ')}`;
      }
      let configuredGroupJid = SettingsService.get(
        'ACTIVATIONS_GROUP_JID',
        'ACTIVATIONS_GROUP_JID',
        SettingsService.get('GRUPO_ACTIVACIONES', 'GRUPO_ACTIVACIONES', '')
      ).trim();

      if (configuredGroupJid) {
        if (!configuredGroupJid.endsWith('@g.us')) {
          const resolved = await EvolutionService.resolveAndJoinGroupInvite(configuredGroupJid);
          if (resolved.success && resolved.jid) {
            configuredGroupJid = resolved.jid;
            await SettingsService.set('ACTIVATIONS_GROUP_JID', resolved.jid).catch(() => {});
          }
        }

        if (configuredGroupJid.endsWith('@g.us')) {
          logger.info(`[Grupo Activaciones] Enviando notificación de activación a ${configuredGroupJid}: "${groupMsg}"`);
          await EvolutionService.enviarTexto(configuredGroupJid, groupMsg, { instant: true }).catch((gErr) => {
            logger.warn(`No se pudo enviar notificación de activación al grupo ${configuredGroupJid}:`, gErr?.message || gErr);
          });
        }
      }
    } else {
      await this.enviarYLoguear(
        phone,
        `❌ *Error al autorizar en SmartOLT:*\n\n${result.message}\n\nPor favor verifica el estado de la OLT o intenta nuevamente.`,
        'ACTIVACION_TECNICO',
        'ERROR_AUTORIZACION',
        targetJid
      );
    }
  }

  /**
   * Procesa la solicitud de Cambio de Módem (Reemplazo de ONU) solicitada por un técnico en campo
   * Comando: "cambio de modem [6 dígitos SN Nuevo] [Cliente / SN Viejo / IP]"
   */
  private static async procesarSolicitudCambioModemTecnico(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const auth = await this.verificarAutorizacionTecnico(phone, rawText);
    if (!auth.autorizado) {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Acceso Restringido - Área Técnica*\n\nTu número (*${phone}*) no está registrado como técnico autorizado para realizar cambios de módem en SmartOLT.\n\n👉 Solicita tu alta o proporciona tu *PIN de seguridad* al administrador en el panel de control.`,
        'ACTIVACION_TECNICO',
        'NO_AUTORIZADO',
        targetJid
      );
      return;
    }

    // Extraer argumentos del mensaje:
    const cleanParams = rawText
      .replace(/^(?:cambio\s+de\s+m[oó]dem|reemplazar\s+m[oó]dem|reemplazo\s+de\s+m[oó]dem|cambiar\s+m[oó]dem|swap\s+modem|swap\s+onu)[:\s]*/i, '')
      .trim();

    const parts = cleanParams.split(/\s+/).filter(Boolean);
    const newSnSuffix = parts[0] || '';
    const oldIdentifier = parts.slice(1).join(' ') || '';

    if (!newSnSuffix || !oldIdentifier || newSnSuffix.length < 4) {
      await this.enviarYLoguear(
        phone,
        `🔄 *Cambio de Módem en SmartOLT (Reemplazo de Equipo)*\n\n` +
        `Para reemplazar un módem conservando su IP, VLAN, Cliente y Plan:\n\n` +
        `👉 *cambio de modem [6 dígitos SN Nuevo] [Folio-Nombre o SN Anterior o IP]*\n\n` +
        `_Ejemplos para copiar y rellenar:_\n` +
        `• \`cambio de modem 4317B5 3456-Juan Perez\`\n` +
        `• \`cambio de modem 4317B5 HWTCE9C840B3\`\n` +
        `• \`cambio de modem 4317B5 172.19.2.178\``,
        'ACTIVACION_TECNICO',
        'AYUDA_CAMBIO_MODEM',
        targetJid
      );
      return;
    }

    await this.enviarYLoguear(
      phone,
      `🔍 Buscando nuevo módem (*${newSnSuffix}*) y localizando datos del módem anterior (*${oldIdentifier}*)...`,
      'ACTIVACION_TECNICO',
      'BUSCANDO_DATOS_SWAP',
      targetJid
    );

    // 1. Localizar la nueva ONU sin autorizar en SmartOLT
    const unconfigured = await SmartOLTService.findUnconfiguredOnuBySnSuffix(newSnSuffix);
    if (!unconfigured) {
      await this.enviarYLoguear(
        phone,
        `❌ *Nuevo módem no detectado en SmartOLT*\n\nNo se localizó ninguna ONU sin configurar con terminación *${newSnSuffix}*.\n\n💡 Asegúrate de que el nuevo módem esté conectado a la fibra óptica y con la luz PON sincronizando.`,
        'ACTIVACION_TECNICO',
        'NUEVA_ONU_NO_ENCONTRADA',
        targetJid
      );
      return;
    }

    // 2. Localizar datos del módem anterior
    const isIp = /^172\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(oldIdentifier.trim()) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(oldIdentifier.trim());
    const isFullSn = oldIdentifier.trim().length >= 12;

    let oldOnu: any = null;

    if (isIp || isFullSn) {
      oldOnu = await SmartOLTService.getOnuDetails(oldIdentifier);
    } else {
      // Buscar coincidencias de ONUs / Servicios por nombre o folio en Turso DB
      const matches = await TursoService.searchOnusFuzzy(oldIdentifier, 8);

      // Filtrar a servicios únicos con IP o SN distinto
      const distinctMatches: typeof matches = [];
      const seenKeys = new Set<string>();
      for (const m of matches) {
        const key = `${m.unique_external_id || ''}-${m.ip_address || ''}-${m.sn || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          distinctMatches.push(m);
        }
      }

      if (distinctMatches.length > 1) {
        // El cliente tiene 2 o más servicios registrados. Preguntar qué IP o servicio desea cambiar.
        let msg = `⚠️ *Se encontraron ${distinctMatches.length} servicios registrados para "${oldIdentifier}":*\n\n`;
        distinctMatches.forEach((m, idx) => {
          const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][idx] || `${idx + 1}️⃣`;
          const plan = (m.speed_profile || '40MB').replace(/MB-DOWN|MB/i, ' Megas');
          msg += `${numEmoji} *IP:* \`${m.ip_address || 'Sin IP'}\`\n`;
          msg += `   • *Titular:* ${m.name}\n`;
          msg += `   • *SN Módem:* \`${m.sn}\`\n`;
          if (m.address) msg += `   • *Dirección:* ${m.address}\n`;
          msg += `   • *Zona:* ${m.zone_name || 'Actopan'} | *Plan:* ${plan}\n\n`;
        });

        msg += `👉 *¿A qué IP o servicio corresponde este cambio de módem?*\n`;
        msg += `_Responde con la *IP* (ej: \`${distinctMatches[0].ip_address || '172.19.2.x'}\`) o el número de opción (ej: *1* ó *2*)._`;

        let metaObj: any = {};
        try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
        metaObj.pendingModemSwapChoice = {
          newSnSuffix,
          unconfigured,
          candidates: distinctMatches,
        };

        await TursoService.upsertSession({
          phone,
          step: 'PENDIENTE_SELECCION_IP_CAMBIO_MODEM',
          metadata: JSON.stringify(metaObj),
        });

        await this.enviarYLoguear(
          phone,
          msg,
          'ACTIVACION_TECNICO',
          'SELECCION_IP_MULTISERVICIO_SWAP',
          targetJid
        );
        return;
      } else if (distinctMatches.length === 1) {
        oldOnu = await SmartOLTService.getOnuDetails(distinctMatches[0].unique_external_id || distinctMatches[0].sn);
      } else {
        oldOnu = await SmartOLTService.getOnuDetails(oldIdentifier);
      }
    }

    if (!oldOnu) {
      await this.enviarYLoguear(
        phone,
        `❌ *Módem anterior no encontrado*\n\nNo se encontró ninguna ONU activa con el identificador o cliente: *"${oldIdentifier}"* en SmartOLT ni en la base de datos.\n\n💡 Verifica que el nombre, folio, IP o SN anterior sean correctos.`,
        'ACTIVACION_TECNICO',
        'VIEJA_ONU_NO_ENCONTRADA',
        targetJid
      );
      return;
    }

    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    metaObj.pendingModemSwap = {
      oldOnuId: oldOnu.unique_external_id,
      oldSn: oldOnu.sn,
      newSn: unconfigured.sn,
      clientName: oldOnu.name,
      ip: oldOnu.ip_address,
      vlan: oldOnu.vlan,
      zone: oldOnu.zone,
      speedProfile: oldOnu.download_speed_profile_name,
      oltId: unconfigured.olt_id || oldOnu.olt_id,
      board: unconfigured.board,
      port: unconfigured.port,
      model: unconfigured.onu_type_name || unconfigured.onu_type || oldOnu.onu_type,
    };

    await TursoService.upsertSession({
      phone,
      step: 'PENDIENTE_CONFIRMACION_CAMBIO_MODEM',
      metadata: JSON.stringify(metaObj),
    });

    const signalText = unconfigured.onu_signal_1490 || unconfigured.onu_signal || 'Detectado';
    const planDisplay = (oldOnu.download_speed_profile_name || '40MB').replace(/MB-DOWN|MB/i, ' Megas');

    const cardMsg = `🔄 *RESUMEN DE CAMBIO DE MÓDEM*
──────────────────────────────
• *Cliente / Folio:* *${oldOnu.name}*
• *Zona:* *${oldOnu.zone || 'Actopan'}*
• *IP Asignada a Conservar:* *${oldOnu.ip_address}* (VLAN ${oldOnu.vlan})
• *Paquete:* *${planDisplay}*
• *Módem Anterior (a retirar):* *${oldOnu.sn}*
• *Nuevo Módem (a instalar):* *${unconfigured.sn}* (${unconfigured.onu_type_name || 'EG8041V5'})
• *Nivel Óptico Detectado:* *${signalText}*
──────────────────────────────
⚠️ *Al confirmar, se eliminará el módem anterior (${oldOnu.ip_address}) de SmartOLT y se activará el nuevo con los mismos datos.*

👉 Responde *SÍ* para ejecutar el cambio o *NO* para cancelar.`;

    await this.enviarYLoguear(
      phone,
      cardMsg,
      'ACTIVACION_TECNICO',
      'ESPERANDO_CONFIRMACION_SWAP',
      targetJid
    );
  }

  /**
   * Procesa la selección de IP o servicio cuando el cliente tiene múltiples servicios y se solicitó un cambio de módem
   */
  private static async procesarSeleccionIpCambioModem(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    const lower = rawText.trim().toLowerCase();
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    const choiceData = metaObj.pendingModemSwapChoice;

    if (!choiceData || !Array.isArray(choiceData.candidates) || choiceData.candidates.length === 0) {
      await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL' });
      await this.enviarYLoguear(phone, '⚠️ No hay ninguna selección de cambio de módem pendiente. Inicia nuevamente con el comando: `cambio de modem [SN Nuevo] [Cliente]`', 'ACTIVACION_TECNICO', 'ERROR_SESION', targetJid);
      return;
    }

    if (/^(no|cancelar|cancelo|abortar|0)\b/i.test(lower)) {
      metaObj.pendingModemSwapChoice = null;
      await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
        metadata: JSON.stringify(metaObj),
      });
      await this.enviarYLoguear(phone, '❌ Cambio de módem cancelado.', 'ACTIVACION_TECNICO', 'SWAP_CANCELADO', targetJid);
      return;
    }

    const candidates: any[] = choiceData.candidates;
    let selectedCandidate: any = null;

    // 1. Verificar si respondió con número de opción (1, 2, 3...)
    const numMatch = lower.match(/^(\d+)(?:[.)]|\s|$)/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      if (idx >= 0 && idx < candidates.length) {
        selectedCandidate = candidates[idx];
      }
    }

    // 2. Verificar si respondió con una IP (ej: 172.19.2.45)
    if (!selectedCandidate) {
      const ipInText = rawText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      if (ipInText) {
        const foundByIp = candidates.find(c => (c.ip_address || '').trim() === ipInText[0].trim());
        if (foundByIp) selectedCandidate = foundByIp;
      }
    }

    // 3. Verificar si respondió con un SN
    if (!selectedCandidate) {
      const cleanUpper = rawText.trim().toUpperCase();
      const foundBySn = candidates.find(c => (c.sn || '').toUpperCase().includes(cleanUpper) || cleanUpper.includes((c.sn || '').toUpperCase()));
      if (foundBySn) selectedCandidate = foundBySn;
    }

    if (!selectedCandidate) {
      let retryMsg = `⚠️ No logré identificar el servicio con esa respuesta.\n\n`;
      retryMsg += `Por favor responde con el *número de opción* o la *IP* exacta del servicio a cambiar:\n\n`;
      candidates.forEach((m: any, idx: number) => {
        retryMsg += `*${idx + 1}* ➔ IP: \`${m.ip_address || 'Sin IP'}\` | SN: \`${m.sn}\` (${m.name})\n`;
      });
      retryMsg += `\n_O escribe *cancelar* para salir._`;
      await this.enviarYLoguear(phone, retryMsg, 'ACTIVACION_TECNICO', 'REINTENTO_SELECCION_IP', targetJid);
      return;
    }

    // Obtener detalles completos de la ONU seleccionada
    const unconfigured = choiceData.unconfigured;
    const oldOnu = await SmartOLTService.getOnuDetails(selectedCandidate.unique_external_id || selectedCandidate.sn);

    if (!oldOnu) {
      await this.enviarYLoguear(phone, `❌ Error al consultar los detalles de la ONU seleccionada (${selectedCandidate.sn}). Por favor intenta nuevamente.`, 'ACTIVACION_TECNICO', 'ERROR_DETALLES_ONU', targetJid);
      return;
    }

    metaObj.pendingModemSwapChoice = null;
    metaObj.pendingModemSwap = {
      oldOnuId: oldOnu.unique_external_id,
      oldSn: oldOnu.sn,
      newSn: unconfigured.sn,
      clientName: oldOnu.name,
      ip: oldOnu.ip_address,
      vlan: oldOnu.vlan,
      zone: oldOnu.zone,
      speedProfile: oldOnu.download_speed_profile_name,
      oltId: unconfigured.olt_id || oldOnu.olt_id,
      board: unconfigured.board,
      port: unconfigured.port,
      model: unconfigured.onu_type_name || unconfigured.onu_type || oldOnu.onu_type,
    };

    await TursoService.upsertSession({
      phone,
      step: 'PENDIENTE_CONFIRMACION_CAMBIO_MODEM',
      metadata: JSON.stringify(metaObj),
    });

    const signalText = unconfigured.onu_signal_1490 || unconfigured.onu_signal || 'Detectado';
    const planDisplay = (oldOnu.download_speed_profile_name || '40MB').replace(/MB-DOWN|MB/i, ' Megas');

    const cardMsg = `🔄 *RESUMEN DE CAMBIO DE MÓDEM*
──────────────────────────────
• *Cliente / Folio:* *${oldOnu.name}*
• *Zona:* *${oldOnu.zone || 'Actopan'}*
• *IP Asignada a Conservar:* *${oldOnu.ip_address}* (VLAN ${oldOnu.vlan})
• *Paquete:* *${planDisplay}*
• *Módem Anterior (a retirar):* *${oldOnu.sn}*
• *Nuevo Módem (a instalar):* *${unconfigured.sn}* (${unconfigured.onu_type_name || 'EG8041V5'})
• *Nivel Óptico Detectado:* *${signalText}*
──────────────────────────────
⚠️ *Al confirmar, se eliminará el módem anterior (${oldOnu.ip_address}) de SmartOLT y se activará el nuevo con los mismos datos.*

👉 Responde *SÍ* para ejecutar el cambio o *NO* para cancelar.`;

    await this.enviarYLoguear(
      phone,
      cardMsg,
      'ACTIVACION_TECNICO',
      'ESPERANDO_CONFIRMACION_SWAP',
      targetJid
    );
  }

  /**
   * Procesa la confirmación explícita (SÍ / NO) del cambio de módem solicitado por el técnico
   */
  private static async procesarConfirmacionCambioModemTecnico(
    phone: string,
    session: Session | null,
    targetJid: string | undefined,
    confirmar: boolean = true
  ): Promise<void> {
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    const swapData = metaObj.pendingModemSwap;

    if (!confirmar || !swapData) {
      metaObj.pendingModemSwap = null;
      await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
        metadata: JSON.stringify(metaObj),
      });

      await this.enviarYLoguear(
        phone,
        `❌ *Cambio de módem cancelado.* No se realizó ninguna modificación en SmartOLT.`,
        'ACTIVACION_TECNICO',
        'SWAP_CANCELADO',
        targetJid
      );
      return;
    }

    await this.enviarYLoguear(
      phone,
      `⏳ Ejecutando cambio de módem en SmartOLT (eliminando equipo anterior y autorizando nuevo equipo *${swapData.newSn}*)... Por favor espera un momento.`,
      'ACTIVACION_TECNICO',
      'EJECUTANDO_SWAP',
      targetJid
    );

    const result = await SmartOLTService.executeModemSwap({
      oldOnuIdOrSn: swapData.oldOnuId || swapData.oldSn,
      newSn: swapData.newSn,
      technicianPhone: phone,
      technicianName: `Técnico WhatsApp (${phone})`,
      overrideOltId: swapData.oltId,
      overrideBoard: swapData.board,
      overridePort: swapData.port,
      notifyGroup: true,
    });

    metaObj.pendingModemSwap = null;
    await TursoService.upsertSession({
      phone,
      step: 'CONVERSACIONAL',
      metadata: JSON.stringify(metaObj),
    });

    if (result.success) {
      const successMsg = `🔄 *¡CAMBIO DE MÓDEM COMPLETADO CON ÉXITO!*
──────────────────────────────
• *Cliente:* *${swapData.clientName}*
• *Zona:* *${swapData.zone || 'Actopan'}*
• *IP Conservada:* *${swapData.ip}* (VLAN ${swapData.vlan})
• *Módem Anterior Retirado:* *${swapData.oldSn}*
• *Nuevo Módem Instalado:* *${swapData.newSn}* (${swapData.model})
──────────────────────────────
✅ Equipo anterior eliminado de SmartOLT y nuevo módem aprovisionado en línea.
📲 Notificación enviada al grupo de WhatsApp con formato *CAMBIO DE MODEM*.`;

      await this.enviarYLoguear(
        phone,
        successMsg,
        'ACTIVACION_TECNICO',
        'SWAP_EXITOSO',
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `⚠️ *Atención durante el cambio de módem:*\n\n${result.message}`,
        'ACTIVACION_TECNICO',
        'SWAP_ERROR',
        targetJid
      );
    }
  }

  /**
   * Procesa la extracción de datos del contrato fotografiado con IA (Folio, Cliente, Zona/Municipio, Plan, Dirección).
   * Asigna automáticamente por defecto el Municipio si la comunidad no está registrada en SmartOLT.
   * Solicita inmediatamente al técnico los dígitos del SN del módem para realizar la búsqueda en SmartOLT.
   */
  private static async procesarActivacionPorContrato(
    phone: string,
    rawText: string,
    datos: ContratoInstalacionDatos,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    logger.info(`[Activación Contrato] Procesando foto de contrato para ${phone}: Folio=${datos.folio}, Cliente=${datos.cliente}`);

    // 1. Extraer y normalizar Folio y Cliente
    const folio = (datos.folio || '').trim();
    let rawCliente = cleanPersonName(datos.cliente || '').trim();
    if (folio && rawCliente && rawCliente.startsWith(folio)) {
      rawCliente = rawCliente.replace(new RegExp(`^${folio}\\s*[-_.]*\\s*`, 'i'), '').trim();
    }
    const clientName = rawCliente || (folio ? `Folio-${folio}` : 'Cliente-Nuevo');

    // 2. Resolver Zona o Municipio por defecto (ej: Actopan, El Arenal, San Agustín Tlaxiaca, San José Tepenene)
    const targetZone = this.resolverZonaOMunicipio(
      datos.colonia,
      datos.municipio_zona,
      datos.municipio_zona,
      datos.direccion
    );

    // 3. Normalizar Plan y Perfiles
    const planRaw = (datos.paquete || '40MB').toUpperCase().replace(/\s+/g, '');
    const planDisplay = planRaw.replace(/MB|M/i, ' Megas');

    // 4. Guardar borrador en la sesión para esperar los dígitos del SN del técnico
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    metaObj.pendingActivation = null;
    metaObj.pendingActivationDetails = null;
    metaObj.pendingContractDraft = {
      folio: folio || null,
      cliente: clientName,
      zona: targetZone,
      paquete: planRaw,
      direccion: datos.direccion || '',
      modelo: datos.modelo || 'EG8041V5',
    };

    await TursoService.upsertSession({
      phone,
      step: 'PENDIENTE_CONFIRMACION_ACTIVACION_ONU',
      metadata: JSON.stringify(metaObj),
    });

    const cardDraftMsg = `📸 *CONTRATO DETECTADO POR IA*
──────────────────────────────
• *Folio:* *${folio || 'S/F'}*
• *Cliente:* *${clientName}*
• *Zona / Municipio:* *${targetZone}*
• *Paquete:* *${planDisplay}*
• *Dirección:* ${datos.direccion || 'Registrada en contrato'}
──────────────────────────────
👉 *Por favor escribe los últimos dígitos del SN del módem* (ej: *474B4484* o *4484*) para buscarlo en SmartOLT y activarlo.

_(O puedes corregir datos: 'cambiar nombre [nombre]', 'cambiar folio [folio]', 'cambiar zona [zona]', 'cambiar plan [megas]')_`;

    await this.enviarYLoguear(
      phone,
      cardDraftMsg,
      'ACTIVACION_TECNICO',
      'CONTRATO_EXTRAIDO_ESPERANDO_SN',
      targetJid
    );
  }

  /**
   * Permite al técnico modificar cualquier parámetro en caliente o proporcionar el SN del módem
   * antes de confirmar la activación, sin romper el flujo conversacional.
   */
  private static async procesarModificacionActivacionEnCaliente(
    phone: string,
    rawText: string,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
    let payload: AuthorizeOnuPayload | null = metaObj.pendingActivation || null;
    let details = metaObj.pendingActivationDetails || {};
    let draft = metaObj.pendingContractDraft || null;

    if (!payload && !draft) {
      await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL' });
      await this.enviarYLoguear(
        phone,
        `⚠️ No tienes ninguna activación en curso. Puedes enviar una foto de contrato o escribir *activar cliente [SN] [Folio-Nombre]* para iniciar.`,
        'ACTIVACION_TECNICO',
        'SIN_ACTIVACION_PENDIENTE',
        targetJid
      );
      return;
    }

    const lower = rawText.toLowerCase().trim();

    // 0. Comprobar cancelación explícita
    if (/^(no|cancelar|cancelo|rechazar|abortar|0)$/i.test(lower)) {
      metaObj.pendingActivation = null;
      metaObj.pendingActivationDetails = null;
      metaObj.pendingContractDraft = null;
      await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
        metadata: JSON.stringify(metaObj),
      });

      await this.enviarYLoguear(
        phone,
        `❌ *Activación cancelada.* No se realizaron modificaciones en la OLT.`,
        'ACTIVACION_TECNICO',
        'ACTIVACION_CANCELADA',
        targetJid
      );
      return;
    }

    // 0.1 Comprobar confirmación explícita
    if (/^(si|sí|confirmar|confirmo|adelante|autorizar|dale|ok|1|activar)$/i.test(lower)) {
      if (payload && payload.sn && payload.ip_address) {
        await this.procesarConfirmacionActivacionOnu(phone, session, targetJid, true);
        return;
      } else {
        await this.enviarYLoguear(
          phone,
          `⚠️ *Falta vincular el módem.*\n\nPor favor escribe los últimos dígitos del SN del equipo (ej: *474B4484* o *4484*) para autorizarlo.`,
          'ACTIVACION_TECNICO',
          'FALTA_SN_CONFIRMACION',
          targetJid
        );
        return;
      }
    }

    // Extraer valores actuales de payload o draft
    let currentFolio = '';
    let currentCustomerName = '';
    let currentZone = 'Actopan';
    let currentPlan = '40M';
    let currentAddress = '';
    let currentModel = 'EG8041V5';

    if (payload) {
      currentZone = payload.zone || 'Actopan';
      currentPlan = payload.download_speed_profile_name || '40M';
      currentModel = payload.onu_type || 'EG8041V5';
      if (payload.name) {
        const parts = payload.name.match(/^(\d{1,7})\s*[-_.\s]+\s*(.+)$/);
        if (parts) {
          currentFolio = parts[1].trim();
          currentCustomerName = parts[2].trim();
        } else if (/^\d{1,7}$/.test(payload.name.trim())) {
          currentFolio = payload.name.trim();
        } else {
          currentCustomerName = payload.name.trim();
        }
      }
    } else if (draft) {
      currentFolio = (draft.folio || '').trim();
      currentCustomerName = (draft.cliente || '').trim();
      currentZone = draft.zona || 'Actopan';
      currentPlan = draft.paquete || '40MB';
      currentAddress = draft.direccion || '';
      currentModel = draft.modelo || 'EG8041V5';
    }

    let modificado = false;
    let mensajeCambio = '';

    // 1. Detección de Serie / SN del módem
    // Formatos: "474B4484", "4484", "sn 474B4484", "serie 474B4484", "es el 474B4484", "HWTC474B4484", "686173B6"
    let detectedSn = '';
    const matchSnExplicit = rawText.match(/(?:cambiar|modificar|poner|ajustar|es\s+el|es|el|la)?\s*(?:serie|sn|sufijo|modem|módem|onu|equipo)\s*(?:a|en|es|:)?\s*([A-Za-z0-9]+)/i);
    const matchHexDirect = rawText.trim().match(/^(?:(?:es\s+(?:el\s+)?|el\s+)?(?:HWTC|ZTEG|48575443|5A544547)?|HWTC|ZTEG|48575443|5A544547)?([A-Fa-f0-9]{4,16})$/i);

    if (matchSnExplicit && !/(?:nombre|folio|zona|plan|paquete)/i.test(matchSnExplicit[1])) {
      detectedSn = matchSnExplicit[1].trim();
    } else if (matchHexDirect && !/^(?:si|no|ok|plan|zona|mega|megas|mb)$/i.test(rawText.trim())) {
      detectedSn = matchHexDirect[1].trim();
    }

    if (detectedSn) {
      let cleanSuffix = detectedSn.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanSuffix.startsWith('48575443')) cleanSuffix = 'HWTC' + cleanSuffix.substring(8);
      else if (cleanSuffix.startsWith('5A544547')) cleanSuffix = 'ZTEG' + cleanSuffix.substring(8);
      if (cleanSuffix.length > 6 && !cleanSuffix.startsWith('HWTC') && !cleanSuffix.startsWith('ZTEG')) {
        cleanSuffix = cleanSuffix.slice(-6);
      }

      await this.enviarYLoguear(
        phone,
        `🔍 Buscando módem con serie *${cleanSuffix}* en SmartOLT...`,
        'ACTIVACION_TECNICO',
        'BUSCANDO_ONU_MODIFICACION',
        targetJid
      );

      const unconfigured = await SmartOLTService.findUnconfiguredOnuBySnSuffix(cleanSuffix);

      if (unconfigured) {
        const isSanAgustin = currentZone.toLowerCase().includes('san agustin') ||
          String(unconfigured.olt_id) === '2' ||
          (unconfigured.olt_name || '').toLowerCase().includes('san agustin');

        const targetOltId = isSanAgustin ? '2' : '3';
        const targetOltName = isSanAgustin ? 'OLT-SanAgustin' : 'OLT5800-Actopan';
        const defaultVlan = isSanAgustin ? '800' : '510';

        let nextIp = await IpamService.getNextAvailableIp(defaultVlan, targetOltId);
        if (!nextIp) {
          nextIp = await IpamService.getNextAvailableIp(undefined, targetOltId);
        }

        if (nextIp) {
          const onuModel = SmartOLTService.normalizeOnuType(unconfigured.onu_type_name || unconfigured.onu_type, unconfigured.sn);
          const profiles = getSmartOltSpeedProfiles(currentPlan);
          const fullName = currentFolio
            ? (currentCustomerName ? `${currentFolio}-${currentCustomerName}` : `Folio-${currentFolio}`)
            : (currentCustomerName || 'Cliente-Nuevo');

          payload = {
            olt_id: unconfigured.olt_id || targetOltId,
            pon_type: unconfigured.pon_type || 'gpon',
            board: unconfigured.board,
            port: unconfigured.port,
            sn: unconfigured.sn,
            onu_type: onuModel,
            name: fullName,
            onu_mode: 'Routing',
            vlan: nextIp.vlan,
            ip_address: nextIp.ip,
            netmask: nextIp.netmask,
            gateway: nextIp.gateway,
            line_profile: 'VLAN mapping',
            download_speed_profile_name: profiles.down,
            upload_speed_profile_name: profiles.up,
            zone: currentZone,
            comment: `Activado vía Bot WhatsApp por técnico (${phone})`,
          };

          const signalText = unconfigured.onu_signal_1490 || unconfigured.onu_signal || 'Detectada';
          details = {
            snSuffix: unconfigured.sn.slice(-6),
            oltName: targetOltName,
            zone: currentZone,
            signal: signalText,
            model: onuModel,
          };

          draft = null;
          modificado = true;
          mensajeCambio += `• *Módem vinculado:* ${unconfigured.sn} (${onuModel}, Señal: ${signalText})\n• *IP asignada:* ${nextIp.ip} (VLAN ${nextIp.vlan})\n`;
        } else {
          mensajeCambio += `⚠️ No se encontraron IPs disponibles en la OLT ${targetOltName}.\n`;
        }
      } else {
        await this.enviarYLoguear(
          phone,
          `⚠️ *Módem no encontrado en SmartOLT*\n\nNo se localizó ninguna ONU sin configurar con serie/terminación *${cleanSuffix}*.\n\n💡 *Verifica:*\n1. Que el cable de fibra esté conectado (LED PON verde en el módem).\n2. Que el módem esté encendido.\n3. Reintenta escribiendo los dígitos correctos del SN (ej: *${cleanSuffix}*).`,
          'ACTIVACION_TECNICO',
          'ONU_NO_ENCONTRADA_MODIFICACION',
          targetJid
        );
        return;
      }
    }

    // 2. Modificar Nombre / Cliente (conserva el Folio intacto)
    const matchNombre = rawText.match(/(?:cambiar|modificar|poner|ajustar|el|corregir)?\s*(?:nombre|cliente)\s*(?:a|en|es|:)?\s*(.+)/i);
    if (matchNombre && !/(?:zona|plan|paquete|serie|sn|folio)/i.test(matchNombre[1])) {
      let rawNuevoNombre = matchNombre[1].trim();
      rawNuevoNombre = rawNuevoNombre.replace(/(?:y\s+)?folio\s*(?:a|en|es|:)?\s*[a-zA-Z0-9_-]+/i, '').trim();

      if (rawNuevoNombre) {
        const prefixMatch = rawNuevoNombre.match(/^(\d{1,7})\s*[-_.\s]+\s*(.+)$/);
        if (prefixMatch) {
          currentFolio = prefixMatch[1].trim();
          currentCustomerName = cleanPersonName(prefixMatch[2].trim());
        } else if (/^\d{1,7}$/.test(rawNuevoNombre)) {
          currentFolio = rawNuevoNombre;
        } else {
          currentCustomerName = cleanPersonName(rawNuevoNombre);
        }

        const fullUpdatedName = currentFolio
          ? (currentCustomerName ? `${currentFolio}-${currentCustomerName}` : `Folio-${currentFolio}`)
          : currentCustomerName;

        if (payload) {
          payload.name = fullUpdatedName;
        }
        if (draft) {
          draft.cliente = currentCustomerName;
          draft.folio = currentFolio || draft.folio;
        }

        modificado = true;
        mensajeCambio += `• *Nombre actualizado:* ${currentCustomerName}${currentFolio ? ` (Folio conservado: ${currentFolio})` : ''}\n`;
      }
    }

    // 3. Modificar Folio (conserva el Nombre del Cliente intacto)
    const matchFolio = rawText.match(/(?:cambiar|modificar|poner|ajustar|el|corregir)?\s*folio\s*(?:a|en|es|:)?\s*([a-zA-Z0-9_-]+)/i);
    if (matchFolio && !/(?:zona|plan|paquete|serie|sn|nombre)/i.test(matchFolio[1])) {
      const nuevoFolio = matchFolio[1].trim();
      currentFolio = nuevoFolio;

      const fullUpdatedName = currentCustomerName
        ? `${currentFolio}-${currentCustomerName}`
        : currentFolio;

      if (payload) {
        payload.name = fullUpdatedName;
      }
      if (draft) {
        draft.folio = currentFolio;
      }

      modificado = true;
      mensajeCambio += `• *Folio actualizado:* ${currentFolio}${currentCustomerName ? ` (Nombre conservado: ${currentCustomerName})` : ''}\n`;
    }

    // 4. Modificar Zona o Municipio
    const matchZona = rawText.match(/(?:cambiar|modificar|poner|ajustar|en|es\s+en)?\s*zona\s*(?:a|en|es|:)?\s*(.+)/i) ||
      (lower.includes('san jose') || lower.includes('san agustin') || lower.includes('actopan') || lower.includes('arenal') ? [rawText, rawText] : null);

    if (matchZona && !matchNombre && !matchFolio && !detectedSn) {
      const nuevaZona = this.resolverZonaOMunicipio(matchZona[1].trim());
      currentZone = nuevaZona;

      if (payload) {
        const isSanAgustin = nuevaZona.toLowerCase().includes('san agustin');
        const targetOltId = isSanAgustin ? '2' : '3';
        const targetOltName = isSanAgustin ? 'OLT-SanAgustin' : 'OLT5800-Actopan';

        let nextIp = await IpamService.getNextAvailableIp(isSanAgustin ? '800' : '510', targetOltId);
        if (!nextIp) {
          nextIp = await IpamService.getNextAvailableIp(undefined, targetOltId);
        }

        if (nextIp) {
          payload.zone = nuevaZona;
          payload.olt_id = targetOltId;
          payload.vlan = nextIp.vlan;
          payload.ip_address = nextIp.ip;
          payload.netmask = nextIp.netmask;
          payload.gateway = nextIp.gateway;
          details.zone = nuevaZona;
          details.oltName = targetOltName;
          modificado = true;
          mensajeCambio += `• *Zona/Municipio actualizado:* ${nuevaZona} (OLT: ${targetOltName}, IP: ${nextIp.ip})\n`;
        }
      } else if (draft) {
        draft.zona = nuevaZona;
        modificado = true;
        mensajeCambio += `• *Zona/Municipio actualizado:* ${nuevaZona}\n`;
      }
    }

    // 5. Modificar Plan / Paquete
    const matchPlan = rawText.match(/(?:cambiar|modificar|poner|ajustar)?\s*(?:paquete|plan|velocidad|megas)\s*(?:a|en|es|:)?\s*(\d+)/i) ||
      rawText.match(/^(\d+)\s*(?:megas|mb|m)\b/i);
    if (matchPlan) {
      const numMegas = matchPlan[1];
      const profiles = getSmartOltSpeedProfiles(`${numMegas}MB`);
      currentPlan = `${numMegas}MB`;

      if (payload) {
        payload.download_speed_profile_name = profiles.down;
        payload.upload_speed_profile_name = profiles.up;
      }
      if (draft) {
        draft.paquete = `${numMegas}MB`;
      }

      modificado = true;
      mensajeCambio += `• *Paquete actualizado:* ${numMegas} Megas (${profiles.down})\n`;
    }

    // 6. Fallback NLU con IA de Groq si el mensaje es conversacional y no encajó en regex
    if (!modificado && rawText.length >= 4) {
      const aiMod = await GroqService.extraerModificacionesActivacion(rawText);

      if (aiMod.cancelar) {
        metaObj.pendingActivation = null;
        metaObj.pendingActivationDetails = null;
        metaObj.pendingContractDraft = null;
        await TursoService.upsertSession({ phone, step: 'CONVERSACIONAL', metadata: JSON.stringify(metaObj) });
        await this.enviarYLoguear(phone, `❌ *Activación cancelada.*`, 'ACTIVACION_TECNICO', 'ACTIVACION_CANCELADA', targetJid);
        return;
      }

      if (aiMod.confirmar) {
        if (payload && payload.sn && payload.ip_address) {
          await this.procesarConfirmacionActivacionOnu(phone, session, targetJid, true);
          return;
        } else {
          await this.enviarYLoguear(phone, `⚠️ *Falta vincular el módem.*\nPor favor escribe los últimos dígitos del SN del equipo para autorizarlo.`, 'ACTIVACION_TECNICO', 'FALTA_SN', targetJid);
          return;
        }
      }

      if (aiMod.nuevo_nombre) {
        currentCustomerName = cleanPersonName(aiMod.nuevo_nombre);
        const fullUpdatedName = currentFolio ? `${currentFolio}-${currentCustomerName}` : currentCustomerName;
        if (payload) payload.name = fullUpdatedName;
        if (draft) draft.cliente = currentCustomerName;
        modificado = true;
        mensajeCambio += `• *Nombre actualizado:* ${currentCustomerName}\n`;
      }

      if (aiMod.nuevo_folio) {
        currentFolio = aiMod.nuevo_folio.trim();
        const fullUpdatedName = currentCustomerName ? `${currentFolio}-${currentCustomerName}` : currentFolio;
        if (payload) payload.name = fullUpdatedName;
        if (draft) draft.folio = currentFolio;
        modificado = true;
        mensajeCambio += `• *Folio actualizado:* ${currentFolio}\n`;
      }

      if (aiMod.nueva_zona) {
        const nuevaZona = this.resolverZonaOMunicipio(aiMod.nueva_zona);
        currentZone = nuevaZona;
        if (payload) payload.zone = nuevaZona;
        if (draft) draft.zona = nuevaZona;
        modificado = true;
        mensajeCambio += `• *Zona actualizada:* ${nuevaZona}\n`;
      }

      if (aiMod.nuevo_plan) {
        const megasMatch = aiMod.nuevo_plan.match(/\d+/);
        if (megasMatch) {
          const profiles = getSmartOltSpeedProfiles(`${megasMatch[0]}MB`);
          currentPlan = `${megasMatch[0]}MB`;
          if (payload) {
            payload.download_speed_profile_name = profiles.down;
            payload.upload_speed_profile_name = profiles.up;
          }
          if (draft) draft.paquete = currentPlan;
          modificado = true;
          mensajeCambio += `• *Paquete actualizado:* ${megasMatch[0]} Megas\n`;
        }
      }
    }

    // 7. Persistir y Mostrar Resumen Actualizado
    if (modificado) {
      metaObj.pendingActivation = payload;
      metaObj.pendingActivationDetails = details;
      metaObj.pendingContractDraft = draft;

      await TursoService.upsertSession({
        phone,
        step: 'PENDIENTE_CONFIRMACION_ACTIVACION_ONU',
        metadata: JSON.stringify(metaObj),
      });

      const planDisplay = currentPlan.replace(/MB-DOWN|MB|M/i, ' Megas');

      if (payload) {
        // Módem vinculado listo para autorizar
        const signalText = details.signal || 'Detectada';
        const cardMsg = `🔄 *DATOS MODIFICADOS CON ÉXITO:*
──────────────────────────────
${mensajeCambio}──────────────────────────────
📋 *RESUMEN DE ACTIVACIÓN:*
• *Cliente / Folio:* *${payload.name}*
• *Zona:* *${payload.zone}*
• *Paquete:* *${planDisplay}*
• *Serie (SN):* *${payload.sn}* (${payload.onu_type || 'EG8041V5'})
• *Nivel Óptico:* *${signalText}*
• *IP asignada:* *${payload.ip_address}* (VLAN ${payload.vlan})
──────────────────────────────
⚠️ *¿Confirmas la activación de este módem en SmartOLT?*

👉 Responde *SÍ* para autorizar o *NO* para cancelar.
_(O indica otro cambio si es necesario)_`;

        await this.enviarYLoguear(
          phone,
          cardMsg,
          'ACTIVACION_TECNICO',
          'DATOS_MODIFICADOS_CONFIRMACION',
          targetJid
        );
      } else if (draft) {
        // Borrador pendiente de serie (SN)
        const cardDraftMsg = `🔄 *DATOS ACTUALIZADOS:*
──────────────────────────────
${mensajeCambio}──────────────────────────────
📋 *BORRADOR DE CONTRATO:*
• *Folio:* *${draft.folio || 'N/A'}*
• *Cliente:* *${draft.cliente || 'Cliente'}*
• *Zona / Municipio:* *${draft.zona || 'Actopan'}*
• *Paquete:* *${planDisplay}*
• *Serie (SN):* ⚠️ _Pendiente de vincular_
──────────────────────────────
👉 *Escribe los últimos dígitos del SN del módem* (ej: *474B4484* o *4484*) para vincularlo.`;

        await this.enviarYLoguear(
          phone,
          cardDraftMsg,
          'ACTIVACION_TECNICO',
          'BORRADOR_ACTUALIZADO_PENDIENTE_SN',
          targetJid
        );
      }
    } else {
      await this.enviarYLoguear(
        phone,
        `⚠️ *No entendí qué dato deseas modificar.*\n\nPuedes escribir:\n• *[Dígitos SN]* (ej: *474B4484* o *4484*)\n• *cambiar folio [Folio]* (ej: *cambiar folio 2980*)\n• *cambiar nombre [Nombre]* (ej: *cambiar nombre Pedro Gomez*)\n• *cambiar zona [Zona/Municipio]* (ej: *cambiar zona El Arenal*)\n• *cambiar plan [Megas]* (ej: *cambiar plan 60 megas*)\n\nO responde *SÍ* para activar o *CANCELAR*.`,
        'ACTIVACION_TECNICO',
        'MODIFICACION_NO_RECONOCIDA',
        targetJid
      );
    }
  }

  /**
   * Saludo general del bot sin botones forzados
   */
  static async enviarMenuPrincipal(phone: string, clientName?: string | null): Promise<void> {
    const nombreLimpio = formatDisplayName(clientName, true);
    const saludo = nombreLimpio ? `¡Hola, *${nombreLimpio}*! 👋` : `¡Hola! 👋`;
    const texto = `${saludo} Bienvenido al centro de atención y soporte de *${this.getIspName()}*.\n\n¿En qué podemos ayudarte el día de hoy? Cuéntame tu duda o si presentas alguna falla con tu internet.`;

    await this.enviarYLoguear(phone, texto, 'SALUDO', 'SALUDO_ENVIADO');
    await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
  }
}
