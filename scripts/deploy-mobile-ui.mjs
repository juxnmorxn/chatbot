import { Client } from 'ssh2';

const conn = new Client();

const serverJs = `import express from 'express';
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
    const { stdout } = await execAsync('docker stats --no-stream --format "{{.MemUsage}}" mc-bedrock 2>/dev/null || echo "N/A"');
    return stdout.trim() || 'N/A';
  } catch {
    return 'N/A';
  }
}

// Endpoint to serve the world's real thumbnail icon
app.get('/api/world-icon', (req, res) => {
  const iconPath = '/data/worlds/jux/world_icon.jpeg';
  if (fs.existsSync(iconPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(iconPath);
  }
  res.status(404).send('Not found');
});

app.get('/api/status', async (req, res) => {
  const isRunning = await getContainerStatus();
  const stats = isRunning ? await getStats() : 'Inactivo';
  
  let worldExists = false;
  let worldSize = '0 MB';
  let levelTitle = 'jux';
  let lastModified = 'N/A';
  let hasCustomIcon = false;
  const worldPath = '/data/worlds/jux';
  
  if (fs.existsSync(worldPath) && fs.existsSync(path.join(worldPath, 'level.dat'))) {
    worldExists = true;
    try {
      const { stdout } = await execAsync('du -sh ' + worldPath + ' | cut -f1');
      worldSize = stdout.trim();
    } catch {}

    const levelNameFile = path.join(worldPath, 'levelname.txt');
    if (fs.existsSync(levelNameFile)) {
      try {
        levelTitle = fs.readFileSync(levelNameFile, 'utf8').trim() || 'jux';
      } catch {}
    }

    if (fs.existsSync(path.join(worldPath, 'world_icon.jpeg'))) {
      hasCustomIcon = true;
    }

    try {
      const statsObj = fs.statSync(path.join(worldPath, 'level.dat'));
      lastModified = statsObj.mtime.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    } catch {}
  }

  res.json({
    online: isRunning,
    stats,
    serverName: 'Jux Nube',
    ip: SERVER_IP,
    port: BEDROCK_PORT,
    worldName: 'jux',
    levelTitle,
    worldExists,
    worldSize,
    hasCustomIcon,
    iconUrl: hasCustomIcon ? '/api/world-icon?t=' + Date.now() : null,
    lastModified,
    connectUrl: 'minecraft://?addExternalServer=Jux%20Nube|' + SERVER_IP + ':' + BEDROCK_PORT
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
`;

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#0b1120">
  <title>Minecraft Bedrock - Servidor en la Nube</title>
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;800&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>
  <div class="bg-glow"></div>
  
  <div class="app-wrap">
    
    <!-- Top Mobile Navigation Bar -->
    <header class="top-nav">
      <div class="brand">
        <div class="brand-cube">⛏️</div>
        <div>
          <h1 class="brand-title">Jux Nube</h1>
          <p class="brand-subtitle">Servidor Dedicado Bedrock</p>
        </div>
      </div>
      <div id="statusBadge" class="status-pill status-loading">
        <span class="pulse-dot"></span>
        <span id="statusLabel">Conectando...</span>
      </div>
    </header>

    <!-- WORLD SPOTLIGHT HERO CARD -->
    <section class="world-hero-card">
      <div class="world-hero-bg" id="worldHeroBg"></div>
      <div class="world-hero-content">
        <div class="world-icon-wrapper">
          <img id="worldThumbImg" src="" alt="World Icon" class="world-thumb hidden">
          <div id="worldThumbFallback" class="world-fallback-icon">🗺️</div>
          <span class="live-tag">EN LÍNEA</span>
        </div>

        <div class="world-meta">
          <span class="meta-label">MUNDO EN LA NUBE</span>
          <h2 id="worldTitle" class="world-name">Cargando mundo...</h2>
          <div class="meta-chips">
            <span class="chip"><span class="chip-icon">💾</span> <strong id="worldSizeLabel">3.2 MB</strong></span>
            <span class="chip"><span class="chip-icon">🎮</span> Supervivencia</span>
            <span class="chip"><span class="chip-icon">⚡</span> <strong id="ramLabel">~186 MB</strong></span>
          </div>
        </div>

        <div class="hero-quick-actions">
          <a id="oneClickBtn" href="minecraft://?addExternalServer=Jux%20Nube|2.25.241.239:19132" class="btn btn-emerald btn-lg btn-block">
            <span class="btn-icon">🚀</span>
            <span>Vincular y Abrir en Minecraft</span>
          </a>
        </div>
      </div>
    </section>

    <!-- QUICK COPY CONNECTION BOX -->
    <section class="card connect-card">
      <div class="card-head">
        <span class="card-tag">CONEXIÓN RÁPIDA</span>
        <h3 class="card-title">Datos para Añadir Servidor</h3>
        <p class="card-sub">Copia cada casilla con un toque para no tener errores de formato:</p>
      </div>

      <div class="fields-stack">
        <!-- Field 1: IP -->
        <div class="field-item">
          <div class="field-meta">
            <span class="field-label">DIRECCIÓN DEL SERVIDOR (IP)</span>
            <span class="field-hint">Sin espacios al inicio ni al final</span>
          </div>
          <div class="field-interactive" onclick="copyValue('2.25.241.239', this)">
            <code class="field-value">2.25.241.239</code>
            <button type="button" class="field-btn">Copiar</button>
          </div>
        </div>

        <!-- Field 2: Port -->
        <div class="field-item">
          <div class="field-meta">
            <span class="field-label">PUERTO</span>
            <span class="field-hint">Puerto Bedrock oficial</span>
          </div>
          <div class="field-interactive" onclick="copyValue('19132', this)">
            <code class="field-value">19132</code>
            <button type="button" class="field-btn">Copiar</button>
          </div>
        </div>

        <!-- Field 3: Name -->
        <div class="field-item">
          <div class="field-meta">
            <span class="field-label">NOMBRE DEL SERVIDOR</span>
            <span class="field-hint">Nombre de referencia en tu lista</span>
          </div>
          <div class="field-interactive" onclick="copyValue('Jux Nube', this)">
            <code class="field-value">Jux Nube</code>
            <button type="button" class="field-btn">Copiar</button>
          </div>
        </div>
      </div>

      <div class="connect-aux">
        <button type="button" onclick="toggleQRModal()" class="btn btn-secondary btn-block">
          📱 Código QR para Vincular Otro Teléfono o Tablet
        </button>
      </div>

      <!-- QR Drawer -->
      <div id="qrDrawer" class="qr-drawer hidden">
        <p class="qr-caption">Apunta con la cámara de tu celular o tablet para abrir los datos directo en tu pantalla:</p>
        <div id="qrCanvas" class="qr-canvas-box"></div>
        <p class="qr-direct-link" id="qrLinkText"></p>
      </div>
    </section>

    <!-- UPLOAD WORLD / ACTIONS -->
    <section class="card upload-card">
      <div class="card-head">
        <span class="card-tag">ACTUALIZAR MUNDO</span>
        <h3 class="card-title">Cargar o Reemplazar Mundo</h3>
        <p class="card-sub">Exporta tu partida como <strong>.mcworld</strong> y cárgala aquí para jugar el progreso más nuevo.</p>
      </div>

      <div id="dropZone" class="mobile-drop-zone" onclick="document.getElementById('fileUploadInput').click()">
        <input type="file" id="fileUploadInput" accept=".mcworld,.zip" style="display:none" onchange="onFilePicked(this)">
        <div class="drop-icon-anim">📦</div>
        <p class="drop-text-main">Toca aquí para seleccionar tu <strong>.mcworld</strong></p>
        <p class="drop-text-sub">o arrástralo desde tu explorador de archivos</p>
        <div id="filePickedBadge" class="file-badge hidden"></div>
      </div>

      <div id="uploadProgressBox" class="progress-box hidden">
        <div class="progress-track">
          <div id="uploadProgressBar" class="progress-fill"></div>
        </div>
        <div class="progress-meta">
          <span id="uploadProgressLabel">Subiendo mundo a la nube...</span>
          <span id="uploadProgressNum">0%</span>
        </div>
      </div>

      <button id="submitUploadBtn" type="button" class="btn btn-emerald btn-block" disabled onclick="executeWorldUpload()">
        ⬆️ Instalar Mundo en el Servidor
      </button>

      <div id="uploadResultAlert" class="alert-box hidden"></div>

      <div class="backup-divider">
        <span>O GUARDA TU PROGRESO</span>
      </div>

      <a href="/api/download-world" class="btn btn-outline-emerald btn-block" download>
        ⬇️ Descargar Copia de Respaldo (.mcworld)
      </a>
    </section>

    <!-- CONTROLS & LOGS ACCORDION -->
    <section class="card controls-card">
      <div class="card-head">
        <span class="card-tag">PANEL DE CONTROL</span>
        <h3 class="card-title">Administración del Servidor</h3>
      </div>

      <div class="ctrl-grid">
        <button type="button" class="btn-ctrl btn-ctrl-restart" onclick="sendServerAction('restart')">
          <span class="ctrl-icon">🔄</span>
          <span class="ctrl-name">Reiniciar</span>
        </button>
        <button type="button" class="btn-ctrl btn-ctrl-stop" onclick="sendServerAction('stop')">
          <span class="ctrl-icon">⏹️</span>
          <span class="ctrl-name">Detener</span>
        </button>
        <button type="button" class="btn-ctrl btn-ctrl-start" onclick="sendServerAction('start')">
          <span class="ctrl-icon">▶️</span>
          <span class="ctrl-name">Iniciar</span>
        </button>
      </div>
    </section>

    <!-- STEP-BY-STEP PHONE & PC GUIDE -->
    <section class="card guide-card">
      <div class="card-head">
        <span class="card-tag">TUTORIAL PASO A PASO</span>
        <h3 class="card-title">¿Cómo unirse desde el juego?</h3>
      </div>

      <div class="guide-tabs">
        <button type="button" class="tab-btn active" onclick="switchGuide('mobile', this)">📱 Celular / Tablet</button>
        <button type="button" class="tab-btn" onclick="switchGuide('pc', this)">💻 PC Windows</button>
      </div>

      <div id="guideMobile" class="guide-body">
        <div class="step-row">
          <div class="step-num">1</div>
          <div class="step-info">
            <strong>Abre Minecraft Bedrock</strong>
            <p>Toca en <strong>Jugar</strong> y luego en la pestaña <strong>Servidores</strong> arriba a la derecha.</p>
          </div>
        </div>
        <div class="step-row">
          <div class="step-num">2</div>
          <div class="step-info">
            <strong>Toca "Añadir servidor"</strong>
            <p>Baja hasta el final de la lista de servidores destacados y toca el botón.</p>
          </div>
        </div>
        <div class="step-row">
          <div class="step-num">3</div>
          <div class="step-info">
            <strong>Pega la IP y el Puerto</strong>
            <p>Escribe <code>2.25.241.239</code> (sin espacios) y en puerto <code>19132</code>.</p>
          </div>
        </div>
        <div class="step-row">
          <div class="step-num">4</div>
          <div class="step-info">
            <strong>Toca "Jugar" o "Guardar"</strong>
            <p>¡Listo! Entrarás directo a tu mundo en la nube.</p>
          </div>
        </div>
      </div>

      <div id="guidePc" class="guide-body hidden">
        <div class="step-row">
          <div class="step-num">1</div>
          <div class="step-info">
            <strong>En tu PC</strong>
            <p>Solo haz clic en el botón verde <strong>"Vincular y Abrir en Minecraft"</strong> de arriba para agregarlo en 1 segundo.</p>
          </div>
        </div>
        <div class="step-row">
          <div class="step-num">2</div>
          <div class="step-info">
            <strong>O Manualmente</strong>
            <p>Ve a <strong>Jugar &gt; Servidores &gt; Añadir Servidor</strong> y pon <code>2.25.241.239</code> y <code>19132</code>.</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="app-footer">
      <p>Servidor Bedrock 24/7 &bull; Hostinger VPS &bull; <code>2.25.241.239:19132</code></p>
    </footer>

  </div>

  <div id="toast" class="toast hidden">Copiado al portapapeles</div>

  <script src="app.js"></script>
