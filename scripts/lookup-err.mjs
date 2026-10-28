import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const pyCode = `
import requests
import re
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

s = requests.Session()
s.verify = False

r = s.get('https://172.19.61.5:80/resource/english/errdes.html')
m = re.search(r's0xf7201002[^\\n]+', r.text)
if m:
    print("Error description:", m.group(0))
else:
    print("Looking for 0xf7201002 in errdes.html:")
    for line in r.text.split('\\n'):
        if '0xf7201002' in line or 'f7201002' in line:
            print("  ", line)
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
