import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests, re, base64, urllib3
urllib3.disable_warnings()

s = requests.Session()
s.verify = False

# Try 172.19.61.10 and 172.19.61.5
for ip in ['172.19.61.10', '172.19.61.8', '172.19.61.5']:
    try:
        r = s.get(f'https://{ip}:80/asp/GetRandCount.asp', timeout=2)
        print(f"Ping/HTTP to {ip}: SUCCESS, token: {r.text.strip()}")
    except Exception as e:
        print(f"Ping/HTTP to {ip}: FAILED ({e})")
`;

  conn.exec(`python3 - << 'EOF'\n${pyCode}\nEOF\n`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
