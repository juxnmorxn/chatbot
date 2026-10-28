import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const curlCmd = `curl -s -X POST http://localhost:3001/api/tr069/devices/HWTC-F4A0FEB3/wan -H "Content-Type: application/json" -d '{"oltId":"olt-1792179789855","gponPort":"1/0/1","onuId":0,"vlanId":300,"onuMode":"Routing","wanMode":"Static","configMethod":"OMCI","ip":"172.19.61.8","mask":"255.255.255.0","gateway":"172.19.61.1"}'`;

  conn.exec(curlCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('OMCI WAN RESULT:\n', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
