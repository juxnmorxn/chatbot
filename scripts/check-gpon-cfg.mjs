import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec("docker exec -i chatbot_app sh -c 'node -e \"const net=require(\\\"net\\\"); const s=net.createConnection(23, \\\"172.19.60.2\\\", ()=>{ s.write(\\\"admin\\\\r\\\\nCloudWare1991\\\\r\\\\nenable\\\\r\\\\nterminal length 0\\\\r\\\\nshow running-config interface gpon 1/0/1\\\\r\\\\nexit\\\\r\\\\n\\\"); }); s.on(\\\"data\\\", d=>process.stdout.write(d.toString())); setTimeout(()=>process.exit(0), 4000);\"'", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
