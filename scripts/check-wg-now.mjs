import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('wg show && ip route show dev wg0', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('WG output:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
