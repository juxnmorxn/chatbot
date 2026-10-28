import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const curlCmd = `curl -s -i http://localhost:3001/modem-proxy/172.19.61.5/`;

  conn.exec(curlCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('PROXY HEADERS & STATUS:\n', out.slice(0, 500));
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
