import { TursoService, Session } from '../services/turso.service';
import { GroqService, GroqClassificationResult } from '../services/groq.service';
import { WispHubService, WispHubCliente } from '../services/wisphub.service';
import { SmartOLTService } from '../services/smartolt.service';
import { EvolutionService, BotButton } from '../services/evolution.service';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { Logger } from '../utils/logger';
import { parseSpintax } from '../utils/spintax';

const logger = new Logger('BotOrchestrator');

export interface IncomingMessageEvent {
  phone: string;
  remoteJid?: string;
  senderName?: string;
  text?: string;
  buttonId?: string;
  isMedia?: boolean;
}

export class BotOrchestrator {
  private static readonly MAIN_MENU_BUTTONS: BotButton[] = [
    { id: 'BTN_SALDO', title: '💳 Consultar Saldo' },
    { id: 'BTN_FALLA', title: '🔧 Reportar Falla' },
    { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
  ];

  private static getIspName(): string {
    return SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name);
  }

  /**
   * Determina si la hora actual está fuera del horario laboral de oficina (por defecto 9:00 AM a 6:00 PM)
   */
  private static isFueraDeHorario(): boolean {
    try {
      const startStr = SettingsService.get('WORK_HOURS_START', 'WORK_HOURS_START', '09:00');
      const endStr = SettingsService.get('WORK_HOURS_END', 'WORK_HOURS_END', '18:00');
      const [startH, startM] = startStr.split(':').map(n => parseInt(n, 10));
      const [endH, endM] = endStr.split(':').map(n => parseInt(n, 10));

      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();

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
    txt += `\n📸 *Sugerencia importante:*`;
    txt += `\nUna vez realizada tu transferencia o pago, por favor envía la *captura de pantalla o foto de tu comprobante* con tu nombre visible en este mismo chat para validarlo de inmediato en el sistema. ¡Muchas gracias!`;

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

    // Si el cliente está en espera de responder a las comprobaciones guiadas de soporte técnico
    if (session?.step === 'COMPROBACION_SOPORTE') {
      await this.procesarRespuestaComprobacion(phone, rawText, event, session, targetJid);
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
    const lowerMsg = rawText.toLowerCase().trim();
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

    // Si el cliente envía despedida o agradecimiento, cerramos la consulta actual
    const despedidas = ['gracias', 'muchas gracias', 'todo bien', 'ya quedo', 'ya quedó', 'listo gracias', 'excelente gracias', 'muchas gracias por la ayuda', 'todo bien gracias'];
    if (despedidas.some(d => lowerMsg === d || lowerMsg.startsWith(d))) {
      await this.marcarConsultaFinalizada(phone, session);
      await this.enviarYLoguear(
        phone,
        `¡Con mucho gusto! 😊 En *${this.getIspName()}* estamos siempre para servirte. Si llegas a necesitar apoyo con cualquiera de tus servicios, solo escríbenos nuevamente. ¡Que tengas un excelente día!`,
        'DESPEDIDA',
        'CONSULTA_CERRADA_SATISFACTORIA',
        targetJid
      );
      return;
    }

    // Evaluar metadatos y tiempo de inactividad de la sesión existente
    let metaObj: any = {};
    try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}

    const lastInteractionMs = session?.last_interaction ? new Date(session.last_interaction).getTime() : 0;
    const minutosInactividad = lastInteractionMs > 0 ? (Date.now() - lastInteractionMs) / (1000 * 60) : 9999;

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

        // Si reporta falla directamente sin estar registrado, le pedimos el nombre para ubicar su línea
        if (clasif.intencion === 'FALLA_INTERNET') {
          const queja = clasif.resumen_queja ? ` sobre: _"${clasif.resumen_queja}"_` : '';
          await this.enviarYLoguear(
            phone,
            `Entendido tu reporte${queja}. Veo que presentas problemas con tu conexión.\n\nPara poder revisar los niveles de luz y señal de tu módem en nuestra central, ¿me indicas tu *Nombre completo* o número de contrato?`,
            'FALLA_INTERNET',
            'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
            targetJid
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
          return;
        }
      }
    }

    // 3. Cliente ya conocido / identificado: Clasificamos con Groq para ejecutar acciones en SmartOLT / WispHub
    const clasificacion = await GroqService.clasificarMensaje(rawText, {
      clientName: session?.client_name,
      currentStep: session?.step,
    });

    logger.info(`Intención detectada para ${phone}: ${clasificacion.intencion} (Resumen: "${clasificacion.resumen_queja}")`);

    // Si es una acción específica de telecomunicaciones (Niveles, Falla, Saldo, Reboot, Asesor)
    if (['CONSULTAR_NIVELES', 'FALLA_INTERNET', 'REINICIAR_MODEM', 'CONSULTAR_SALDO', 'REPORTAR_PAGO', 'HABLAR_HUMANO', 'CANCELAR_SUSCRIPCION'].includes(clasificacion.intencion)) {
      await this.ejecutarIntencion(phone, clasificacion, session, rawText, targetJid, event);
      return;
    }

    // 4. Si es saludo o conversación general, respondemos de forma inteligente con Groq enriquecido
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
   * Flujo de Asistencia y Comprobaciones Técnicas Amigables
   * Recopila información del cliente (módem encendido, luces, prueba multidispositivo, fotos y speedtest)
   * sin permitir manipulaciones complejas de red ni solicitar datos técnicos confusos.
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
        `Entendido tu reporte${queja}. Veo que presentas inconvenientes con tu conexión de internet.\n\nPara poder verificar tu línea y asignarte asistencia técnica personalizada, ¿podrías indicarme tu *Nombre completo* o número de contrato?`,
        'FALLA_INTERNET',
        'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    // Cliente identificado: Enviamos el mensaje amigable de comprobación guiada
    const nombre = session.client_name ? ` *${session.client_name}*` : '';
    const detalleQueja = c.resumen_queja ? ` sobre: _"${c.resumen_queja}"_` : '';

    const mensajeComprobacion = 
      `🛠️ *Asistencia Técnica de ${this.getIspName()}*\n\n` +
      `Hola${nombre}, lamentamos el inconveniente con tu servicio${detalleQueja}. Para que nuestro personal técnico pueda revisar tu línea en la central y realizar los ajustes correspondientes, por favor apóyanos con estas comprobaciones:\n\n` +
      `1️⃣ *Alimentación y Luces del Módem:*\n` +
      `• Verifica que el módem esté encendido y bien conectado a la toma de corriente eléctrica.\n` +
      `• Observa que las luces (LEDs) frontales estén encendidas y no parpadeen de forma anormal ni esté encendido un foco rojo de alarma.\n` +
      `⚠️ *ADVERTENCIA MUY IMPORTANTE:* Por favor *NO muevas, jales ni desconectes el cable delgado de internet / fibra óptica*, ya que es sumamente delicado y puede romperse o descomponerse.\n\n` +
      `2️⃣ *Prueba de Red y Dispositivos:*\n` +
      `• ¿El problema ocurre en *todos los dispositivos* de tu casa o solo en *uno en específico* (ej. solo en tu celular o televisión)?\n` +
      `• Si puedes, por favor envíanos por este chat:\n` +
      `  📸 Una *foto de las luces de tu módem*.\n` +
      `  🚀 Una *captura de pantalla de tu prueba en speedtest.net* (de preferencia conectado cerca del módem).\n\n` +
      `_Por favor responde a estas preguntas por aquí para que el personal revise tu caso y realice los ajustes necesarios en el sistema._`;

    let meta: any = {};
    try { meta = JSON.parse(session.metadata || '{}'); } catch {}

    await TursoService.upsertSession({
      phone,
      step: 'COMPROBACION_SOPORTE',
      metadata: JSON.stringify({
        ...meta,
        resumenFalla: c.resumen_queja || 'Falla o lentitud de internet',
        comprobacionIniciada: new Date().toISOString(),
      }),
    });

    await this.enviarYLoguear(
      phone,
      mensajeComprobacion,
      'FALLA_INTERNET',
      'COMPROBACION_GUIADA_ENVIADA',
      targetJid
    );
  }

