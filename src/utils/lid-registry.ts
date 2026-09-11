import { Logger } from './logger';

const logger = new Logger('LidRegistry');

/**
 * Registro en memoria para resolución bidireccional entre Teléfono real y WhatsApp LID
 * Evita el Error 463 de WhatsApp garantizando que los mensajes se entreguen siempre al hilo activo
 */
export class LidRegistry {
  private static phoneToLid = new Map<string, string>();
  private static lidToPhone = new Map<string, string>();

  static register(phone: string, lid: string): void {
    if (!phone || !lid) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanLid = lid.replace('@lid', '').replace(/\D/g, '');
    const lidJid = `${cleanLid}@lid`;

    this.phoneToLid.set(cleanPhone, lidJid);
    this.lidToPhone.set(cleanLid, cleanPhone);

    // Si tiene prefijo internacional 521 (ej. 5217721284398), guardar también versión sin 521
    if (cleanPhone.startsWith('521') && cleanPhone.length === 13) {
      this.phoneToLid.set(cleanPhone.slice(3), lidJid);
    }

    logger.debug(`[LID Mapped] Teléfono ${cleanPhone} <-> LID ${lidJid}`);
  }

  static getLid(phoneOrJid: string): string | null {
    if (!phoneOrJid) return null;
    if (phoneOrJid.includes('@lid')) return phoneOrJid.trim();
    const clean = phoneOrJid.replace(/\D/g, '');
    return this.phoneToLid.get(clean) || null;
  }

  static getPhone(lidOrJid: string): string | null {
    if (!lidOrJid) return null;
    const clean = lidOrJid.replace('@lid', '').replace(/\D/g, '');
    return this.lidToPhone.get(clean) || null;
  }

  static count(): number {
    return this.phoneToLid.size;
  }
}
