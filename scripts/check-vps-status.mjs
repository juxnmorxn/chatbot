import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== WIREGUARD SHOW ==="
    wg show
    echo "=== IP ROUTE ==="
    ip route
    echo "=== PING OLT 172.19.60.2 ==="
    ping -c 2 -W 2 172.19.60.2 || true
    echo "=== DOCKER CONTAINERS ==="
    docker ps
    echo "=== OLT MANAGER LOGS ==="
    docker logs --tail 30 chatbot-olt-manager-1 2>&1 || docker logs --tail 30 chatbot_olt-manager_1 2>&1 || pm2 logs olt-manager --lines 30 --nostream 2>&1 || true
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
