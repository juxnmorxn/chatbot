import { createClient, Client } from '@libsql/client';
import { config } from '../config/env';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const logger = new Logger('DatabaseManager');

let clientInstance: Client | null = null;
let activeDbUrl: string = '';

/**
 * Obtiene la ruta del archivo SQLite local en el VPS
 */
export function getLocalDbFilePath(): string {
  const rawUrl = config.db.url || 'file:./data/chatbot.db';
  if (rawUrl.startsWith('file:')) {
    const rel = rawUrl.replace('file:', '');
    return path.resolve(process.cwd(), rel);
  }
  return path.resolve(process.cwd(), './data/chatbot.db');
}

/**
 * Obtiene la instancia activa de conexión a la base de datos local SQLite
 */
export function getDbClient(): Client {
  const targetUrl = (config.db.url && config.db.url.trim() !== '') ? config.db.url.trim() : 'file:./data/chatbot.db';
  
  if (!clientInstance || activeDbUrl !== targetUrl) {
    if (targetUrl.startsWith('file:') || !config.db.authToken) {
      const localPath = getLocalDbFilePath();
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (_) {}
      }
      clientInstance = createClient({
        url: `file:${localPath.replace(/\\/g, '/')}`,
      });
      activeDbUrl = targetUrl;
      logger.info(`Conectado a Base de Datos Local SQLite (Hostinger): ${localPath}`);
    } else {
      clientInstance = createClient({
        url: targetUrl,
        authToken: config.db.authToken,
      });
      activeDbUrl = targetUrl;
      logger.info(`Conectado a Base de Datos: ${targetUrl}`);
    }
  }
  return clientInstance;
}

export const getLocalDbClient = getDbClient;

/**
 * Reinicia la conexión a la base de datos (por ejemplo, al cambiar de Base de Datos Local a Local)
 */
export function resetDatabaseConnection(newUrl?: string, newAuthToken?: string): Client {
  if (newUrl !== undefined) config.db.url = newUrl;
  if (newAuthToken !== undefined) config.db.authToken = newAuthToken;
  clientInstance = null;
  activeDbUrl = '';
  return getDbClient();
}

/**
 * Obtiene métricas e información técnica de la base de datos
 */
