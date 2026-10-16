import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const script = `
    docker exec chatbot_app node -e "
      const { createClient } = require('@libsql/client');
      const db = createClient({ url: 'file:/app/data/olt_manager.db' });
      db.execute(\\"UPDATE wireguard_peers SET allowed_subnets = '172.19.60.0/24' WHERE client_ip = '10.200.0.2'\\")
        .then(() => console.log('✅ allowed_subnets actualizado a 172.19.60.0/24 en DB'))
        .catch(console.error);
    "
  `;
  conn.exec(script, (err, stream) => {
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
