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
try {
  const p = await api.get('/system/get_tr069_profiles');
  console.log('TR069 Profiles:', JSON.stringify(p.data, null, 2));
} catch (e) {
  console.log('Profiles Err:', e.response?.data || e.message);
}
try {
  const w = await api.get('/onu/get_onu_wifi_details/' + externalId);
  console.log('WiFi details:', JSON.stringify(w.data, null, 2));
} catch (e) {
  console.log('WiFi Err:', e.response?.data || e.message);
}
process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /root/chatbot/probe_det.mjs\n${code}\nEOF\ndocker cp /root/chatbot/probe_det.mjs chatbot_app:/app/probe_det.mjs\ndocker exec chatbot_app node /app/probe_det.mjs`, (err, stream) => {
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
