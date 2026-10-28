import axios from 'axios';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';
import { getDbClient } from '../database/db';
import { WispHubService } from './wisphub.service';
import { SmartOLTService } from './smartolt.service';
import { EvolutionService } from './evolution.service';
import { cleanPersonName } from '../utils/fuzzy-matcher';

const logger = new Logger('OpenpayService');

export interface OpenpayCustomer {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  external_id?: string;
  clabe?: string;
  status?: string;
}

export interface CardChargeParams {
  tokenId: string;
  deviceSessionId: string;
  amount: number;
  description: string;
  orderId: string;
  clientId: number | string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  redirectUrl?: string;
}

export interface SpeiDetails {
  clabe: string;
  bank: string;
  agreement?: string;
  reference?: string;
  amount?: number;
  orderId?: string;
  urlSpei?: string;
}

export class OpenpayService {
  /**
   * Obtiene la configuración activa de Openpay desde SettingsService con fallbacks a los datos de Sandbox
   */
  static getConfig() {
    const isSandbox = SettingsService.get('OPENPAY_SANDBOX', 'OPENPAY_SANDBOX', 'true') !== 'false';
    const merchantId = SettingsService.get('OPENPAY_MERCHANT_ID', 'OPENPAY_MERCHANT_ID', 'mvbe6i5366z6sofetydr').trim();
    const publicKey = SettingsService.get('OPENPAY_PUBLIC_KEY', 'OPENPAY_PUBLIC_KEY', 'pk_10123fcc934d42aa843f2532c7711691').trim();
    const secretKey = SettingsService.get('OPENPAY_SECRET_KEY', 'OPENPAY_SECRET_KEY', 'sk_9e6cd6d4f4da4eea8fe855dc6a56b8ae').trim();
    const isEnabled = SettingsService.get('OPENPAY_ENABLED', 'OPENPAY_ENABLED', 'true') !== 'false';

    const cardFeePercent = Number(SettingsService.get('OPENPAY_CARD_FEE_PERCENT', 'OPENPAY_CARD_FEE_PERCENT', '2.9')) || 2.9;
    const cardFeeFixed = Number(SettingsService.get('OPENPAY_CARD_FEE_FIXED', 'OPENPAY_CARD_FEE_FIXED', '2.50')) || 2.50;
    const cardFeeTax = Number(SettingsService.get('OPENPAY_CARD_FEE_TAX', 'OPENPAY_CARD_FEE_TAX', '16')) || 16;

    const baseUrl = isSandbox
      ? `https://sandbox-api.openpay.mx/v1/${merchantId}`
      : `https://api.openpay.mx/v1/${merchantId}`;

    return {
      isEnabled,
      isSandbox,
      merchantId,
      publicKey,
      secretKey,
      baseUrl,
      cardFeePercent,
      cardFeeFixed,
      cardFeeTax,
    };
  }

