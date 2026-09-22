import { TursoService } from './turso.service';
import { getTursoClient } from '../database/turso';
import { Logger } from '../utils/logger';

const logger = new Logger('IpamService');

export interface VlanSubnetConfig {
  vlan: string;
  name: string;
  segment: string; // ej: '172.19.1.0/24'
  gateway: string; // ej: '172.19.1.254'
  netmask: string; // ej: '255.255.255.0'
  startHost: number; // 2
  endHost: number; // 253
  oltId: string; // '3'
  oltName: string; // 'OLT5800-Actopan'
  isCustom?: boolean;
}

export interface AvailableIpRecord {
  index: number;
  ip: string;
  vlan: string;
  gateway: string;
  segment: string;
  olt: string;
  status: 'Disponible';
}

export interface PoolSummaryRecord {
  vlan: string;
  name: string;
  segment: string;
  subnet?: string;
  gateway: string;
  oltName: string;
  totalUsable: number;
  usedCount: number;
  availableCount: number;
  usagePercent: number;
  total?: number;
  used?: number;
  free?: number;
}

export class IpamService {
  /**
   * Configuración de Subredes y VLANs por defecto de CloudWare:
   */
  static readonly DEFAULT_SUBNETS: VlanSubnetConfig[] = [
    // OLT5800-Actopan
    { vlan: '510', name: '510 - Internet', segment: '172.19.1.0/24', gateway: '172.19.1.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '520', name: '520 - Internet', segment: '172.19.2.0/24', gateway: '172.19.2.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '530', name: '530 - Internet', segment: '172.19.3.0/24', gateway: '172.19.3.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '540', name: '540 - Internet', segment: '172.19.4.0/24', gateway: '172.19.4.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '550', name: '550 - Internet', segment: '172.19.5.0/24', gateway: '172.19.5.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '560', name: '560 - Internet', segment: '172.19.6.0/24', gateway: '172.19.6.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '570', name: '570 - Internet', segment: '172.19.7.0/24', gateway: '172.19.7.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '580', name: '580 - Internet', segment: '172.19.8.0/24', gateway: '172.19.8.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '590', name: '590 - Internet', segment: '172.19.9.0/24', gateway: '172.19.9.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '600', name: '600 - Internet', segment: '172.19.10.0/24', gateway: '172.19.10.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    { vlan: '610', name: '610 - Internet', segment: '172.19.11.0/24', gateway: '172.19.11.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan' },
    // OLT-SanAgustin
    { vlan: '800', name: '800 - Internet San Agustín', segment: '172.16.80.0/24', gateway: '172.16.80.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '2', oltName: 'OLT-SanAgustin' },
  ];

  /**
   * Obtiene la lista completa de VLANs y Subredes combinando la base de datos Turso DB,
   * los valores por defecto y el auto-descubrimiento en tiempo real de IPs registradas.
   */
  static async getAllSubnets(): Promise<VlanSubnetConfig[]> {
    const subnetsMap = new Map<string, VlanSubnetConfig>();

    // 1. Cargar subredes por defecto
    for (const d of this.DEFAULT_SUBNETS) {
      subnetsMap.set(d.vlan, { ...d });
    }

    // 2. Cargar subredes configuradas en Turso DB (tabla ipam_vlan_pools)
    try {
      const client = getTursoClient();
      const res = await client.execute(`SELECT * FROM ipam_vlan_pools WHERE is_active = 1`);
      
      if (res.rows.length === 0) {
        // Inicializar la tabla con los valores por defecto
        const now = new Date().toISOString();
        for (const s of this.DEFAULT_SUBNETS) {
          try {
            await client.execute({
              sql: `
                INSERT OR IGNORE INTO ipam_vlan_pools 
                (vlan, name, segment, gateway, netmask, start_host, end_host, olt_id, olt_name, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
              `,
              args: [s.vlan, s.name, s.segment, s.gateway, s.netmask, s.startHost, s.endHost, s.oltId, s.oltName, now, now],
            });
          } catch {}
        }
      } else {
        for (const row of res.rows) {
          const vlan = String(row.vlan);
          subnetsMap.set(vlan, {
            vlan,
            name: String(row.name || `${vlan} - Internet`),
            segment: String(row.segment),
            gateway: String(row.gateway),
            netmask: String(row.netmask || '255.255.255.0'),
            startHost: Number(row.start_host || 2),
            endHost: Number(row.end_host || 253),
            oltId: String(row.olt_id || '3'),
            oltName: String(row.olt_name || 'OLT5800-Actopan'),
            isCustom: true,
          });
        }
      }
    } catch (err: any) {
      logger.warn('No se pudieron leer pools personalizados de Turso DB:', err?.message || err);
    }

    // 3. Auto-descubrimiento en tiempo real: Detectar si en smartolt_onus o wisphub_clients hay IPs de subredes no registradas
    try {
      const client = getTursoClient();
      const ipRows = await client.execute(`
        SELECT DISTINCT ip_address as ip, olt_name FROM smartolt_onus WHERE ip_address IS NOT NULL AND ip_address != ''
        UNION
        SELECT DISTINCT ip, 'OLT5800-Actopan' as olt_name FROM wisphub_clients WHERE ip IS NOT NULL AND ip != ''
      `);

      for (const row of ipRows.rows) {
        const rawIp = String(row.ip || '').trim().split('/')[0].trim();
        const parts = rawIp.split('.');
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          const segment = `${prefix}.0/24`;
          const gateway = `${prefix}.254`;
          
          // Verificar si este segmento ya está cubierto
          let exists = false;
          for (const conf of subnetsMap.values()) {
            if (conf.segment === segment) {
              exists = true;
              break;
            }
          }

          if (!exists) {
            // Auto-generar VLAN ID sugerida basada en el tercer octeto o nombre
            const thirdOctet = parseInt(parts[2], 10);
            let suggestedVlan = '';
            if (parts[1] === '19') {
              // 172.19.1.0 -> 510, 172.19.2.0 -> 520, 172.19.12.0 -> 620, etc.
              suggestedVlan = String(500 + thirdOctet * 10);
            } else if (parts[1] === '16' && parts[2] === '80') {
              suggestedVlan = '800';
            } else {
              suggestedVlan = `VLAN-${parts[1]}.${parts[2]}`;
            }

            const oltName = String(row.olt_name || (parts[1] === '16' ? 'OLT-SanAgustin' : 'OLT5800-Actopan'));
            const oltId = oltName.toLowerCase().includes('sanagustin') || parts[1] === '16' ? '2' : '3';

            const discovered: VlanSubnetConfig = {
              vlan: suggestedVlan,
              name: `${suggestedVlan} - Auto-Detectada (${segment})`,
              segment,
              gateway,
              netmask: '255.255.255.0',
              startHost: 2,
              endHost: 253,
              oltId,
              oltName,
              isCustom: true,
            };

            subnetsMap.set(suggestedVlan, discovered);

            // Persistir la subred descubierta en base de datos
            try {
              const now = new Date().toISOString();
              await client.execute({
                sql: `
                  INSERT OR IGNORE INTO ipam_vlan_pools 
                  (vlan, name, segment, gateway, netmask, start_host, end_host, olt_id, olt_name, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `,
                args: [discovered.vlan, discovered.name, discovered.segment, discovered.gateway, discovered.netmask, discovered.startHost, discovered.endHost, discovered.oltId, discovered.oltName, now, now],
              });
              logger.info(`[Auto-IPAM] Nueva VLAN/Subred detectada y guardada: ${discovered.vlan} (${segment})`);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      logger.warn('Error en auto-descubrimiento de subredes IPAM:', err?.message || err);
    }

    // Ordenar por número de VLAN
    return Array.from(subnetsMap.values()).sort((a, b) => {
      const numA = parseInt(a.vlan, 10);
      const numB = parseInt(b.vlan, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.vlan.localeCompare(b.vlan);
    });
  }

  /**
   * Guarda o actualiza un pool de VLAN en la base de datos
   */
  static async saveVlanPool(config: {
    vlan: string;
    name: string;
    segment: string;
    gateway: string;
    netmask?: string;
    startHost?: number;
    endHost?: number;
    oltId?: string;
    oltName?: string;
  }): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      const vlan = String(config.vlan).trim();
      const name = String(config.name || `${vlan} - Internet`).trim();
      const segment = String(config.segment).trim();
      const gateway = String(config.gateway).trim();
      const netmask = config.netmask || '255.255.255.0';
      const startHost = Number(config.startHost || 2);
      const endHost = Number(config.endHost || 253);
      const oltId = String(config.oltId || '3');
      const oltName = String(config.oltName || (oltId === '2' ? 'OLT-SanAgustin' : 'OLT5800-Actopan'));

      await client.execute({
        sql: `
          INSERT INTO ipam_vlan_pools 
          (vlan, name, segment, gateway, netmask, start_host, end_host, olt_id, olt_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(vlan) DO UPDATE SET
            name = excluded.name,
            segment = excluded.segment,
            gateway = excluded.gateway,
            netmask = excluded.netmask,
            start_host = excluded.start_host,
            end_host = excluded.end_host,
            olt_id = excluded.olt_id,
            olt_name = excluded.olt_name,
            is_active = 1,
            updated_at = excluded.updated_at
        `,
        args: [vlan, name, segment, gateway, netmask, startHost, endHost, oltId, oltName, now, now],
      });

      logger.info(`[IPAM] Pool VLAN ${vlan} (${segment}) guardado exitosamente.`);
      return true;
    } catch (err: any) {
      logger.error('Error al guardar pool VLAN en IPAM:', err?.message || err);
      return false;
    }
  }

  /**
   * Elimina un pool de VLAN personalizado
   */
  static async deleteVlanPool(vlan: string): Promise<boolean> {
    try {
      const client = getTursoClient();
      const res = await client.execute({
        sql: `DELETE FROM ipam_vlan_pools WHERE vlan = ?`,
        args: [String(vlan).trim()],
      });
      return (res.rowsAffected || 0) > 0;
    } catch (err: any) {
      logger.error(`Error al eliminar pool VLAN ${vlan}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Obtiene todas las IPs asignadas en Turso DB (desde SmartOLT y WispHub)
   */
  private static async getUsedIpsSet(): Promise<Set<string>> {
    const usedIps = new Set<string>();

    try {
      // 1. Obtener IPs de SmartOLT ONUs almacenadas en Turso
      const onus = await TursoService.getAllSmartOltOnus();
      for (const o of onus) {
        if (o.ip_address && o.ip_address.trim()) {
          const cleanIp = o.ip_address.trim().split('/')[0].trim();
          if (cleanIp) usedIps.add(cleanIp);
        }
      }

      // 2. Obtener IPs de clientes WispHub almacenados en Turso
      const clientes = await TursoService.getAllWispHubClientes();
      for (const c of clientes) {
        if (c.ip && c.ip.trim()) {
          const cleanIp = c.ip.trim().split('/')[0].trim();
          if (cleanIp) usedIps.add(cleanIp);
        }
      }
    } catch (err: any) {
      logger.warn('Error al obtener IPs ocupadas desde Turso DB:', err?.message || err);
    }

    return usedIps;
  }

  /**
   * Genera la lista de todas las IPs disponibles calculadas en tiempo real para todas o una VLAN específica
   */
  static async getAvailableIps(vlanFilter?: string, oltFilter?: string): Promise<AvailableIpRecord[]> {
    const subnets = await this.getAllSubnets();
    const usedIps = await this.getUsedIpsSet();
    const result: AvailableIpRecord[] = [];
    let globalIndex = 1;

    for (const conf of subnets) {
      if (vlanFilter && conf.vlan !== vlanFilter) continue;
      if (oltFilter && conf.oltId !== oltFilter && !conf.oltName.toLowerCase().includes(oltFilter.toLowerCase())) continue;

      const prefix = conf.segment.replace(/\.0\/24$/, ''); // ej: '172.19.1'

      for (let host = conf.startHost; host <= conf.endHost; host++) {
        const ip = `${prefix}.${host}`;
        if (!usedIps.has(ip)) {
          result.push({
            index: globalIndex++,
            ip,
            vlan: conf.vlan,
            gateway: conf.gateway,
            segment: conf.segment,
            olt: conf.oltName,
            status: 'Disponible',
          });
        }
      }
    }

    return result;
  }

  /**
   * Resumen de capacidad y ocupación por cada VLAN / Segmento
   */
  static async getPoolSummary(): Promise<PoolSummaryRecord[]> {
    const subnets = await this.getAllSubnets();
    const usedIps = await this.getUsedIpsSet();
    const summary: PoolSummaryRecord[] = [];

    for (const conf of subnets) {
      const prefix = conf.segment.replace(/\.0\/24$/, '');
      const totalUsable = conf.endHost - conf.startHost + 1;
      let usedCount = 0;

      for (let host = conf.startHost; host <= conf.endHost; host++) {
        const ip = `${prefix}.${host}`;
        if (usedIps.has(ip)) {
          usedCount++;
        }
      }

      const availableCount = Math.max(0, totalUsable - usedCount);
      const usagePercent = Math.round((usedCount / totalUsable) * 100);

      summary.push({
        vlan: conf.vlan,
        name: conf.name,
        segment: conf.segment,
        subnet: conf.segment,
        gateway: conf.gateway,
        oltName: conf.oltName,
        totalUsable,
        usedCount,
        availableCount,
        usagePercent,
        total: totalUsable,
        used: usedCount,
        free: availableCount,
      });
    }

    return summary;
  }

  /**
   * Obtiene la siguiente IP libre disponible para aprovisionar un módem.
   * Si se especifica VLAN la intenta primero; si está llena o no se especifica,
   * busca automáticamente en todas las VLANs correspondientes a la OLT.
   */
  static async getNextAvailableIp(vlan?: string, oltId: string = '3'): Promise<{ ip: string; gateway: string; netmask: string; vlan: string; segment: string; oltName: string } | null> {
    const subnets = await this.getAllSubnets();
    const usedIps = await this.getUsedIpsSet();

    // 1. Subredes candidatas según la OLT
    const targetOltId = String(oltId);
    let candidates = subnets.filter((s) => s.oltId === targetOltId);
    if (candidates.length === 0) {
      candidates = subnets;
    }

    // Si pidieron una VLAN específica, ponerla como primera prioridad
    if (vlan) {
      const preferred = candidates.find((s) => s.vlan === vlan);
      if (preferred) {
        candidates = [preferred, ...candidates.filter((s) => s.vlan !== vlan)];
      }
    }

    // 2. Buscar la primera IP libre en las subredes candidatas
    for (const conf of candidates) {
      const prefix = conf.segment.replace(/\.0\/24$/, '');
      for (let host = conf.startHost; host <= conf.endHost; host++) {
        const ip = `${prefix}.${host}`;
        if (!usedIps.has(ip)) {
          return {
            ip,
            gateway: conf.gateway,
            netmask: conf.netmask,
            vlan: conf.vlan,
            segment: conf.segment,
            oltName: conf.oltName,
          };
        }
      }
    }

    return null;
  }
}
