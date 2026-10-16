import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== NETSTAT / SS 3001 ==="
    ss -tulpn | grep 3001 || netstat -tulpn | grep 3001 || true
    echo "=== SYSTEMD OLT-MANAGER ==="
    systemctl status olt-manager --no-pager || true
    echo "=== NGINX CONFIG FOR OLT ==="
    cat /etc/nginx/sites-enabled/olt.cloudwaremx.com || cat /etc/nginx/conf.d/olt.conf || true
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
