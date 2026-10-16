import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Iniciando despliegue de GenieACS en VPS...');
  const cmd = `
    cd /root/chatbot &&
    git pull origin main &&
    docker compose up -d genieacs_mongo &&
    sleep 3 &&
    docker compose build genieacs &&
    docker compose up -d genieacs &&
    sleep 4 &&
    docker ps | grep -E "genieacs|mongo"
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log(`\nProceso finalizado con código: ${code}`);
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
