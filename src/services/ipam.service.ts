import { TursoService } from './turso.service';
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
  gateway: string;
  oltName: string;
  totalUsable: number;
  usedCount: number;
  availableCount: number;
  usagePercent: number;
}

export class IpamService {
  /**
   * Configuración de Subredes y VLANs de CloudWare:
   * - OLT5800-Actopan (ID 3): VLANs 510 a 610 (Segmentos 172.19.1.0/24 a 172.19.11.0/24, Gateway .254)
   * - OLT-SanAgustin (ID 2): VLAN 800 (Segmento 172.16.80.0/24, Gateway .254)
   */
  static readonly SUBNETS: VlanSubnetConfig[] = [
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
    const usedIps = await this.getUsedIpsSet();
    const result: AvailableIpRecord[] = [];
    let globalIndex = 1;

    for (const conf of this.SUBNETS) {
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
    const usedIps = await this.getUsedIpsSet();
    const summary: PoolSummaryRecord[] = [];

    for (const conf of this.SUBNETS) {
      const prefix = conf.segment.replace(/\.0\/24$/, '');
      const totalUsable = conf.endHost - conf.startHost + 1; // 252 IPs
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
        gateway: conf.gateway,
        oltName: conf.oltName,
        totalUsable,
        usedCount,
        availableCount,
        usagePercent,
      });
    }

    return summary;
  }

  /**
   * Obtiene la siguiente IP libre disponible para aprovisionar un módem.
   * Si se especifica VLAN la intenta primero; si está llena o no se especifica,
   * busca automáticamente en todas las VLANs correspondientes a la OLT (ej: 510 a 610 en Actopan).
   */
  static async getNextAvailableIp(vlan?: string, oltId: string = '3'): Promise<{ ip: string; gateway: string; netmask: string; vlan: string; segment: string; oltName: string } | null> {
    const usedIps = await this.getUsedIpsSet();

    // 1. Subredes candidatas según la OLT
    const targetOltId = String(oltId);
    let candidates = this.SUBNETS.filter((s) => s.oltId === targetOltId);
    if (candidates.length === 0) {
      candidates = this.SUBNETS;
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
