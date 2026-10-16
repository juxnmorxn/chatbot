import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    rm -f /tmp/jar.txt
    token=$(curl -s -k -X POST https://172.19.61.5:80/asp/GetRandCount.asp)
    b64pass=$(echo -n 'adminEp' | base64)

    echo "--- 1. Submitting login.cgi ---"
    token=$(curl -s -k -X POST https://172.19.61.5:80/asp/GetRandCount.asp | sed $'s/^\xef\xbb\xbf//' | tr -d '\r\n ')
    echo "Clean token: '\$token'"
    b64pass=$(echo -n 'adminEp' | base64)

    echo "--- Login POST with clean token and proper cookie ---"
    rm -f /tmp/test_cookie.txt
    curl -s -k -i -c /tmp/test_cookie.txt \
      -H "Cookie: Cookie=body:Language:english:id=-1" \
      -H "Referer: https://172.19.61.5/" \
      -X POST "https://172.19.61.5:80/login.cgi" \
      --data "UserName=Epadmin&PassWord=\${b64pass}&Language=english&x.X_HW_Token=\${token}" \
      > /tmp/clean_login.txt

    head -n 25 /tmp/clean_login.txt

    echo "--- Cookie file ---"
    cat /tmp/test_cookie.txt
    echo "--- Root status check ---"
    curl -s -k -b /tmp/test_cookie.txt https://172.19.61.5:80/ | grep -E "LoginTimes|FailStat|LockLeftTime"

























  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
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
