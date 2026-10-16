import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
# Connect to OLT Plomosas via SSH from VPS
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.19.70.253', port=22, username='admin', password='CloudWare1991', look_for_keys=False, allow_agent=False)
chan = ssh.invoke_shell()
import time
time.sleep(1)
chan.send('enable\\n')
time.sleep(0.5)
chan.send('terminal length 0\\n')
time.sleep(0.5)
chan.send('show gpon ont ?\\n')
time.sleep(1)
out = chan.recv(8192).decode('utf-8', errors='ignore')
print("OUTPUT:\\n", out)
ssh.close()
`;

  conn.exec(`python3 - << 'EOF'\n${pyCode}\nEOF\n`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error(d.toString()));
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
