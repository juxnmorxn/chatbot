import Groq, { toFile } from 'groq-sdk';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('GroqService');

export type BotIntent =
  | 'SALUDO'
  | 'CONSULTAR_NIVELES'
  | 'CONSULTAR_SALDO'
  | 'CONSULTAR_PLAN'
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
  sin_internet_total: boolean;
  red_wifi_no_visible: boolean;
  bloqueo_paginas_apps: boolean;
  ya_reinicio: boolean;
  nombre_mencionado: string | null;
  telefono_mencionado: string | null;
  resumen_queja: string;
}

export interface ContratoInstalacionDatos {
  folio: string | null;
  cliente: string | null;
  sn: string | null;
  modelo: string | null;
  paquete: string | null;
  direccion: string | null;
  colonia: string | null;
  municipio_zona: string | null;
  telefono: string | null;
  wifi_password: string | null;
}

export interface ActivacionModificacionesParsed {
  nuevo_nombre?: string | null;
  nuevo_folio?: string | null;
  nueva_zona?: string | null;
  nuevo_plan?: string | null;
  nuevo_sn?: string | null;
  confirmar?: boolean;
  cancelar?: boolean;
}

export interface GroqImageAnalysisResult {
  tipo: 'COMPROBANTE_PAGO' | 'SPEEDTEST' | 'MODEM_LUCES' | 'CONTRATO_INSTALACION' | 'OTRO';
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
    concepto: string | null;
    destinatario: string | null;
    fecha: string | null;
  };
  datos_contrato?: ContratoInstalacionDatos;
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
   * Analiza una imagen enviada por WhatsApp (foto de contrato, comprobante, speedtest o luces de módem)
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
Eres un analista visual experto en telecomunicaciones e ISP (CloudWare MX).
Tu objetivo es examinar la imagen recibida y clasificarla estrictamente en una de estas categorías:

1. "CONTRATO_INSTALACION":
   - Foto o documento de carátula de contrato / suscripción de servicio de internet, comodato de equipo o formato de instalación.
   - Extrae con máxima fidelidad:
     * folio: número de folio del contrato (ej: "2977" en FOLIO:2977).
     * cliente: Nombre completo del suscriptor/titular (ej: "Enrique Mejía Evaristo").
     * modelo: Modelo del equipo si aparece (ej: "EG8041V5", "HG8145X6-10", "HG8145V5", "ZTE-F660", etc.).
     * paquete: Paquete marcado con X o seleccionado (ej: "40 MB", "60 MB", "200 MB", "400 MB", "600 MB").
     * direccion: Calle y número exterior/interior (ej: "carretera salida a la estancia s/n").
     * colonia: Colonia o localidad anotada (ej: "Eulalio Ángeles Martínez", "Ojo de Agua", "El Meje", "El Arenal", "Centro").
     * municipio_zona: Municipio o zona de instalación (ej: "Actopan", "El Arenal", "San Agustín Tlaxiaca", "San José", "Santiago de Anaya").
     * telefono: Número de teléfono fijo o móvil (ej: "7721891087").
     * wifi_password: Clave o contraseña anotada (ej: "BZ6yMmYE").
     * sn: null (el número de serie será capturado manualmente por el técnico).

2. "SPEEDTEST":
   - Captura de pantalla de test de velocidad (Speedtest por Ookla, Fast.com, Google Speedtest, etc.).
   - Extrae con máxima precisión:
     * bajada_mbps: Velocidad de descarga en Mbps (ej: 205.94).
     * subida_mbps: Velocidad de subida en Mbps SÓLO SI existe una medición explícita de "SUBIDA" / "UPLOAD". Si en la pantalla SOLO se realizó la prueba de descarga (muy habitual en speedtest.net móvil) o no hay indicador de subida, asigna estrictamente null.
     * ping_ms: Latencia principal de Ping en ms (ej: 6).
   - ¡CUIDADO CON SPEEDTEST MÓVIL!: Debajo de "Ping ms" suelen aparecer íconos como ⚡ 6, ⬇️ 14 y ⬆️ 20. ¡ESTOS NÚMEROS JUNTO A LAS FLECHAS ⬇️ Y ⬆️ SON VALORES DE LATENCIA / BUFFERBLOAT EN MILISEGUNDOS (ms), NO SON VELOCIDAD DE SUBIDA! Nunca los asignes a subida_mbps.

3. "COMPROBANTE_PAGO":
   - Recibo o captura de pantalla de transferencia bancaria (BBVA / Dimo, BanCoppel, Santander, Banamex, Banco Azteca, Mercado Pago, Nu, SPEI), ticket de OXXO / 7-Eleven, o ficha de depósito.
   - Extrae con máxima fidelidad:
     * monto: Monto numérico transferido (ej: "300.00").
     * banco: Banco o app emisora (ej: "BBVA", "Mercado Pago", "BanCoppel", "SPEI").
     * referencia: Folio de operación, clave de rastreo o número de autorización (ej: "0087066090").
     * concepto: Texto exacto colocado en el campo "Concepto" o "Motivo de pago" (ej: "ISRAEL PONCE ORTIZ", "Internet casa", "pago mensual").
     * destinatario: Nombre o cuenta de la persona que recibe (ej: "Osbaldo T").
     * fecha: Fecha y hora de la operación (ej: "20 sep 2026, 22:44 h.").

