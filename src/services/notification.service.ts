import { SettingsService } from './settings.service';
import { TursoService } from './turso.service';
import { WispHubService } from './wisphub.service';
import { EvolutionService } from './evolution.service';
import { Logger } from '../utils/logger';
import { parseSpintax } from '../utils/spintax';

const logger = new Logger('NotificationService');

export interface NotificationBatchResult {
  totalCandidates: number;
  sent: number;
  skippedPaid: number;
  skippedNoPhone: number;
  errors: number;
  details: Array<{
    phone: string;
    nombre: string;
    status: 'SENT' | 'SKIPPED_PAID' | 'SKIPPED_NO_PHONE' | 'ERROR';
    motivo?: string;
  }>;
}

export class NotificationService {
  /**
   * Genera el mensaje estructurado de cobro (BBVA / Transferencia) con Spintax cordial
   */
  static formatearMensajeCobro(params: {
    nombre: string;
    contratoId?: string | number;
    monto?: number | string;
    fechaCorte?: string;
    tipo: 'RECORDATORIO_PREVIO' | 'DIA_CORTE' | 'SUSPENSION';
  }): string {
    const { nombre, contratoId, monto, fechaCorte, tipo } = params;
    const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', 'CloudWareMx');
    const bank = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA');
    const account = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', '');
    const convenio = SettingsService.get('PAYMENT_CONVENIO', 'PAYMENT_CONVENIO', '');
    const beneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', ispName);
    const notes = SettingsService.get('PAYMENT_NOTES', 'PAYMENT_NOTES', '');

    let encabezado = '';
    if (tipo === 'RECORDATORIO_PREVIO') {
      encabezado = `{Hola|Buen día|Estimado(a)} *${nombre}* 👋\n\nTe saludamos de *${ispName}* para recordarte cordialmente que tu fecha límite de pago es el *${fechaCorte || 'próximo corte'}*.`;
    } else if (tipo === 'DIA_CORTE') {
      encabezado = `{Hola|Estimado(a)|Buen día} *${nombre}* 👋\n\nTe recordamos de *${ispName}* que hoy *${fechaCorte || 'es tu fecha de corte'}* para tu mensualidad de internet.`;
    } else {
      encabezado = `⚠️ *Aviso de Servicio - ${ispName}*\n\nEstimado(a) *${nombre}*, te informamos que tu servicio de internet se encuentra temporalmente pausado por saldo pendiente.`;
    }

    let ficha = `\n\n🏦 *Datos para Pago / Transferencia:*`;
    if (bank) ficha += `\n• *Banco:* ${bank}`;
    if (account) ficha += `\n• *Cuenta / CLABE:* \`${account}\``;
    if (convenio) ficha += `\n• *Convenio CIE:* \`${convenio}\``;
    if (beneficiary) ficha += `\n• *Beneficiario:* ${beneficiary}`;
    if (monto && Number(monto) > 0) ficha += `\n• *Monto a pagar:* $${Number(monto).toFixed(2)} MXN`;
    ficha += `\n• *Concepto/Referencia:* *${contratoId || nombre}*`;
    if (notes) ficha += `\n_${notes}_`;

    const cierre = `\n\n📸 *Envío de comprobante:* Una vez realizado tu pago, por favor envía la foto o captura de tu comprobante por este mismo chat para aplicarlo de inmediato. ¡Muchas gracias!`;

    return parseSpintax(`${encabezado}${ficha}${cierre}`);
  }

