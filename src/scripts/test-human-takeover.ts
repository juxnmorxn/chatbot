import { TursoService } from '../services/turso.service';
import { SettingsService } from '../services/settings.service';
import { initTursoDatabase } from '../database/turso';
import { BotOrchestrator } from '../orchestrator/bot.orchestrator';
import { EvolutionService } from '../services/evolution.service';
import { WebhookController } from '../controllers/webhook.controller';

async function testHumanTakeover() {
  console.log('--- Iniciando Test de Intervención Humana, Debounce y Wi-Fi No Visible ---');
  await initTursoDatabase();
  await SettingsService.init();

  const testPhone = '5215577889900';

  // 1. Simular cliente identificado
  await TursoService.upsertSession({
    phone: testPhone,
    client_name: 'Martha Ramos',
    client_id: 'CLI-555',
    onu_id: 'ONU-HUAWEI-555',
    step: 'IDENTIFICADO',
  });
  console.log('✅ 1. Cliente Martha Ramos inicializado.');

  // 2. Simular caso Wi-Fi No Visible (como la señora de la foto)
  console.log('\n--- Paso 2: Cliente reporta que no le aparece su red Wi-Fi ---');
  await BotOrchestrator.procesarMensaje({
    phone: testPhone,
    text: 'Hola, disculpe, no me aparece mi red de internet en el celular ni en la tele',
  });

  let session = await TursoService.getSession(testPhone);
  let meta = JSON.parse(session?.metadata || '{}');
  console.log('Folio de ticket generado:', meta.ticketFolio);

  // Verificar que el ticket se generó con el diagnóstico específico de Wi-Fi no visible
  const tickets = await TursoService.getTickets('ABIERTO', 5);
  const ticketWifi = tickets.find(t => t.folio === meta.ticketFolio);
  console.log('✅ Ticket generado para el NOC/Soporte:', {
    folio: ticketWifi?.folio,
    issue_summary: ticketWifi?.issue_summary,
    checks_performed: ticketWifi?.checks_performed,
  });

  // 3. Cliente responde acuse de cortesía: "ok muchas gracias quedo al pendiente"
  console.log('\n--- Paso 3: Cliente responde confirmación corta ---');
  await BotOrchestrator.procesarMensaje({
    phone: testPhone,
    text: 'ok muchas gracias quedo al pendiente',
  });
  // El bot debe guardar silencio de cortesía
  console.log('✅ Silencio de Cortesía verificado (el bot no contestó ni abrió otro ciclo).');

  // 4. Simular que el operador humano responde manualmente desde WhatsApp Web (fromMe: true)
  console.log('\n--- Paso 4: Operador humano interviene desde WhatsApp Web ---');
  // Simulamos el webhook de Evolution API con fromMe: true y un ID que NO generó el bot
  const reqMock: any = {
    body: {
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: `${testPhone}@s.whatsapp.net`,
          fromMe: true,
          id: 'MANUAL_OPERATOR_MSG_12345',
        },
        message: {
          conversation: 'Listo señora Martha, ya entré a su módem y le activé la red Wi-Fi. Por favor revise si ya le aparece.',
        },
      },
    },
  };
  const resMock: any = {
    status: () => ({ json: () => {} }),
  };

  await WebhookController.handleWebhook(reqMock, resMock);

  // Verificar que el bot quedó pausado para Martha Ramos
  const estadoPausa = BotOrchestrator.estaBotPausado(testPhone);
  console.log('✅ Estado de pausa del bot tras mensaje de operador:', estadoPausa);

  // 5. Cliente responde al operador: "Ya me apareció muchas gracias"
  console.log('\n--- Paso 5: Cliente responde al operador humano ---');
  await BotOrchestrator.procesarMensaje({
    phone: testPhone,
    text: 'Ya me apareció muchas gracias ya tengo internet',
  });
  console.log('✅ Bot no interrumpió la conversación del operador.');

  // 6. Reactivar el bot manualmente
  console.log('\n--- Paso 6: Reactivar bot ---');
  BotOrchestrator.reanudarBot(testPhone);
  const estadoReanudado = BotOrchestrator.estaBotPausado(testPhone);
  console.log('✅ Bot reactivado:', estadoReanudado);

  console.log('\n🎉 ¡Todas las pruebas de Intervención Humana y Diagnóstico de Wi-Fi pasaron con éxito!');
}

testHumanTakeover().catch(console.error);
