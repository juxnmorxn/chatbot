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
        c.shell({ term: 'vt100', cols: 200, rows: 200 }, (err, stream) => {
          if (err) { console.error(err); process.exit(1); }
          stream.on('data', d => process.stdout.write(d.toString()));

          setTimeout(() => { stream.write('\\r\\n'); }, 500);
          setTimeout(() => { stream.write('enable\\r\\n'); }, 1200);
          setTimeout(() => { stream.write('config\\r\\n'); }, 2000);
          setTimeout(() => { stream.write('interface gpon 1/0/1\\r\\n'); }, 2800);
          setTimeout(() => { stream.write('ont modify 0 desc \"3007-AngelicaOrtaLugo\"\\r\\n'); }, 3500);
          setTimeout(() => { stream.write('ont modify 2 desc \"3020-MarcosParedesHernandez\"\\r\\n'); }, 4500);
          setTimeout(() => { stream.write('exit\\r\\n'); }, 5500);
          setTimeout(() => { stream.write('write\\r\\n'); }, 6500);
          setTimeout(() => {
            c.end();
            process.exit(0);
          }, 8500);
        });
      });
      c.on('error', e => console.error(e));
      c.connect({
        host: '172.19.60.2',
        port: 22,
        username: 'admin',
        password: 'CloudWare1991',
        readyTimeout: 6000,
        algorithms: {
          kex: [
            'curve25519-sha256', 'curve25519-sha256@libssh.org', 'ecdh-sha2-nistp256',
            'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group1-sha1'
          ],
          cipher: [
            'aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes128-gcm@openssh.com',
            'aes256-gcm', 'aes256-gcm@openssh.com', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc', '3des-cbc'
          ],
          serverHostKey: [
            'ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ssh-dss'
          ],
          hmac: [
            'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-sha1-96', 'hmac-md5'
          ]
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
