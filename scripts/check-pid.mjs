import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    ls -l /proc/274044/cwd /proc/274044/exe || true
    cat /proc/274044/cmdline | tr '\0' ' ' || true
    echo ""
    ps aux | grep node
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
