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

# Print full WlanInfo
s.headers['Referer'] = 'https://172.19.61.5/html/amp/common/wlan_list.asp'
r_wlan = s.get('https://172.19.61.5:80/html/amp/common/wlan_list.asp')
for line in r_wlan.text.splitlines():
    if 'var WlanInfo = new Array(' in line:
        print("WLAN_INFO_RAW:", line)

# Look for all .asp links in index or navigation
r_index = s.get('https://172.19.61.5:80/index.asp')
links = set(re.findall(r'([a-zA-Z0-9_/]+\.asp)', r_index.text))
print("INDEX LINKS:", links)

# Check frame or menu
r_menu = s.get('https://172.19.61.5:80/html/content.asp')
links_menu = set(re.findall(r'([a-zA-Z0-9_/]+\.asp)', r_menu.text))
print("MENU LINKS:", links_menu)

# Try common wifi pages:
wifi_candidates = [
    '/html/amp/wlanbasic/wlanbasic.asp',
    '/html/amp/wlanadv/wlanadv.asp',
    '/html/amp/wlansecurity/wlansecurity.asp',
    '/html/amp/wlan5g/wlan5g.asp',
    '/html/amp/wlan/wlan.asp',
    '/html/amp/home/homewlan.asp',
    '/html/amp/wificonfig/wificonfig.asp',
    '/html/amp/wlanconfig/wlanconfig.asp',
    '/html/amp/wlan/wlan_5g.asp',
    '/html/bbsp/wlan/wlan.asp'
]

for url in wifi_candidates:
    s.headers['Referer'] = f'https://172.19.61.5{url}'
    res = s.get(f'https://172.19.61.5:80{url}')
    if res.status_code == 200 and len(res.text) > 500:
        print(f"FOUND VALID PAGE: {url} (length {len(res.text)})")
        for line in res.text.splitlines():
            if any(k in line.lower() for k in ['presharedkey', 'keypassphrase', 'cloudware', 'stsecurity', 'stkey', 'wpa']):
                print("   ", line.strip()[:140])
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
