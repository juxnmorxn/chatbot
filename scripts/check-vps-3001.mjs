import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s http://localhost:3001/api/olts && echo "" && curl -s "http://localhost:3001/api/onus/HWTC-F4A0FEB3/live-web?oltId=olt-1792179789855&ip=172.19.61.5"', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('PORT 3001 OUTPUT:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