  /**
   * Headers de autenticación HTTP Basic para la API de Openpay
   */
  private static getHeaders() {
    const { secretKey } = this.getConfig();
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    return {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Calcula la comisión que pagará el cliente para que el ISP reciba exactamente el monto neto
   * Fórmula con IVA: Total = (MontoNeto + Fijo * (1 + IVA)) / (1 - (Porcentaje * (1 + IVA)))
   */
  static calculateCardFee(netAmount: number): {
    netAmount: number;
    feeAmount: number;
    totalAmount: number;
    feeDetails: string;
  } {
    const { cardFeePercent, cardFeeFixed, cardFeeTax } = this.getConfig();
    const net = Math.max(0, Number(netAmount) || 0);
    if (net === 0) {
      return { netAmount: 0, feeAmount: 0, totalAmount: 0, feeDetails: '0%' };
    }

    const taxFactor = 1 + (cardFeeTax / 100);
    const P = (cardFeePercent / 100) * taxFactor;
    const F = cardFeeFixed * taxFactor;

    const total = Math.round(((net + F) / (1 - P)) * 100) / 100;
    const fee = Math.round((total - net) * 100) / 100;

    return {
      netAmount: net,
      feeAmount: fee,
      totalAmount: total,
      feeDetails: `${cardFeePercent}% + $${cardFeeFixed} (+IVA)`,
    };
  }

  /**
   * Obtiene o crea un cliente en Openpay y guarda la referencia en la base de datos local
   */
  static async getOrCreateCustomer(clientData: {
    id_servicio: number | string;
    nombre: string;
    telefono?: string;
    email?: string;
  }): Promise<OpenpayCustomer | null> {
    const { baseUrl, merchantId } = this.getConfig();
    if (!merchantId) return null;

    const sId = Number(clientData.id_servicio);
    const cleanPhone = (clientData.telefono || '').replace(/\D/g, '').slice(-10);
    const cleanName = cleanPersonName(clientData.nombre || 'Cliente CloudWare');
    const email = (clientData.email && clientData.email.includes('@')) 
      ? clientData.email 
      : `cliente_${sId}@cloudwaremx.com`;

    const db = getDbClient();

    // 1. Revisar si ya está guardado en base de datos local
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM openpay_customers WHERE client_id = ? LIMIT 1`,
        args: [sId],
      });
      if (existing.rows.length > 0) {
        const row = existing.rows[0] as any;
        return {
          id: row.customer_id,
          name: cleanName,
          email,
          phone_number: cleanPhone,
          clabe: row.clabe || undefined,
          status: 'active',
        };
      }
    } catch (dbErr) {
      logger.warn('Aviso al buscar cliente Openpay en BD local:', dbErr);
    }

    // 2. Si no existe en BD local, intentar crearlo en Openpay
    try {
      const externalId = `SRV_${sId}`;
      const payload = {
        name: cleanName.substring(0, 95),
        email,
        phone_number: cleanPhone || '7711714426',
        external_id: externalId,
        requires_account: true,
      };

      const res = await axios.post(`${baseUrl}/customers`, payload, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const cust = res.data;
      const customerId = cust.id;
      const clabe = cust.clabe || cust.balance_clabe || null;

      // Guardar en BD local
      try {
        await db.execute({
          sql: `
            INSERT INTO openpay_customers (client_id, phone, customer_id, clabe, bank_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'BBVA Bancomer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(client_id) DO UPDATE SET
              customer_id = excluded.customer_id,
              clabe = COALESCE(excluded.clabe, openpay_customers.clabe),
              phone = excluded.phone,
              updated_at = CURRENT_TIMESTAMP
          `,
          args: [sId, cleanPhone, customerId, clabe],
        });
      } catch (insertErr) {
        logger.warn('Aviso al guardar cliente Openpay en BD local:', insertErr);
      }

      return {
        id: customerId,
        name: cust.name,
        email: cust.email,
        phone_number: cust.phone_number,
        clabe: clabe || undefined,
        status: cust.status || 'active',
      };
    } catch (err: any) {
      // Si ya existía con ese external_id en Openpay, consultarlo por búsqueda
      if (err.response?.data?.error_code === 1003 || err.response?.status === 409) {
        try {
          const listRes = await axios.get(`${baseUrl}/customers?external_id=SRV_${sId}`, {
            headers: this.getHeaders(),
          });
          if (Array.isArray(listRes.data) && listRes.data.length > 0) {
            const cust = listRes.data[0];
            await db.execute({
              sql: `
                INSERT INTO openpay_customers (client_id, phone, customer_id, clabe, bank_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'BBVA Bancomer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(client_id) DO UPDATE SET
                  customer_id = excluded.customer_id,
                  clabe = COALESCE(excluded.clabe, openpay_customers.clabe),
                  updated_at = CURRENT_TIMESTAMP
              `,
              args: [sId, cleanPhone, cust.id, cust.clabe || null],
            });
            return {
              id: cust.id,
              name: cust.name,
              email: cust.email,
              phone_number: cust.phone_number,
              clabe: cust.clabe || undefined,
              status: cust.status,
            };
          }
        } catch (_) {}
      }
      logger.error('Error al crear o buscar cliente en Openpay:', err.response?.data || err.message);
      return null;
    }
  }

  /**
   * Obtiene o genera los datos de transferencia SPEI personalizados para el cliente (CLABE, Convenio BBVA, Referencia)
   */
  static async getClientSpeiDetails(clientData: {
    id_servicio: number | string;
    nombre: string;
    telefono?: string;
    saldo?: number;
    id_factura?: number | string;
  }): Promise<SpeiDetails | null> {
    const { baseUrl } = this.getConfig();
    const sId = Number(clientData.id_servicio);
    const db = getDbClient();

    // 1. Revisar si ya tenemos datos de transferencia en BD local
    try {
      const rowRes = await db.execute({
        sql: `SELECT * FROM openpay_customers WHERE client_id = ? LIMIT 1`,
        args: [sId],
      });
      if (rowRes.rows.length > 0) {
        const row = rowRes.rows[0] as any;
        if (row.clabe && row.clabe.length === 18 && row.clabe !== '000000000000000001') {
          return {
            clabe: row.clabe,
            bank: row.bank_name || 'BBVA Bancomer',
            agreement: row.agreement || undefined,
            reference: `SRV-${sId}`,
          };
        }
      }
    } catch (_) {}

    // 2. Obtener cliente Openpay
    const customer = await this.getOrCreateCustomer(clientData);
    if (!customer) return null;

    // Si el cliente Openpay ya tiene una CLABE directa
    if (customer.clabe && customer.clabe.length === 18 && customer.clabe !== '000000000000000001') {
      return {
        clabe: customer.clabe,
        bank: 'BBVA Bancomer',
        reference: `SRV-${sId}`,
      };
    }

    // 3. Generar una orden SPEI transaccional en Openpay para obtener la CLABE y referencia única
    try {
      const amount = Math.max(10, Number(clientData.saldo || 350));
      const orderId = `SPEI_SRV_${sId}_${Date.now()}`;
      const payload = {
        method: 'bank_account',
        amount: Math.round(amount * 100) / 100,
        description: `Servicio Internet CloudWare - Contrato #${sId}`,
        order_id: orderId,
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 días
      };

      const res = await axios.post(`${baseUrl}/customers/${customer.id}/charges`, payload, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const pm = res.data?.payment_method || {};
      const rawClabe = pm.clabe || '';
      const clabe = (rawClabe.length === 18 && rawClabe !== '000000000000000001') ? rawClabe : SettingsService.get('PAYMENT_CLABE', 'PAYMENT_BANK_CLABE', '012 180 0152433212 90');
      const bank = pm.bank || 'BBVA Bancomer';
      const agreement = pm.agreement || '';
      const reference = pm.name || `SRV-${sId}`;

      // Guardar CLABE y convenio en BD local si es válida
      try {
        if (clabe && clabe.length === 18 && clabe !== '000000000000000001') {
          await db.execute({
            sql: `UPDATE openpay_customers SET clabe = ?, bank_name = ?, agreement = ?, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?`,
            args: [clabe, bank, agreement, sId],
          });
        }
      } catch (_) {}

      // Registrar transacción en historial
      try {
        await db.execute({
          sql: `
            INSERT INTO openpay_transactions (transaction_id, order_id, client_id, phone, amount, fee, net_amount, method, status, description, clabe, raw_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, 'bank_account', 'in_progress', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          args: [
            res.data.id,
            orderId,
            sId,
            clientData.telefono || '',
            amount,
            amount,
            payload.description,
            clabe,
            JSON.stringify(res.data),
          ],
        });
      } catch (_) {}

      return {
        clabe,
        bank,
        agreement: agreement || undefined,
        reference,
        amount,
        orderId,
        urlSpei: pm.url_spei,
      };
    } catch (speiErr: any) {
      logger.error('Error al generar cargo SPEI en Openpay:', speiErr.response?.data || speiErr.message);
      return null;
    }
  }

  /**
   * Procesa un cobro con tarjeta mediante tokenización segura (Openpay Device Data + Token)
   */
  static async chargeCard(params: CardChargeParams): Promise<{
    success: boolean;
    transactionId?: string;
    authorization?: string;
    amount?: number;
    feeAmount?: number;
    netAmount?: number;
    redirectUrl?: string;
    message: string;
    card?: {
      brand?: string;
      cardNumber?: string;
    };
  }> {
    const { baseUrl } = this.getConfig();
    const {
      tokenId,
      deviceSessionId,
      amount,
      description,
      orderId,
      clientId,
      clientName,
      clientPhone,
      clientEmail,
      redirectUrl,
    } = params;

    const sId = Number(clientId);
    const db = getDbClient();

    // 1. Obtener o crear Customer en Openpay
    const customer = await this.getOrCreateCustomer({
      id_servicio: sId,
      nombre: clientName,
      telefono: clientPhone,
      email: clientEmail,
    });

    if (!customer) {
      return { success: false, message: 'No se pudo vincular la cuenta del cliente con Openpay.' };
    }

    // 2. Calcular monto total con comisión transferida al cliente
    const feeCalc = this.calculateCardFee(amount);
    const totalToCharge = feeCalc.totalAmount;

    // 3. Crear el cargo en Openpay
    try {
      const chargePayload: any = {
        source_id: tokenId,
        method: 'card',
        amount: totalToCharge,
        currency: 'MXN',
        description: description || `Pago Internet CloudWare Contrato #${sId}`,
        order_id: orderId || `CARD_${sId}_${Date.now()}`,
        device_session_id: deviceSessionId,
        use_3d_secure: false, // En Sandbox usar false para aprobación directa sin redirección bancaria
      };

      if (redirectUrl) {
        chargePayload.redirect_url = redirectUrl;
        chargePayload.use_3d_secure = true;
      }

      logger.info(`Enviando cargo a Openpay para contrato #${sId}: $${totalToCharge} MXN (Neto: $${amount}, Comisión: $${feeCalc.feeAmount})...`);

      const res = await axios.post(`${baseUrl}/customers/${customer.id}/charges`, chargePayload, {
        headers: this.getHeaders(),
        timeout: 15000,
      });

      const charge = res.data;
      const status = charge.status; // 'completed', 'in_progress' (si requiere 3DS)

      const cardInfo = charge.card ? {
        brand: charge.card.brand,
        cardNumber: charge.card.card_number,
      } : undefined;

      // Registrar en base de datos local
      try {
        await db.execute({
          sql: `
            INSERT INTO openpay_transactions (
              transaction_id, order_id, client_id, phone, amount, fee, net_amount, method, status, 
              description, card_brand, card_last4, authorization, raw_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'card', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(transaction_id) DO UPDATE SET
              status = excluded.status,
              authorization = excluded.authorization,
              updated_at = CURRENT_TIMESTAMP
          `,
          args: [
            charge.id,
            chargePayload.order_id,
            sId,
            clientPhone || '',
            totalToCharge,
            feeCalc.feeAmount,
            amount,
            status,
            chargePayload.description,
            charge.card?.brand || null,
            charge.card?.card_number ? charge.card.card_number.slice(-4) : null,
            charge.authorization || null,
            JSON.stringify(charge),
          ],
        });
      } catch (logErr) {
        logger.warn('Aviso al guardar transacción en BD local:', logErr);
      }

      // Si el pago quedó aprobado inmediatamente:
      if (status === 'completed') {
        // Conciliar en segundo plano con WispHub, reactivar OLT y mandar WhatsApp
        this.processSuccessfulPayment({
          clientId: sId,
          clientPhone,
          amount,
          method: 'Tarjeta',
          folio: chargePayload.order_id,
          authorization: charge.authorization,
          cardBrand: charge.card?.brand,
          cardLast4: charge.card?.card_number ? charge.card.card_number.slice(-4) : '',
        }).catch((err) => logger.error('Error al procesar conciliación post-pago:', err));

        return {
          success: true,
          transactionId: charge.id,
          authorization: charge.authorization,
          amount: totalToCharge,
          feeAmount: feeCalc.feeAmount,
          netAmount: amount,
          message: '¡Pago con tarjeta aprobado exitosamente!',
          card: cardInfo,
        };
      }

      // Si requiere 3D Secure / redirección
      if (status === 'in_progress' && charge.payment_method?.url) {
        return {
          success: true,
          transactionId: charge.id,
          redirectUrl: charge.payment_method.url,
          amount: totalToCharge,
          feeAmount: feeCalc.feeAmount,
          netAmount: amount,
          message: 'Redirigiendo a validación bancaria 3D Secure...',
        };
      }

      return {
        success: false,
        message: charge.error_message || 'El pago no pudo ser completado.',
      };
    } catch (err: any) {
      const errData = err.response?.data;
      logger.error('Error al procesar cobro con tarjeta en Openpay:', errData || err.message);

      let userMsg = 'Error al procesar la tarjeta.';
      if (errData?.description) {
        userMsg = errData.description;
      }
      if (errData?.error_code === 3001) userMsg = 'La tarjeta fue rechazada por el banco emisor.';
      if (errData?.error_code === 3002) userMsg = 'La tarjeta está vencida o los datos de expiración son incorrectos.';
      if (errData?.error_code === 3003) userMsg = 'Fondos insuficientes en la tarjeta.';
      if (errData?.error_code === 3004) userMsg = 'Tarjeta rechazada por seguridad.';
      if (errData?.error_code === 3005) userMsg = 'Transacción rechazada por el sistema antifraude del banco.';

      return {
        success: false,
        message: userMsg,
      };
    }
  }

  /**
   * Procesa un webhook recibido de Openpay (charge.succeeded, spei.received)
   */
  static async handleWebhook(body: any): Promise<{ success: boolean; message: string }> {
    logger.info(`Webhook Openpay recibido: Tipo = "${body?.type}", ID = "${body?.transaction?.id}"`);

    const type = body?.type;
    const tx = body?.transaction;

    if (!tx || !tx.id) {
      return { success: false, message: 'Payload de webhook sin transacción.' };
    }

    const db = getDbClient();

    // Actualizar estado en tabla openpay_transactions
    try {
      await db.execute({
        sql: `
          UPDATE openpay_transactions 
          SET status = ?, authorization = COALESCE(?, authorization), updated_at = CURRENT_TIMESTAMP
          WHERE transaction_id = ?
        `,
        args: [tx.status || 'completed', tx.authorization || null, tx.id],
      });
    } catch (_) {}

    // Eventos de pago aprobado exitosamente
    if (type === 'charge.succeeded' || type === 'payout.created' || tx.status === 'completed') {
      const orderId = tx.order_id || '';
      let clientId: number | null = null;

      // Intentar extraer clientId desde el order_id (ej. SPEI_SRV_715_... o CARD_715_...)
      const match = orderId.match(/(?:SRV|CARD|SPEI)_(\d+)/i);
      if (match) {
        clientId = Number(match[1]);
      }

      // Si no viene en order_id, buscar por customer_id en la BD local
      if (!clientId && tx.customer_id) {
        try {
          const cRes = await db.execute({
            sql: `SELECT client_id, phone FROM openpay_customers WHERE customer_id = ? LIMIT 1`,
            args: [tx.customer_id],
          });
          if (cRes.rows.length > 0) {
            clientId = Number(cRes.rows[0].client_id);
          }
        } catch (_) {}
      }

      if (clientId) {
        const netAmount = Number(tx.amount || 0);
        await this.processSuccessfulPayment({
          clientId,
          clientPhone: tx.customer?.phone_number || '',
          amount: netAmount,
          method: tx.method === 'card' ? 'Tarjeta' : 'SPEI',
          folio: orderId || tx.id,
          authorization: tx.authorization,
          cardBrand: tx.card?.brand,
          cardLast4: tx.card?.card_number ? tx.card.card_number.slice(-4) : '',
        });
        return { success: true, message: `Pago de contrato #${clientId} procesado exitosamente.` };
      }
    }

    return { success: true, message: 'Evento recibido y registrado.' };
  }

  /**
   * Realiza la conciliación completa tras un pago confirmado:
   * 1. Registra el pago en WispHub
   * 2. Reactiva el servicio en SmartOLT si estaba suspendido
   * 3. Envía notificación de confirmación al WhatsApp del cliente
   */
  private static async processSuccessfulPayment(data: {
    clientId: number;
    clientPhone?: string;
    amount: number;
    method: 'Tarjeta' | 'SPEI';
    folio: string;
    authorization?: string;
    cardBrand?: string;
    cardLast4?: string;
  }): Promise<void> {
    const { clientId, clientPhone, amount, method, folio, authorization, cardBrand, cardLast4 } = data;
    logger.info(`Iniciando conciliación automática para contrato #${clientId} ($${amount} MXN vía ${method})...`);

    const db = getDbClient();

    // 1. Obtener datos del cliente desde wisphub_clients
    let clientName = 'Cliente';
    let targetPhone = clientPhone || '';
    let onuSn = '';
    let currentBalance = 0;

    try {
      const cRes = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
        args: [clientId],
      });
      if (cRes.rows.length > 0) {
        const row = cRes.rows[0] as any;
        clientName = row.nombre || 'Cliente';
        if (!targetPhone) targetPhone = row.telefono || '';
        onuSn = row.sn_onu || '';
        currentBalance = Number(row.saldo || 0);
      }
    } catch (_) {}

    // 2. Conciliar y registrar pago en WispHub
    try {
      logger.info(`Registrando pago de $${amount} MXN en WispHub para contrato #${clientId}...`);
      await WispHubService.registerPaymentForClient(clientId, {
        monto: amount,
        forma_pago: method === 'Tarjeta' ? 'Tarjeta de Débito/Crédito' : 'Transferencia SPEI Openpay',
        referencia: folio,
        comentario: `Pago automático Openpay. Aut: ${authorization || 'N/A'}.`,
      }).catch((e) => logger.warn('Aviso en registerPaymentForClient de WispHub:', e?.message || e));

      // Actualizar saldo local a $0 o restar el monto
      const newBalance = Math.max(0, currentBalance - amount);
      await db.execute({
        sql: `UPDATE wisphub_clients SET saldo = ?, estado = 'activo', updated_at = CURRENT_TIMESTAMP WHERE id_servicio = ?`,
        args: [String(newBalance), clientId],
      });
    } catch (whErr) {
      logger.warn('Aviso en conciliación con WispHub:', whErr);
    }

    // 3. Reactivar ONU en SmartOLT si estaba suspendida o registrada
    if (onuSn) {
      try {
        logger.info(`Verificando ONU ${onuSn} asociada al cliente #${clientId}...`);
        if (typeof (SmartOLTService as any).enableONU === 'function') {
          await (SmartOLTService as any).enableONU(onuSn);
        }
      } catch (e: any) {
        logger.warn('Aviso en reactivación de ONU en SmartOLT:', e?.message || e);
      }
    }

    // 4. Enviar WhatsApp de confirmación y agradecimiento
    if (targetPhone) {
      const clean10 = targetPhone.replace(/\D/g, '').slice(-10);
      if (clean10.length === 10) {
        const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', 'CloudWare');
        const methodDesc = method === 'Tarjeta' 
          ? `💳 Tarjeta ${cardBrand || ''} ****${cardLast4 || ''}` 
          : '🏦 Transferencia SPEI';

        const waMsg = 
          `✅ *¡Pago Confirmado Exitosamente!*\n\n` +
          `Hola *${cleanPersonName(clientName)}*, recibimos tu pago con éxito en ${ispName}.\n\n` +
          `📋 *Detalles del Pago:*\n` +
          `• *Contrato:* #${clientId}\n` +
          `• *Monto:* $${amount.toFixed(2)} MXN\n` +
          `• *Método:* ${methodDesc}\n` +
          (authorization ? `• *Autorización:* ${authorization}\n` : '') +
          `• *Folio:* ${folio}\n` +
          `• *Estatus de Servicio:* Activo al 100% 🚀\n\n` +
          `Ya puedes consultar tu recibo digital actualizado desde tu portal:\n` +
          `👉 https://portal.cloudwaremx.com/portal?p=${clean10}\n\n` +
          `_¡Gracias por tu preferencia!_`;

        await EvolutionService.enviarTexto(`521${clean10}`, waMsg, { instant: true }).catch((e) => {
          return EvolutionService.enviarTexto(clean10, waMsg, { instant: true });
        });
      }
    }
  }
}
