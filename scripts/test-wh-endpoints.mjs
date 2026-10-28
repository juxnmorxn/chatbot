import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import axios from 'axios';
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const sRes = await db.execute("SELECT key, value FROM settings WHERE key LIKE '%WISP%'");
const settings = {};
sRes.rows.forEach(r => settings[r.key] = r.value);

const url = (settings.WISPHUB_API_URL || 'https://api.wisphub.net/api').replace(/\\/+$/, '');
const apiKey = settings.WISPHUB_API_KEY;

console.log('Using WispHub URL:', url);
console.log('API Key exists:', !!apiKey);

const api = axios.create({
  baseURL: url,
  headers: {
    'Authorization': 'Api-Key ' + apiKey,
    'Content-Type': 'application/json'
  }
});

try {
  const getRes = await api.get('/facturas/74308/');
  console.log('Factura 74308 details:', getRes.status, JSON.stringify(getRes.data, null, 2));
} catch (e) {
  console.log('Error GET /facturas/74308/:', e.response?.status, e.response?.data || e.message);
}

try {
  const optRes = await api.options('/facturas/');
  console.log('OPTIONS /facturas/ actions/methods:', optRes.headers?.allow || optRes.data);
} catch (e) {
  console.log('Error OPTIONS /facturas/:', e.response?.status, e.message);
}

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-wh.mjs\n${code}\nEOF\ndocker cp /tmp/test-wh.mjs chatbot_app:/app/test-wh.mjs\ndocker exec chatbot_app node /app/test-wh.mjs`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
      process.exit(0);
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
