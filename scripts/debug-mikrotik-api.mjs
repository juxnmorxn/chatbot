import { Client } from 'ssh2';

const testScript = `
import net from 'net';

function encodeWord(word) {
  const buf = Buffer.from(word, 'utf8');
  const len = buf.length;
  let lenBuf;
  if (len < 0x80) lenBuf = Buffer.from([len]);
  else if (len < 0x4000) lenBuf = Buffer.from([((len >> 8) & 0x3f) | 0x80, len & 0xff]);
  else lenBuf = Buffer.from([0xc0, (len >> 16) & 0x1f, (len >> 8) & 0xff, len & 0xff]);
  return Buffer.concat([lenBuf, buf]);
}

function encodeSentence(words) {
  const bufs = words.map(encodeWord);
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

const socket = net.createConnection(8728, '172.19.60.254', () => {
  console.log('Connected to 8728, sending /login');
  socket.write(encodeSentence(['/login']));
});

socket.on('data', d => {
  console.log('RECV RAW LEN:', d.length, 'BYTES:', d.toString('latin1'));
  socket.end();
  process.exit(0);
});

socket.on('error', err => {
  console.error('SOCKET ERROR:', err);
});

setTimeout(() => {
  console.log('Timeout 4s');
  socket.end();
  process.exit(0);
}, 4000);
`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const ws = sftp.createWriteStream('/root/chatbot/test-mt.mjs');
    ws.end(testScript);
    ws.on('close', () => {
      conn.exec('docker cp /root/chatbot/test-mt.mjs chatbot_app:/app/test-mt.mjs && docker exec chatbot_app node /app/test-mt.mjs', (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.on('close', () => {
          conn.end();
          process.exit(0);
        });
      });
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
