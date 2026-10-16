import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker cp /tmp/query-arp.js chatbot_app:/app/query-arp.js && docker exec -i chatbot_app node /app/query-arp.js', (err, stream) => {
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
