import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/chatbot.db' });
      const res = await db.execute({
        sql: 'SELECT id_factura, folio, fecha_emision, fecha_pago, total, estado FROM wisphub_invoices WHERE id_servicio = 756 OR cliente_usuario LIKE ? ORDER BY id_factura DESC',
        args: ['%0715%']
      });
      console.log('Facturas en DB local para Martin (756):', res.rows.length);
      console.log(JSON.stringify(res.rows, null, 2));

      const countTotal = await db.execute('SELECT COUNT(*) as c FROM wisphub_invoices');
      console.log('Total facturas en DB local:', countTotal.rows[0].c);
    });
  `;
  conn.exec(`cat << 'EOF' > /root/chatbot/test_check_vps_invoices.mjs\n${code}\nEOF\ndocker cp /root/chatbot/test_check_vps_invoices.mjs chatbot_app:/app/test_check_vps_invoices.mjs\ndocker exec chatbot_app node /app/test_check_vps_invoices.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
