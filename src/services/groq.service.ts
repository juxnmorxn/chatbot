import Groq from 'groq-sdk';
import { config } from '../config/env';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('GroqService');

export type BotIntent =
  | 'SALUDO'
  | 'CONSULTAR_SALDO'
  | 'REPORTAR_PAGO'
  | 'FALLA_INTERNET'
  | 'REINICIAR_MODEM'
  | 'DATOS_WIFI'
  | 'HABLAR_HUMANO'
  | 'CANCELAR_SUSCRIPCION'
  | 'IDENTIFICAR_CLIENTE'
  | 'DESCONOCIDO';

export interface GroqClassificationResult {
  intencion: BotIntent;
  foco_rojo: boolean;
  equipo_apagado: boolean;
  reporta_lentitud: boolean;
  ya_reinicio: boolean;
  nombre_mencionado: string | null;
  telefono_mencionado: string | null;
  resumen_queja: string;
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
   * Genera una respuesta conversacional natural y empática para el cliente de CloudWareMx
   * utilizando Groq (Llama 3.1) con memoria del diálogo reciente.
   */
  static async generarRespuestaConversacional(
    mensajeUsuario: string,
    historial: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    contexto?: { clientName?: string | null; ispName?: string }
  ): Promise<string> {
    try {
      const groq = this.getClient();
      const ispName = contexto?.ispName || 'CloudWareMx';
      const clienteTexto = contexto?.clientName
        ? `El cliente se llama: ${contexto.clientName}.`
        : 'Aún no sabemos el nombre del cliente (si se presenta o dice su nombre, recuérdalo y salúdalo amablemente por su nombre).';

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
6. Contexto del usuario:
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
- "CONSULTAR_SALDO": Preguntas sobre saldo pendiente, recibo, factura, cuánto debo, fecha límite de pago o dónde pagar.
- "REPORTAR_PAGO": Mensajes donde el cliente indica que ya realizó su pago, transfirió dinero o envía comprobante.
- "FALLA_INTERNET": Cualquier reporte de falla de internet, lentitud, intermitencia, desconexión, "no tengo internet", "no da internet", "sigue sin internet", "se cayó el servicio", páginas que no cargan o luces rojas.
- "REINICIAR_MODEM": Peticiones explícitas de reinicio remoto de módem ("reinicien mi modem", "pueden resetearlo desde allá").
- "DATOS_WIFI": Consultas sobre contraseña, nombre de la red WiFi o configuración inalámbrica.
- "HABLAR_HUMANO": Solicitudes de comunicarse con un asesor, operador, recepcionista o persona humana.
- "CANCELAR_SUSCRIPCION": Peticiones de no recibir más mensajes automáticos, "cancelar", "baja", "ya no me envíen mensajes".
- "IDENTIFICAR_CLIENTE": Cuando el usuario provee su nombre (incluso si solo envía una palabra como "Juan", "Carlos", "María López", o "soy Juan"), número de contrato o ID de servicio. Si el paso actual es "ESPERANDO_IDENTIFICACION" y el usuario envía un texto, asume casi siempre "IDENTIFICAR_CLIENTE" a menos que sea un saludo o queja explícita.
- "DESCONOCIDO": Mensajes incoherentes, bromas, temas ajenos al servicio de telecomunicaciones o dudas no contempladas.

EXTRACCIÓN DE BANDERAS Y DETALLES:
- "foco_rojo": true si menciona foco rojo, luz roja, led rojo, LOS parpadeando o luz de alarma en el módem/ONU; false si no.
- "equipo_apagado": true si dice que el módem no prende, se fue la luz en la casa, o no encienden las luces del equipo; false si no.
- "reporta_lentitud": true si dice que el internet está lento, intermitente, sube y baja o hay lag; false si no.
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
      return {
        intencion: parsed.intencion || 'DESCONOCIDO',
        foco_rojo: Boolean(parsed.foco_rojo),
        equipo_apagado: Boolean(parsed.equipo_apagado),
        reporta_lentitud: Boolean(parsed.reporta_lentitud),
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
    } else if (lower.includes('no tengo internet') || lower.includes('sin señal') || lower.includes('falla') || lower.includes('lento')) {
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
      ya_reinicio: lower.includes('ya reinicie') || lower.includes('ya lo apague'),
      nombre_mencionado: null,
      telefono_mencionado: null,
      resumen_queja: text.slice(0, 40),
    };
  }
}
