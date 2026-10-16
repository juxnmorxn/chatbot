import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== PROCESO EN PUERTO 3001 ==="
    lsof -i :3001 || fuser 3001/tcp || true
    echo "=== CMDLINE DE LOS PROCESOS NODE ==="
    ps -ef | grep node | grep -v grep
    echo "=== DOCKER COMPOSE SERVICES ==="
    cat /root/chatbot/docker-compose.yml | grep -A 10 "services:" || true
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
