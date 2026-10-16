import net from 'net';
import { HuaweiOntDriver, FullOntTelemetry } from '../drivers/huawei-ont.js';
import { getOltDb } from '../db.js';

export interface DiscoveredModem {
  ip: string;
  mac: string;
  serial: string;
  model: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  telemetry?: FullOntTelemetry;
}

export class ModemDiscoveryService {
  private static ipCache = new Map<string, { ip: string; timestamp: number }>();

  /**
   * Escaneo asíncrono ultra-rápido de puerto 80 en un rango /24 (toma ~600ms)
   */
  public static async scanSubnetPort80(baseSubnet: string): Promise<string[]> {
    const cleanBase = baseSubnet.replace(/\.\d+\/\d+$/, '').replace(/\/\d+$/, '');
    const promises: Promise<string | null>[] = [];
    const activeIps: string[] = [];

    for (let i = 2; i <= 254; i++) {
      const ip = `${cleanBase}.${i}`;
      const p = new Promise<string | null>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(600);
        socket.on('connect', () => {
          activeIps.push(ip);
          socket.destroy();
          resolve(ip);
        });
        socket.on('timeout', () => { socket.destroy(); resolve(null); });
        socket.on('error', () => { socket.destroy(); resolve(null); });
        socket.connect(80, ip);
      });
      promises.push(p);
    }

    await Promise.all(promises);
    return activeIps;
  }

  /**
   * Intenta autenticarse en el módem con las credenciales estándar (Epadmin / adminEp)
   * y extrae MAC física y Número de Serie
   */
  public static async probeModem(ip: string, username = 'Epadmin', password = 'adminEp'): Promise<DiscoveredModem | null> {
    try {
      const driver = new HuaweiOntDriver(ip, username, password);
      const loginRes = await driver.login();
      if (!loginRes.success) return null;

      const [wan, dev, opt, wifi, tr069] = await Promise.all([
        driver.getWanInfo().catch(() => undefined),
        driver.getDeviceInfo().catch(() => undefined),
        driver.getOpticalInfo().catch(() => undefined),
        driver.getWifiInfo().catch(() => undefined),
        driver.getTr069Info().catch(() => undefined)
      ]);

      let serial = dev?.serial || '';
      // Normalizar serial Huawei: Si viene en HEX (48575443...), convertir el prefijo a HWTC
      if (serial.startsWith('48575443')) {
        serial = 'HWTC-' + serial.substring(8);
      }

      return {
        ip,
        mac: wan?.mac ? wan.mac.toUpperCase() : '',
        serial: serial.toUpperCase(),
        model: dev?.model || 'Huawei GPON ONT',
        hardwareVersion: dev?.hardwareVersion,
        softwareVersion: dev?.softwareVersion,
        telemetry: {
          ip,
          online: true,
          device: dev,
          optical: opt,
          wan,
          wifi,
          tr069
        }
      };
    } catch {
      return null;
    }
  }

  /**
   * Resuelve automáticamente la IP de una ONT buscando en la base de datos,
   * en caché o escaneando las subredes del túnel WireGuard de la OLT
   */
  public static async resolveOntIp(
    serial: string,
    mac?: string,
    allowedSubnets?: string[],
    oltId?: string
  ): Promise<string | null> {
    const cleanSn = serial.toUpperCase();
    const cleanMac = (mac || '').toUpperCase();

    // 1. Revisar cache en memoria (< 2 minutos)
    const cached = this.ipCache.get(cleanSn);
    if (cached && (Date.now() - cached.timestamp < 120000)) {
      return cached.ip;
    }

    const db = getOltDb();

    // 2. Revisar base de datos
    const dbRow = await db.execute({
      sql: 'SELECT ip_address FROM provisioned_onts WHERE serial = ?',
      args: [cleanSn]
    }).then(r => r.rows[0] as any).catch(() => null);

    if (dbRow?.ip_address) {
      this.ipCache.set(cleanSn, { ip: dbRow.ip_address, timestamp: Date.now() });
      return dbRow.ip_address;
    }

    // 3. Si no hay IP guardada, escanear subredes asociadas a la OLT
    if (!allowedSubnets || allowedSubnets.length === 0) return null;

    for (const subnet of allowedSubnets) {
      const activeIps = await this.scanSubnetPort80(subnet);
      for (const ip of activeIps) {
        const probed = await this.probeModem(ip);
        if (!probed) continue;

        // Validar si coincide con el MAC o el Serial
        const macMatch = cleanMac && probed.mac && (probed.mac === cleanMac);
        const snMatch = probed.serial && (
          probed.serial === cleanSn ||
          probed.serial.replace('-', '') === cleanSn.replace('-', '') ||
          cleanSn.includes(probed.serial)
        );

        if (macMatch || snMatch) {
          this.ipCache.set(cleanSn, { ip, timestamp: Date.now() });

          // Guardar automáticamente en SQLite para consultas futuras a 0ms (0 hardcoding)
          try {
            await db.execute({
              sql: `INSERT INTO provisioned_onts (
                      olt_id, gpon_port, onu_id, serial, client_name, vlan_id,
                      ip_address, gateway, wifi_ssid, wifi_ssid_5g
                    )
                    VALUES (?, '1/0/1', 0, ?, 'Cliente', 400, ?, ?, ?, ?)
                    ON CONFLICT(serial) DO UPDATE SET
                      ip_address = excluded.ip_address,
                      gateway = excluded.gateway,
                      wifi_ssid = COALESCE(excluded.wifi_ssid, wifi_ssid),
                      wifi_ssid_5g = COALESCE(excluded.wifi_ssid_5g, wifi_ssid_5g)`,
              args: [
                oltId || 'olt_default',
                cleanSn,
                ip,
                probed.telemetry?.wan?.gateway || `${ip.split('.').slice(0, 3).join('.')}.1`,
                probed.telemetry?.wifi?.ssid2g || null,
                probed.telemetry?.wifi?.ssid5g || null
              ]
            });
          } catch (e) {
            console.error('[ModemDiscovery] Error guardando IP descubierta:', e);
          }

          return ip;
        }
      }
    }

    return null;
  }
}
