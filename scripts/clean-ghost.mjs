import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `docker exec chatbot_app node -e "import('@libsql/client').then(async ({ createClient }) => { const db = createClient({ url: 'file:/app/olt_manager.db' }); const res = await db.execute({ sql: 'DELETE FROM provisioned_onts WHERE serial = ?', args: ['HWTC-F4A0FEB3'] }); console.log('Rows affected:', res.rowsAffected); });"`;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Cleaned ghost records:', out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
