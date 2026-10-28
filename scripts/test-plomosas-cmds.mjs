import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const script = `
    docker exec chatbot_app node -e "
      const { Client } = require('ssh2');
      const c = new Client();
      c.on('ready', () => {
        c.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
          if (err) { console.error(err); process.exit(1); }
          stream.on('data', d => process.stdout.write(d.toString()));
          setTimeout(() => { stream.write('\\r\\n'); }, 500);
          setTimeout(() => { stream.write('enable\\r\\n'); }, 1200);
          setTimeout(() => { stream.write('terminal length 0\\r\\n'); }, 1800);
          setTimeout(() => { stream.write('ont reset ?\\r\\n'); }, 2400);
          setTimeout(() => { stream.write('reboot ?\\r\\n'); }, 3500);
          setTimeout(() => {
            c.end();
            process.exit(0);
          }, 6000);
        });
      });
      c.connect({
        host: '172.19.70.253',
        port: 22,
        username: 'admin',
        password: 'C$199105@!',
        readyTimeout: 6000,
        algorithms: {
          kex: ['curve25519-sha256', 'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', '3des-cbc'],
          serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ssh-dss'],
          hmac: ['hmac-sha2-256', 'hmac-sha1', 'hmac-md5']
        }
      });
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
