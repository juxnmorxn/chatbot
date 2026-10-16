import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `curl -s -k https://172.19.61.5:80/ | grep -B 5 -A 25 "RndSecurityFormat"`;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('RndSecurityFormat usage:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
