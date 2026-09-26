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
  isActive?: boolean;
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
  isActive: boolean;
}

export class IpamService {
  /**
   * Configuración de Subredes y VLANs por defecto de CloudWare:
   */
  static readonly DEFAULT_SUBNETS: VlanSubnetConfig[] = [
    // OLT5800-Actopan (VLANs 510 a 620)
    { vlan: '510', name: '510 - Internet', segment: '172.19.1.0/24', gateway: '172.19.1.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '520', name: '520 - Internet', segment: '172.19.2.0/24', gateway: '172.19.2.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '530', name: '530 - Internet', segment: '172.19.3.0/24', gateway: '172.19.3.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '540', name: '540 - Internet', segment: '172.19.4.0/24', gateway: '172.19.4.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '550', name: '550 - Internet', segment: '172.19.5.0/24', gateway: '172.19.5.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '560', name: '560 - Internet', segment: '172.19.6.0/24', gateway: '172.19.6.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '570', name: '570 - Internet', segment: '172.19.7.0/24', gateway: '172.19.7.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '580', name: '580 - Internet', segment: '172.19.8.0/24', gateway: '172.19.8.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '590', name: '590 - Internet', segment: '172.19.9.0/24', gateway: '172.19.9.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '600', name: '600 - Internet', segment: '172.19.10.0/24', gateway: '172.19.10.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '610', name: '610 - Internet', segment: '172.19.11.0/24', gateway: '172.19.11.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    { vlan: '620', name: '620 - Internet', segment: '172.19.12.0/24', gateway: '172.19.12.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '3', oltName: 'OLT5800-Actopan', isActive: true },
    // OLT-SanAgustin (VLAN 800)
    { vlan: '800', name: '800 - Internet San Agustín', segment: '172.16.80.0/24', gateway: '172.16.80.254', netmask: '255.255.255.0', startHost: 2, endHost: 253, oltId: '2', oltName: 'OLT-SanAgustin', isActive: true },
  ];

  /**
   * Obtiene la lista completa de VLANs y Subredes de fibra óptica (FTTH)
   * Actopan (VLANs 510 a 620) y San Agustín (VLAN 800).
   * Excluye antenas / segmentos inalámbricos (172.17.x.x, 192.168.x.x, etc.).
   */
  static async getAllSubnets(): Promise<VlanSubnetConfig[]> {
    const subnetsMap = new Map<string, VlanSubnetConfig>();

    // 1. Cargar subredes por defecto de FTTH (Actopan 510-620 y San Agustín 800)
    for (const d of this.DEFAULT_SUBNETS) {
      subnetsMap.set(d.vlan, { ...d });
    }

    // 2. Limpiar en Turso DB cualquier subred de antenas / no-FTTH previa
    try {
      const client = getTursoClient();
      await client.execute(`
        DELETE FROM ipam_vlan_pools 
        WHERE vlan LIKE 'VLAN-%' 
           OR vlan IN ('1010', '1020') 
           OR segment LIKE '172.17.%' 
           OR segment LIKE '192.168.%' 
           OR segment LIKE '172.19.5%'
      `);

      const res = await client.execute(`SELECT * FROM ipam_vlan_pools`);
      
      if (res.rows.length === 0) {
        // Inicializar la tabla exclusivamente con los pools oficiales de fibra óptica
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
          const vlan = String(row.vlan).trim();
          const segment = String(row.segment || '').trim();

          // Filtrar: Solo aceptar VLANs válidas de FTTH (Actopan 510-620 o San Agustín 800-899)
          const vlanNum = parseInt(vlan, 10);
          const isActopanRange = !isNaN(vlanNum) && vlanNum >= 510 && vlanNum <= 620;
          const isSanAgustinRange = !isNaN(vlanNum) && vlanNum >= 800 && vlanNum <= 899;
          const isFtthSegment = segment.startsWith('172.19.') || segment.startsWith('172.16.80.');
          const isActive = row.is_active !== 0 && row.is_active !== '0' && row.is_active !== null;

          if ((isActopanRange || isSanAgustinRange) && isFtthSegment) {
            subnetsMap.set(vlan, {
              vlan,
              name: String(row.name || `${vlan} - Internet`),
              segment,
              gateway: String(row.gateway),
              netmask: String(row.netmask || '255.255.255.0'),
              startHost: Number(row.start_host || 2),
              endHost: Number(row.end_host || 253),
              oltId: String(row.olt_id || (isSanAgustinRange ? '2' : '3')),
              oltName: String(row.olt_name || (isSanAgustinRange ? 'OLT-SanAgustin' : 'OLT5800-Actopan')),
              isActive,
              isCustom: true,
            });
          }
        }
      }
    } catch (err: any) {
      logger.warn('No se pudieron leer pools personalizados de Turso DB:', err?.message || err);
    }

