import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    b64pass=$(echo -n 'adminEp' | base64)
    rm -f /tmp/huawei_cookie.txt /tmp/huawei_resp.html
    curl -s -k -c /tmp/huawei_cookie.txt \\
      -H "Cookie: Cookie=body:Language:english:id=-1;path=/" \\
      -H "Referer: https://172.19.61.5/login.asp" \\
      -X POST "https://172.19.61.5:80/login.cgi" \\
      --data "UserName=Epadmin&PassWord=\${b64pass}&Language=english" \\
      -D /tmp/huawei_headers.txt -o /tmp/huawei_resp.html

    echo "=== HEADERS ==="
    cat /tmp/huawei_headers.txt
    echo "=== COOKIES ==="
    cat /tmp/huawei_cookie.txt
    echo "=== BODY ==="
    head -n 20 /tmp/huawei_resp.html
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Test login:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
