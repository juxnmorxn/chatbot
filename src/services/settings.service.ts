import crypto from 'crypto';
import { getTursoClient } from '../database/turso';
import { Logger } from '../utils/logger';

const logger = new Logger('SettingsService');

export interface AppSettings {
  adminPassword?: string;
  // Evolution
  evolutionUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  // Groq
  groqApiKey?: string;
  groqModel?: string;
  // WispHub
  wisphubUrl?: string;
  wisphubApiKey?: string;
  // SmartOLT
  smartoltUrl?: string;
  smartoltApiKey?: string;
  // ISP
  ispName?: string;
  soporteHumanoPhone?: string;
  activationsGroupJid?: string;
  // Pagos y Cobranza (BBVA / Transferencias / Mercado Pago)
  paymentBank?: string;
  paymentAccount?: string;
  paymentConvenio?: string;
  paymentBeneficiary?: string;
  paymentNotes?: string;
  paymentMercadopagoUrl?: string;
  mercadopagoAccessToken?: string;
  mercadopagoPublicKey?: string;
  // Automatizaciones y Notificaciones de Cobro
  notifRecordatorioPrevioEnabled?: string;
  notifRecordatorioPrevioDias?: string;
  notifDiaCorteEnabled?: string;
  notifSuspensionEnabled?: string;
  notifInstanceName?: string;
  soporteInstanceName?: string;
  // Horario Laboral de Oficina
  workHoursStart?: string;
  workHoursEnd?: string;
}

export class SettingsService {
  private static cache: Map<string, string> = new Map();
  private static initialized: boolean = false;

  /**
   * Carga todas las configuraciones de Turso en memoria
   */
  static async init(): Promise<void> {
    try {
      const client = getTursoClient();
      const result = await client.execute('SELECT key, value FROM settings');
      for (const row of result.rows) {
        if (row.key && row.value !== null && row.value !== undefined) {
          this.cache.set(String(row.key), String(row.value));
        }
      }
      this.initialized = true;
      logger.info(`Configuraciones cargadas desde Turso DB (${this.cache.size} valores)`);
    } catch (error: any) {
      logger.error('Error al cargar configuraciones desde Turso:', error?.message || error);
    }
  }

  /**
   * Obtiene un valor de configuración: primero busca en Turso (caché), y si no existe usa process.env
   */
  static get(key: string, envFallbackKey?: string, defaultValue: string = ''): string {
    const isUrlKey = key.includes('URL');

    if (this.cache.has(key)) {
      const val = this.cache.get(key)?.trim() || '';
      if (val) {
        if (isUrlKey) {
          if (val.startsWith('http://') || val.startsWith('https://')) {
            return val;
          }
          // Si el valor en BD está corrupto (ej: "admin"), ignorar y usar fallback
        } else {
          return val;
        }
      }
    }

    if (envFallbackKey && process.env[envFallbackKey]) {
      const envVal = process.env[envFallbackKey]?.trim() || '';
      if (envVal) {
        if (!isUrlKey || envVal.startsWith('http://') || envVal.startsWith('https://')) {
          return envVal;
        }
      }
    }

    return defaultValue;
  }

