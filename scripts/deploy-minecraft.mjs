import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

const files = {
  '/opt/minecraft-bedrock/web/package.json': JSON.stringify({
    name: "mc-bedrock-manager",
    version: "1.0.0",
    type: "module",
    scripts: {
      start: "node server.js"
    },
    dependencies: {
      express: "^4.19.2",
      multer: "^1.4.5-lts.1",
      cors: "^2.8.5"
    }
  }, null, 2),

  '/opt/minecraft-bedrock/web/Dockerfile': `FROM node:20-alpine
RUN apk add --no-cache docker-cli zip unzip
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8585
CMD ["node", "server.js"]
`,

  '/opt/minecraft-bedrock/docker-compose.yml': `services:
  mc-bedrock:
    image: itzg/minecraft-bedrock-server:latest
    container_name: mc-bedrock
    restart: unless-stopped
    ports:
      - "19132:19132/udp"
    environment:
      - EULA=TRUE
      - SERVER_NAME=Jux Bedrock World
      - GAMEMODE=survival
      - DIFFICULTY=normal
      - LEVEL_NAME=jux
      - ONLINE_MODE=false
      - ALLOW_CHEATS=true
      - MAX_PLAYERS=10
      - VIEW_DISTANCE=10
    volumes:
      - /opt/minecraft-bedrock/data:/data

  mc-web:
    build: /opt/minecraft-bedrock/web
    container_name: mc-web
    restart: unless-stopped
    ports:
      - "8585:8585"
    volumes:
      - /opt/minecraft-bedrock/data:/data
      - /opt/minecraft-bedrock/backups:/backups
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - PORT=8585
      - SERVER_IP=2.25.241.239
      - BEDROCK_PORT=19132
`,

  '/opt/minecraft-bedrock/web/server.js': `import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 8585;
const SERVER_IP = process.env.SERVER_IP || '2.25.241.239';
const BEDROCK_PORT = process.env.BEDROCK_PORT || '19132';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({
  dest: '/tmp/mc_uploads/',
  limits: { fileSize: 1024 * 1024 * 1000 }
});

async function getContainerStatus() {
  try {
    const { stdout } = await execAsync('docker inspect -f "{{.State.Status}}" mc-bedrock 2>/dev/null || echo "offline"');
    return stdout.trim() === 'running';
  } catch (e) {
    return false;
  }
}

async function getStats() {
  try {
    const { stdout } = await execAsync('docker stats --no-stream --format "{{.MemUsage}} / {{.CPUPerc}}" mc-bedrock 2>/dev/null || echo "N/A"');
    return stdout.trim() || 'N/A';
  } catch {
    return 'N/A';
  }
}

app.get('/api/status', async (req, res) => {
  const isRunning = await getContainerStatus();
  const stats = isRunning ? await getStats() : 'Inactivo';
  
  let worldExists = false;
  let worldSize = '0 MB';
  const worldPath = '/data/worlds/jux';
  
  if (fs.existsSync(worldPath)) {
    worldExists = true;
    try {
      const { stdout } = await execAsync('du -sh ' + worldPath + ' | cut -f1');
      worldSize = stdout.trim();
    } catch {}
  }

  res.json({
    online: isRunning,
    stats,
    serverName: 'Jux Bedrock World',
    ip: SERVER_IP,
    port: BEDROCK_PORT,
    worldName: 'jux',
    worldExists,
    worldSize,
    connectUrl: 'minecraft://?addExternalServer=Jux%20World|' + SERVER_IP + ':' + BEDROCK_PORT
  });
});

app.post('/api/action', async (req, res) => {
  const { action } = req.body;
  if (!['restart', 'start', 'stop'].includes(action)) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  try {
    await execAsync('docker ' + action + ' mc-bedrock');
    res.json({ success: true, message: 'Servidor ' + action + ' exitoso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-world', upload.single('worldFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const filePath = req.file.path;
  const tempExtractDir = '/tmp/mc_ext_' + Date.now();

  try {
    fs.mkdirSync(tempExtractDir, { recursive: true });
    await execAsync('unzip -q "' + filePath + '" -d "' + tempExtractDir + '"');

    let sourceLevelDir = tempExtractDir;
    if (!fs.existsSync(path.join(tempExtractDir, 'level.dat'))) {
      const items = fs.readdirSync(tempExtractDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && fs.existsSync(path.join(tempExtractDir, item.name, 'level.dat'))) {
          sourceLevelDir = path.join(tempExtractDir, item.name);
          break;
        }
      }
    }

    if (!fs.existsSync(path.join(sourceLevelDir, 'level.dat'))) {
      throw new Error('El archivo no parece ser un mundo válido de Minecraft Bedrock (no contiene level.dat)');
    }

    try {
      await execAsync('docker stop mc-bedrock 2>/dev/null || true');
    } catch {}

    const targetWorldDir = '/data/worlds/jux';
    const backupDir = '/backups';
    fs.mkdirSync(backupDir, { recursive: true });

    if (fs.existsSync(targetWorldDir)) {
      const backupFile = path.join(backupDir, 'jux_backup_' + Date.now() + '.zip');
      try {
        await execAsync('cd /data/worlds && zip -rq "' + backupFile + '" jux');
      } catch (e) {
        console.error('Backup error:', e);
      }
      fs.rmSync(targetWorldDir, { recursive: true, force: true });
    }

    fs.mkdirSync(targetWorldDir, { recursive: true });
    await execAsync('cp -r "' + sourceLevelDir + '"/* "' + targetWorldDir + '"/');
    await execAsync('chmod -R 777 /data/worlds');

    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.unlinkSync(filePath);

    await execAsync('docker start mc-bedrock');

    res.json({
      success: true,
      message: '¡Mundo instalado con éxito y servidor reiniciado!'
    });
  } catch (err) {
    try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download-world', async (req, res) => {
  const worldDir = '/data/worlds/jux';
  if (!fs.existsSync(worldDir) || !fs.existsSync(path.join(worldDir, 'level.dat'))) {
    return res.status(404).json({ error: 'No hay ningún mundo creado todavía' });
  }

  const exportPath = '/tmp/jux-export-' + Date.now() + '.mcworld';
  try {
    await execAsync('cd "' + worldDir + '" && zip -rq "' + exportPath + '" .');
    res.download(exportPath, 'jux-nube.mcworld', (err) => {
      try { fs.unlinkSync(exportPath); } catch {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al empaquetar el mundo: ' + err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Minecraft Bedrock Manager en puerto ' + PORT);
});
`,

  '/opt/minecraft-bedrock/web/public/index.html': `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minecraft Bedrock - Servidor en la Nube</title>
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>
  <div class="background-decor"></div>
  
  <div class="container">
    <header class="header">
      <div class="logo-group">
        <div class="cube-icon">⛏️</div>
        <div>
          <h1>Minecraft Bedrock Cloud</h1>
          <p class="subtitle">Guarda y juega tu mundo desde PC, teléfono y tablet</p>
        </div>
      </div>
      <div id="serverStatusBadge" class="badge badge-loading">
        <span class="status-dot"></span>
        <span id="serverStatusText">Conectando...</span>
      </div>
    </header>

    <section class="card hero-card">
      <div class="hero-content">
        <h2>Vincular Nuevo Dispositivo</h2>
        <p class="desc">Abre Minecraft Bedrock en tu PC, teléfono o tablet y usa estos datos para conectarte.</p>
        
        <div class="connect-grid">
          <div class="connect-item">
            <span class="label">DIRECCIÓN / IP</span>
            <div class="copy-box">
              <code id="serverIp">2.25.241.239</code>
              <button class="btn-copy" onclick="copyText('serverIp', this)">Copiar</button>
            </div>
          </div>
          <div class="connect-item">
            <span class="label">PUERTO</span>
            <div class="copy-box">
              <code id="serverPort">19132</code>
              <button class="btn-copy" onclick="copyText('serverPort', this)">Copiar</button>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <a id="autoConnectBtn" href="minecraft://?addExternalServer=Jux%20World|2.25.241.239:19132" class="btn btn-primary">
            🚀 Conectar en 1 Clic (Abrir Minecraft)
          </a>
          <button onclick="toggleQR()" class="btn btn-secondary">
            📱 Mostrar Código QR para Celular
          </button>
        </div>

        <div id="qrModal" class="qr-container hidden">
          <p class="qr-hint">Escanea desde tu teléfono o tablet para abrir o compartir los datos:</p>
          <div id="qrcode"></div>
          <p class="qr-url" id="qrTextLink"></p>
        </div>
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-header">
          <div class="icon">☁️</div>
          <div>
            <h3>Cargar o Actualizar Mundo</h3>
            <p class="card-subtitle">Sube tu archivo .mcworld o .zip exportado de Minecraft</p>
          </div>
        </div>

        <div id="dropZone" class="drop-zone" onclick="document.getElementById('fileInput').click()">
          <input type="file" id="fileInput" accept=".mcworld,.zip" style="display:none" onchange="handleFileSelect(this)">
          <div class="drop-icon">📦</div>
          <p class="drop-title">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
          <p class="drop-note">Formatos aceptados: <strong>.mcworld</strong> o <strong>.zip</strong></p>
          <div id="selectedFileInfo" class="selected-file hidden"></div>
        </div>

        <div id="progressContainer" class="progress-container hidden">
          <div class="progress-bar-bg">
            <div id="progressBar" class="progress-bar-fill"></div>
          </div>
          <div class="progress-labels">
            <span id="progressText">Subiendo mundo...</span>
            <span id="progressPercent">0%</span>
          </div>
        </div>

        <button id="uploadBtn" class="btn btn-upload" disabled onclick="uploadWorld()">
          Subir e Instalar en el Servidor
        </button>
        <p id="uploadAlert" class="alert hidden"></p>
      </section>

      <section class="card">
        <div class="card-header">
          <div class="icon">💾</div>
          <div>
            <h3>Estado y Copias de Seguridad</h3>
            <p class="card-subtitle">Administra tu mundo en tiempo real</p>
          </div>
        </div>

        <div class="stats-list">
          <div class="stat-row">
            <span>Mundo activo:</span>
            <strong id="activeWorldName">jux</strong>
          </div>
          <div class="stat-row">
            <span>Tamaño en disco:</span>
            <strong id="worldSize">Calculando...</strong>
          </div>
          <div class="stat-row">
            <span>Uso de RAM / CPU:</span>
            <strong id="serverStats">-</strong>
          </div>
        </div>

        <div class="backup-box">
          <h4>📥 Descargar Copia a tu Computadora</h4>
          <p>Puedes descargar el archivo <code>.mcworld</code> actual en cualquier momento para guardarlo localmente o jugar offline.</p>
          <a href="/api/download-world" class="btn btn-outline" download>
            ⬇️ Descargar Respaldo (.mcworld)
          </a>
        </div>

        <div class="controls-box">
          <h4>⚙️ Control del Servidor</h4>
          <div class="btn-group">
            <button class="btn btn-sm btn-warning" onclick="serverAction('restart')">🔄 Reiniciar</button>
            <button class="btn btn-sm btn-danger" onclick="serverAction('stop')">⏹️ Detener</button>
            <button class="btn btn-sm btn-success" onclick="serverAction('start')">▶️ Iniciar</button>
          </div>
        </div>
      </section>
    </div>

    <section class="card guide-card">
      <h3>📖 ¿Cómo entrar desde cada dispositivo?</h3>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-badge">PC Windows 10/11</div>
          <ol>
            <li>Abre Minecraft Bedrock y ve a <strong>Jugar</strong>.</li>
            <li>Pestaña <strong>Servidores</strong> &gt; Baja hasta <strong>"Añadir servidor"</strong>.</li>
            <li>Nombre: <code>Jux Nube</code></li>
            <li>Dirección: <code>2.25.241.239</code> | Puerto: <code>19132</code></li>
            <li>Haz clic en <strong>Jugar</strong>.</li>
          </ol>
        </div>
        <div class="step-card">
          <div class="step-badge">Celular o Tablet (Android / iOS)</div>
          <ol>
            <li>Abre Minecraft en tu dispositivo móvil.</li>
            <li>Toca <strong>Jugar &gt; Servidores</strong>.</li>
            <li>Toca <strong>"Añadir servidor"</strong>.</li>
            <li>IP: <code>2.25.241.239</code> | Puerto: <code>19132</code></li>
            <li>¡Listo! Tu mundo cargará con tus construcciones.</li>
          </ol>
        </div>
        <div class="step-card">
          <div class="step-badge">Exportar tu mundo de la PC</div>
          <ol>
            <li>En tu PC, clic en el <strong>lápiz</strong> de tu mundo actual.</li>
            <li>Baja hasta abajo del menú <strong>Juego</strong>.</li>
            <li>Clic en <strong>"Exportar mundo"</strong>.</li>
            <li>Arrastra el archivo generado en esta página web arriba.</li>
          </ol>
        </div>
      </div>
    </section>

    <footer class="footer">
      <p>Servidor Bedrock Dedicado en Hostinger VPS &bull; IP: <code>2.25.241.239:19132</code></p>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>
`,

  '/opt/minecraft-bedrock/web/public/style.css': `:root {
  --bg-dark: #0f172a;
  --bg-card: rgba(30, 41, 59, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
  --emerald: #10b981;
  --emerald-hover: #059669;
  --emerald-glow: rgba(16, 185, 129, 0.25);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --danger: #ef4444;
  --warning: #f59e0b;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--bg-dark);
  color: var(--text-main);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  line-height: 1.5;
}

.background-decor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: 
    radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 40%);
  z-index: -1;
  pointer-events: none;
}

.container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 20px 60px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cube-icon {
  font-size: 38px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 14px;
  padding: 8px 12px;
  box-shadow: 0 4px 16px var(--emerald-glow);
}

h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 14px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  backdrop-filter: blur(8px);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
  display: inline-block;
}

.badge-online {
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
}
.badge-online .status-dot {
  background: var(--emerald);
  box-shadow: 0 0 10px var(--emerald);
}

.badge-offline {
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}
.badge-offline .status-dot {
  background: var(--danger);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 24px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 24px;
}

.hero-card {
  border-color: rgba(16, 185, 129, 0.3);
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
  position: relative;
  overflow: hidden;
}

.hero-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 160px;
  height: 100%;
  background: radial-gradient(circle at center, rgba(16, 185, 129, 0.12), transparent 70%);
  pointer-events: none;
}

.hero-content h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}

.desc {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 20px;
}

.connect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.connect-item {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
}

.connect-item .label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--emerald);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.copy-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 17px;
  color: #fff;
  font-weight: 700;
}

.btn-copy {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: var(--emerald);
  border-color: var(--emerald);
}

.action-buttons {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--emerald);
  color: #042f2e;
  box-shadow: 0 4px 16px var(--emerald-glow);
}
.btn-primary:hover {
  background: var(--emerald-hover);
  color: #fff;
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid var(--border-color);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.18);
}

.btn-outline {
  width: 100%;
  background: transparent;
  border: 1px solid var(--emerald);
  color: var(--emerald);
}
.btn-outline:hover {
  background: var(--emerald);
  color: #042f2e;
}

.btn-upload {
  width: 100%;
  margin-top: 14px;
  background: var(--emerald);
  color: #042f2e;
}
.btn-upload:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #64748b;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
}
.btn-warning { background: var(--warning); color: #000; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-success { background: var(--emerald); color: #042f2e; }

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.card-header .icon {
  font-size: 26px;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 700;
}

.card-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.drop-zone {
  border: 2px dashed rgba(16, 185, 129, 0.4);
  border-radius: 14px;
  padding: 32px 20px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover, .drop-zone.dragover {
  border-color: var(--emerald);
  background: rgba(16, 185, 129, 0.08);
}

.drop-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.drop-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.drop-note {
  font-size: 12px;
  color: var(--text-muted);
}

.selected-file {
  margin-top: 14px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid var(--emerald);
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.progress-container {
  margin-top: 14px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  width: 0%;
  height: 100%;
  background: var(--emerald);
  transition: width 0.3s;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.alert {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
.alert-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.alert-error { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

.stats-list {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 14px;
}
.stat-row:last-child { border-bottom: none; }
.stat-row span { color: var(--text-muted); }

.backup-box, .controls-box {
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.backup-box h4, .controls-box h4 {
  font-size: 14px;
  margin-bottom: 6px;
}

.backup-box p {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.guide-card h3 {
  font-size: 18px;
  margin-bottom: 16px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.step-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.step-badge {
  display: inline-block;
  background: rgba(16, 185, 129, 0.15);
  color: var(--emerald);
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.step-card ol {
  padding-left: 18px;
  font-size: 13px;
  color: #cbd5e1;
}

.step-card li {
  margin-bottom: 6px;
}

.qr-container {
  margin-top: 20px;
  padding: 20px;
  background: #ffffff;
  color: #0f172a;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.qr-hint {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
  text-align: center;
}

.qr-url {
  font-size: 11px;
  margin-top: 10px;
  color: #64748b;
  word-break: break-all;
}

.footer {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 20px;
}

.hidden { display: none !important; }
`,

  '/opt/minecraft-bedrock/web/public/app.js': `let selectedFile = null;
let qrGenerated = false;

document.addEventListener('DOMContentLoaded', () => {
  fetchStatus();
  setInterval(fetchStatus, 5000);
  setupDragAndDrop();
});

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    const badge = document.getElementById('serverStatusBadge');
    const text = document.getElementById('serverStatusText');
    
    if (data.online) {
      badge.className = 'badge badge-online';
      text.innerText = 'En Línea (Activo)';
    } else {
      badge.className = 'badge badge-offline';
      text.innerText = 'Servidor Inactivo';
    }

    document.getElementById('serverIp').innerText = data.ip;
    document.getElementById('serverPort').innerText = data.port;
    document.getElementById('activeWorldName').innerText = data.worldName || 'jux';
    document.getElementById('worldSize').innerText = data.worldSize || '0 MB';
    document.getElementById('serverStats').innerText = data.stats || 'Normal';
    
    const autoBtn = document.getElementById('autoConnectBtn');
    if (autoBtn && data.connectUrl) {
      autoBtn.href = data.connectUrl;
    }
  } catch (err) {
    console.error('Error fetching status:', err);
  }
}

function copyText(elemId, btn) {
  const text = document.getElementById(elemId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.innerText;
    btn.innerText = '✓ ¡Copiado!';
    btn.style.background = 'var(--emerald)';
    setTimeout(() => {
      btn.innerText = original;
      btn.style.background = '';
    }, 2000);
  });
}

function toggleQR() {
  const modal = document.getElementById('qrModal');
  modal.classList.toggle('hidden');
  
  if (!qrGenerated && !modal.classList.contains('hidden')) {
    const connectUrl = window.location.origin;
    new QRCode(document.getElementById('qrcode'), {
      text: connectUrl,
      width: 180,
      height: 180,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
    document.getElementById('qrTextLink').innerText = connectUrl;
    qrGenerated = true;
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function handleFileSelect(input) {
  if (input.files.length > 0) {
    handleFile(input.files[0]);
  }
}

function handleFile(file) {
  if (!file.name.endsWith('.mcworld') && !file.name.endsWith('.zip')) {
    alert('Por favor selecciona un archivo con extensión .mcworld o .zip');
    return;
  }
  selectedFile = file;
  const info = document.getElementById('selectedFileInfo');
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  info.innerText = '📄 ' + file.name + ' (' + sizeMb + ' MB) seleccionado';
  info.classList.remove('hidden');
  document.getElementById('uploadBtn').disabled = false;
}

function uploadWorld() {
  if (!selectedFile) return;

  const btn = document.getElementById('uploadBtn');
  const progContainer = document.getElementById('progressContainer');
  const progBar = document.getElementById('progressBar');
  const progPercent = document.getElementById('progressPercent');
  const alertBox = document.getElementById('uploadAlert');

  btn.disabled = true;
  progContainer.classList.remove('hidden');
  alertBox.classList.add('hidden');

  const formData = new FormData();
  formData.append('worldFile', selectedFile);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload-world', true);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progBar.style.width = percent + '%';
      progPercent.innerText = percent + '%';
    }
  };

  xhr.onload = () => {
    progContainer.classList.add('hidden');
    btn.disabled = false;
    try {
      const res = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && res.success) {
        alertBox.className = 'alert alert-success';
        alertBox.innerText = '🎉 ' + res.message;
        alertBox.classList.remove('hidden');
        selectedFile = null;
        document.getElementById('selectedFileInfo').classList.add('hidden');
        document.getElementById('fileInput').value = '';
        setTimeout(fetchStatus, 2000);
      } else {
        throw new Error(res.error || 'Error al procesar el archivo');
      }
    } catch (err) {
      alertBox.className = 'alert alert-error';
      alertBox.innerText = '❌ Error: ' + err.message;
      alertBox.classList.remove('hidden');
    }
  };

  xhr.onerror = () => {
    progContainer.classList.add('hidden');
    btn.disabled = false;
    alertBox.className = 'alert alert-error';
    alertBox.innerText = '❌ Error de conexión al subir el archivo.';
    alertBox.classList.remove('hidden');
  };

  xhr.send(formData);
}

async function serverAction(action) {
  if (!confirm('¿Seguro que deseas ' + action + ' el servidor de Minecraft?')) return;

  try {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setTimeout(fetchStatus, 1500);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error al comunicarse con el servidor: ' + err.message);
  }
}
`
};

conn.on('ready', () => {
  console.log('Conectado al VPS via SSH.');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    const paths = Object.keys(files);
    let index = 0;

    function uploadNext() {
      if (index >= paths.length) {
        console.log('Todos los archivos subidos exitosamente via SFTP.');
        console.log('Ejecutando docker compose up -d --build...');
        
        conn.exec('cd /opt/minecraft-bedrock && docker compose up -d --build', (err2, stream) => {
          if (err2) {
            console.error('Exec error:', err2);
            conn.end();
            return;
          }
          stream.on('data', d => process.stdout.write(d));
          stream.stderr.on('data', d => process.stderr.write(d));
          stream.on('close', code => {
            console.log('Docker compose finalizado con código:', code);
            conn.end();
          });
        });
        return;
      }

      const remotePath = paths[index++];
      console.log('Escribiendo:', remotePath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', () => {
        uploadNext();
      });
      writeStream.on('error', err => {
        console.error('Error escribiendo ' + remotePath + ':', err);
        conn.end();
      });
      writeStream.end(files[remotePath]);
    }

    uploadNext();
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
