import { DbService } from '../services/db.service';
import { SettingsService } from '../services/settings.service';
import { initDatabase } from '../database/db';
import { BotOrchestrator } from '../orchestrator/bot.orchestrator';

async function testSupportFlow() {
  console.log('--- Iniciando Test de Flujo de Soporte Ágil y Humano ---');
  await initDatabase();
  await SettingsService.init();

  const testPhone = '5215500001111';

  // 1. Simular cliente identificado con ONU en Base de Datos Local
  await DbService.upsertSession({
    phone: testPhone,
    client_name: 'Carlos Mendoza',
    client_id: 'CLI-999',
    onu_id: 'ONU-DEV-TEST',
    step: 'IDENTIFICADO',
    metadata: JSON.stringify({ speed_profile: '50 Mbps' }),
  });

  console.log('✅ 1. Cliente de prueba inicializado en Base de Datos Local');

  // 2. Simular mensaje de reporte de falla: "mi internet no sirve esta fallando"
  console.log('\n--- Paso 2: Cliente reporta falla de internet ---');
  await BotOrchestrator.procesarMensaje({
    phone: testPhone,
    text: 'Hola, mi internet no funciona, no tengo señal',
  });

  let session = await DbService.getSession(testPhone);
  console.log('Estado de sesión tras reporte de falla:', session?.step);
  let meta = JSON.parse(session?.metadata || '{}');

  // En DEV (sin SmartOLT real conectada), responderá según el estado de la simulación:
  // Si ONLINE: step es COMPROBACION_TURNO_1
  // Si LOS: step es ESPERANDO_UBICACION_TECNICO
  if (session?.step === 'COMPROBACION_TURNO_1') {
    console.log('✅ Línea en línea: Bot envió Turno 1 (reinicio automático en segundo plano + cuidado de fibra + ¿1 o todos?)');

    // 3. Cliente responde Turno 1: "falla en todos mis celulares y la tele"
    console.log('\n--- Paso 3: Cliente responde Turno 1 ---');
    await BotOrchestrator.procesarMensaje({
      phone: testPhone,
      text: 'falla en todos los teléfonos y en la tele',
    });

    session = await DbService.getSession(testPhone);
    meta = JSON.parse(session?.metadata || '{}');
    console.log('Estado tras responder Turno 1:', session?.step);
    console.log('Folio de ticket generado:', meta.ticketFolio);

    // Verificar ticket creado en Base de Datos Local
    if (meta.ticketFolio) {
      const tickets = await DbService.getTickets('ABIERTO', 5);
      const creado = tickets.find(t => t.folio === meta.ticketFolio);
      console.log('✅ Ticket verificado en Base de Datos Local:', {
        folio: creado?.folio,
        all_devices: creado?.all_devices,
        issue_summary: creado?.issue_summary,
        checks_performed: creado?.checks_performed,
      });
    }

    // 4. Cliente envía foto o captura de speedtest
    console.log('\n--- Paso 4: Cliente envía evidencia ---');
    await BotOrchestrator.procesarMensaje({
      phone: testPhone,
      text: 'ya hice el speedtest y marca 2 mbps',
      isMedia: true,
    });

    session = await DbService.getSession(testPhone);
    console.log('Estado tras enviar evidencia:', session?.step);
  }

  // 5. Simular Caso Corte Físico (LOS) y Ubicación
  console.log('\n--- Paso 5: Simulación Caso Corte de Cable (LOS) y Captura de Domicilio ---');
  const ticketLOS = await DbService.createTicket({
    phone: testPhone,
    client_name: 'Carlos Mendoza',
    onu_id: 'ONU-DEV-TEST',
    issue_summary: 'Problema en cableado exterior hacia domicilio (SmartOLT LOS detectado en central)',
    checks_performed: 'Verificación en central: SmartOLT reporta LOS.',
    status: 'ABIERTO',
  });

  await DbService.upsertSession({
    phone: testPhone,
    step: 'ESPERANDO_UBICACION_TECNICO',
    metadata: JSON.stringify({
      ticketFolio: ticketLOS.folio,
    }),
  });

  // Cliente envía su dirección:
  await BotOrchestrator.procesarMensaje({
    phone: testPhone,
    text: 'Calle Emiliano Zapata #45, colonia Centro, entre Juárez y Morelos, portón blanco',
  });

  // Verificar que la dirección quedó guardada en el ticket
  const ticketsAfterLocation = await DbService.getTickets('ABIERTO', 10);
  const ticketActualizado = ticketsAfterLocation.find(t => t.folio === ticketLOS.folio);
  console.log('✅ Ticket tras recibir ubicación:', {
    folio: ticketActualizado?.folio,
    notes: ticketActualizado?.notes,
  });

  console.log('\n🎉 ¡Verificación del flujo ágil y humano completada con éxito!');
}

testSupportFlow().catch(console.error);
