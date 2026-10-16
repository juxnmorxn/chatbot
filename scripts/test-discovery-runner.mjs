import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const nodeCode = `
    const net = require('net');
    const axios = require('axios');
    const https = require('https');

    const agent = new https.Agent({ rejectUnauthorized: false });

    async function scanSubnetForPort80(baseSubnet) {
      const promises = [];
      const found = [];
      for (let i = 1; i <= 254; i++) {
        const ip = baseSubnet + '.' + i;
        const p = new Promise(resolve => {
          const s = new net.Socket();
          s.setTimeout(600);
          s.on('connect', () => { found.push(ip); s.destroy(); resolve(ip); });
          s.on('timeout', () => { s.destroy(); resolve(null); });
          s.on('error', () => { s.destroy(); resolve(null); });
          s.connect(80, ip);
        });
        promises.push(p);
      }
      await Promise.all(promises);
      return found;
    }

    async function probeOnt(ip) {
      try {
        const client = axios.create({
          httpsAgent: agent,
          timeout: 4000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://' + ip + ':80/'
          }
        });

        // 1. Get token
        const tokRes = await client.post('https://' + ip + ':80/asp/GetRandCount.asp');
        const cleanTok = tokRes.data.replace(/^\\ufeff/, '').trim();

        // 2. Login
        const params = new URLSearchParams();
        params.append('UserName', 'Epadmin');
        params.append('PassWord', Buffer.from('adminEp').toString('base64'));
        params.append('Language', 'english');
        params.append('x.X_HW_Token', cleanTok);

        const loginRes = await client.post('https://' + ip + ':80/login.cgi', params.toString(), {
          headers: {
            'Cookie': 'Cookie=body:Language:english:id=-1',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        const setCookie = loginRes.headers['set-cookie'];
        const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie || '');
        const match = cookieHeader.match(/Cookie=([^;]+)/);
        if (!match || !match[1].includes('id=1')) return null;

        const sessionCookie = 'Cookie=' + match[1];

        // 3. Get WAN list
        const wanRes = await client.get('https://' + ip + ':80/html/bbsp/common/wan_list.asp', {
          headers: { 'Cookie': sessionCookie, 'Referer': 'https://' + ip + ':80/html/bbsp/common/wan_list.asp' }
        });

        // Decode hex
        const decoded = wanRes.data.replace(/\\\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const macMatch = decoded.match(/([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})/);

        // 4. Get Device Info
        const devRes = await client.get('https://' + ip + ':80/html/ssmp/deviceinfo/deviceinfo.asp', {
          headers: { 'Cookie': sessionCookie, 'Referer': 'https://' + ip + ':80/html/ssmp/deviceinfo/deviceinfo.asp' }
        });
        const devDecoded = devRes.data.replace(/\\\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const devMatch = devDecoded.match(/new\\s+stDeviceInfo\\((.*?)\\)/);
        let serial = '';
        let model = '';
        if (devMatch) {
          const parts = devMatch[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          serial = parts[1] || '';
          model = parts[4] || '';
        }

        return {
          ip,
          mac: macMatch ? macMatch[1].toUpperCase() : '',
          serial,
          model
        };
      } catch (e) {
        return null;
      }
    }

    async function testAutoDiscovery() {
      console.log('Testing auto-discovery on Plomosas subnet 172.19.61...');
      const start = Date.now();
      const ips = await scanSubnetForPort80('172.19.61');
      console.log('Active HTTP IPs:', ips);

      for (const ip of ips) {
        // Skip gateway or router if .1
        if (ip.endsWith('.1')) continue;
        console.log('Probing potential modem at', ip, '...');
        const res = await probeOnt(ip);
        if (res) {
          console.log('>>> MATCH FOUND! ONT Identified:', res);
        } else {
          console.log('IP', ip, 'is not a Huawei ONT or login failed');
        }
      }
      console.log('Auto-discovery total time:', Date.now() - start, 'ms');
    }

    testAutoDiscovery();
  `;

  conn.exec(`cat << 'EOF' > /tmp/test-discovery.cjs\n${nodeCode}\nEOF\ndocker cp /tmp/test-discovery.cjs chatbot_app:/app/test-discovery.cjs && docker exec chatbot_app node /app/test-discovery.cjs\n`, (err, stream) => {
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
