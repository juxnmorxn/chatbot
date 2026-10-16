import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== PING ==="
    ping -c 1 -W 1 10.200.0.3 && echo "MK-PLOMOSAS 10.200.0.3 OK" || echo "FAIL"
    ping -c 1 -W 1 172.19.70.253 && echo "OLT-PLOMOSAS 172.19.70.253 OK" || echo "FAIL"
    ping -c 1 -W 1 172.19.61.5 && echo "ONT-1 172.19.61.5 OK" || echo "FAIL"

    echo "=== PORTS ON MIKROTIK 10.200.0.3 ==="
    nc -zv -w 2 10.200.0.3 22 80 443 8728 8291 || true

    echo "=== PORTS ON MODEM 172.19.61.5 ==="
    nc -zv -w 2 172.19.61.5 80 443 22 23 7547 8080 || true
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
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
