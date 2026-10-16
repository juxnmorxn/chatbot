import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`python3 -c "
with open('/tmp/test_script.js') as f:
    lines = f.readlines()
opens = 0
closes = 0
for i, l in enumerate(lines):
    prev = opens - closes
    opens += l.count('{')
    closes += l.count('}')
    curr = opens - closes
    if curr > prev:
        # line opened brackets
        print(f'{i+1} [diff={curr}]: {l.strip()[:60]}')
"`, (err, stream) => {
    if (err) throw err;
    stream.pipe(process.stdout);
    stream.stderr.pipe(process.stderr);
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
