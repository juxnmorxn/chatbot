import { createClient, Client } from '@libsql/client';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

const logger = new Logger('TursoDB');

let clientInstance: Client | null = null;

export function getTursoClient(): Client {
  if (!clientInstance) {
    if (!config.turso.url) {
      throw new Error('TURSO_DATABASE_URL is not configured');
    }
    clientInstance = createClient({
      url: config.turso.url,
      authToken: config.turso.authToken,
    });
  }
  return clientInstance;
}

export async function initTursoDatabase(): Promise<void> {
  const client = getTursoClient();
  try {
    logger.info('Verificando e inicializando tablas en Turso DB...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        phone TEXT PRIMARY KEY,
        step TEXT DEFAULT 'INICIO',
        client_id TEXT,
        service_id TEXT,
        client_name TEXT,
        onu_id TEXT,
        opt_out INTEGER DEFAULT 0,
        last_interaction TEXT,
        metadata TEXT,
        human_takeover_until TEXT,
        human_takeover_status TEXT DEFAULT 'BOT'
      );
    `);

    // Migraciones no destructivas para tabla sessions
    try {
      await client.execute(`ALTER TABLE sessions ADD COLUMN human_takeover_until TEXT;`);
    } catch (_) {}
    try {
      await client.execute(`ALTER TABLE sessions ADD COLUMN human_takeover_status TEXT DEFAULT 'BOT';`);
    } catch (_) {}
    try {
      await client.execute(`ALTER TABLE sessions ADD COLUMN department TEXT DEFAULT 'SOPORTE';`);
    } catch (_) {}
    try {
      await client.execute(`ALTER TABLE sessions ADD COLUMN last_instance TEXT;`);
    } catch (_) {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        direction TEXT NOT NULL,
        message TEXT NOT NULL,
        intent TEXT,
        action_taken TEXT,
        created_at TEXT NOT NULL
      );
    `);

    try {
      await client.execute(`ALTER TABLE conversation_logs ADD COLUMN instance_name TEXT;`);
    } catch (_) {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS smartolt_onus (
        unique_external_id TEXT PRIMARY KEY,
        sn TEXT,
        name TEXT,
        name_normalized TEXT,
        phone TEXT,
        address TEXT,
        zone_name TEXT,
        speed_profile TEXT,
        olt_name TEXT,
        ip_address TEXT,
        raw_data TEXT,
        updated_at TEXT
      );
    `);

    // Migración no destructiva de columna ip_address y coordenadas si no existen en smartolt_onus
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN ip_address TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN coordenadas_gps TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN google_maps_url TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN vlan TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN mac TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN remote_ipv6_prefix TEXT;`); } catch (_) {}

    // Índices para búsquedas rápidas
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_name_norm ON smartolt_onus(name_normalized);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_sn ON smartolt_onus(sn);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_phone ON smartolt_onus(phone);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_ip ON smartolt_onus(ip_address);`);

    // Tabla de Clientes sincronizados de WispHub
    await client.execute(`
      CREATE TABLE IF NOT EXISTS wisphub_clients (
        id_servicio INTEGER PRIMARY KEY,
        nombre TEXT,
        nombre_normalized TEXT,
        servicio TEXT,
        ip TEXT,
        estado TEXT,
        estado_facturas TEXT,
        precio_plan TEXT,
        saldo TEXT,
        plan_internet TEXT,
        router TEXT,
        sn_onu TEXT,
        telefono TEXT,
        telefonos_adicionales TEXT,
        coordenadas_gps TEXT,
        google_maps_url TEXT,
        ubicacion_notas TEXT,
        direccion TEXT,
        dia_corte TEXT,
        fecha_corte TEXT,
        mac TEXT,
        remote_ipv6_prefix TEXT,
        vlan TEXT,
        raw_data TEXT,
        updated_at TEXT
      );
    `);
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN dia_corte TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN fecha_corte TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN telefonos_adicionales TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN coordenadas_gps TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN google_maps_url TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN ubicacion_notas TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN mac TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN remote_ipv6_prefix TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN vlan TEXT;`); } catch (_) {}
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_nombre_norm ON wisphub_clients(nombre_normalized);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_servicio ON wisphub_clients(servicio);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_ip ON wisphub_clients(ip);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_estado ON wisphub_clients(estado);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_dia_corte ON wisphub_clients(dia_corte);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_phone ON wisphub_clients(telefono);`);

    // Tabla de Tickets para modificaciones manuales en SmartOLT y seguimiento
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        client_name TEXT,
        onu_id TEXT,
        issue_summary TEXT NOT NULL,
        checks_performed TEXT,
        has_photo INTEGER DEFAULT 0,
        has_speedtest INTEGER DEFAULT 0,
        all_devices INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ABIERTO',
        is_out_of_hours INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolved_at TEXT
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_phone ON tickets(phone);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);`);

    // Tabla de Técnicos Autorizados con PIN de 5 dígitos y número de WhatsApp
    await client.execute(`
      CREATE TABLE IF NOT EXISTS technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        role TEXT DEFAULT 'TECNICO',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tech_phone ON technicians(phone);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tech_pin ON technicians(pin);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_tech_active ON technicians(is_active);`);

    // Tabla de Usuarios Administradores y Operadores con Roles (RBAC)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'soporte', -- 'superadmin', 'soporte', 'tecnico', 'facturacion'
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_login TEXT
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);`);

    // Migración segura de columnas en tickets
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN assigned_technician_name TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN resolution_notes TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN category TEXT DEFAULT 'FALLA_FIBRA';`); } catch {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT 'MEDIA';`); } catch {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN coordenadas_gps TEXT;`); } catch {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN google_maps_url TEXT;`); } catch {}

    // Tabla de Pools y VLANs IPAM dinámicas
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ipam_vlan_pools (
        vlan TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment TEXT NOT NULL,
        gateway TEXT NOT NULL,
        netmask TEXT DEFAULT '255.255.255.0',
        start_host INTEGER DEFAULT 2,
        end_host INTEGER DEFAULT 253,
        olt_id TEXT,
        olt_name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_ipam_vlan ON ipam_vlan_pools(vlan);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_ipam_segment ON ipam_vlan_pools(segment);`);

    // Tabla de Contingencias y Caídas de Red por Zona
    await client.execute(`
      CREATE TABLE IF NOT EXISTS network_outages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        estimated_time TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_outages_status ON network_outages(status);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_outages_zone ON network_outages(zone_name);`);

    // Tabla de Instancias de WhatsApp y Mapeo Dinámico de Áreas / Oficinas
    await client.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        instance_name TEXT PRIMARY KEY,
        area_name TEXT NOT NULL,
        phone_number TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wa_inst_area ON whatsapp_instances(area_name);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wa_inst_active ON whatsapp_instances(is_active);`);

    // Sembrar superadmin inicial si la tabla está vacía
    const { hashPassword } = await import('../utils/auth');
    const existingAdmins = await client.execute(`SELECT COUNT(*) as count FROM admin_users`);
    if (Number(existingAdmins.rows[0]?.count || 0) === 0) {
      const initialHash = hashPassword('AdminCloudWare2026!');
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO admin_users (username, password_hash, name, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
        args: ['admin', initialHash, 'Super Administrador', 'superadmin', now],
      });
      logger.info('Usuario inicial "admin" (superadmin) creado exitosamente en Turso DB.');
    }

    logger.info('Tablas "sessions", "settings", "conversation_logs", "smartolt_onus", "wisphub_clients", "tickets", "technicians", "admin_users", "ipam_vlan_pools", "network_outages" y "whatsapp_instances" listas en Turso.');
  } catch (error: any) {
    logger.error('Error al inicializar Turso DB:', error?.message || error);
    throw error;
  }
}
