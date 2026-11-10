import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`
    echo "=== local_olts in chatbot.db ==="
    sqlite3 /root/chatbot/data/chatbot.db "SELECT * FROM local_olts;" || true
    echo "=== unconfigured_onus in chatbot.db ==="
    sqlite3 /root/chatbot/data/chatbot.db "SELECT count(*) FROM unconfigured_onus;" || true
    echo "=== olts in olt_manager.db ==="
    sqlite3 /root/chatbot/data/olt_manager.db "SELECT * FROM olts;" || true
    echo "=== wireguard_peers in olt_manager.db ==="
    sqlite3 /root/chatbot/data/olt_manager.db "SELECT * FROM wireguard_peers;" || true
  `, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d) => out += d);
    stream.on('close', () => {
      console.log('RESULTS:\n' + out);
      conn.end();
    });
  });
});
conn.on('error', (e) => console.log('SSH error:', e.message));
conn.connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
