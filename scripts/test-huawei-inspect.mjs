import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established');
  // First, check ping to 172.19.61.5
  const cmd = `docker exec chatbot_app node -e "
    const { HuaweiOntDriver } = require('./drivers/huawei-ont');
    (async () => {
      try {
        console.log('Starting HuaweiOntDriver test to 172.19.61.5...');
        const d = new HuaweiOntDriver('172.19.61.5', 'Epadmin', 'adminEp');
        const loginRes = await d.login();
        console.log('Login result:', loginRes);
        
        // Let's check reboot page
        const rebootHtml = await d.fetchPage('/html/ssmp/reboot/reboot.asp');
        console.log('Reboot page fetched, len:', rebootHtml.length);
        const tokenMatch = rebootHtml.match(/id=\\"onttoken\\"\\s+name=\\"onttoken\\"\\s+value=\\"([^\\"]+)\\"/);
        console.log('Onttoken found:', tokenMatch ? tokenMatch[1] : 'NONE');

        // Let's check wan page
        const wanHtml = await d.fetchPage('/html/bbsp/wan/wan.asp');
        console.log('WAN page fetched, len:', wanHtml.length);
      } catch (e) {
        console.error('Error during test:', e);
      }
    })();
  "`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end());
    stream.on('data', data => process.stdout.write(data));
    stream.stderr.on('data', data => process.stderr.write(data));
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
