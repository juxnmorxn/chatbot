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

# Fetch tr069.asp
r_tr = s.get('https://172.19.61.5:80/html/ssmp/tr069/tr069.asp')
m = re.search(r'value="([a-f0-9]{40,})"', r_tr.text)
onttoken = m.group(1) if m else ""
print("TR069 onttoken:", onttoken)

# Try setting ACS URL to http://10.200.0.1:7547
params = {
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
s.headers['Referer'] = 'https://172.19.61.5:80/html/ssmp/tr069/tr069.asp'
res = s.post('https://172.19.61.5:80/set.cgi?x=InternetGatewayDevice.ManagementServer&RequestFile=html/ssmp/tr069/tr069.asp', data=params)
print("POST TR069 status:", res.status_code)
print("POST TR069 headers:", dict(res.headers))
print("POST TR069 len:", len(res.text))
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
