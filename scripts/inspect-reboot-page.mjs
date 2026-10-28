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

# 1. Get token
r_tok = s.post('https://172.19.61.5:80/asp/GetRandCount.asp')
clean_tok = r_tok.text.lstrip('\\ufeff').strip()

# 2. Login
s.headers.update({
    'Referer': 'https://172.19.61.5/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
cookie_val_match = re.search(r'Cookie=([^;]+)', sid_cookie)
if cookie_val_match:
    auth_cookie = f"Cookie={cookie_val_match.group(1)}"
    s.headers['Cookie'] = auth_cookie

# Check reboot page
r_reboot = s.get('https://172.19.61.5:80/html/ssmp/reboot/reboot.asp')
print("Reboot page status:", r_reboot.status_code)
onttoken = re.search(r'name="onttoken"\\s+value="([^"]+)"', r_reboot.text)
token_val = onttoken.group(1) if onttoken else ""
print("onttoken in reboot page:", token_val)

# Check all form actions in reboot page
forms = re.findall(r'<form[^>]+action="([^"]+)"', r_reboot.text)
print("Reboot forms:", forms)

# Check onclick or js functions in reboot page
js_funcs = re.findall(r'function\\s+([a-zA-Z0-9_]+)\\s*\\(', r_reboot.text)
print("Reboot JS functions:", js_funcs)
`;

  conn.exec(`python3 - << 'EOF'\n${pyCode}\nEOF\n`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => console.error('STDERR:', d.toString()));
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