export async function getDatabaseStatsInfo(): Promise<any> {
  const client = getDbClient();
  const rawUrl = config.db.url || 'file:./data/chatbot.db';
  const isLocal = rawUrl.startsWith('file:') || !config.db.url;
  
  const startPing = Date.now();
  await client.execute('SELECT 1 as ping');
  const latencyMs = Date.now() - startPing;

  let fileSizeBytes = 0;
  let filePath = '';
  if (isLocal) {
    filePath = getLocalDbFilePath();
    if (fs.existsSync(filePath)) {
      try {
        fileSizeBytes = fs.statSync(filePath).size;
      } catch (_) {}
    }
  }

  // Obtener lista de tablas
  const tablesRes = await client.execute(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' 
    ORDER BY name ASC;
  `);

  const tables: Array<{ name: string; rowCount: number }> = [];
  let totalRows = 0;

  for (const row of tablesRes.rows) {
    const tableName = String(row.name);
    try {
      const countRes = await client.execute(`SELECT COUNT(*) as count FROM "${tableName}";`);
      const rowCount = Number(countRes.rows[0]?.count || 0);
      tables.push({ name: tableName, rowCount });
      totalRows += rowCount;
    } catch (_) {
      tables.push({ name: tableName, rowCount: 0 });
    }
  }

  let fileSizeFormatted = '0.00 MB';
  if (fileSizeBytes > 0) {
    if (fileSizeBytes < 1024 * 1024) {
      fileSizeFormatted = (fileSizeBytes / 1024).toFixed(1) + ' KB';
    } else {
      fileSizeFormatted = (fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  } else if (!isLocal) {
    fileSizeFormatted = 'Nube Externa';
  }

  return {
    mode: isLocal ? 'local' : 'local_db',
    isLocal,
    url: isLocal ? `file:${filePath}` : rawUrl.replace(/(:\/\/[^@]+@).*/, '$1***'),
    filePath: isLocal ? filePath : null,
    fileSizeBytes,
    fileSizeFormatted,
    latencyMs,
    tablesCount: tables.length,
    totalRows,
    tables,
    status: 'healthy',
  };
}

/**
 * Consulta los datos y esquema de una tabla específica
 */
export async function getTableDataAndSchema(
  tableName: string,
  options: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: string } = {}
): Promise<any> {
  const client = getDbClient();

  // Validar contra sqlite_master para prevenir SQL Injection en nombres de tabla
  const checkTable = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
    args: [tableName],
  });

  if (checkTable.rows.length === 0) {
    throw new Error(`La tabla "${tableName}" no existe en la base de datos`);
  }

  // Obtener columnas y tipos
  const pragma = await client.execute(`PRAGMA table_info("${tableName}");`);
  const columns = pragma.rows.map((col: any) => ({
    cid: col.cid,
    name: String(col.name),
    type: String(col.type || 'TEXT'),
    notnull: Boolean(col.notnull),
    dflt_value: col.dflt_value,
    pk: Boolean(col.pk),
  }));

  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(200, Math.max(10, Number(options.limit || 50)));
  const offset = (page - 1) * limit;

  let whereClause = '';
  const args: any[] = [];

  if (options.search && options.search.trim() !== '') {
    const term = `%${options.search.trim()}%`;
    const searchConditions = columns
      .filter((c: any) => ['TEXT', 'VARCHAR', 'CHAR', ''].includes(c.type.toUpperCase()) || c.type.includes('CHAR') || c.type.includes('TEXT'))
      .map((c: any) => `"${c.name}" LIKE ?`);

    if (searchConditions.length > 0) {
      whereClause = `WHERE ${searchConditions.join(' OR ')}`;
      for (let i = 0; i < searchConditions.length; i++) {
        args.push(term);
      }
    }
  }

  // Count total matching rows
  const countSql = `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`;
  const countRes = await client.execute({ sql: countSql, args: [...args] });
  const totalRows = Number(countRes.rows[0]?.total || 0);

  // Sorting
  let orderClause = '';
  if (options.sortBy) {
    const validCol = columns.find((c: any) => c.name === options.sortBy);
    if (validCol) {
      const dir = options.sortDir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${validCol.name}" ${dir}`;
    }
  }

  const querySql = `SELECT * FROM "${tableName}" ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
  const queryArgs = [...args, limit, offset];
  const dataRes = await client.execute({ sql: querySql, args: queryArgs });

  return {
    tableName,
    columns,
    rows: dataRes.rows,
    totalRows,
    page,
    limit,
    totalPages: Math.ceil(totalRows / limit) || 1,
  };
}

/**
 * Ejecuta una consulta SQL personalizada de forma controlada
 */
export async function executeCustomQuery(sqlQuery: string): Promise<any> {
  const client = getDbClient();
  const trimmed = sqlQuery.trim();

  if (!trimmed) {
    throw new Error('La consulta SQL no puede estar vacía');
  }

  const startTime = Date.now();
  const result = await client.execute(trimmed);
  const durationMs = Date.now() - startTime;

  return {
    columns: result.columns || [],
    rows: result.rows || [],
    rowsAffected: result.rowsAffected || 0,
    lastInsertRowid: result.lastInsertRowid ? String(result.lastInsertRowid) : null,
    durationMs,
  };
}

/**
 * Optimiza y desfragmenta la base de datos (VACUUM y PRAGMA optimize)
 */
export async function optimizeDatabase(): Promise<any> {
  const client = getDbClient();
  const start = Date.now();
  try {
    await client.execute('PRAGMA optimize;');
  } catch (_) {}
  try {
    await client.execute('VACUUM;');
  } catch (_) {}
  const durationMs = Date.now() - start;
  return { success: true, durationMs, message: 'Base de datos optimizada y desfragmentada correctamente' };
}

export async function initDatabase(): Promise<void> {
  const client = getDbClient();
  try {
    logger.info('Verificando e inicializando tablas en Base de Datos Local...');
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
    try { await client.execute(`ALTER TABLE wisphub_clients ADD COLUMN sn_onu_normalized TEXT;`); } catch (_) {}
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_nombre_norm ON wisphub_clients(nombre_normalized);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_servicio ON wisphub_clients(servicio);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_ip ON wisphub_clients(ip);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_estado ON wisphub_clients(estado);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_dia_corte ON wisphub_clients(dia_corte);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_phone ON wisphub_clients(telefono);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_sn_onu ON wisphub_clients(sn_onu);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wh_sn_norm ON wisphub_clients(sn_onu_normalized);`);

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

    // Tabla de Historial y Bitácora de Cambios de Módem (Reemplazo de ONU)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS modem_swaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        old_sn TEXT NOT NULL,
        new_sn TEXT NOT NULL,
        old_onu_id TEXT,
        new_onu_id TEXT,
        ip_address TEXT,
        vlan TEXT,
        zone TEXT,
        speed_profile TEXT,
        old_data_json TEXT,
        technician_phone TEXT,
        technician_name TEXT,
        status TEXT DEFAULT 'COMPLETADO',
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_modem_swaps_client ON modem_swaps(client_name);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_modem_swaps_old_sn ON modem_swaps(old_sn);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_modem_swaps_new_sn ON modem_swaps(new_sn);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_modem_swaps_created ON modem_swaps(created_at);`);

    // Tabla de Grupos de WhatsApp para Oficinas, Tickets y Activaciones
    await client.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_office_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        jid TEXT UNIQUE NOT NULL,
        invite_link TEXT,
        role TEXT DEFAULT 'TICKETS_OFICINA',
        office TEXT,
        zones TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wag_jid ON whatsapp_office_groups(jid);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wag_role ON whatsapp_office_groups(role);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_wag_active ON whatsapp_office_groups(is_active);`);

    try { await client.execute(`ALTER TABLE tickets ADD COLUMN assigned_office TEXT;`); } catch (_) {}
    try { await client.execute(`ALTER TABLE tickets ADD COLUMN whatsapp_group_jid TEXT;`); } catch (_) {}

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
      logger.info('Usuario inicial "admin" (superadmin) creado exitosamente en Base de Datos Local.');
    }

    logger.info('Tablas "sessions", "settings", "conversation_logs", "smartolt_onus", "wisphub_clients", "tickets", "technicians", "admin_users", "ipam_vlan_pools", "network_outages", "whatsapp_instances", "modem_swaps" y "whatsapp_office_groups" listas en Base de Datos.');
  } catch (error: any) {
    logger.error('Error al inicializar Base de Datos Local:', error?.message || error);
    throw error;
  }
}

export const initLocalDbDatabase = initDatabase;
