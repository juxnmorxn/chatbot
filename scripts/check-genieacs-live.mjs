import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const vpsCmd = `docker exec chatbot_app node -e '
    fetch("http://localhost:7557/devices/?projection=_id,_lastInform,InternetGatewayDevice.DeviceInfo.SerialNumber,InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress")
      .then(r => r.json())
      .then(d => console.log("GENIEACS DEVICES:", JSON.stringify(d, null, 2)))
      .catch(e => console.error("ERR:", e));
  '`;
  conn.exec(vpsCmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
