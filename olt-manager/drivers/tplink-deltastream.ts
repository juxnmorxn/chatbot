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

export interface ConfiguredOnt {
  onuId: number;
  sn: string;
  gponPort: string;
  name: string;
  status: 'online' | 'offline';
  rxPower: string;
  txPower: string;
  vlan: number;
  profile: string;
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

      const cleanup = () => {
        clearTimeout(timer);
        try { conn.end(); } catch {}
      };

      conn.on('ready', () => {
        // En TP-Link DeltaStream y OLTs se debe usar terminal interactiva VT100
        conn.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
          if (err) {
            cleanup();
            return reject(err);
          }

          let commandSent = false;
          let idleTimer: NodeJS.Timeout;

          const finish = () => {
            clearTimeout(timer);
            clearTimeout(idleTimer);
            try { stream.end(); } catch {}
            try { conn.end(); } catch {}
            resolve(output);
          };

          const sendCommand = () => {
            if (!commandSent) {
              commandSent = true;
              stream.write('\n');
              setTimeout(() => {
                stream.write(`${command.trim()}\n`);
              }, 250);
            }
          };

          stream.on('data', (d: Buffer) => {
            const chunk = d.toString('utf8');
            output += chunk;

            // Manejar paginador --More-- si la OLT pausa la salida
            if (/--More--|-- More --/i.test(chunk)) {
              stream.write(' ');
            }

            if (!commandSent) {
              // Esperar prompt inicial de la OLT
              if (/[>#$]\s*$/.test(output.trim()) || output.includes('>') || output.includes('#')) {
                sendCommand();
              }
            } else {
              clearTimeout(idleTimer);
              if (/[>#$]\s*$/.test(output.trim())) {
                idleTimer = setTimeout(finish, 600);
              } else {
                idleTimer = setTimeout(finish, 1400);
              }
            }
          });

          // Timeout de seguridad para enviar comando si no llega prompt inicial
          setTimeout(() => {
            if (!commandSent) sendCommand();
          }, 1000);

          stream.stderr.on('data', (d: Buffer) => {
            output += d.toString('utf8');
          });

          stream.on('close', () => {
            finish();
          });
        });
      });

      conn.on('error', (err) => {
        cleanup();
        reject(err);
      });

