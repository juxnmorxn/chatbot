import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    for i in 1 2 3 4 5 10 100 254; do
      ip="172.19.70.$i"
      if ping -c 1 -W 1 $ip >/dev/null 2>&1; then
        echo "FOUND ALIVE: $ip"
      fi
    done
    echo "Scan complete."
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
