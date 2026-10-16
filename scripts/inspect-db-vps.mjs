import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const nodeScript = `
    const { createClient } = require('@libsql/client');
    const db = createClient({ url: 'file:/app/data/olt_manager.db' });
    async function main() {
      console.log('=== OLTS ===');
      const olts = await db.execute('SELECT id, name, ip, default_vlan, community, tunnel_id, mikrotik_name FROM olts');
      console.log(JSON.stringify(olts.rows, null, 2));
      
      console.log('=== PROVISIONED ONTS ===');
      const onts = await db.execute('SELECT id, olt_id, gpon_port, onu_id, serial, client_name, ip_address, gateway, wifi_ssid, wifi_password FROM provisioned_onts');
      console.log(JSON.stringify(onts.rows, null, 2));

      console.log('=== WIREGUARD PEERS ===');
      const peers = await db.execute('SELECT id, name, client_ip, allowed_subnets FROM wireguard_peers');
      console.log(JSON.stringify(peers.rows, null, 2));
    }
    main().catch(console.error);
  `;
  conn.exec(`docker exec chatbot_app node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
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
