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
    logger.info('Tabla "sessions" lista en Turso.');
  } catch (error: any) {
    logger.error('Error al inicializar Turso DB:', error?.message || error);
    throw error;
  }
}