      timer = setTimeout(() => {
        cleanup();
        if (output.trim()) {
          resolve(output);
        } else {
          reject(new Error(`Timeout SSH (${timeoutMs}ms) conectando a OLT ${this.config.ip}`));
        }
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
   * Prueba de conexión en tiempo real: valida credenciales y mide latencia de consola CLI
   */
  public async testConnection(): Promise<{ online: boolean; latencyMs: number; rawInfo?: string; error?: string }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const conn = new Client();
      let timer: NodeJS.Timeout;

      const finish = (online: boolean, error?: string, rawInfo?: string) => {
        clearTimeout(timer);
        try { conn.end(); } catch {}
        const latencyMs = Math.max(Date.now() - start, 1);
        resolve({ online, latencyMs: online ? latencyMs : 0, error, rawInfo });
      };

      timer = setTimeout(() => {
        finish(false, 'Timeout esperando respuesta CLI de la OLT');
      }, 5000);

      conn.on('ready', () => {
        // En TP-Link DeltaStream si el evento 'ready' dispara, las credenciales son 100% válidas
        // Abrimos shell para obtener el prompt de bienvenida
        conn.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
          if (err) {
            // Aún si el shell fallara, las credenciales SSH fueron válidas
            return finish(true, undefined, 'SSH Autenticado');
          }

          let banner = '';
          stream.on('data', (d: Buffer) => {
            banner += d.toString('utf8');
            // En cuanto la OLT envíe cualquier texto o prompt (ej. TP-LINK, >, #) damos por exitoso
            if (banner.length > 2 || /[>#$]/.test(banner)) {
              try { stream.end(); } catch {}
              finish(true, undefined, banner.trim());
            }
          });

          // Enviar un Enter para despertar el prompt de inmediato
          stream.write('\n');

          setTimeout(() => {
            finish(true, undefined, banner.trim() || 'TP-Link DeltaStream CLI Ready');
          }, 1500);
        });
      });

      conn.on('error', (err: any) => {
        const msg = err.message || String(err);
        if (/authentication/i.test(msg)) {
          finish(false, 'Usuario o contraseña incorrectos en la OLT');
        } else {
          finish(false, msg);
        }
      });

      conn.connect({
        host: this.config.ip,
        port: this.config.port || 22,
        username: this.config.username,
        password: this.config.password || '',
        readyTimeout: 4500,
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
   * Consulta todas las ONTs ya configuradas y autorizadas en la OLT con sus potencias ópticas y nombres de cliente
   */
  public async getConfiguredOnts(gponPort: string = '1/0/1'): Promise<ConfiguredOnt[]> {
    try {
      // 1. Obtener potencias ópticas y estado online/offline
      const optOutput = await this.executeCommand(`enable\nterminal length 0\nshow ont optical-info gpon ${gponPort}\n`, 6000);
      // 2. Obtener nombres de clientes desde la configuración activa usando filtro rápido
      const cfgOutput = await this.executeCommand(`enable\nterminal length 0\nshow running-config | include ont\n`, 6000)
        .catch(() => '');

      return this.parseConfiguredOnts(optOutput, cfgOutput, gponPort);
    } catch (err) {
      console.error(`[OLT ${this.config.name}] Error leyendo ONTs configuradas:`, err);
      return [];
    }
  }

  /**
   * Parseador de ONTs autorizadas con cruce de descripciones y mediciones ópticas
   */
  public parseConfiguredOnts(optOutput: string, cfgOutput: string, gponPort: string): ConfiguredOnt[] {
    const descMap = new Map<number, string>();
    // ont add 1 sn-auth HWTC-685E10B6 desc "GustavoAdolfo" ...
    const cfgLines = cfgOutput.split('\n');
    for (const line of cfgLines) {
      const m = line.match(/ont\s+add\s+(\d+)\s+sn-auth\s+([A-Za-z0-9_-]+)/);
      if (m) {
        const onuId = parseInt(m[1], 10);
        const descMatch = line.match(/desc\s+"([^"]+)"/);
        if (descMatch) {
          descMap.set(onuId, descMatch[1]);
        }
      }
    }

    const onts: ConfiguredOnt[] = [];
    const lines = optOutput.split('\n');
    for (const line of lines) {
      // 1    1/0/1  0   HWTC-6841F9B6 online    active    -23.98   2.29     -25.53   3340.00   13.00  50.00
      const match = line.match(/^\s*\d+\s+([\d/]+)\s+(\d+)\s+([A-Za-z0-9_-]+)\s+(\w+)\s+\w+\s+([\d.-]+|-)\s+([\d.-]+|-)/);
      if (match) {
        const port = match[1];
        const onuId = parseInt(match[2], 10);
        const sn = match[3];
        const status = match[4].toLowerCase() === 'online' ? 'online' : 'offline';
        const rx = match[5];
        const tx = match[6];
        const name = descMap.get(onuId) || `Cliente ONU #${onuId}`;

        onts.push({
          onuId,
          sn,
          gponPort: port || gponPort,
          name,
          status,
          rxPower: rx !== '-' ? `${rx} dBm` : 'N/A',
          txPower: tx !== '-' ? `${tx} dBm` : 'N/A',
          vlan: this.config.default_vlan || 400,
          profile: 'LINE_VLAN400'
        });
      }
    }

    return onts;
  }

  /**
   * Reiniciar remotamente una ONT por software desde la OLT
   */
  public async rebootOnt(gponPort: string = '1/0/1', onuId: number): Promise<{ success: boolean; message: string }> {
    try {
      const output = await this.executeCommand(`enable\nterminal length 0\nont reset gpon ${gponPort} ${onuId}\n`, 5000);
      return { success: true, message: output };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
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
