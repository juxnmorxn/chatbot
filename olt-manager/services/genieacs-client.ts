// ========================================================
// GenieACS TR-069 Client para CloudOLT
// Comunica CloudOLT con el servidor ACS CWMP (Puerto 7557)
// ========================================================

export interface AcsDevice {
  _id: string;
  serialNumber?: string;
  manufacturer?: string;
  modelName?: string;
  softwareVersion?: string;
  ip?: string;
  lastInform?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  wifi5gSsid?: string;
  wifi5gPassword?: string;
  wanMode?: 'DHCP' | 'Static' | 'PPPoE';
  wanIp?: string;
  wanGateway?: string;
  wanMask?: string;
  wanVlan?: number;
  ipv6Enabled?: boolean;
}

export class GenieAcsClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:7557') {
    this.baseUrl = baseUrl;
  }

  /**
   * Inicializar Script de Aprovisionamiento y Presets por defecto en GenieACS
   */
  public async initializeDefaultProvisions(): Promise<void> {
    try {
      const script = `
declare("InternetGatewayDevice.DeviceInfo.SerialNumber", {value: 1});
declare("InternetGatewayDevice.DeviceInfo.Manufacturer", {value: 1});
declare("InternetGatewayDevice.DeviceInfo.ModelName", {value: 1});
declare("InternetGatewayDevice.DeviceInfo.SoftwareVersion", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID", {value: 1});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase", {value: 1});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress", {value: 1});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask", {value: 1});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway", {value: 1});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType", {value: 1});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DNSServers", {value: 1});
declare("Device.WiFi.SSID.1.SSID", {value: 1});
declare("Device.WiFi.SSID.2.SSID", {value: 1});
declare("Device.WiFi.AccessPoint.1.Security.KeyPassphrase", {value: 1});
declare("Device.WiFi.AccessPoint.2.Security.KeyPassphrase", {value: 1});
declare("Device.IP.Interface.1.IPv4Address.1.IPAddress", {value: 1});
`;
      await fetch(`${this.baseUrl}/provisions/default_inform`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: script
      });

      const preset = {
        weight: 0,
        precondition: 'true',
        events: {
          '0 BOOTSTRAP': true,
          '1 BOOT': true,
          '2 PERIODIC': true
        },
        configurations: [
          {
            type: 'provision',
            name: 'default_inform'
          }
        ]
      };
      await fetch(`${this.baseUrl}/presets/default_inform_preset`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset)
      });
      console.log('[GenieACS] Presets y script de aprovisionamiento default_inform registrados');
    } catch (err: any) {
      console.warn('[GenieACS] Aviso al inicializar preset inform:', err.message);
    }
  }

  /**
   * Listar todos los dispositivos / ONTs reportados en GenieACS
   */
  public async getDevices(): Promise<AcsDevice[]> {
    try {
      const projection = [
        '_id',
        '_lastInform',
        'InternetGatewayDevice.DeviceInfo.SerialNumber',
        'InternetGatewayDevice.DeviceInfo.Manufacturer',
        'InternetGatewayDevice.DeviceInfo.ModelName',
        'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
        'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DNSServers',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
        'Device.WiFi.SSID.1.SSID',
        'Device.WiFi.SSID.2.SSID',
        'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
        'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
        'Device.IP.Interface.1.IPv4Address.1.IPAddress',
        'Device.IP.Interface.1.IPv4Address.1.SubnetMask'
      ].join(',');

      const url = `${this.baseUrl}/devices/?projection=${encodeURIComponent(projection)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return [];

      const rawList: any[] = await res.json();
      return rawList.map(item => this.mapRawDevice(item));
    } catch (err) {
      console.error('[GenieACS] Error al consultar dispositivos:', err);
      return [];
    }
  }

  /**
   * Buscar un dispositivo por número de serie (ej. HWTC685E10B6 o HWTC-685E10B6)
   */
  public async getDeviceBySerial(serial: string): Promise<AcsDevice | null> {
    try {
      const cleanSn = serial.replace(/[-_]/g, '');
      const query = JSON.stringify({
        $or: [
          { 'InternetGatewayDevice.DeviceInfo.SerialNumber._value': serial },
          { 'InternetGatewayDevice.DeviceInfo.SerialNumber._value': cleanSn },
          { '_id': { $regex: cleanSn, $options: 'i' } }
        ]
      });

      const url = `${this.baseUrl}/devices/?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const results: any[] = await res.json();
      if (results.length === 0) return null;
      return this.mapRawDevice(results[0]);
    } catch (err) {
      console.error(`[GenieACS] Error buscando serial ${serial}:`, err);
      return null;
    }
  }

  /**
   * Cambiar Nombre de Red (SSID) y Contraseña de Wi-Fi de forma remota
   */
  /**
   * Cambiar Nombre de Red (SSID) y Contraseña de Wi-Fi (2.4 GHz y 5 GHz) de forma remota
   */
  public async setWifi(
    deviceId: string,
    ssid: string,
    keyPassphrase: string,
    ssid5g?: string,
    keyPassphrase5g?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parameterValues: [string, string, string][] = [
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', ssid, 'xsd:string'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase', keyPassphrase, 'xsd:string'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase', keyPassphrase, 'xsd:string'],
        ['Device.WiFi.SSID.1.SSID', ssid, 'xsd:string'],
        ['Device.WiFi.AccessPoint.1.Security.KeyPassphrase', keyPassphrase, 'xsd:string']
      ];

      const pass5 = keyPassphrase5g || keyPassphrase;
      if (ssid5g) {
        parameterValues.push(
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID', ssid5g, 'xsd:string'],
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase', pass5, 'xsd:string'],
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase', pass5, 'xsd:string'],
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID', ssid5g, 'xsd:string'],
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase', pass5, 'xsd:string'],
          ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase', pass5, 'xsd:string'],
          ['Device.WiFi.SSID.2.SSID', ssid5g, 'xsd:string'],
          ['Device.WiFi.AccessPoint.2.Security.KeyPassphrase', pass5, 'xsd:string']
        );
      }

      return await this.createTask(deviceId, {
        name: 'setParameterValues',
        parameterValues
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Habilitar y reactivar SSIDs y radios Wi-Fi (2.4 GHz y 5 GHz) de forma remota por TR-069
   */
  public async enableWlan(deviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parameterValues: [string, string, string][] = [
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable', 'true', 'xsd:boolean'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.RadioEnabled', 'true', 'xsd:boolean'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable', 'true', 'xsd:boolean'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.RadioEnabled', 'true', 'xsd:boolean'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable', 'true', 'xsd:boolean'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.RadioEnabled', 'true', 'xsd:boolean'],
        ['Device.WiFi.Radio.1.Enable', 'true', 'xsd:boolean'],
        ['Device.WiFi.Radio.2.Enable', 'true', 'xsd:boolean'],
        ['Device.WiFi.SSID.1.Enable', 'true', 'xsd:boolean'],
        ['Device.WiFi.SSID.2.Enable', 'true', 'xsd:boolean'],
        ['Device.WiFi.AccessPoint.1.Enable', 'true', 'xsd:boolean'],
        ['Device.WiFi.AccessPoint.2.Enable', 'true', 'xsd:boolean']
      ];

      return await this.createTask(deviceId, {
        name: 'setParameterValues',
        parameterValues
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Configurar Modo WAN (IP Estática / DHCP / PPPoE / IPv6) en la ONT
   */
  public async setWanMode(
    deviceId: string,
    params: {
      mode: 'DHCP' | 'Static' | 'PPPoE';
      ip?: string;
      mask?: string;
      gateway?: string;
      dns1?: string;
      dns2?: string;
      pppoeUser?: string;
      pppoePass?: string;
      vlanId?: number;
      enableIpv6?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parameterValues: [string, string, string][] = [];

      if (params.mode === 'Static') {
        const dnsStr = params.dns1 ? (params.dns2 ? `${params.dns1},${params.dns2}` : params.dns1) : '8.8.8.8,8.8.4.4';
        if (params.ip) {
          // TR-098
          parameterValues.push(
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable', 'true', 'xsd:boolean'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType', 'Static', 'xsd:string'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ConnectionType', 'IP_Routed', 'xsd:string'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress', params.ip, 'xsd:string'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask', params.mask || '255.255.255.0', 'xsd:string'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway', params.gateway || '', 'xsd:string'],
            ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DNSServers', dnsStr, 'xsd:string']
          );
          // TR-181
          parameterValues.push(
            ['Device.IP.Interface.1.Enable', 'true', 'xsd:boolean'],
            ['Device.IP.Interface.1.IPv4Address.1.Enable', 'true', 'xsd:boolean'],
            ['Device.IP.Interface.1.IPv4Address.1.IPAddress', params.ip, 'xsd:string'],
            ['Device.IP.Interface.1.IPv4Address.1.SubnetMask', params.mask || '255.255.255.0', 'xsd:string'],
            ['Device.Routing.Router.1.IPv4Forwarding.1.GatewayIPAddress', params.gateway || '', 'xsd:string']
          );
        }
      } else if (params.mode === 'DHCP') {
        parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType', 'DHCP', 'xsd:string']);
      } else if (params.mode === 'PPPoE') {
        if (params.pppoeUser) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username', params.pppoeUser, 'xsd:string']);
        if (params.pppoePass) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password', params.pppoePass, 'xsd:string']);
      }

      if (params.enableIpv6) {
        parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_HW_IPv6Enable', '1', 'xsd:boolean']);
      }

      return await this.createTask(deviceId, {
        name: 'setParameterValues',
        parameterValues
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Pre-aprovisionar un dispositivo por Preset en GenieACS (se aplica automáticamente al arrancar)
   */
  public async createPresetForOnt(params: {
    serial: string;
    ip: string;
    mask?: string;
    gateway?: string;
    dns1?: string;
    dns2?: string;
    wifiSsid?: string;
    wifiPassword?: string;
    wifi5gSsid?: string;
    wifi5gPassword?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanSn = params.serial.replace(/[-_]/g, '');
      const dnsStr = params.dns1 ? (params.dns2 ? `${params.dns1},${params.dns2}` : params.dns1) : '8.8.8.8,8.8.4.4';
      const provName = `prov_${cleanSn}`;

      let script = `
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.Enable", {value: true});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType", {value: "Static"});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ConnectionType", {value: "IP_Routed"});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress", {value: "${params.ip}"});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask", {value: "${params.mask || '255.255.255.0'}"});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway", {value: "${params.gateway || ''}"});
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DNSServers", {value: "${dnsStr}"});
`;

      if (params.wifiSsid) {
        script += `
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", {value: "${params.wifiSsid}"});
declare("Device.WiFi.SSID.1.SSID", {value: "${params.wifiSsid}"});
`;
      }
      if (params.wifiPassword) {
        script += `
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase", {value: "${params.wifiPassword}"});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", {value: "${params.wifiPassword}"});
declare("Device.WiFi.AccessPoint.1.Security.KeyPassphrase", {value: "${params.wifiPassword}"});
`;
      }

      const ssid5 = params.wifi5gSsid;
      const pass5 = params.wifi5gPassword || params.wifiPassword;
      if (ssid5) {
        script += `
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID", {value: "${ssid5}"});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID", {value: "${ssid5}"});
declare("Device.WiFi.SSID.2.SSID", {value: "${ssid5}"});
`;
      }
      if (pass5 && (ssid5 || params.wifi5gPassword)) {
        script += `
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase", {value: "${pass5}"});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase", {value: "${pass5}"});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase", {value: "${pass5}"});
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase", {value: "${pass5}"});
declare("Device.WiFi.AccessPoint.2.Security.KeyPassphrase", {value: "${pass5}"});
`;
      }

      await fetch(`${this.baseUrl}/provisions/${encodeURIComponent(provName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: script
      });

      const preset = {
        weight: 10,
        precondition: `_id LIKE "%${cleanSn}%"`,
        events: {
          '0 BOOTSTRAP': true,
          '1 BOOT': true,
          '2 PERIODIC': true
        },
        configurations: [
          {
            type: 'provision',
            name: provName
          }
        ]
      };

      const presetRes = await fetch(`${this.baseUrl}/presets/${encodeURIComponent('PRESET_' + cleanSn)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset)
      });

      return { success: presetRes.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Cambiar contraseña de acceso web al módem
   */
  public async setWebPassword(deviceId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parameterValues: [string, string, string][] = [
        ['InternetGatewayDevice.UserInterface.Password', newPassword, 'xsd:string'],
        ['Device.Users.User.1.Password', newPassword, 'xsd:string']
      ];

      return await this.createTask(deviceId, {
        name: 'setParameterValues',
        parameterValues
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Reinicio remoto (TR-069 Reboot RPC)
   */
  public async reboot(deviceId: string): Promise<{ success: boolean; error?: string }> {
    return this.createTask(deviceId, { name: 'reboot' });
  }

  /**
   * Restaurar a valores de fábrica (Factory Reset RPC)
   */
  public async factoryReset(deviceId: string): Promise<{ success: boolean; error?: string }> {
    return this.createTask(deviceId, { name: 'factoryReset' });
  }

  /**
   * Enviar tarea a la cola de GenieACS con Connection Request inmediato
   */
  private async createTask(deviceId: string, task: object): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `GenieACS error HTTP ${res.status}: ${text}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Mapeo del objeto JSON devuelto por GenieACS a una interfaz tipada
   */
  private mapRawDevice(item: any): AcsDevice {
    const getVal = (path: string): any => {
      const parts = path.split('.');
      let curr = item;
      for (const p of parts) {
        if (!curr || typeof curr !== 'object') return undefined;
        curr = curr[p];
      }
      return curr && typeof curr === 'object' && '_value' in curr ? curr._value : curr;
    };

    return {
      _id: item._id,
      serialNumber: getVal('InternetGatewayDevice.DeviceInfo.SerialNumber') || item._id,
      manufacturer: getVal('InternetGatewayDevice.DeviceInfo.Manufacturer'),
      modelName: getVal('InternetGatewayDevice.DeviceInfo.ModelName'),
      softwareVersion: getVal('InternetGatewayDevice.DeviceInfo.SoftwareVersion'),
      lastInform: item._lastInform,
      wifiSsid: getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID') || getVal('Device.WiFi.SSID.1.SSID'),
      wifiPassword: getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase') || getVal('Device.WiFi.AccessPoint.1.Security.KeyPassphrase'),
      wifi5gSsid: getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID') || getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID') || getVal('Device.WiFi.SSID.2.SSID'),
      wifi5gPassword: getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.KeyPassphrase') || getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase') || getVal('Device.WiFi.AccessPoint.2.Security.KeyPassphrase'),
      wanMode: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType') || 'DHCP',
      wanIp: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress'),
      wanMask: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask'),
      wanGateway: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway'),
      ipv6Enabled: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_HW_IPv6Enable') === '1'
    };
  }
}
