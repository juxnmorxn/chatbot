import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = 'docker logs --tail 100 chatbot_app';
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
