import http from 'http';

async function testSubmit() {
  const token = await new Promise((resolve) => {
    http.get('http://192.168.18.1/asp/GetRandCount.asp', (res) => {
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

  const cookie = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '192.168.18.1',
      port: 80,
      path: '/login.cgi',
      method: 'POST',
      headers: {
        'Cookie': 'Cookie=body:Language:english:id=-1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPost),
        'Referer': 'http://192.168.18.1/'
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

  console.log('Login OK, cookie:', cookie);

  // Request wan.asp to get fresh form onttoken
  const wanHtml = await new Promise((resolve) => {
    http.get('http://192.168.18.1/html/bbsp/wan/wan.asp', {
      headers: { 'Cookie': cookie, 'Referer': 'http://192.168.18.1/' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
  });

  const onttokenMatch = wanHtml.match(/name="onttoken"\s+id="hwonttoken"\s+value="([^"]+)"/) ||
                        wanHtml.match(/name="onttoken"[^>]+value="([^"]+)"/);
  const onttoken = onttokenMatch ? onttokenMatch[1] : '';
  console.log('Got form onttoken:', onttoken);

  // Send request using XMLHttpRequest-like standard params
  const targetUrl = '/addcfg.cgi?GROUP_a_x=InternetGatewayDevice.WANDevice.1.WANConnectionDevice&GROUP_a_y=GROUP_a_x.WANIPConnection&RequestFile=html/bbsp/wan/confirmwancfginfo.html';

  const params = new URLSearchParams();
  // Form fields mapped
  params.append('y.Enable', '1');
  params.append('GROUP_a_y.Enable', '1');
  params.append('GROUP_a_y.X_HW_IPv4Enable', '1');
  params.append('GROUP_a_y.X_HW_IPv6Enable', '0');
  params.append('GROUP_a_y.X_HW_IPv6MultiCastVLAN', '-1');
  params.append('GROUP_a_y.X_HW_SERVICELIST', 'INTERNET');
  params.append('GROUP_a_y.X_HW_ExServiceList', 'INTERNET');
  params.append('GROUP_a_y.X_HW_VLAN', '300');
  params.append('GROUP_a_y.X_HW_PRI', '0');
  params.append('GROUP_a_y.X_HW_PriPolicy', 'Specified');
  params.append('GROUP_a_y.X_HW_DefaultPri', '0');
  params.append('GROUP_a_y.ConnectionType', 'IP_Routed');
  params.append('GROUP_a_y.X_HW_LanDhcpEnable', '1');
  params.append('GROUP_a_y.NATEnabled', '1');
  params.append('GROUP_a_y.X_HW_NatType', '1');
  params.append('GROUP_a_y.AddressingType', 'Static');
  params.append('GROUP_a_y.ExternalIPAddress', '172.19.61.8');
  params.append('GROUP_a_y.SubnetMask', '255.255.255.0');
  params.append('GROUP_a_y.DefaultGateway', '172.19.61.1');
  params.append('GROUP_a_y.DNSEnabled', '1');
  params.append('GROUP_a_y.DNSOverrideAllowed', '1');
  params.append('GROUP_a_y.DNSServers', '8.8.8.8,8.8.4.4');
  params.append('GROUP_a_y.MaxMTUSize', '1500');
  params.append('GROUP_a_y.X_HW_BindPhyPortInfo', 'Lan1,Lan2,Lan3,Lan4,SSID1');
  params.append('x.X_HW_Token', onttoken);

  const payload = params.toString();
  console.log('Sending payload length:', payload.length);

  const req = http.request({
    hostname: '192.168.18.1',
    port: 80,
    path: targetUrl,
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
      'Referer': 'http://192.168.18.1/html/bbsp/wan/wan.asp'
    }
  }, (res) => {
    console.log('addcfg Response code:', res.statusCode);
    console.log('addcfg Headers:', res.headers);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('addcfg body preview:', body.slice(0, 300));
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

testSubmit();
