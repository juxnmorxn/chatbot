import Groq, { toFile } from 'groq-sdk';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('GroqService');

export type BotIntent =
  | 'SALUDO'
  | 'CONSULTAR_NIVELES'
  | 'CONSULTAR_SALDO'
  | 'REPORTAR_PAGO'
  | 'FALLA_INTERNET'
  | 'REINICIAR_MODEM'
  | 'DATOS_WIFI'
  | 'HABLAR_HUMANO'
  | 'CAMBIO_DOMICILIO'
  | 'ESTATUS_TECNICO_AGENDA'
  | 'CANCELAR_SUSCRIPCION'
  | 'IDENTIFICAR_CLIENTE'
  | 'DESCONOCIDO';

export interface GroqClassificationResult {
  intencion: BotIntent;
  foco_rojo: boolean;
  equipo_apagado: boolean;
  reporta_lentitud: boolean;
  red_wifi_no_visible: boolean;
  bloqueo_paginas_apps: boolean;
  ya_reinicio: boolean;
  nombre_mencionado: string | null;
  telefono_mencionado: string | null;
  resumen_queja: string;
}

export interface GroqImageAnalysisResult {
  tipo: 'COMPROBANTE_PAGO' | 'SPEEDTEST' | 'MODEM_LUCES' | 'OTRO';
  descripcion: string;
  foco_rojo: boolean;
  equipo_apagado: boolean;
  luces_verdes: boolean;
  speedtest?: {
    bajada_mbps: number | null;
    subida_mbps: number | null;
    ping_ms: number | null;
  };
  datos_pago?: {
    monto: string | null;
    banco: string | null;
    referencia: string | null;
    fecha: string | null;
  };
}

export class GroqService {
  private static client: Groq | null = null;
  private static lastApiKey: string = '';

