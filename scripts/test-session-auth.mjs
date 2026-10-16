import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    # Obtener token
    token=$(curl -s -k -X POST https://172.19.61.5:80/asp/GetRandCount.asp)
    b64pass=$(echo -n 'adminEp' | base64)

    # Enviar login a /login.cgi con follow redirects (-L)
    curl -s -k -c /tmp/hw_session.txt \\
      -b "Cookie=body:Language:english:id=-1;path=/" \\
      -H "Referer: https://172.19.61.5/login.asp" \\
      -X POST "https://172.19.61.5:80/login.cgi" \\
      -d "UserName=Epadmin" \\
      -d "PassWord=\${b64pass}" \\
      -d "Language=english" \\
      -d "x.X_HW_Token=\${token}"

    echo "=== SESSION COOKIES ==="
    cat /tmp/hw_session.txt

    echo "=== MAIN PAGE AFTER LOGIN ==="
    curl -s -k -b /tmp/hw_session.txt -H "Referer: https://172.19.61.5/login.asp" https://172.19.61.5:80/index.asp | head -n 35
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
