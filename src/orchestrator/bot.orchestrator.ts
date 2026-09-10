import { TursoService, Session } from '../services/turso.service';
import { GroqService, GroqClassificationResult } from '../services/groq.service';
import { WispHubService, WispHubCliente } from '../services/wisphub.service';
import { SmartOLTService } from '../services/smartolt.service';
import { EvolutionService, BotButton } from '../services/evolution.service';
import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { Logger } from '../utils/logger';

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
   * Punto de entrada principal para todos los mensajes recibidos desde WhatsApp
   */
  static async procesarMensaje(event: IncomingMessageEvent): Promise<void> {
    const { phone } = event;
    const rawText = (event.text || '').trim();
    const buttonId = event.buttonId;

    logger.info(`Procesando mensaje de ${phone}: buttonId="${buttonId}", text="${rawText}"`);

    // 1. Obtener o inicializar sesión en Turso
    let session = await TursoService.getSession(phone);

    // 2. Control Anti-Spam (Opt-Out): si el usuario escribe cancelar o baja
    if (rawText.toUpperCase() === 'CANCELAR' || rawText.toUpperCase() === 'BAJA') {
      await TursoService.setOptOut(phone, true);
      await EvolutionService.enviarTexto(
        phone,
        `{Entendido|Listo}. Has cancelado la suscripción de avisos automáticos de *${config.isp.name}*. Si en el futuro deseas volver a activarlos, escribe *ACTIVAR*.`
      );
      return;
    }

    if (rawText.toUpperCase() === 'ACTIVAR') {
      await TursoService.setOptOut(phone, false);
      await EvolutionService.enviarTexto(
        phone,
        `¡Bienvenido de vuelta! 🎉 Has reactivado las notificaciones y soporte de *${this.getIspName()}*.`
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

    logger.info(`Resultado Groq: intencion="${clasificacion.intencion}", foco_rojo=${clasificacion.foco_rojo}, equipo_apagado=${clasificacion.equipo_apagado}`);

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
        await EvolutionService.enviarTexto(
          phone,
          `{¡Gracias por tu pago!|Excelente noticia}. 📸 Para registrarlo de inmediato, por favor envía la *foto de tu comprobante o ficha de depósito* por este mismo chat y un agente de cobranza lo validará.`
        );
        break;

      case 'FALLA_INTERNET':
        await this.flujoFallaInteligente(phone, c, session);
        break;

      case 'REINICIAR_MODEM':
        await this.flujoReiniciarModem(phone, session);
        break;

      case 'DATOS_WIFI':
        await EvolutionService.enviarTexto(
          phone,
          `📶 *Cambio de contraseña Wi-Fi:*\n\nPor seguridad de tu red, el cambio de clave o nombre de red se gestiona directamente con nuestro equipo técnico. Por favor responde con el nuevo nombre y contraseña que deseas configurar para tu módem.`
        );
        break;

      case 'HABLAR_HUMANO':
        await this.flujoHablarAsesor(phone, session);
        break;

      case 'CANCELAR_SUSCRIPCION':
        await TursoService.setOptOut(phone, true);
        await EvolutionService.enviarTexto(
          phone,
          `Has sido dado de baja de nuestros avisos automáticos. Escribe *ACTIVAR* si deseas regresar en cualquier momento.`
        );
        break;

      case 'IDENTIFICAR_CLIENTE':
        await this.procesarIdentificacion(phone, c.nombre_mencionado || c.telefono_mencionado || mensajeOriginal, session);
        break;

      case 'DESCONOCIDO':
      default:
        // Si no está identificado, le sugerimos identificarse o elegir una opción
        if (!session?.client_id) {
          await EvolutionService.enviarTexto(
            phone,
            `{Hola|Buen día}. Bienvenido al centro de atención de *${this.getIspName()}*.\n\nNo tengo registrado este número celular en el sistema. ¿Podrías indicarme tu *Nombre completo* o *Número de contrato*?`
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        } else {
          await EvolutionService.enviarTexto(
            phone,
            `No logré comprender del todo tu mensaje. Por favor selecciona una de las siguientes opciones:`
          );
          await this.enviarMenuPrincipal(phone, session.client_name);
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
    const onuId = session?.onu_id || `ONU-${clientId}`;

    // Caso A: Foco rojo detectado por Groq
    if (c.foco_rojo) {
      logger.info(`Foco rojo reportado por ${phone}. Creando ticket de fibra cortada.`);
      const ticket = await WispHubService.crearTicketSoporte(
        clientId,
        'Alarma de Foco Rojo en Módem (LOS / Fibra Óptica)',
        `El cliente reporta foco rojo encendido. Resumen: ${c.resumen_queja}. Requiere revisión de cableado o empalme.`,
        'Alta'
      );

      await EvolutionService.enviarTexto(
        phone,
        `⚠️ *Alerta de Fibra Óptica Detectada:*\n\nEl foco rojo indica que no está llegando señal de luz a tu módem (posible cable desconectado o fibra dañada).\n\n🎫 *Hemos generado tu reporte técnico:*\n• Folio: *${ticket.folio}*\n• Estado: Asignado a cuadrilla técnica.\n\nTe pedimos no mover el cable delgado amarillo/blanco para evitar daños mayores.`
      );
      return;
    }

    // Caso B: Equipo apagado o sin energía
    if (c.equipo_apagado) {
      await EvolutionService.enviarTexto(
        phone,
        `🔌 *Equipo Apagado / Falla de Energía:*\n\n1. Verifica que el eliminador negro esté firmemente conectado a la corriente.\n2. Prueba conectando en otro enchufe de pared que tenga luz.\n3. Presiona el botón pequeño de encendido (ON/OFF) en la parte trasera del módem.\n\nSi después de esto no enciende ninguna luz, responde *ASESOR* para coordinar el reemplazo del equipo.`
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

      await EvolutionService.enviarTexto(
        phone,
        `Agradecemos que ya hayas realizado el reinicio. Debido a que el servicio aún no responde, generamos tu reporte técnico *#${ticket.folio}* para revisión en cabina central.`
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

    await EvolutionService.enviarTexto(phone, `🔍 Diagnosticando el estado de tu conexión en tiempo real...`);

    const estadoOnu = await SmartOLTService.obtenerEstadoONU(onuId);
    logger.info(`Diagnóstico SmartOLT para ${phone}: ${estadoOnu.status}`);

    if (estadoOnu.status === 'LOS') {
      const ticket = await WispHubService.crearTicketSoporte(
        session?.client_id || 'PENDIENTE',
        'Corte de Fibra Óptica (SmartOLT LOS)',
        'SmartOLT reporta Loss of Signal (LOS). Fibra rota o desconectada.',
        'Alta'
      );

      await EvolutionService.enviarTexto(
        phone,
        `🔴 *Falla Física Detectada (Fibra Dañada):*\n\nLa central reporta corte en la señal óptica de tu domicilio.\n\n🎫 *Ticket generado:* *#${ticket.folio}*\nNuestros técnicos en campo ya han sido notificados para la reparación.`
      );
      return;
    }

    if (estadoOnu.status === 'POWER_FAIL') {
      await EvolutionService.enviarTexto(
        phone,
        `⚡ *Falla de Alimentación:* La OLT detecta que el módem no tiene energía eléctrica. Por favor verifica que el cable de corriente esté conectado y con energía.`
      );
      return;
    }

    if (estadoOnu.status === 'ONLINE') {
      const potenciaTexto = estadoOnu.opticalPowerDbm ? ` (${estadoOnu.opticalPowerDbm} dBm - Óptimo)` : '';
      await EvolutionService.enviarBotones(
        phone,
        `🟢 *Tu módem está en línea con la central${potenciaTexto}.*\n\nSi experimentas lentitud o páginas que no abren, podemos enviar un reinicio de refresco a tu equipo:`,
        [
          { id: 'BTN_REBOOT', title: '🔄 Reiniciar Módem' },
          { id: 'BTN_ASESOR', title: '👤 Hablar con Asesor' },
        ]
      );
      return;
    }

    // Fallback general
    await EvolutionService.enviarBotones(
      phone,
      `No pudimos obtener una lectura automática de tu equipo. ¿Deseas solicitar un reinicio o hablar con un asesor?`,
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

    await EvolutionService.enviarTexto(phone, `⏳ Enviando señal de reinicio a tu módem...`);

    const resultado = await SmartOLTService.rebootONU(onuId);

    if (resultado.success) {
      await EvolutionService.enviarTexto(
        phone,
        `✅ *Comando de reinicio ejecutado con éxito.*\n\nLas luces de tu módem parpadearán y el servicio se reestablecerá por completo en aproximadamente *2 a 3 minutos*. Si tras este tiempo sigues sin internet, escribe *ASESOR*.`
      );
    } else {
      await EvolutionService.enviarTexto(
        phone,
        `⚠️ No fue posible reiniciar tu módem de forma remota. Por favor desconéctalo de la corriente eléctrica por 30 segundos y vuelve a conectarlo.`
      );
    }
  }

  /**
   * Consulta de facturas y saldos pendientes en WispHub
   */
  private static async flujoConsultarSaldo(phone: string, session: Session | null): Promise<void> {
    if (!session?.client_id) {
      await EvolutionService.enviarTexto(
        phone,
        `Para consultar tu saldo necesitamos tu número de cliente o nombre. Por favor escribe tu *Nombre completo* o *ID de contrato*:`
      );
      await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
      return;
    }

    const facturas = await WispHubService.obtenerFacturasPendientes(session.client_id);

    if (facturas.length === 0) {
      await EvolutionService.enviarTexto(
        phone,
        `🎉 *¡Tu cuenta está al corriente!*\n\nEstimado(a) *${session.client_name || 'Cliente'}*, no tienes facturas pendientes de pago en este momento. ¡Gracias por ser cliente de *${config.isp.name}*!`
      );
      return;
    }

    let textoFacturas = `📋 *Estado de Cuenta - ${config.isp.name}*\nCliente: *${session.client_name}*\n\n`;
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

    await EvolutionService.enviarTexto(phone, textoFacturas);
  }

  /**
   * Transferencia a atención con asesor humano
   */
  private static async flujoHablarAsesor(phone: string, session: Session | null): Promise<void> {
    const contactoAsesor = config.isp.soporteHumanoPhone ? ` o puedes comunicarte al: *${config.isp.soporteHumanoPhone}*` : '';
    await EvolutionService.enviarTexto(
      phone,
      `👨‍💼 *Atención Personalizada:*\n\nUn asesor humano ha sido notificado sobre tu solicitud${contactoAsesor}.\n\nEn breve uno de nuestros agentes tomará este chat para darte seguimiento directo. ¡Gracias por tu paciencia!`
    );
  }

  /**
   * Procesa la identificación manual de un cliente cuando su celular no coincide con WispHub
   */
  private static async procesarIdentificacion(phone: string, input: string, session: Session | null): Promise<void> {
    logger.info(`Buscando coincidencias para identificación de ${phone}: "${input}"`);

    const coincidencias = await WispHubService.buscarClientePorNombre(input);

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

      await EvolutionService.enviarTexto(
        phone,
        `¡Perfecto, te hemos identificado! ✅\nBienvenido(a) *${c.nombre}*. Tu número ha quedado registrado para futuras consultas.`
      );
      await this.enviarMenuPrincipal(phone, c.nombre);
      return;
    }

    if (coincidencias.length > 1) {
      let opciones = `Encontramos varios registros con ese nombre. Por favor escribe tu número de servicio:\n\n`;
      coincidencias.forEach((c) => {
        opciones += `• *ID ${c.id}:* ${c.nombre} (${c.direccion || 'Sin dirección'})\n`;
      });
      await EvolutionService.enviarTexto(phone, opciones);
      return;
    }

    // Si no encontró coincidencia
    await EvolutionService.enviarTexto(
      phone,
      `No logramos encontrar un servicio asociado a *"${input}"*. Un asesor humano se pondrá en contacto contigo para asistirte.`
    );
    await this.flujoHablarAsesor(phone, session);
  }

  /**
   * Envía el menú interactivo principal
   */
  static async enviarMenuPrincipal(phone: string, clientName?: string | null): Promise<void> {
    const saludo = clientName ? `{¡Hola|Buen día} *${clientName}*! 👋` : `{¡Hola|Buen día}! 👋`;
    const texto = `${saludo}\nBienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\n¿En qué podemos ayudarte hoy?`;

    await EvolutionService.enviarBotones(phone, texto, this.MAIN_MENU_BUTTONS);
    await TursoService.updateStep(phone, 'MENU_PRINCIPAL');
  }
}
