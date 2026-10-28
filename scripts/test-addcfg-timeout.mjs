import http from 'http';

async function testSubmitFormAction() {
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

  const cookie = await new Promise((resolve) => {
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

  const wanHtml = await new Promise((resolve) => {
    http.get('http://192.168.18.1/html/bbsp/wan/wan.asp', {
      headers: { 'Cookie': cookie, 'Referer': 'http://192.168.18.1/' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
  });

  const onttokenMatch = wanHtml.match(/id="hwonttoken"\s+value="([^"]+)"/);
  const onttoken = onttokenMatch ? onttokenMatch[1] : '';

  const params = new URLSearchParams();
  params.append('GROUP_a_y.Enable', '1');
  params.append('GROUP_a_y.X_HW_SERVICELIST', 'INTERNET');
  params.append('GROUP_a_y.X_HW_VLAN', '300');
  params.append('GROUP_a_y.ConnectionType', 'IP_Routed');
  params.append('GROUP_a_y.AddressingType', 'Static');
  params.append('GROUP_a_y.ExternalIPAddress', '172.19.61.8');
  params.append('GROUP_a_y.SubnetMask', '255.255.255.0');
  params.append('GROUP_a_y.DefaultGateway', '172.19.61.1');
  params.append('GROUP_a_y.DNSServers', '8.8.8.8,8.8.4.4');
  params.append('x.X_HW_Token', onttoken);

  const payload = params.toString();

  const req = http.request({
    hostname: '192.168.18.1',
    port: 80,
    path: '/addcfg.cgi?GROUP_a_x=InternetGatewayDevice.WANDevice.1.WANConnectionDevice&GROUP_a_y=GROUP_a_x.WANIPConnection&RequestFile=html/bbsp/wan/confirmwancfginfo.html',
    method: 'POST',
    timeout: 5000,
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
      'Referer': 'http://192.168.18.1/html/bbsp/wan/wan.asp'
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', () => {});
    res.on('end', () => console.log('Finished'));
  });

  req.on('timeout', () => {
    console.log('Request timeout after 5s');
    req.destroy();
  });
  req.on('error', (e) => console.log('Req error:', e.message));
  req.write(payload);
  req.end();
}
testSubmitFormAction();
