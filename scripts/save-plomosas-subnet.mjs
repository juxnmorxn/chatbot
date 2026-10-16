import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    sqlite3 /root/chatbot/data/olt_manager.db "UPDATE wireguard_peers SET allowed_subnets = '172.19.61.0/24' WHERE id = 'tunnel-1792165617003';"
    sqlite3 /root/chatbot/data/olt_manager.db "SELECT id, name, client_ip, allowed_subnets FROM wireguard_peers;"
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('DB Updated:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
