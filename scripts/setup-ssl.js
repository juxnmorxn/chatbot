import { Client } from 'ssh2';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('deploy.config.json', 'utf8'));
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado por SSH a Hostinger VPS');

  const nginxConfig = `
# Configuración Nginx para CloudWareMx
server {
    listen 80;
    listen [::]:80;
    server_name portal.cloudwaremx.com app.cloudwaremx.com chatbot.cloudwaremx.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
`;

  const setupScript = `
cd /root/chatbot

# 1. Actualizar docker-compose para liberar puerto 80
sed -i '/- "80:3000"/d' docker-compose.yml || true
docker compose up -d

# 2. Instalar Nginx y Certbot
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# 3. Guardar configuración Nginx inicial
cat << 'EOF' > /etc/nginx/sites-available/cloudware
server {
    listen 80;
    listen [::]:80;
    server_name portal.cloudwaremx.com app.cloudwaremx.com chatbot.cloudwaremx.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
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

ln -sf /etc/nginx/sites-available/cloudware /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true
nginx -t && systemctl restart nginx

# 4. Obtener certificados SSL con Certbot para todos los subdominios
certbot --nginx -d portal.cloudwaremx.com -d app.cloudwaremx.com -d chatbot.cloudwaremx.com --non-interactive --agree-tos -m admin@cloudwaremx.com --redirect || true

nginx -t && systemctl reload nginx
echo "=== NGINX CON SSL CONFIGURADO EXITOSAMENTE ==="
`;

  conn.exec(setupScript, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', (code) => {
      console.log('\n✅ Proceso completado con código:', code);
      conn.end();
    });
  });
}).connect({
  host: config.host,
  port: config.port || 22,
  username: config.username,
  password: config.password
});
