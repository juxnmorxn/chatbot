import http from 'http';

async function createStaticWanExact() {
  const ontIp = '192.168.18.1';
  const ip = '172.19.61.8';
  const mask = '255.255.255.0';
  const gateway = '172.19.61.1';
  const dns = '8.8.8.8,8.8.4.4';
  const vlan = 300;

  console.log(`[Huawei] Obteniendo token...`);
  const token = await new Promise((resolve) => {
    http.get(`http://${ontIp}/asp/GetRandCount.asp`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d.replace(/^\ufeff/, '').trim()));
    });
  });

  const loginPost = new URLSearchParams({
    UserName: 'Epadmin',
    PassWord: Buffer.from('adminEp').toString('base64'),
    Language: 'english',
    'x.X_HW_Token': token
  }).toString();

  const cookie = await new Promise((resolve) => {
    const req = http.request({
      hostname: ontIp,
      port: 80,
      path: '/login.cgi',
      method: 'POST',
      headers: {
        'Cookie': 'Cookie=body:Language:english:id=-1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPost),
        'Referer': `http://${ontIp}/`
      }
    }, (res) => {
      const sc = res.headers['set-cookie'];
      const raw = Array.isArray(sc) ? sc[0] : sc;
      const m = raw.match(/Cookie=([^;]+)/);
      resolve('Cookie=' + m[1]);
    });
    req.write(loginPost);
    req.end();
  });

  console.log(`[Huawei] Login exitoso: ${cookie}`);

  const wanHtml = await new Promise((resolve) => {
    http.get(`http://${ontIp}/html/bbsp/wan/wan.asp`, {
      headers: { 'Cookie': cookie, 'Referer': `http://${ontIp}/` }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
  });

  const onttokenMatch = wanHtml.match(/id="hwonttoken"\s+value="([^"]+)"/);
  const onttoken = onttokenMatch ? onttokenMatch[1] : '';
  console.log(`[Huawei] onttoken: ${onttoken}`);

  // Query string exacta que construye OnAddApply para nueva WAN IP
  const urlPath = '/addcfg.cgi?GROUP_a_x=InternetGatewayDevice.WANDevice.1.WANConnectionDevice&GROUP_a_y=GROUP_a_x.WANIPConnection&RequestFile=html/bbsp/wan/confirmwancfginfo.html';

  const params = new URLSearchParams();

  // 1. Campos que vienen del formulario base (y.X / d.X)
  params.append('y.Enable', '1');
  params.append('d.RadioWanPSEnable', '0');
  params.append('d.AccessType', 'Ethernet');
  params.append('d.ProtocolType', 'IPv4');
  params.append('d.Mode', 'IP_Routed');
  params.append('d.ServiceList', 'INTERNET');
  params.append('d.EnableVlan', '1');
  params.append('d.VlanId', String(vlan));
  params.append('d.PriorityPolicy', 'Specified');
  params.append('d.DefaultPriority', '0');
  params.append('d.Priority', '0');
  params.append('d.IPv4MXU', '1500');
  params.append('d.IPv4NATEnable', '1');
  params.append('d.NatType', '1');
  params.append('d.IPv4IPAddress', ip);
  params.append('d.IPv4SubnetMask', mask);
  params.append('d.IPv4Gateway', gateway);
  params.append('d.IPv4DNSOverrideSwitch', '1');
  params.append('d.IPv4PrimaryDNS', '8.8.8.8');
  params.append('d.IPv4SecondaryDNS', '8.8.4.4');
  params.append('d.IPv4EnableMulticast', '0');
  params.append('d.IPv4AddressMode', 'Static');

  // 2. Parámetros nodePrefix ('GROUP_a_y.') agregados por SpecWanCfgParaList
  params.append('GROUP_a_y.Enable', '1');
  params.append('GROUP_a_y.X_HW_IPv4Enable', '1');
  params.append('GROUP_a_y.X_HW_IPv6Enable', '0');
  params.append('GROUP_a_y.X_HW_IPv6MultiCastVLAN', '-1');
  params.append('GROUP_a_y.X_HW_SERVICELIST', 'INTERNET');
  params.append('GROUP_a_y.X_HW_ExServiceList', 'INTERNET');
  params.append('GROUP_a_y.X_HW_VLAN', String(vlan));
  params.append('GROUP_a_y.X_HW_PRI', '0');
  params.append('GROUP_a_y.X_HW_PriPolicy', 'Specified');
  params.append('GROUP_a_y.X_HW_DefaultPri', '0');
  params.append('GROUP_a_y.ConnectionType', 'IP_Routed');
  params.append('GROUP_a_y.X_HW_LanDhcpEnable', '1');
  params.append('GROUP_a_y.X_HW_MultiCastVLAN', '4294967295');
  params.append('GROUP_a_y.NATEnabled', '1');
  params.append('GROUP_a_y.X_HW_NatType', '1');
  params.append('GROUP_a_y.AddressingType', 'Static');
  params.append('GROUP_a_y.ExternalIPAddress', ip);
  params.append('GROUP_a_y.SubnetMask', mask);
  params.append('GROUP_a_y.DefaultGateway', gateway);
  params.append('GROUP_a_y.DNSEnabled', '1');
  params.append('GROUP_a_y.DNSOverrideAllowed', '1');
  params.append('GROUP_a_y.DNSServers', dns);
  params.append('GROUP_a_y.MaxMTUSize', '1500');
  params.append('GROUP_a_y.X_HW_BindPhyPortInfo', 'Lan1,Lan2,Lan3,Lan4,SSID1');

  // 3. Token CSRF de sesión
  params.append('x.X_HW_Token', onttoken);

  const payload = params.toString();
  console.log(`[Huawei] Enviando petición a ${urlPath} (${payload.length} bytes)...`);

  const req = http.request({
    hostname: ontIp,
    port: 80,
    path: urlPath,
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
      'Referer': `http://${ontIp}/html/bbsp/wan/wan.asp`
    }
  }, (res) => {
    console.log(`[Huawei] addcfg Respuesta: Status = ${res.statusCode}`);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`[Huawei] Body recibido:`, body.slice(0, 300));
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error(`[Huawei] Error en petición:`, err);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

createStaticWanExact();