  /**
   * Procesa la respuesta o evidencia enviada por el cliente durante las comprobaciones guiadas
   * y genera el Ticket en Turso DB para que el personal realice ajustes manuales en SmartOLT.
   */
  private static async procesarRespuestaComprobacion(
    phone: string,
    rawText: string,
    event: IncomingMessageEvent,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    let meta: any = {};
    try { meta = JSON.parse(session?.metadata || '{}'); } catch {}

    const isMedia = event.isMedia === true;
    const lower = rawText.toLowerCase();
    const hasSpeedtest = isMedia || lower.includes('speed') || lower.includes('test') || lower.includes('mbps');
    const allDevices = lower.includes('todo') || lower.includes('todos') || lower.includes('todas');
    const outOfHours = this.isFueraDeHorario();

    // Crear el ticket en Turso DB
    const ticket = await TursoService.createTicket({
      phone,
      client_name: session?.client_name,
      onu_id: session?.onu_id,
      issue_summary: meta.resumenFalla || rawText || 'Reporte de lentitud / falla de internet',
      checks_performed: `Módem y LEDs revisados. Advertencia de fibra emitida. Cliente respondió: "${rawText || (isMedia ? '[Foto/Comprobante enviado]' : 'N/A')}"`,
      has_photo: isMedia ? 1 : 0,
      has_speedtest: hasSpeedtest ? 1 : 0,
      all_devices: allDevices ? 1 : 0,
      status: 'ABIERTO',
      is_out_of_hours: outOfHours ? 1 : 0,
    });

    // Crear ticket en WispHub como respaldo adicional si hay cliente vinculado
    if (session?.client_id) {
      await WispHubService.crearTicketSoporte(
        session.client_id,
        `Soporte Técnico - ${ticket.folio}`,
        `Ticket generado: ${ticket.issue_summary}. Comprobaciones: ${ticket.checks_performed}`,
        'Media'
      ).catch(() => {});
    }

    if (outOfHours) {
      await this.enviarYLoguear(
        phone,
        `🎫 *Reporte Técnico Agendado (#${ticket.folio})*\n\n` +
        `¡Muchas gracias por tus comprobaciones y datos! Hemos registrado tu reporte técnico en nuestro sistema.\n\n` +
        `⏰ *Horario de Atención de Oficina y Central:*\n` +
        `Nuestro personal inicia turno a partir de las *9:00 AM*. Tu caso ha quedado agendado en nuestro panel con máxima prioridad para que a primera hora el personal revise tu línea y realice los ajustes manuales necesarios en la central / SmartOLT.\n\n` +
        `En cuanto concluyan las configuraciones, te notificaremos por este mismo chat para que hagas tus comprobaciones de navegación.\n\n` +
        `💡 _Nota: Si gustas probar mientras tanto, puedes escribir *REINICIAR* para mandar un comando de reinicio remoto a tu módem._`,
        'FALLA_INTERNET',
        `TICKET_FUERA_HORARIO_${ticket.folio}`,
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `🎫 *Reporte Técnico Generado (#${ticket.folio})*\n\n` +
        `¡Muchas gracias por las comprobaciones! Hemos generado tu reporte técnico con el folio *#${ticket.folio}*.\n\n` +
        `🛠️ Nuestro personal técnico revisará tu línea directamente en la central para realizar las modificaciones necesarias en el sistema. Te informaremos en cuanto concluyan para que compruebes tu navegación.\n\n` +
        `💡 _Nota: Si deseas refrescar tu módem mientras el personal revisa tu caso, puedes escribir *REINICIAR* para enviar un comando de reinicio remoto._`,
        'FALLA_INTERNET',
        `TICKET_CREADO_${ticket.folio}`,
        targetJid
      );
    }

    await this.marcarConsultaFinalizada(phone, session);
  }

