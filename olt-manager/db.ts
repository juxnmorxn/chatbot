import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let oltDbClient: Client | null = null;

export function getOltDb(): Client {
  if (!oltDbClient) {
    const dbDir = path.resolve(process.cwd(), './data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'olt_manager.db');
    oltDbClient = createClient({
      url: `file:${dbPath.replace(/\\/g, '/')}`,
    });
    console.log(`[OLT Database] Conectado a base de datos independiente: ${dbPath}`);
  }
  return oltDbClient;
}

export async function initOltDatabase(): Promise<void> {
  const db = getOltDb();
  
  // Tabla independiente de OLTs dadas de alta
  await db.execute(`
    CREATE TABLE IF NOT EXISTS olts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      total_gpon_ports INTEGER DEFAULT 1,
      default_vlan INTEGER DEFAULT 100,
      community TEXT NOT NULL,
      mikrotik_ip TEXT,
      mikrotik_name TEXT,
      status TEXT DEFAULT 'unknown',
      last_latency_ms INTEGER DEFAULT 0,
      last_checked_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabla independiente de Túneles WireGuard de MikroTiks
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wireguard_peers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_ip TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      allowed_subnets TEXT NOT NULL,
      last_handshake TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabla independiente de ONTs aprovisionadas
  await db.execute(`
    CREATE TABLE IF NOT EXISTS provisioned_onts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      olt_id TEXT NOT NULL,
      gpon_port TEXT NOT NULL,
      onu_id INTEGER NOT NULL,
      serial TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      vlan_id INTEGER NOT NULL,
      plan_speed TEXT,
      rx_power REAL,
      tx_power REAL,
      status TEXT DEFAULT 'online',
      authorized_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (olt_id) REFERENCES olts(id) ON DELETE CASCADE
    )
  `);

  console.log('[OLT Database] Tablas "olts" y "provisioned_onts" inicializadas correctamente en olt_manager.db');
}
