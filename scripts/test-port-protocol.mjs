import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const nodeCode = `
const axios = require('axios');
const https = require('https');

async function testHttp() {
  try {
    const res = await axios.post('http://172.19.61.5/asp/GetRandCount.asp', null, { timeout: 3000 });
    console.log('HTTP port 80 succeeded:', res.data);
  } catch (e) {
    console.log('HTTP port 80 failed:', e.message);
  }
}

async function testHttpsPort80() {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const res = await axios.post('https://172.19.61.5:80/asp/GetRandCount.asp', null, { httpsAgent: agent, timeout: 3000 });
    console.log('HTTPS port 80 succeeded:', res.data);
  } catch (e) {
    console.log('HTTPS port 80 failed:', e.message);
  }
}

async function run() {
  await testHttp();
  await testHttpsPort80();
}
run();
`;

  conn.exec(`cat << 'EOF' > /tmp/test-port.cjs\n${nodeCode}\nEOF\ndocker cp /tmp/test-port.cjs chatbot_app:/app/test-port.cjs && docker exec chatbot_app node /app/test-port.cjs\n`, (err, stream) => {
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
