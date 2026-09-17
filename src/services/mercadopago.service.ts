import axios from 'axios';
import { SettingsService } from './settings.service';
import { Logger } from '../utils/logger';

const logger = new Logger('MercadoPagoService');

export interface PreferenceParams {
  clienteNombre: string;
  clienteId?: string | number | null;
  contratoId?: string | number | null;
  phone: string;
  monto: number;
  descripcion?: string;
  folioFactura?: string | number | null;
}

export class MercadoPagoService {
  private static getAccessToken(): string {
    return SettingsService.get('MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN', '').trim();
  }

  /**
   * Crea una preferencia de pago dinámica en Mercado Pago y retorna el link de cobro directo (init_point)
   */
  static async crearPreferenciaPago(params: PreferenceParams): Promise<string | null> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return null;
    }

    try {
      const { clienteNombre, clienteId, contratoId, phone, monto, descripcion, folioFactura } = params;
      const montoFinal = Number(monto);
      if (isNaN(montoFinal) || montoFinal <= 0) {
        logger.warn(`Monto inválido para preferencia de Mercado Pago: ${monto}`);
        return null;
      }

      const titulo = `Internet ${SettingsService.get('ISP_NAME', 'ISP_NAME', 'CloudWareMx')} - ${clienteNombre || 'Cliente'}`;
      const desc = descripcion || `Pago de servicio internet - Contrato: ${contratoId || clienteId || 'N/A'}${folioFactura ? ` | Recibo #${folioFactura}` : ''}`;
      const externalRef = `WISPHUB:${clienteId || '0'}:${contratoId || '0'}:${phone}:${folioFactura || '0'}`;

      // Configurar URLs de retorno y notificación
      const appBaseUrl = (process.env.APP_BASE_URL || 'https://chatbot-rr1w.onrender.com').replace(/\/$/, '');
      const notificationUrl = `${appBaseUrl}/webhook/mercadopago`;

      const payload = {
        items: [
          {
            title: titulo.substring(0, 127),
            description: desc.substring(0, 255),
            quantity: 1,
            unit_price: Math.round(montoFinal * 100) / 100,
            currency_id: 'MXN',
          },
        ],
        payer: {
          name: clienteNombre ? clienteNombre.substring(0, 30) : 'Cliente',
          phone: {
            number: phone.replace(/\D/g, ''),
          },
        },
        external_reference: externalRef,
        back_urls: {
          success: `${appBaseUrl}/admin?pago=exitoso`,
          failure: `${appBaseUrl}/admin?pago=fallido`,
          pending: `${appBaseUrl}/admin?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: notificationUrl,
        statement_descriptor: SettingsService.get('ISP_NAME', 'ISP_NAME', 'CloudWareMx').substring(0, 16),
      };

      logger.info(`Creando preferencia en Mercado Pago para ${clienteNombre} ($${montoFinal} MXN, Ref: ${externalRef})...`);

      const response = await axios.post('https://api.mercadopago.com/checkout/preferences', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const initPoint = response.data?.init_point || response.data?.sandbox_init_point;
      if (initPoint) {
        logger.info(`Preferencia Mercado Pago creada con éxito: ${initPoint}`);
        return initPoint;
      }

      return null;
    } catch (error: any) {
      logger.error('Error al crear preferencia en Mercado Pago:', error?.response?.data || error?.message || error);
      return null;
    }
  }

  /**
   * Consulta los detalles de un pago en Mercado Pago por su Payment ID
   */
  static async obtenerDetallePago(paymentId: string | number): Promise<any> {
    const accessToken = this.getAccessToken();
    if (!accessToken) return null;

    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Error al consultar pago ${paymentId} en Mercado Pago:`, error?.response?.data || error?.message || error);
      return null;
    }
  }
}