</body>
</html>
`;

const styleCss = `:root {
  --bg-deep: #090d16;
  --bg-card: rgba(18, 26, 43, 0.85);
  --bg-field: rgba(10, 15, 28, 0.75);
  --border-glass: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(16, 185, 129, 0.5);
  --emerald: #10b981;
  --emerald-light: #34d399;
  --emerald-dark: #059669;
  --emerald-glow: rgba(16, 185, 129, 0.35);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --danger: #ef4444;
  --warning: #f59e0b;
  --radius-card: 20px;
  --radius-item: 14px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--bg-deep);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 16px;
  padding-bottom: 40px;
  line-height: 1.45;
  overflow-x: hidden;
}

.bg-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: 
    radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.18) 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, rgba(59, 130, 246, 0.15) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

.app-wrap {
  max-width: 680px;
  margin: 0 auto;
}

/* TOP NAV */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-cube {
  font-size: 28px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px var(--emerald-glow);
}

.brand-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--border-glass);
  background: rgba(18, 26, 43, 0.9);
  backdrop-filter: blur(10px);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  display: inline-block;
}

.status-online {
  border-color: rgba(16, 185, 129, 0.4);
  color: var(--emerald-light);
  background: rgba(16, 185, 129, 0.12);
}
.status-online .pulse-dot {
  background: var(--emerald);
  box-shadow: 0 0 10px var(--emerald);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.status-offline {
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}
.status-offline .pulse-dot {
  background: var(--danger);
}

/* CARDS COMMON */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-card);
  padding: 20px;
  backdrop-filter: blur(16px);
  margin-bottom: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.card-head {
  margin-bottom: 16px;
}

