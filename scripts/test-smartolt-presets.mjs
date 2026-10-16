import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `docker exec chatbot_app node -e "
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/chatbot.db' });
      const s = await db.execute({ sql: 'SELECT key, value FROM settings WHERE key LIKE \\'%SMARTOLT%\\'' });
      const token = s.rows.find(r => r.key === 'SMARTOLT_API_KEY')?.value;
      const url = s.rows.find(r => r.key === 'SMARTOLT_API_URL')?.value || 'https://cloudware.telecomti.net/api';
      
      const o = await db.execute({ sql: 'SELECT unique_external_id, sn FROM smartolt_onus LIMIT 1' });
      const extId = o.rows[0]?.unique_external_id || o.rows[0]?.sn;

      import('axios').then(async ({ default: axios }) => {
        const api = axios.create({ baseURL: url, headers: { 'X-Token': token } });
        try {
          const r = await api.get('/onu/get_onu_details/' + extId);
          console.log('ONU DETAILS KEYS:', Object.keys(r.data.onu_details || {}));
          console.log('WIFI PORTS:', JSON.stringify(r.data.onu_details?.wifi_ports, null, 2));
        } catch(e) { console.error('E:', e.response?.data || e.message); }
      });
    });
  "`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
