import { Client as SshClient } from 'ssh2';
import { getDbClient } from '../database/db';
import { Logger } from '../utils/logger';

const logger = new Logger('LocalOltService');

export interface LocalOltRecord {
  id: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  gpon_ports: string;
  mikrotik_ip?: string;
  mikrotik_name?: string;
  wireguard_client_ip?: string;
  status: string;
  last_latency_ms: number;
  last_checked_at?: string;
  created_at?: string;
}

export interface AutofindOnu {
  no: number;
  gponPort: string;
  serial: string;
  vendor?: string;
  model?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
}

export interface AuthorizedOnu {
  onuId: number;
  gponPort: string;
  serial: string;
  clientName: string;
  onlineStatus: string;
  activeStatus?: string;
  adminStatus?: string;
  rxPowerDbm?: number | null;
  txPowerDbm?: number | null;
  rxOltDbm?: number | null;
  distanceMeters?: number | null;
  tempC?: number | null;
  lineProfile?: string;
  serviceProfile?: string;
}

const SSH_ALGORITHMS = {
  kex: [
    'curve25519-sha256',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group1-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group-exchange-sha256',
  ],
  cipher: [
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    '3des-cbc',
    'aes256-cbc',
  ],
  serverHostKey: [
    'ssh-rsa',
    'ssh-dss',
    'ecdsa-sha2-nistp256',
    'ssh-ed25519',
  ],
};

export class LocalOltService {
  private static initialized = false;

