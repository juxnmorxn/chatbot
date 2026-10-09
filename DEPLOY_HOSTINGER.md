# Guía de Despliegue en Git y Hostinger

Esta guía explica paso a paso cómo conectar este repositorio a **Git (GitHub / GitLab)** y desplegar la aplicación en **Hostinger** (tanto en **Hostinger VPS** como en **Hostinger Web/Cloud Hosting con Node.js en hPanel**).

---

## 1. Subir el Proyecto a Git (GitHub / GitLab)

El repositorio local ya está inicializado en la rama `main`. Para conectarlo a tu cuenta de GitHub o GitLab:

### Paso 1: Crea un nuevo repositorio en GitHub o GitLab
1. Ve a [github.com/new](https://github.com/new).
2. Ponle un nombre al repositorio (por ejemplo: `chatbot-isp`).
3. Déjalo **vacío** (no agregues README ni .gitignore inicial).

### Paso 2: Conecta y sube tu código
Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Agregar el enlace a tu repositorio remoto (reemplaza con tu URL de GitHub)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 2. Asegurar que estás en la rama principal
git branch -M main

# 3. Subir todos los archivos
git push -u origin main
```

---

## 2. Despliegue en Hostinger VPS (Opción Recomendada)

Para un bot de WhatsApp con Evolution API, SmartOLT y SQLite 24/7, **Hostinger VPS** con Ubuntu 22.04 o 24.04 es la opción ideal y más estable.

### Opción A: Despliegue con Node.js + PM2 (Nativo)

1. **Conéctate por SSH a tu VPS de Hostinger:**
   ```bash
   ssh root@TU_IP_VPS
   ```

2. **Instala Node.js 22, Git y PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   npm install -g pm2
   ```

3. **Clona tu repositorio de Git:**
   ```bash
   cd /var/www
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git chatbot-isp
   cd chatbot-isp
   ```

4. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Rellena tus credenciales (GEMINI_API_KEY, GROQ_API_KEY, EVOLUTION_URL, WISPHUB, SMARTOLT, etc.).*

5. **Instala dependencias y compila:**
   ```bash
   npm install
   npm run build
   ```

6. **Inicia el servicio con PM2 (Mantiene el servidor vivo tras reinicios):**
   ```bash
   pm2 start dist/server.js --name "isp-chatbot"
   pm2 startup
   pm2 save
   ```

---

### Opción B: Despliegue con Docker y Docker Compose

Si prefieres contenedores:

1. **Clona el repositorio en tu VPS:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git /var/www/chatbot-isp
   cd /var/www/chatbot-isp
   ```
2. **Crea el archivo `.env`:**
   ```bash
   cp .env.example .env
   nano .env
   ```
3. **Levanta el contenedor en segundo plano:**
   ```bash
   docker compose up -d --build
   ```

---

## 3. Despliegue en Hostinger Web / Cloud Hosting (hPanel Node.js)

Si cuentas con un plan de Hosting Empresarial o Cloud Hosting con soporte de Node.js en hPanel:

1. **Sube el código:**
   - Ve a **hPanel > Git** y clona el repositorio directamente desde tu URL de GitHub.
   - O sube los archivos mediante el Administrador de Archivos / FTP (asegúrate de incluir `server.js`, `package.json`, `dist/` y `src/`).

2. **Configura la Aplicación Node.js en hPanel:**
   - Ve a **hPanel > Avanzado > Aplicación Node.js**.
   - Haz clic en **Crear aplicación**.
   - **Versión de Node.js:** Selecciona `Node.js 20.x` o `Node.js 22.x`.
   - **Directorio raíz de la aplicación:** La carpeta donde subiste el proyecto (por ejemplo `public_html/chatbot` o `/`).
   - **Archivo de inicio de la aplicación:** Escribe `server.js` (o `dist/server.js`).
   - **Modo:** `Production`.

3. **Instala dependencias y compila:**
   - En el panel de control de Node.js, presiona **NPM Install**.
   - Si tienes acceso a la consola SSH / Terminal de hPanel, ejecuta:
     ```bash
     npm run build
     ```
   - Haz clic en **Iniciar / Reiniciar aplicación**.

---

## 4. Configurar Dominio y Certificado SSL (Nginx Reverse Proxy en VPS)

Para que tu webhook y panel funcionen con HTTPS seguro:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Crea la configuración de Nginx (`/etc/nginx/sites-available/chatbot`):

```nginx
server {
    server_name bot.tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Habilita el sitio y genera el certificado SSL gratis:
```bash
sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bot.tu-dominio.com
```

---

## 5. Verificación de Funcionamiento

- **Panel Administrativo:** `https://bot.tu-dominio.com/admin`
- **Healthcheck:** `https://bot.tu-dominio.com/api/health`
- **Webhook de WhatsApp:** `https://bot.tu-dominio.com/webhook`
