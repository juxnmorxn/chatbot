import { Request, Response } from 'express';
import { getClientPortalHtml } from '../views/client-portal.html';
import { getDbClient } from '../database/db';
import { SmartOLTService } from '../services/smartolt.service';
import { SettingsService } from '../services/settings.service';
import { EvolutionService } from '../services/evolution.service';
import { WispHubService } from '../services/wisphub.service';
import { config } from '../config/env';
import { Logger } from '../utils/logger';
import { hashPassword, verifyPassword, generateClientPortalToken, verifyClientPortalToken } from '../utils/auth';
import { cleanPersonName, normalizeText, computeNameMatchScore } from '../utils/fuzzy-matcher';
import { DbService } from '../services/db.service';
import { getCloudWareSphereSvg } from '../views/brand';

const logger = new Logger('ClientPortalController');

// 🔒 CACHÉ EN MEMORIA Y CONTROL DE CONCURRENCIA PARA PROTEGER LA API DE SMARTOLT
interface CachedSignal {
  data: any;
  timestamp: number;
}

const signalCache = new Map<string, CachedSignal>();
const SIGNAL_CACHE_TTL_MS = 90 * 1000; // 90 segundos de caché por ONU

interface CachedWifi {
  data: any;
  timestamp: number;
}
const wifiCache = new Map<string, CachedWifi>();
const WIFI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché para Wi-Fi

const rebootCooldowns = new Map<string, number>();
const REBOOT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre reinicios por cliente

const wifiChangeCooldowns = new Map<string, number>();
const WIFI_COOLDOWN_MS = 30 * 1000; // 30 segundos entre cambios de Wi-Fi

export class ClientPortalController {

  /**
   * Limpia cachés de señales y cooldowns de reinicio/wifi para pruebas
   */
  static clearPortalCache(phoneOrOnu?: string): void {
    if (phoneOrOnu) {
      signalCache.delete(phoneOrOnu);
      wifiCache.delete(phoneOrOnu);
      rebootCooldowns.delete(phoneOrOnu);
      wifiChangeCooldowns.delete(phoneOrOnu);
    } else {
      signalCache.clear();
      wifiCache.clear();
      rebootCooldowns.clear();
      wifiChangeCooldowns.clear();
    }
  }

