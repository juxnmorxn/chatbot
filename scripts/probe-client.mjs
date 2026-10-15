import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const res = await db.execute({
  sql: "SELECT id_servicio, nombre, telefono, sn_onu, ip FROM wisphub_clients WHERE telefono LIKE '%7721284398%' OR telefonos_adicionales LIKE '%7721284398%'",
  args: []
});
console.log('Clientes con 7721284398:', JSON.stringify(res.rows, null, 2));

const onus = await db.execute({
  sql: "SELECT unique_external_id, sn, name, ip_address FROM smartolt_onus WHERE phone LIKE '%7721284398%' OR unique_external_id = 'HWTCB407D79E'",
  args: []
});
console.log('ONUs:', JSON.stringify(onus.rows, null, 2));

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
