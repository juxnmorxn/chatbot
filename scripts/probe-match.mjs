import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
import axios from 'axios';

try {
  const res = await axios.get('http://localhost:3000/api/portal/me?phone=7721284398');
  console.log('Response /api/portal/me?phone=7721284398:', JSON.stringify(res.data, null, 2));
} catch (err) {
  console.log('Error /api/portal/me:', err.response?.status, err.response?.data);
}
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
