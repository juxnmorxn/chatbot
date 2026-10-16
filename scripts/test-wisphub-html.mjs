import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/chatbot.db' });
      const s = await db.execute({ sql: "SELECT key, value FROM settings WHERE key LIKE '%WISPHUB%'" });
      const apiKey = s.rows.find(r => r.key === 'WISPHUB_API_KEY')?.value;
      const url = s.rows.find(r => r.key === 'WISPHUB_API_URL')?.value || 'https://api.wisphub.net/api';
      
      import('axios').then(async ({ default: axios }) => {
        const api = axios.create({ baseURL: url, headers: { 'Authorization': 'Api-Key ' + apiKey } });
        try {
          const res = await api.get('/');
          console.log('ROOT ENDPOINTS:', JSON.stringify(res.data, null, 2));
        } catch(e) {
          console.log('ROOT ERR:', e.response?.status, e.message);
        }
      });
    });
  `;
  const b64 = Buffer.from(code).toString('base64');
  conn.exec(`echo "${b64}" | base64 -d > /root/test_root.mjs && docker cp /root/test_root.mjs chatbot_app:/app/test_root.mjs && docker exec chatbot_app node /app/test_root.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
