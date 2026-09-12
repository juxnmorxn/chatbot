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
        raw_data TEXT,
        updated_at TEXT
      );
    `);

    // Índices para búsquedas rápidas
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_name_norm ON smartolt_onus(name_normalized);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_sn ON smartolt_onus(sn);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_onus_phone ON smartolt_onus(phone);`);

    logger.info('Tablas "sessions", "settings", "conversation_logs" y "smartolt_onus" listas en Turso.');
  } catch (error: any) {
    logger.error('Error al inicializar Turso DB:', error?.message || error);
    throw error;
  }
}
