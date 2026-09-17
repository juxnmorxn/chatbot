import { formatDisplayName } from '../orchestrator/bot.orchestrator';
import { GroqService } from '../services/groq.service';

async function testConversationalTone() {
  console.log('--- 1. Pruebas de Limpieza de Nombre (formatDisplayName) ---');
  const testNames = [
    '696-Maria del Pilar Perez Mendoza',
    '0696-CARLOS RAMIREZ',
    '715-Maria del Pilar Perez Mendoza',
    'JUAN MANUEL LOPEZ GOMEZ',
    '1234 - Ana Laura Sanchez',
  ];

  for (const raw of testNames) {
    console.log(`Original: "${raw}" -> Limpio corto: "${formatDisplayName(raw, true)}" | Completo: "${formatDisplayName(raw, false)}"`);
  }

  console.log('\n--- 2. Pruebas de Respuesta Conversacional Groq (Tono Natural y Guardrails) ---');
  const respuesta = await GroqService.generarRespuestaConversacional(
    'Oye solo me falla el wifi en mi telefono cuando salgo al patio, me van a regalar un extensor o qué hago?',
    [],
    {
      clientName: 'Maria del Pilar',
      planInternet: 'Pakete Basic 40M',
      velocidadMegas: '40',
      precioPlan: '250.00',
    }
  );

  console.log('\nRespuesta generada por Groq:\n' + respuesta);
}

testConversationalTone().catch(console.error);
