import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cnt=$(curl -s -k https://172.19.61.5:80/asp/GetRandCount.asp)
    echo "RandCount: $cnt"

    # Ver el script safelogin.js completo para la encriptación
    curl -s -k https://172.19.61.5:80/resource/common/RndSecurityFormat.js | head -n 45
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
