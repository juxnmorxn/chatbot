import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pwdx 303413', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Working dir of olt-server:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
