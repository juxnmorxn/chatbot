import { Client } from 'ssh2';

export interface OltConfig {
  id: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  username: string;
  password?: string;
  totalGponPorts: number;
  defaultVlan: number;
  community: string;
}

export interface AutofindOnt {
  gponPort: string;
  onuIndex?: number;
  sn: string;
  vendor: string;
  model?: string;
  softwareVer?: string;
  discoveredAt: string;
}

export interface OpticalInfo {
  onuId: number;
  sn?: string;
  rxPowerDbm: number;
  txPowerDbm: number;
  status: 'online' | 'offline' | 'attenuated';
  lastDownCause?: string;
}

export class TpLinkDeltaStreamDriver {
  private config: OltConfig;

  constructor(config: OltConfig) {
    this.config = config;
  }

  /**
   * Ejecuta comandos en la OLT vía SSH
   */
  public async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          stream.on('data', (d: Buffer) => { output += d.toString(); });
          stream.stderr.on('data', (d: Buffer) => { output += d.toString(); });
          stream.on('close', () => {
            conn.end();
            resolve(output);
          });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect({
        host: this.config.ip,
        port: this.config.port || 22,
        username: this.config.username,
        password: this.config.password || '',
        readyTimeout: 10000,
      });
    });
  }

  /**
   * Consulta ONTs descubiertas automáticamente pendientes de autorizar (Autofind)
   */
  public async getAutofindOnts(port: string = '1/0/1'): Promise<AutofindOnt[]> {
    try {
      const raw = await this.executeCommand(`show ont autofind gpon ${port}`);
      return this.parseAutofind(raw, port);
    } catch (error) {
      console.error(`[OLT ${this.config.name}] Error leyendo autofind:`, error);
      return [];
    }
  }

  /**
   * Parseador de salida CLI de 'show ont autofind' de TP-Link
   */
  public parseAutofind(cliOutput: string, gponPort: string): AutofindOnt[] {
    const onts: AutofindOnt[] = [];
    const lines = cliOutput.split('\n');

    // Patrón típico: GPON Port / SN / Vendor / EquipID
    // Ejemplo: 1/0/1   HWTC-6841F9B6   HWTC
    const snRegex = /(HWTC|48575443|ALCL|ZTEG|ISPR)[0-9A-Za-z\-_]+/i;

    for (const line of lines) {
      const match = line.match(snRegex);
      if (match) {
        const sn = match[0].trim();
        const vendor = sn.substring(0, 4);
        onts.push({
          gponPort,
          sn,
          vendor,
          discoveredAt: new Date().toISOString()
        });
      }
    }

    return onts;
  }

  /**
   * Aprovisionamiento en 1-Click de una ONT Huawei en TP-Link DeltaStream
   */
  public async provisionOnt(params: {
    gponPort: string;
    onuId: number;
    serial: string;
    clientName: string;
    vlanId: number;
    lineProfileId?: number;
    srvProfileId?: number;
    srvPortProfileId?: number;
  }): Promise<{ success: boolean; log: string }> {
    const lineProf = params.lineProfileId ?? 4;
    const srvProf = params.srvProfileId ?? 10;
    const srvPortProf = params.srvPortProfileId ?? 4;
    const sanitizedName = params.clientName.replace(/["';]/g, '').trim();

    const cliScript = `
configure
interface gpon ${params.gponPort}
 ont add ${params.onuId} sn-auth ${params.serial} desc "${sanitizedName}" ont-lineprofile-id ${lineProf} ont-srvprofile-id ${srvProf} ont-srvport-profile-id ${srvPortProf}
exit
service-port ${params.onuId} config gpon ${params.gponPort} ont ${params.onuId} gem-id 1 svlan ${params.vlanId} user-vlan ${params.vlanId} tag-action translate desc "${sanitizedName}"
end
copy running-config startup-config
`;

    try {
      const log = await this.executeCommand(cliScript);
      const isFailed = /error|invalid|failed/i.test(log);
      return { success: !isFailed, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }

  /**
   * Consulta de niveles de potencia óptica en dBm
   */
  public async getOpticalLevels(port: string = '1/0/1'): Promise<OpticalInfo[]> {
    try {
      const raw = await this.executeCommand(`show ont optical-info gpon ${port}`);
      return this.parseOpticalInfo(raw);
    } catch (err) {
      console.error(`[OLT ${this.config.name}] Error leyendo niveles ópticos:`, err);
      return [];
    }
  }

  /**
   * Parseador de potencias ópticas
   */
  public parseOpticalInfo(output: string): OpticalInfo[] {
    const list: OpticalInfo[] = [];
    const lines = output.split('\n');

    // Ejemplo: ONU_ID | RX (dBm) | TX (dBm) | Status
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\s+([-\d.]+)\s+([-\d.]+)\s+(\w+)/);
      if (m) {
        const onuId = parseInt(m[1], 10);
        const rx = parseFloat(m[2]);
        const tx = parseFloat(m[3]);
        let status: 'online' | 'offline' | 'attenuated' = 'online';

        if (rx < -27) status = 'attenuated';
        if (rx < -35 || isNaN(rx)) status = 'offline';

        list.push({ onuId, rxPowerDbm: rx, txPowerDbm: tx, status });
      }
    }
    return list;
  }
}
