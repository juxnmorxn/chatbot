import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:/app/data/chatbot.db' });

console.log('--- Limpiando sesión de Juan (5217721284398) ---');
const r1 = await db.execute("UPDATE sessions SET client_name = NULL, client_id = NULL, service_id = NULL, onu_id = NULL, step = 'INICIO', metadata = NULL WHERE phone LIKE '%7721284398%'");
console.log('Sesiones actualizadas:', r1.rowsAffected);

const r2 = await db.execute("DELETE FROM client_portal_accounts WHERE telefono LIKE '%7721284398%'");
console.log('Cuentas portal eliminadas:', r2.rowsAffected);

const s = await db.execute("SELECT phone, client_name, client_id, service_id, step FROM sessions");
console.log('Estado actual de sesiones:', s.rows);

process.exit(0);
`;
  conn.exec(`cat << 'EOF' > /root/chatbot/clean_user.mjs\n${code}\nEOF\ndocker cp /root/chatbot/clean_user.mjs chatbot_app:/app/clean_user.mjs\ndocker exec chatbot_app node /app/clean_user.mjs`, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { conn.end(); });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
