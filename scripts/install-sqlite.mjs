import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('apt-get update -qq && apt-get install -y -qq sqlite3', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('sqlite3 install complete');
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
