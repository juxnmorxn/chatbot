import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established');
  
  // Inspect reboot page content and headers
  const cmd = `python3 -c "
import urllib.request, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Get token
req = urllib.request.Request('https://172.19.61.5:80/asp/GetRandCount.asp')
with urllib.request.urlopen(req, context=ctx) as res:
    token = res.read().decode().strip()
    cookie = res.headers.get('Set-Cookie', '')
print('Token:', token, 'Cookie:', cookie)

# 2. Login
import hashlib
# Huawei ONT standard login
print('Testing Huawei session...')
"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', data => out += data);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
