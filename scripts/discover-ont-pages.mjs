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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    print("Login successful! Session cookie set.")
else:
    print("Login failed, no cookie:", sid_cookie)
    exit(1)

# 1. Fetch tr069.asp with proper referer
s.headers['Referer'] = 'https://172.19.61.5/html/ssmp/tr069/tr069.asp'
r_tr069 = s.get('https://172.19.61.5:80/html/ssmp/tr069/tr069.asp')
try:
    onttoken = r_tr069.text.split('id="onttoken"')[1].split('value="')[1].split('"')[0]
except Exception as e:
    onttoken = ''
print("Extracted onttoken:", onttoken)


# 2. Submit to set.cgi with all form fields
data_tr069 = {
    'x.EnableCWMP': '1',
    'x.PeriodicInformEnable': '1',
    'x.PeriodicInformInterval': '60',
    'x.PeriodicInformTime': '0001-01-01T00:00:00Z',
    'x.URL': 'http://10.200.0.1:7547',
    'x.Username': '',
    'x.Password': '',
    'x.ConnectionRequestUsername': 'genieacs',
    'x.ConnectionRequestPassword': 'admin',
    'x.X_HW_DSCP': '0',
    'x.X_HW_Token': onttoken
}

r_set = s.post('https://172.19.61.5:80/set.cgi?x=InternetGatewayDevice.ManagementServer&RequestFile=html/ssmp/tr069/tr069.asp', data=data_tr069)
print("set.cgi status:", r_set.status_code)
print("set.cgi text head:\\n", r_set.text[:300])


# 3. Check tr069.asp to see updated URL
r_check = s.get('https://172.19.61.5:80/html/ssmp/tr069/tr069.asp')
for line in r_check.text.splitlines():
    if 'stCWMP(' in line or 'cwmp =' in line:
        print("  [NEW CWMP]", line.strip())































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
