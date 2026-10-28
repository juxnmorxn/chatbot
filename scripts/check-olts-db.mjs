import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /root/chatbot/olt-manager/olt_manager.db "SELECT id, name, ip, port, username, password FROM olts;"', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d) => out += d);
    stream.on('close', () => {
      console.log('OLTS:\n' + out);
      conn.end();
    });
  });
});
conn.on('error', (e) => console.log('SSH error:', e.message));
conn.connect({ host: '2.25.241.239', port: 22, username: 'root' });
