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
          const res = await api.get('/facturas/?fecha_emision__range_0=2026-08-01&fecha_emision__range_1=2026-10-31&limit=5');
          console.log('RANGE 3 MONTHS COUNT:', res.data?.count);
          console.log('SAMPLE:', res.data?.results?.map(r => ({ id: r.id_factura, emision: r.fecha_emision, cliente: r.cliente?.nombre })));

          const resOlder = await api.get('/facturas/?fecha_emision__range_0=2026-05-01&fecha_emision__range_1=2026-07-31&limit=5');
          console.log('RANGE PREV 3 MONTHS COUNT:', resOlder.data?.count);
          console.log('SAMPLE PREV:', resOlder.data?.results?.map(r => ({ id: r.id_factura, emision: r.fecha_emision, cliente: r.cliente?.nombre })));
        } catch(e) {
          console.log('ERR:', e.message, e.response?.data);
        }
      });
    });
  `;
  const b64 = Buffer.from(code).toString('base64');
  conn.exec(`echo "${b64}" | base64 -d > /root/test_range.mjs && docker cp /root/test_range.mjs chatbot_app:/app/test_range.mjs && docker exec chatbot_app node /app/test_range.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
