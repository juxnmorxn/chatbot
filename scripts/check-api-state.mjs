import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== OLTS API ==="
    curl -s http://127.0.0.1:3001/api/olts
    echo ""
    echo "=== ONUS API ==="
    curl -s http://127.0.0.1:3001/api/onus
    echo ""
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
