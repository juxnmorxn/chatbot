import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:/app/data/chatbot.db' });
await db.execute({
  sql: "UPDATE wisphub_invoices SET estado = 'Pagada', fecha_pago = '2026-10-27 23:41:00', updated_at = CURRENT_TIMESTAMP WHERE id_factura = 74308 OR folio = '74308' OR folio = 'FAC-74308'",
  args: []
});
await db.execute({
  sql: "UPDATE wisphub_clients SET saldo = '0', estado = 'activo', updated_at = CURRENT_TIMESTAMP WHERE id_servicio = 715",
  args: []
});
console.log('Factura y cliente actualizados localmente a Pagada/Activo.');
process.exit(0);
`;
  conn.exec(`cat << 'EOF' > /tmp/sync-local-inv.mjs\n${code}\nEOF\ndocker cp /tmp/sync-local-inv.mjs chatbot_app:/app/sync-local-inv.mjs\ndocker exec chatbot_app node /app/sync-local-inv.mjs`, (err, stream) => {
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
