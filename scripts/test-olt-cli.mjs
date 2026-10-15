import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado al VPS. Probando comandos CLI en OLT 172.19.60.2...');
  const nodeScript = `
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
    if (err) { console.error(err); process.exit(1); }
    let out = '';
    stream.on('data', d => {
      out += d.toString();
      if (out.includes('--More--')) stream.write(' ');
    });
    setTimeout(() => stream.write('enable\\r\\n'), 400);
    setTimeout(() => stream.write('terminal length 0\\r\\n'), 800);
    setTimeout(() => stream.write('config\\r\\n'), 1200);
    setTimeout(() => stream.write('show ont info gpon 1/0/1 1\\r\\n'), 1600);
    setTimeout(() => {
      console.log(out);
      conn.end();
      process.exit(0);
    }, 4000);
  });
}).connect({
  host: '172.19.60.2',
  port: 22,
  username: 'admin',
  password: 'CloudWare1991',
  readyTimeout: 5000,
  algorithms: {
    kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1', 'diffie-hellman-group-exchange-sha1'],
    cipher: ['aes128-cbc', '3des-cbc', 'aes256-cbc'],
    serverHostKey: ['ssh-rsa', 'ssh-dss'],
    hmac: ['hmac-sha1', 'hmac-sha1-96', 'hmac-md5']
  }
});
`;
  conn.exec(`docker exec -i chatbot_app node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
