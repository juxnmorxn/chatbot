import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    wg set wg0 peer yZefKFMYoKu3yhgaJdhPqKuhS13OQebrcQ+BeE3+NHw= allowed-ips 10.200.0.2/32,172.19.60.0/24,172.19.52.0/24
    ip route replace 172.19.52.0/24 dev wg0
    ping -c 2 172.19.52.1
    ping -c 2 172.19.52.3
    ping -c 2 172.19.52.5
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('WireGuard peer update and pings:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
