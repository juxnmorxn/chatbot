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

s.headers['Referer'] = 'https://172.19.61.5/html/amp/wlanbasic/WlanBasic.asp?2G'
r_2g = s.get('https://172.19.61.5:80/html/amp/wlanbasic/WlanBasic.asp?2G')

lines = r_2g.text.splitlines()
in_apply = False
apply_lines = []
for i, line in enumerate(lines):
    if 'function OnApply' in line or 'function CheckForm' in line or 'function Submit' in line:
        in_apply = True
    if in_apply:
        apply_lines.append(f"L{i}: {line}")
        if len(apply_lines) > 80:
            break

print("\\n".join(apply_lines))
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
