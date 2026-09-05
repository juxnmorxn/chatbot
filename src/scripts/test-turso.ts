import { initTursoDatabase, getTursoClient } from '../database/turso';
import { TursoService } from '../services/turso.service';

async function testTurso() {
  console.log('--- Iniciando prueba de conexión con Turso DB ---');
  await initTursoDatabase();

  const testPhone = '5215500000001';
  console.log(`Guardando sesión de prueba para: ${testPhone}`);

  const saved = await TursoService.upsertSession({
    phone: testPhone,
    step: 'MENU_PRINCIPAL',
    client_id: 'CLI-999',
    client_name: 'Cliente Prueba Turso',
    onu_id: 'ONU-TEST-01',
    opt_out: 0,
  });

  console.log('Sesión guardada en Turso:', saved);

  const retrieved = await TursoService.getSession(testPhone);
  console.log('Sesión recuperada desde Turso:', retrieved);

  if (retrieved && retrieved.client_name === 'Cliente Prueba Turso') {
    console.log('✅ ¡Prueba de Turso superada con éxito!');
  } else {
    console.error('❌ Error: Los datos recuperados no coinciden.');
  }

  process.exit(0);
}

testTurso().catch((err) => {
  console.error('Fallo en test de Turso:', err);
  process.exit(1);
});
