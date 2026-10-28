import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:/app/data/chatbot.db' });

await db.execute({
  sql: "UPDATE wisphub_invoices SET estado = 'Pendiente de Pago', fecha_pago = NULL, updated_at = CURRENT_TIMESTAMP WHERE id_factura = 74308 OR folio = '74308' OR folio = 'FAC-74308'",
  args: []
});

await db.execute({
  sql: "UPDATE wisphub_clients SET saldo = '250', updated_at = CURRENT_TIMESTAMP WHERE id_servicio = 715",
  args: []
});

const inv = await db.execute("SELECT id_factura, folio, estado, total, fecha_pago FROM wisphub_invoices WHERE id_factura = 74308");
console.log('Factura local:', JSON.stringify(inv.rows[0], null, 2));

const cli = await db.execute("SELECT id_servicio, nombre, saldo, estado FROM wisphub_clients WHERE id_servicio = 715");
console.log('Cliente local:', JSON.stringify(cli.rows[0], null, 2));

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/revert-db.mjs\n${code}\nEOF\ndocker cp /tmp/revert-db.mjs chatbot_app:/app/revert-db.mjs\ndocker exec chatbot_app node /app/revert-db.mjs`, (err, stream) => {
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
