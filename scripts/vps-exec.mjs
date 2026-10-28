import { Client } from 'ssh2';

const command = process.argv.slice(2).join(' ') || 'docker logs --tail 30 chatbot_app';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('SSH Exec Error:', err);
      conn.end();
      return;
    }
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', (code) => {
      console.log(out);
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('Conn Error:', err);
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
