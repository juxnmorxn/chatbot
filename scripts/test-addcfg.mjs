import http from 'http';

async function testAddCfgUrl() {
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

  const payload = 'x.X_HW_Token=' + onttoken;
  const req = http.request({
    hostname: '192.168.18.1',
    port: 80,
    path: '/addcfg.cgi?RequestFile=html/bbsp/wan/confirmwancfginfo.html',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(payload),
      'Referer': 'http://192.168.18.1/html/bbsp/wan/wan.asp'
    }
  }, (res) => {
    console.log('addcfg test status:', res.statusCode);
  });
  req.write(payload);
  req.end();
}
testAddCfgUrl();
