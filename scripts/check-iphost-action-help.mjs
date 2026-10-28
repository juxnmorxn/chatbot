import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const vpsCmd = `docker exec chatbot_app node -e '
    const { Client } = require("ssh2");
    const c = new Client();
    c.on("ready", () => {
      c.shell({ term: "vt100", cols: 160, rows: 60 }, (err, s) => {
        let out = "";
        s.on("data", d => out += d.toString("utf8"));
        const cmds = [
          "enable",
          "configure",
          "interface gpon 1/0/1",
          "ont iphost 0 1 action ?"
        ];
        let delay = 300;
        for (const cmd of cmds) {
          setTimeout(() => s.write(cmd + "\\r\\n"), delay);
          delay += 1000;
        }
        setTimeout(() => {
          console.log("=== ONT IPHOST ACTION HELP ===\\n", out);
          c.end();
        }, delay + 2500);
      });
    }).connect({
      host: "172.19.70.253",
      port: 22,
      username: "admin",
      password: "CloudWare1991",
      algorithms: {
        kex: ["curve25519-sha256", "diffie-hellman-group14-sha1", "diffie-hellman-group1-sha1"],
        cipher: ["aes128-ctr", "aes256-cbc", "aes128-cbc"],
        serverHostKey: ["ssh-rsa", "ssh-dss"],
        hmac: ["hmac-sha1", "hmac-sha2-256"]
      }
    });
  '`;
  conn.exec(vpsCmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Result:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
