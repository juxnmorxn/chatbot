import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'cloudware-admin-secret-key-2026';

export type AdminRole = 'superadmin' | 'soporte' | 'tecnico' | 'facturacion' | 'atencion';

export interface AdminTokenPayload {
  id: number;
  username: string;
  role: AdminRole;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminTokenPayload;
}

/**
 * Genera un hash seguro usando scrypt con salt aleatorio
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Comprueba si una contraseña coincide con el hash almacenado
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Genera un token firmado con HMAC-SHA256 con vigencia de 7 días
 */
export function generateSessionToken(payload: Omit<AdminTokenPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminTokenPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 días
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Valida un token firmado y retorna el payload si es auténtico y no ha expirado
 */
export function verifySessionToken(token: string): AdminTokenPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payloadB64, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    if (signature !== expectedSignature) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware Express para proteger rutas que requieren autenticación y roles específicos
 */
export function requireAdminAuth(allowedRoles?: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();

    if (!token) {
      res.status(401).json({ success: false, error: 'No autenticado. Inicie sesión en el panel.' });
      return;
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Sesión expirada o token inválido. Inicie sesión nuevamente.' });
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      res.status(403).json({ success: false, error: 'Acceso denegado: no cuenta con los permisos requeridos para esta sección.' });
      return;
    }

    (req as AuthenticatedRequest).adminUser = payload;
    next();
  };
}

export interface ClientPortalTokenPayload {
  phone: string;
  name?: string;
  serviceIds: (number | string)[];
  iat: number;
  exp?: number;
}

/**
 * Genera un token firmado de sesión para el Portal del Cliente permanente e indefinido
 */
export function generateClientPortalToken(phone: string, name?: string, serviceIds: (number | string)[] = []): string {
  const now = Math.floor(Date.now() / 1000);
  const cleanPhone = phone.replace(/\D/g, '');
  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
  const payload: ClientPortalTokenPayload = {
    phone: last10,
    name: name || '',
    serviceIds,
    iat: now,
    exp: now + (100 * 365 * 24 * 60 * 60), // Permanente (100 años de vigencia)
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Valida el token del portal del cliente
 */
export function verifyClientPortalToken(token: string): ClientPortalTokenPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payloadB64, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    if (signature !== expectedSignature) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: ClientPortalTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > 0 && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

