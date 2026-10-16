import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec("for ip in 172.19.52.2 172.19.52.3 172.19.52.4 172.19.52.5 172.19.52.10; do ping -c 1 -W 1 $ip > /dev/null && echo \"$ip ONLINE\" || echo \"$ip OFFLINE\"; done", (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD || 'CloudWare1991@'
});
