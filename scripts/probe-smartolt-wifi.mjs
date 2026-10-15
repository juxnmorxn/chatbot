import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import axios from 'axios';
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const sRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('SMARTOLT_API_URL', 'SMARTOLT_API_KEY')");
let url = 'https://cloudware.telecomti.net/api';
let key = '';
for (const r of sRes.rows) {
  if (r.key === 'SMARTOLT_API_URL') url = String(r.value || url).replace(/\\/+$/, '');
  if (r.key === 'SMARTOLT_API_KEY') key = String(r.value || '');
}

const externalId = 'HWTCF230BFB8';
const api = axios.create({ baseURL: url, headers: { 'X-Token': key } });
const det = await api.get('/onu/get_onu_details/' + externalId);
const d = det.data.onu_details || det.data;
console.log('onu_details keys:', Object.keys(d));
console.log('wifi_ports:', d.wifi_ports);
console.log('wifi:', d.wifi);
process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /root/chatbot/probe.mjs\n${code}\nEOF\ndocker cp /root/chatbot/probe.mjs chatbot_app:/app/probe.mjs\ndocker exec chatbot_app node /app/probe.mjs`, (err, stream) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
