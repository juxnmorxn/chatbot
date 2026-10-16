import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    # 1. Obtener Token dinámico de Huawei
    token=$(curl -s -k -X POST https://172.19.61.5:80/asp/GetRandCount.asp)
    echo "Obtained token: $token"

    # 2. Base64 del password adminEp
    b64pass=$(echo -n 'adminEp' | base64)

    # 3. Intentar Login con token x.X_HW_Token y Cookie de sesión
    rm -f /tmp/hw_cookie.txt /tmp/hw_login_resp.html /tmp/hw_headers.txt
    curl -s -k -c /tmp/hw_cookie.txt \\
      -H "Cookie: Cookie=body:Language:english:id=-1;path=/" \\
      -H "Referer: https://172.19.61.5/login.asp" \\
      -X POST "https://172.19.61.5:80/login.cgi" \\
      --data-urlencode "UserName=Epadmin" \\
      --data-urlencode "PassWord=\${b64pass}" \\
      --data-urlencode "Language=english" \\
      --data-urlencode "x.X_HW_Token=\${token}" \\
      -D /tmp/hw_headers.txt -o /tmp/hw_login_resp.html

    echo "=== HEADERS ==="
    cat /tmp/hw_headers.txt
    echo "=== COOKIES ==="
    cat /tmp/hw_cookie.txt
    echo "=== BODY ==="
    head -n 25 /tmp/hw_login_resp.html
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Login attempt with Token:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
