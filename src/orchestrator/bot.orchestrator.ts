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
    botones?: BotButton[]
  ): Promise<boolean> {
    const textoFinal = parseSpintax(mensaje);
    let ok = false;
    if (botones && botones.length > 0) {
      ok = await EvolutionService.enviarBotones(phone, textoFinal, botones);
    } else {
      ok = await EvolutionService.enviarTexto(phone, textoFinal);
    }
    await TursoService.logMessage(phone, 'OUT', textoFinal, intencion, accion);
    return ok;
  }

  /**
   * Punto de entrada principal para todos los mensajes recibidos desde WhatsApp
   */
  static async procesarMensaje(event: IncomingMessageEvent): Promise<void> {
    const { phone } = event;
    const rawText = (event.text || '').trim();
    const buttonId = event.buttonId;

    logger.info(`Procesando mensaje de ${phone}: buttonId="${buttonId}", text="${rawText}"`);

    // Registrar mensaje entrante en la auditoría de Turso
    const inputContent = rawText || (buttonId ? `[Botón: ${buttonId}]` : (event.isMedia ? '[Foto/Comprobante]' : '[Desconocido]'));
    await TursoService.logMessage(phone, 'IN', inputContent, null, 'MENSAJE_ENTRANTE');

    // 1. Obtener o inicializar sesión en Turso
    let session = await TursoService.getSession(phone);

    // 2. Control Anti-Spam (Opt-Out): si el usuario escribe cancelar o baja
    if (['CANCELAR', 'BAJA', 'NO ENVIAR', 'STOP'].includes(rawText.toUpperCase())) {
      await TursoService.setOptOut(phone, true);
      await this.enviarYLoguear(
        phone,
        `{Entendido|Listo}. Has cancelado la suscripción de avisos automáticos de *${this.getIspName()}*. Si en el futuro deseas volver a activarlos, escribe *ACTIVAR*.`,
        'CANCELAR_SUSCRIPCION',
        'OPTOUT_CONFIRMADO'
      );
      return;
    }

    if (rawText.toUpperCase() === 'ACTIVAR') {
      await TursoService.setOptOut(phone, false);
      await this.enviarYLoguear(
        phone,
        `¡Bienvenido de vuelta! 🎉 Has reactivado las notificaciones y soporte de *${this.getIspName()}*.`,
        'ACTIVAR',
        'OPTIN_CONFIRMADO'
      );
      await this.enviarMenuPrincipal(phone, session?.client_name);
      return;
    }

    // Si está en lista de exclusión y no envió 'ACTIVAR', no molestamos
    if (session?.opt_out === 1) {
      logger.info(`El usuario ${phone} tiene opt_out activo. Ignorando mensaje saliente.`);
      return;
    }

    // 3. Si aún no tenemos identificado al cliente en la sesión, buscar en WispHub
    if (!session || !session.client_id) {
      const clienteWisp = await WispHubService.buscarClientePorTelefono(phone);
      if (clienteWisp) {
        session = await TursoService.upsertSession({
          phone,
          client_id: String(clienteWisp.id),
          service_id: String(clienteWisp.servicio_id || clienteWisp.id),
          client_name: clienteWisp.nombre,
          onu_id: clienteWisp.onu_id || `ONU-${clienteWisp.id}`,
          step: 'MENU_PRINCIPAL',
        });
      }
    }

    // 4. Procesamiento de botones interactivos directos (sin gastar tokens de Groq)
    if (buttonId) {
      await this.manejarBoton(phone, buttonId, session);
      return;
    }

    // 5. Manejo de atajos numéricos directos ("1", "2", "3")
    if (['1', '2', '3'].includes(rawText)) {
      if (rawText === '1') {
        await this.flujoConsultarSaldo(phone, session);
        return;
      }
      if (rawText === '2') {
        await this.flujoReportarFalla(phone, session);
        return;
      }
      if (rawText === '3') {
        await this.flujoHablarAsesor(phone, session);
        return;
      }
    }

    // 6. Si el bot estaba esperando que el usuario se identificara por nombre/contrato
    if (session?.step === 'ESPERANDO_IDENTIFICACION') {
      await this.procesarIdentificacion(phone, rawText, session);
      return;
    }

    // 7. Procesamiento de Lenguaje Natural con Groq (Llama 3.1)
    logger.info(`Enviando texto a Groq para traducción estructurada: "${rawText}"`);
    const clasificacion = await GroqService.clasificarMensaje(rawText, {
      clientName: session?.client_name,
      currentStep: session?.step,
    });

    logger.info(`Resultado Groq: intencion="${clasificacion.intencion}", foco_rojo=${clasificacion.foco_rojo}, equipo_apagado=${clasificacion.equipo_apagado}, resumen="${clasificacion.resumen_queja}"`);

    await this.ejecutarIntencion(phone, clasificacion, session, rawText);
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
    mensajeOriginal: string
  ): Promise<void> {
    switch (c.intencion) {
      case 'SALUDO':
        await this.enviarMenuPrincipal(phone, session?.client_name);
        break;

      case 'CONSULTAR_SALDO':
        await this.flujoConsultarSaldo(phone, session);
        break;

      case 'REPORTAR_PAGO':
        await this.enviarYLoguear(
          phone,
          `{¡Gracias por tu pago!|Excelente noticia}. 📸 Para registrarlo de inmediato, por favor envía la *foto de tu comprobante o ficha de depósito* por este mismo chat y un agente de cobranza lo validará.`,
          'REPORTAR_PAGO',
          'SOLICITUD_COMPROBANTE'
        );
        break;

      case 'FALLA_INTERNET':
        await this.flujoFallaInteligente(phone, c, session);
        break;

      case 'REINICIAR_MODEM':
        await this.flujoReiniciarModem(phone, session);
        break;

      case 'DATOS_WIFI':
        await this.enviarYLoguear(
          phone,
          `📶 *Cambio de contraseña Wi-Fi:*\n\nPor seguridad de tu red, el cambio de clave o nombre de red se gestiona directamente con nuestro equipo técnico. Por favor responde con el nuevo nombre y contraseña que deseas configurar para tu módem.`,
          'DATOS_WIFI',
          'INSTRUCCIONES_WIFI'
        );
        break;

      case 'HABLAR_HUMANO':
        await this.flujoHablarAsesor(phone, session);
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
        // Si el cliente NO está identificado en absoluto (ni por CRM ni por nombre memorizado en Turso)
        if (!session?.client_id && !session?.client_name) {
          const intro = c.resumen_queja ? `Entendido. ` : '';
          await this.enviarYLoguear(
            phone,
            `${intro}{Hola|Buen día}. Bienvenido al centro de atención de *${this.getIspName()}*.\n\nPara poder brindarte un servicio ágil, ¿podrías indicarme tu *Nombre* o *Número de contrato*?`,
            'DESCONOCIDO',
            'SOLICITAR_IDENTIFICACION'
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        } else {
          // El cliente ya es conocido: respondemos reconociendo lo que dijo y ofreciendo ayuda
          const contextoDicho = c.resumen_queja && c.resumen_queja.length > 3
            ? `Entiendo que nos comentas sobre: _"${c.resumen_queja}"_.\n\n`
            : '';
          await this.enviarYLoguear(
            phone,
            `${contextoDicho}Como asistente virtual de *${this.getIspName()}*, estoy aquí para ayudarte con tu conexión a internet, saldo y soporte técnico. ¿En qué podemos apoyarte hoy?`,
            'DESCONOCIDO',
            'ORIENTACION_CONVERSACIONAL'
          );
          await this.enviarMenuPrincipal(phone, session?.client_name);
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
    session: Session | null
  ): Promise<void> {
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
        `TICKET_CREADO_FOCO_ROJO_${ticket.folio}`
      );
      return;
    }

    // Caso B: Equipo apagado o sin energía
    if (c.equipo_apagado) {
      await this.enviarYLoguear(
        phone,
        `🔌 *Equipo Apagado / Falla de Energía:*\n\n1. Verifica que el eliminador negro esté firmemente conectado a la corriente.\n2. Prueba conectando en otro enchufe de pared que tenga luz.\n3. Presiona el botón pequeño de encendido (ON/OFF) en la parte trasera del módem.\n\nSi después de esto no enciende ninguna luz, responde *ASESOR* para coordinar el reemplazo del equipo.`,
        'FALLA_INTERNET',
        'GUIA_EQUIPO_APAGADO'
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
        `TICKET_CREADO_SIN_SERVICIO_${ticket.folio}`
      );
      return;
    }

    // Caso D: Diagnóstico en SmartOLT
    await this.flujoReportarFalla(phone, session);
  }

  /**
   * Diagnóstico general de falla técnica con SmartOLT
   */
  private static async flujoReportarFalla(phone: string, session: Session | null): Promise<void> {
    const onuId = session?.onu_id || (session?.client_id ? `ONU-${session.client_id}` : 'ONU-DEFAULT');

    await this.enviarYLoguear(phone, `🔍 Diagnosticando el estado de tu conexión en tiempo real...`, 'DIAGNOSTICO', 'INICIANDO_SCAN');

    const estadoOnu = await SmartOLTService.obtenerEstadoONU(onuId);
    logger.info(`Diagnóstico SmartOLT para ${phone}: ${estadoOnu.status}`);

    if (estadoOnu.status === 'LOS') {
      const ticket = await WispHubService.crearTicketSoporte(
        session?.client_id || 'PENDIENTE',
        'Corte de Fibra Óptica (SmartOLT LOS)',
        'SmartOLT reporta Loss of Signal (LOS). Fibra rota o desconectada.',
        'Alta'
      );

      await this.enviarYLoguear(
        phone,
        `🔴 *Falla Física Detectada (Fibra Dañada):*\n\nLa central reporta corte en la señal óptica de tu domicilio.\n\n🎫 *Ticket generado:* *#${ticket.folio}*\nNuestros técnicos en campo ya han sido notificados para la reparación.`,
        'FALLA_INTERNET',
        `TICKET_SMARTOLT_LOS_${ticket.folio}`
      );
      return;
    }

    if (estadoOnu.status === 'POWER_FAIL') {
      await this.enviarYLoguear(
        phone,
        `⚡ *Falla de Alimentación:* La OLT detecta que el módem no tiene energía eléctrica. Por favor verifica que el cable de corriente esté conectado y con energía.`,
        'FALLA_INTERNET',
        'SMARTOLT_POWER_FAIL'
      );
      return;
    }

    if (estadoOnu.status === 'ONLINE') {
      const potenciaTexto = estadoOnu.opticalPowerDbm ? ` (${estadoOnu.opticalPowerDbm} dBm - Óptimo)` : '';
      await this.enviarYLoguear(
        phone,
        `🟢 *Tu módem está en línea con la central${potenciaTexto}.*\n\nSi experimentas lentitud o páginas que no abren, podemos enviar un reinicio de refresco a tu equipo:`,
        'FALLA_INTERNET',
        'SMARTOLT_ONLINE_OPCION_REBOOT',
        [
          { id: 'BTN_REBOOT', title: '🔄 Reiniciar Módem' },
          { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
        ]
      );
      return;
    }

    // Fallback general
    await this.enviarYLoguear(
      phone,
      `No pudimos obtener una lectura automática de tu equipo. ¿Deseas solicitar un reinicio o hablar con un asesor?`,
      'FALLA_INTERNET',
      'SMARTOLT_FALLBACK_MENU',
      [
        { id: 'BTN_REBOOT', title: '🔄 Reiniciar Módem' },
        { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
      ]
    );
  }

  /**
   * Envía la orden de reinicio remoto a la ONU en SmartOLT
   */
  private static async flujoReiniciarModem(phone: string, session: Session | null): Promise<void> {
    const onuId = session?.onu_id || `ONU-${session?.client_id || 'DEFAULT'}`;

    await this.enviarYLoguear(phone, `⏳ Enviando señal de reinicio a tu módem...`, 'REINICIAR_MODEM', 'ENVIANDO_COMANDO_REBOOT');

    const resultado = await SmartOLTService.rebootONU(onuId);

    if (resultado.success) {
      await this.enviarYLoguear(
        phone,
        `✅ *Comando de reinicio ejecutado con éxito.*\n\nLas luces de tu módem parpadearán y el servicio se reestablecerá por completo en aproximadamente *2 a 3 minutos*. Si tras este tiempo sigues sin internet, escribe *ASESOR*.`,
        'REINICIAR_MODEM',
        'REBOOT_EXITOSO'
      );
    } else {
      await this.enviarYLoguear(
        phone,
        `⚠️ No fue posible reiniciar tu módem de forma remota. Por favor desconéctalo de la corriente eléctrica por 30 segundos y vuelve a conectarlo.`,
        'REINICIAR_MODEM',
        'REBOOT_FALLIDO_MANUAL'
      );
    }
  }

  /**
   * Consulta de facturas y saldos pendientes en WispHub
   */
  private static async flujoConsultarSaldo(phone: string, session: Session | null): Promise<void> {
    if (!session?.client_id) {
      await this.enviarYLoguear(
        phone,
        `Para consultar tu estado de cuenta requerimos tu número de contrato o nombre. Por favor escribe tu *Nombre completo* o *ID de contrato*:`,
        'CONSULTAR_SALDO',
        'SOLICITAR_CONTRATO_SALDO'
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
        'CUENTA_AL_CORRIENTE'
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

    await this.enviarYLoguear(phone, textoFacturas, 'CONSULTAR_SALDO', 'FACTURAS_PENDIENTES_ENVIADAS');
  }

  /**
   * Transferencia a atención con asesor humano
   */
  private static async flujoHablarAsesor(phone: string, session: Session | null): Promise<void> {
    const contactoAsesor = config.isp.soporteHumanoPhone ? ` o puedes comunicarte al: *${config.isp.soporteHumanoPhone}*` : '';
    await this.enviarYLoguear(
      phone,
      `👨‍💼 *Atención Personalizada:*\n\nUn asesor humano de *${this.getIspName()}* ha sido notificado sobre tu solicitud${contactoAsesor}.\n\nEn breve uno de nuestros agentes tomará este chat para darte seguimiento directo. ¡Gracias por tu paciencia!`,
      'HABLAR_HUMANO',
      'TRANSFERENCIA_ASESOR'
    );
  }

  /**
   * Procesa la identificación de un cliente de forma inteligente:
   * 1. Busca en WispHub por nombre o contrato.
   * 2. Si no coincide pero parece otra intención (ej. "no tengo internet"), la procesa sin trabarse.
   * 3. Si es un nombre personal (ej. "Carlos", "Juan"), lo memoriza en Turso DB y NUNCA vuelve a preguntarlo.
   */
  private static async procesarIdentificacion(phone: string, input: string, session: Session | null): Promise<void> {
    const rawInput = input.trim();
    logger.info(`Buscando coincidencias para identificación de ${phone}: "${rawInput}"`);

    // 1. Intentar buscar en WispHub
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
          step: 'MENU_PRINCIPAL',
        });

        await this.enviarYLoguear(
          phone,
          `¡Perfecto, te hemos identificado! ✅\nBienvenido(a) *${c.nombre}*. Tu número ha quedado vinculado a tu contrato para futuras consultas.`,
          'IDENTIFICAR_CLIENTE',
          'VINCULADO_WISPHUB'
        );
        await this.enviarMenuPrincipal(phone, c.nombre);
        return;
      }

      if (coincidencias.length > 1) {
        let opciones = `Encontramos varios registros con ese nombre. Por favor escribe tu número de servicio:\n\n`;
        coincidencias.forEach((c) => {
          opciones += `• *ID ${c.id}:* ${c.nombre} (${c.direccion || 'Sin dirección'})\n`;
        });
        await this.enviarYLoguear(phone, opciones, 'IDENTIFICAR_CLIENTE', 'MULTIPLES_COINCIDENCIAS');
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
      await TursoService.updateStep(phone, 'MENU_PRINCIPAL');
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
        step: 'MENU_PRINCIPAL',
      });

      await this.enviarYLoguear(
        phone,
        `¡Mucho gusto, *${nombreLimpio}*! 👋\nHe registrado tu nombre en nuestro sistema para atenderte siempre de manera personalizada.`,
        'IDENTIFICAR_CLIENTE',
        'NOMBRE_MEMORIZADO_TURSO'
      );
      await this.enviarMenuPrincipal(phone, nombreLimpio);
      return;
    }

    // 4. Si lo escrito es incomprensible, no nos quedamos en bucle: avanzamos al menú principal amablemente
    await this.enviarYLoguear(
      phone,
      `No te preocupes. ¿En qué podemos ayudarte el día de hoy?`,
      'DESCONOCIDO',
      'CONTINUAR_SIN_NOMBRE'
    );
    await TursoService.updateStep(phone, 'MENU_PRINCIPAL');
    await this.enviarMenuPrincipal(phone, null);
  }

  /**
   * Envía el menú interactivo principal
   */
  static async enviarMenuPrincipal(phone: string, clientName?: string | null): Promise<void> {
    const saludo = clientName ? `{¡Hola|Buen día} *${clientName}*! 👋` : `{¡Hola|Buen día}! 👋`;
    const texto = `${saludo}\nBienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\n¿En qué podemos ayudarte hoy?`;

    await this.enviarYLoguear(phone, texto, 'MENU_PRINCIPAL', 'MENU_BOTONES_ENVIADO', this.MAIN_MENU_BUTTONS);
    await TursoService.updateStep(phone, 'MENU_PRINCIPAL');
  }
}
