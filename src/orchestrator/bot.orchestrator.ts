import { TursoService, Session } from '../services/turso.service';
import { GroqService, GroqClassificationResult, GroqImageAnalysisResult } from '../services/groq.service';
import { WispHubService, WispHubCliente } from '../services/wisphub.service';
import { SmartOLTService, SmartOltStatusResult } from '../services/smartolt.service';
import { EvolutionService, BotButton } from '../services/evolution.service';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax } from '../utils/spintax';
import { cleanPersonName } from '../utils/fuzzy-matcher';

const logger = new Logger('BotOrchestrator');

export interface IncomingMessageEvent {
  phone: string;
  remoteJid?: string;
  senderName?: string;
  text?: string;
  buttonId?: string;
  isMedia?: boolean;
  imageAnalysis?: GroqImageAnalysisResult | null;
}

export class BotOrchestrator {
  private static readonly MAIN_MENU_BUTTONS: BotButton[] = [
    { id: 'BTN_SALDO', title: '💳 Consultar Saldo' },
    { id: 'BTN_FALLA', title: '🔧 Reportar Falla' },
    { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
  ];

  private static humanTakeoverMap = new Map<string, number>();

  /**
   * Pausa las respuestas automáticas del bot para un número específico
   */
  static activarPausaOperador(phone: string, minutos: number = 60, razon?: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    const until = Date.now() + minutos * 60 * 1000;
    this.humanTakeoverMap.set(cleanPhone, until);
    logger.info(`[Human Takeover] Bot silenciado para ${cleanPhone} por ${minutos}m (${razon || 'Operador en WhatsApp'}).`);
  }

  /**
   * Reactiva el bot para un número específico
   */
  static reanudarBot(phone: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    this.humanTakeoverMap.delete(cleanPhone);
    logger.info(`[Human Takeover] Bot reactivado para ${cleanPhone}.`);
  }

  /**
   * Finaliza la intervención humana cuando el operador envía una despedida (ej. "buen día").
   * Quita la pausa y reinicia el estado de la sesión en Turso para que el siguiente mensaje empiece limpiamente desde 0.
   */
  static async finalizarIntervencionHumana(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    this.humanTakeoverMap.delete(cleanPhone);
    try {
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
      });
      logger.info(`[Human Takeover] Conversación finalizada por operador para ${cleanPhone}. Próximo mensaje iniciará desde 0.`);
    } catch (err: any) {
      logger.warn(`Error al finalizar intervención humana para ${cleanPhone}:`, err?.message || err);
    }
  }

  /**
   * Consulta si el bot está pausado para un número y cuántos minutos le restan
   */
  static estaBotPausado(phone: string): { pausado: boolean; minutosRestantes: number } {
    const cleanPhone = phone.replace(/\D/g, '');
    const until = this.humanTakeoverMap.get(cleanPhone);
    if (!until) return { pausado: false, minutosRestantes: 0 };
    const remainingMs = until - Date.now();
    if (remainingMs <= 0) {
      this.humanTakeoverMap.delete(cleanPhone);
      return { pausado: false, minutosRestantes: 0 };
    }
    return { pausado: true, minutosRestantes: Math.ceil(remainingMs / 60000) };
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
  private static getFichaBancaria(session: Session | null): string {
    const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', '');
    const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '');
    const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', '');
    const notes = SettingsService.get('PAYMENT_NOTES', 'PAYMENT_NOTES', '');
    const clientName = session?.client_name || 'tu nombre completo';

    let txt = `\n💳 *Datos de Pago y Transferencia Bancaria - ${this.getIspName()}*\n\n`;
    if (bank) txt += `• *Banco:* ${bank}\n`;
    if (account) txt += `• *Número de Cuenta / CLABE:* ${account}\n`;
    if (beneficiary) txt += `• *Titular / Beneficiario:* ${beneficiary}\n`;
    if (notes) txt += `• *Información adicional:* ${notes}\n`;

    if (!bank && !account) {
      txt += `• *Nota:* Puedes solicitar los datos bancarios vigentes con nuestro personal de cobranza.\n`;
    }

    txt += `\n📌 *CONCEPTO O MOTIVO DE PAGO:*`;
    txt += `\n👉 Por favor coloca tu nombre: *${clientName}*\n`;
    txt += `\n📸 *Importante al enviar tu comprobante:*`;
    txt += `\nUna vez realizada tu transferencia o pago, por favor envía la *foto o captura de pantalla de tu comprobante* y escribe tu *Nombre completo* aquí en el chat para validarlo y aplicarlo de inmediato en el sistema. ¡Muchas gracias!`;

    return txt;
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
    botones?: BotButton[]
  ): Promise<boolean> {
    const textoFinal = parseSpintax(mensaje);
    const dest = targetJid || phone;
    let ok = false;
    if (botones && botones.length > 0) {
      ok = await EvolutionService.enviarBotones(dest, textoFinal, botones);
    } else {
      ok = await EvolutionService.enviarTexto(dest, textoFinal);
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

    logger.info(`Procesando mensaje de ${phone} (Destino WhatsApp: ${targetJid}): "${rawText}"`);

    // 0. Si el bot está en pausa por intervención de un operador humano:
    const estadoPausa = this.estaBotPausado(phone);
    if (estadoPausa.pausado) {
      logger.info(`[Human Takeover] Bot en pausa para ${phone} (${estadoPausa.minutosRestantes}m restantes). Intervención humana activa.`);
      return;
    }

    // Registrar mensaje entrante en la auditoría de Turso
    const inputContent = rawText || (buttonId ? `[Botón: ${buttonId}]` : (event.isMedia ? '[Foto/Comprobante]' : '[Desconocido]'));
    await TursoService.logMessage(phone, 'IN', inputContent, null, 'MENSAJE_ENTRANTE');

    // 1. Obtener o inicializar sesión en Turso
    let session = await TursoService.getSession(phone);
    if (!session) {
      session = await TursoService.upsertSession({
        phone,
        step: 'CONVERSACIONAL',
      });
    }

    const lowerMsg = rawText.toLowerCase().trim();

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

    if (rawText.toUpperCase() === 'ACTIVAR') {
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

    // 2.1 CADUCIDAD POR INACTIVIDAD DE PASOS TÉCNICOS TEMPORALES (15 minutos):
    // Si pasaron más de 15 minutos sin responder una comprobación técnica, el paso caduca
    // para evitar que un "Hola" o "Quiero pagar" posterior genere reportes técnicos indebidos.
    const lastInteractionMs = session?.last_interaction ? new Date(session.last_interaction).getTime() : 0;
    const minutosInactividad = lastInteractionMs > 0 ? (Date.now() - lastInteractionMs) / (1000 * 60) : 9999;
    const pasosTemporales = [
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
    const esConsultaWifi = /\b(contrase[ñn]a|clave|wifi|wi-fi|ssid)\b/i.test(lowerMsg);

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

    // Si el cliente está respondiendo tras el reinicio remoto del módem
    if (session?.step === 'DIAGNOSTICO_POST_REINICIO') {
      await this.procesarPostReinicio(phone, rawText, event, session, targetJid);
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
      await this.procesarIdentificacion(phone, matchNombre[1].trim(), session, targetJid);
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
      await this.procesarIdentificacion(phone, nombreABuscar, session, targetJid);
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

        if (clasif.nombre_mencionado) {
          await this.procesarIdentificacion(phone, clasif.nombre_mencionado, session, targetJid);
          return;
        }

        // Si es un saludo o no dio su nombre, le solicitamos amablemente su nombre completo
        if (clasif.intencion === 'SALUDO' || clasif.intencion === 'DESCONOCIDO') {
          await this.enviarYLoguear(
            phone,
            `¡Hola! 👋 Bienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\nPara poder ubicar tu módem en nuestro sistema y verificar tu señal en tiempo real, ¿podrías indicarme tu *Nombre completo* tal como aparece en tu servicio?`,
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
          `Entendido tu reporte${queja}. Veo que presentas problemas con tu conexión.\n\nPara poder revisar los niveles de luz y señal de tu módem en nuestra central, ¿me indicas tu *Nombre completo* o número de contrato?`,
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

    // Si es una acción específica de telecomunicaciones (Niveles, Falla, Saldo, Reboot, Asesor, Wi-Fi, Mudanza/Cobertura, Agenda Cuadrilla)
    if (['CONSULTAR_NIVELES', 'FALLA_INTERNET', 'REINICIAR_MODEM', 'CONSULTAR_SALDO', 'REPORTAR_PAGO', 'HABLAR_HUMANO', 'CANCELAR_SUSCRIPCION', 'DATOS_WIFI', 'CAMBIO_DOMICILIO', 'ESTATUS_TECNICO_AGENDA'].includes(clasificacion.intencion)) {
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

        if (estadoFinanciero.suspendido || estadoFinanciero.totalDeuda > 0) {
          const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA');
          const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0000000000 00');
          const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());
          const montoTexto = estadoFinanciero.totalDeuda > 0
            ? `un saldo/recibo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*`
            : `tu servicio se encuentra suspendido por corte o inactividad`;

          const mensajeMoroso =
            `¡Hola, *${session.client_name}*! 👋\n\n` +
            `Revisé tu cuenta en nuestro sistema y detectamos que ${montoTexto}.\n\n` +
            `Para reactivar tu servicio y navegar con normalidad, por favor realiza tu abono a:\n` +
            `💳 *${bank}* | CLABE: *${account}*\n` +
            `Beneficiario: *${beneficiary}*\n` +
            `Concepto / Referencia: *${session.client_name || phone}*\n\n` +
            `📸 En cuanto realices tu pago, envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* por este chat para reactivarte de inmediato.`;

          await this.enviarYLoguear(phone, mensajeMoroso, 'CONSULTAR_SALDO', 'AVISO_SUSPENSION_SALUDO', targetJid);
          await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
          return;
        }
      } catch (err: any) {
        logger.warn('Error al verificar suspensión en mensaje conversacional:', err?.message || err);
      }
    }

    // 5. Si es saludo o conversación general y no está suspendido, respondemos de forma inteligente con Groq enriquecido
    const historial = await TursoService.getHistorialReciente(phone, 8);

    // Contexto enriquecido de SmartOLT si tiene ONU
    let infoOltContext = '';
    if (session?.onu_id) {
      const diag = await SmartOLTService.obtenerEstadoONU(session.onu_id);
      infoOltContext = `El cliente tiene la ONU ${session.onu_id}, estado en central: ${diag.status}, potencia: ${diag.opticalPowerDbm || 'N/A'} dBm.`;
    }

    logger.info(`Generando respuesta conversacional con Groq para ${phone}...`);
    const respuestaIA = await GroqService.generarRespuestaConversacional(rawText, historial, {
      clientName: session?.client_name,
      ispName: this.getIspName(),
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

      case 'REPORTAR_PAGO':
        await this.flujoReportarPago(phone, mensajeOriginal, event, session, targetJid);
        break;

      case 'FALLA_INTERNET':
        await this.flujoFallaInteligente(phone, c, session, targetJid);
        break;

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

    const nombre = session.client_name ? ` *${session.client_name}*` : '';
    const detalleQueja = c.resumen_queja || 'Falla o lentitud de internet';
    let meta: any = {};
    try { meta = JSON.parse(session.metadata || '{}'); } catch {}

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

      // CASO ESPECIAL: El cliente ya pagó y está al corriente, pero su servicio quedó inactivo o desincronizado en WispHub
      if (estadoFinanciero.yaPagoPeroNoActivo && (estadoFinanciero.cliente?.id || session.client_id)) {
        const idClienteWisp = estadoFinanciero.cliente?.id || session.client_id;
        logger.info(`Cliente ${phone} (${session.client_name}) ya pagó pero estaba inactivo. Reactivando automáticamente en WispHub (ID: ${idClienteWisp})...`);
        await WispHubService.activarServicioCliente(idClienteWisp!);

        await this.enviarYLoguear(
          phone,
          `Hola${nombre}, revisé tu servicio en nuestro sistema y confirmamos que tu cuenta se encuentra al corriente y sin ningún adeudo pendiente. 👍\n\n` +
          `Detectamos que tu línea estaba pendiente de sincronización en el servidor, por lo que acabamos de enviar la señal de activación a tu módem. En aproximadamente 1 a 2 minutos quedará restablecida tu navegación con normalidad.`,
          'FALLA_INTERNET',
          'AUTO_ACTIVACION_PAGADO',
          targetJid
        );
        await TursoService.updateStep(phone, 'CONVERSACIONAL');
        return;
      }

      if (estadoFinanciero.suspendido || estadoFinanciero.totalDeuda > 0) {
        logger.info(`Cliente ${phone} (${session.client_name}) presenta suspensión o adeudo en WispHub: Deuda=$${estadoFinanciero.totalDeuda} (${estadoFinanciero.motivo || 'Suspendido'})`);

        const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA');
        const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0000000000 00');
        const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());
        const montoTexto = estadoFinanciero.totalDeuda > 0
          ? `registras un recibo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*`
          : `tu servicio se encuentra suspendido por corte o inactividad`;

        const mensajeMoroso =
          `Hola${nombre}, revisé tu servicio en el sistema y detectamos que ${montoTexto}.\n\n` +
          `Para reactivar tu navegación de inmediato, por favor realiza tu pago a:\n` +
          `💳 *${bank}* | CLABE: *${account}*\n` +
          `Beneficiario: *${beneficiary}*\n` +
          `Concepto / Referencia: *${session.client_name || phone}*\n\n` +
          `📸 En cuanto realices tu abono, por favor envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* aquí en el chat para reactivarte de inmediato.`;

        await this.enviarYLoguear(phone, mensajeMoroso, 'CONSULTAR_SALDO', 'AVISO_MOROSIDAD_SILENCIOSA', targetJid);
        await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
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

    // CASO C: LÍNEA EN LÍNEA (ONLINE) O ESTADO NORMAL - DIAGNÓSTICO ESCALONADO CON TRIAGE
    const mensajeTriage =
      `Hola${nombre}, revisé tu línea aquí en el sistema y tu módem aparece conectado y con señal en nuestra central.\n\n` +
      `Para ayudarte a resolverlo de la forma más rápida y precisa:\n` +
      `¿La lentitud o problema te pasa en *todos tus aparatos (celulares, pantallas, computadoras)* o *solo en uno en específico*?`;

    await TursoService.upsertSession({
      phone,
      step: 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS',
      metadata: JSON.stringify({
        ...meta,
        resumenFalla: detalleQueja,
        onuIdParaReinicio: onuId,
      }),
    });

    await this.enviarYLoguear(phone, mensajeTriage, 'FALLA_INTERNET', 'DIAGNOSTICO_TRIAGE_DISPOSITIVOS', targetJid);
  }

  /**
   * Triage de falla técnica: Determina si el problema es en un solo equipo o generalizado.
   * Evita reinicios innecesarios si solo es un celular o pantalla individual.
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
        const nombre = session?.client_name ? ` *${session.client_name}*` : '';
        await this.enviarYLoguear(phone, `¡Hola${nombre}! 👋 ¿En qué te podemos ayudar?`, 'SALUDO', 'SALUDO_CORDIAL', targetJid);
      }
      return;
    }

    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}
    const nombre = session?.client_name ? ` *${session.client_name}*` : '';
    const onuId = session?.onu_id || meta.onuIdParaReinicio;

    const esUnSoloAparato = /\b(uno|solo\s*uno|un\s*solo|en\s*uno|un\s*celular|mi\s*cel|mi\s*tel[eé]fono|la\s*tele|la\s*pantalla|mi\s*lap|mi\s*compu|un\s*dispositivo|mi\s*pantalla|mi\s*computadora)\b/i.test(lower);
    const sonTodosLosAparatos = /\b(todo|todos|todas|en\s*todos|la\s*casa|ninguno|no\s*agarra\s*nada|ningun|en\s*ninguno|general|ambos|los\s*dos|los\s*3|los\s*tres)\b/i.test(lower);

    if (esUnSoloAparato && !sonTodosLosAparatos) {
      // Rama 1: Solo un aparato individual
      const mensajeUnDispositivo =
        `Entendido${nombre}. Como el detalle se presenta en un solo dispositivo, tu módem y la fibra óptica están funcionando bien hacia tu domicilio.\n\n` +
        `Por favor realiza estos 2 pasos rápidos:\n` +
        `1️⃣ *Apaga el Wi-Fi* en ese aparato durante 10 segundos y vuelve a encenderlo.\n` +
        `2️⃣ Acércate a unos pasos del módem para comprobar si la señal mejora.\n\n` +
        `¿Notaste mejoría tras hacer la prueba? *(Responde Sí o No)*`;

      await TursoService.upsertSession({
        phone,
        step: 'DIAGNOSTICO_COMPROBAR_UN_DISPOSITIVO',
        metadata: JSON.stringify({
          ...meta,
          triageAlcance: 'UN_DISPOSITIVO',
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
      `Entendido${nombre}. Dado que el detalle ocurre de manera general, acabo de enviar una señal para *reiniciar tu módem remotamente* y refrescar los canales de navegación.\n\n` +
      `⏳ En un par de minutos tu módem terminará de reiniciar.\n\n` +
      `Por favor prueba navegar nuevamente. ¿Cómo sientes la conexión? *(Responde "Ya quedó" o "Sigue igual")*`;

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
    const nombre = session?.client_name ? ` *${session.client_name}*` : '';
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

    // Si aún no funciona en el dispositivo individual, procedemos a reiniciar el módem
    if (onuId) {
      SmartOLTService.rebootONU(onuId).then(res => {
        logger.info(`Reinicio de ONU ${onuId} tras fallo en prueba individual para ${phone}: ${res.message}`);
      }).catch(err => {
        logger.warn(`Error al reiniciar ONU ${onuId}:`, err?.message || err);
      });
    }

    const mensajeReinicioEscalonado =
      `Enterado${nombre}. Enviaremos un reinicio completo a tu módem para renovar su enlace.\n\n` +
      `⏳ Tomará un par de minutos. Por favor pruébalo en cuanto vuelvan a fijarse las luces verdes.\n\n` +
      `¿Lograste navegar correctamente? *(Responde "Ya quedó" o "Sigue igual")*`;

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

    // Si sigue igual o con falla persistente -> Generar Ticket formal
    const outOfHours = this.isFueraDeHorario();
    const isMedia = event.isMedia === true;
    const hasSpeedtest = isMedia || lower.includes('speed') || lower.includes('test') || lower.includes('mbps');

    const ticket = await TursoService.createTicket({
      phone,
      client_name: session?.client_name,
      onu_id: session?.onu_id,
      issue_summary: meta.resumenFalla || rawText || 'Falla persistente tras reinicio de módem',
      checks_performed: `Triage completado. Módem reiniciado en central. Cliente reporta persistencia: "${rawText || (isMedia ? '[Foto/Captura]' : 'N/A')}"`,
      has_photo: isMedia ? 1 : 0,
      has_speedtest: hasSpeedtest ? 1 : 0,
      all_devices: meta.triageAlcance === 'TODOS_DISPOSITIVOS' ? 1 : 0,
      status: 'ABIERTO',
      is_out_of_hours: outOfHours ? 1 : 0,
    });

    if (session?.client_id) {
      await WispHubService.crearTicketSoporte(
        session.client_id,
        `Soporte Falla - ${ticket.folio}`,
        `Reporte persistente tras reinicio remoto. Folio local: ${ticket.folio}. Diagnóstico: ${ticket.checks_performed}`,
        'Media'
      ).catch(() => {});
    }

    const notaHorario = outOfHours ? '\n\n⏰ *Nota:* Tu reporte quedó registrado en el sistema y un técnico lo revisará mañana a primera hora con tu número de reporte.' : '';

    const mensajeTicket =
      `Enterado${nombre}. Como la falla continúa tras el reinicio, ya te generé tu reporte formal *#${ticket.folio}* para que el equipo de soporte técnico revise tu configuración en cabecera.${notaHorario}\n\n` +
      `📸 Por favor mándanos una *foto de las luces de tu módem* o una captura de tu prueba de velocidad (*Speedtest*) para adjuntarla de inmediato a tu folio técnico.`;

    await TursoService.upsertSession({
      phone,
      step: 'COMPROBACION_EVIDENCIA',
      metadata: JSON.stringify({
        ...meta,
        ticketFolio: ticket.folio,
      }),
    });

    await this.enviarYLoguear(phone, mensajeTicket, 'FALLA_INTERNET', `TICKET_GENERADO_POST_REINICIO_${ticket.folio}`, targetJid);
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

    const isMedia = event.isMedia === true;
    const hasSpeedtest = isMedia || lower.includes('speed') || lower.includes('test') || lower.includes('mbps');
    const allDevices = lower.includes('todo') || lower.includes('todos') || lower.includes('todas');
    const outOfHours = this.isFueraDeHorario();

    // Crear el ticket en Turso DB
    const ticket = await TursoService.createTicket({
      phone,
      client_name: session?.client_name,
      onu_id: session?.onu_id,
      issue_summary: meta.resumenFalla || rawText || 'Reporte de lentitud / falla de internet',
      checks_performed: `Módem reiniciado en central. Cable de fibra protegido. Cliente indicó: "${rawText || (isMedia ? '[Foto/Captura]' : 'N/A')}"`,
      has_photo: isMedia ? 1 : 0,
      has_speedtest: hasSpeedtest ? 1 : 0,
      all_devices: allDevices ? 1 : 0,
      status: 'ABIERTO',
      is_out_of_hours: outOfHours ? 1 : 0,
    });

    if (session?.client_id) {
      await WispHubService.crearTicketSoporte(
        session.client_id,
        `Soporte Técnico - ${ticket.folio}`,
        `Reporte: ${ticket.issue_summary}. Comprobaciones: ${ticket.checks_performed}`,
        'Media'
      ).catch(() => {});
    }

    const notaHorario = outOfHours ? '\n\n⏰ *Nota:* Tu reporte quedó registrado en el sistema y un técnico lo revisará mañana a primera hora con tu número de reporte.' : '';

    const mensajeTurno2 =
      `Enterado. Si después del reinicio sigue igual, por favor mándanos una foto de las luces de tu módem o captura de Speedtest.${notaHorario}\n\n` +
      `Ya te generé tu reporte *#${ticket.folio}* para que el personal técnico haga los ajustes necesarios en el sistema.`;

    await TursoService.upsertSession({
      phone,
      step: 'COMPROBACION_EVIDENCIA',
      metadata: JSON.stringify({
        ...meta,
        ticketFolio: ticket.folio,
      }),
    });

    await this.enviarYLoguear(phone, mensajeTurno2, 'FALLA_INTERNET', `TICKET_CREADO_${ticket.folio}`, targetJid);
  }

  /**
   * Recibe la foto del módem o captura de Speedtest y la vincula al ticket
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

    if (folio) {
      await TursoService.updateTicketStatus(
        folio,
        'ABIERTO',
        `Evidencia recibida: "${evidencia}"`
      );
    }

    await this.enviarYLoguear(
      phone,
      `¡Recibido! Ya adjunté la evidencia a tu reporte *#${folio || ''}*. El equipo técnico ya cuenta con todos los datos para realizar los ajustes. ¡Muchas gracias!`,
      'FALLA_INTERNET',
      `EVIDENCIA_ADJUNTADA_${folio}`,
      targetJid
    );

    await this.marcarConsultaFinalizada(phone, session);
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

    // 1. CASO SPEEDTEST / TEST DE VELOCIDAD
    if (analysis?.tipo === 'SPEEDTEST') {
      const bajada = analysis.speedtest?.bajada_mbps ? `${analysis.speedtest.bajada_mbps} Mbps` : 'detectada';
      const subida = analysis.speedtest?.subida_mbps ? `${analysis.speedtest.subida_mbps} Mbps` : 'N/A';
      const ping = analysis.speedtest?.ping_ms ? ` (Latencia: ${analysis.speedtest.ping_ms} ms)` : '';
      const folio = meta.ticketFolio;

      // Obtener plan contratado para comparar
      let planContratado = meta.speed_profile || '';
      if (!planContratado && session?.onu_id) {
        try {
          const onuInfo = await TursoService.getOnuById(session.onu_id);
          planContratado = onuInfo?.speed_profile || '';
        } catch {}
      }

      const planTexto = planContratado ? `\n• *Paquete contratado:* ${planContratado}` : '';

      // Comparación de megas si se detectó número
      const bajadaNum = analysis.speedtest?.bajada_mbps;
      const matchMegasPlan = planContratado.match(/(\d+)\s*(?:mbps|megas|m)/i);
      const planMegasNum = matchMegasPlan ? parseInt(matchMegasPlan[1], 10) : null;

      let diagnosticoVelocidad = '';
      if (bajadaNum && planMegasNum) {
        if (bajadaNum >= planMegasNum * 0.7) {
          diagnosticoVelocidad = `\n\n✅ Tu velocidad de *${bajada}* se encuentra dentro del rango óptimo de tu paquete contratado (*${planContratado}*). Si notas lentitud en algún equipo en particular, te sugerimos acercarte al módem o reconectar el Wi-Fi en ese dispositivo.`;
        } else {
          diagnosticoVelocidad = `\n\n⚠️ Tu velocidad de *${bajada}* se encuentra por debajo de tu paquete contratado (*${planContratado}*).`;
        }
      }

      if (folio) {
        await TursoService.updateTicketStatus(
          folio,
          'ABIERTO',
          `📊 Speedtest recibido: Bajada=${bajada}, Subida=${subida}${ping}. Plan=${planContratado || 'N/A'}`
        );

        const msj =
          `¡Recibí tu prueba de velocidad de Speedtest! 📊\n\n` +
          `• *Descarga (Download):* ${bajada}\n` +
          `• *Subida (Upload):* ${subida}${ping ? `\n• *Ping:* ${ping}` : ''}${planTexto}${diagnosticoVelocidad}\n\n` +
          `Ya adjunté esta medición a tu reporte *#${folio}*. El equipo de soporte técnico revisará el rendimiento de tu enlace. ¡Muchas gracias!`;

        await this.enviarYLoguear(phone, msj, 'FALLA_INTERNET', `SPEEDTEST_ADJUNTADO_${folio}`, targetJid);
        await this.marcarConsultaFinalizada(phone, session);
        return;
      }

      // Si no había ticket previo, creamos el reporte formal de velocidad
      const ticket = await TursoService.createTicket({
        phone,
        client_name: session?.client_name,
        onu_id: session?.onu_id,
        issue_summary: `Prueba de velocidad / Speedtest (${bajada} bajada / ${subida} subida vs plan ${planContratado || 'N/A'})`,
        checks_performed: `Captura de Speedtest recibida: Bajada=${bajada}, Subida=${subida}${ping}. Plan=${planContratado || 'N/A'}`,
        has_photo: 1,
        has_speedtest: 1,
        status: 'ABIERTO',
        is_out_of_hours: this.isFueraDeHorario() ? 1 : 0,
      });

      if (session?.client_id) {
        await WispHubService.crearTicketSoporte(
          session.client_id,
          `Speedtest - ${ticket.folio}`,
          `Prueba de velocidad enviada por cliente: Bajada=${bajada}, Subida=${subida}${ping}. Plan: ${planContratado || 'N/A'}. Folio: ${ticket.folio}`,
          'Media'
        ).catch(() => {});
      }

      const msj =
        `¡Recibí tu prueba de velocidad de Speedtest! 📊\n\n` +
        `• *Descarga:* ${bajada}\n` +
        `• *Subida:* ${subida}${ping ? `\n• *Ping:* ${ping}` : ''}${planTexto}${diagnosticoVelocidad}\n\n` +
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

    // 3. CASO COMPROBANTE DE PAGO (VALIDACIÓN EN PROCESO - CERO ACTIVACIÓN AUTOMÁTICA A CIEGAS)
    if (analysis?.tipo === 'COMPROBANTE_PAGO') {
      const datos = analysis.datos_pago;
      let detalle = '';
      if (datos?.banco) detalle += `\n• *Banco / Emisor:* ${datos.banco}`;
      if (datos?.monto) detalle += `\n• *Monto detectado:* ${datos.monto}`;
      if (datos?.referencia) detalle += `\n• *Folio / Ref:* ${datos.referencia}`;

      const msj =
        `¡Muchas gracias por tu comprobante! 📸 Hemos recibido la captura de tu pago${nombre}.${detalle}\n\n` +
        `⏳ *Validación en proceso:* Nuestro personal administrativo está corroborando el abono en el sistema y banco. En cuanto quede confirmada la transacción, se aplicará a tu cuenta y se restablecerá tu servicio. ¡Muchas gracias por tu paciencia!`;

      await this.enviarYLoguear(phone, msj, 'REPORTAR_PAGO', 'COMPROBANTE_VALIDADO_VISION', targetJid);
      await this.marcarConsultaFinalizada(phone, session);
      return;
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

      if (estadoFinanciero.yaPagoPeroNoActivo && (estadoFinanciero.cliente?.id || session?.client_id)) {
        const idClienteWisp = estadoFinanciero.cliente?.id || session?.client_id;
        logger.info(`Reinicio de módem: Cliente ${phone} ya pagó pero estaba inactivo. Reactivando en WispHub ID ${idClienteWisp}...`);
        await WispHubService.activarServicioCliente(idClienteWisp!);
      }

      if (estadoFinanciero.suspendido || estadoFinanciero.totalDeuda > 0) {
        logger.info(`Intento de reinicio bloqueado: Cliente ${phone} (${session?.client_name}) suspendido/adeudo en WispHub.`);
        const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA');
        const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '012 180 0000000000 00');
        const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', this.getIspName());
        const montoTexto = estadoFinanciero.totalDeuda > 0
          ? `registras un saldo pendiente por *$${estadoFinanciero.totalDeuda.toFixed(2)} MXN*`
          : `tu servicio se encuentra suspendido en el sistema`;

        const msj = `Hola${nombre}, revisé tu línea antes de proceder con el reinicio y detectamos que ${montoTexto}.\n\n` +
          `Para reactivar tu señal y navegar con normalidad, por favor realiza tu pago a:\n` +
          `💳 *${bank}* | CLABE: *${account}*\n` +
          `Beneficiario: *${beneficiary}*\n` +
          `Concepto: *${session?.client_name || phone}*\n\n` +
          `📸 En cuanto realices tu pago, por favor envía la *foto o captura de tu comprobante* y escribe tu *Nombre completo* en este chat para reactivar tu servicio.`;

        await this.enviarYLoguear(phone, msj, 'CONSULTAR_SALDO', 'REINICIO_BLOQUEADO_POR_SUSPENSION', targetJid);
        await TursoService.updateStep(phone, 'ESPERANDO_COMPROBANTE');
        return;
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

    if (estadoFinanciero.yaPagoPeroNoActivo && (estadoFinanciero.cliente?.id || session?.client_id)) {
      const idClienteWisp = estadoFinanciero.cliente?.id || session?.client_id;
      logger.info(`Consulta saldo: Cliente ${phone} ya pagó pero estaba inactivo. Reactivando automáticamente en WispHub ID ${idClienteWisp}...`);
      await WispHubService.activarServicioCliente(idClienteWisp!);

      await this.enviarYLoguear(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${session?.client_name || 'Cliente'}*, confirmamos que no tienes facturas pendientes de pago. 👍\n\n` +
        `Detectamos que tu línea estaba pendiente de reactivación en el servidor, por lo que acabamos de mandar la señal de reconexión a tu módem. En 1 a 2 minutos podrás navegar con normalidad.`,
        'CONSULTAR_SALDO',
        'AUTO_ACTIVACION_PAGADO_SALDO',
        targetJid
      );
      return;
    }

    const facturas = estadoFinanciero.facturas.length > 0
      ? estadoFinanciero.facturas
      : (session?.client_id ? await WispHubService.obtenerFacturasPendientes(session.client_id) : []);

    if (facturas.length === 0 && estadoFinanciero.totalDeuda === 0) {
      const ficha = this.getFichaBancaria(session);
      await this.enviarYLoguear(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${session?.client_name || 'Cliente'}*, no tienes facturas pendientes de pago en este momento. ¡Gracias por ser cliente de *${this.getIspName()}*!${ficha}`,
        'CONSULTAR_SALDO',
        'CUENTA_AL_CORRIENTE',
        targetJid
      );
      return;
    }

    let textoFacturas = `📋 *Estado de Cuenta - ${this.getIspName()}*\nCliente: *${session.client_name}*\n\n`;
    let totalAdeudo = 0;

    facturas.forEach((f, idx) => {
      totalAdeudo += f.monto;
      textoFacturas += `*Recibo #${idx + 1}*\n• Folio: ${f.folio}\n• Monto: *$${f.monto.toFixed(2)} MXN*\n• Vence: ${f.fecha_vencimiento}\n`;
      if (f.link_pago) {
        textoFacturas += `• Pagar en línea: ${f.link_pago}\n`;
      }
      textoFacturas += `\n`;
    });

    textoFacturas += `💰 *Total a pagar: $${totalAdeudo.toFixed(2)} MXN*\n`;
    textoFacturas += this.getFichaBancaria(session);

    await this.enviarYLoguear(phone, textoFacturas, 'CONSULTAR_SALDO', 'FACTURAS_PENDIENTES_ENVIADAS', targetJid);
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
    const cleanSearchTerm = cleanPersonName(rawInput) || rawInput;
    logger.info(`Buscando coincidencias para identificación de ${phone}: "${rawInput}" (Término limpio: "${cleanSearchTerm}")`);

    // 1. Intentar búsqueda flexible en Turso DB (Caché local de SmartOLT)
    try {
      const coincidenciasOlt = await TursoService.searchOnusFuzzy(cleanSearchTerm, 6);

      if (coincidenciasOlt.length > 0) {
        const mejorScore = coincidenciasOlt[0].matchScore;
        // Candidatos con score alto (>= 75) y cercanos al mejor score (dentro de 10 puntos de margen)
        const candidatosRelevantes = coincidenciasOlt.filter(
          c => c.matchScore >= 75 && c.matchScore >= (mejorScore - 10)
        );

        // CASO A: El cliente tiene 2 o más servicios registrados (o homónimos)
        if (candidatosRelevantes.length > 1) {
          const primerNombre = candidatosRelevantes[0].name;
          logger.info(`Se detectaron ${candidatosRelevantes.length} servicios para "${rawInput}". Solicitando selección al cliente.`);

          let mensajeOpciones = `¡Hola, *${primerNombre}*! 👋 Detectamos que tienes *${candidatosRelevantes.length} servicios* registrados en nuestro sistema:\n\n`;

          candidatosRelevantes.slice(0, 5).forEach((c, idx) => {
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
              registeredServices: candidatosRelevantes.slice(0, 5).map(c => ({
                unique_external_id: c.unique_external_id,
                sn: c.sn,
                name: c.name,
                speed_profile: c.speed_profile,
                zone_name: c.zone_name,
                address: c.address,
              })),
              pendingServices: candidatosRelevantes.slice(0, 5).map(c => ({
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

        // CASO B: Coincidencia única sólida
        const mejor = candidatosRelevantes[0] || coincidenciasOlt[0];
        if (mejor.matchScore >= 75 || (coincidenciasOlt.length === 1 && mejor.matchScore >= 70)) {
          let metaPre: any = {};
          try { metaPre = JSON.parse(session?.metadata || '{}'); } catch {}

          const meta = {
            ...metaPre,
            speed_profile: mejor.speed_profile,
            zone: mejor.zone_name,
            address: mejor.address,
            sn: mejor.sn,
          };

          const sessionActualizada = await TursoService.upsertSession({
            phone,
            client_id: mejor.unique_external_id,
            service_id: mejor.sn,
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
      logger.warn(`Error al consultar SmartOLT en Turso durante identificación:`, err?.message || err);
    }

    // 2. Intentar buscar en WispHub como alternativa de facturación
    try {
      const coincidencias = await WispHubService.buscarClientePorNombre(rawInput);

      if (coincidencias.length === 1) {
        const c = coincidencias[0];
        let metaPre: any = {};
        try { metaPre = JSON.parse(session?.metadata || '{}'); } catch {}

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

    // 2. Si no hubo coincidencia en WispHub, verificar con Groq si el usuario expresó una intención en lugar de su nombre
    const clasificacion = await GroqService.clasificarMensaje(rawInput, {
      clientName: null,
      currentStep: 'ESPERANDO_IDENTIFICACION',
    });

    // Si el usuario dijo "no tengo internet", "cuanto debo", etc., NO lo forzamos a identificarse, lo atendemos
    if (clasificacion.intencion !== 'IDENTIFICAR_CLIENTE' && clasificacion.intencion !== 'DESCONOCIDO') {
      logger.info(`El usuario envió la intención "${clasificacion.intencion}" en lugar de un nombre. Ejecutando intención directamente.`);
      await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
      await this.ejecutarIntencion(phone, clasificacion, session, rawInput);
      return;
    }

    // 3. Extraer y limpiar el nombre (incluso si dijo "me llamo Juan", "soy Carlos", o simplemente "Maria")
    let nombreLimpio = clasificacion.nombre_mencionado || cleanPersonName(rawInput) || rawInput;
    nombreLimpio = cleanPersonName(nombreLimpio)
      .replace(/^(me llamo|soy|mi nombre es|mi nombre|nombre:?)\s+/i, '')
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalizar palabras
    if (nombreLimpio.length >= 2) {
      nombreLimpio = nombreLimpio
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Si tiene un formato de nombre creíble (2 a 45 caracteres)
    if (nombreLimpio.length >= 2 && nombreLimpio.length <= 45) {
      let metaPre: any = {};
      try { metaPre = JSON.parse(session?.metadata || '{}'); } catch {}

      const sessionActualizada = await TursoService.upsertSession({
        phone,
        client_name: nombreLimpio,
        metadata: JSON.stringify(metaPre),
        step: 'IDENTIFICADO',
      });

      await this.finalizarIdentificacionYContinuarFlujo(phone, sessionActualizada, metaPre, targetJid);
      return;
    }

    // 4. Si lo escrito es incomprensible, no nos quedamos en bucle: avanzamos al problema amablemente
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

    const nombre = session.client_name || 'Cliente';
    const planTexto = meta.speed_profile ? `\n📦 *Plan:* ${meta.speed_profile}` : '';
    const zonaTexto = meta.address || meta.zone ? `\n📍 *Ubicación:* ${meta.address || meta.zone}` : '';

    const initialQuery = meta.initialQuery;
    const initialIntent = meta.initialIntent;
    const initialClasif = meta.initialClasif;
    const quejaTexto = meta.resumen_queja || (typeof initialQuery === 'string' ? initialQuery : '');

    // Si el usuario reportó un problema o intención antes de identificarse (ej. "esta lento mi internet", "cuanto debo", etc.)
    if (initialIntent && !['SALUDO', 'IDENTIFICAR_CLIENTE', 'DESCONOCIDO'].includes(initialIntent)) {
      logger.info(`[Auto-Continuación] Cliente ${phone} (${nombre}) identificado. Continuando con reporte previo: "${initialIntent}" ("${initialQuery}")`);

      await this.enviarYLoguear(
        phone,
        `¡Perfecto, te he ubicado en nuestro sistema! ✅\nBienvenido(a) *${nombre}*.${planTexto}${zonaTexto}\n\nCon respecto a tu reporte sobre *"${quejaTexto || 'tu conexión'}"*, ya estoy revisando tu servicio en tiempo real en nuestra central...`,
        'IDENTIFICAR_CLIENTE',
        'VINCULADO_Y_CONTINUANDO_REPORTE',
        targetJid
      );

      const clasifAEjecutar = initialClasif || {
        intencion: initialIntent,
        resumen_queja: quejaTexto,
        confianza: 0.95,
      };

      await this.ejecutarIntencion(phone, clasifAEjecutar, session, initialQuery || 'Reporte inicial', targetJid);
      return;
    }

    // Si el usuario no tenía reporte previo (solo saludó o se identificó)
    await this.enviarYLoguear(
      phone,
      `¡Perfecto, te he ubicado en nuestro sistema! ✅\nBienvenido(a) *${nombre}*.${planTexto}${zonaTexto}\n\nCuéntame, ¿cuál es el detalle o falla que presentas con tu servicio de internet?`,
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
   * Saludo general del bot sin botones forzados
   */
  static async enviarMenuPrincipal(phone: string, clientName?: string | null): Promise<void> {
    const saludo = clientName ? `¡Hola, *${clientName}*! 👋` : `¡Hola! 👋`;
    const texto = `${saludo} Bienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\n¿En qué podemos ayudarte el día de hoy? Cuéntame tu duda o si presentas alguna falla con tu internet.`;

    await this.enviarYLoguear(phone, texto, 'SALUDO', 'SALUDO_ENVIADO');
    await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
  }
}