4. "MODEM_LUCES":
   - Foto de un módem / router / ONT de fibra óptica.
   - foco_rojo = true si observas algún LED rojo (foco LOS parpadeando en rojo o alarma).
   - equipo_apagado = true si el equipo no tiene ninguna luz encendida (apagado total).
   - luces_verdes = true si las luces principales (PON, POWER, LAN, WLAN) se ven en verde o azul normal.

5. "OTRO":
   - Cualquier otra imagen que no pertenezca a las categorías anteriores.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "tipo": "CONTRATO_INSTALACION" | "COMPROBANTE_PAGO" | "SPEEDTEST" | "MODEM_LUCES" | "OTRO",
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
    "concepto": string | null,
    "destinatario": string | null,
    "fecha": string | null
  },
  "datos_contrato": {
    "folio": string | null,
    "cliente": string | null,
    "sn": string | null,
    "modelo": string | null,
    "paquete": string | null,
    "direccion": string | null,
    "colonia": string | null,
    "municipio_zona": string | null,
    "telefono": string | null,
    "wifi_password": string | null
  }
}
`.trim();

      const response = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        max_tokens: 350,
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
        datos_pago: parsed.datos_pago || { monto: null, banco: null, referencia: null, concepto: null, destinatario: null, fecha: null },
        datos_contrato: parsed.datos_contrato || undefined,
      };
    } catch (error: any) {
      logger.warn('Error al analizar imagen con Groq Vision:', error?.message || error);
      return {
        tipo: 'OTRO',
        descripcion: 'Imagen adjunta recibida',
        foco_rojo: false,
        equipo_apagado: false,
        luces_verdes: true,
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
6. REGLA ESTRICTA DE PLANES, VELOCIDADES Y TEST DE VELOCIDAD:
   - Si el usuario pregunta cuál es su velocidad, qué plan tiene o reporta que siente el servicio lento, infórmale con EXACTITUD los datos de su registro oficial: "${contexto?.planInternet || 'tu plan contratado'}" (${contexto?.velocidadMegas ? contexto.velocidadMegas + ' Mbps' : 'velocidad contratada'}).
   - SIEMPRE que sugieras o hables de medir la velocidad o hacer un test, proporciona el enlace directo: https://www.speedtest.net recomendándole realizarlo cerca del módem.
   - NUNCA inventes o hallucines velocidades o planes diferentes a los indicados en el Contexto del usuario.
7. REGLA ESTRICTA DE NO PROMESAS COMERCIALES / EXTENSORES:
   - NUNCA prometas regalos, visitas técnicas gratuitas no programadas, descuentos, ni venta o entrega de extensores de rango (repetidores Wi-Fi) o nuevos módems.
   - Brinda asistencia técnica orientada a mejores prácticas (acercarse al módem, reconectar Wi-Fi, etc.) sin prometer equipos adicionales.
8. REGLA ESTRICTA DE PRIVACIDAD TÉCNICA (NIVELES / dBm):
   - NUNCA menciones números técnicos de decibeles o potencia óptica (ej. "-19.4 dBm", "-22 dBm") al cliente final ni uses lenguaje frío ("en la central", "en el sistema").
   - Explícale en lenguaje comercial amable que su línea y señal se encuentran en estado óptimo y estable.
9. Contexto del usuario:
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
- "CONSULTAR_PLAN": Preguntas sobre qué plan tiene contratado, qué velocidad tiene, cuál debería ser su velocidad, cuántos megas le corresponden, costo mensual del paquete ("cuál es mi velocidad", "qué plan tengo", "cuál debería ser mi velocidad", "cuántos megas tengo", "qué paquete tengo", "cuánto cuesta mi plan", "información de mi plan", "qué velocidad tengo contratada").
- "REPORTAR_PAGO": Mensajes donde el cliente indica que ya realizó su pago, transfirió dinero o envía comprobante.
- "FALLA_INTERNET": Cualquier reporte de falla de internet, lentitud, intermitencia, desconexión, "no tengo internet", "no da internet", "sigue sin internet", "se cayó el servicio", páginas que no cargan o luces rojas.
- "REINICIAR_MODEM": Peticiones explícitas de reinicio remoto de módem ("reinicien mi modem", "pueden resetearlo desde allá").
- "DATOS_WIFI": Solicitud EXCLUSIVA para cambiar o consultar la contraseña/clave del WiFi o nombre SSID de la red ("cambiar contraseña", "cambio de clave wifi", "cuál es mi contraseña"). NUNCA usar para quejas o fallas como "no tengo wifi", "no hay wifi", "se fue el wifi", "no me conecta el wifi" o "falla el wifi" (esas son SIEMPRE "FALLA_INTERNET").
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
- "sin_internet_total": true si dice que NO TIENE INTERNET, no da internet, sin internet, se cayó el internet, no navega nada o corte total; false si no.
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
      const sinInternetTotal = Boolean(parsed.sin_internet_total);
      const focoRojo = Boolean(parsed.foco_rojo);
      const equipoApagado = Boolean(parsed.equipo_apagado);
      const redWifiNoVisible = Boolean(parsed.red_wifi_no_visible);
      const bloqueoPaginas = Boolean(parsed.bloqueo_paginas_apps);

      if ((reportaLentitud || sinInternetTotal || focoRojo || equipoApagado || redWifiNoVisible || bloqueoPaginas) && (finalIntent === 'DESCONOCIDO' || finalIntent === 'IDENTIFICAR_CLIENTE' || finalIntent === 'SALUDO')) {
        finalIntent = 'FALLA_INTERNET';
      }

      return {
        intencion: finalIntent,
        foco_rojo: focoRojo,
        equipo_apagado: equipoApagado,
        reporta_lentitud: reportaLentitud,
        sin_internet_total: sinInternetTotal,
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
      sin_internet_total: lower.includes('no tengo internet') || lower.includes('sin internet') || lower.includes('no da internet') || lower.includes('sin conexion') || lower.includes('sin conexión'),
      red_wifi_no_visible: lower.includes('no aparece') || lower.includes('no sale mi') || lower.includes('no veo mi red') || lower.includes('se borro') || lower.includes('wlan'),
      bloqueo_paginas_apps: lower.includes('no abre') || lower.includes('no abren') || lower.includes('ciertas paginas') || lower.includes('algunas paginas') || lower.includes('portal cautivo') || lower.includes('bloquea'),
      ya_reinicio: lower.includes('ya reinicie') || lower.includes('ya lo apague'),
      nombre_mencionado: null,
      telefono_mencionado: null,
      resumen_queja: text.slice(0, 50),
    };
  }

  /**
   * Extrae modificaciones de parámetros de activación (nombre, folio, zona, plan, SN)
   * o confirmación/cancelación desde texto conversacional utilizando Groq.
   */
  static async extraerModificacionesActivacion(texto: string): Promise<ActivacionModificacionesParsed> {
    try {
      const groq = this.getClient();
      const systemPrompt = `
