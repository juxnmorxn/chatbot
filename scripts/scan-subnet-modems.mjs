import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const nodeCode = `
    const net = require('net');

    async function scanSubnet(baseSubnet) {
      console.log('Scanning subnet ' + baseSubnet + '.0/24 for HTTP port 80...');
      const start = Date.now();
      const promises = [];
      const found = [];

      for (let i = 1; i <= 254; i++) {
        const ip = baseSubnet + '.' + i;
        const p = new Promise(resolve => {
          const s = new net.Socket();
          s.setTimeout(800);
          s.on('connect', () => {
            found.push(ip);
            s.destroy();
            resolve(ip);
          });
          s.on('timeout', () => { s.destroy(); resolve(null); });
          s.on('error', () => { s.destroy(); resolve(null); });
          s.connect(80, ip);
        });
        promises.push(p);
      }

      await Promise.all(promises);
      console.log('Scan completed in ' + (Date.now() - start) + 'ms');
      console.log('Responding IPs on port 80:', found);
    }

    async function run() {
      await scanSubnet('172.19.61');
      await scanSubnet('172.19.60');
    }
    run();
  `;

  conn.exec(`docker exec chatbot_app node -e "${nodeCode.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error(d.toString()));
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
