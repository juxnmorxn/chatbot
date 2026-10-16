import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('sqlite3 /root/chatbot/data/olt_manager.db "SELECT * FROM provisioned_onts;"', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('provisioned_onts in DB:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
