import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado por SSH a Hostinger VPS (' + config.host + ')');

  const script = `
set -e
echo "=== 1. INSTALANDO WIREGUARD EN HOSTINGER VPS ==="
apt-get update -y
apt-get install -y wireguard qrencode

echo "=== 2. HABILITANDO REENVÍO DE PAQUETES IP (IP FORWARDING) ==="
sysctl -w net.ipv4.ip_forward=1
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf || true

echo "=== 3. GENERANDO LLAVES DEL SERVIDOR WIREGUARD SI NO EXISTEN ==="
mkdir -p /etc/wireguard
cd /etc/wireguard
umask 077

if [ ! -f server_private.key ]; then
  wg genkey | tee server_private.key | wg pubkey > server_public.key
fi

SERVER_PRIV=$(cat server_private.key)
SERVER_PUB=$(cat server_public.key)

echo "=== LLAVE PÚBLICA DEL SERVIDOR: $SERVER_PUB ==="

# Buscar la interfaz de red principal del VPS (ej: eth0, ens3, enp1s0)
MAIN_IFACE=$(ip route get 8.8.8.8 | awk -- '{print $5}' | head -n1)

cat << EOF > /etc/wireguard/wg0.conf
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIV
SaveConfig = false

# Reglas de enrutamiento NAT para llegar a las redes privadas de las OLTs
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o $MAIN_IFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o $MAIN_IFACE -j MASQUERADE

EOF

echo "=== 4. LEVANTANDO SERVICIO WIREGUARD (wg-quick) ==="
systemctl enable wg-quick@wg0 || true
systemctl restart wg-quick@wg0 || wg-quick up wg0 || true

echo "=== 5. ESTADO ACTUAL DE WIREGUARD ==="
wg show
`;

  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', (code) => {
      console.log('\n✅ WireGuard instalado en VPS con código:', code);
      conn.end();
    });
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