.card-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--emerald);
  margin-bottom: 4px;
}

.card-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.card-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* WORLD SPOTLIGHT HERO CARD */
.world-hero-card {
  position: relative;
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.2) 0%, rgba(18, 26, 43, 0.95) 100%);
  border: 1.5px solid rgba(16, 185, 129, 0.45);
  border-radius: var(--radius-card);
  padding: 22px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 12px 36px rgba(16, 185, 129, 0.15);
}

.world-hero-bg {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  opacity: 0.12;
  filter: blur(8px);
  pointer-events: none;
}

.world-hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.world-icon-wrapper {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid rgba(16, 185, 129, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  background: #0b1120;
}

.world-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.world-fallback-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: rgba(16, 185, 129, 0.15);
}

.live-tag {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: var(--emerald);
  color: #042f2e;
  font-size: 8px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.world-meta .meta-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--emerald-light);
  letter-spacing: 1px;
}

.world-name {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 2px 0 8px 0;
}

.meta-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(10, 15, 28, 0.6);
  border: 1px solid var(--border-glass);
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.chip strong {
  color: #fff;
}

/* BUTTONS */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: var(--radius-item);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-block {
  width: 100%;
}

.btn-lg {
  padding: 15px 20px;
  font-size: 15px;
}

.btn-emerald {
  background: var(--emerald);
  color: #042f2e;
  box-shadow: 0 4px 20px var(--emerald-glow);
}
.btn-emerald:hover, .btn-emerald:active {
  background: var(--emerald-light);
  transform: translateY(-1px);
}

