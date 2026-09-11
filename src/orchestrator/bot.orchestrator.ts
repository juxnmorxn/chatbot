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

    // Si el usuario nos indica su nombre (ej. "me llamo Ricardo", "soy Carlos"), guardarlo en la sesión
    const matchNombre = rawText.match(/^(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,35})$/i);
    if (matchNombre && matchNombre[1]) {
      const nombreExtraido = matchNombre[1].trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      session = await TursoService.upsertSession({
        phone,
        client_name: nombreExtraido,
        step: 'CONVERSACIONAL',
      });
    }

    // 3. IA Conversacional Contextual (Groq Llama 3.1)
    // Obtenemos los últimos mensajes para darle continuidad real a la plática
    const historial = await TursoService.getHistorialReciente(phone, 8);

    logger.info(`Generando respuesta con Groq para ${phone} (Historial previo: ${historial.length} mensajes)...`);
    const respuestaIA = await GroqService.generarRespuestaConversacional(rawText, historial, {
      clientName: session?.client_name,
      ispName: this.getIspName(),
    });

    // Enviar la respuesta directa de la IA al hilo del cliente
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
    mensajeOriginal: string
  ): Promise<void> {
    switch (c.intencion) {
      case 'SALUDO':
        if (!session?.client_id && !session?.client_name) {
          // Cliente nuevo / no registrado: solicitamos nombre o contrato para ubicarlo
          await this.enviarYLoguear(
            phone,
            `¡Hola! 👋 Bienvenido al centro de atención y soporte técnico de *${this.getIspName()}*.\n\nPara poder ubicar tu cuenta en nuestro sistema y brindarte una mejor atención, ¿podrías indicarme tu *Nombre completo* o tu *Número de contrato / teléfono*?`,
            'SALUDO',
            'SOLICITAR_IDENTIFICACION'
          );
          await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        } else {
          // Cliente ya registrado / conocido: saludo cordial y directo a su problema
          const nombre = session.client_name ? ` *${session.client_name}*` : '';
          await this.enviarYLoguear(
            phone,
            `¡Hola${nombre}! 👋 Bienvenido al centro de atención de *${this.getIspName()}*.\n\n¿En qué podemos apoyarte el día de hoy? Cuéntame cuál es tu duda o si presentas alguna falla con tu servicio.`,
            'SALUDO',
            'SALUDO_PERSONALIZADO'
          );
          await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
        }
        break;

      case 'CONSULTAR_SALDO':
        await this.flujoConsultarSaldo(phone, session);
        break;

      case 'REPORTAR_PAGO':
        await this.enviarYLoguear(
          phone,
          `¡Gracias por tu pago! 📸 Para registrarlo de inmediato, por favor envía la *foto de tu comprobante o ficha de depósito* por este mismo chat y nuestro equipo de cobranza lo validará en el sistema.`,
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
    session: Session | null
  ): Promise<void> {
    // Si el cliente no está registrado aún en el sistema pero ya reportó un problema de internet
    if (!session?.client_id && !session?.client_name) {
      if (c.foco_rojo) {
        await this.enviarYLoguear(
          phone,
          `⚠️ *Alerta de Foco Rojo (LOS / Fibra Óptica):*\n\nDetectamos que tu módem no recibe señal de luz por posible corte o daño en el cable de fibra óptica.\n\nPara poder generar tu reporte técnico y asignar a la cuadrilla de *${this.getIspName()}*, ¿podrías indicarme tu *Nombre completo* o *Número de contrato*?`,
          'FALLA_INTERNET',
          'SOLICITAR_NOMBRE_PARA_TICKET'
        );
        await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        return;
      }

      if (c.equipo_apagado) {
        await this.enviarYLoguear(
          phone,
          `🔌 *Equipo Apagado / Falla de Energía:*\n\n1. Verifica que el eliminador esté bien conectado a la corriente y al módem.\n2. Presiona el botón de encendido en la parte trasera.\n\nSi no enciende ninguna luz, por favor indícame tu *Nombre completo* o *Número de contrato* para enviar a un técnico de *${this.getIspName()}*.`,
          'FALLA_INTERNET',
          'GUIA_EQUIPO_APAGADO'
        );
        await TursoService.updateStep(phone, 'ESPERANDO_IDENTIFICACION');
        return;
      }

      const queja = c.resumen_queja ? ` sobre: _"${c.resumen_queja}"_` : '';
      await this.enviarYLoguear(
        phone,
        `Entendido tu reporte${queja}. Veo que presentas problemas con tu conexión de internet.\n\nPara poder verificar tu línea en la central y darte solución inmediata, ¿me indicas tu *Nombre completo* o *Número de contrato*?`,
        'FALLA_INTERNET',
        'SOLICITAR_NOMBRE_PARA_DIAGNOSTICO'
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
        `🟢 *Tu módem está en línea con la central${potenciaTexto}.*\n\nSi experimentas lentitud o páginas que no abren, escribe *REINICIAR* para refrescar tu módem de forma remota, o escribe *ASESOR* para comunicarte con un técnico humano.`,
        'FALLA_INTERNET',
        'SMARTOLT_ONLINE_OPCION_TEXTO'
      );
      return;
    }

    // Fallback general
    await this.enviarYLoguear(
      phone,
      `No pudimos obtener una lectura automática de tu equipo en la central. Si deseas que enviemos una señal de reinicio escribe *REINICIAR*, o escribe *ASESOR* para que te atienda un técnico.`,
      'FALLA_INTERNET',
      'SMARTOLT_FALLBACK_TEXTO'
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
          step: 'ESPERANDO_PROBLEMA',
        });

        await this.enviarYLoguear(
          phone,
          `¡Perfecto, te he ubicado en el sistema! ✅\nBienvenido(a) *${c.nombre}*. Tu cuenta ha quedado vinculada a este chat.\n\nCuéntame, ¿cuál es el problema o consulta que presentas con tu servicio de internet?`,
          'IDENTIFICAR_CLIENTE',
          'VINCULADO_WISPHUB'
        );
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
        'NOMBRE_MEMORIZADO_TURSO'
      );
      return;
    }

    // 4. Si lo escrito es incomprensible, no nos quedamos en bucle: avanzamos al problema amablemente
    await this.enviarYLoguear(
      phone,
      `No te preocupes. ¿Cuál es el problema o consulta que tienes con tu servicio? Estoy aquí para ayudarte.`,
      'DESCONOCIDO',
      'CONTINUAR_SIN_NOMBRE'
    );
    await TursoService.updateStep(phone, 'ESPERANDO_PROBLEMA');
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
