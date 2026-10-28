import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import axios from 'axios';
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:/app/data/chatbot.db' });
const sRes = await db.execute("SELECT key, value FROM settings WHERE key = 'WISPHUB_API_KEY'");
const apiKey = sRes.rows[0].value;

const api = axios.create({
  baseURL: 'https://api.wisphub.io/api',
  headers: {
    'Authorization': 'Api-Key ' + apiKey,
    'Content-Type': 'application/json'
  }
});

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const fechaPago = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

console.log('--- Enviando POST /facturas/74308/registrar-pago/ con fecha_pago:', fechaPago);
try {
  const res = await api.post('/facturas/74308/registrar-pago/', {
    referencia: 'CARD_715_1793143134859',
    fecha_pago: fechaPago,
    total_cobrado: 250.00,
    accion: 1,
    forma_pago: 21899
  });
  console.log('¡EXITO WISPHUB!', res.status, JSON.stringify(res.data, null, 2));
} catch (err) {
  console.log('ERROR WISPHUB:', err.response?.status, JSON.stringify(err.response?.data || err.message, null, 2));
}

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-reg-pago.mjs\n${code}\nEOF\ndocker cp /tmp/test-reg-pago.mjs chatbot_app:/app/test-reg-pago.mjs\ndocker exec chatbot_app node /app/test-reg-pago.mjs`, (err, stream) => {
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
