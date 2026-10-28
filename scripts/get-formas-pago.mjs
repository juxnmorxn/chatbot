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

try {
  const fpRes = await api.get('/formas-de-pago/');
  console.log('Formas de Pago:', JSON.stringify(fpRes.data, null, 2));
} catch (e) {
  console.log('Error Formas de Pago:', e.response?.status, e.response?.data || e.message);
}

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-fp.mjs\n${code}\nEOF\ndocker cp /tmp/test-fp.mjs chatbot_app:/app/test-fp.mjs\ndocker exec chatbot_app node /app/test-fp.mjs`, (err, stream) => {
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
