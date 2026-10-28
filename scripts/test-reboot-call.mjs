import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established');
  
  // Call the reboot endpoint using curl on the VPS host itself
  const curlCmd = `curl -s -X POST http://localhost:3001/api/onus/HWTC-F4A0FEB3/reboot-modem-web -H "Content-Type: application/json" -d '{"ip":"172.19.61.5"}'`;

  conn.exec(curlCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', data => out += data);
    stream.on('close', () => {
      console.log('REBOOT RESPONSE:', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
