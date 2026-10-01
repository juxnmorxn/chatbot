import { initDatabase, getDbClient } from '../database/db';
import { DbService } from '../services/db.service';

async function testLocalDb() {
  console.log('--- Iniciando prueba de conexión con Base de Datos Local ---');
  await initDatabase();

  const testPhone = '5215500000001';
  console.log(`Guardando sesión de prueba para: ${testPhone}`);

  const saved = await DbService.upsertSession({
    phone: testPhone,
    step: 'MENU_PRINCIPAL',
    client_id: 'CLI-999',
    client_name: 'Cliente Prueba Base de Datos Local',
    onu_id: 'ONU-TEST-01',
    opt_out: 0,
  });

  console.log('Sesión guardada en Base de Datos Local:', saved);

  const retrieved = await DbService.getSession(testPhone);
  console.log('Sesión recuperada desde Base de Datos Local:', retrieved);

  if (retrieved && retrieved.client_name === 'Cliente Prueba Base de Datos Local') {
    console.log('✅ ¡Prueba de Base de Datos Local superada con éxito!');
  } else {
    console.error('❌ Error: Los datos recuperados no coinciden.');
  }

  process.exit(0);
}

testLocalDb().catch((err) => {
  console.error('Fallo en test de Base de Datos Local:', err);
  process.exit(1);
});
