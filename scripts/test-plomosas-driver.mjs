import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
    const { TpLinkDeltaStreamDriver } = require('/app/dist/olt-manager/drivers/tplink-deltastream.js');
    async function main() {
      const olt = {
        id: 'olt-plomosas',
        name: 'plomosas',
        ip: '172.19.70.253',
        port: 22,
        username: 'admin',
        password: 'CloudWare1991',
        totalGponPorts: 1
      };
      const driver = new TpLinkDeltaStreamDriver(olt);
      console.log('Testing connection to OLT Plomosas...');
      const test = await driver.testConnection();
      console.log('Connection test:', test);
      if (test.online) {
        console.log('Getting ONTs on 1/0/1...');
        const onts = await driver.getConfiguredOnts('1/0/1');
        console.log('ONTs found:', JSON.stringify(onts, null, 2));
      }
    }
    main().catch(console.error);
  `;
  conn.exec(`docker exec chatbot_app node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
