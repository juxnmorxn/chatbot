import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    sqlite3 /root/chatbot/data/olt_manager.db "SELECT id, name, client_ip, allowed_subnets FROM wireguard_peers;"
    sqlite3 /root/chatbot/data/olt_manager.db "UPDATE wireguard_peers SET allowed_subnets = '172.19.60.0/24,172.19.52.0/24';"
    sqlite3 /root/chatbot/data/olt_manager.db "SELECT id, name, client_ip, allowed_subnets FROM wireguard_peers;"
    wg set wg0 peer "yZefKFMYoKu3yhgaJdhPqKuhS13OQebrcQ+BeE3+NHw=" allowed-ips "10.200.0.2/32,172.19.60.0/24,172.19.52.0/24"
    ip route replace 172.19.52.0/24 dev wg0
    wg show
  `;
  conn.exec(cmd, (err, stream) => {
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
