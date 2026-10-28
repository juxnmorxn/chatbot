import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const curlCmd = `curl -s -X POST http://localhost:3001/api/onus/HWTC-F4A0FEB3/set-tr069-web -H "Content-Type: application/json" -d '{"ip":"172.19.61.5","acsUrl":"http://10.200.0.1:7547"}'`;

  conn.exec(curlCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('SET TR069 RESULT:', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