  /**
   * Diagnóstico general de niveles y estado físico de la conexión con SmartOLT
   */
  private static async flujoReportarFalla(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    const onuId = session?.onu_id || (session?.client_id ? `ONU-${session.client_id}` : 'ONU-DEFAULT');

    await this.enviarYLoguear(phone, `🔍 Diagnosticando el estado de tu conexión en tiempo real...`, 'DIAGNOSTICO', 'INICIANDO_SCAN', targetJid);

    const estadoOnu = await SmartOLTService.obtenerEstadoONU(onuId);
    logger.info(`Diagnóstico SmartOLT para ${phone} (ONU: ${onuId}): ${estadoOnu.status}`);

    if (estadoOnu.status === 'LOS') {
      const ticket = await WispHubService.crearTicketSoporte(
        session?.client_id || 'PENDIENTE',
        'Corte de Fibra Óptica (SmartOLT LOS)',
        'SmartOLT reporta Loss of Signal (LOS). Fibra rota o desconectada.',
        'Alta'
      );

      await this.enviarYLoguear(
        phone,
        `🔴 *Falla Física Detectada (Fibra Dañada / Foco Rojo):*\n\nLa central detecta corte total de señal óptica en tu domicilio (LOS).\n\n🎫 *Ticket generado:* *#${ticket.folio}*\nNuestros técnicos en campo ya han sido notificados para la reparación.\n\n⚠️ Por favor verifica que el cable delgado de fibra no esté doblado ni desconectado.`,
        'FALLA_INTERNET',
        `TICKET_SMARTOLT_LOS_${ticket.folio}`,
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    if (estadoOnu.status === 'POWER_FAIL') {
      await this.enviarYLoguear(
        phone,
        `⚡ *Falla de Alimentación (Módem Sin Luz / Apagado):*\n\nLa central SmartOLT detecta que tu módem no recibe energía eléctrica (Dying Gasp).\n\n🔌 Por favor verifica:\n1. Que el eliminador negro esté bien conectado a la toma de corriente.\n2. Que el botón de encendido trasero esté presionado.\n\nSi la luz ya volvió pero tu módem sigue sin encender, escribe *ASESOR*.`,
        'FALLA_INTERNET',
        'SMARTOLT_POWER_FAIL',
        targetJid
      );
      return;
    }

    if (estadoOnu.status === 'ONLINE') {
      let metaObj: any = {};
      try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
      const planTexto = metaObj.speed_profile ? `\n📦 *Plan contratado:* ${metaObj.speed_profile}` : '';
      const estadoLinea = '\n📶 *Estado de la línea:* Óptimo y estable (señal normal)';

      await this.enviarYLoguear(
        phone,
        `🟢 *Tu módem se encuentra en línea y sincronizado con la central.*${planTexto}${estadoLinea}\n\nSi experimentas lentitud o páginas que no abren:\n• Escribe *REINICIAR* para refrescar tu módem remotamente.\n• O escribe *ASESOR* para comunicarte con un técnico humano.`,
        'FALLA_INTERNET',
        'SMARTOLT_ONLINE',
        targetJid
      );
      return;
    }

    // Fallback general (Offline / Desconectado)
    await this.enviarYLoguear(
      phone,
      `⚠️ La central reporta que tu equipo se encuentra desconectado (Offline).\n\nPor favor verifica que el módem esté encendido. Si deseas que enviemos un comando de reinicio escribe *REINICIAR*, o escribe *ASESOR* para que te atienda un técnico de *${this.getIspName()}*.`,
      'FALLA_INTERNET',
      'SMARTOLT_FALLBACK_TEXTO',
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

    if (!onuId) {
      await this.enviarYLoguear(
        phone,
        `Para verificar el estado de tu señal en la central, por favor indícame tu *Nombre completo* o número de contrato:`,
        'CONSULTAR_NIVELES',
        'SOLICITAR_IDENTIFICACION_NIVELES',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    await this.enviarYLoguear(phone, `🔍 Verificando la estabilidad de tu línea con la central...`, 'DIAGNOSTICO', 'INICIANDO_SCAN_NIVELES', targetJid);

    const estadoOnu = await SmartOLTService.obtenerEstadoONU(onuId);

    // Registro interno técnico con métricas reales completas para diagnóstico del ISP
    logger.info(`[NOC-DIAGNOSTICO-INTERNO] Niveles para ${phone} (ONU: ${onuId}): Status=${estadoOnu.status}, RX=${estadoOnu.opticalPowerDbm} dBm`);

    if (estadoOnu.status === 'LOS') {
      const ticket = await WispHubService.crearTicketSoporte(
        session?.client_id || 'PENDIENTE',
        'Corte de Fibra Óptica (SmartOLT LOS)',
        `SmartOLT reporta LOS (Loss of Signal). Potencia: ${estadoOnu.opticalPowerDbm || 'Sin luz'}. Falla física en acometida.`,
        'Alta'
      );
      await this.enviarYLoguear(
        phone,
        `🔴 *Alerta en tu Línea de Fibra:*\n\nDetectamos una interrupción en la señal óptica de tu domicilio (corte de cable o conector flojo).\n\n🎫 *Reporte técnico generado:* *#${ticket.folio}*\nNuestra cuadrilla técnica ha sido notificada para la reparación física.\n\n⚠️ Por favor verifica que el cable delgado de fibra óptica que entra a tu módem no esté desconectado ni doblado.`,
        'CONSULTAR_NIVELES',
        `TICKET_FIBRA_CORTADA_${ticket.folio}`,
        targetJid
      );
      await this.marcarConsultaFinalizada(phone, session);
      return;
    }

    if (estadoOnu.status === 'POWER_FAIL') {
      await this.enviarYLoguear(
        phone,
        `⚡ *Falla de Alimentación Eléctrica:*\n\nLa central detecta que tu módem no está recibiendo energía eléctrica.\n\n🔌 Por favor verifica:\n1. Que el eliminador negro esté firmemente conectado a la toma de corriente.\n2. Que el botón trasero de encendido (ON/OFF) esté presionado.\n\nSi la energía ya regresó y tu equipo no enciende, escribe *ASESOR*.`,
        'CONSULTAR_NIVELES',
        'SMARTOLT_POWER_FAIL',
        targetJid
      );
      return;
    }

    if (estadoOnu.status === 'ONLINE') {
      let metaObj: any = {};
      try { metaObj = JSON.parse(session?.metadata || '{}'); } catch {}
      const planTexto = metaObj.speed_profile ? `\n📦 *Plan:* ${metaObj.speed_profile}` : '';
      const ubicacionTexto = metaObj.address || metaObj.zone ? `\n📍 *Ubicación:* ${metaObj.address || metaObj.zone}` : '';

      // Evaluamos internamente la potencia SIN exponer el número dBm al cliente
      const dbm = estadoOnu.opticalPowerDbm;
      let estadoSenal = 'Óptima y estable ✅';
      let detalleSenal = 'Tu línea de fibra óptica se encuentra sincronizada con la central en un rango óptimo de calidad, sin pérdidas de señal en tu domicilio.';

      if (dbm !== null && dbm !== undefined && dbm < -27) {
        estadoSenal = 'En observación preventiva ⚠️';
        detalleSenal = 'Tu equipo está conectado, aunque registramos una ligera variación en la señal de tu sector. Ya ha sido canalizado a nuestra área de ingeniería para su ajuste preventivo.';
      }

      await this.enviarYLoguear(
        phone,
        `📶 *Estado de tu Conexión en Central:*\n• Estado: *${estadoSenal}*${planTexto}${ubicacionTexto}\n\n${detalleSenal}\n\n💡 _(Nota: Las métricas numéricas detalladas en dBm son de uso reservado para diagnóstico técnico de la central de ${this.getIspName()})._\n\nSi experimentas lentitud o deseas refrescar tu módem:\n• Escribe *REINICIAR* para enviar un reinicio remoto.\n• O escribe *ASESOR* para hablar con un técnico humano.`,
        'CONSULTAR_NIVELES',
        'NIVELES_INFORMADOS_COMERCIAL',
        targetJid
      );
      return;
    }

    // Si está Offline
    await this.enviarYLoguear(
      phone,
      `⚠️ *Módem Desconectado (Offline):*\n\nLa central no recibe señal de tu equipo en este momento. Por favor verifica que el módem esté encendido con sus luces frontales activas.\n\nSi el equipo está encendido pero sigues sin señal, escribe *ASESOR* para coordinar asistencia técnica de *${this.getIspName()}*.`,
      'CONSULTAR_NIVELES',
      'SMARTOLT_OFFLINE',
      targetJid
    );
  }

  /**
   * Envía la orden de reinicio remoto a la ONU en SmartOLT
   */
  private static async flujoReiniciarModem(phone: string, session: Session | null, targetJid?: string): Promise<void> {
    const onuId = session?.onu_id || `ONU-${session?.client_id || 'DEFAULT'}`;

    await this.enviarYLoguear(phone, `⏳ Enviando señal de reinicio a tu módem...`, 'REINICIAR_MODEM', 'ENVIANDO_COMANDO_REBOOT', targetJid);

    const resultado = await SmartOLTService.rebootONU(onuId);

    if (resultado.success) {
      await this.enviarYLoguear(
        phone,
        `✅ *Comando de reinicio ejecutado con éxito.*\n\nLas luces de tu módem parpadearán y el servicio se reestablecerá por completo en aproximadamente *2 a 3 minutos*. Si tras este tiempo sigues sin internet, escribe *ASESOR*.`,
        'REINICIAR_MODEM',
        'REBOOT_EXITOSO',
        targetJid
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `⚠️ No fue posible reiniciar tu módem de forma remota. Por favor desconéctalo de la corriente eléctrica por 30 segundos y vuelve a conectarlo.`,
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
    if (!session?.client_id) {
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

    const facturas = await WispHubService.obtenerFacturasPendientes(session.client_id);

    if (facturas.length === 0) {
      const ficha = this.getFichaBancaria(session);
      await this.enviarYLoguear(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${session.client_name || 'Cliente'}*, no tienes facturas pendientes de pago en este momento. ¡Gracias por ser cliente de *${this.getIspName()}*!${ficha}`,
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
    const contactoAsesor = config.isp.soporteHumanoPhone ? ` o puedes comunicarte al: *${config.isp.soporteHumanoPhone}*` : '';
    await this.enviarYLoguear(
      phone,
      `👨‍💼 *Atención Personalizada:*\n\nUn asesor humano de *${this.getIspName()}* ha sido notificado sobre tu solicitud${contactoAsesor}.\n\nEn breve uno de nuestros agentes tomará este chat para darte seguimiento directo. ¡Gracias por tu paciencia!`,
      'HABLAR_HUMANO',
      'TRANSFERENCIA_ASESOR',
      targetJid
    );
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
    logger.info(`Buscando coincidencias para identificación de ${phone}: "${rawInput}"`);

    // 1. Intentar búsqueda flexible en Turso DB (Caché local de SmartOLT)
    try {
      const coincidenciasOlt = await TursoService.searchOnusFuzzy(rawInput, 6);

      if (coincidenciasOlt.length > 0) {
        const mejorScore = coincidenciasOlt[0].matchScore;
        // Candidatos con score alto (>= 58) y cercanos al mejor score (dentro de 20 puntos de margen)
        const candidatosRelevantes = coincidenciasOlt.filter(
          c => c.matchScore >= 58 && c.matchScore >= (mejorScore - 20)
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
        if (mejor.matchScore >= 65 || (coincidenciasOlt.length === 1 && mejor.matchScore >= 50)) {
          const meta = JSON.stringify({
            speed_profile: mejor.speed_profile,
            zone: mejor.zone_name,
            address: mejor.address,
            sn: mejor.sn,
          });

          await TursoService.upsertSession({
            phone,
            client_id: mejor.unique_external_id,
            service_id: mejor.sn,
            client_name: mejor.name,
            onu_id: mejor.unique_external_id,
            metadata: meta,
            step: 'ESPERANDO_PROBLEMA',
          });

          const planTexto = mejor.speed_profile ? `\n📦 *Plan:* ${mejor.speed_profile}` : '';
          const zonaTexto = mejor.address || mejor.zone_name ? `\n📍 *Ubicación:* ${mejor.address || mejor.zone_name}` : '';

          await this.enviarYLoguear(
            phone,
            `¡Perfecto! Te he localizado en nuestro sistema de SmartOLT ✅\nBienvenido(a) *${mejor.name}*.${planTexto}${zonaTexto}\n\nCuéntame, ¿cuál es el detalle o falla que presentas con tu servicio de internet?`,
            'IDENTIFICAR_CLIENTE',
            'VINCULADO_SMARTOLT',
            targetJid
          );
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
        await TursoService.upsertSession({
          phone,
          client_id: String(c.id),
          service_id: String(c.servicio_id || c.id),
          client_name: c.nombre,
          onu_id: c.onu_id || `ONU-${c.id}`,
          step: 'ESPERANDO_PROBLEMA',
        });

        await this.enviarYLoguear(
          phone,
          `¡Perfecto, te he ubicado en el sistema! ✅\nBienvenido(a) *${c.nombre}*. Tu cuenta ha quedado vinculada a este chat.\n\nCuéntame, ¿cuál es el problema o consulta que presentas con tu servicio de internet?`,
          'IDENTIFICAR_CLIENTE',
          'VINCULADO_WISPHUB',
          targetJid
        );
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
    let nombreLimpio = clasificacion.nombre_mencionado || rawInput;
    nombreLimpio = nombreLimpio
      .replace(/^(me llamo|soy|mi nombre es|mi nombre|nombre:?)\s+/i, '')
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
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
      await TursoService.upsertSession({
        phone,
        client_name: nombreLimpio,
        step: 'ESPERANDO_PROBLEMA',
      });

      await this.enviarYLoguear(
        phone,
        `¡Mucho gusto, *${nombreLimpio}*! 👋\nHe registrado tu nombre en nuestro sistema para atenderte de manera personalizada.\n\nCuéntame, ¿cuál es el detalle o falla que presentas con tu servicio de internet?`,
        'IDENTIFICAR_CLIENTE',
        'NOMBRE_MEMORIZADO_TURSO',
        targetJid
      );
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

    // 1. Extraer el número de opción: "1", "2", "el 1", "opcion 2", "primero", etc.
    let indexSeleccionado = -1;
    const matchNum = rawInput.match(/\b([1-9])\b/);
    if (matchNum) {
      indexSeleccionado = parseInt(matchNum[1], 10) - 1;
    } else {
      const lower = rawInput.toLowerCase();
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
        `Por favor responde únicamente con el *número* del servicio que deseas consultar (ejemplo: *1* o *2*).`,
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
      step: 'ESPERANDO_PROBLEMA',
    });

    const ubicacion = elegido.address || elegido.zone_name ? ` en *${elegido.address || elegido.zone_name}*` : '';
    const plan = elegido.speed_profile ? `\n📦 *Plan:* ${elegido.speed_profile}` : '';

    await this.enviarYLoguear(
      phone,
      `¡Entendido! He seleccionado tu servicio${ubicacion} ✅${plan}\n\n¿Cuál es la falla o consulta que tienes con este servicio?`,
      'SELECCION_SERVICIO',
      'SERVICIO_SELECCIONADO',
      targetJid
    );

    // Si el usuario había enviado una queja o consulta antes de seleccionar el servicio (ej. "no tengo internet")
    if (meta.initialQuery && typeof meta.initialQuery === 'string') {
      const q = meta.initialQuery.trim();
      const clasif = await GroqService.clasificarMensaje(q, {
        clientName: elegido.name,
        currentStep: 'ESPERANDO_PROBLEMA',
      });
      if (clasif.intencion !== 'IDENTIFICAR_CLIENTE' && clasif.intencion !== 'SALUDO' && clasif.intencion !== 'DESCONOCIDO') {
        logger.info(`Ejecutando queja inicial "${clasif.intencion}" tras seleccionar servicio para ${phone}`);
        await this.ejecutarIntencion(phone, clasif, sessionActualizada, q, targetJid);
      }
    }
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
