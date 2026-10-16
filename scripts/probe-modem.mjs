import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== PING TEST ==="
    ping -c 2 172.19.52.10

    echo "=== PORT SCAN ==="
    for port in 21 22 23 53 80 81 443 161 7547 8080 8081 8888 37215; do
      nc -zv -w 1 172.19.52.10 $port 2>&1
    done

    echo "=== HTTP TEST (PORT 80) ==="
    curl -I -s --connect-timeout 2 http://172.19.52.10/ 2>&1

    echo "=== CWMP TEST (PORT 7547) ==="
    curl -I -s --connect-timeout 2 http://172.19.52.10:7547/ 2>&1
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Modem scan output:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
