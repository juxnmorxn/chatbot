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

const res = await api.options('/facturas/reportar-pago/74308/');
console.log('OPTIONS reportar-pago 74308 data:', JSON.stringify(res.data, null, 2));

const resFac = await api.options('/facturas/74308/');
console.log('OPTIONS /facturas/74308/ data:', JSON.stringify(resFac.data, null, 2));

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-schema.mjs\n${code}\nEOF\ndocker cp /tmp/test-schema.mjs chatbot_app:/app/test-schema.mjs\ndocker exec chatbot_app node /app/test-schema.mjs`, (err, stream) => {
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