  /**
   * Guarda un valor en Turso DB y actualiza la caché
   */
  static async set(key: string, value: string): Promise<void> {
    try {
      const isUrlKey = key.includes('URL');
      const cleanVal = (value || '').trim();

      // Si es una clave de URL, solo guardar si es válida
      if (isUrlKey && cleanVal && !cleanVal.startsWith('http://') && !cleanVal.startsWith('https://')) {
        logger.warn(`Intento de guardar URL inválida para ${key}: "${cleanVal}". Omitiendo.`);
        return;
      }

      const client = getTursoClient();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
        args: [key, cleanVal, now],
      });
      this.cache.set(key, cleanVal);
      logger.info(`Configuración actualizada: ${key}`);
    } catch (error: any) {
      logger.error(`Error al guardar configuración ${key}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Actualiza múltiples configuraciones de golpe
   */
  static async updateAll(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        await this.set(key, value);
      }
    }
  }

  /**
   * Obtiene todo el mapa de configuraciones
   */
  static async getAll(): Promise<AppSettings> {
    if (!this.initialized) {
      await this.init();
    }

    return {
      adminPassword: this.get('ADMIN_PASSWORD', 'ADMIN_PASSWORD', 'admin123'),
      evolutionUrl: this.get('EVOLUTION_URL', 'EVOLUTION_URL', 'http://localhost:8080'),
      evolutionApiKey: this.get('EVOLUTION_API_KEY', 'EVOLUTION_API_KEY', ''),
      evolutionInstanceName: this.get('INSTANCE_NAME', 'INSTANCE_NAME', 'isp-soporte'),
      groqApiKey: this.get('GROQ_API_KEY', 'GROQ_API_KEY', ''),
      groqModel: this.get('GROQ_MODEL', 'GROQ_MODEL', 'openai/gpt-oss-20b'),
      wisphubUrl: this.get('WISPHUB_API_URL', 'WISPHUB_API_URL', 'https://api.wisphub.net/api'),
      wisphubApiKey: this.get('WISPHUB_API_KEY', 'WISPHUB_API_KEY', ''),
      smartoltUrl: this.get('SMARTOLT_API_URL', 'SMARTOLT_API_URL', 'https://tu-dominio.smartolt.com/api'),
      smartoltApiKey: this.get('SMARTOLT_API_KEY', 'SMARTOLT_API_KEY', ''),
      ispName: this.get('ISP_NAME', 'ISP_NAME', 'CloudWareMx'),
      soporteHumanoPhone: this.get('SOPORTE_HUMANO_PHONE', 'SOPORTE_HUMANO_PHONE', ''),
      activationsGroupJid: this.get('ACTIVATIONS_GROUP_JID', 'ACTIVATIONS_GROUP_JID', this.get('GRUPO_ACTIVACIONES', 'GRUPO_ACTIVACIONES', '')),
      paymentBank: this.get('PAYMENT_BANK', 'PAYMENT_BANK', 'BBVA'),
      paymentAccount: this.get('PAYMENT_ACCOUNT', 'PAYMENT_ACCOUNT', ''),
      paymentConvenio: this.get('PAYMENT_CONVENIO', 'PAYMENT_CONVENIO', ''),
      paymentBeneficiary: this.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', ''),
      paymentNotes: this.get('PAYMENT_NOTES', 'PAYMENT_NOTES', ''),
      paymentMercadopagoUrl: this.get('PAYMENT_MERCADOPAGO_URL', 'MERCADOPAGO_URL', ''),
      mercadopagoAccessToken: this.get('MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN', ''),
      mercadopagoPublicKey: this.get('MERCADOPAGO_PUBLIC_KEY', 'MERCADOPAGO_PUBLIC_KEY', ''),
      notifRecordatorioPrevioEnabled: this.get('NOTIF_RECORDATORIO_PREVIO_ENABLED', 'NOTIF_RECORDATORIO_PREVIO_ENABLED', 'true'),
      notifRecordatorioPrevioDias: this.get('NOTIF_RECORDATORIO_PREVIO_DIAS', 'NOTIF_RECORDATORIO_PREVIO_DIAS', '3'),
      notifDiaCorteEnabled: this.get('NOTIF_DIA_CORTE_ENABLED', 'NOTIF_DIA_CORTE_ENABLED', 'false'),
      notifSuspensionEnabled: this.get('NOTIF_SUSPENSION_ENABLED', 'NOTIF_SUSPENSION_ENABLED', 'true'),
      notifInstanceName: this.get('NOTIF_INSTANCE_NAME', 'NOTIF_INSTANCE_NAME', 'atencion'),
      soporteInstanceName: this.get('SOPORTE_INSTANCE_NAME', 'SOPORTE_INSTANCE_NAME', 'soporte'),
      workHoursStart: this.get('WORK_HOURS_START', 'WORK_HOURS_START', '09:00'),
      workHoursEnd: this.get('WORK_HOURS_END', 'WORK_HOURS_END', '18:00'),
    };
  }

  /**
   * Genera una súper clave secreta de alta entropía para Evolution API
   */
  static generateEvolutionMasterKey(): string {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `EVO_MASTER_${randomHex}`;
  }
}
