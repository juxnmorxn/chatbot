import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    for i in $(seq 1 30); do
      ip="172.19.52.$i"
      if ping -c 1 -W 1 $ip >/dev/null 2>&1; then
        echo "Active IP: $ip"
      fi
    done
    ip neigh show dev wg0
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Active IPs on 172.19.52.0/24:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
