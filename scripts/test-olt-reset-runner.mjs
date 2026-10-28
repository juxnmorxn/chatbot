import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established');
  // Call executeCommand on Plomosas OLT (172.19.70.253) to reboot ont 0 on gpon 1/0/1
  const cmd = `docker exec chatbot_app node -e "
    const { getOltDb } = require('./db');
    const { TpLinkDeltaStreamDriver } = require('./drivers/tplink-deltastream');
    (async () => {
      try {
        const db = getOltDb();
        const r = await db.execute('SELECT * FROM olts WHERE name LIKE \\'%plomosas%\\'');
        const olt = r.rows[0];
        console.log('Found OLT:', olt.name, olt.ip);
        const driver = new TpLinkDeltaStreamDriver(olt);
        console.log('Sending ont reset gpon 1/0/1 0...');
        const res = await driver.rebootOnt('1/0/1', 0);
        console.log('Reset result:', JSON.stringify(res));
      } catch (e) {
        console.error('Error:', e);
      }
    })();
  "`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error('STDERR:', d.toString()));
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
