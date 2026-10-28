import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const vpsCmd = `docker exec chatbot_app node -e '
    const { Client } = require("ssh2");
    const c = new Client();
    c.on("ready", () => {
      c.shell({ term: "vt100", cols: 160, rows: 60 }, (err, s) => {
        let out = "";
        s.on("data", d => {
          out += d.toString("utf8");
          if (out.includes("--More--")) s.write(" ");
        });
        const cmds = [
          "enable",
          "terminal length 0",
          "configure",
          "interface gpon 1/0/1",
          " ont add 0 sn-auth HWTC-F4A0FEB3 desc \\"CLIENTE_TEST\\" ont-lineprofile-id 1 ont-srvprofile-id 1 ont-srvport-profile-id 1",
          " ont iphost 0 1 static ip-address 172.19.61.8 mask 255.255.255.0 gateway 172.19.61.1 primary-dns 8.8.8.8 secondary-dns 8.8.4.4 vlan 300 priority 0",
          " ont iphost 0 1 action push",
          " ont cwmp 0 url http://10.200.0.1:7547",
          " ont cwmp 0 action push",
          "exit",
          "service-port 128 config gpon 1/0/1 ont 0 gem-id 1 svlan 300 user-vlan 300 tag-action translate desc \\"CLIENTE_TEST\\"",
          "end",
          "copy running-config startup-config"
        ];
        let delay = 300;
        for (const cmd of cmds) {
          setTimeout(() => s.write(cmd + "\\r\\n"), delay);
          delay += 800;
        }
        setTimeout(() => {
          console.log("=== OLT FULL PROVISION + PERSISTENT SAVE ===\\n", out);
          c.end();
        }, delay + 4000);
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
