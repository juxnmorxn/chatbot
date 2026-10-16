import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pythonCmd = `python3 -c "
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.60.2', port=22, username='admin', password='password', look_for_keys=False, allow_agent=False)
shell = client.invoke_shell(term='vt100', width=200, height=100)
time.sleep(1)
shell.send('enable\\nterminal length 0\\n')
time.sleep(1)

def run(c):
    shell.send(c + '\\n')
    time.sleep(2)
    out = ''
    while shell.recv_ready():
        out += shell.recv(65535).decode('utf-8', errors='ignore')
    print('=== ' + c + ' ===')
    print(out)

run('show ont info gpon 1/0/1')
run('show ont wan gpon 1/0/1')
run('show ont optical-info gpon 1/0/1')
run('show ont version gpon 1/0/1')
run('show running-config | include ont')
client.close()
"`;

  conn.exec(pythonCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD || 'CloudWare1991@'
});
