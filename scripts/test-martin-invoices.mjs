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
          const r = await api.get('/facturas/67936/');
          console.log('FACTURA 67936 ARTICULOS:', JSON.stringify(r.data?.articulos, null, 2));
          console.log('FACTURA 67936 CLIENTE:', JSON.stringify(r.data?.cliente, null, 2));
        } catch(e) { console.error('E:', e.message); }
      });
    });
  `;
  conn.exec(`cat << 'EOF' > /root/chatbot/test_check_67936.mjs\n${code}\nEOF\ndocker cp /root/chatbot/test_check_67936.mjs chatbot_app:/app/test_check_67936.mjs\ndocker exec chatbot_app node /app/test_check_67936.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