  /**
   * Renderiza la página principal del Portal del Cliente / PWA
   */
  static async renderPortalHtml(_req: Request, res: Response): Promise<void> {
    const officePhone = await SettingsService.getPaymentOfficePhoneAsync();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getClientPortalHtml(officePhone));
  }

  /**
   * PWA: Web App Manifest (manifest.json)
   */
  static renderManifest(_req: Request, res: Response): void {
    const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
    const manifest = {
      name: `${ispName} - Portal del Cliente`,
      short_name: ispName,
      description: 'Consulta tu conexión de fibra óptica, señal en vivo, contraseña Wi-Fi y facturas.',
      start_url: '/portal',
      display: 'standalone',
      background_color: '#090d16',
      theme_color: '#0f172a',
      orientation: 'portrait-primary',
      icons: [
        {
          src: '/portal-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.json(manifest);
  }

  /**
   * PWA: Service Worker (sw.js) para soporte offline y renderizado instantáneo
   */
  static renderServiceWorker(_req: Request, res: Response): void {
    const swCode = `
const CACHE_NAME = 'client-portal-v4';
const ASSETS_TO_CACHE = [
  '/portal',
  '/manifest.json',
  '/portal-icon.svg',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.warn('[SW] Precache asset fail:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/portal', { ignoreSearch: true })))
  );
});
`;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(swCode);
  }

  /**
   * PWA: Ícono dinámico en formato SVG con la identidad oficial CloudWare Sphere
   */
  static renderIcon(_req: Request, res: Response): void {
    const isDark = _req.query.theme !== 'light';
    const svgIcon = getCloudWareSphereSvg({ size: 512, withBg: true, isDark });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svgIcon);
  }

  /**
   * Verifica si un teléfono o identificador ya tiene cuenta creada en el portal
   */
  static async checkAccount(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const cleanDigits = (phone || '').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || last10.length < 7) {
        res.status(400).json({ success: false, message: 'Ingresa un número de teléfono válido (10 dígitos).' });
        return;
      }

      const db = getDbClient();

      // 1. Verificar si existe en tabla de cuentas del portal
      const accRes = await db.execute({
        sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
        args: [last10],
      });

      const hasAccount = accRes.rows.length > 0;

      // 2. Verificar servicios en wisphub_clients
      const services = await ClientPortalController.findClientsByIdentifier(last10);
      if (!services || services.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No encontramos ningún contrato o servicio registrado con este número de teléfono.',
        });
        return;
      }

      res.json({
        success: true,
        hasAccount,
        phone: last10,
        clientName: services[0].nombre,
        servicesCount: services.length,
      });
    } catch (err: any) {
      logger.error('Error al verificar cuenta de portal:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al consultar cuenta.' });
    }
  }

  /**
   * Registro / Creación de contraseña inicial para un cliente
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { phone, password } = req.body;
      const cleanDigits = (phone || '').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || last10.length < 7) {
        res.status(400).json({ success: false, message: 'Número de teléfono inválido.' });
        return;
      }

      if (!password || password.length < 6) {
        res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(last10);
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'No encontramos ningún contrato con ese número de teléfono.' });
        return;
      }

      const clientName = services[0].nombre;
      const serviceIds = services.map(s => s.id_servicio);
      const passHash = hashPassword(password);
      const db = getDbClient();
      const now = new Date().toISOString();

      await db.execute({
        sql: `
          INSERT INTO client_portal_accounts (telefono, password_hash, nombre, created_at, updated_at, last_login)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(telefono) DO UPDATE SET
            password_hash = excluded.password_hash,
            nombre = excluded.nombre,
            updated_at = excluded.updated_at,
            last_login = excluded.last_login
        `,
        args: [last10, passHash, clientName, now, now, now],
      });

      const token = generateClientPortalToken(last10, clientName, serviceIds);

      res.json({
        success: true,
        message: '¡Cuenta activada con éxito! Bienvenido a tu portal.',
        token,
        client: {
          nombre: clientName,
          telefono: last10,
          servicesCount: services.length,
        },
      });
    } catch (err: any) {
      logger.error('Error al registrar cuenta en portal:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al registrar cuenta.' });
    }
  }

  /**
   * Vincula un número de teléfono / WhatsApp a un contrato existente por Folio o Nombre
   */
  static async linkPhone(req: Request, res: Response): Promise<void> {
    try {
      const { phone, identifier } = req.body;
      const cleanDigits = (phone || '').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || last10.length < 7) {
        res.status(400).json({ success: false, message: 'Número de teléfono requerido.' });
        return;
      }

      if (!identifier) {
        res.status(400).json({ success: false, message: 'Ingresa tu Folio o Nombre para vincular.' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(String(identifier));
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'No encontramos ningún contrato con ese Folio o Nombre.' });
        return;
      }

      const client = services[0];
      const db = getDbClient();
      const now = new Date().toISOString();

      // 1. Actualizar teléfono en wisphub_clients para todos los contratos del cliente
      await db.execute({
        sql: `UPDATE wisphub_clients SET telefono = ? WHERE id_servicio = ? OR nombre = ? OR (nombre_normalized IS NOT NULL AND nombre_normalized = ?)`,
        args: [last10, client.id_servicio, client.nombre, client.nombre_normalized || client.nombre],
      });

      // 2. Registrar en client_portal_accounts
      await db.execute({
        sql: `
          INSERT INTO client_portal_accounts (telefono, password_hash, nombre, created_at, updated_at, last_login)
          VALUES (?, '', ?, ?, ?, ?)
          ON CONFLICT(telefono) DO UPDATE SET
            nombre = excluded.nombre,
            updated_at = excluded.updated_at,
            last_login = excluded.last_login
        `,
        args: [last10, client.nombre, now, now, now],
      });

      const serviceIds = services.map(s => s.id_servicio);
      const token = generateClientPortalToken(last10, client.nombre, serviceIds);

      res.json({
        success: true,
        message: '¡Servicio vinculado exitosamente con tu número celular!',
        token,
        client: {
          id_servicio: client.id_servicio,
          nombre: client.nombre,
          telefono: last10,
        },
      });
    } catch (err: any) {
      logger.error('Error al vincular teléfono con servicio:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al vincular contrato.' });
    }
  }


  /**
   * Iniciar Sesión con Teléfono y Contraseña
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { phone, identifier, password, autoToken } = req.body;

      // 1. Si viene un autoToken / magic link firmado desde WhatsApp
      if (autoToken && typeof autoToken === 'string') {
        const payload = verifyClientPortalToken(autoToken);
        if (payload) {
          const db = getDbClient();
          const accRes = await db.execute({
            sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
            args: [payload.phone],
          });
          let account = accRes.rows[0];

          // Si el enlace fue legítimamente firmado pero aún no se había registrado en client_portal_accounts:
          if (!account) {
            try {
              await db.execute({
                sql: `INSERT OR IGNORE INTO client_portal_accounts (telefono, password_hash, nombre, is_active, token_version) VALUES (?, '', ?, 1, ?)`,
                args: [payload.phone, payload.name || '', payload.ver || 1],
              });
              const freshAcc = await db.execute({
                sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
                args: [payload.phone],
              });
              account = freshAcc.rows[0];
            } catch (_) {}
          }

          if (!account) {
            res.status(401).json({
              success: false,
              sessionRevoked: true,
              message: 'Este enlace de acceso ha expirado o ya no existe.',
            });
            return;
          }

          if (account.is_active === 0) {
            res.status(403).json({
              success: false,
              sessionRevoked: true,
              message: 'Esta cuenta o enlace ha sido desactivado por el administrador.',
            });
            return;
          }

          // Solo revocar si el token fue emitido ANTES de la fecha de revocación
          if (account.tokens_revoked_at && payload.iat < Math.floor(new Date(account.tokens_revoked_at as string).getTime() / 1000)) {
            res.status(401).json({
              success: false,
              sessionRevoked: true,
              message: 'Este enlace de acceso ha expirado o fue revocado.',
            });
            return;
          }

          if (account.token_version && payload.ver && payload.ver < Number(account.token_version)) {
            // Si el token es posterior a la revocación, sincronizar versión
            const isFresh = account.tokens_revoked_at ? (payload.iat >= Math.floor(new Date(account.tokens_revoked_at as string).getTime() / 1000)) : false;
            if (!isFresh) {
              res.status(401).json({
                success: false,
                sessionRevoked: true,
                message: 'Este enlace de acceso fue reemplazado por uno nuevo.',
              });
              return;
            }
          }

          const services = await ClientPortalController.findClientsByIdentifier(payload.phone);
          if (!services || services.length === 0) {
            res.status(404).json({ success: false, message: 'No se encontraron servicios asociados a este enlace.' });
            return;
          }

          res.json({
            success: true,
            token: autoToken,
            client: {
              nombre: payload.name || services[0]?.nombre || 'Cliente',
              telefono: payload.phone,
              servicesCount: services.length,
            },
            services: services.map((s: any) => ({
              id_servicio: s.id_servicio,
              nombre: s.nombre,
              direccion: s.direccion || s.router || 'Domicilio registrado',
              ip: s.ip,
              router: s.router,
              plan_internet: s.plan_internet,
              estado: s.estado,
              saldo: s.saldo,
            })),
          });
          return;
        } else {
          res.status(401).json({
            success: false,
            sessionRevoked: true,
            message: 'El enlace de acceso es inválido o ha expirado.',
          });
          return;
        }
      }

      const inputPhone = (phone || identifier || '').trim();
      const cleanDigits = inputPhone.replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || last10.length < 7) {
        res.status(400).json({ success: false, message: 'Ingresa tu número de teléfono de 10 dígitos.' });
        return;
      }

      if (!password) {
        res.status(400).json({ success: false, message: 'Ingresa tu contraseña de acceso.' });
        return;
      }

      const db = getDbClient();
      const accRes = await db.execute({
        sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
        args: [last10],
      });

      if (accRes.rows.length === 0) {
        // No tiene contraseña creada todavía
        res.status(404).json({
          success: false,
          needsRegistration: true,
          message: 'Aún no has creado tu contraseña para este número. Por favor créala a continuación.',
        });
        return;
      }

      const account = accRes.rows[0];
      const valid = verifyPassword(password, account.password_hash as string);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Contraseña incorrecta. Verifica e intenta de nuevo.' });
        return;
      }

      // Actualizar last_login
      const now = new Date().toISOString();
      await db.execute({
        sql: `UPDATE client_portal_accounts SET last_login = ? WHERE telefono = ?`,
        args: [now, last10],
      });

      const services = await ClientPortalController.findClientsByIdentifier(last10);
      const serviceIds = services.map(s => s.id_servicio);
      const token = generateClientPortalToken(last10, (account.nombre as string) || services[0]?.nombre, serviceIds);

      res.json({
        success: true,
        token,
        client: {
          nombre: account.nombre || services[0]?.nombre || 'Cliente',
          telefono: last10,
          servicesCount: services.length,
        },
        services: services.map((s: any) => ({
          id_servicio: s.id_servicio,
          nombre: s.nombre,
          direccion: s.direccion || s.router || 'Domicilio registrado',
          ip: s.ip,
          router: s.router,
          plan_internet: s.plan_internet,
          estado: s.estado,
          saldo: s.saldo,
        })),
      });
    } catch (err: any) {
      logger.error('Error en login de cliente:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al autenticar servicio.' });
    }
  }

  /**
   * Solicitar recuperación de contraseña por WhatsApp
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const cleanDigits = (phone || '').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || last10.length < 7) {
        res.status(400).json({ success: false, message: 'Ingresa tu número de teléfono registrado.' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(last10);
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'No encontramos ningún contrato con ese número de teléfono.' });
        return;
      }

      const clientName = services[0].nombre || 'Cliente';
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

      const db = getDbClient();
      await db.execute({
        sql: `
          INSERT INTO client_portal_accounts (telefono, password_hash, nombre, reset_token, reset_token_expires, updated_at)
          VALUES (?, '', ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(telefono) DO UPDATE SET
            reset_token = excluded.reset_token,
            reset_token_expires = excluded.reset_token_expires,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [last10, clientName, otp, expires],
      });

      const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWare');
      const appUrl = SettingsService.get('APP_URL', 'APP_URL', config.appUrl || 'http://2.25.241.239').replace(/\/+$/, '');
      const resetUrl = `${appUrl}/portal?resetCode=${otp}&p=${last10}`;

      const waMsg = `🔐 *Recuperación de Contraseña - ${ispName}*\n\n` +
        `Hola *${clientName}*, recibimos una solicitud para restablecer tu contraseña del Portal del Cliente.\n\n` +
        `Tu código de seguridad es:\n` +
        `👉 *${otp}*\n\n` +
        `O si lo prefieres, ingresa directamente desde este enlace:\n` +
        `🔗 ${resetUrl}\n\n` +
        `_Este código es personal y vence en 15 minutos._`;

      const targetDest = `521${last10}`;
      await EvolutionService.enviarTexto(targetDest, waMsg, { instant: true }).catch((e) => {
        logger.warn(`No se pudo enviar WhatsApp a ${targetDest}, intentando con ${last10}:`, e?.message || e);
        return EvolutionService.enviarTexto(last10, waMsg, { instant: true });
      });

      res.json({
        success: true,
        message: 'Te enviamos un código de recuperación a tu WhatsApp.',
        phone: last10,
      });
    } catch (err: any) {
      logger.error('Error en forgotPassword:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error al enviar código de recuperación.' });
    }
  }

  /**
   * Restablecer contraseña con código OTP
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code, newPassword } = req.body;
      const cleanDigits = (phone || '').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

      if (!last10 || !code || !newPassword || newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'Datos incompletos o contraseña demasiado corta (mínimo 6 caracteres).' });
        return;
      }

      const db = getDbClient();
      const accRes = await db.execute({
        sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? AND reset_token = ? LIMIT 1`,
        args: [last10, code.trim()],
      });

      if (accRes.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Código de recuperación incorrecto o vencido.' });
        return;
      }

      const account = accRes.rows[0];
      const expires = account.reset_token_expires as string;
      if (expires && new Date(expires).getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'El código de recuperación ha expirado. Solicita uno nuevo.' });
        return;
      }

      const passHash = hashPassword(newPassword);
      const now = new Date().toISOString();
      const services = await ClientPortalController.findClientsByIdentifier(last10);
      const clientName = (account.nombre as string) || services[0]?.nombre || 'Cliente';

      await db.execute({
        sql: `
          INSERT INTO client_portal_accounts (telefono, password_hash, nombre, reset_token, reset_token_expires, updated_at, last_login)
          VALUES (?, ?, ?, NULL, NULL, ?, ?)
          ON CONFLICT(telefono) DO UPDATE SET
            password_hash = excluded.password_hash,
            reset_token = NULL,
            reset_token_expires = NULL,
            updated_at = excluded.updated_at,
            last_login = excluded.last_login
        `,
        args: [last10, passHash, clientName, now, now],
      });

      const serviceIds = services.map(s => s.id_servicio);
      const token = generateClientPortalToken(last10, clientName, serviceIds);

      res.json({
        success: true,
        message: '¡Contraseña actualizada exitosamente! Has iniciado sesión.',
        token,
        client: {
          nombre: account.nombre || services[0]?.nombre || 'Cliente',
          telefono: last10,
          servicesCount: services.length,
        },
      });
    } catch (err: any) {
      logger.error('Error en resetPassword:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al restablecer contraseña.' });
    }
  }

  /**
   * Obtiene todos los datos del cliente, estado del módem, facturación y servicios relacionados
   */
  static async getClientData(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.query.token as string || req.query.auth as string || '');

      let verifiedPhone = '';
      let tokenName = '';
      let tokenServiceIds: (number | string)[] = [];

      if (token) {
        const payload = verifyClientPortalToken(token);
        if (payload) {
          const db = getDbClient();
          const accRes = await db.execute({
            sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
            args: [payload.phone],
          });
          let account = accRes.rows[0];

          // Si el enlace fue legítimamente firmado pero aún no se había registrado en client_portal_accounts:
          if (!account) {
            try {
              await db.execute({
                sql: `INSERT OR IGNORE INTO client_portal_accounts (telefono, password_hash, nombre, is_active, token_version) VALUES (?, '', ?, 1, ?)`,
                args: [payload.phone, payload.name || '', payload.ver || 1],
              });
              const freshAcc = await db.execute({
                sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
                args: [payload.phone],
              });
              account = freshAcc.rows[0];
            } catch (_) {}
          }

          if (!account) {
            res.status(401).json({
              success: false,
              sessionRevoked: true,
              message: 'Esta sesión o enlace ya no existe o fue eliminado.',
            });
            return;
          }

          if (account.is_active === 0) {
            res.status(403).json({
              success: false,
              sessionRevoked: true,
              message: 'Esta cuenta o enlace ha sido desactivado por el administrador.',
            });
            return;
          }

          // Solo revocar si el token fue emitido ANTES de la fecha de revocación
          if (account.tokens_revoked_at && payload.iat < Math.floor(new Date(account.tokens_revoked_at as string).getTime() / 1000)) {
            res.status(401).json({
              success: false,
              sessionRevoked: true,
              message: 'Tu sesión o enlace ha expirado o fue revocado por seguridad.',
            });
            return;
          }

          if (account.token_version && payload.ver && payload.ver < Number(account.token_version)) {
            const isFresh = account.tokens_revoked_at ? (payload.iat >= Math.floor(new Date(account.tokens_revoked_at as string).getTime() / 1000)) : false;
            if (!isFresh) {
              res.status(401).json({
                success: false,
                sessionRevoked: true,
                message: 'Tu sesión ha sido renovada. Por favor ingresa nuevamente.',
              });
              return;
            }
          }

          verifiedPhone = payload.phone;
          tokenName = payload.name || '';
          tokenServiceIds = payload.serviceIds || [];
        } else {
          // Token provisto pero inválido
          res.status(401).json({
            success: false,
            sessionRevoked: true,
            message: 'Tu sesión es inválida o ha expirado.',
          });
          return;
        }
      }

      const requestedServiceId = req.query.serviceId ? String(req.query.serviceId).trim() : '';
      const requestedId = (req.query.id || req.query.phone || req.query.p || '') as string;

      let services: any[] = [];

      // 1. Obtener los servicios legítimos del titular autenticado
      if (verifiedPhone) {
        services = await ClientPortalController.findClientsByIdentifier(verifiedPhone);
      } else if (requestedId) {
        services = await ClientPortalController.findClientsByIdentifier(requestedId);
      } else if (requestedServiceId) {
        services = await ClientPortalController.findClientsByIdentifier(requestedServiceId);
      }

      // Si no se encontraron contratos directamente por teléfono, buscar por nombre del token/cuenta
      if ((!services || services.length === 0) && tokenName && tokenName.trim().length >= 3) {
        logger.info(`[Portal Auth] Resolviendo servicios por tokenName "${tokenName}" para teléfono ${verifiedPhone}`);
        services = await ClientPortalController.findClientsByIdentifier(tokenName);
        if (services && services.length > 0 && verifiedPhone) {
          try {
            const db = getDbClient();
            await db.execute({
              sql: `UPDATE client_portal_accounts SET nombre = ?, updated_at = datetime('now') WHERE telefono = ?`,
              args: [services[0].nombre || tokenName, verifiedPhone],
            });
          } catch (_) {}
        }
      }

      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Cliente no localizado en el sistema.' });
        return;
      }

      // 2. Control estricto de servicio activo (Tenant Isolation / Multi-Servicio):
      // Si el usuario especificó un serviceId, debe existir DENTRO de sus contratos legítimos
      let client = services[0];
      if (requestedServiceId) {
        const exact = services.find((s: any) => String(s.id_servicio) === requestedServiceId);
        if (exact) {
          client = exact;
        } else if (!verifiedPhone) {
          const directMatch = await ClientPortalController.findClientsByIdentifier(requestedServiceId);
          if (directMatch && directMatch.length > 0) client = directMatch[0];
        }
      }

      const db = getDbClient();

      // Obtener lista completa de ONUs en SmartOLT para asociar nombres reales a cada servicio
      const allOnusRes = await db.execute('SELECT unique_external_id, sn, name, ip_address, zone_name, speed_profile FROM smartolt_onus');
      const allOnus = allOnusRes.rows || [];

      const matchOnuForService = (srv: any) => {
        const srvId = String(srv.id_servicio || '').trim();
        let srvSn = String(srv.sn_onu || '').trim().toUpperCase();
        if (srvSn.startsWith('48575443')) srvSn = 'HWTC' + srvSn.slice(8);
        if (srvSn.startsWith('5A544547')) srvSn = 'ZTEG' + srvSn.slice(8);
        const srvSnSuffix = srvSn.length >= 8 ? srvSn.slice(-8) : srvSn;
        const srvIp = String(srv.ip || '').trim();
        const srvName = cleanPersonName(String(srv.nombre || ''));

        // Prioridad 1: Por SN completo o sufijo (8 caracteres)
        if (srvSnSuffix && srvSnSuffix.length >= 6) {
          const bySn = allOnus.find((o: any) => {
            const oSn = String(o.sn || '').toUpperCase();
            return oSn === srvSn || oSn.endsWith(srvSnSuffix) || (srvSn.length >= 8 && oSn.includes(srvSnSuffix));
          });
          if (bySn) return bySn;
        }

        // Prioridad 2: Por coincidencia de alta confianza del NOMBRE COMPLETO del titular (score >= 85)
        // El nombre del titular es la identidad humana real y evita errores cuando los folios de SmartOLT difieren de WispHub
        if (srvName && srvName.length >= 8) {
          const byName = allOnus.find((o: any) => {
            const oName = String(o.name || '');
            const cleanOName = cleanPersonName(oName.replace(/^\d+[\s\-_.:]+/, ''));
            return computeNameMatchScore(srvName, cleanOName) >= 85;
          });
          if (byName) return byName;
        }

        // Prioridad 3: Por IP fija asignada exacta (única y fiable entre WispHub y SmartOLT)
        if (srvIp && srvIp !== 'N/A' && srvIp !== '0.0.0.0') {
          const byIp = allOnus.find((o: any) => String(o.ip_address || '').trim() === srvIp);
          if (byIp) return byIp;
        }

        // Prioridad 4: Por ID de servicio en el nombre de SmartOLT (SOLO si el nombre también coincide con confianza >= 65)
        if (srvId) {
          const byId = allOnus.find((o: any) => {
            const oName = String(o.name || '');
            const matchPrefix = oName.startsWith(`${srvId}-`) || oName.startsWith(`${srvId}.`) || oName.startsWith(`${srvId} `) || oName.startsWith(`${srvId}_`);
            if (!matchPrefix) return false;
            if (srvName && srvName.length >= 8) {
              const cleanOName = cleanPersonName(oName.replace(/^\d+[\s\-_.:]+/, ''));
              return computeNameMatchScore(srvName, cleanOName) >= 65;
            }
            return true;
          });
          if (byId) return byId;
        }

        return null;
      };

      const relatedServices = services.map((s: any) => {
        const matchedOnu = matchOnuForService(s);

        return {
          id_servicio: s.id_servicio,
          nombre: s.nombre,
          smartolt_name: matchedOnu?.name || s.nombre,
          sn_onu: matchedOnu?.sn || s.sn_onu || '',
          direccion: s.direccion || matchedOnu?.zone_name || s.router || 'Domicilio registrado',
          zona: matchedOnu?.zone_name || s.router || '',
          ip: s.ip || matchedOnu?.ip_address,
          router: s.router,
          plan_internet: s.plan_internet || matchedOnu?.speed_profile,
          estado: s.estado,
          saldo: s.saldo || 0,
        };
      });

      // 1. Obtener registro de SmartOLT para el servicio activo seleccionado
      let onuRecord: any = matchOnuForService(client);
      let cleanSn = (client.sn_onu || '').trim();
      if (/^48575443/i.test(cleanSn)) {
        cleanSn = 'HWTC' + cleanSn.slice(8);
      } else if (/^5A544547/i.test(cleanSn)) {
        cleanSn = 'ZTEG' + cleanSn.slice(8);
      }

      // Si no encontró en allOnus, intentar búsquedas directas en la base de datos
      if (!onuRecord && cleanSn) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE sn = ? OR sn = ? OR unique_external_id = ? OR sn LIKE ? LIMIT 1`,
          args: [cleanSn.toUpperCase(), (client.sn_onu || '').toUpperCase(), cleanSn.toUpperCase(), `%${cleanSn.slice(-8)}%`],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      if (!onuRecord && client.ip) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE ip_address = ? OR raw_data LIKE ? LIMIT 1`,
          args: [client.ip, `%"${client.ip}"%`],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      // Prioridad 3: Por coincidencia de Nombre completo de alta confianza (score >= 85)
      // Identifica al titular legítimo aún si los folios numéricos de SmartOLT no coinciden con WispHub
      if (!onuRecord && client.nombre) {
        const cleanName = cleanPersonName(client.nombre);
        if (cleanName.length >= 8) {
          const firstWords = cleanName.split(' ').slice(0, 2).join(' ');
          const candOnusRes = await db.execute({
            sql: `SELECT * FROM smartolt_onus WHERE name_normalized LIKE ? OR name LIKE ? LIMIT 15`,
            args: [`%${firstWords}%`, `%${firstWords}%`],
          });
          for (const cand of (candOnusRes.rows as any[])) {
            const candNameClean = cleanPersonName(String(cand.name || '').replace(/^\d+[\s\-_.:]+/, ''));
            const score = computeNameMatchScore(cleanName, candNameClean);
            if (score >= 85) {
              onuRecord = cand;
              break;
            }
          }
        }
      }

      // Prioridad 4: Si tiene prefijo de contrato en usuario_rb (ej: 0696)
      if (!onuRecord && client.raw_data) {
        try {
          const rawParsed = JSON.parse(client.raw_data);
          const uStr = rawParsed.usuario || '';
          const matchU = uStr.match(/^\d+/);
          if (matchU) {
            const numPref = matchU[0].replace(/^0+/, '');
            const onuRes = await db.execute({
              sql: `SELECT * FROM smartolt_onus WHERE name LIKE ? OR name LIKE ? LIMIT 1`,
              args: [`%${matchU[0]}%`, `%${numPref}%`],
            });
            if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
          }
        } catch (_) {}
      }

      // Prioridad 5: Por ID de servicio en SmartOLT (VALIDANDO QUE EL TITULAR COINCIDA PARA NO ASIGNAR A OTRO CLIENTE)
      if (!onuRecord && client.id_servicio) {
        const srvId = String(client.id_servicio).trim();
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE name LIKE ? OR name LIKE ? OR name LIKE ? OR raw_data LIKE ? LIMIT 1`,
          args: [`${srvId}-%`, `${srvId}.%`, `${srvId} %`, `%"${srvId}"%`],
        });
        if (onuRes.rows.length > 0) {
          const cand = onuRes.rows[0];
          if (client.nombre && client.nombre.length >= 8) {
            const candNameClean = cleanPersonName(String(cand.name || '').replace(/^\d+[\s\-_.:]+/, ''));
            const score = computeNameMatchScore(cleanPersonName(client.nombre), candNameClean);
            if (score >= 60) {
              onuRecord = cand;
            }
          } else {
            onuRecord = cand;
          }
        }
      }

      // 2. Obtener estado de señal (desde caché o OLT de forma controlada)
      const targetOnuId = onuRecord?.unique_external_id || onuRecord?.sn || cleanSn || client.sn_onu;
      let signal: any = {
        status: client.estado === 'activo' ? 'ONLINE' : 'OFFLINE',
        opticalPowerDbm: null,
      };

      if (targetOnuId) {
        signal = await ClientPortalController.getCachedOrLiveSignal(targetOnuId);
      }

      // 3. Verificar caídas de red activas en la zona del cliente
      let activeOutage: any = null;
      try {
        const clientZone = client.router || onuRecord?.zone_name || 'General';
        const outageRes = await db.execute({
          sql: `SELECT * FROM network_outages WHERE status = 'active' AND (zone_name LIKE ? OR LOWER(zone_name) IN ('todas', 'todos', 'general', 'global')) LIMIT 1`,
          args: [`%${clientZone}%`],
        });
        if (outageRes.rows.length > 0) {
          const o = outageRes.rows[0];
          activeOutage = {
            active: true,
            title: `Mantenimiento en zona ${o.zone_name}`,
            description: (o.notes as string) || 'Cuadrillas técnicas trabajando en la infraestructura de fibra.',
          };
        }
      } catch (outageErr: any) {
        logger.warn('Error al verificar network_outages:', outageErr?.message || outageErr);
      }

      // 4. Datos Wi-Fi reales Dual-Band (2.4 GHz y 5 GHz) desde SmartOLT
      let wifiInfo: any = {
        ssid24: '',
        password24: '',
        ssid5g: '',
        password5g: '',
        has5g: false,
        ssid: '',
        password: '',
      };

      if (targetOnuId) {
        // Revisar caché en memoria primero
        const cached = wifiCache.get(targetOnuId);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < WIFI_CACHE_TTL_MS && (cached.data.ssid24 || cached.data.ssid5g)) {
          wifiInfo = cached.data;
        } else {
          try {
            const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 8000));
            const wifiPromise = SmartOLTService.getOnuWifiDetails(targetOnuId);
            const wifiDetails = await Promise.race([wifiPromise, timeoutPromise]);
            if (wifiDetails && (wifiDetails.ssid24 || wifiDetails.ssid5g || wifiDetails.ssid)) {
              wifiInfo = {
                ssid24: wifiDetails.ssid24 || wifiDetails.ssid || '',
                password24: wifiDetails.password24 || wifiDetails.password || '',
                ssid5g: wifiDetails.ssid5g || '',
                password5g: wifiDetails.password5g || wifiDetails.password24 || '',
                has5g: !!wifiDetails.has5g,
                ssid: wifiDetails.ssid24 || wifiDetails.ssid || '',
                password: wifiDetails.password24 || wifiDetails.password || '',
              };
              wifiCache.set(targetOnuId, { data: wifiInfo, timestamp: now });
            }
          } catch (wErr) {
            logger.warn(`No se pudo obtener WiFi de SmartOLT para ${targetOnuId}:`, wErr);
          }
        }
      }

      // Si la OLT no traía SSIDs configurados todavía, fallback con marca de servicio
      const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
      if (!wifiInfo.ssid24 && !wifiInfo.ssid5g) {
        wifiInfo.ssid24 = `${ispName}-${client.id_servicio}`;
        wifiInfo.password24 = onuRecord?.sn ? onuRecord.sn.slice(-8) : '12345678';
        wifiInfo.ssid = wifiInfo.ssid24;
        wifiInfo.password = wifiInfo.password24;
      }
      if (wifiInfo.has5g && !wifiInfo.ssid5g && wifiInfo.ssid24) {
        wifiInfo.ssid5g = `${wifiInfo.ssid24}-5G`;
        wifiInfo.password5g = wifiInfo.password24;
      }

      const wifi = wifiInfo;

      // 5. Verificar si el cliente ya tiene contraseña registrada
      const targetPhone10 = (verifiedPhone || client.telefono || '').replace(/\D/g, '').slice(-10);
      const clientPhone10 = (client.telefono || '').replace(/\D/g, '').slice(-10);
      let hasPassword = false;
      let tokenVer = 1;

      const accRes = await db.execute({
        sql: `SELECT id, password_hash, token_version FROM client_portal_accounts WHERE (telefono = ? OR telefono = ? OR nombre = ?) AND password_hash IS NOT NULL AND password_hash != '' LIMIT 1`,
        args: [targetPhone10, clientPhone10, client.nombre],
      });
      if (accRes.rows.length > 0) {
        hasPassword = true;
        tokenVer = Number(accRes.rows[0].token_version || 1);
      }

      // Generar token permanente e indestructible para auto-autenticación
      const serviceIds = services.map((s: any) => s.id_servicio);
      const sessionToken = generateClientPortalToken(verifiedPhone || client.telefono || '', client.nombre, serviceIds, tokenVer);

      res.json({
        success: true,
        token: sessionToken,
        hasPassword,
        client: {
          id_servicio: client.id_servicio,
          nombre: client.nombre,
          smartolt_name: onuRecord?.name || client.nombre,
          telefono: client.telefono,
          direccion: client.direccion || onuRecord?.zone_name,
          ip: client.ip || onuRecord?.ip_address,
          router: client.router,
          estado: client.estado,
          saldo: client.saldo || 0,
          precio_plan: client.precio_plan,
          plan_internet: client.plan_internet || onuRecord?.speed_profile || '40 Megas',
          dia_corte: client.dia_corte,
          fecha_corte: client.fecha_corte,
        },
        onu: onuRecord ? {
          sn: onuRecord.sn,
          name: onuRecord.name,
          model: onuRecord.onu_type_name,
          zone_name: onuRecord.zone_name,
          speed_profile: onuRecord.speed_profile,
        } : null,
        relatedServices,
        signal,
        wifi,
        outage: activeOutage,
        bankDetails: {
          bank: SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK_NAME', 'BBVA Bancomer'),
          clabe: SettingsService.get('PAYMENT_CLABE', 'PAYMENT_BANK_CLABE', '012 180 0152433212 90'),
          account: SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '012 180 0152433212 90'),
          beneficiary: SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', config.isp.name || 'CloudWareMx'),
          reference: `SRV-${client.id_servicio}`,
          titular: cleanPersonName(client.nombre || ''),
          concept: cleanPersonName(client.nombre || ''),
          officePhone: await SettingsService.getPaymentOfficePhoneAsync(),
        },
      });
    } catch (err: any) {
      logger.error('Error al obtener datos de cliente en portal:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error al consultar datos del servicio.' });
    }
  }

  /**
   * Obtiene el historial detallado de facturas y pagos (WispHub / Sipgun)
   */
  static async getBillingHistory(req: Request, res: Response): Promise<void> {
    try {
      const rawId = (req.query.id || req.query.serviceId || req.query.phone || '') as string;
      if (!rawId) {
        res.status(400).json({ success: false, message: 'Identificador de servicio requerido.' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(rawId);
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
        return;
      }

      let client = services[0];
      const targetServiceId = req.query.serviceId ? String(req.query.serviceId).trim() : '';
      if (targetServiceId) {
        const exact = services.find((s: any) => String(s.id_servicio) === targetServiceId);
        if (exact) client = exact;
      }
      let facturas: any[] = [];
      let rawUserData: any = {};
      try { rawUserData = JSON.parse(client.raw_data || '{}'); } catch (_) {}

      try {
        facturas = await WispHubService.getInvoicesForClient(client.id_servicio, {
          usuario: rawUserData.usuario || client.usuario_rb,
          nombre: client.nombre,
        });
      } catch (fErr: any) {
        logger.warn(`Error al consultar facturas para ${client.id_servicio}:`, fErr?.message || fErr);
      }

      // Estructurar respuesta con facturas e información de pago bancario
      res.json({
        success: true,
        balance: Number(client.saldo || 0),
        planPrice: Number(client.precio_plan || 0),
        dueDate: client.fecha_corte || `Día ${client.dia_corte || 5} de cada mes`,
        status: client.estado,
        invoices: facturas.map((f: any) => ({
          id: f.id_factura || f.id || client.id_servicio,
          folio: f.folio || `FAC-${f.id_factura || client.id_servicio}`,
          monto: Number(f.total || f.monto || client.saldo || client.precio_plan || 0),
          estado: f.estado || (Number(client.saldo || 0) > 0 ? 'Pendiente' : 'Pagada'),
          fecha_emision: f.fecha_emision || new Date().toISOString().slice(0, 10),
          fecha_vencimiento: f.fecha_vencimiento || client.fecha_corte || 'Próximo corte',
          fecha_pago: f.fecha_pago || null,
          descripcion: f.descripcion || '',
          link_pago: f.link_pago || (f.id_factura ? `https://wisphub.net/factura/${f.id_factura}/` : null),
          pdf_url: `/api/portal/invoice/${f.id_factura || f.id || client.id_servicio}/receipt`,
        })),
        bankDetails: {
          bank: SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK_NAME', 'BBVA Bancomer'),
          clabe: SettingsService.get('PAYMENT_CLABE', 'PAYMENT_BANK_CLABE', '012 180 0152433212 90'),
          account: SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '012 180 0152433212 90'),
          beneficiary: SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', config.isp.name || 'CloudWareMx'),
          reference: `SRV-${client.id_servicio}`,
          titular: cleanPersonName(client.nombre || ''),
          concept: cleanPersonName(client.nombre || ''),
          officePhone: await SettingsService.getPaymentOfficePhoneAsync(),
        },
      });
    } catch (err: any) {
      logger.error('Error al obtener historial de facturas:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error al consultar historial de facturación.' });
    }
  }

  /**
   * Consulta de señal en vivo (Con caché obligatoria de 90s para proteger la API de SmartOLT)
   */
  static async getLiveSignal(req: Request, res: Response): Promise<void> {
    try {
      const rawId = (req.query.id || req.query.phone || '') as string;
      if (!rawId) {
        res.status(400).json({ success: false, message: 'Identificador requerido' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(rawId);
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        return;
      }
      const client = services[0];

      const db = getDbClient();
      let onuId = client.sn_onu;

      if (!onuId && client.ip) {
        const onuRes = await db.execute({
          sql: `SELECT unique_external_id, sn FROM smartolt_onus WHERE ip_address = ? LIMIT 1`,
          args: [client.ip],
        });
        if (onuRes.rows.length > 0) {
          onuId = (onuRes.rows[0].unique_external_id || onuRes.rows[0].sn) as string;
        }
      }

      if (!onuId) {
        res.json({
          success: true,
          signal: { status: 'ONLINE', opticalPowerDbm: null, message: 'Módem sincronizado en red.' },
        });
        return;
      }

      const signal = await ClientPortalController.getCachedOrLiveSignal(onuId);
      res.json({ success: true, signal });
    } catch (err: any) {
      logger.error('Error al consultar señal en vivo:', err?.message || err);
      res.status(500).json({ success: false, message: 'No se pudo verificar la señal en este momento.' });
    }
  }

  /**
   * Cambiar configuración Wi-Fi (SSID o Contraseña) con Cooldown de 30s
   */
  static async changeWifi(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, ssid, ssid24, ssid5g, password } = req.body;
      if (!clientId || !password || password.length < 8) {
        res.status(400).json({ success: false, message: 'Contraseña inválida (mínimo 8 caracteres).' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(String(clientId));
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        return;
      }
      const client = services[0];

      const key = String(client.id_servicio || client.telefono);
      const lastChange = wifiChangeCooldowns.get(key) || 0;
      const elapsed = Date.now() - lastChange;

      if (elapsed < WIFI_COOLDOWN_MS) {
        const waitSec = Math.ceil((WIFI_COOLDOWN_MS - elapsed) / 1000);
        res.status(429).json({
          success: false,
          message: `Por seguridad, espera ${waitSec} segundos antes de cambiar la clave nuevamente.`,
        });
        return;
      }

      const db = getDbClient();

      // Localizar ONU real del cliente con alta precisión
      let targetOnu: any = null;
      if (client.ip) {
        const ipRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE ip_address = ? OR raw_data LIKE ? LIMIT 1`,
          args: [client.ip, `%"${client.ip}"%`]
        });
        if (ipRes.rows.length > 0) targetOnu = ipRes.rows[0];
      }
      if (!targetOnu && client.nombre) {
        const cleanName = cleanPersonName(client.nombre);
        if (cleanName.length >= 8) {
          const firstWords = cleanName.split(' ').slice(0, 2).join(' ');
          const candRes = await db.execute({
            sql: `SELECT * FROM smartolt_onus WHERE name_normalized LIKE ? OR name LIKE ? LIMIT 10`,
            args: [`%${firstWords}%`, `%${firstWords}%`]
          });
          for (const cand of (candRes.rows as any[])) {
            const candNameClean = cleanPersonName(String(cand.name || '').replace(/^\d+[\s\-_.:]+/, ''));
            if (computeNameMatchScore(cleanName, candNameClean) >= 80) {
              targetOnu = cand;
              break;
            }
          }
        }
      }
      if (!targetOnu && client.sn_onu) {
        let cleanSn = String(client.sn_onu).trim();
        if (/^48575443/i.test(cleanSn)) cleanSn = 'HWTC' + cleanSn.slice(8);
        const snRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE sn = ? OR unique_external_id = ? OR sn LIKE ? LIMIT 1`,
          args: [cleanSn.toUpperCase(), cleanSn.toUpperCase(), `%${cleanSn.slice(-8)}%`]
        });
        if (snRes.rows.length > 0) targetOnu = snRes.rows[0];
      }

      const targetId = targetOnu?.unique_external_id || targetOnu?.sn || client.sn_onu || client.ip || client.nombre;
      const result = await SmartOLTService.updateOnuWifiPassword(targetId, {
        password,
        ssid24: ssid24 || ssid || undefined,
        ssid5g: ssid5g || undefined,
      });

      wifiChangeCooldowns.set(key, Date.now());

      const updatedWifiData = {
        has5g: result.has5g !== false,
        ssid24: result.ssid24 || (ssid24 || ssid || 'CloudWare-WiFi'),
        password24: result.password || password,
        ssid5g: result.ssid5g || (result.ssid24 ? `${result.ssid24}-5G` : 'CloudWare-WiFi-5G'),
        password5g: result.password || password,
        ssid: result.ssid24 || (ssid24 || ssid || 'CloudWare-WiFi'),
        password: result.password || password,
      };

      // Guardar en cachés de memoria para reflejar de inmediato en el portal
      wifiCache.set(key, { data: updatedWifiData, timestamp: Date.now() });
      if (targetId) wifiCache.set(targetId, { data: updatedWifiData, timestamp: Date.now() });
      if (client.telefono) wifiCache.set(client.telefono, { data: updatedWifiData, timestamp: Date.now() });

      // Registrar ticket de soporte para auditoría técnica
      try {
        await db.execute({
          sql: `INSERT INTO tickets (ticket_number, titular, telefono, router, tipo_problema, descripcion, prioridad, origen, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          args: [
            `WIFI-${Date.now().toString().slice(-6)}`,
            client.nombre || 'Cliente',
            client.telefono || '',
            client.router || targetOnu?.zone_name || 'General',
            'Cambio de Contraseña Wi-Fi',
            `El cliente cambió su contraseña Wi-Fi desde el Portal Web. Red 2.4G: ${updatedWifiData.ssid24}. Módem: ${targetId}.`,
            'Baja',
            'PORTAL_WEB',
            'resuelto'
          ]
        });
      } catch (_) {}

      res.json({
        success: true,
        message: '¡Contraseña Wi-Fi configurada con éxito en tu módem y cuenta!',
        ssid: updatedWifiData.ssid24,
        password: updatedWifiData.password,
      });
    } catch (err: any) {
      logger.error('Error al cambiar Wi-Fi desde portal:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al actualizar Wi-Fi.' });
    }
  }

  /**
   * Reinicio remoto de módem (Con Cooldown Estricto de 5 Minutos para Proteger OLT)
   */
  static async rebootModem(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.body;
      if (!clientId) {
        res.status(400).json({ success: false, message: 'Cliente requerido.' });
        return;
      }

      const services = await ClientPortalController.findClientsByIdentifier(String(clientId));
      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        return;
      }
      const client = services[0];

      const key = String(client.id_servicio || client.telefono);
      const lastReboot = rebootCooldowns.get(key) || 0;
      const elapsed = Date.now() - lastReboot;

      if (elapsed < REBOOT_COOLDOWN_MS) {
        const waitMins = Math.ceil((REBOOT_COOLDOWN_MS - elapsed) / 60000);
        res.status(429).json({
          success: false,
          message: `Tu módem ya fue reiniciado recientemente. Por favor espera ${waitMins} minutos antes de volver a solicitarlo.`,
        });
        return;
      }

      const targetId = client.sn_onu || client.ip || client.nombre;
      const result = await SmartOLTService.rebootONU(targetId);

      if (result.success) {
        rebootCooldowns.set(key, Date.now());
        // Invalidar caché de señal para forzar lectura fresca tras el reinicio
        signalCache.delete(targetId);
        res.json({
          success: true,
          message: 'Señal de reinicio enviada correctamente a tu equipo.',
        });
      } else {
        res.status(500).json({ success: false, message: result.message || 'No se pudo reiniciar el módem.' });
      }
    } catch (err: any) {
      logger.error('Error al reiniciar módem desde portal:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error al enviar orden de reinicio.' });
    }
  }

  /**
   * Helper: Obtiene señal desde caché en memoria o consulta SmartOLT de forma segura
   */
  private static async getCachedOrLiveSignal(onuId: string): Promise<any> {
    const cleanId = onuId.trim();
    const now = Date.now();
    const cached = signalCache.get(cleanId);

    if (cached && (now - cached.timestamp) < SIGNAL_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(() => resolve({ status: 'ONLINE', opticalPowerDbm: null, message: 'Señal sincronizada' }), 2500)
      );

      const fetchPromise = (async () => {
        const statusRes = await SmartOLTService.obtenerEstadoONU(cleanId);
        return {
          status: statusRes.status,
          rawStatus: statusRes.rawStatus,
          opticalPowerDbm: statusRes.opticalPowerDbm,
          uptime: statusRes.uptime,
          descripcion: statusRes.descripcion,
        };
      })();

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data && data.status) {
        signalCache.set(cleanId, { data, timestamp: now });
      }
      return data;
    } catch (err: any) {
      logger.warn(`No se pudo consultar SmartOLT para ${cleanId}:`, err?.message || err);
      return { status: 'ONLINE', opticalPowerDbm: null };
    }
  }

  /**
   * Extrae el nombre base de un titular eliminando sufijos de múltiples contratos
   * Ej: "Idalia Jokabed Chavez Ruiz 3" -> "Idalia Jokabed Chavez Ruiz"
   * Ej: "1857-Idalia Jokabed Chavez Ruiz-2" -> "Idalia Jokabed Chavez Ruiz"
   */
  public static extractBaseCustomerName(name: string): string {
    if (!name) return '';
    let clean = name.trim();
    // Quitar prefijo de número de servicio si viene como "1855-Nombre" o "1855.Nombre"
    clean = clean.replace(/^\d+[\s\-_.:]+/, '');
    // Quitar sufijos comunes de servicios múltiples (" 2", " 3", ".2", ".3", "-2", "-3", " Serv.2", " Serv.3", " (2)", etc.)
    clean = clean.replace(/[\s\-_.:]*(?:serv(?:\.|icio)?\s*\d+|\(\s*\d+\s*\)|-\s*\d+|\.\s*\d+|\b\d+\b)\s*$/i, '');
    return clean.trim();
  }

  /**
   * Helper: Localiza TODOS los servicios vinculados a un cliente por Teléfono, Folio o SN
   */
  public static async findClientsByIdentifier(rawId: string): Promise<any[]> {
    const clean = (rawId || '').trim();
    if (!clean) return [];
    const db = getDbClient();
    const cleanDigits = clean.replace(/\D/g, '');
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    let initialMatches: any[] = [];

    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(clean);

    // 1. SI CONTIENE LETRAS: Búsqueda PRIORITARIA por Nombre del Titular (evita errores de folios duplicados)
    if (hasLetters) {
      const cleanName = cleanPersonName(clean);
      const normName = normalizeText(cleanName || clean);

      // 1.1 Coincidencia directa por nombre / normalizado
      const resName = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? OR nombre LIKE ? OR nombre_normalized LIKE ? ORDER BY id_servicio ASC LIMIT 15`,
        args: [`%${clean}%`, `%${clean}%`, `%${normName}%`, `%${normName}%`],
      });
      if (resName.rows.length > 0) {
        initialMatches.push(...(resName.rows as any[]));
      }

      // 1.2 Búsqueda por palabras clave individuales (AND) para nombres con apellidos
      if (initialMatches.length === 0 && normName) {
        const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'casa', 'soy', 'me', 'llamo']);
        const words = normName.split(' ').filter(w => w.length >= 3 && !STOP.has(w));
        if (words.length >= 2) {
          const andClauses = words.map(() => '(nombre LIKE ? OR nombre_normalized LIKE ?)').join(' AND ');
          const args = words.flatMap(w => [`%${w}%`, `%${w}%`]);
          const andRes = await db.execute({
            sql: `SELECT * FROM wisphub_clients WHERE ${andClauses} ORDER BY id_servicio ASC LIMIT 15`,
            args,
          });
          if (andRes.rows.length > 0) {
            initialMatches.push(...(andRes.rows as any[]));
          }
        }
      }

      // 1.3 Búsqueda difusa avanzada (Levenshtein + fonética) en WispHub
      if (initialMatches.length === 0) {
        try {
          const fuzzyClients = await DbService.searchWisphubClientsFuzzy(clean, 10);
          if (fuzzyClients && fuzzyClients.length > 0) {
            initialMatches.push(...fuzzyClients);
          }
        } catch (fuzzyErr) {
          logger.warn('Error en fuzzy match de findClientsByIdentifier:', fuzzyErr);
        }
      }

      // 1.4 Respaldo: Buscar en SmartOLT por nombre y cruzar con WispHub
      if (initialMatches.length === 0) {
        try {
          const onus = await DbService.searchOnusFuzzy(clean, 5);
          for (const o of onus) {
            if (o.matchScore >= 80) {
              const titularOnu = cleanPersonName(o.name);
              if (titularOnu && titularOnu.length >= 6) {
                const whMatch = await db.execute({
                  sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? OR ip = ? LIMIT 5`,
                  args: [`%${titularOnu}%`, `%${normalizeText(titularOnu)}%`, o.ip_address || ''],
                });
                if (whMatch.rows.length > 0) {
                  initialMatches.push(...(whMatch.rows as any[]));
                  break;
                }
              }
            }
          }
        } catch (oltErr) {
          logger.warn('Error al cruzar SmartOLT por nombre en findClientsByIdentifier:', oltErr);
        }
      }
    }

    // 2. SI ES NÚMERO DE TELÉFONO (10 dígitos o número móvil)
    if (initialMatches.length === 0 && last10 && last10.length >= 7) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE telefono LIKE ? OR telefonos_adicionales LIKE ? ORDER BY id_servicio ASC LIMIT 20`,
        args: [`%${last10}%`, `%${last10}%`],
      });
      if (res.rows.length > 0) {
        initialMatches.push(...(res.rows as any[]));
      } else {
        // 2.1 Buscar si este teléfono fue vinculado previamente en client_portal_accounts
        const acc = await db.execute({
          sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
          args: [last10],
        });
        if (acc.rows.length > 0 && acc.rows[0].nombre) {
          const accName = cleanPersonName(String(acc.rows[0].nombre));
          if (accName && accName.length >= 6 && !accName.toLowerCase().includes('revocado')) {
            const byName = await db.execute({
              sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? ORDER BY id_servicio ASC LIMIT 10`,
              args: [`%${accName}%`, `%${normalizeText(accName)}%`],
            });
            if (byName.rows.length > 0) initialMatches.push(...(byName.rows as any[]));
          }
        }

        // 2.2 Buscar si el usuario interactuó por WhatsApp y tiene sesión vinculada a un cliente
        if (initialMatches.length === 0) {
          const sessRes = await db.execute({
            sql: `SELECT client_id, client_name FROM sessions WHERE phone LIKE ? AND (client_id IS NOT NULL OR client_name IS NOT NULL) ORDER BY last_interaction DESC LIMIT 1`,
            args: [`%${last10}%`],
          });
          if (sessRes.rows.length > 0) {
            const sId = sessRes.rows[0].client_id;
            const sName = cleanPersonName(String(sessRes.rows[0].client_name || ''));
            if (sId) {
              const byId = await db.execute({
                sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
                args: [sId],
              });
              if (byId.rows.length > 0) initialMatches.push(...(byId.rows as any[]));
            }
            if (initialMatches.length === 0 && sName && sName.length >= 6) {
              const byName = await db.execute({
                sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? ORDER BY id_servicio ASC LIMIT 10`,
                args: [`%${sName}%`, `%${normalizeText(sName)}%`],
              });
              if (byName.rows.length > 0) initialMatches.push(...(byName.rows as any[]));
            }
            // Auto-vincular en client_portal_accounts y wisphub_clients para persistencia permanente
            if (initialMatches.length > 0) {
              const foundClient = initialMatches[0];
              try {
                await db.execute({
                  sql: `UPDATE client_portal_accounts SET nombre = ? WHERE telefono = ?`,
                  args: [foundClient.nombre, last10],
                });
                await db.execute({
                  sql: `UPDATE wisphub_clients SET telefono = ? WHERE id_servicio = ? AND (telefono IS NULL OR telefono = '' OR telefono LIKE '777%')`,
                  args: [last10, foundClient.id_servicio],
                });
              } catch (_) {}
            }
          }
        }
      }
    }

    // 3. SI ES UN IDENTIFICADOR NUMÉRICO CORTO (ej. 715 o 696)
    if (initialMatches.length === 0 && /^\d{1,6}$/.test(clean)) {
      // 3.1 Buscar PRIMERO por ID de servicio directo en WispHub (el folio oficial del contrato)
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
        args: [Number(clean)],
      });
      if (res.rows.length > 0) {
        initialMatches.push(...(res.rows as any[]));
      }

      // 3.2 Si no existe en WispHub como folio directo, cruzar con SmartOLT por prefijo de ONU (ej: "696-Maria del Pilar")
      if (initialMatches.length === 0) {
        try {
          const smartMatch = await db.execute({
            sql: `SELECT name, ip_address, sn FROM smartolt_onus WHERE name LIKE ? OR name LIKE ? OR name LIKE ? LIMIT 5`,
            args: [`${clean}-%`, `${clean} %`, `0${clean}-%`],
          });
          for (const row of smartMatch.rows) {
            const titularSmart = cleanPersonName(String(row.name || ''));
            if (titularSmart && titularSmart.length >= 6) {
              const byTitular = await db.execute({
                sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? OR ip = ? LIMIT 5`,
                args: [`%${titularSmart}%`, `%${normalizeText(titularSmart)}%`, String(row.ip_address || '')],
              });
              if (byTitular.rows.length > 0) {
                initialMatches.push(...(byTitular.rows as any[]));
                break;
              }
            }
          }
        } catch (errSmart) {
          logger.warn('Error al cruzar prefijo numérico en smartolt_onus:', errSmart);
        }
      }
    }

    // 4. POR NÚMERO DE SERIE (SN de la ONU)
    if (initialMatches.length === 0 && clean.length >= 6) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE sn_onu LIKE ? OR sn_onu_normalized LIKE ? LIMIT 10`,
        args: [`%${clean.toUpperCase()}%`, `%${clean.toUpperCase()}%`],
      });
      if (res.rows.length > 0) {
        initialMatches.push(...(res.rows as any[]));
      }
    }

    if (initialMatches.length === 0) return [];

    // 🔄 CONSOLIDACIÓN DE MULTI-SERVICIO PARA EL TITULAR
    const servicesMap = new Map<string, any>();
    initialMatches.forEach(m => servicesMap.set(String(m.id_servicio), m));

    for (const match of initialMatches) {
      const matchPhone = (match.telefono || '').replace(/\D/g, '').slice(-10);
      const effectivePhone = matchPhone || last10;

      // A. Contratos adicionales que comparten el mismo número de teléfono (100% seguros)
      if (effectivePhone && effectivePhone.length >= 7) {
        const phoneRes = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE telefono LIKE ? OR telefonos_adicionales LIKE ? ORDER BY id_servicio ASC LIMIT 15`,
          args: [`%${effectivePhone}%`, `%${effectivePhone}%`],
        });
        (phoneRes.rows as any[]).forEach(s => {
          if (!servicesMap.has(String(s.id_servicio))) {
            servicesMap.set(String(s.id_servicio), s);
          }
        });
      }

      // B. Contratos adicionales donde el nombre completo del titular coincide con alta confianza (score >= 88)
      // Ejemplo: "Maria del Pilar Perez Mendoza" y "Maria del Pilar Perez Mendoza 2"
      const baseName = ClientPortalController.extractBaseCustomerName(match.nombre);
      const cleanBase = cleanPersonName(baseName);
      if (cleanBase && cleanBase.length >= 12) {
        const nameParts = cleanBase.split(' ');
        const searchPrefix = nameParts.slice(0, 2).join(' ');
        if (searchPrefix.length >= 6) {
          const candRes = await db.execute({
            sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? ORDER BY id_servicio ASC LIMIT 15`,
            args: [`%${searchPrefix}%`],
          });
          for (const cand of (candRes.rows as any[])) {
            if (!servicesMap.has(String(cand.id_servicio))) {
              const candBase = cleanPersonName(ClientPortalController.extractBaseCustomerName(cand.nombre));
              const score = computeNameMatchScore(cleanBase, candBase);
              if (score >= 88) {
                servicesMap.set(String(cand.id_servicio), cand);
              }
            }
          }
        }
      }
    }

    const allServices = Array.from(servicesMap.values());

    // Si se buscó un ID numérico específico, colocar ese contrato al inicio de la lista
    if (/^\d{1,6}$/.test(clean)) {
      allServices.sort((a, b) => {
        if (String(a.id_servicio) === clean) return -1;
        if (String(b.id_servicio) === clean) return 1;
        return Number(a.id_servicio) - Number(b.id_servicio);
      });
    }

    return allServices;
  }

  /**
   * Renderiza un recibo oficial en HTML listo para imprimir o guardar como PDF (sin errores de WispHub)
   */
  static async renderInvoiceReceipt(req: Request, res: Response): Promise<void> {
    try {
      const invoiceId = String(req.params.id || req.query.id || '').trim();
      if (!invoiceId) {
        res.status(400).send('<h1>Folio de recibo requerido</h1>');
        return;
      }

      const db = getDbClient();
      let invoice: any = null;

      const invRes = await db.execute({
        sql: `SELECT * FROM wisphub_invoices WHERE id_factura = ? OR folio = ? LIMIT 1`,
        args: [invoiceId, invoiceId],
      });
      if (invRes.rows.length > 0) invoice = invRes.rows[0];

      let client: any = null;
      if (invoice?.id_servicio) {
        const cRes = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
          args: [invoice.id_servicio],
        });
        if (cRes.rows.length > 0) client = cRes.rows[0];
      } else if (!invoice) {
        // Fallback: Si invoiceId corresponde a un id_servicio o teléfono
        const cleanNum = invoiceId.replace(/\D/g, '');
        const cRes = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? OR id_servicio = ? OR telefono LIKE ? LIMIT 1`,
          args: [invoiceId, cleanNum || '0', `%${invoiceId}%`],
        });
        if (cRes.rows.length > 0) {
          client = cRes.rows[0];
          invoice = {
            id_factura: invoiceId,
            id_servicio: client.id_servicio,
            folio: `REC-${invoiceId}`,
            cliente_nombre: client.nombre,
            total: client.precio_plan || 250,
            estado: 'Pagada',
            fecha_emision: new Date().toISOString().slice(0, 10),
            fecha_pago: new Date().toISOString().slice(0, 10),
            descripcion: client.plan_internet || 'Internet Fibra Óptica Simétrica',
          };
        }
      }

      const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
      const titular = client?.nombre || invoice?.cliente_nombre || 'Cliente';
      const cleanTitular = titular.replace(/^0*\d+[\s\-_.:]+/, '').trim();
      const folio = invoice?.folio || `FAC-${invoiceId}`;
      const total = Number(invoice?.total || 250).toFixed(2);
      const isPaid = String(invoice?.estado || 'Pagada').toLowerCase().includes('pagad');
      const statusLabel = isPaid ? 'PAGADA' : 'PENDIENTE DE PAGO';
      const statusColor = isPaid ? '#10b981' : '#f59e0b';
      const fechaEmision = invoice?.fecha_emision ? invoice.fecha_emision.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const fechaPago = invoice?.fecha_pago ? invoice.fecha_pago.slice(0, 10) : fechaEmision;
      const planDesc = invoice?.descripcion || client?.plan_internet || 'Internet Fibra Óptica Simétrica';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo ${folio} - ${ispName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #f8fafc; }
    .receipt-box { max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0284c7; }
    .brand-title { font-size: 26px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
    .badge { padding: 6px 14px; border-radius: 999px; font-weight: 800; font-size: 12.5px; color: #ffffff; background: ${statusColor}; text-align: center; display: inline-block; }
    .folio { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    .client-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .table-data { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table-data th, .table-data td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; }
    .table-data th { background: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 2px dashed #cbd5e1; margin-top: 15px; }
    .total-amount { font-size: 26px; font-weight: 800; color: #10b981; }
    .actions { display: flex; gap: 12px; margin-top: 28px; }
    .btn { padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
    .btn-print { background: #0284c7; color: #ffffff; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35); }
    .btn-back { background: #e2e8f0; color: #334155; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .receipt-box { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <div>
        <div class="brand-title">${ispName}</div>
        <div class="brand-sub">Comprobante Oficial de Pago de Servicio</div>
        <div class="brand-sub">Actopan, Hidalgo, México</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${statusLabel}</span>
        <div class="folio">${folio}</div>
      </div>
    </div>

    <div class="client-card">
      <div style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase;">TITULAR DEL SERVICIO</div>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 3px;">${cleanTitular}</div>
      <div style="display: flex; gap: 20px; font-size: 12.5px; margin-top: 6px; color: #334155;">
        <span>Folio de Contrato: <strong>#${client?.id_servicio || invoice?.id_servicio || '715'}</strong></span>
        <span>Teléfono: <strong>${client?.telefono || invoice?.cliente_telefono || '-'}</strong></span>
      </div>
    </div>

    <table class="table-data">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Periodo / Fechas</th>
          <th style="text-align: right;">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${planDesc}</strong>
            <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Conexión de Fibra Óptica Residencial / Comercial</div>
          </td>
          <td>Emisión: ${fechaEmision}<br>Pago: ${fechaPago}</td>
          <td style="text-align: right; font-weight: 700; font-size: 15px;">$${total}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-row">
      <span style="font-size: 15px; font-weight: 700;">TOTAL RECIBIDO:</span>
      <span class="total-amount">$${total} MXN</span>
    </div>

    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir o Guardar en PDF</button>
      <a href="/portal" class="btn btn-back">Volver al Portal</a>
    </div>
  </div>
</body>
</html>`);
    } catch (err: any) {
      logger.error('Error al generar recibo HTML:', err);
      res.status(500).send('<h1>Error al generar comprobante</h1>');
    }
  }
}
