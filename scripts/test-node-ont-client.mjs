import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const nodeCode = `
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const client = axios.create({
  httpsAgent: agent,
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://172.19.61.5/'
  }
});

async function test() {
  console.log('1. Requesting token from GetRandCount.asp...');
  const tokRes = await client.post('https://172.19.61.5:80/asp/GetRandCount.asp');
  const cleanTok = tokRes.data.replace(/^\\ufeff/, '').trim();
  console.log('Token extracted:', cleanTok);

  console.log('2. Submitting login to login.cgi...');
  const params = new URLSearchParams();
  params.append('UserName', 'Epadmin');
  params.append('PassWord', Buffer.from('adminEp').toString('base64'));
  params.append('Language', 'english');
  params.append('x.X_HW_Token', cleanTok);

  const loginRes = await client.post('https://172.19.61.5:80/login.cgi', params.toString(), {
    headers: {
      'Cookie': 'Cookie=body:Language:english:id=-1',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie || '');
  const match = cookieHeader.match(/Cookie=([^;]+)/);
  if (!match) {
    console.error('Login failed. Headers:', loginRes.headers, 'Body:', loginRes.data.slice(0, 200));
    return;
  }
  const sessionCookie = 'Cookie=' + match[1];
  console.log('Session established:', sessionCookie);

  console.log('3. Fetching opticinfo.asp...');
  const optRes = await client.get('https://172.19.61.5:80/html/amp/opticinfo/opticinfo.asp', {
    headers: {
      'Cookie': sessionCookie,
      'Referer': 'https://172.19.61.5:80/html/amp/opticinfo/opticinfo.asp'
    }
  });
  console.log('Optic page fetched, status:', optRes.status, 'length:', optRes.data.length);

  console.log('4. Fetching wlan_list.asp...');
  const wlanRes = await client.get('https://172.19.61.5:80/html/amp/common/wlan_list.asp', {
    headers: {
      'Cookie': sessionCookie,
      'Referer': 'https://172.19.61.5:80/html/amp/common/wlan_list.asp'
    }
  });
  console.log('WLAN page fetched, status:', wlanRes.status, 'length:', wlanRes.data.length);
  for (const line of wlanRes.data.split('\\n')) {
    if (line.includes('stWlanInfo') && line.includes('CloudWare')) {
      console.log('  SSID Entry:', line.trim());
    }
  }
}

test().catch(console.error);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-ont.cjs\n${nodeCode}\nEOF\ndocker cp /tmp/test-ont.cjs chatbot_app:/app/test-ont.cjs && docker exec chatbot_app node /app/test-ont.cjs\n`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error(d.toString()));
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
