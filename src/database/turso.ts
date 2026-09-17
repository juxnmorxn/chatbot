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
        metadata TEXT
      );
    `);

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

    // Migración no destructiva de columna ip_address si no existe en tablas previas
    try {
      await client.execute(`ALTER TABLE smartolt_onus ADD COLUMN ip_address TEXT;`);
    } catch (_) {}

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
        direccion TEXT,
        raw_data TEXT,
        updated_at TEXT
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_nombre_norm ON wisphub_clients(nombre_normalized);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_servicio ON wisphub_clients(servicio);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_ip ON wisphub_clients(ip);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_estado ON wisphub_clients(estado);`);

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

    logger.info('Tablas "sessions", "settings", "conversation_logs", "smartolt_onus", "wisphub_clients", "tickets" y "technicians" listas en Turso.');
  } catch (error: any) {
    logger.error('Error al inicializar Turso DB:', error?.message || error);
    throw error;
  }
}
