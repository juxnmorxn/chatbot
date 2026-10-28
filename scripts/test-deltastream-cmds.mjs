import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const curlCmd = `curl -s -X POST http://localhost:3001/api/onus/action -H "Content-Type: application/json" -d '{"oltId":"olt-1792179789855","action":"raw-cli","cmd":"interface gpon 1/0/1\\nont ?"}'`;

  // Wait, let's call raw command via node directly inside container
  const nodeCmd = `docker exec chatbot_app node -e "
    const { getOltDb } = require('./dist/db.js');
    const { TpLinkDeltaStreamDriver } = require('./dist/drivers/tplink-deltastream.js');
    (async () => {
      const db = getOltDb();
      const r = await db.execute('SELECT * FROM olts WHERE id = \\'olt-1792179789855\\'');
      const olt = r.rows[0];
      const driver = new TpLinkDeltaStreamDriver(olt);
      const res = await driver.executeCommand('enable\\nconfig\\ninterface gpon 1/0/1\\nont ?\\n', 5000);
      console.log('OUTPUT:\\n', res);
    })();
  "`;

  conn.exec(nodeCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('RESULT:\n', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
