import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('[Hostinger VPS] Conexión SSH establecida con éxito.');
  const cmd = `
    cd /root/chatbot || cd /app || cd /home/chatbot || pwd
    git pull origin main
    docker compose build chatbot_app
    docker compose up -d chatbot_app
    sleep 3
    docker logs --tail 25 chatbot_app
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('[Hostinger VPS] Error ejecutando comando:', err);
      conn.end();
      return;
    }
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', (code) => {
      console.log(`[Hostinger VPS] Finalizado con código ${code}:\n`, out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
