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

  // 1. deviceinfo
  const devHtml = decodeHex((await client.get('https://172.19.61.5:80/html/ssmp/deviceinfo/deviceinfo.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/html/ssmp/deviceinfo/deviceinfo.asp' } })).data);
  const devM = devHtml.match(/new\\s+stDeviceInfo\\((.*?)\\)/);
  console.log('DEV:', devM ? devM[1] : 'NOT FOUND');

  // 2. opticinfo
  const optHtml = decodeHex((await client.get('https://172.19.61.5:80/html/amp/opticinfo/opticinfo.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/html/amp/opticinfo/opticinfo.asp' } })).data);
  const optM = optHtml.match(/new\\s+stOpticInfo\\((.*?)\\)/);
  console.log('OPTIC:', optM ? optM[1] : 'NOT FOUND');

  // 3. wan_list
  const wanHtml = decodeHex((await client.get('https://172.19.61.5:80/html/bbsp/common/wan_list.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/html/bbsp/common/wan_list.asp' } })).data);
  const wanM = wanHtml.match(/new\\s+stWan\\((.*?)\\)/);
  console.log('WAN:', wanM ? wanM[1] : 'NOT FOUND');

  // 4. tr069
  const trHtml = decodeHex((await client.get('https://172.19.61.5:80/html/ssmp/tr069/tr069.asp', { headers: { 'Cookie': cookie, 'Referer': 'https://172.19.61.5:80/html/ssmp/tr069/tr069.asp' } })).data);
  const trM = trHtml.match(/new\\s+stCWMP\\((.*?)\\)/);
  console.log('TR069:', trM ? trM[1] : 'NOT FOUND');
}
run().catch(console.error);
`;

  conn.exec(`docker exec -i chatbot_app node -e "${scriptContent.replace(/"/g, '\\"')}"`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('VPS Result:\n', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
