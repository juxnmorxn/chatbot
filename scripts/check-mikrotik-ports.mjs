import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('nc -zv -w 2 10.200.0.2 22 8728 80', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('MikroTik open ports:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
