import { Request, Response } from 'express';
import { getClientPortalHtml } from '../views/client-portal.html';
import { getDbClient } from '../database/db';
import { SmartOLTService } from '../services/smartolt.service';
import { SettingsService } from '../services/settings.service';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

const logger = new Logger('ClientPortalController');

// 🔒 CACHÉ EN MEMORIA Y CONTROL DE CONCURRENCIA PARA PROTEGER LA API DE SMARTOLT
// Evita que múltiples consultas de clientes saturen la cuota de la OLT
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
const CACHE_NAME = 'client-portal-v1';
const ASSETS_TO_CACHE = [
  '/portal',
  '/manifest.json',
  '/portal-icon.svg',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
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
  // Solo cachear peticiones GET que no sean de API dinámica
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
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/portal')))
  );
});
`;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(swCode);
  }

  /**
   * PWA: Ícono dinámico en formato SVG
   */
  static renderIcon(_req: Request, res: Response): void {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="#0f172a"/>
      <rect x="16" y="16" width="480" height="480" rx="104" fill="none" stroke="url(#grad)" stroke-width="8" opacity="0.3"/>
      <path fill="url(#grad)" d="M256 112c-79.5 0-151.5 32.2-203.7 84.4-7.5 7.5-7.5 19.6 0 27.1l27.1 27.1c7.5 7.5 19.6 7.5 27.1 0C144.3 212.8 197.8 192 256 192s111.7 20.8 149.5 58.6c7.5 7.5 19.6 7.5 27.1 0l27.1-27.1c7.5-7.5 7.5-19.6 0-27.1C407.5 144.2 335.5 112 256 112zm0 112c-48.6 0-92.6 19.7-124.5 51.6-7.5 7.5-7.5 19.6 0 27.1l27.1 27.1c7.5 7.5 19.6 7.5 27.1 0 18.7-18.7 44.5-30.3 73-30.3 28.5 0 54.3 11.6 73 30.3 7.5 7.5 19.6 7.5 27.1 0l27.1-27.1c7.5-7.5 7.5-19.6 0-27.1C348.6 243.7 304.6 224 256 224zm0 112c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"/>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgIcon);
  }

  /**
   * Autenticación de cliente (por Teléfono, ID de Servicio o SN de Módem)
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.body;
      if (!identifier || typeof identifier !== 'string') {
        res.status(400).json({ success: false, message: 'Identificador requerido' });
        return;
      }

      const client = await ClientPortalController.findClientByIdentifier(identifier);
      if (!client) {
        res.status(404).json({ success: false, message: 'No encontramos un servicio activo con los datos proporcionados.' });
        return;
      }

      res.json({
        success: true,
        client: {
          id_servicio: client.id_servicio,
          nombre: client.nombre,
          telefono: client.telefono,
          ip: client.ip,
          router: client.router,
          plan_internet: client.plan_internet,
        },
      });
    } catch (err: any) {
      logger.error('Error en login de cliente:', err?.message || err);
      res.status(500).json({ success: false, message: 'Error interno al autenticar servicio.' });
    }
  }

  /**
   * Obtiene todos los datos del cliente, estado del módem y facturación
   */
  static async getClientData(req: Request, res: Response): Promise<void> {
    try {
      const rawId = (req.query.id || req.query.phone || req.query.p || '') as string;
      if (!rawId) {
        res.status(400).json({ success: false, message: 'Identificador requerido en la consulta.' });
        return;
      }

      const client = await ClientPortalController.findClientByIdentifier(rawId);
      if (!client) {
        res.status(404).json({ success: false, message: 'Cliente no localizado en el sistema.' });
        return;
      }

      const db = getDbClient();

      // 1. Obtener registro de SmartOLT (si existe vinculado)
      let onuRecord: any = null;
      if (client.sn_onu) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE sn = ? OR sn = ? LIMIT 1`,
          args: [client.sn_onu.toUpperCase(), client.sn_onu],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      if (!onuRecord && client.ip) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE ip_address = ? LIMIT 1`,
          args: [client.ip],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      if (!onuRecord && client.id_servicio) {
        const onuRes = await db.execute({
          sql: `SELECT * FROM smartolt_onus WHERE name LIKE ? LIMIT 1`,
          args: [`%${client.id_servicio}%`],
        });
        if (onuRes.rows.length > 0) onuRecord = onuRes.rows[0];
      }

      // 2. Obtener estado de señal (desde caché o OLT de forma controlada)
      const targetOnuId = onuRecord?.unique_external_id || onuRecord?.sn || client.sn_onu;
      let signal: any = {
        status: client.estado === 'activo' ? 'ONLINE' : 'OFFLINE',
        opticalPowerDbm: null,
      };

      if (targetOnuId) {
        signal = await ClientPortalController.getCachedOrLiveSignal(targetOnuId);
      }

      // 3. Verificar si hay caídas de red activas en la zona del cliente
      let activeOutage: any = null;
      const clientZone = client.router || onuRecord?.zone_name || 'Actopan';
      const outageRes = await db.execute({
        sql: `SELECT * FROM network_outages WHERE status = 'active' AND (zone LIKE ? OR zone = 'Todas' OR zone = 'General') LIMIT 1`,
        args: [`%${clientZone}%`],
      });
      if (outageRes.rows.length > 0) {
        const o = outageRes.rows[0];
        activeOutage = {
          active: true,
          title: o.title || 'Mantenimiento en tu Zona',
          description: o.description || 'Cuadrillas técnicas trabajando en la infraestructura de fibra.',
        };
      }

      // 4. Datos Wi-Fi
      const wifi = {
        ssid24: onuRecord?.name || `CloudWare_${client.id_servicio || 'WiFi'}`,
        password: onuRecord?.sn ? onuRecord.sn.slice(-8) : '********',
      };

      res.json({
        success: true,
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
   * Consulta de señal en vivo (Con caché obligatoria de 90s para proteger la API de SmartOLT)
   */
  static async getLiveSignal(req: Request, res: Response): Promise<void> {
    try {
      const rawId = (req.query.id || req.query.phone || '') as string;
      if (!rawId) {
        res.status(400).json({ success: false, message: 'Identificador requerido' });
        return;
      }

      const client = await ClientPortalController.findClientByIdentifier(rawId);
      if (!client) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        return;
      }

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
      const { clientId, ssid, password } = req.body;
      if (!clientId || !password || password.length < 8) {
        res.status(400).json({ success: false, message: 'Contraseña inválida (mínimo 8 caracteres).' });
        return;
      }

      const client = await ClientPortalController.findClientByIdentifier(String(clientId));
      if (!client) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        return;
      }

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
        ssid24: ssid || undefined,
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

      const client = await ClientPortalController.findClientByIdentifier(String(clientId));
      if (!client) {
        res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        return;
      }

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
      const statusRes = await SmartOLTService.obtenerEstadoONU(cleanId);
      const data = {
        status: statusRes.status,
        rawStatus: statusRes.rawStatus,
        opticalPowerDbm: statusRes.opticalPowerDbm,
        uptime: statusRes.uptime,
        descripcion: statusRes.descripcion,
      };

      signalCache.set(cleanId, { data, timestamp: now });
      return data;
    } catch (err: any) {
      logger.warn(`No se pudo consultar SmartOLT para ${cleanId}:`, err?.message || err);
      return { status: 'ONLINE', opticalPowerDbm: null };
    }
  }

  /**
   * Helper: Localiza un cliente en wisphub_clients o smartolt_onus por teléfono, folio o SN
   */
  private static async findClientByIdentifier(rawId: string): Promise<any> {
    const clean = rawId.trim();
    const cleanDigits = clean.replace(/\D/g, '');
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    const db = getDbClient();

    // 1. Por ID numérico de servicio (Folio)
    if (/^\d{1,6}$/.test(clean)) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE id_servicio = ? LIMIT 1`,
        args: [Number(clean)],
      });
      if (res.rows.length > 0) return res.rows[0];
    }

    // 2. Por Teléfono (últimos 10 dígitos o completo)
    if (last10 && last10.length >= 7) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE telefono LIKE ? OR telefonos_adicionales LIKE ? LIMIT 1`,
        args: [`%${last10}%`, `%${last10}%`],
      });
      if (res.rows.length > 0) return res.rows[0];
    }

    // 3. Por Número de Serie (SN)
    if (clean.length >= 6) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE sn_onu LIKE ? OR sn_onu LIKE ? LIMIT 1`,
        args: [clean.toUpperCase(), `%${clean}%`],
      });
      if (res.rows.length > 0) return res.rows[0];
    }

    // 4. Por Nombre difuso
    if (clean.length >= 4) {
      const res = await db.execute({
        sql: `SELECT * FROM wisphub_clients WHERE nombre LIKE ? OR nombre_normalized LIKE ? LIMIT 1`,
        args: [`%${clean}%`, `%${clean.toLowerCase()}%`],
      });
      if (res.rows.length > 0) return res.rows[0];
    }

    return null;
  }
}
