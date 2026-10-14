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
  rxOltPower?: string;
  voltage?: string;
  biasCurrent?: string;
  temperature?: string;
  vendor?: string;
  model?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  vlan: number;
  profile: string;
  mac?: string;
}

export class TpLinkDeltaStreamDriver {
  private config: OltDevice;
  private static ontsCache = new Map<string, { timestamp: number; onts: ConfiguredOnt[] }>();
  private static ontsQueryPromise = new Map<string, Promise<ConfiguredOnt[]>>();

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
          let allLinesSent = false;
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
              const lines = command.trim().split('\n').map(l => l.trim()).filter(Boolean);
              let delay = 250;
              stream.write('\r\n');
              for (let i = 0; i < lines.length; i++) {
                const cmdLine = lines[i];
                setTimeout(() => {
                  try { stream.write(cmdLine + '\r\n'); } catch {}
                  if (i === lines.length - 1) {
                    allLinesSent = true;
                  }
                }, delay);
                delay += 550;
              }
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
            } else if (allLinesSent) {
              clearTimeout(idleTimer);
              if (/[>#$]\s*$/.test(output.trim())) {
                idleTimer = setTimeout(finish, 600);
              } else {
                idleTimer = setTimeout(finish, 1200);
              }
            }
          });

          // Timeout de seguridad para enviar comando si no llega prompt inicial
          setTimeout(() => {
            if (!commandSent) sendCommand();
          }, 1200);

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
    const cacheKey = `${this.config.id || this.config.ip}_${gponPort}`;
    const cached = TpLinkDeltaStreamDriver.ontsCache.get(cacheKey);
    const now = Date.now();

    // 1. Si tenemos cache fresco (< 45 segundos), responder de inmediato en 0ms
    if (cached && (now - cached.timestamp < 45000)) {
      return cached.onts;
    }

    // 2. Si ya hay una consulta en curso a la OLT, esperar esa misma promesa (evita colisiones SSH concurrentes)
    if (TpLinkDeltaStreamDriver.ontsQueryPromise.has(cacheKey)) {
      return TpLinkDeltaStreamDriver.ontsQueryPromise.get(cacheKey)!;
    }

    const queryPromise = (async () => {
      try {
        // 3. Ejecutar lectura óptica, versiones/modelos, tabla MAC de hardware y configuración en UNA SOLA sesión interactiva SSH
        const combinedOutput = await this.executeCommand(
          `enable\nterminal length 0\nshow ont optical-info gpon ${gponPort}\nshow ont version gpon ${gponPort}\nshow mac address-table\nshow running-config | include ont\n`,
          12000
        );

        // Separar secciones para evitar solapamiento de líneas
        const opticalPart = combinedOutput.split(/show ont optical-info/i)[1]?.split(/show ont version/i)[0] || combinedOutput;
        const versionPart = combinedOutput.split(/show ont version/i)[1]?.split(/show mac address-table/i)[0] || combinedOutput;
        const macPart = combinedOutput.split(/show mac address-table/i)[1]?.split(/show running-config/i)[0] || '';
        const configPart = combinedOutput.split(/show running-config/i)[1] || combinedOutput;

        const onts = this.parseConfiguredOnts(opticalPart, configPart, gponPort, versionPart, macPart);
        if (onts && onts.length > 0) {
          TpLinkDeltaStreamDriver.ontsCache.set(cacheKey, { timestamp: Date.now(), onts });
          return onts;
        } else if (cached && cached.onts.length > 0) {
          // Si la OLT respondió vacío temporalmente por retardo de CLI, preservar cache previo
          return cached.onts;
        }
        return onts;
      } catch (err) {
        console.error(`[OLT ${this.config.name}] Error leyendo ONTs configuradas:`, err);
        // Si falló el SSH pero tenemos cache previo, nunca dejar la tabla vacía
        if (cached && cached.onts.length > 0) {
          return cached.onts;
        }
        return [];
      } finally {
        TpLinkDeltaStreamDriver.ontsQueryPromise.delete(cacheKey);
      }
    })();

    TpLinkDeltaStreamDriver.ontsQueryPromise.set(cacheKey, queryPromise);
    return queryPromise;
  }

  /**
   * Parseador de ONTs autorizadas con cruce de descripciones, versiones de hardware y mediciones ópticas
   */
  public parseConfiguredOnts(optOutput: string, cfgOutput: string, gponPort: string, verOutput?: string, macOutput?: string): ConfiguredOnt[] {
    const descMap = new Map<number, string>();
    // ont add 1 sn-auth HWTC-685E10B6 desc "GustavoAdolfo" ...
    const cfgLines = cfgOutput.split('\n');
    for (const line of cfgLines) {
      const m = line.match(/ont\s+add\s+(\d+)\s+sn-auth\s+([A-Za-z0-9_-]+)/);
      if (m) {
        const onuId = parseInt(m[1], 10);
        const descMatch = line.match(/desc\s+"([^"]+)"/);
        if (descMatch) {
          descMap.set(onuId, descMatch[1].trim());
        }
      }
    }

    // Parsear modelos y versiones de show ont version gpon 1/0/1
    const versionMap = new Map<number, { vendor: string; model: string; hw: string; sw: string }>();
    const verLines = (verOutput || cfgOutput).split('\n');
    for (const line of verLines) {
      // 1    1/0/1  2   HWTC-685311B6 online  active   HWTC   EG8041V5             799     31FD.A         AC)V5R021C00S230     V5R021C00S230
      const vm = line.match(/^\s*\d+\s+[\d/]+\s+(\d+)\s+[A-Za-z0-9_-]+\s+\w+\s+\w+\s+([A-Za-z0-9_-]+)\s+([A-Za-z0-9_-]+)\s+\d+\s+([A-Za-z0-9._-]+)\s+.*?\s*([A-Za-z0-9._()\-]+)/);
      if (vm) {
        const id = parseInt(vm[1], 10);
        const equip = vm[3];
        versionMap.set(id, {
          vendor: vm[2] === 'HWTC' ? 'Huawei' : vm[2],
          model: equip && equip !== '-' ? `Huawei ${equip}` : 'Huawei GPON ONT',
          hw: vm[4] !== '-' ? vm[4] : 'N/A',
          sw: vm[5] ? vm[5].replace('AC)', '').trim() : 'N/A'
        });
      }
    }

    // Parsear tabla MAC de hardware real directamente de los frames del módem
    const macMap = new Map<number, string>();
    if (macOutput) {
      const macLines = macOutput.split('\n');
      for (const line of macLines) {
        // 90:5e:44:16:0e:fa  400           GPON1/0/1     0     1     dynamic         aging
        const mm = line.match(/^\s*([0-9a-fA-F:]{17})\s+\d+\s+GPON[\d/]+\s+(\d+)/);
        if (mm) {
          macMap.set(parseInt(mm[2], 10), mm[1].toUpperCase());
        }
      }
    }

    const onts: ConfiguredOnt[] = [];
    const seenOnuIds = new Set<number>();
    const lines = optOutput.split('\n');
    for (const line of lines) {
      // 1    1/0/1  0   HWTC-6841F9B6 online    active    -23.98   2.29     -25.53   3340.00   13.00  50.00
      const match = line.match(/^\s*\d+\s+([\d/]+)\s+(\d+)\s+([A-Za-z0-9_-]+)\s+(\w+)\s+\w+\s+([\d.-]+|-)\s+([\d.-]+|-)(?:\s+([\d.-]+|-)\s+([\d.-]+|-)\s+([\d.-]+|-)\s+([\d.-]+|-))?/);
      if (match) {
        const port = match[1];
        const onuId = parseInt(match[2], 10);
        const sn = match[3];

        // Deduplicación estricta para garantizar que ningún cliente salga doble
        if (seenOnuIds.has(onuId)) continue;
        seenOnuIds.add(onuId);

        const status = match[4].toLowerCase() === 'online' ? 'online' : 'offline';
        const rx = match[5];
        const tx = match[6];
        const rxOlt = match[7];
        const vcc = match[8];
        const bias = match[9];
        const temp = match[10];

        const ver = versionMap.get(onuId);
        // Respetar estrictamente la descripción de la OLT
        const oltDesc = descMap.get(onuId);
        const name = oltDesc || `ONT #${onuId}`;

        onts.push({
          onuId,
          sn,
          gponPort: port || gponPort,
          name,
          status,
          rxPower: rx && rx !== '-' ? `${rx} dBm` : 'N/A',
          txPower: tx && tx !== '-' ? `${tx} dBm` : 'N/A',
          rxOltPower: rxOlt && rxOlt !== '-' ? `${rxOlt} dBm` : undefined,
          voltage: vcc && vcc !== '-' ? `${(parseFloat(vcc) / 1000).toFixed(2)} V` : undefined,
          biasCurrent: bias && bias !== '-' ? `${bias} mA` : undefined,
          temperature: temp && temp !== '-' ? `${temp} °C` : undefined,
          vendor: ver?.vendor || 'Huawei',
          model: ver?.model || 'Huawei EG8041V5',
          hardwareVersion: ver?.hw,
          softwareVersion: ver?.sw,
          vlan: this.config.default_vlan || 400,
          profile: 'LINE_VLAN400',
          mac: macMap.get(onuId)
        });
      }
    }

    return onts;
  }

  /**
   * Modifica la descripción / nombre de cliente de la ONT en la OLT TP-Link
   */
  public async setOntDescription(gponPort: string, onuId: number, desc: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanDesc = desc.replace(/["\r\n]/g, '').trim();
      await this.executeCommand(
        `enable\nconfig\ninterface gpon ${gponPort}\nont modify ${onuId} desc "${cleanDesc}"\nexit\nwrite\n`,
        6000
      );
      TpLinkDeltaStreamDriver.ontsCache.clear();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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

  /**
   * Configurar modo IP / WAN via OMCI (para OLTs que soportan ont ipconfig)
   */
  public async configureOntWanOmci(gponPort: string, onuId: number, params: { mode: string; ip?: string; mask?: string; gateway?: string; vlanId?: number }): Promise<{ success: boolean; log: string }> {
    let cmd = `configure\ninterface gpon ${gponPort}\n`;
    if (params.mode === 'Static' && params.ip && params.mask) {
      cmd += ` ont ipconfig ${onuId} static ip-address ${params.ip} mask ${params.mask} ${params.gateway ? `gateway ${params.gateway}` : ''}\n`;
    } else if (params.mode === 'DHCP') {
      cmd += ` ont ipconfig ${onuId} dhcp\n`;
    }
    cmd += `exit\nend\ncopy running-config startup-config\n`;
    try {
      const log = await this.executeCommand(cmd, 12000);
      return { success: true, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }

  /**
   * Habilitar o Deshabilitar ONT administrativamente en la OLT
   */
  public async setOntAdminState(gponPort: string, onuId: number, active: boolean): Promise<{ success: boolean; log: string }> {
    const action = active ? 'activate' : 'deactivate';
    const cmd = `configure\ninterface gpon ${gponPort}\n ont ${action} ${onuId}\nexit\nend\n`;
    try {
      const log = await this.executeCommand(cmd, 10000);
      return { success: true, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }

  /**
   * Restaurar ONT a valores de fábrica desde OLT
   */
  public async restoreOntFactory(gponPort: string, onuId: number): Promise<{ success: boolean; log: string }> {
    const cmd = `configure\ninterface gpon ${gponPort}\n ont reset ${onuId}\nexit\nend\n`;
    try {
      const log = await this.executeCommand(cmd, 10000);
      return { success: true, log };
    } catch (err: any) {
      return { success: false, log: err.message || String(err) };
    }
  }
}
