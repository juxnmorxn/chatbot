import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const curlCmd = `curl -s -X POST http://localhost:3001/api/onus/action -H "Content-Type: application/json" -d '{"oltId":"olt-1792179789855","gponPort":"1/0/1","onuId":0,"action":"toggle-active","active":false}'`;

  conn.exec(curlCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('DEACTIVATE RESULT:\n', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