  private static getClient(): Groq {
    const apiKey = SettingsService.get('GROQ_API_KEY', 'GROQ_API_KEY', config.groq.apiKey);
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no configurada');
    }
    if (!this.client || this.lastApiKey !== apiKey) {
      this.lastApiKey = apiKey;
      this.client = new Groq({ apiKey });
    }
    return this.client;
  }

  /**
   * Analiza una imagen enviada por WhatsApp (foto de comprobante, speedtest o luces de módem)
   * utilizando el modelo de visión de Groq (qwen/qwen3.8-27b).
   */
  static async analizarImagen(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<GroqImageAnalysisResult> {
    try {
      const groq = this.getClient();
      const base64 = imageBuffer.toString('base64');
      const cleanMime = mimeType.split(';')[0].trim() || 'image/jpeg';
      const dataUri = `data:${cleanMime};base64,${base64}`;

      logger.info(`Analizando imagen con Groq Vision (${imageBuffer.length} bytes, ${cleanMime})...`);

      const systemPrompt = `
Eres un analista visual experto en soporte técnico de un proveedor de servicios de internet (ISP).
Tu objetivo es examinar la imagen enviada por el cliente y clasificarla estrictamente en una de estas categorías:

1. "SPEEDTEST":
   - Captura de pantalla de test de velocidad (Speedtest por Ookla, Fast.com, Google Speedtest, etc.).
   - Extrae con precisión: velocidad de descarga en Mbps (bajada_mbps), velocidad de subida en Mbps (subida_mbps), y latencia (ping_ms) si son legibles.

2. "COMPROBANTE_PAGO":
   - Recibo o captura de transferencia bancaria (BBVA, Banamex, Santander, Mercado Pago, Nu, etc.), ticket de OXXO / 7-Eleven, o ficha de depósito.
   - Extrae monto ($), banco/emisor, folio o referencia, y fecha si son legibles.

3. "MODEM_LUCES":
   - Foto de un módem / router / ONT (modelos Huawei EG8145V5, HG8245H, OptiXstar, x6, v5, etc., o cualquier equipo de fibra).
   - foco_rojo = true si observas algún LED rojo (foco LOS parpadeando en rojo o alarma).
   - equipo_apagado = true si el equipo no tiene ninguna luz encendida (apagado total).
   - luces_verdes = true si las luces principales (PON, POWER, LAN, WLAN) se ven en verde o azul normal.

4. "OTRO":
   - Cualquier otra imagen que no pertenezca a las categorías anteriores.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "tipo": "COMPROBANTE_PAGO" | "SPEEDTEST" | "MODEM_LUCES" | "OTRO",
  "descripcion": "resumen en 1 oración de lo que se ve en la foto",
  "foco_rojo": boolean,
  "equipo_apagado": boolean,
  "luces_verdes": boolean,
  "speedtest": {
    "bajada_mbps": number | null,
    "subida_mbps": number | null,
    "ping_ms": number | null
  },
  "datos_pago": {
    "monto": string | null,
    "banco": string | null,
    "referencia": string | null,
    "fecha": string | null
  }
}
`.trim();

      const response = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Groq Vision devolvió contenido vacío');
      }

      const parsed = JSON.parse(content) as GroqImageAnalysisResult;
      logger.info(`[Groq Vision] Imagen clasificada como "${parsed.tipo}": ${parsed.descripcion}`);

      return {
        tipo: parsed.tipo || 'OTRO',
        descripcion: parsed.descripcion || 'Imagen recibida',
        foco_rojo: Boolean(parsed.foco_rojo),
        equipo_apagado: Boolean(parsed.equipo_apagado),
        luces_verdes: Boolean(parsed.luces_verdes),
        speedtest: parsed.speedtest || { bajada_mbps: null, subida_mbps: null, ping_ms: null },
        datos_pago: parsed.datos_pago || { monto: null, banco: null, referencia: null, fecha: null },
      };
    } catch (error: any) {
      logger.warn('Error al analizar imagen con Groq Vision:', error?.message || error);
      return {
        tipo: 'OTRO',
        descripcion: 'Imagen adjunta recibida',
        foco_rojo: false,
        equipo_apagado: false,
        luces_verdes: false,
        speedtest: { bajada_mbps: null, subida_mbps: null, ping_ms: null },
        datos_pago: { monto: null, banco: null, referencia: null, fecha: null },
      };
    }
  }

  /**
   * Transcribe una nota de voz o audio de WhatsApp a texto utilizando Groq Whisper (whisper-large-v3-turbo).
   * 100% Gratuito y de ultra baja latencia.
   */
  static async transcribirAudio(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<string> {
    try {
      const groq = this.getClient();
      const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : (mimeType.includes('mp3') ? 'mp3' : 'ogg');
      const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

      logger.info(`Transcribiendo audio de WhatsApp (${audioBuffer.length} bytes, ${mimeType}) con Groq Whisper...`);
      const transcription = await groq.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        language: 'es',
        temperature: 0.0,
      });

      const text = (transcription.text || '').trim();
      logger.info(`[Groq Whisper] Transcripción completada: "${text}"`);
      return text;
    } catch (error: any) {
      logger.error('Error al transcribir audio con Groq Whisper:', error?.message || error);
      return '';
    }
  }

  /**
   * Genera una respuesta conversacional natural y empática para el cliente de CloudWareMx
   * utilizando Groq (Llama 3.1) con memoria del diálogo reciente.
   */
  static async generarRespuestaConversacional(
    mensajeUsuario: string,
    historial: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    contexto?: {
      clientName?: string | null;
      ispName?: string;
      planInternet?: string | null;
      precioPlan?: string | null;
      velocidadMegas?: number | string | null;
      ip?: string | null;
      estadoServicio?: string | null;
      infoOlt?: string | null;
    }
  ): Promise<string> {
    try {
      const groq = this.getClient();
      const ispName = contexto?.ispName || 'CloudWareMx';
      
      let clienteTexto = contexto?.clientName
        ? `El cliente se llama: ${contexto.clientName}.`
        : 'Aún no sabemos el nombre del cliente (si se presenta o dice su nombre, recuérdalo y salúdalo amablemente por su nombre).';

      if (contexto?.planInternet) {
        clienteTexto += `\n- Paquete / Plan contratado: ${contexto.planInternet}`;
      }
      if (contexto?.velocidadMegas) {
        clienteTexto += `\n- Velocidad oficial contratada: ${contexto.velocidadMegas} Mbps (Megas de descarga)`;
      }
      if (contexto?.precioPlan) {
        clienteTexto += `\n- Mensualidad: $${contexto.precioPlan} MXN`;
      }
      if (contexto?.estadoServicio) {
        clienteTexto += `\n- Estado en el sistema: ${contexto.estadoServicio}`;
      }
      if (contexto?.ip) {
        clienteTexto += `\n- IP asignada: ${contexto.ip}`;
      }
      if (contexto?.infoOlt) {
        clienteTexto += `\n- Estado de conexión SmartOLT: ${contexto.infoOlt}`;
      }

      const systemPrompt = `
Eres el asistente virtual inteligente de soporte técnico y atención a clientes de "${ispName}", una empresa proveedora de servicios de internet de fibra óptica de alta velocidad y telecomunicaciones.

Tu personalidad:
- Eres amable, empático, resolutivo, claro y profesional.
- Hablas en español cotidiano, educado y cercano.
- Respondes de forma concisa y natural, ideal para mensajería de WhatsApp (evita párrafos excesivamente largos o respuestas acartonadas).
- Puedes usar emojis adecuados de forma agradable (👋, 📶, 💡, 🛠️, etc.).

Objetivo y comportamiento:
1. Responde de forma libre y conversacional directamente a lo que el usuario pregunte o diga. No dependas de números forzados ni menús estáticos.
2. Si el usuario saluda ("Hola", "Buenas tardes"), respóndele con un saludo cálido dándole la bienvenida a ${ispName} y pregúntale en qué le puedes apoyar hoy con su servicio.
3. Si el usuario te indica su nombre (ej. "Me llamo Ricardo", "Soy Carlos", o solo "Ricardo"), salúdalo cordialmente por su nombre y dile que con gusto le atiendes.
4. Si el usuario reporta una falla de internet (ej. "no tengo internet", "está muy lento", "foco rojo", "parpadea LOS", "el módem no prende"):
   - Sé empático y dale pasos sencillos y claros de revisión rápida (ej. verificar que el módem esté conectado a la luz, que el cable de fibra amarillo no esté doblado, o reiniciar desconectando de la corriente por 30 segundos).
   - Indícale que si el problema persiste o si tiene foco rojo (corte de fibra), con gusto canalizamos el reporte técnico para que la cuadrilla lo revise.
5. Si el usuario pregunta por pagos, saldos o contratación, oriéntalo con amabilidad.
6. REGLA ESTRICTA DE PLANES Y VELOCIDADES:
   - Si el usuario pregunta cuál es o cuál debería ser su velocidad, o qué plan tiene contratado, infórmale con EXACTITUD los datos de su registro oficial: "${contexto?.planInternet || 'tu plan contratado'}" (${contexto?.velocidadMegas ? contexto.velocidadMegas + ' Mbps' : 'velocidad contratada'}).
   - NUNCA inventes o hallucines velocidades o planes diferentes a los indicados en el Contexto del usuario.
7. REGLA ESTRICTA DE PRIVACIDAD TÉCNICA (NIVELES / dBm):
   - NUNCA menciones números técnicos de decibeles o potencia óptica (ej. "-19.4 dBm", "-22 dBm") al cliente final. Esos valores son de diagnóstico técnico confidencial del NOC e ingeniería.
   - Si el cliente pregunta por sus niveles de señal o potencia, explícale en lenguaje comercial amable que su línea y señal de fibra se encuentran en estado óptimo y completamente estable con la central.
8. Contexto del usuario:
${clienteTexto}

¡Responde de inmediato al último mensaje del usuario!
`.trim();

      const model = SettingsService.get('GROQ_MODEL', 'GROQ_MODEL', config.groq.model);

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Añadir hasta los últimos 6 mensajes para contexto conversacional
      const historialSlice = historial.slice(-6);
      for (const h of historialSlice) {
        if (h.content && h.content.trim()) {
          messages.push({
            role: h.role,
            content: h.content.trim(),
          });
        }
      }

      // Añadir el mensaje actual
      messages.push({
        role: 'user',
        content: mensajeUsuario,
      });

      const response = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 350,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error('Groq respondió con contenido vacío');
      }

      return reply;
    } catch (error: any) {
      logger.error('Error al generar respuesta conversacional con Groq:', error?.message || error);
      return `¡Hola! Bienvenido al centro de atención de ${contexto?.ispName || 'CloudWareMx'}. ¿En qué podemos ayudarte hoy con tu servicio de internet?`;
    }
  }


  /**
   * Traduce el mensaje de texto libre del usuario en un JSON estructurado.
   * La IA NUNCA le responde al usuario; sólo traduce la intención.
   */
  static async clasificarMensaje(
    mensajeUsuario: string,
    contexto?: { clientName?: string | null; currentStep?: string }
  ): Promise<GroqClassificationResult> {
    try {
      const groq = this.getClient();

      const systemPrompt = `
Eres un clasificador y extractor de intenciones de alta precisión para el chatbot de WhatsApp de un proveedor de internet (ISP).
Tu ÚNICA tarea es analizar el mensaje del usuario (incluso si tiene faltas de ortografía, abreviaciones, modismos o frases largas) y responder con un JSON VÁLIDO.
NUNCA respondas con texto conversacional. NUNCA respondas al usuario directamente. SÓLO DEVUELVE EL OBJETO JSON.

CATEGORÍAS DE INTENCIÓN PERMITIDAS (Elige EXACTAMENTE una de esta lista):
- "SALUDO": Cualquier saludo ("hola", "buenas tardes", "buen dia", "hola qué tal", "hola me pueden ayudar", "saludos", "hola disculpe").
- "CONSULTAR_NIVELES": Preguntas sobre niveles de señal, potencia óptica, dBm, decibeles, potencia de luz, estado de la fibra o señal ("cuáles son mis niveles", "dime mis niveles", "mis dBm", "cómo andan mis niveles", "qué nivel tengo", "revisa mis niveles", "cómo está mi señal", "revisa mi conexión").
- "CONSULTAR_SALDO": Preguntas sobre saldo pendiente, recibo, factura, cuánto debo, fecha límite de pago o dónde pagar.
- "REPORTAR_PAGO": Mensajes donde el cliente indica que ya realizó su pago, transfirió dinero o envía comprobante.
- "FALLA_INTERNET": Cualquier reporte de falla de internet, lentitud, intermitencia, desconexión, "no tengo internet", "no da internet", "sigue sin internet", "se cayó el servicio", páginas que no cargan o luces rojas.
- "REINICIAR_MODEM": Peticiones explícitas de reinicio remoto de módem ("reinicien mi modem", "pueden resetearlo desde allá").
- "DATOS_WIFI": Consultas sobre contraseña, nombre de la red WiFi o configuración inalámbrica.
- "HABLAR_HUMANO": Solicitudes de comunicarse con un asesor, operador, recepcionista o persona humana.
- "CAMBIO_DOMICILIO": Peticiones de cambio de casa, mudanza, mover el servicio a otra dirección o validar cobertura en un nuevo domicilio ("me voy a cambiar de casa", "cambio de domicilio", "quiero mover mi servicio a otra casa", "tienen cobertura en la calle X").
- "ESTATUS_TECNICO_AGENDA": Preguntas sobre la hora de llegada del técnico, reagendar citas, cancelaciones de visita técnica o quejas sobre el instalador ("a qué hora viene el técnico", "cuándo viene la cuadrilla", "el técnico no vino", "quiero cambiar la fecha de la cita").
- "CANCELAR_SUSCRIPCION": Peticiones de no recibir más mensajes automáticos, "cancelar", "baja", "ya no me envíen mensajes".
- "IDENTIFICAR_CLIENTE": Cuando el usuario provee su nombre (incluso si solo envía una palabra como "Juan", "Carlos", "María López", o "soy Juan"), número de contrato o ID de servicio. Si el paso actual es "ESPERANDO_IDENTIFICACION" y el usuario envía un texto, asume casi siempre "IDENTIFICAR_CLIENTE" a menos que sea un saludo o queja explícita.
- "DESCONOCIDO": Mensajes incoherentes, bromas, temas ajenos al servicio de telecomunicaciones o dudas no contempladas.

EXTRACCIÓN DE BANDERAS Y DETALLES:
- "foco_rojo": true si menciona foco rojo, luz roja, led rojo, LOS parpadeando o luz de alarma en el módem/ONU; false si no.
- "equipo_apagado": true si dice que el módem no prende, se fue la luz en la casa, o no encienden las luces del equipo; false si no.
- "reporta_lentitud": true si dice que el internet está lento, intermitente, sube y baja o hay lag; false si no.
- "red_wifi_no_visible": true si indica que no le aparece el nombre de su red Wi-Fi, no sale su red en el celular, no encuentra la red, se le borró el internet o no prende el foco de WLAN/Wi-Fi; false si no.
- "bloqueo_paginas_apps": true si indica que no le abren ciertas páginas web, no cargan aplicaciones específicas (ej. banco, Netflix, YouTube, Facebook), solo entra a WhatsApp, le sale pantalla de aviso/bloqueo de portal cautivo, o problemas de acceso a ciertos sitios; false si no.
- "ya_reinicio": true si el usuario aclara que ya lo desconectó, ya lo reinició o ya lo apagó y prendió; false si no.
- "nombre_mencionado": string con el nombre propio limpio y capitalizado (ej. si dice "me llamo Juan Manuel" -> "Juan Manuel", si dice "carlos" -> "Carlos"), o null si no menciona nombre.
- "telefono_mencionado": string de 10 dígitos si menciona algún número telefónico, o null.
- "resumen_queja": síntesis concisa en máximo 10 palabras de lo que el cliente está diciendo o preguntando (ej. "duda sobre horario de atención", "pregunta sobre cambio de domicilio", "problema de lentitud en streaming").

Contexto actual del cliente:
- Paso actual del bot: ${contexto?.currentStep || 'NINGUNO'}
- Nombre conocido: ${contexto?.clientName || 'NO IDENTIFICADO'}
`;

      const model = SettingsService.get('GROQ_MODEL', 'GROQ_MODEL', config.groq.model);
      const response = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensajeUsuario },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Groq respondió con contenido vacío');
      }

      const parsed = JSON.parse(content) as GroqClassificationResult;

      // Normalizaciones y validaciones por seguridad
      let finalIntent: BotIntent = parsed.intencion || 'DESCONOCIDO';
      const reportaLentitud = Boolean(parsed.reporta_lentitud);
      const focoRojo = Boolean(parsed.foco_rojo);
      const equipoApagado = Boolean(parsed.equipo_apagado);
      const redWifiNoVisible = Boolean(parsed.red_wifi_no_visible);
      const bloqueoPaginas = Boolean(parsed.bloqueo_paginas_apps);

      if ((reportaLentitud || focoRojo || equipoApagado || redWifiNoVisible || bloqueoPaginas) && (finalIntent === 'DESCONOCIDO' || finalIntent === 'IDENTIFICAR_CLIENTE' || finalIntent === 'SALUDO')) {
        finalIntent = 'FALLA_INTERNET';
      }

      return {
        intencion: finalIntent,
        foco_rojo: focoRojo,
        equipo_apagado: equipoApagado,
        reporta_lentitud: reportaLentitud,
        red_wifi_no_visible: redWifiNoVisible,
        bloqueo_paginas_apps: bloqueoPaginas,
        ya_reinicio: Boolean(parsed.ya_reinicio),
        nombre_mencionado: parsed.nombre_mencionado || null,
        telefono_mencionado: parsed.telefono_mencionado || null,
        resumen_queja: parsed.resumen_queja || mensajeUsuario.slice(0, 50),
      };
    } catch (error: any) {
      logger.error('Error al invocar Groq:', error?.message || error);

      // Fallback por expresiones regulares básicas si la API de Groq tuviera interrupción
      return this.fallbackClasificacionLocal(mensajeUsuario);
    }
  }

  /**
   * Mecanismo de contingencia local (Regex) si Groq no responde temporalmente
   */
  private static fallbackClasificacionLocal(text: string): GroqClassificationResult {
    const lower = text.toLowerCase();

    let intencion: BotIntent = 'DESCONOCIDO';
    if (lower.includes('hola') || lower.includes('buenos dias') || lower.includes('buenas tardes')) {
      intencion = 'SALUDO';
    } else if (lower.includes('saldo') || lower.includes('debo') || lower.includes('recibo') || lower.includes('pagar')) {
      intencion = 'CONSULTAR_SALDO';
    } else if (lower.includes('pague') || lower.includes('transferencia') || lower.includes('comprobante')) {
      intencion = 'REPORTAR_PAGO';
    } else if (lower.includes('cambio de domicilio') || lower.includes('cambiar de casa') || lower.includes('cobertura')) {
      intencion = 'CAMBIO_DOMICILIO';
    } else if (lower.includes('a que hora') || lower.includes('agenda') || lower.includes('tecnico no vino')) {
      intencion = 'ESTATUS_TECNICO_AGENDA';
    } else if (lower.includes('no tengo internet') || lower.includes('sin señal') || lower.includes('falla') || lower.includes('lento') || lower.includes('no abre')) {
      intencion = 'FALLA_INTERNET';
    } else if (lower.includes('reiniciar') || lower.includes('reset')) {
      intencion = 'REINICIAR_MODEM';
    } else if (lower.includes('asesor') || lower.includes('humano') || lower.includes('persona')) {
      intencion = 'HABLAR_HUMANO';
    } else if (lower.includes('cancelar') || lower.includes('baja') || lower.includes('no enviar')) {
      intencion = 'CANCELAR_SUSCRIPCION';
    }

    return {
      intencion,
      foco_rojo: lower.includes('foco rojo') || lower.includes('luz roja') || lower.includes('los'),
      equipo_apagado: lower.includes('apagado') || lower.includes('no prende') || lower.includes('sin luz'),
      reporta_lentitud: lower.includes('lento') || lower.includes('lentitud') || lower.includes('intermitente'),
      red_wifi_no_visible: lower.includes('no aparece') || lower.includes('no sale mi') || lower.includes('no veo mi red') || lower.includes('se borro') || lower.includes('wlan'),
      bloqueo_paginas_apps: lower.includes('no abre') || lower.includes('no abren') || lower.includes('ciertas paginas') || lower.includes('algunas paginas') || lower.includes('portal cautivo') || lower.includes('bloquea'),
      ya_reinicio: lower.includes('ya reinicie') || lower.includes('ya lo apague'),
      nombre_mencionado: null,
      telefono_mencionado: null,
      resumen_queja: text.slice(0, 50),
    };
  }
}
