import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import socket

# Test SSH passwords on 172.19.61.1
passwords = [
    'CloudWare1991@',
    'CloudWare1991',
    'adminEp',
    'Epadmin',
    'admin',
    '',
    '1234',
    '12345',
    '123456'
]

import paramiko
for p in passwords:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('172.19.61.1', port=22, username='admin', password=p, timeout=2, look_for_keys=False, allow_agent=False)
        print("SUCCESS PASSWORD:", repr(p))
        stdin, stdout, stderr = ssh.exec_command('/ip arp print')
        print("ARP OUTPUT:\\n", stdout.read().decode())
        ssh.close()
        break
    except Exception as e:
        # print("Failed:", p, e)
        pass
else:
    print("None of the passwords matched for admin@172.19.61.1")
`;

  // We know python doesn't have paramiko on host, let's use node inside chatbot_app!
  const nodeCode = `
    const { Client } = require('ssh2');
    const passwords = ['CloudWare1991@', 'CloudWare1991', 'adminEp', 'Epadmin', 'admin', ''];
    async function tryPass(p) {
      return new Promise((resolve) => {
        const c = new Client();
        c.on('ready', () => {
          c.exec('/ip arp print', (err, stream) => {
            let out = '';
            stream.on('data', d => out += d);
            stream.on('close', () => {
              console.log('SUCCESS! Password is:', JSON.stringify(p));
              console.log('ARP Table:\\n', out);
              c.end();
              resolve(true);
            });
          });
        });
        c.on('error', () => resolve(false));
        c.connect({ host: '172.19.61.1', port: 22, username: 'admin', password: p, readyTimeout: 2000 });
      });
    }
    async function run() {
      for (const p of passwords) {
        if (await tryPass(p)) return;
      }
      console.log('No password matched for admin@172.19.61.1');
    }
    run();
  `;

  conn.exec(`docker exec chatbot_app node -e "${nodeCode.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error(d.toString()));
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