  /**
   * Ejecuta el lote de recordatorios preventivos respetando los switches de configuración
   */
  static async ejecutarRecordatoriosPreventivos(): Promise<NotificationBatchResult> {
    const activo = SettingsService.get('NOTIF_RECORDATORIO_PREVIO_ENABLED', 'NOTIF_RECORDATORIO_PREVIO_ENABLED', 'true') === 'true';
    if (!activo) {
      logger.info('Recordatorios preventivos desactivados en configuración.');
      return { totalCandidates: 0, sent: 0, skippedPaid: 0, skippedNoPhone: 0, errors: 0, details: [] };
    }

    const dias = parseInt(SettingsService.get('NOTIF_RECORDATORIO_PREVIO_DIAS', 'NOTIF_RECORDATORIO_PREVIO_DIAS', '3'), 10) || 3;
    const instance = SettingsService.get('NOTIF_INSTANCE_NAME', 'NOTIF_INSTANCE_NAME', 'atencion');

    logger.info(`Iniciando lote de recordatorios preventivos (${dias} días antes) vía instancia [${instance}]...`);
    const candidates = await TursoService.getNotificationCandidates('RECORDATORIO_PREVIO', dias);

    const result: NotificationBatchResult = {
      totalCandidates: candidates.length,
      sent: 0,
      skippedPaid: 0,
      skippedNoPhone: 0,
      errors: 0,
      details: [],
    };

    for (const c of candidates) {
      const rawPhone = String(c.telefono || '').replace(/\D/g, '');
      if (rawPhone.length < 10) {
        result.skippedNoPhone++;
        result.details.push({
          phone: rawPhone || 'N/A',
          nombre: c.nombre,
          status: 'SKIPPED_NO_PHONE',
          motivo: 'Número de teléfono inválido o menor a 10 dígitos',
        });
        continue;
      }

      // Verificación en TIEMPO REAL con WispHub para no cobrar a quien ya pagó
      try {
        const liveCheck = await WispHubService.verificarEstadoFinanciero({
          clienteId: c.id_servicio,
          phone: rawPhone,
          nombre: c.nombre,
        });

        // Si ya está al corriente o no debe nada, omitir
        if (!liveCheck.suspendido && liveCheck.totalDeuda <= 0 && (!liveCheck.facturas || liveCheck.facturas.length === 0)) {
          result.skippedPaid++;
          result.details.push({
            phone: rawPhone,
            nombre: c.nombre,
            status: 'SKIPPED_PAID',
            motivo: 'Cliente al corriente o sin facturas pendientes en WispHub',
          });
          continue;
        }

        const monto = liveCheck.totalDeuda > 0 ? liveCheck.totalDeuda : c.precio_plan;
        const msg = this.formatearMensajeCobro({
          nombre: c.nombre,
          contratoId: c.id_servicio,
          monto,
          fechaCorte: c.fecha_corte || `Día ${c.dia_corte || 'de corte'}`,
          tipo: 'RECORDATORIO_PREVIO',
        });

        const ok = await EvolutionService.enviarTexto(rawPhone, msg, {
          isBroadcast: true,
          instanceName: instance,
        });

        if (ok) {
          result.sent++;
          result.details.push({ phone: rawPhone, nombre: c.nombre, status: 'SENT' });
          await TursoService.logMessage(rawPhone, 'OUT', msg, 'RECORDATORIO_PAGO_PREVIO', 'ENVIO_AUTOMATICO_COBRANZA', instance);
          await TursoService.updateDepartment(rawPhone, 'ATENCION');
          await TursoService.updateLastInstance(rawPhone, instance);
        } else {
          result.errors++;
          result.details.push({ phone: rawPhone, nombre: c.nombre, status: 'ERROR', motivo: 'Error al enviar por Evolution API' });
        }
      } catch (err: any) {
        logger.error(`Error procesando recordatorio para ${c.nombre} (${rawPhone}):`, err?.message || err);
        result.errors++;
        result.details.push({ phone: rawPhone, nombre: c.nombre, status: 'ERROR', motivo: err?.message || 'Error interno' });
      }
    }

    logger.info(`Lote preventivo finalizado: Enviados=${result.sent}, OmitidosPagados=${result.skippedPaid}, Errores=${result.errors}`);
    return result;
  }

  /**
   * Ejecuta el lote de avisos de suspensión respetando los switches de configuración
   */
  static async ejecutarAvisosSuspension(): Promise<NotificationBatchResult> {
    const activo = SettingsService.get('NOTIF_SUSPENSION_ENABLED', 'NOTIF_SUSPENSION_ENABLED', 'true') === 'true';
    if (!activo) {
      return { totalCandidates: 0, sent: 0, skippedPaid: 0, skippedNoPhone: 0, errors: 0, details: [] };
    }

    const instance = SettingsService.get('NOTIF_INSTANCE_NAME', 'NOTIF_INSTANCE_NAME', 'atencion');
    const candidates = await TursoService.getNotificationCandidates('SUSPENSION');

    const result: NotificationBatchResult = {
      totalCandidates: candidates.length,
      sent: 0,
      skippedPaid: 0,
      skippedNoPhone: 0,
      errors: 0,
      details: [],
    };

    for (const c of candidates) {
      const rawPhone = String(c.telefono || '').replace(/\D/g, '');
      if (rawPhone.length < 10) {
        result.skippedNoPhone++;
        continue;
      }

      try {
        const liveCheck = await WispHubService.verificarEstadoFinanciero({
          clienteId: c.id_servicio,
          phone: rawPhone,
          nombre: c.nombre,
        });

        if (!liveCheck.suspendido || liveCheck.yaPagoPeroNoActivo || (liveCheck.totalDeuda <= 0 && (!liveCheck.facturas || liveCheck.facturas.length === 0))) {
          result.skippedPaid++;
          continue;
        }

        const monto = liveCheck.totalDeuda > 0 ? liveCheck.totalDeuda : c.precio_plan;
        const msg = this.formatearMensajeCobro({
          nombre: c.nombre,
          contratoId: c.id_servicio,
          monto,
          fechaCorte: c.fecha_corte || 'Mes actual',
          tipo: 'SUSPENSION',
        });

        const ok = await EvolutionService.enviarTexto(rawPhone, msg, {
          isBroadcast: true,
          instanceName: instance,
        });

        if (ok) {
          result.sent++;
          result.details.push({ phone: rawPhone, nombre: c.nombre, status: 'SENT' });
          await TursoService.logMessage(rawPhone, 'OUT', msg, 'AVISO_SUSPENSION', 'ENVIO_AUTOMATICO_COBRANZA', instance);
          await TursoService.updateDepartment(rawPhone, 'ATENCION');
        } else {
          result.errors++;
        }
      } catch {
        result.errors++;
      }
    }

    return result;
  }
}
