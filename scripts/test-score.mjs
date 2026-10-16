import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import { createClient } from '@libsql/client';
import { computeNameMatchScore, cleanPersonName } from './dist/utils/fuzzy-matcher.js';
const db = createClient({ url: 'file:/app/data/chatbot.db' });

const q = 'Quiero pagar Idalia jokabed chavez ruiz';
const cleanQ = cleanPersonName(q) || q;
console.log('cleanQ:', cleanQ);

const r = await db.execute("SELECT id_servicio, nombre FROM wisphub_clients WHERE nombre LIKE '%DAMARIS%' OR nombre LIKE '%IDALIA%'");
for (const row of r.rows) {
  const s = computeNameMatchScore(cleanQ, row.nombre);
  console.log(row.nombre, '-> score:', s);
}

process.exit(0);
`;
  conn.exec(`cat << 'EOF' > /root/chatbot/test_score.mjs\n${code}\nEOF\ndocker cp /root/chatbot/test_score.mjs chatbot_app:/app/test_score.mjs\ndocker exec chatbot_app node /app/test_score.mjs`, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { conn.end(); });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
