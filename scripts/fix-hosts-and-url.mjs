import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    grep -q "evolution_api" /etc/hosts || echo "127.0.0.1 evolution_api" >> /etc/hosts
    ping -c 1 evolution_api
    curl -s http://evolution_api:8080/instance/connectionState/isp-soporte -H "apikey: 429644-cloudware-key-auth"
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('\nFinalizado con código:', code);
      conn.end();
    });
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
