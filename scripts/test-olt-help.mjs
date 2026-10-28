import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const testScript = `
import { Client as OltClient } from 'ssh2';

const oltConn = new OltClient();
oltConn.on('ready', () => {
  oltConn.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
    if (err) throw err;
    let buf = '';
    stream.on('data', d => {
      buf += d.toString('utf8');
      if (buf.includes('DS-P7001-01_AB3B56>') && !buf.includes('en_sent')) {
        buf += 'en_sent';
        stream.write('enable\\n');
      } else if (buf.includes('DS-P7001-01_AB3B56#') && !buf.includes('cmd_sent')) {
        buf += 'cmd_sent';
        stream.write('terminal length 0\\n');
        setTimeout(() => stream.write('interface gpon 1/0/1\\n'), 400);
        setTimeout(() => stream.write('ont ?\\n'), 900);
        setTimeout(() => stream.write('exit\\n'), 1500);
        setTimeout(() => stream.write('ont ?\\n'), 2000);
        setTimeout(() => {
          console.log('BUFFER RECEIVED:\\n', buf);
          stream.end();
          oltConn.end();
        }, 3000);
      }
    });
  });
}).connect({
  host: '172.19.70.253',
  port: 22,
  username: 'admin',
  password: 'CloudWare1991',
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
`;

  const stream = conn.exec('docker exec -i chatbot_app node --input-type=module', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
    stream.write(testScript);
    stream.end();
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
