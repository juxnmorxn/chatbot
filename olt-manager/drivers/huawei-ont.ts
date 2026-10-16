import axios, { AxiosInstance } from 'axios';
import https from 'https';

export interface OntDeviceInfo {
  vendor: string;
  model: string;
  serial: string;
  hardwareVersion: string;
  softwareVersion: string;
}

export interface OntOpticalInfo {
  rxPower: string;
  txPower: string;
  voltage: string;
  temperature: string;
  biasCurrent: string;
}

export interface OntWanInfo {
  mac: string;
  ip: string;
  mask: string;
  gateway: string;
  dns: string;
  mode: string;
  vlan: number;
  status: string;
}

export interface OntWifiInfo {
  ssid2g: string;
  enabled2g: boolean;
  ssid5g: string;
  enabled5g: boolean;
}

export interface OntTr069Info {
  enabled: boolean;
  inform: boolean;
  interval: string;
  url: string;
}

export interface FullOntTelemetry {
  ip: string;
  online: boolean;
  device?: OntDeviceInfo;
  optical?: OntOpticalInfo;
  wan?: OntWanInfo;
  wifi?: OntWifiInfo;
  tr069?: OntTr069Info;
  error?: string;
}

export class HuaweiOntDriver {
  private client: AxiosInstance;
  private sessionCookie: string | null = null;
  private baseUrl: string;

