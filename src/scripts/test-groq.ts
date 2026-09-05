import { GroqService } from '../services/groq.service';

async function testGroq() {
  console.log('--- Iniciando prueba de clasificación con Groq (Llama 3.1) ---');

  const testCases = [
    'hola buenas tardes me podrian ayudar',
    'oigan tengo una luz roja parpadeando en el modem y no cargan mis paginas',
    'cuanto es de mi recibo este mes donde puedo pagar',
    'ya reinicie el equipo dos veces y sigue sin dar internet',
    'ya no quiero que me manden mensajes cancelar suscripcion por favor',
  ];

  for (const texto of testCases) {
    console.log(`\nProbando texto: "${texto}"`);
    const resultado = await GroqService.clasificarMensaje(texto);
    console.log('Resultado JSON:', JSON.stringify(resultado, null, 2));
  }

  console.log('\n✅ ¡Prueba de Groq finalizada exitosamente!');
  process.exit(0);
}

testGroq().catch((err) => {
  console.error('Fallo en test de Groq:', err);
  process.exit(1);
});
