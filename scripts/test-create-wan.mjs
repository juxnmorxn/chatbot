import http from 'http';

async function createStaticWan(params) {
  const { ip, mask, gateway, dns, vlan, ontIp } = params;

  console.log(`[Huawei] Iniciando creación de WAN en ${ontIp} -> IP: ${ip}, VLAN: ${vlan}...`);

  // 1. Obtener Token CSRF
  const token = await new Promise((resolve, reject) => {
    http.get(`http://${ontIp}/asp/GetRandCount.asp`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d.replace(/^\ufeff/, '').trim()));
    }).on('error', reject);
  });

  console.log(`[Huawei] Token CSRF obtenido: ${token}`);

  // 2. Login
  const loginPost = new URLSearchParams({
    UserName: 'Epadmin',
    PassWord: Buffer.from('adminEp').toString('base64'),
    Language: 'english',
    'x.X_HW_Token': token
  }).toString();

  const cookie = await new Promise((resolve, reject) => {
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
      const m = raw ? raw.match(/Cookie=([^;]+)/) : null;
      if (!m || !m[1].includes('id=1')) {
        return reject(new Error('Login falló: cookie no contiene id=1'));
      }
      resolve('Cookie=' + m[1]);
    });
    req.on('error', reject);
    req.write(loginPost);
    req.end();
  });

  console.log(`[Huawei] Login exitoso con ${cookie}`);

  // 3. Obtener token del formulario de WAN (/html/bbsp/wan/wan.asp)
  const wanHtml = await new Promise((resolve, reject) => {
    http.get(`http://${ontIp}/html/bbsp/wan/wan.asp`, {
      headers: { 'Cookie': cookie, 'Referer': `http://${ontIp}/` }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  const onttokenMatch = wanHtml.match(/name="onttoken"\s+id="hwonttoken"\s+value="([^"]+)"/) ||
                        wanHtml.match(/name="onttoken"[^>]+value="([^"]+)"/) ||
                        wanHtml.match(/id="onttoken"[^>]+value="([^"]+)"/);
  const onttoken = onttokenMatch ? onttokenMatch[1] : token;
  console.log(`[Huawei] OntToken de WAN: ${onttoken}`);

  // 4. Parámetros para addcfg.cgi
  // Url query: addcfg.cgi?GROUP_a_x=InternetGatewayDevice.WANDevice.1.WANConnectionDevice&GROUP_a_y=GROUP_a_x.WANIPConnection&RequestFile=html/bbsp/wan/confirmwancfginfo.html
  const urlPath = '/addcfg.cgi?GROUP_a_x=InternetGatewayDevice.WANDevice.1.WANConnectionDevice&GROUP_a_y=GROUP_a_x.WANIPConnection&RequestFile=html/bbsp/wan/confirmwancfginfo.html';

  const bodyParams = new URLSearchParams();
  bodyParams.append('GROUP_a_y.Enable', '1');
  bodyParams.append('GROUP_a_y.X_HW_IPv4Enable', '1');
  bodyParams.append('GROUP_a_y.X_HW_IPv6Enable', '0');
  bodyParams.append('GROUP_a_y.X_HW_IPv6MultiCastVLAN', '-1');
  bodyParams.append('GROUP_a_y.X_HW_SERVICELIST', 'INTERNET');
  bodyParams.append('GROUP_a_y.X_HW_ExServiceList', 'INTERNET');
  bodyParams.append('GROUP_a_y.X_HW_VLAN', String(vlan));
  bodyParams.append('GROUP_a_y.X_HW_PRI', '0');
  bodyParams.append('GROUP_a_y.X_HW_PriPolicy', 'Specified');
  bodyParams.append('GROUP_a_y.X_HW_DefaultPri', '0');
  bodyParams.append('GROUP_a_y.ConnectionType', 'IP_Routed');
  bodyParams.append('GROUP_a_y.X_HW_LanDhcpEnable', '1');
  bodyParams.append('GROUP_a_y.NATEnabled', '1');
  bodyParams.append('GROUP_a_y.X_HW_NatType', '1');
  bodyParams.append('GROUP_a_y.AddressingType', 'Static');
  bodyParams.append('GROUP_a_y.ExternalIPAddress', ip);
  bodyParams.append('GROUP_a_y.SubnetMask', mask);
  bodyParams.append('GROUP_a_y.DefaultGateway', gateway);
  bodyParams.append('GROUP_a_y.DNSEnabled', '1');
  bodyParams.append('GROUP_a_y.DNSOverrideAllowed', '1');
  bodyParams.append('GROUP_a_y.DNSServers', dns);
  bodyParams.append('GROUP_a_y.MaxMTUSize', '1500');
  bodyParams.append('GROUP_a_y.X_HW_BindPhyPortInfo', 'Lan1,Lan2,Lan3,Lan4,SSID1');
  bodyParams.append('x.X_HW_Token', onttoken);

  const payload = bodyParams.toString();
  console.log(`[Huawei] Enviando petición a ${urlPath}...`);

  const addResult = await new Promise((resolve, reject) => {
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
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log(`[Huawei] Respuesta addcfg: status=${addResult.statusCode}`);
  return addResult;
}

createStaticWan({
  ontIp: '192.168.18.1',
  ip: '172.19.61.8',
  mask: '255.255.255.0',
  gateway: '172.19.61.1',
  dns: '8.8.8.8,8.8.4.4',
  vlan: 300
}).then(r => console.log('Resultado:', r.statusCode)).catch(err => console.error('Error:', err));
