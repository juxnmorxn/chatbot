import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null | grep -E "olt.cloudwaremx|proxy_pass|listen"', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('NGINX CONFIG:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
