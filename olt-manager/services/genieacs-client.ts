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
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType',
        'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
        'Device.WiFi.SSID.1.SSID',
        'Device.WiFi.AccessPoint.1.Security.KeyPassphrase'
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
  public async setWifi(deviceId: string, ssid: string, keyPassphrase: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parameterValues: [string, string, string][] = [
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', ssid, 'xsd:string'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase', keyPassphrase, 'xsd:string'],
        ['Device.WiFi.SSID.1.SSID', ssid, 'xsd:string'],
        ['Device.WiFi.AccessPoint.1.Security.KeyPassphrase', keyPassphrase, 'xsd:string']
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
        if (params.ip) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType', 'Static', 'xsd:string']);
        if (params.ip) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress', params.ip, 'xsd:string']);
        if (params.mask) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask', params.mask, 'xsd:string']);
        if (params.gateway) parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway', params.gateway, 'xsd:string']);
        if (params.dns1) {
          const dnsStr = params.dns2 ? `${params.dns1},${params.dns2}` : params.dns1;
          parameterValues.push(['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DNSServers', dnsStr, 'xsd:string']);
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
      wanMode: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.AddressingType') || 'DHCP',
      wanIp: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress'),
      wanMask: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.SubnetMask'),
      wanGateway: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.DefaultGateway'),
      ipv6Enabled: getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.X_HW_IPv6Enable') === '1'
    };
  }
}
