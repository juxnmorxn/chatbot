import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:/app/data/chatbot.db' });

const r1 = await db.execute("SELECT unique_external_id, sn, name, ip_address FROM smartolt_onus WHERE name LIKE '%Maria del Pilar%' OR sn LIKE '%HWTCF230BFB8%'");
console.log('ONU for Maria del Pilar:', r1.rows);

const r2 = await db.execute("SELECT unique_external_id, sn, name, ip_address FROM smartolt_onus WHERE name LIKE '715%'");
console.log('ONU with 715:', r2.rows);

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
