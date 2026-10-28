import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `docker exec chatbot_app node -e "
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/olt_manager.db' });
      const r = await db.execute('SELECT id, name, ip, port, username, password FROM olts');
      console.log('OLTS:', JSON.stringify(r.rows, null, 2));
    });
  "`;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
