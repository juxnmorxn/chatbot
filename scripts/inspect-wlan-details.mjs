import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests
import base64
import re
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

s = requests.Session()
s.verify = False

r_tok = s.post('https://172.19.61.5:80/asp/GetRandCount.asp')
clean_tok = r_tok.text.lstrip('\\ufeff').strip()

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
s.headers['Cookie'] = f"Cookie={m.group(1)}"

# 1. Device Info
s.headers['Referer'] = 'https://172.19.61.5/html/ssmp/deviceinfo/deviceinfo.asp'
r_dev = s.get('https://172.19.61.5:80/html/ssmp/deviceinfo/deviceinfo.asp')
print("=== DEVICE INFO ===")
for line in r_dev.text.splitlines():
    if any(k in line for k in ['stDeviceInfo', 'ProductClass', 'HardwareVersion', 'SoftwareVersion', 'SerialNumber', 'UpTime']):
        print("  ", line.strip()[:140])

# 2. 2.4G Basic Wi-Fi
s.headers['Referer'] = 'https://172.19.61.5/html/amp/wlanbasic/WlanBasic.asp?2G'
r_2g = s.get('https://172.19.61.5:80/html/amp/wlanbasic/WlanBasic.asp?2G')
print("=== 2.4G WLAN BASIC ===")
for line in r_2g.text.splitlines():
    if any(k in line.lower() for k in ['new stwlan(', 'new stwlaninfo(', 'presharedkey', 'keypassphrase', 'wpa', 'ssid', 'wpapsk']):
        print("  ", line.strip()[:140])

# 3. 5G Basic Wi-Fi
s.headers['Referer'] = 'https://172.19.61.5/html/amp/wlanbasic/WlanBasic.asp?5G'
r_5g = s.get('https://172.19.61.5:80/html/amp/wlanbasic/WlanBasic.asp?5G')
print("=== 5G WLAN BASIC ===")
for line in r_5g.text.splitlines():
    if any(k in line.lower() for k in ['new stwlan(', 'new stwlaninfo(', 'presharedkey', 'keypassphrase', 'wpa', 'ssid', 'wpapsk']):
        print("  ", line.strip()[:140])
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