.btn-outline-emerald {
  background: rgba(16, 185, 129, 0.1);
  color: var(--emerald-light);
  border: 1.5px solid var(--emerald);
}
.btn-outline-emerald:hover {
  background: var(--emerald);
  color: #042f2e;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid var(--border-glass);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* FIELDS STACK (CLICK TO COPY) */
.fields-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.field-item {
  background: var(--bg-field);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-item);
  padding: 10px 14px;
  transition: border-color 0.2s;
}

.field-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.field-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--emerald-light);
  letter-spacing: 0.5px;
}

.field-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.field-interactive {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.field-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
}

.field-btn {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: var(--emerald-light);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  pointer-events: none;
  transition: all 0.2s;
}

.field-interactive:hover .field-btn,
.field-interactive:active .field-btn {
  background: var(--emerald);
  color: #042f2e;
}

/* QR DRAWER */
.qr-drawer {
  margin-top: 14px;
  padding: 18px;
  background: #ffffff;
  border-radius: var(--radius-item);
  color: #0f172a;
  text-align: center;
}

.qr-caption {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

.qr-canvas-box {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.qr-direct-link {
  font-size: 11px;
  color: #64748b;
  word-break: break-all;
}

/* UPLOAD ZONE */
.mobile-drop-zone {
  border: 2px dashed rgba(16, 185, 129, 0.4);
  border-radius: var(--radius-item);
  padding: 24px 16px;
  text-align: center;
  background: rgba(10, 15, 28, 0.4);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 14px;
}

.mobile-drop-zone:hover, .mobile-drop-zone.dragover {
  border-color: var(--emerald);
  background: rgba(16, 185, 129, 0.1);
}

.drop-icon-anim {
  font-size: 34px;
  margin-bottom: 6px;
}

.drop-text-main {
  font-size: 14px;
  font-weight: 700;
}

.drop-text-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.file-badge {
  margin-top: 10px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid var(--emerald);
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.progress-box {
  margin-bottom: 14px;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  width: 0%;
  height: 100%;
  background: var(--emerald);
  transition: width 0.3s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.alert-box {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.alert-box.success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.alert-box.error {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.backup-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 18px 0 14px 0;
}
.backup-divider::before, .backup-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-glass);
}
.backup-divider span {
  padding: 0 10px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 1px;
}

/* SERVER CONTROLS */
.ctrl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.btn-ctrl {
  background: rgba(10, 15, 28, 0.6);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-item);
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
}
.btn-ctrl:active { transform: scale(0.96); }

.ctrl-icon { font-size: 20px; }
.ctrl-name { font-size: 12px; font-weight: 700; }

.btn-ctrl-restart:hover { border-color: var(--warning); background: rgba(245, 158, 11, 0.15); }
.btn-ctrl-stop:hover { border-color: var(--danger); background: rgba(239, 68, 68, 0.15); }
.btn-ctrl-start:hover { border-color: var(--emerald); background: rgba(16, 185, 129, 0.15); }

/* GUIDE TABS */
.guide-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-btn {
  flex: 1;
  background: rgba(10, 15, 28, 0.5);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  padding: 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: var(--emerald);
  color: var(--emerald-light);
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.step-num {
  background: var(--emerald);
  color: #042f2e;
  font-size: 12px;
  font-weight: 800;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-info strong {
  font-size: 13px;
  display: block;
}

.step-info p {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 1px;
}

.step-info code {
  font-family: 'JetBrains Mono', monospace;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
}

/* TOAST */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--emerald);
  color: #042f2e;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 8px 24px var(--emerald-glow);
  z-index: 100;
  pointer-events: none;
  transition: opacity 0.3s;
}

/* FOOTER */
.app-footer {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 24px;
}

.hidden { display: none !important; }
`;

const appJs = `let pickedWorldFile = null;
let isQrBuilt = false;

document.addEventListener('DOMContentLoaded', () => {
  refreshServerStatus();
  setInterval(refreshServerStatus, 3500);
  bindDragAndDrop();
});

async function refreshServerStatus() {
  try {
    const res = await fetch('/api/status?nocache=' + Date.now());
    const data = await res.json();

    // Badge
    const badge = document.getElementById('statusBadge');
    const label = document.getElementById('statusLabel');
    if (data.online) {
      badge.className = 'status-pill status-online';
      label.innerText = 'Servidor En Línea';
    } else {
      badge.className = 'status-pill status-offline';
      label.innerText = 'Servidor Inactivo';
    }

    // World Spotlight
    const title = document.getElementById('worldTitle');
    const size = document.getElementById('worldSizeLabel');
    const ram = document.getElementById('ramLabel');
    const thumbImg = document.getElementById('worldThumbImg');
    const fallback = document.getElementById('worldThumbFallback');
    const heroBg = document.getElementById('worldHeroBg');

    title.innerText = data.levelTitle || data.worldName || 'jux';
    size.innerText = data.worldSize || '3.2 MB';
    ram.innerText = data.stats || '~186 MB';

    if (data.hasCustomIcon && data.iconUrl) {
      thumbImg.src = data.iconUrl;
      thumbImg.classList.remove('hidden');
      fallback.classList.add('hidden');
      if (heroBg) {
        heroBg.style.backgroundImage = 'url(' + data.iconUrl + ')';
      }
    } else {
      thumbImg.classList.add('hidden');
      fallback.classList.remove('hidden');
    }

    // Deep link button
    const oneClickBtn = document.getElementById('oneClickBtn');
    if (oneClickBtn && data.connectUrl) {
      oneClickBtn.href = data.connectUrl;
    }

  } catch (err) {
    console.warn('Status refresh error:', err);
  }
}

function copyValue(text, element) {
  const cleanText = text.trim();
  navigator.clipboard.writeText(cleanText).then(() => {
    showToast('✓ ' + cleanText + ' copiado');
    if (element) {
      const btn = element.querySelector('.field-btn');
      if (btn) {
        const orig = btn.innerText;
        btn.innerText = '¡Copiado!';
        btn.style.background = 'var(--emerald)';
        btn.style.color = '#042f2e';
        setTimeout(() => {
          btn.innerText = orig;
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      }
    }
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2000);
}

function toggleQRModal() {
  const drawer = document.getElementById('qrDrawer');
  drawer.classList.toggle('hidden');

  if (!isQrBuilt && !drawer.classList.contains('hidden')) {
    const url = window.location.origin;
    new QRCode(document.getElementById('qrCanvas'), {
      text: url,
      width: 170,
      height: 170,
      colorDark: '#090d16',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    document.getElementById('qrLinkText').innerText = url;
    isQrBuilt = true;
  }
}

function bindDragAndDrop() {
  const zone = document.getElementById('dropZone');
  ['dragenter', 'dragover'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
  });
  zone.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  });
}

function onFilePicked(input) {
  if (input.files && input.files.length > 0) {
    processSelectedFile(input.files[0]);
  }
}

function processSelectedFile(file) {
  if (!file.name.endsWith('.mcworld') && !file.name.endsWith('.zip')) {
    alert('Por favor selecciona un archivo con formato .mcworld o .zip');
    return;
  }
  pickedWorldFile = file;
  const badge = document.getElementById('filePickedBadge');
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  badge.innerText = '📄 ' + file.name + ' (' + mb + ' MB)';
  badge.classList.remove('hidden');
  document.getElementById('submitUploadBtn').disabled = false;
}

function executeWorldUpload() {
  if (!pickedWorldFile) return;

  const btn = document.getElementById('submitUploadBtn');
  const progressBox = document.getElementById('uploadProgressBox');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressNum = document.getElementById('uploadProgressNum');
  const alertBox = document.getElementById('uploadResultAlert');

  btn.disabled = true;
  progressBox.classList.remove('hidden');
  alertBox.classList.add('hidden');

  const formData = new FormData();
  formData.append('worldFile', pickedWorldFile);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload-world', true);

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = pct + '%';
      progressNum.innerText = pct + '%';
    }
  };

  xhr.onload = () => {
    progressBox.classList.add('hidden');
    btn.disabled = false;
    try {
      const resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && resp.success) {
        alertBox.className = 'alert-box success';
        alertBox.innerText = '🎉 ' + resp.message;
        alertBox.classList.remove('hidden');
        pickedWorldFile = null;
        document.getElementById('filePickedBadge').classList.add('hidden');
        document.getElementById('fileUploadInput').value = '';
        setTimeout(refreshServerStatus, 2000);
      } else {
        throw new Error(resp.error || 'Fallo al procesar el archivo');
      }
    } catch (err) {
      alertBox.className = 'alert-box error';
      alertBox.innerText = '❌ Error: ' + err.message;
      alertBox.classList.remove('hidden');
    }
  };

  xhr.onerror = () => {
    progressBox.classList.add('hidden');
    btn.disabled = false;
    alertBox.className = 'alert-box error';
    alertBox.innerText = '❌ Error de red al subir el mundo.';
    alertBox.classList.remove('hidden');
  };

  xhr.send(formData);
}

async function sendServerAction(action) {
  const labels = { restart: 'reiniciar', stop: 'detener', start: 'iniciar' };
  if (!confirm('¿Deseas ' + (labels[action] || action) + ' el servidor?')) return;

  try {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const d = await res.json();
    if (d.success) {
      showToast('Servidor ' + action + ' exitoso');
      setTimeout(refreshServerStatus, 1500);
    } else {
      alert('Error: ' + d.error);
    }
  } catch (e) {
    alert('Error al comunicar con el servidor: ' + e.message);
  }
}

function switchGuide(type, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const mob = document.getElementById('guideMobile');
  const pc = document.getElementById('guidePc');
  if (type === 'mobile') {
    mob.classList.remove('hidden');
    pc.classList.add('hidden');
  } else {
    pc.classList.remove('hidden');
    mob.classList.add('hidden');
  }
}
`;

const files = {
  '/opt/minecraft-bedrock/web/server.js': serverJs,
  '/opt/minecraft-bedrock/web/public/index.html': indexHtml,
  '/opt/minecraft-bedrock/web/public/style.css': styleCss,
  '/opt/minecraft-bedrock/web/public/app.js': appJs
};

conn.on('ready', () => {
  console.log('Conectado al VPS via SSH para desplegar UI móvil moderna...');
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
        console.log('Archivos subidos exitosamente via SFTP.');
        conn.exec('cd /opt/minecraft-bedrock && docker compose restart mc-web', (err2, stream) => {
          if (err2) {
            console.error('Restart error:', err2);
            conn.end();
            return;
          }
          stream.on('data', d => process.stdout.write(d));
          stream.stderr.on('data', d => process.stderr.write(d));
          stream.on('close', code => {
            console.log('mc-web reiniciado con código:', code);
            conn.end();
          });
        });
        return;
      }

      const remotePath = paths[index++];
      console.log('Escribiendo:', remotePath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', uploadNext);
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
