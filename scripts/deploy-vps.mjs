import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado al VPS. Iniciando despliegue...');
  const cmd = 'cd /root/chatbot && git pull origin main && docker compose build chatbot_app && docker compose up -d chatbot_app';
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error al ejecutar comando:', err);
      process.exit(1);
    }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      console.log('\nDespliegue finalizado con código:', code);
      conn.end();
      process.exit(code || 0);
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
