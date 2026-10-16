import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('free -h; df -h /; ss -tulpn | grep -E "7547|7557|7567|3000|3001|8080|27017"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