    // Ordenar por número de VLAN (510, 520, ... 620, 800)
    return Array.from(subnetsMap.values()).sort((a, b) => {
      const numA = parseInt(a.vlan, 10);
      const numB = parseInt(b.vlan, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.vlan.localeCompare(b.vlan);
    });
  }

  /**
   * Activa o desactiva un pool de VLAN para el bot (toggle switch en panel de control).
   * Cuando isActive es false, el bot ignorará por completo esta VLAN al asignar IPs automáticamente.
   */
  static async toggleVlanPoolActive(vlan: string, isActive: boolean): Promise<boolean> {
    try {
      const client = getTursoClient();
      const now = new Date().toISOString();
      const cleanVlan = String(vlan).trim();
      const activeInt = isActive ? 1 : 0;

      const existing = await client.execute({
        sql: `SELECT vlan FROM ipam_vlan_pools WHERE vlan = ?`,
        args: [cleanVlan],
      });

      if (existing.rows.length === 0) {
        const def = this.DEFAULT_SUBNETS.find(s => s.vlan === cleanVlan);
        if (def) {
          await client.execute({
            sql: `
              INSERT INTO ipam_vlan_pools 
              (vlan, name, segment, gateway, netmask, start_host, end_host, olt_id, olt_name, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [def.vlan, def.name, def.segment, def.gateway, def.netmask, def.startHost, def.endHost, def.oltId, def.oltName, activeInt, now, now],
          });
        }
      } else {
        await client.execute({
          sql: `UPDATE ipam_vlan_pools SET is_active = ?, updated_at = ? WHERE vlan = ?`,
          args: [activeInt, now, cleanVlan],
        });
      }

      logger.info(`[IPAM] Pool VLAN ${cleanVlan} configurado como: ${isActive ? 'ACTIVO (BOT ASIGNA)' : 'IGNORADO (BOT BLOQUEADO)'}`);
      return true;
    } catch (err: any) {
      logger.error(`Error al alternar estado del pool VLAN ${vlan}:`, err?.message || err);
      return false;
    }
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
        isActive: conf.isActive !== false,
      });
    }

    return summary;
  }

  /**
   * Obtiene la siguiente IP libre disponible para aprovisionar un módem.
   * Si se especifica VLAN la intenta primero; si está llena o no se especifica,
   * busca automáticamente en todas las VLANs correspondientes a la OLT.
   * 
   * IMPORTANTE: Ignora por completo cualquier pool que haya sido desactivado para el bot (isActive === false).
   */
  static async getNextAvailableIp(vlan?: string, oltId: string = '3'): Promise<{ ip: string; gateway: string; netmask: string; vlan: string; segment: string; oltName: string } | null> {
    const subnets = await this.getAllSubnets();
    const usedIps = await this.getUsedIpsSet();

    // 1. Filtrar únicamente subredes HABILITADAS para asignación automática por el bot
    const activeSubnets = subnets.filter((s) => s.isActive !== false);

    // 2. Subredes candidatas según la OLT
    const targetOltId = String(oltId);
    let candidates = activeSubnets.filter((s) => s.oltId === targetOltId);
    if (candidates.length === 0) {
      candidates = activeSubnets;
    }

    // Si pidieron una VLAN específica y está activa, ponerla como primera prioridad
    if (vlan) {
      const preferred = candidates.find((s) => s.vlan === vlan);
      if (preferred) {
        candidates = [preferred, ...candidates.filter((s) => s.vlan !== vlan)];
      }
    }

    // 3. Buscar la primera IP libre en las subredes candidatas activas
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
