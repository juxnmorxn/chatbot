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
import { cleanPersonName, normalizeText } from '../utils/fuzzy-matcher';
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

const rebootCooldowns = new Map<string, number>();
const REBOOT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre reinicios por cliente

const wifiChangeCooldowns = new Map<string, number>();
const WIFI_COOLDOWN_MS = 30 * 1000; // 30 segundos entre cambios de Wi-Fi

export class ClientPortalController {

  /**
   * Renderiza la página principal del Portal del Cliente / PWA
   */
  static renderPortalHtml(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getClientPortalHtml());
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
          const services = await ClientPortalController.findClientsByIdentifier(payload.phone);
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
          verifiedPhone = payload.phone;
          tokenName = payload.name || '';
          tokenServiceIds = payload.serviceIds || [];
        }
      }

      const requestedServiceId = req.query.serviceId ? String(req.query.serviceId).trim() : '';
      const requestedId = (req.query.id || req.query.phone || req.query.p || '') as string;

      let services: any[] = [];

      if (requestedServiceId) {
        services = await ClientPortalController.findClientsByIdentifier(requestedServiceId);
      }

      if ((!services || services.length === 0) && verifiedPhone) {
        services = await ClientPortalController.findClientsByIdentifier(verifiedPhone);
      }

      if ((!services || services.length === 0) && tokenServiceIds.length > 0) {
        services = await ClientPortalController.findClientsByIdentifier(String(tokenServiceIds[0]));
      }

      if ((!services || services.length === 0) && tokenName) {
        services = await ClientPortalController.findClientsByIdentifier(tokenName);
      }

      if ((!services || services.length === 0) && requestedId) {
        services = await ClientPortalController.findClientsByIdentifier(requestedId);
      }

      if (!services || services.length === 0) {
        res.status(404).json({ success: false, message: 'Cliente no localizado en el sistema.' });
        return;
      }

      // Si se solicitó un servicio específico dentro de los múltiples contratos del titular
      const selectedServiceId = req.query.serviceId ? String(req.query.serviceId).trim() : '';
      let client = services[0];
      if (selectedServiceId) {
        const exact = services.find((s: any) => String(s.id_servicio) === selectedServiceId);
        if (exact) client = exact;
      }

      const relatedServices = services.map((s: any) => ({
        id_servicio: s.id_servicio,
        nombre: s.nombre,
        direccion: s.direccion || s.router || 'Domicilio registrado',
        ip: s.ip,
        router: s.router,
        plan_internet: s.plan_internet,
        estado: s.estado,
        saldo: s.saldo || 0,
      }));

      const db = getDbClient();

      // 1. Obtener registro de SmartOLT (búsqueda multicriterio: SN, Hex-SN, IP, ID Servicio, Nombre)
      let onuRecord: any = null;
      let cleanSn = (client.sn_onu || '').trim();
      if (/^48575443/i.test(cleanSn)) {
        cleanSn = 'HWTC' + cleanSn.slice(8);
      }

      if (cleanSn) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE sn = ? OR sn = ? OR unique_external_id = ? OR sn LIKE ? LIMIT 1`,
          args: [cleanSn.toUpperCase(), (client.sn_onu || '').toUpperCase(), cleanSn.toUpperCase(), `%${cleanSn.slice(-6)}%`],
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

      if (!onuRecord && client.id_servicio) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE name LIKE ? OR name LIKE ? OR raw_data LIKE ? LIMIT 1`,
          args: [`%${client.id_servicio}%`, `${client.id_servicio}-%`, `%"${client.id_servicio}"%`],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      // Si tiene prefijo de contrato en usuario_rb (ej: 0696)
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

      if (!onuRecord && client.nombre) {
        const cleanName = cleanPersonName(client.nombre);
        if (cleanName.length > 4) {
          const parts = cleanName.split(' ').filter(p => p.length >= 4);
          for (const p of parts) {
            const onuRes = await db.execute({
              sql: `SELECT * FROM smartolt_onus WHERE name_normalized LIKE ? OR name LIKE ? LIMIT 1`,
              args: [`%${p}%`, `%${p}%`],
            });
            if (onuRes.rows.length > 0) {
              onuRecord = onuRes.rows[0];
              break;
            }
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
        try {
          const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 3000));
          const wifiPromise = SmartOLTService.getOnuWifiDetails(targetOnuId);
          const wifiDetails = await Promise.race([wifiPromise, timeoutPromise]);
          if (wifiDetails) {
            wifiInfo = {
              ssid24: wifiDetails.ssid24 || wifiDetails.ssid || '',
              password24: wifiDetails.password24 || wifiDetails.password || '',
              ssid5g: wifiDetails.ssid5g || '',
              password5g: wifiDetails.password5g || wifiDetails.password24 || '',
              has5g: !!wifiDetails.has5g,
              ssid: wifiDetails.ssid24 || wifiDetails.ssid || '',
              password: wifiDetails.password24 || wifiDetails.password || '',
            };
          }
        } catch (wErr) {
          logger.warn(`No se pudo obtener WiFi de SmartOLT para ${targetOnuId}:`, wErr);
        }
      }

      // Si la OLT no traía SSIDs configurados todavía, fallback con marca de servicio
      const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
      if (!wifiInfo.ssid24) {
        wifiInfo.ssid24 = `${ispName}-${client.id_servicio}`;
        wifiInfo.password24 = onuRecord?.sn ? onuRecord.sn.slice(-8) : '12345678';
        wifiInfo.ssid = wifiInfo.ssid24;
        wifiInfo.password = wifiInfo.password24;
      }
      if (wifiInfo.has5g && !wifiInfo.ssid5g) {
        wifiInfo.ssid5g = `${wifiInfo.ssid24}-5G`;
        wifiInfo.password5g = wifiInfo.password24;
      }

      const wifi = wifiInfo;

      // 5. Verificar si el cliente ya tiene contraseña registrada
      const targetPhone10 = (verifiedPhone || client.telefono || '').replace(/\D/g, '').slice(-10);
      const clientPhone10 = (client.telefono || '').replace(/\D/g, '').slice(-10);
      let hasPassword = false;

      const accRes = await db.execute({
        sql: `SELECT id, password_hash FROM client_portal_accounts WHERE (telefono = ? OR telefono = ? OR nombre = ?) AND password_hash IS NOT NULL AND password_hash != '' LIMIT 1`,
        args: [targetPhone10, clientPhone10, client.nombre],
      });
      if (accRes.rows.length > 0) {
        hasPassword = true;
      }

      // Generar token permanente e indestructible para auto-autenticación
      const serviceIds = services.map((s: any) => s.id_servicio);
      const sessionToken = generateClientPortalToken(verifiedPhone || client.telefono || '', client.nombre, serviceIds);

      res.json({
        success: true,
        token: sessionToken,
        hasPassword,
        client: {
          id_servicio: client.id_servicio,
          nombre: client.nombre,
          telefono: client.telefono,
          direccion: client.direccion,
          ip: client.ip,
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
          model: onuRecord.onu_type_name,
          zone_name: onuRecord.zone_name,
          speed_profile: onuRecord.speed_profile,
        } : null,
        relatedServices,
        signal,
        wifi,
        outage: activeOutage,
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

      const client = services[0];
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
          pdf_url: f.pdf_url || (f.id_factura ? `https://wisphub.net/factura/pdf/${f.id_factura}/` : null),
        })),
        bankDetails: {
          bank: SettingsService.get('PAYMENT_BANK_NAME', 'PAYMENT_BANK_NAME', 'BBVA Bancomer'),
          clabe: SettingsService.get('PAYMENT_BANK_CLABE', 'PAYMENT_BANK_CLABE', '012320001234567890'),
          account: SettingsService.get('PAYMENT_BANK_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '0123456789'),
          beneficiary: SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx'),
          reference: `SRV-${client.id_servicio}`,
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

      const targetId = client.sn_onu || client.ip || client.nombre;
      const result = await SmartOLTService.updateOnuWifiPassword(targetId, {
        password,
        ssid24: ssid24 || ssid || undefined,
        ssid5g: ssid5g || undefined,
      });

      if (result.success) {
        wifiChangeCooldowns.set(key, Date.now());
        res.json({
          success: true,
          message: 'Contraseña Wi-Fi configurada con éxito en tu módem.',
          ssid: result.ssid24,
          password: result.password,
        });
      } else {
        res.status(500).json({ success: false, message: result.message || 'La OLT no pudo aplicar la clave.' });
      }
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
   * Helper: Localiza TODOS los servicios vinculados a un cliente por Teléfono, Folio o SN
   */
  public static async findClientsByIdentifier(rawId: string): Promise<any[]> {
    const clean = (rawId || '').trim();
    if (!clean) return [];
    const db = getDbClient();

    // 1. Por ID numérico de servicio (Folio exacto)
    if (/^\d{1,6}$/.test(clean)) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
        args: [Number(clean)],
      });
      if (res.rows.length > 0) {
        const main = res.rows[0];
        const allClientServices = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE (nombre = ? OR nombre_normalized = ?) OR (telefono IS NOT NULL AND telefono != '' AND telefono = ?) ORDER BY id_servicio ASC LIMIT 20`,
          args: [main.nombre, main.nombre_normalized, main.telefono],
        });
        if (allClientServices.rows.length > 0) {
          const otherServices = (allClientServices.rows as any[]).filter(s => String(s.id_servicio) !== String(main.id_servicio));
          return [main, ...otherServices];
        }
        return [main];
      }
    }

    // 2. Por Teléfono (últimos 10 dígitos o número completo)
    const cleanDigits = clean.replace(/\D/g, '');
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    if (last10 && last10.length >= 7) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE telefono LIKE ? OR telefonos_adicionales LIKE ? ORDER BY id_servicio ASC LIMIT 20`,
        args: [`%${last10}%`, `%${last10}%`],
      });
      if (res.rows.length > 0) return res.rows as any[];

      // 2.1 Buscar si este teléfono fue vinculado previamente en client_portal_accounts
      const acc = await db.execute({
        sql: `SELECT * FROM client_portal_accounts WHERE telefono = ? LIMIT 1`,
        args: [last10],
      });
      if (acc.rows.length > 0 && acc.rows[0].nombre) {
        const byName = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? ORDER BY id_servicio ASC LIMIT 20`,
          args: [`%${acc.rows[0].nombre}%`, `%${acc.rows[0].nombre}%`],
        });
        if (byName.rows.length > 0) return byName.rows as any[];
      }
    }

    // 3. Por Número de Serie (SN)
    if (clean.length >= 6) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE sn_onu LIKE ? OR sn_onu_normalized LIKE ? LIMIT 10`,
        args: [`%${clean.toUpperCase()}%`, `%${clean.toUpperCase()}%`],
      });
      if (res.rows.length > 0) {
        const main = res.rows[0];
        const allClientServices = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE (nombre = ? OR nombre_normalized = ?) OR (telefono IS NOT NULL AND telefono != '' AND telefono = ?) ORDER BY id_servicio ASC LIMIT 20`,
          args: [main.nombre, main.nombre_normalized, main.telefono],
        });
        if (allClientServices.rows.length > 0) return allClientServices.rows as any[];
        return res.rows as any[];
      }
    }

    // 4. Búsqueda por Nombre (Normalizado, insensible a mayúsculas y acentos)
    const norm = normalizeText(cleanPersonName(clean));
    const resName = await db.execute({
      sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? OR nombre LIKE ? OR nombre_normalized LIKE ? ORDER BY id_servicio ASC LIMIT 15`,
      args: [`%${clean}%`, `%${clean}%`, `%${norm}%`, `%${norm}%`],
    });
    if (resName.rows.length > 0) return resName.rows as any[];

    // 5. Búsqueda difusa avanzada tolerante a faltas de ortografía o nombres incompletos
    try {
      const fuzzyClients = await DbService.searchWisphubClientsFuzzy(clean, 5);
      if (fuzzyClients && fuzzyClients.length > 0) {
        const first = fuzzyClients[0];
        const allClientServices = await db.execute({
          sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? OR (nombre = ? OR nombre_normalized = ?) ORDER BY id_servicio ASC LIMIT 20`,
          args: [first.id_servicio, first.nombre, first.nombre_normalized || first.nombre],
        });
        if (allClientServices.rows.length > 0) return allClientServices.rows as any[];
      }
    } catch (fuzzyErr) {
      logger.warn('Error en fuzzy match de findClientsByIdentifier:', fuzzyErr);
    }

    return [];
  }
}
