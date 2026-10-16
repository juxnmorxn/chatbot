import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  // Test 1: Ping & curl the modems from VPS
  const testCmd = `
    echo "=== PING MODEMS FROM VPS ==="
    for ip in 172.19.52.2 172.19.52.3 172.19.52.4 172.19.52.5 172.19.52.10; do
      ping -c 1 -W 1 $ip >/dev/null 2>&1 && echo "IP $ip: ALIVE" || echo "IP $ip: NO RESP"
    done

    echo "=== CHECK HTTP/TELNET/TR069 PORTS ==="
    for ip in 172.19.52.2 172.19.52.3 172.19.52.10; do
      echo "Scanning $ip:"
      nc -zv -w 1 $ip 80 2>&1
      nc -zv -w 1 $ip 8080 2>&1
      nc -zv -w 1 $ip 23 2>&1
      nc -zv -w 1 $ip 7547 2>&1
    done

    echo "=== MIKROTIK ARP FOR VLAN400 ==="
    sshpass -p 'CloudWare1991@' ssh -o StrictHostKeyChecking=no admin@10.200.0.2 "/ip arp print detail where interface=vlan400" 2>/dev/null || echo "Could not query mikrotik via ssh"
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
