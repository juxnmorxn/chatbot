import { Client } from 'ssh2';

export interface OltDevice {
  id: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  username: string;
  password?: string;
  total_gpon_ports?: number;
  default_vlan: number;
  community: string;
  mikrotik_ip?: string;
  mikrotik_name?: string;
  status?: string;
  last_latency_ms?: number;
  last_checked_at?: string;
}

export interface AutofindOnt {
  gponPort: string;
  sn: string;
  vendor: string;
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
  private config: OltDevice;

  constructor(config: OltDevice) {
    this.config = config;
  }

  /**
   * Ejecuta comandos en la OLT vía SSH con timeout configurable
   */
  public async executeCommand(command: string, timeoutMs: number = 8000): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';
      let timer: NodeJS.Timeout;

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            conn.end();
            return reject(err);
          }
          stream.on('data', (d: Buffer) => { output += d.toString(); });
          stream.stderr.on('data', (d: Buffer) => { output += d.toString(); });
          stream.on('close', () => {
            clearTimeout(timer);
            conn.end();
            resolve(output);
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      timer = setTimeout(() => {
        conn.end();
        reject(new Error(`Timeout SSH (${timeoutMs}ms) conectando a OLT ${this.config.ip}`));
      }, timeoutMs);

      conn.connect({
        host: this.config.ip,
        port: this.config.port || 22,
        username: this.config.username,
        password: this.config.password || '',
        readyTimeout: timeoutMs,
        algorithms: {
          kex: [
            'curve25519-sha256',
            'curve25519-sha256@libssh.org',
            'ecdh-sha2-nistp256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group1-sha1'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes128-gcm@openssh.com',
            'aes256-gcm',
            'aes256-gcm@openssh.com',
            'aes256-cbc',
            'aes192-cbc',
            'aes128-cbc',
            '3des-cbc'
          ],
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'rsa-sha2-512',
            'rsa-sha2-256',
            'ssh-rsa',
            'ssh-dss'
          ],
          hmac: [
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1',
            'hmac-sha1-96',
            'hmac-md5'
          ]
        }
      });
    });
  }

  /**
   * Prueba de conexión en tiempo real: mide latencia y obtiene modelo de la OLT
   */
  public async testConnection(): Promise<{ online: boolean; latencyMs: number; rawInfo?: string; error?: string }> {
    const start = Date.now();
    try {
      // Comando básico de consulta en TP-Link DeltaStream
      const raw = await this.executeCommand('show system-info\n', 5000);
      const latencyMs = Date.now() - start;
      return { online: true, latencyMs, rawInfo: raw };
    } catch (err: any) {
      return { online: false, latencyMs: 0, error: err.message || String(err) };
    }
  }

  /**
   * Consulta ONTs descubiertas automáticamente pendientes de autorizar (Autofind)
   */
  public async getAutofindOnts(port: string = '1/0/1'): Promise<AutofindOnt[]> {
    try {
      const raw = await this.executeCommand(`show ont autofind gpon ${port}\n`);
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
    const snRegex = /(HWTC|48575443|ALCL|ZTEG|ISPR|TPLG)[0-9A-Za-z\-_]+/i;

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
   * Aprovisionamiento en 1-Click de una ONT
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
      const log = await this.executeCommand(cliScript, 15000);
      const isFailed = /error|invalid|failed/i.test(log);
      return { success: !isFailed, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }

  /**
   * Eliminar o desaprovisionar ONT
   */
  public async deleteOnt(gponPort: string, onuId: number): Promise<{ success: boolean; log: string }> {
    const cliScript = `
configure
no service-port ${onuId}
interface gpon ${gponPort}
 ont delete ${onuId}
exit
end
copy running-config startup-config
`;
    try {
      const log = await this.executeCommand(cliScript, 10000);
      return { success: true, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }

  /**
   * Consulta de niveles de potencia óptica en dBm
   */
  public async getOpticalLevels(port: string = '1/0/1'): Promise<OpticalInfo[]> {
    try {
      const raw = await this.executeCommand(`show ont optical-info gpon ${port}\n`);
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
