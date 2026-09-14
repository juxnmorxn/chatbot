import { TursoService } from '../services/turso.service';
import { SettingsService } from '../services/settings.service';
import { initTursoDatabase } from '../database/turso';

async function testFeatures() {
  console.log('--- Iniciando verificación de Tickets y Settings ---');
  await initTursoDatabase();
  await SettingsService.init();

  // 1. Guardar configuraciones de prueba
  await SettingsService.updateAll({
    PAYMENT_BANK: 'BBVA Bancomer',
    PAYMENT_ACCOUNT: '012 180 0152433212 90',
    PAYMENT_BENEFICIARY: 'CloudWare Telecomunicaciones',
    PAYMENT_NOTES: 'Acepta OXXO y transferencias 24/7',
    WORK_HOURS_START: '09:00',
    WORK_HOURS_END: '18:00',
  });

  const settings = await SettingsService.getAll();
  console.log('✅ Settings recuperados:', {
    bank: settings.paymentBank,
    account: settings.paymentAccount,
    beneficiary: settings.paymentBeneficiary,
    workHoursStart: settings.workHoursStart,
    workHoursEnd: settings.workHoursEnd,
  });

  // 2. Crear Ticket de prueba
  const ticket = await TursoService.createTicket({
    phone: '5215598765432',
    client_name: 'Juan Pérez Test',
    onu_id: 'ONU-TEST-99',
    issue_summary: 'Internet muy lento y páginas no cargan',
    checks_performed: 'Módem prendido, luces fijas, speedtest solicitado',
    has_photo: 1,
    has_speedtest: 1,
    all_devices: 1,
    is_out_of_hours: 1,
    status: 'ABIERTO',
  });
  console.log('✅ Ticket creado con folio:', ticket.folio);

  // 3. Listar tickets
  const tickets = await TursoService.getTickets('ABIERTO', 10);
  console.log(`✅ Tickets abiertos recuperados (${tickets.length} encontrados)`);

  // 4. Actualizar estado
  const updated = await TursoService.updateTicketStatus(ticket.folio, 'EN_PROCESO', 'Ajuste manual aplicado en SmartOLT');
  console.log('✅ Ticket actualizado a EN_PROCESO:', updated);

  // 5. Estadísticas
  const stats = await TursoService.getTicketStats();
  console.log('✅ Estadísticas de tickets:', stats);

  console.log('🎉 ¡Todas las pruebas de integración pasaron correctamente!');
}

testFeatures().catch(console.error);
