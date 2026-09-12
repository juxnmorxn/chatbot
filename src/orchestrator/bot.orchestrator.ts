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
            pendingServices: coincidentesTel.slice(0, 4).map(c => ({
              unique_external_id: c.unique_external_id,
              sn: c.sn,
              name: c.name,
              speed_profile: c.speed_profile,
              zone_name: c.zone_name,
              address: c.address,
            })),
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
      await this.ejecutarIntencion(phone, clasificacion, session, rawText, targetJid);
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
    targetJid?: string
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
        await this.enviarYLoguear(
          phone,
          `¡Gracias por tu pago! 📸 Para registrarlo de inmediato, por favor envía la *foto de tu comprobante o ficha de depósito* por este mismo chat y nuestro equipo de cobranza lo validará en el sistema.`,
          'REPORTAR_PAGO',
          'SOLICITUD_COMPROBANTE',
          targetJid
        );
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
   * Flujo de Falla Técnica Inteligente combinando Groq + SmartOLT + WispHub
   */
  private static async flujoFallaInteligente(
    phone: string,
    c: GroqClassificationResult,
    session: Session | null,
    targetJid?: string
  ): Promise<void> {
    // Si el cliente no está registrado aún en el sistema pero ya reportó un problema de internet
    if (!session?.client_id && !session?.client_name) {
      if (c.foco_rojo) {
        await this.enviarYLoguear(
          phone,
          `⚠️ *Alerta de Foco Rojo (LOS / Fibra Óptica):*\n\nDetectamos que tu módem no recibe señal de luz por posible corte o daño en el cable de fibra óptica.\n\nPara poder generar tu reporte técnico y asignar a la cuadrilla de *${this.getIspName()}*, ¿podrías indicarme tu *Nombre completo* o *Número de contrato*?`,
          'FALLA_INTERNET',
          'SOLICITAR_NOMBRE_PARA_TICKET',
          targetJid
        );
        await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        return;
      }

      if (c.equipo_apagado) {
        await this.enviarYLoguear(
          phone,
          `🔌 *Equipo Apagado / Falla de Energía:*\n\n1. Verifica que el eliminador esté bien conectado a la corriente y al módem.\n2. Presiona el botón de encendido en la parte trasera.\n\nSi no enciende ninguna luz, por favor indícame tu *Nombre completo* o *Número de contrato* para enviar a un técnico de *${this.getIspName()}*.`,
          'FALLA_INTERNET',
          'GUIA_EQUIPO_APAGADO',
          targetJid
        );
        await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        return;
      }

      const queja = c.resumen_queja ? ` sobre: _"${c.resumen_queja}"_` : '';
      await this.enviarYLoguear(
        phone,
        `Entendido tu reporte${queja}. Veo que presentas problemas con tu conexión de internet.\n\nPara poder verificar tu línea en la central y darte solución inmediata, ¿me indicas tu *Nombre completo* o *Número de contrato*?`,
        'FALLA_INTERNET',
        'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO',
        targetJid
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    const clientId = session?.client_id || 'PENDIENTE';

    // Caso A: Foco rojo detectado por Groq
    if (c.foco_rojo) {
      logger.info(`Foco rojo reportado por ${phone}. Creando ticket de fibra cortada.`);
      const ticket = await WispHubService.crearTicketSoporte(
        clientId,
        'Alarma de Foco Rojo en Módem (LOS / Fibra Óptica)',
        `El cliente reporta foco rojo encendido. Resumen: ${c.resumen_queja}. Requiere revisión de cableado o empalme.`,
        'Alta'
      );

      await this.enviarYLoguear(
        phone,
        `⚠️ *Alerta de Fibra Óptica Detectada:*\n\nEl foco rojo indica que no está llegando señal de luz a tu módem (posible cable desconectado o fibra dañada).\n\n🎫 *Hemos generado tu reporte técnico:*\n• Folio: *${ticket.folio}*\n• Estado: Asignado a cuadrilla técnica de ${this.getIspName()}.\n\nTe pedimos no mover el cable delgado amarillo/blanco para evitar daños mayores.`,
        'FALLA_INTERNET',
        `TICKET_CREADO_FOCO_ROJO_${ticket.folio}`,
        targetJid
      );
      return;
    }

    // Caso B: Equipo apagado o sin energía
    if (c.equipo_apagado) {
      await this.enviarYLoguear(
        phone,
        `🔌 *Equipo Apagado / Falla de Energía:*\n\n1. Verifica que el eliminador negro esté firmemente conectado a la corriente.\n2. Prueba conectando en otro enchufe de pared que tenga luz.\n3. Presiona el botón pequeño de encendido (ON/OFF) en la parte trasera del módem.\n\nSi después de esto no enciende ninguna luz, responde *ASESOR* para coordinar el reemplazo del equipo.`,
        'FALLA_INTERNET',
        'GUIA_EQUIPO_APAGADO',
        targetJid
      );
      return;
    }

    // Caso C: Si el usuario ya lo reinició físicamente
    if (c.ya_reinicio) {
      const ticket = await WispHubService.crearTicketSoporte(
        clientId,
        'Sin servicio tras reinicio local',
        `El cliente ya reinició su equipo y continúa sin navegación. Resumen: ${c.resumen_queja}`,
        'Media'
      );

      await this.enviarYLoguear(
        phone,
        `Agradecemos que ya hayas realizado el reinicio. Debido a que el servicio aún no responde, generamos tu reporte técnico *#${ticket.folio}* para revisión en cabina central.`,
        'FALLA_INTERNET',
        `TICKET_CREADO_SIN_SERVICIO_${ticket.folio}`,
        targetJid
      );
      return;
    }

    // Caso D: Diagnóstico en SmartOLT
    await this.flujoReportarFalla(phone, session, targetJid);
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
      await this.enviarYLoguear(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${session.client_name || 'Cliente'}*, no tienes facturas pendientes de pago en este momento. ¡Gracias por ser cliente de *${this.getIspName()}*!`,
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

    textoFacturas += `💰 *Total a pagar: $${totalAdeudo.toFixed(2)} MXN*\n\n_Para reportar tu pago después de realizarlo, puedes enviar la foto de tu comprobante en este chat._`;

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
              pendingServices: candidatosRelevantes.slice(0, 5).map(c => ({
                unique_external_id: c.unique_external_id,
                sn: c.sn,
                name: c.name,
                speed_profile: c.speed_profile,
                zone_name: c.zone_name,
                address: c.address,
              })),
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
            pendingServices: coincidencias.slice(0, 4).map(c => ({
              unique_external_id: c.onu_id || `ONU-${c.id}`,
              sn: String(c.servicio_id || c.id),
              name: c.nombre,
              speed_profile: '',
              zone_name: '',
              address: c.direccion || '',
            })),
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
    try {
      const meta = JSON.parse(session?.metadata || '{}');
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
    const meta = JSON.stringify({
      speed_profile: elegido.speed_profile,
      zone: elegido.zone_name,
      address: elegido.address,
      sn: elegido.sn,
    });

    await TursoService.upsertSession({
      phone,
      client_id: elegido.unique_external_id,
      service_id: elegido.sn,
      client_name: elegido.name,
      onu_id: elegido.unique_external_id,
      metadata: meta,
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
