import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import axios from 'axios';
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const sRes = await db.execute("SELECT key, value FROM settings WHERE key = 'WISPHUB_API_KEY'");
const apiKey = sRes.rows[0].value;

const api = axios.create({
  baseURL: 'https://api.wisphub.io/api',
  headers: {
    'Authorization': 'Api-Key ' + apiKey,
    'Content-Type': 'application/json'
  }
});

const res = await api.options('/facturas/reportar-pago/74308/');
console.log('OPTIONS reportar-pago:', JSON.stringify(res.data?.actions?.POST || res.data, null, 2));

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-post.mjs\n${code}\nEOF\ndocker cp /tmp/test-post.mjs chatbot_app:/app/test-post.mjs\ndocker exec chatbot_app node /app/test-post.mjs`, (err, stream) => {
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
