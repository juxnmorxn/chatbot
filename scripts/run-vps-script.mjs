import { Client } from 'ssh2';
import fs from 'fs';

const localFile = process.argv[2];
const remotePath = '/tmp/remote_script.mjs';

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }
    const readStream = fs.createReadStream(localFile);
    const writeStream = sftp.createWriteStream(remotePath);
    readStream.pipe(writeStream);
    writeStream.on('close', () => {
      conn.exec(`docker cp ${remotePath} chatbot_app:/tmp/script.mjs && docker exec chatbot_app node /tmp/script.mjs`, (err, stream) => {
        if (err) {
          console.error('Exec error:', err);
          conn.end();
          return;
        }
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => {
          conn.end();
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
