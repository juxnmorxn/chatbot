import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const r = await db.execute("SELECT key, value FROM settings WHERE key LIKE '%BANK%' OR key LIKE '%PAY%' OR key LIKE '%PAGO%' OR key LIKE '%BBVA%' OR key LIKE '%CLABE%'");
console.log('Bank Settings:', JSON.stringify(r.rows, null, 2));

const all = await db.execute("SELECT key, value FROM settings");
console.log('All Settings Keys:', all.rows.map(x => x.key));

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /root/chatbot/test-bank.mjs\n${code}\nEOF\ndocker cp /root/chatbot/test-bank.mjs chatbot_app:/app/test-bank.mjs\ndocker exec chatbot_app node /app/test-bank.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
