import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `curl -s -k -i https://172.19.61.5:80/index.asp`;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('index.asp response:\n' + out.substring(0, 500));
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
