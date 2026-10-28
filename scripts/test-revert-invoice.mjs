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

console.log('--- Probando regresar factura 74308 a Pendiente ---');
// Primero intentar PUT con estado = 1 o "Pendiente de Pago"
try {
  const res = await api.put('/facturas/74308/', {
    fecha_emision: '2026-10-25',
    fecha_vencimiento: '2026-11-11',
    fecha_pago: '2026-11-01',
    estado: 1,
    forma_pago: null,
    referencia: ''
  });
  console.log('RESPUESTA PUT:', res.status, JSON.stringify(res.data, null, 2));
} catch (e) {
  console.log('ERROR PUT:', e.response?.status, JSON.stringify(e.response?.data || e.message, null, 2));
}

// Tambien probar PATCH si PUT falla
try {
  const resPatch = await api.patch('/facturas/74308/', {
    estado: 1,
    forma_pago: null,
    referencia: ''
  });
  console.log('RESPUESTA PATCH:', resPatch.status, JSON.stringify(resPatch.data, null, 2));
} catch (e) {
  console.log('ERROR PATCH:', e.response?.status, JSON.stringify(e.response?.data || e.message, null, 2));
}

process.exit(0);
`;

  conn.exec(`cat << 'EOF' > /tmp/test-revert.mjs\n${code}\nEOF\ndocker cp /tmp/test-revert.mjs chatbot_app:/app/test-revert.mjs\ndocker exec chatbot_app node /app/test-revert.mjs`, (err, stream) => {
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
