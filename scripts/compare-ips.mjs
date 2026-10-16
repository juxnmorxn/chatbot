import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== 172.19.61.5 ==="
    curl -s -m 2 http://172.19.61.5:80/ | head -n 12
    echo "=== 172.19.70.253 ==="
    curl -s -m 2 http://172.19.70.253:80/ | head -n 12
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
