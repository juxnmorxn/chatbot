import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  // Conectar desde el VPS directamente a 172.19.60.2 usando shell interactivo
  const script = `
    docker exec chatbot_app node -e "
      const { Client } = require('ssh2');
      const c = new Client();
      console.log('Iniciando prueba SSH interactiva desde contenedor a 172.19.60.2...');
      c.on('ready', () => {
        console.log('✅ SSH READY! Autenticación exitosa.');
        c.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
          if (err) {
            console.error('Error abriendo shell:', err);
            c.end();
            return;
          }
          console.log('✅ Shell stream abierto!');
          stream.on('data', (d) => {
            console.log('DATA RECIBIDA DE OLT:', JSON.stringify(d.toString()));
          });
          stream.write('\\n');
          setTimeout(() => {
            stream.write('show system-info\\n');
          }, 1000);
          setTimeout(() => {
            c.end();
            process.exit(0);
          }, 4000);
        });
      });
      c.on('error', (e) => {
        console.error('Error SSH:', e.message);
        process.exit(1);
      });
      c.connect({
        host: '172.19.60.2',
        port: 22,
        username: 'admin',
        password: '',
        readyTimeout: 5000,
        algorithms: {
          kex: ['curve25519-sha256', 'curve25519-sha256@libssh.org', 'ecdh-sha2-nistp256', 'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group-exchange-sha1', 'diffie-hellman-group1-sha1'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc', '3des-cbc'],
          serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ssh-dss'],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-sha1-96', 'hmac-md5']
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
