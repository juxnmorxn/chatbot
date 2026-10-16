import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  // Test MikroTik endpoints from VPS:
  // 10.200.0.2 is the wireguard IP of mikrotik
  // 172.19.52.1 is mikrotik vlan400 gateway
  // 172.19.60.254 is mikrotik ether8
  const testCmd = `
    echo "=== PING MIKROTIK IPS ==="
    ping -c 1 -W 1 10.200.0.2 && echo "10.200.0.2 OK" || echo "10.200.0.2 FAIL"
    ping -c 1 -W 1 172.19.52.1 && echo "172.19.52.1 OK" || echo "172.19.52.1 FAIL"
    ping -c 1 -W 1 172.19.60.254 && echo "172.19.60.254 OK" || echo "172.19.60.254 FAIL"

    echo "=== TEST REST API OR HTTP ON MIKROTIK ==="
    curl -k -s -u admin:CloudWare1991@ https://10.200.0.2/rest/ip/arp || echo "https 10.200.0.2 failed"
    curl -s -u admin:CloudWare1991@ http://10.200.0.2/rest/ip/arp || echo "http 10.200.0.2 failed"
    curl -s -u admin:CloudWare1991@ http://172.19.52.1/rest/ip/arp || echo "http 172.19.52.1 failed"
    curl -s -u admin:CloudWare1991@ http://172.19.60.254/rest/ip/arp || echo "http 172.19.60.254 failed"
  `;

  conn.exec(testCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
