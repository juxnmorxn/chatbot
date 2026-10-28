import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const testScript = `
import { TpLinkDeltaStreamDriver } from './dist/drivers/tplink-deltastream.js';
import { getOltDb } from './dist/db.js';

async function test() {
  const db = getOltDb();
  const res = await db.execute("SELECT * FROM olts WHERE id = 'olt-1792179789855'");
  const olt = res.rows[0];
  console.log('OLT:', olt.name, olt.ip);
  const driver = new TpLinkDeltaStreamDriver(olt);
  const out1 = await driver.executeCommand("enable\\nterminal length 0\\nont reset ?\\n");
  console.log('ont reset syntax:\\n', out1);
}
test().catch(console.error);
`;
  const stream = conn.exec('docker exec -i chatbot_app node --input-type=module', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
    stream.write(testScript);
    stream.end();
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
