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

const url = (settings.WISPHUB_API_URL || 'https://api.wisphub.io/api').replace(/\\/+$/, '');
const apiKey = settings.WISPHUB_API_KEY;

const api = axios.create({
  baseURL: url,
  headers: {
    'Authorization': 'Api-Key ' + apiKey,
    'Content-Type': 'application/json'
  }
});

const endpoints = [
  { method: 'OPTIONS', path: '/facturas/74308/' },
  { method: 'OPTIONS', path: '/pagos/' },
  { method: 'OPTIONS', path: '/caja/' },
  { method: 'OPTIONS', path: '/cajas/' },
  { method: 'OPTIONS', path: '/facturas/reportar-pago/' },
  { method: 'OPTIONS', path: '/facturas/reportar-pago/74308/' }
];

for (const ep of endpoints) {
  try {
    const res = await api({ method: ep.method, url: ep.path });
    console.log(ep.method, ep.path, '->', res.status, res.headers?.allow || Object.keys(res.data || {}));
  } catch (e) {
    console.log(ep.method, ep.path, '->', e.response?.status);
  }
}

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-routes.mjs\n${code}\nEOF\ndocker cp /tmp/test-routes.mjs chatbot_app:/app/test-routes.mjs\ndocker exec chatbot_app node /app/test-routes.mjs`, (err, stream) => {
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
