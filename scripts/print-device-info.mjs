import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests, base64, re, urllib3
urllib3.disable_warnings()
s = requests.Session()
s.verify = False
tok = s.post('https://172.19.61.5:80/asp/GetRandCount.asp').text.lstrip(r'\\ufeff').strip()
s.cookies.set('Cookie', 'body:Language:english:id=-1', domain='172.19.61.5', path='/')
r = s.post('https://172.19.61.5:80/login.cgi', data={'UserName':'Epadmin','PassWord':base64.b64encode(b'adminEp').decode(),'Language':'english','x.X_HW_Token':tok})
sid_m = re.search(r'Cookie=([^;]+)', r.headers.get('Set-cookie',''))
if not sid_m:
    print("SESSION COOKIES:", dict(s.cookies))
    print("SET COOKIE HEADER:", r.headers.get('Set-cookie', 'NONE'))
    print("STATUS:", r.status_code)
    exit(0)
s.headers['Cookie'] = 'Cookie=' + sid_m.group(1)
s.headers['Referer'] = 'https://172.19.61.5/html/ssmp/deviceinfo/deviceinfo.asp'
txt = s.get('https://172.19.61.5:80/html/ssmp/deviceinfo/deviceinfo.asp').text
for line in txt.splitlines():
    if 'stDeviceInfo' in line:
        print(line)
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
