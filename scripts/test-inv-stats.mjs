import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/chatbot.db' });
      const stats = await db.execute({
        sql: 'SELECT MIN(id_factura) as min_id, MAX(id_factura) as max_id, COUNT(*) as c FROM wisphub_invoices',
        args: []
      });
      console.log('STATS wisphub_invoices:', stats.rows[0]);
    });
  `;
  conn.exec(`cat << 'EOF' > /root/chatbot/test_inv_stats.mjs\n${code}\nEOF\ndocker cp /root/chatbot/test_inv_stats.mjs chatbot_app:/app/test_inv_stats.mjs\ndocker exec chatbot_app node /app/test_inv_stats.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
