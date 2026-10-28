import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const checkScript = `
const fetch = globalThis.fetch;
async function test() {
  const url = 'http://localhost:3001/api/onus/HWTC-F4A0FEB3/live-web?oltId=olt-1792179789855&ip=172.19.61.5';
  console.log('Fetching', url);
  const r = await fetch(url);
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Data:', JSON.stringify(data));
}
test().catch(console.error);
`;
  const stream = conn.exec('docker exec -i chatbot_app node', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
    stream.write(checkScript);
    stream.end();
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
