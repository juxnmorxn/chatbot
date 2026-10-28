import { Client } from 'ssh2';

const pyScript = `import socket
magic = bytes.fromhex('00ffff00fefefefefdfdfdfd12345678')
ping = b'\\x01' + (0).to_bytes(8, 'big') + magic + (12345).to_bytes(8, 'big')

for port in [19132, 19133, 7551]:
    s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    s.settimeout(2.0)
    try:
        s.sendto(ping, ('::1', port))
        data, addr = s.recvfrom(2048)
        print(f"IPV6 PORT {port} SUCCESS: {data[35:].decode('utf-8', 'replace')}")
    except Exception as e:
        print(f"IPV6 PORT {port} FAIL: {e}")
    finally:
        s.close()
`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ws = sftp.createWriteStream('/tmp/test_ping_v6.py');
    ws.on('close', () => {
      conn.exec('python3 /tmp/test_ping_v6.py', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d));
        stream.on('close', () => conn.end());
      });
    });
    ws.end(pyScript);
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
