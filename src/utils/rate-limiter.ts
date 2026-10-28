import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';

const logger = new Logger('RateLimiter');

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Limitador de tasa en memoria ultraligero y seguro
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Has excedido el límite de intentos. Por favor espera unos minutos antes de volver a intentar.',
    statusCode = 429,
    keyGenerator = (req: Request) => {
      const forwarded = (req.headers['x-forwarded-for'] as string) || '';
      const ip = forwarded.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      return ip;
    },
    skip = () => false,
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Limpieza periódica cada 5 minutos
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Evitar que el timer impida que el proceso Node termine limpiamente
  if (interval.unref) {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // Filtrar marcas de tiempo fuera de la ventana
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    if (record.timestamps.length >= max) {
      const oldest = record.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      
      logger.warn(`Límite excedido para clave [${key}]. Intentos: ${record.timestamps.length}/${max}. Esperar ${retryAfterSeconds}s.`);
      
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(statusCode).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

/**
 * Claves compuestas para proteger endpoints de autenticación por IP y por Teléfono
 */
export function getPhoneOrIpKey(req: Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string) || '';
  const ip = forwarded.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const bodyPhone = (req.body?.phone || req.body?.identifier || '').toString().replace(/\D/g, '').slice(-10);
  return bodyPhone ? `${ip}:${bodyPhone}` : ip;
}

export function getPhoneKey(req: Request): string {
  const bodyPhone = (req.body?.phone || req.body?.identifier || '').toString().replace(/\D/g, '').slice(-10);
  if (bodyPhone) return `phone:${bodyPhone}`;
  const forwarded = (req.headers['x-forwarded-for'] as string) || '';
  return `ip:${forwarded.split(',')[0].trim() || req.socket.remoteAddress || 'unknown'}`;
}

// 1. Limiter general para endpoints de Auth del portal: Máximo 30 peticiones por 5 minutos por IP
export const portalAuthGeneralLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Demasiadas consultas de autenticación. Por favor espera unos minutos.',
});

// 2. Limiter para envío de OTPs (registro y recuperación): Máximo 3 envíos por 5 minutos por teléfono/IP
export const portalOtpSendLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  keyGenerator: getPhoneOrIpKey,
  message: 'Ya se han enviado varios códigos recientemente a este número. Por favor espera 5 minutos para solicitar uno nuevo.',
});

// 3. Limiter para intentos de inicio de sesión: Máximo 5 intentos fallidos por 5 minutos por teléfono/IP
export const portalLoginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 8,
  keyGenerator: getPhoneOrIpKey,
  message: 'Demasiados intentos de acceso. Por seguridad, tu cuenta ha pausado temporalmente los accesos por 5 minutos.',
});

// 4. Limiter para comprobación de existencia de cuentas: Máximo 20 consultas por 5 minutos por IP
export const portalCheckAccountLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Demasiadas consultas. Espera un momento antes de volver a intentar.',
});

