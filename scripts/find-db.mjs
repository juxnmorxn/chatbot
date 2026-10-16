import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('find / -name "*olt_manager*.db*" 2>/dev/null', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('DB files found:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