Eres un asistente que analiza mensajes de técnicos de telecomunicaciones en campo durante la activación o modificación de un módem.
El técnico puede solicitar modificar parámetros de la activación en curso o confirmar/cancelar.
Parámetros posibles a extraer:
- "nuevo_nombre": Si el técnico pide cambiar o corregir el nombre del cliente (ej: "cambiar nombre a Pedro Gómez", "el nombre es Pedro Gómez", "ponle Pedro Gómez", "nombre Pedro Gómez"). Devuelve SOLO el nombre de la persona (sin el folio).
- "nuevo_folio": Si el técnico pide cambiar o corregir el folio (ej: "cambiar folio 2980", "el folio es 2980", "folio: 2980", "folio 3012"). Devuelve SOLO el número o código de folio.
- "nueva_zona": Si pide cambiar la zona o municipio (ej: "cambiar zona a El Arenal", "es en El Arenal", "zona Actopan", "San Agustín", "San José").
- "nuevo_plan": Si pide cambiar el paquete o megas (ej: "cambiar a 60 megas", "plan 100", "paquete 40m", "60 megas"). Devuelve ej: "60M" o "60 Megas".
- "nuevo_sn": Si proporciona o cambia la serie o terminación SN del módem (ej: "474B4484", "serie 474B4484", "sn 474B4484", "el módem es 474B4484", "686173B6"). Devuelve el código alfanumérico limpio.
- "confirmar": true si el mensaje es una confirmación para autorizar/activar (ej: "sí", "si", "confirmar", "activar", "adelante", "dale", "ok", "listo").
- "cancelar": true si solicita cancelar o abortar (ej: "no", "cancelar", "cancela", "abortar", "rechazar").

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "nuevo_nombre": string | null,
  "nuevo_folio": string | null,
  "nueva_zona": string | null,
  "nuevo_plan": string | null,
  "nuevo_sn": string | null,
  "confirmar": boolean,
  "cancelar": boolean
}
`.trim();

      const response = await groq.chat.completions.create({
        model: SettingsService.get('GROQ_MODEL', 'GROQ_MODEL', config.groq.model),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: texto },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return {};
      return JSON.parse(content) as ActivacionModificacionesParsed;
    } catch (error: any) {
      logger.warn('Error al extraer modificaciones con Groq:', error?.message || error);
      return {};
    }
  }
}
