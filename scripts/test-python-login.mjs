import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests
import base64
import re
import time
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

s = requests.Session()
s.verify = False

# 1. Check root
r = s.get('https://172.19.61.5:80/')
m = re.search(r"LockLeftTime\\s*=\\s*'(\\d+)'", r.text)
lock = int(m.group(1)) if m else 0
print(f"Current lock: {lock}s")
if lock > 0:
    print(f"Sleeping {lock + 2}s...")
    time.sleep(lock + 2)

# Check LoginTimes
m_lt = re.search(r"LoginTimes\\s*=\\s*'(\\d+)'", r.text)
print("LoginTimes before:", m_lt.group(1) if m_lt else "unknown")

# 2. Get token
r_tok = s.post('https://172.19.61.5:80/asp/GetRandCount.asp')
raw_tok = r_tok.text
clean_tok = raw_tok.lstrip('\\ufeff').strip()
print("Token:", clean_tok)

# 3. Prepare credentials
username = 'Epadmin'
password_plain = 'adminEp'
password_b64 = base64.b64encode(password_plain.encode()).decode()
print(f"Username: {username}, Password B64: {password_b64}")

# 4. Set initial cookie as browser does
s.headers.update({
    'Referer': 'https://172.19.61.5/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})
s.cookies.set('Cookie', 'body:Language:english:id=-1', domain='172.19.61.5', path='/')

data = {
    'UserName': username,
    'PassWord': password_b64,
    'Language': 'english',
    'x.X_HW_Token': clean_tok
}

r_post = s.post('https://172.19.61.5:80/login.cgi', data=data)
print("POST status:", r_post.status_code)
print("POST headers:", dict(r_post.headers))
print("Session cookies after POST:", s.cookies.get_dict())
sid_cookie = r_post.headers.get('Set-cookie', '')
print("Raw Set-cookie:", sid_cookie)

# Extract cookie value: Cookie=sid=...:Language:english:id=1
cookie_val_match = re.search(r'Cookie=([^;]+)', sid_cookie)
if cookie_val_match:
    auth_cookie = f"Cookie={cookie_val_match.group(1)}"
    print("Extracted auth cookie:", auth_cookie)
    # Set this in headers for all following requests
    s.headers['Cookie'] = auth_cookie

# 5. Now check all menu items in index.asp
r_index = s.get('https://172.19.61.5:80/index.asp')
print("--- Found ASP/HTML URLs in index.asp ---")
urls = set(re.findall(r'([a-zA-Z0-9_\/]+\.(?:asp|html))', r_index.text))
for u in sorted(urls):
    if not u.startswith('resource'):
        print("  ", u)



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
