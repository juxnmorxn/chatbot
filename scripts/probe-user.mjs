import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:/app/data/chatbot.db' });

console.log('=== SESSIONS ===');
const s = await db.execute("SELECT phone, client_name, client_id, service_id, step, last_interaction FROM sessions");
console.log(s.rows);

console.log('=== TICKETS ===');
const t = await db.execute("SELECT id, phone, client_name, status, created_at FROM tickets ORDER BY id DESC LIMIT 10");
console.log(t.rows);

console.log('=== SETTINGS with phone ===');
const set = await db.execute("SELECT key, value FROM settings WHERE key LIKE '%PHONE%'");
console.log(set.rows);

process.exit(0);
`;
  conn.exec(`cat << 'EOF' > /root/chatbot/probe_user.mjs\n${code}\nEOF\ndocker cp /root/chatbot/probe_user.mjs chatbot_app:/app/probe_user.mjs\ndocker exec chatbot_app node /app/probe_user.mjs`, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { conn.end(); });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
