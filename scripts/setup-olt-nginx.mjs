import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado por SSH a Hostinger VPS (' + config.host + ')');

  const setupScript = `
echo "=== 1. VERIFICANDO / INSTALANDO NGINX Y CERTBOT ==="
which nginx || (apt-get update -y && apt-get install -y nginx certbot python3-certbot-nginx)

echo "=== 2. CONFIGURANDO BLOQUE NGINX PARA olt.cloudwaremx.com (PUERTO 3001) ==="
cat << 'EOF' > /etc/nginx/sites-available/olt.cloudwaremx.com
server {
    listen 80;
    listen [::]:80;
    server_name olt.cloudwaremx.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/olt.cloudwaremx.com /etc/nginx/sites-enabled/

echo "=== 3. PROBANDO CONFIGURACIÓN NGINX ==="
nginx -t && systemctl reload nginx

echo "=== 4. SOLICITANDO CERTIFICADO SSL CON CERTBOT PARA olt.cloudwaremx.com ==="
certbot --nginx -d olt.cloudwaremx.com --non-interactive --agree-tos -m admin@cloudwaremx.com --redirect || true

nginx -t && systemctl reload nginx
echo "=== NGINX CONFIGURADO Y ACTIVO PARA olt.cloudwaremx.com ==="
`;

  conn.exec(setupScript, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', (code) => {
      console.log('\n✅ Proceso de Nginx en VPS finalizado con código:', code);
      conn.end();
    });
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