  public static async initTable(): Promise<void> {
    if (this.initialized) return;
    try {
      const client = getDbClient();
      await client.execute(`
        CREATE TABLE IF NOT EXISTS local_olts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          model TEXT DEFAULT 'TP-Link DeltaStream DS-P7001-01',
          ip TEXT NOT NULL,
          port INTEGER DEFAULT 22,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          gpon_ports TEXT DEFAULT '1/0/1',
          mikrotik_ip TEXT,
          mikrotik_name TEXT,
          wireguard_client_ip TEXT DEFAULT '10.200.0.2',
          status TEXT DEFAULT 'unknown',
          last_latency_ms INTEGER DEFAULT 0,
          last_checked_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed por defecto si la tabla está vacía
      const rows = await client.execute('SELECT COUNT(*) as count FROM local_olts');
      const count = Number(rows.rows[0]?.count || 0);
      if (count === 0) {
        await client.execute({
          sql: `
            INSERT INTO local_olts (id, name, model, ip, port, username, password, gpon_ports, mikrotik_ip, mikrotik_name, wireguard_client_ip, status)
            VALUES 
              ('olt-fray', 'OLT Fray', 'TP-Link DeltaStream DS-P7001-01', '172.19.60.2', 22, 'admin', 'CloudWare1991', '1/0/1', '10.200.0.2', 'RB-Fray', '10.200.0.2', 'online'),
              ('olt-plomosas', 'OLT Plomosas', 'TP-Link DeltaStream DS-P7001-01', '172.19.70.253', 22, 'admin', 'CloudWare1991', '1/0/1', '10.200.0.3', 'RB-Plomosas', '10.200.0.3', 'offline')
          `,
          args: [],
        });
        logger.info('[LocalOltService] OLTs iniciales registradas en BD (Fray y Plomosas)');
      }
      this.initialized = true;
    } catch (err: any) {
      logger.error('[LocalOltService] Error inicializando tabla local_olts:', err.message);
    }
  }

  public static async getAllOlts(): Promise<LocalOltRecord[]> {
    await this.initTable();
    const client = getDbClient();
    const res = await client.execute('SELECT * FROM local_olts ORDER BY name ASC');
    return res.rows as unknown as LocalOltRecord[];
  }

  public static async getOltById(id: string): Promise<LocalOltRecord | null> {
    await this.initTable();
    const client = getDbClient();
    const res = await client.execute({
      sql: 'SELECT * FROM local_olts WHERE id = ? LIMIT 1',
      args: [id],
    });
    if (res.rows.length === 0) return null;
    return res.rows[0] as unknown as LocalOltRecord;
  }

  public static async saveOlt(data: Partial<LocalOltRecord> & { name: string; ip: string }): Promise<LocalOltRecord> {
    await this.initTable();
    const client = getDbClient();
    const id = data.id || `olt-${Date.now()}`;
    const model = data.model || 'TP-Link DeltaStream DS-P7001-01';
    const port = data.port || 22;
    const username = data.username || 'admin';
    const password = data.password || 'CloudWare1991';
    const gponPorts = data.gpon_ports || '1/0/1';
    const mikrotikIp = data.mikrotik_ip || '';
    const mikrotikName = data.mikrotik_name || '';
    const wgIp = data.wireguard_client_ip || '';

    await client.execute({
      sql: `
        INSERT INTO local_olts (id, name, model, ip, port, username, password, gpon_ports, mikrotik_ip, mikrotik_name, wireguard_client_ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          model = excluded.model,
          ip = excluded.ip,
          port = excluded.port,
          username = excluded.username,
          password = excluded.password,
          gpon_ports = excluded.gpon_ports,
          mikrotik_ip = excluded.mikrotik_ip,
          mikrotik_name = excluded.mikrotik_name,
          wireguard_client_ip = excluded.wireguard_client_ip
      `,
      args: [id, data.name, model, data.ip, port, username, password, gponPorts, mikrotikIp, mikrotikName, wgIp],
    });

    return (await this.getOltById(id))!;
  }

  public static async deleteOlt(id: string): Promise<boolean> {
    await this.initTable();
    const client = getDbClient();
    const res = await client.execute({
      sql: 'DELETE FROM local_olts WHERE id = ?',
      args: [id],
    });
    return (res.rowsAffected || 0) > 0;
  }

  /**
   * Ejecuta comandos en la OLT vía SSH Shell interactivo
   */
  public static async executeCommandsOnOlt(
    olt: LocalOltRecord,
    commands: string[],
    timeoutMs: number = 7000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new SshClient();
      let outputBuffer = '';
      let timer: NodeJS.Timeout | null = null;

      conn.on('ready', () => {
        conn.shell((err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          stream.on('data', (d: Buffer) => {
            outputBuffer += d.toString();
          });

          stream.on('close', () => {
            if (timer) clearTimeout(timer);
            conn.end();
            resolve(outputBuffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''));
          });

          // Enviar cada comando secuencialmente
          const payload = commands.join('\r\n') + '\r\nexit\r\n';
          stream.write(payload);

          timer = setTimeout(() => {
            conn.end();
            resolve(outputBuffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''));
          }, timeoutMs);
        });
      });

      conn.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      conn.connect({
        host: olt.ip,
        port: olt.port || 22,
        username: olt.username,
        password: olt.password,
        readyTimeout: 6000,
        algorithms: SSH_ALGORITHMS as any,
      });
    });
  }

  /**
   * Prueba la conexión SSH con la OLT y mide la latencia
   */
  public static async testOltConnection(oltId: string): Promise<{
    online: boolean;
    latencyMs: number;
    rawInfo?: string;
    error?: string;
  }> {
    const olt = await this.getOltById(oltId);
    if (!olt) return { online: false, latencyMs: 0, error: 'OLT no encontrada' };

    const start = Date.now();
    try {
      const raw = await this.executeCommandsOnOlt(
        olt,
        ['enable', 'show system-info'],
        6000
      );
      const latency = Date.now() - start;
      const isOnline = raw.includes('TP-Link') || raw.includes('DS-P7001') || raw.includes('System Description') || raw.includes('Hardware Version');

      const client = getDbClient();
      await client.execute({
        sql: 'UPDATE local_olts SET status = ?, last_latency_ms = ?, last_checked_at = ? WHERE id = ?',
        args: [isOnline ? 'online' : 'offline', latency, new Date().toISOString(), oltId],
      });

      return {
        online: isOnline,
        latencyMs: latency,
        rawInfo: raw.trim(),
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      const client = getDbClient();
      await client.execute({
        sql: 'UPDATE local_olts SET status = ?, last_latency_ms = ?, last_checked_at = ? WHERE id = ?',
        args: ['offline', latency, new Date().toISOString(), oltId],
      }).catch(() => {});

      return {
        online: false,
        latencyMs: latency,
        error: err.message || 'Error de conexión',
      };
    }
  }

  /**
   * Obtiene la lista de ONUs sin configurar (Autofind) en el puerto GPON
   */
  public static async getAutofind(oltId: string, gponPort: string = '1/0/1'): Promise<AutofindOnu[]> {
    const olt = await this.getOltById(oltId);
    if (!olt) throw new Error('OLT no encontrada');

    const raw = await this.executeCommandsOnOlt(
      olt,
      ['enable', `show ont autofind gpon ${gponPort}`],
      5000
    );

    const onts: AutofindOnu[] = [];
    const lines = raw.split(/\r?\n/);
    let separatorPassed = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('---')) {
        separatorPassed = true;
        continue;
      }
      if (!separatorPassed) continue;

      // Ejemplo: 1    1/0/1  HWTC-12345678  ...
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
        const no = parseInt(parts[0], 10);
        const port = parts[1];
        const serial = parts[2].replace(/-/g, '');
        const vendor = serial.substring(0, 4);

        onts.push({
          no,
          gponPort: port,
          serial: parts[2],
          vendor,
          model: parts[6] || parts[5] || 'ONT Genérica',
        });
      }
    }

    return onts;
  }

  /**
   * Obtiene la lista de ONUs autorizadas y sus niveles ópticos (Rx/Tx dBm)
   */
  public static async getAuthorizedOnus(oltId: string, gponPort: string = '1/0/1'): Promise<AuthorizedOnu[]> {
    const olt = await this.getOltById(oltId);
    if (!olt) throw new Error('OLT no encontrada');

    const raw = await this.executeCommandsOnOlt(
      olt,
      [
        'enable',
        `show ont info gpon ${gponPort} detail`,
        `show ont optical-info gpon ${gponPort}`,
      ],
      8000
    );

    const map = new Map<number, AuthorizedOnu>();

    // 1. Parsear show ont info gpon 1/0/1 detail
    // Columnas típicas: NO. PON_ID ONU_ID SERIAL_NUMBER ONLINE ADMIN ACTIVE CONFIG MATCH LINE SERVICE MGMT SRVPORT ONLINE_TIME DISTANCE MAC DESCRIPTION
    const lines = raw.split(/\r?\n/);
    let inDetail = false;
    let inOptical = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes('show ont info') && trimmed.includes('detail')) {
        inDetail = true;
        inOptical = false;
        continue;
      }
      if (trimmed.includes('show ont optical-info')) {
        inDetail = false;
        inOptical = true;
        continue;
      }

      if (inDetail) {
        if (trimmed.startsWith('---')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[2])) {
          const onuId = parseInt(parts[2], 10);
          const port = parts[1];
          const serial = parts[3];
          const onlineStatus = parts[4] || 'offline';
          const adminStatus = parts[5] || '';
          const activeStatus = parts[6] || '';
          const lineProf = parts[8] || '';
          const srvProf = parts[9] || '';
          const distanceStr = parts[13] || '';
          const distanceMeters = /^\d+$/.test(distanceStr) ? parseInt(distanceStr, 10) : null;
          // Descripción (cliente): usualmente la última columna
          const desc = parts.length >= 15 ? parts.slice(14).join(' ') : (parts[14] || '');

          map.set(onuId, {
            onuId,
            gponPort: port,
            serial,
            clientName: desc === '--' ? '' : desc,
            onlineStatus,
            adminStatus,
            activeStatus,
            distanceMeters,
            lineProfile: lineProf,
            serviceProfile: srvProf,
          });
        }
      }

      if (inOptical) {
        if (trimmed.startsWith('---')) continue;
        const parts = trimmed.split(/\s+/);
        // Columnas: NO. PON_ID ONU_ID SERIAL ONLINE ACTIVE RX TX RX.OLT VCC BIAS TEMP
        if (parts.length >= 7 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[2])) {
          const onuId = parseInt(parts[2], 10);
          const rxStr = parts[6];
          const txStr = parts[7];
          const rxOltStr = parts[8];
          const tempStr = parts[11];

          const existing = map.get(onuId) || {
            onuId,
            gponPort,
            serial: parts[3],
            clientName: '',
            onlineStatus: parts[4] || 'offline',
          };

          existing.onlineStatus = parts[4] || existing.onlineStatus;
          existing.rxPowerDbm = rxStr !== '-' && !isNaN(Number(rxStr)) ? parseFloat(rxStr) : null;
          existing.txPowerDbm = txStr !== '-' && !isNaN(Number(txStr)) ? parseFloat(txStr) : null;
          existing.rxOltDbm = rxOltStr !== '-' && !isNaN(Number(rxOltStr)) ? parseFloat(rxOltStr) : null;
          existing.tempC = tempStr !== '-' && !isNaN(Number(tempStr)) ? parseFloat(tempStr) : null;

          map.set(onuId, existing);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.onuId - b.onuId);
  }

  /**
   * Autoriza una ONT en el puerto GPON de la OLT con el método limpio:
   * Asigna el siguiente ID libre, asocia el Serial y Nombre, y guarda con copy running-config startup-config.
   * CERO TR-069, CERO IPs fijas, CERO inyecciones complejas.
   */
  public static async authorizeOnu(
    oltId: string,
    gponPort: string = '1/0/1',
    serial: string,
    clientName: string
  ): Promise<{
    success: boolean;
    onuId: number;
    serial: string;
    clientName: string;
    log: string;
    error?: string;
  }> {
    const olt = await this.getOltById(oltId);
    if (!olt) throw new Error('OLT no encontrada');

    // 1. Obtener ONUs existentes para calcular el siguiente ONU ID libre
    const existing = await this.getAuthorizedOnus(oltId, gponPort);
    const usedIds = new Set(existing.map((o) => o.onuId));
    let nextOnuId = 0;
    while (usedIds.has(nextOnuId) && nextOnuId < 128) {
      nextOnuId++;
    }

    if (nextOnuId >= 128) {
      throw new Error(`El puerto GPON ${gponPort} está lleno (máximo 128 ONTs)`);
    }

    // 2. Limpiar caracteres inválidos en el nombre
    const sanitizedName = clientName.replace(/["';\r\n\t]/g, '').trim().substring(0, 32);

    // 3. Comandos CLI directos y limpios
    const commands = [
      'enable',
      'configure',
      `interface gpon ${gponPort}`,
      `ont add ${nextOnuId} sn-auth ${serial} desc "${sanitizedName}" ont-lineprofile-id 4 ont-srvprofile-id 1 ont-srvport-profile-id 4`,
      'exit',
      'exit',
      'copy running-config startup-config',
    ];

    logger.info(`[LocalOltService] Autorizando ONT SN=${serial} como ID=${nextOnuId} desc="${sanitizedName}" en OLT ${olt.name} (${olt.ip})...`);
    const log = await this.executeCommandsOnOlt(olt, commands, 12000);

    const isFailed = /error|invalid|failed/i.test(log) && !log.includes('Saving user config OK!');

    return {
      success: !isFailed,
      onuId: nextOnuId,
      serial,
      clientName: sanitizedName,
      log,
      error: isFailed ? 'La OLT devolvió un error al autorizar' : undefined,
    };
  }

  /**
   * Genera el script de MikroTik RouterOS (v7) con WireGuard para conectar una nueva RB al VPS y llegar a su OLT
   */
  public static generateMikrotikScript(
    olt: LocalOltRecord,
    tunnelIp: string = '10.200.0.4/24'
  ): string {
    const cleanIp = tunnelIp.split('/')[0];
    const oltSubnet = olt.ip.replace(/\.\d+$/, '.0/24');

    return `# ==============================================================
# SCRIPT DE CONEXIÓN WIREGUARD - CLOUDWARE MIKROTIK
# OLT Destino: ${olt.name} (${olt.ip})
# Subred OLT: ${oltSubnet}
# IP Túnel Asignada: ${tunnelIp}
# ==============================================================

# 1. Crear la interfaz WireGuard
/interface wireguard
add listen-port=13231 mtu=1420 name=wg-vps

# 2. Asignar la IP interna del túnel
/ip address
add address=${cleanIp}/24 interface=wg-vps network=10.200.0.0

# 3. Configurar el VPS como Peer WireGuard
/interface wireguard peers
add allowed-address=10.200.0.0/24,2.25.241.239/32 \\
    endpoint-address=2.25.241.239 endpoint-port=51820 \\
    interface=wg-vps persistent-keepalive=25s \\
    public-key="uqHcuPxy68PPholZRE6tTP7iYhfPKLPsxAjCCkTBp2E="

# 4. Imprimir la Llave Pública de esta RB (copiarla al VPS)
:put "=== REGISTRA ESTA LLAVE PUBLICA EN EL VPS ==="
:put [/interface wireguard get wg-vps public-key]
`;
  }
}
