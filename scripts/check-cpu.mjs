import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec("grep -m 1 'model name' /proc/cpuinfo; grep -m 1 'flags' /proc/cpuinfo | grep -o 'avx[0-9]*'", (err, stream) => {
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