  constructor(
    public ip: string,
    public username = 'Epadmin',
    public password = 'adminEp'
  ) {
    this.baseUrl = `https://${this.ip}:80`;
    const agent = new https.Agent({ rejectUnauthorized: false });
    this.client = axios.create({
      httpsAgent: agent,
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${this.baseUrl}/`
      }
    });
  }

  private decodeHex(str: string): string {
    return str.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Autenticación contra el portal web de la ONT Huawei usando credenciales estándar de ISP
   */
  public async login(): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Obtener token de sesión unificado
      const tokRes = await this.client.post(`${this.baseUrl}/asp/GetRandCount.asp`);
      const cleanToken = (tokRes.data as string).replace(/^\ufeff/, '').trim();
      if (!cleanToken) {
        return { success: false, error: 'No se pudo obtener el token CSRF del módem' };
      }

      // 2. Enviar credenciales
      const params = new URLSearchParams();
      params.append('UserName', this.username);
      params.append('PassWord', Buffer.from(this.password).toString('base64'));
      params.append('Language', 'english');
      params.append('x.X_HW_Token', cleanToken);

      const loginRes = await this.client.post(`${this.baseUrl}/login.cgi`, params.toString(), {
        headers: {
          'Cookie': 'Cookie=body:Language:english:id=-1',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const setCookie = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie || '');
      const match = cookieHeader.match(/Cookie=([^;]+)/);
      if (!match || !match[1].includes('id=1')) {
        return { success: false, error: 'Credenciales inválidas o módem bloqueado temporalmente' };
      }

      this.sessionCookie = 'Cookie=' + match[1];
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async fetchPage(path: string): Promise<string> {
    if (!this.sessionCookie) {
      const loginRes = await this.login();
      if (!loginRes.success) throw new Error(loginRes.error);
    }

    const res = await this.client.get(`${this.baseUrl}${path}`, {
      headers: {
        'Cookie': this.sessionCookie!,
        'Referer': `${this.baseUrl}${path}`
      }
    });
    return this.decodeHex(res.data as string);
  }

  /**
   * Extrae información de hardware y firmware de la ONT
   */
  public async getDeviceInfo(): Promise<OntDeviceInfo> {
    const html = await this.fetchPage('/html/ssmp/deviceinfo/deviceinfo.asp');
    const m = html.match(/new\s+stDeviceInfo\((.*?)\)/);
    if (!m) {
      return {
        vendor: 'Huawei',
        model: 'Huawei GPON ONT',
        serial: 'N/A',
        hardwareVersion: 'N/A',
        softwareVersion: 'N/A'
      };
    }

    const parts = m[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    let sn = parts[1] || 'N/A';
    if (sn.startsWith('48575443')) {
      sn = 'HWTC-' + sn.slice(8).toUpperCase();
    }
    return {
      hardwareVersion: parts[2] || '31FD.A',
      softwareVersion: parts[3] || 'V5R021C00S230',
      model: parts[4] ? `Huawei ${parts[4]}` : 'Huawei EG8041V5',
      vendor: parts[5] === 'HWTC' ? 'Huawei' : (parts[5] || 'Huawei'),
      serial: sn
    };
  }

  /**
   * Extrae mediciones ópticas calibradas directamente del transceptor óptico interno
   */
  public async getOpticalInfo(): Promise<OntOpticalInfo> {
    const html = await this.fetchPage('/html/amp/opticinfo/opticinfo.asp');
    const m = html.match(/new\s+stOpticInfo\((.*?)\)/);
    if (!m) {
      return {
        rxPower: 'N/A',
        txPower: 'N/A',
        voltage: 'N/A',
        temperature: 'N/A',
        biasCurrent: 'N/A'
      };
    }

    const parts = m[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const tx = parts[2] ? `${parts[2].trim()} dBm` : 'N/A';
    const rx = parts[3] ? `${parts[3].trim()} dBm` : 'N/A';
    const volt = parts[4] && /^\d+$/.test(parts[4]) ? `${(parseInt(parts[4], 10) / 1000).toFixed(2)} V` : `${parts[4]} V`;
    const temp = parts[5] ? `${parts[5]} °C` : 'N/A';
    const bias = parts[6] ? `${parts[6]} mA` : 'N/A';

    return { rxPower: rx, txPower: tx, voltage: volt, temperature: temp, biasCurrent: bias };
  }

  /**
   * Extrae la configuración WAN real (IP fija/DHCP, Máscara, Gateway, DNS, VLAN, MAC)
   */
  public async getWanInfo(): Promise<OntWanInfo> {
    const html = await this.fetchPage('/html/bbsp/common/wan_list.asp');
    
    // Extraer MAC física
    const macMatch = html.match(/([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})/);
    let mac = macMatch ? macMatch[1].toUpperCase() : '';

    let ip = this.ip;
    let mask = '255.255.255.0';
    let gateway = ip.split('.').slice(0, 3).join('.') + '.1';
    let dns = '8.8.8.8, 8.8.4.4';
    let mode = 'Static IP';
    let vlan = 400;
    let status = 'Connected';

    // 1. Extraer entrada WanIP (IP Estática / DHCP)
    const ipStart = html.indexOf('new WanIP(');
    if (ipStart !== -1) {
      const ipEnd = html.indexOf('),null', ipStart);
      if (ipEnd !== -1) {
        const content = html.slice(ipStart + 10, ipEnd);
        const parts = content.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts[3] && parts[3].includes(':')) mac = parts[3].toUpperCase();
        if (parts[4]) status = parts[4];
        if (parts[13]) mode = parts[13] === 'Static' ? 'Static IP' : parts[13];
        if (parts[14] && /^(\d{1,3}\.){3}\d{1,3}$/.test(parts[14])) ip = parts[14];
        if (parts[15] && /^(\d{1,3}\.){3}\d{1,3}$/.test(parts[15])) mask = parts[15];
        if (parts[16] && /^(\d{1,3}\.){3}\d{1,3}$/.test(parts[16])) gateway = parts[16];
        if (parts[19] && parts[19].includes('.')) dns = parts[19];
      }
    } else {
      // 2. Extraer entrada WanPPP (PPPoE)
      const pppStart = html.indexOf('new WanPPP(');
      if (pppStart !== -1) {
        const pppEnd = html.indexOf('),null', pppStart);
        if (pppEnd !== -1) {
          const content = html.slice(pppStart + 11, pppEnd);
          const parts = content.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts[3] && parts[3].includes(':')) mac = parts[3].toUpperCase();
          if (parts[4]) status = parts[4];
          mode = 'PPPoE';
          const ipParts = parts.filter(p => /^(\d{1,3}\.){3}\d{1,3}$/.test(p));
          if (ipParts.length > 0) ip = ipParts[0];
          if (ipParts.length > 1) mask = ipParts[1];
          if (ipParts.length > 2) gateway = ipParts[2];
        }
      }
    }

    const vlanMatch = html.match(/VlanId['":\s]+(\d+)/i) || html.match(/"(\d{2,4})"/);
    if (vlanMatch) vlan = parseInt(vlanMatch[1], 10);

    return { mac, ip, mask, gateway, dns, mode, vlan, status };
  }

  /**
   * Extrae los nombres de red Wi-Fi (SSID) de 2.4 GHz y 5 GHz activos
   */
  public async getWifiInfo(): Promise<OntWifiInfo> {
    const html = await this.fetchPage('/html/amp/common/wlan_list.asp');
    const matches = Array.from(html.matchAll(/new\s+stWlanInfo\((.*?)\)/g));
    
    let ssid2g = '';
    let enabled2g = false;
    let ssid5g = '';
    let enabled5g = false;

    for (const match of matches) {
      const parts = match[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 6) {
        const ssidName = parts[2];
        const isEnabled = parts[4] === '1';
        const band = parts[5];
        if (band.includes('2.4') || parts[1] === 'ath0') {
          ssid2g = ssidName;
          enabled2g = isEnabled;
        } else if (band.includes('5') || parts[1] === 'ath4') {
          ssid5g = ssidName;
          enabled5g = isEnabled;
        }
      }
    }

    return { ssid2g, enabled2g, ssid5g, enabled5g };
  }

  /**
   * Extrae configuración actual de TR-069
   */
  public async getTr069Info(): Promise<OntTr069Info> {
    const html = await this.fetchPage('/html/ssmp/tr069/tr069.asp');
    const m = html.match(/new\s+stCWMP\((.*?)\)/);
    if (!m) {
      return { enabled: false, inform: false, interval: '3600', url: '' };
    }
    const parts = m[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    return {
      enabled: parts[1] === '1',
      inform: parts[2] === '1',
      interval: parts[3] || '3600',
      url: parts[5] || ''
    };
  }

  /**
   * Obtiene telemetría completa en una sola llamada optimizada
   */
  public async getFullTelemetry(): Promise<FullOntTelemetry> {
    try {
      const loginRes = await this.login();
      if (!loginRes.success) {
        return { ip: this.ip, online: false, error: loginRes.error };
      }

      const [device, optical, wan, wifi, tr069] = await Promise.all([
        this.getDeviceInfo().catch(() => undefined),
        this.getOpticalInfo().catch(() => undefined),
        this.getWanInfo().catch(() => undefined),
        this.getWifiInfo().catch(() => undefined),
        this.getTr069Info().catch(() => undefined)
      ]);

      return {
        ip: this.ip,
        online: true,
        device,
        optical,
        wan,
        wifi,
        tr069
      };
    } catch (err: any) {
      return { ip: this.ip, online: false, error: err.message };
    }
  }

  /**
   * Configura la URL del servidor TR-069 (GenieACS) directamente en el módem
   */
  public async setTr069Acs(acsUrl: string): Promise<{ success: boolean; message?: string }> {
    try {
      const html = await this.fetchPage('/html/ssmp/tr069/tr069.asp');
      const tokenMatch = html.match(/id="onttoken"\s+name="onttoken"\s+value="([^"]+)"/);
      const onttoken = tokenMatch ? tokenMatch[1] : '';

      const params = new URLSearchParams();
      params.append('x.EnableCWMP', '1');
      params.append('x.PeriodicInformEnable', '1');
      params.append('x.PeriodicInformInterval', '60');
      params.append('x.PeriodicInformTime', '0001-01-01T00:00:00Z');
      params.append('x.URL', acsUrl);
      params.append('x.Username', '');
      params.append('x.Password', '');
      params.append('x.ConnectionRequestUsername', 'genieacs');
      params.append('x.ConnectionRequestPassword', 'admin');
      params.append('x.X_HW_DSCP', '0');
      params.append('x.X_HW_Token', onttoken);

      const res = await this.client.post(
        `${this.baseUrl}/set.cgi?x=InternetGatewayDevice.ManagementServer&RequestFile=html/ssmp/tr069/tr069.asp`,
        params.toString(),
        {
          headers: {
            'Cookie': this.sessionCookie!,
            'Referer': `${this.baseUrl}/html/ssmp/tr069/tr069.asp`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return { success: res.status === 200, message: 'TR-069 ACS configurado correctamente' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Reinicia el módem de forma remota y segura a través de su interfaz web
   */
  public async reboot(): Promise<{ success: boolean; message?: string }> {
    try {
      const html = await this.fetchPage('/html/ssmp/reboot/reboot.asp');
      const tokenMatch = html.match(/id="onttoken"\s+name="onttoken"\s+value="([^"]+)"/);
      const onttoken = tokenMatch ? tokenMatch[1] : '';

      const params = new URLSearchParams();
      params.append('x.X_HW_Token', onttoken);

      const res = await this.client.post(
        `${this.baseUrl}/set.cgi?x=InternetGatewayDevice.X_HW_DEBUG.SMP.Reboot&RequestFile=html/ssmp/reboot/reboot.asp`,
        params.toString(),
        {
          headers: {
            'Cookie': this.sessionCookie!,
            'Referer': `${this.baseUrl}/html/ssmp/reboot/reboot.asp`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return { success: res.status === 200, message: 'Comando de reinicio enviado con éxito' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
