import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const scriptContent = `
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
const client = axios.create({ 
  httpsAgent: agent, 
  timeout: 6000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://172.19.61.5/'
  }
});

async function run() {
  const tokRes = await client.post('https://172.19.61.5:80/asp/GetRandCount.asp');
  const cleanTok = tokRes.data.replace(/^\\ufeff/, '').trim();
  const params = new URLSearchParams();
  params.append('UserName', 'Epadmin');
  params.append('PassWord', Buffer.from('adminEp').toString('base64'));
  params.append('Language', 'english');
  params.append('x.X_HW_Token', cleanTok);
  const loginRes = await client.post('https://172.19.61.5:80/login.cgi', params.toString(), {
    headers: { 'Cookie': 'Cookie=body:Language:english:id=-1', 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const cookie = 'Cookie=' + loginRes.headers['set-cookie'][0].match(/Cookie=([^;]+)/)[1];
  
  function decodeHex(str) {
    return str.replace(/\\\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  // Check wan_list.asp
  const wanHtml = decodeHex((await client.get('https://172.19.61.5:80/html/bbsp/common/wan_list.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/' } })).data);
  const startIdx = wanHtml.indexOf('new WanIP(');
  console.log('startIdx:', startIdx);
  if (startIdx !== -1) {
    const endIdx = wanHtml.indexOf('),null', startIdx);
    console.log('endIdx:', endIdx);
    const content = wanHtml.slice(startIdx + 10, endIdx);
    const parts = content.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    console.log('WAN IP:', parts[14]);
    console.log('WAN Mask:', parts[15]);
    console.log('WAN Gateway:', parts[16]);
    console.log('WAN MAC:', parts[3]);
    console.log('WAN Name:', parts[7]);
  }








  // Also check /html/bbsp/wan/wan.asp
  try {
    const wanAsp = decodeHex((await client.get('https://172.19.61.5:80/html/bbsp/wan/wan.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/' } })).data);
    console.log('WAN.ASP length:', wanAsp.length);
    const wanAspLines = wanAsp.split('\\n').filter(l => l.includes('stWan') || l.includes('172.19') || l.includes('WanList'));
    console.log('WAN.ASP sample lines:\\n', wanAspLines.slice(0, 10).join('\\n'));
  } catch(e) {
    console.log('WAN.ASP err:', e.message);
  }
}
run().catch(console.error);
`;

  const stream = conn.exec(`docker exec -i chatbot_app node`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
    stream.write(scriptContent);
    stream.end();
  });

}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
