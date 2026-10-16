import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests
import base64
import re
import urllib3
import json

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

s = requests.Session()
s.verify = False

# 1. Get token
r_tok = s.post('https://172.19.61.5:80/asp/GetRandCount.asp')
clean_tok = r_tok.text.lstrip('\\ufeff').strip()

# 2. Login
s.headers.update({
    'Referer': 'https://172.19.61.5/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})
s.cookies.set('Cookie', 'body:Language:english:id=-1', domain='172.19.61.5', path='/')

data = {
    'UserName': 'Epadmin',
    'PassWord': base64.b64encode(b'adminEp').decode(),
    'Language': 'english',
    'x.X_HW_Token': clean_tok
}

r_post = s.post('https://172.19.61.5:80/login.cgi', data=data)
sid_cookie = r_post.headers.get('Set-cookie', '')
m = re.search(r'Cookie=([^;]+)', sid_cookie)
if m:
    s.headers['Cookie'] = f"Cookie={m.group(1)}"
    print("LOGGED_IN_OK")
else:
    print("LOGIN_FAILED:", sid_cookie, r_post.text[:200])
    exit(1)

# Inspect WLAN basic / security pages for real SSID and WPA passwords
pages = [
    '/html/amp/common/wlan_list.asp',
    '/html/amp/wlanbasic/wlanbasic.asp',
    '/html/amp/wlansecurity/wlansecurity.asp',
    '/html/amp/opticinfo/opticinfo.asp',
    '/html/bbsp/common/wan_list.asp'
]

results = {}
for p in pages:
    s.headers['Referer'] = f'https://172.19.61.5{p}'
    r = s.get(f'https://172.19.61.5:80{p}')
    results[p] = r.text

for p, txt in results.items():
    print(f"=== PAGE: {p} ===")
    lines = [line.strip() for line in txt.splitlines() if line.strip() and not line.strip().startswith('//')]
    for line in lines:
        if any(k in line.lower() for k in ['stwan(', 'stopticinfo(', 'stwlan(', 'ssid', 'psk', 'password', 'key', 'pre-shared', 'wpa', 'rxpower', 'txpower', 'ipaddress', 'gateways']):
            print("  ", line[:150])
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
