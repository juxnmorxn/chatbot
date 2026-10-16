import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    docker exec chatbot_app node -e "
      const { TpLinkDeltaStreamDriver } = require('./olt-manager/drivers/tplink-deltastream.ts');
    " || docker exec chatbot_app node -e "
      // Let's test calling http://localhost:3001/api/onus
      fetch('http://localhost:3001/api/onus').then(r => r.json()).then(console.log).catch(console.error);
    "
  `;
  conn.exec(cmd, (err, stream) => {
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
