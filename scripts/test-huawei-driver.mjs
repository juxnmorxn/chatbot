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

class HuaweiOntClient:
    def __init__(self, ip, username="Epadmin", password="adminEp"):
        self.ip = ip
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.verify = False
        self.sid = None
        self.base_url = f"https://{ip}:80"

    def login(self):
        # 1. Get token
        r_tok = self.session.post(f"{self.base_url}/asp/GetRandCount.asp", timeout=5)
        clean_tok = r_tok.text.lstrip('\\ufeff').strip()

        # 2. Login submit
        self.session.headers.update({
            'Referer': f"{self.base_url}/",
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        self.session.cookies.set('Cookie', 'body:Language:english:id=-1', domain=self.ip, path='/')

        data = {
            'UserName': self.username,
            'PassWord': base64.b64encode(self.password.encode()).decode(),
            'Language': 'english',
            'x.X_HW_Token': clean_tok
        }

        r_post = self.session.post(f"{self.base_url}/login.cgi", data=data, timeout=5)
        sid_cookie = r_post.headers.get('Set-cookie', '')
        m = re.search(r'Cookie=([^;]+)', sid_cookie)
        if m:
            self.sid = m.group(1)
            self.session.headers['Cookie'] = f"Cookie={self.sid}"
            return True, "OK"
        return False, f"Failed login: {sid_cookie}"

    def decode_hex(self, s):
        def repl(match):
            return chr(int(match.group(1), 16))
        return re.sub(r'\\\\x([0-9a-fA-F]{2})', repl, s)

    def get_full_info(self):
        ok, msg = self.login()
        if not ok:
            return {"error": msg}

        info = {"ip": self.ip, "login": "success"}

        # 1. Device Info
        self.session.headers['Referer'] = f"{self.base_url}/html/ssmp/deviceinfo/deviceinfo.asp"
        r_dev = self.session.get(f"{self.base_url}/html/ssmp/deviceinfo/deviceinfo.asp", timeout=5)
        m_dev = re.search(r'new\\s+stDeviceInfo\\((.*?)\\)', self.decode_hex(r_dev.text))
        if m_dev:
            parts = [p.strip('"\\' ') for p in m_dev.group(1).split(',')]
            if len(parts) >= 6:
                info["model"] = parts[2]
                info["serial"] = parts[3]
                info["hardwareVersion"] = parts[4]
                info["softwareVersion"] = parts[5]

        # 2. Optical Info
        self.session.headers['Referer'] = f"{self.base_url}/html/amp/opticinfo/opticinfo.asp"
        r_opt = self.session.get(f"{self.base_url}/html/amp/opticinfo/opticinfo.asp", timeout=5)
        m_opt = re.search(r'new\\s+stOpticInfo\\((.*?)\\)', self.decode_hex(r_opt.text))
        if m_opt:
            parts = [p.strip('"\\' ') for p in m_opt.group(1).split(',')]
            if len(parts) >= 7:
                info["txPower"] = f"{parts[2].strip()} dBm"
                info["rxPower"] = f"{parts[3].strip()} dBm"
                info["voltage"] = f"{int(parts[4])/1000.0:.2f} V" if parts[4].isdigit() else parts[4]
                info["temperature"] = f"{parts[5]} °C"
                info["biasCurrent"] = f"{parts[6]} mA"

        # 3. WAN Info
        self.session.headers['Referer'] = f"{self.base_url}/html/bbsp/common/wan_list.asp"
        r_wan = self.session.get(f"{self.base_url}/html/bbsp/common/wan_list.asp", timeout=5)
        wan_decoded = self.decode_hex(r_wan.text)
        m_wan = re.search(r'new\\s+stWan\\((.*?)\\)', wan_decoded)
        if m_wan:
            parts = [p.strip('"\\' ') for p in m_wan.group(1).split(',')]
            info["wanRawCount"] = len(parts)
            # Find MAC in decoded text
            mac_m = re.search(r'([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})', wan_decoded)
            if mac_m:
                info["mac"] = mac_m.group(1).upper()
            ip_m = re.search(r'(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})', wan_decoded)
            if ip_m:
                info["wanIp"] = ip_m.group(1)

        # 4. WLAN Info
        self.session.headers['Referer'] = f"{self.base_url}/html/amp/common/wlan_list.asp"
        r_wlan = self.session.get(f"{self.base_url}/html/amp/common/wlan_list.asp", timeout=5)
        wlan_decoded = self.decode_hex(r_wlan.text)
        wlan_matches = re.findall(r'new\\s+stWlanInfo\\((.*?)\\)', wlan_decoded)
        ssids = []
        for wm in wlan_matches:
            wparts = [p.strip('"\\' ') for p in wm.split(',')]
            if len(wparts) >= 6 and wparts[2]:
                ssids.append({
                    "name": wparts[1],
                    "ssid": wparts[2],
                    "enabled": wparts[4] == "1",
                    "band": wparts[5]
                })
        info["wifi"] = ssids

        # 5. TR-069 Info
        self.session.headers['Referer'] = f"{self.base_url}/html/ssmp/tr069/tr069.asp"
        r_tr = self.session.get(f"{self.base_url}/html/ssmp/tr069/tr069.asp", timeout=5)
        tr_decoded = self.decode_hex(r_tr.text)
        m_tr = re.search(r'new\\s+stCWMP\\((.*?)\\)', tr_decoded)
        if m_tr:
            parts = [p.strip('"\\' ') for p in m_tr.group(1).split(',')]
            if len(parts) >= 6:
                info["tr069"] = {
                    "enabled": parts[1] == "1",
                    "inform": parts[2] == "1",
                    "interval": parts[3],
                    "url": parts[5]
                }

        return info

client = HuaweiOntClient('172.19.61.5')
res = client.get_full_info()
print(json.dumps(res, indent=2))
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
