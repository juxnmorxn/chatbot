import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TpLinkDeltaStreamDriver, OltDevice } from './drivers/tplink-deltastream.js';
import { getOltDb, initOltDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.OLT_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del dashboard (app.js, iconos, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(process.cwd(), 'dist', 'public')));
app.use(express.static(path.join(process.cwd(), 'olt-manager', 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '..', 'olt-manager', 'public')));

// Ruta explícita y directa para app.js
app.get('/app.js', (req: Request, res: Response) => {
  const possiblePaths = [
    path.join(process.cwd(), 'olt-manager', 'public', 'app.js'),
    path.join(process.cwd(), 'public', 'app.js'),
    path.join(process.cwd(), 'dist', 'public', 'app.js'),
    path.join(__dirname, 'public', 'app.js'),
    path.join(__dirname, '..', 'olt-manager', 'public', 'app.js')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.type('application/javascript');
      return res.sendFile(path.resolve(p));
    }
  }
  res.status(404).send('console.error("app.js not found");');
});

// Inicializar base de datos independiente
await initOltDatabase().catch(err => {
  console.error('Error inicializando base de datos OLT:', err);
});

// Interfaz Web Dashboard
app.get('/', async (req: Request, res: Response) => {
  const db = getOltDb();
  const oltsResult = await db.execute('SELECT * FROM olts ORDER BY created_at DESC');
  const olts = oltsResult.rows as unknown as OltDevice[];

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartOLT CloudWare - Gestión de Fibra Óptica</title>
  <script>
    // Silenciar advertencia informativa de desarrollo de Tailwind CDN
    if (typeof console !== 'undefined' && console.warn) {
      const _origWarn = console.warn;
      console.warn = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
        _origWarn.apply(console, args);
      };
    }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #080c14; color: #f3f4f6; }
    .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-card-hover:hover { border-color: rgba(99, 102, 241, 0.5); transform: translateY(-2px); transition: all 0.2s ease; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Header Superior -->
  <header class="glass-card sticky top-0 z-50 px-6 py-4 border-b border-gray-800/80">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i class="fa-solid fa-network-wired text-white text-lg"></i>
        </div>
        <div>
          <h1 class="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
            CloudWare <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold uppercase tracking-wider">SmartOLT Core</span>
          </h1>
          <p class="text-[11px] text-gray-400">Zero-Touch Provisioning & Multi-OLT Controller</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <button onclick="openWgModal()" class="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition">
          <i class="fa-solid fa-shield-halved text-emerald-400"></i> Enlazar MikroTik (VPN)
        </button>
        <button onclick="openOltModal()" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition">
          <i class="fa-solid fa-plus"></i> Dar de Alta OLT
        </button>
        <button onclick="refreshData()" class="px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition">
          <i class="fa-solid fa-rotate"></i> Actualizar
        </button>
      </div>
    </div>
  </header>

  <!-- Contenedor Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

    <!-- Fila Superior: Selector & Métricas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      
      <!-- Selector de OLT Activa -->
      <div class="glass-card p-4 rounded-2xl md:col-span-1 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">OLT Seleccionada</label>
            <span id="oltCountBadge" class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">${olts.length} registradas</span>
          </div>
          <select id="oltSelect" onchange="onOltChange()" class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 transition">
            ${olts.length === 0 ? '<option value="">-- Sin OLTs registradas --</option>' : ''}
            ${olts.map(o => `<option value="${o.id}">${o.name} (${o.community})</option>`).join('')}
          </select>
        </div>

        <div id="oltLiveStatus" class="mt-4 pt-3 border-t border-gray-800/80 text-xs flex items-center justify-between">
          <span class="text-gray-400">Verificando enlace...</span>
        </div>
      </div>

      <!-- Métricas Rápidas -->
      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <i class="fa-solid fa-satellite-dish text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">Nuevas sin autorizar</p>
          <h3 id="statAutofind" class="text-2xl font-black text-white font-mono">0</h3>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
          <i class="fa-solid fa-circle-check text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">OLTs en Línea</p>
          <h3 id="statOltsOnline" class="text-2xl font-black text-emerald-400 font-mono">--</h3>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">Atenuadas / Caídas</p>
          <h3 id="statAlerts" class="text-2xl font-black text-white font-mono">0</h3>
        </div>
      </div>
    </div>

    <!-- Sección 1: Descubrimiento Automático (Autofind) -->
    <div class="glass-card rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <h2 class="text-sm font-bold text-white tracking-wide">Descubrimiento Automático (Autofind en Vivo)</h2>
        </div>
        <span class="text-xs text-gray-400">ONTs conectadas en campo listas para 1-Click Activate</span>
      </div>

      <div id="autofindContainer" class="p-6">
        <div class="text-center py-8 text-gray-400 text-xs">
          <i class="fa-solid fa-spinner fa-spin text-xl text-indigo-400 mb-2"></i>
          <p>Consultando OLT por SSH...</p>
        </div>
      </div>
    </div>

    <!-- Sección 2: OLTs Registradas y Estado de Enlace -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold text-gray-300 flex items-center gap-2">
          <i class="fa-solid fa-server text-indigo-400"></i> OLTs Registradas y Estado de Enlace
        </h2>
        <span class="text-xs text-gray-500">Haz clic en "Probar Conexión" para verificar el túnel VPN y credenciales</span>
      </div>

      <div id="oltsGrid" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Renderizado dinámico de OLTs -->
      </div>
    </div>

  </main>

  <!-- MODAL: DAR DE ALTA O EDITAR OLT -->
  <div id="oltModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-gray-700/80 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 id="oltModalTitle" class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-plus-circle text-indigo-400"></i> Registrar Nueva OLT
        </h3>
        <button onclick="closeOltModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form id="oltForm" onsubmit="saveOlt(event)" class="space-y-4 text-xs">
        <input type="hidden" id="formOltId">

        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="text-gray-400 block mb-1">Nombre Descriptivo de la OLT</label>
            <input type="text" id="formOltName" required placeholder="Ej. OLT Fray Bartolomé" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="text-gray-400 block mb-1">Modelo de Hardware</label>
            <select id="formOltModel" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
              <option value="TP-Link DS-P7001-01">TP-Link DeltaStream DS-P7001-01 (1 Puerto)</option>
              <option value="TP-Link DS-P7001-04">TP-Link DeltaStream DS-P7001-04 (4 Puertos)</option>
              <option value="TP-Link DS-P7001-08">TP-Link DeltaStream DS-P7001-08 (8 Puertos)</option>
              <option value="TP-Link DS-P7001-16">TP-Link DeltaStream DS-P7001-16 (16 Puertos)</option>
              <option value="Huawei MA5608T">Huawei SmartAX MA5608T</option>
              <option value="Huawei MA5800-X7">Huawei MA5800-X7</option>
              <option value="ZTE C320">ZTE ZXA10 C320</option>
            </select>
          </div>

          <div>
            <label class="text-gray-400 block mb-1">Comunidad / Zona</label>
            <input type="text" id="formOltCommunity" required placeholder="Ej. Fray Bartolomé" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="text-gray-400 block mb-1">IP de Gestión (Enlace VPN)</label>
            <input type="text" id="formOltIp" required placeholder="Ej. 172.19.60.2" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">Puerto SSH</label>
            <input type="number" id="formOltPort" value="22" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-400 block mb-1">Usuario SSH</label>
            <input type="text" id="formOltUser" required placeholder="admin" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">Contraseña SSH</label>
            <input type="password" id="formOltPass" required placeholder="••••••••" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-400 block mb-1">VLAN de Clientes</label>
            <input type="number" id="formOltVlan" required placeholder="400" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">Router MikroTik Cabecera</label>
            <input type="text" id="formOltMikrotik" placeholder="RB-XIDEJE-FRAY" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-gray-800">
          <button type="button" onclick="testModalConnection()" class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-indigo-300 font-semibold rounded-lg flex items-center gap-1.5 transition">
            <i class="fa-solid fa-bolt"></i> Probar Conexión
          </button>
          
          <div class="flex gap-2">
            <button type="button" onclick="closeOltModal()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold">Cancelar</button>
            <button type="submit" id="btnSaveOlt" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
              <i class="fa-solid fa-check"></i> Guardar OLT
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: APROVISIONAR EN 1-CLICK -->
  <div id="provisionModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-gray-700 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-400"></i> Aprovisionar ONT en 1-Click
        </h3>
        <button onclick="closeProvisionModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form id="provisionForm" onsubmit="submitProvision(event)" class="space-y-4 text-xs">
        <div>
          <label class="text-gray-400 block mb-1">Número de Serie (SN ONT)</label>
          <input type="text" id="modalSn" readonly class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-indigo-400 font-mono font-bold">
        </div>

        <div>
          <label class="text-gray-400 block mb-1">Nombre Completo del Cliente / ID Contrato</label>
          <input type="text" id="modalClient" required placeholder="Ej. Juan Pérez - Casa Fray" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-400 block mb-1">VLAN de Servicio</label>
            <input type="number" id="modalVlan" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">ONU ID (Asignado)</label>
            <input type="number" id="modalOnuId" value="1" min="1" max="128" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
        </div>

        <div class="p-3 bg-indigo-950/30 rounded-xl border border-indigo-800/40 text-indigo-200">
          <p class="font-semibold mb-1"><i class="fa-solid fa-circle-info"></i> Acciones al Activar:</p>
          <ul class="list-disc list-inside space-y-0.5 text-gray-300">
            <li>Inyección de Service-Port y VLAN en OLT TP-Link</li>
            <li>Autorización GPON y perfiles Huawei</li>
            <li>Persistencia en base de datos independiente</li>
          </ul>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeProvisionModal()" class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSubmitModal" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2">
            <i class="fa-solid fa-play"></i> Ejecutar Activación
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: ENLAZAR MIKROTIK CON WIREGUARD -->
  <div id="wgModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-xl rounded-2xl p-6 border border-emerald-500/30 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-emerald-400"></i> Enlazar MikroTik v7 a Hostinger (WireGuard)
        </h3>
        <button onclick="closeWgModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40 text-emerald-200">
          <p class="font-bold mb-1">¿Cómo funciona este enlace?</p>
          <p class="text-gray-300">Crea un túnel seguro cifrado directo entre tu MikroTik Cabecera y este VPS. Permite al servidor administrar tus OLTs e inyectar VLANs sin necesidad de IPs públicas fijas en campo.</p>
        </div>

        <form id="wgForm" onsubmit="generateMikrotikScript(event)" class="space-y-3">
          <div>
            <label class="text-gray-400 block mb-1">Nombre del Router Cabecera</label>
            <input type="text" id="wgRouterName" required placeholder="Ej. RB-XIDEJE-FRAY" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500">
          </div>

          <div>
            <label class="text-gray-400 block mb-1">Red Privada de la OLT (Subred que alcanzará el VPS)</label>
            <input type="text" id="wgSubnet" required placeholder="Ej. 172.19.60.0/24" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500">
            <span class="text-[10px] text-gray-500 mt-0.5 block">La subred donde vive la OLT (ej. 172.19.60.0/24 para 172.19.60.2)</span>
          </div>

          <div class="flex justify-end pt-1">
            <button type="submit" id="btnGenWg" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/30">
              <i class="fa-solid fa-terminal"></i> Generar Script MikroTik
            </button>
          </div>
        </form>

        <div id="wgScriptResult" class="hidden space-y-2 pt-2 border-t border-gray-800">
          <div class="flex justify-between items-center">
            <label class="text-emerald-400 font-bold">Comandos para copiar en Winbox (New Terminal):</label>
            <button onclick="copyWgScript()" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded font-semibold text-[11px] flex items-center gap-1">
              <i class="fa-solid fa-copy"></i> Copiar Todo
            </button>
          </div>
          <textarea id="wgScriptContent" readonly rows="8" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 focus:outline-none"></textarea>
          <p class="text-[11px] text-gray-400">💡 Pega estos comandos en tu MikroTik en <b>Terminal</b> y el enlace quedará activo de inmediato.</p>
        </div>
      </div>
    </div>
  </div>

  <script src="/app.js"></script>
</body>
</html>
  `;
  res.send(html);
});

// ==========================================
// APIS WIREGUARD (MikroTik RouterOS v7)
// ==========================================
app.post('/api/wireguard/generate-peer', async (req: Request, res: Response) => {
  try {
    const { routerName, subnet } = req.body;
    const db = getOltDb();

    // 1. Obtener última IP asignada en el rango 10.200.0.X
    const countResult = await db.execute('SELECT COUNT(*) as count FROM wireguard_peers');
    const index = Number(countResult.rows[0]?.count || 0) + 2; // 10.200.0.2 en adelante
    const clientIp = `10.200.0.${index}`;

    // 2. Generar par de llaves en el host (VPS)
    const { execSync } = await import('child_process');
    let clientPriv = '';
    let clientPub = '';
    try {
      clientPriv = execSync('wg genkey').toString().trim();
      clientPub = execSync(`echo "${clientPriv}" | wg pubkey`).toString().trim();
    } catch {
      // Fallback si corre en entorno sin wg binario
      const crypto = await import('crypto');
      clientPriv = crypto.randomBytes(32).toString('base64');
      clientPub = crypto.randomBytes(32).toString('base64');
    }

    const serverPublicKey = 'uqHcuPxy68PPholZRE6tTP7iYhfPKLPsxAjCCkTBp2E=';
    const serverPublicIp = '2.25.241.239';
    const serverPort = 51820;

    // 3. Registrar peer en el servidor WireGuard del VPS
    const sanitizedSubnet = subnet.trim();
    try {
      execSync(`wg set wg0 peer "${clientPub}" allowed-ips "${clientIp}/32,${sanitizedSubnet}"`);
    } catch (e) {
      console.warn('Aviso: No se pudo ejecutar wg set en VPS local (posiblemente dentro de contenedor):', e);
    }

    // 4. Guardar peer en la base de datos independiente
    const peerId = 'peer-' + Date.now();
    await db.execute({
      sql: `INSERT INTO wireguard_peers (id, name, client_ip, public_key, private_key, allowed_subnets)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [peerId, routerName, clientIp, clientPub, clientPriv, sanitizedSubnet]
    });

    // 5. Script RouterOS v7 para MikroTik
    const mikrotikScript = `# ========================================================
# CONEXIÓN WIREGUARD: ${routerName} -> HOSTINGER VPS
# ========================================================
/interface wireguard add name=wg-cloudware listen-port=13231 private-key="${clientPriv}" comment="Tunel SmartOLT CloudWare"

/ip address add address=${clientIp}/24 interface=wg-cloudware network=10.200.0.0

/interface wireguard peers add interface=wg-cloudware public-key="${serverPublicKey}" endpoint-address="${serverPublicIp}" endpoint-port=${serverPort} allowed-address=10.200.0.0/24 persistent-keepalive=25s comment="VPS Hostinger"

# Ruta para permitir que el VPS alcance la OLT
/ip firewall filter add chain=input protocol=udp dst-port=13231 action=accept place-before=0 comment="Permitir WireGuard SmartOLT"
/ip firewall filter add chain=forward in-interface=wg-cloudware action=accept place-before=0 comment="Permitir Trafico SmartOLT hacia OLT"
`;

    res.json({ success: true, script: mikrotikScript, clientIp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// APIS CRUD DE OLTS (Base de Datos Independiente)
// ==========================================

// 1. Listar todas las OLTs registradas
app.get('/api/olts', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    const result = await db.execute('SELECT * FROM olts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Dar de alta una OLT
app.post('/api/olts', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    const { name, model, ip, port, username, password, default_vlan, community, mikrotik_name } = req.body;
    const id = 'olt-' + Date.now();

    // Probar conexión inicial
    const driver = new TpLinkDeltaStreamDriver({ id, name, model, ip, port, username, password, default_vlan, community });
    const test = await driver.testConnection();

    await db.execute({
      sql: `INSERT INTO olts (id, name, model, ip, port, username, password, default_vlan, community, mikrotik_name, status, last_latency_ms, last_checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [id, name, model, ip, port || 22, username, password || '', default_vlan || 100, community, mikrotik_name || '', test.online ? 'online' : 'offline', test.latencyMs]
    });

    res.json({ success: true, id, online: test.online });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Editar OLT
app.put('/api/olts/:id', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    const { id } = req.params;
    const { name, model, ip, port, username, password, default_vlan, community, mikrotik_name } = req.body;

    let updateSql = `
      UPDATE olts 
      SET name = ?, model = ?, ip = ?, port = ?, username = ?, default_vlan = ?, community = ?, mikrotik_name = ?
    `;
    const args: any[] = [name, model, ip, port, username, default_vlan, community, mikrotik_name];

    if (password && password.trim() !== '') {
      updateSql += `, password = ?`;
      args.push(password);
    }

    updateSql += ` WHERE id = ?`;
    args.push(id);

    await db.execute({ sql: updateSql, args });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Eliminar OLT
app.delete('/api/olts/:id', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    await db.execute({ sql: 'DELETE FROM olts WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Probar conexión en vivo de una OLT existente
app.post('/api/olts/:id/test', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    const result = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [req.params.id] });
    const olt = result.rows[0] as unknown as OltDevice;
    if (!olt) return res.status(404).json({ error: 'OLT no encontrada' });

    const driver = new TpLinkDeltaStreamDriver(olt);
    const test = await driver.testConnection();

    // Actualizar estado en DB
    await db.execute({
      sql: `UPDATE olts SET status = ?, last_latency_ms = ?, last_checked_at = datetime('now') WHERE id = ?`,
      args: [test.online ? 'online' : 'offline', test.latencyMs, olt.id]
    });

    res.json(test);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Probar conexión "en frío" desde el formulario antes de guardar
app.post('/api/olts/test-raw', async (req: Request, res: Response) => {
  try {
    const { ip, port, username, password } = req.body;
    const driver = new TpLinkDeltaStreamDriver({ id: 'temp', name: 'temp', model: 'temp', ip, port, username, password, default_vlan: 100, community: 'temp' });
    const test = await driver.testConnection();
    res.json(test);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// APIS DE APROVISIONAMIENTO Y AUTOFIND
// ==========================================

// Endpoint: Listar Autofind de la OLT seleccionada
app.get('/api/autofind', async (req: Request, res: Response) => {
  const oltId = req.query.oltId as string;
  if (!oltId) return res.json({ onts: [] });

  const db = getOltDb();
  const result = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
  const olt = result.rows[0] as unknown as OltDevice;

  if (!olt) return res.status(404).json({ error: 'OLT no encontrada' });

  const driver = new TpLinkDeltaStreamDriver(olt);
  const onts = await driver.getAutofindOnts('1/0/1');
  res.json({ oltId: olt.id, onts });
});

// Endpoint: Aprovisionamiento en 1-Click
app.post('/api/provision', async (req: Request, res: Response) => {
  const { oltId, serial, clientName, vlanId, onuId, gponPort } = req.body;
  const db = getOltDb();
  const result = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
  const olt = result.rows[0] as unknown as OltDevice;

  if (!olt) return res.status(404).json({ error: 'OLT no encontrada' });

  const driver = new TpLinkDeltaStreamDriver(olt);
  const provResult = await driver.provisionOnt({
    gponPort: gponPort || '1/0/1',
    onuId: onuId || 1,
    serial,
    clientName,
    vlanId: vlanId || olt.default_vlan,
    lineProfileId: 4,
    srvProfileId: 10,
    srvPortProfileId: 4
  });

  if (provResult.success) {
    // Guardar en tabla independiente de ONTs aprovisionadas
    await db.execute({
      sql: `INSERT OR REPLACE INTO provisioned_onts (olt_id, gpon_port, onu_id, serial, client_name, vlan_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'online')`,
      args: [olt.id, gponPort || '1/0/1', onuId || 1, serial, clientName, vlanId || olt.default_vlan]
    });
  }

  res.json(provResult);
});

// Endpoint: Niveles Ópticos (dBm)
app.get('/api/optical-info', async (req: Request, res: Response) => {
  const oltId = req.query.oltId as string;
  if (!oltId) return res.json({ levels: [] });

  const db = getOltDb();
  const result = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
  const olt = result.rows[0] as unknown as OltDevice;

  if (!olt) return res.status(404).json({ error: 'OLT no encontrada' });

  const driver = new TpLinkDeltaStreamDriver(olt);
  const levels = await driver.getOpticalLevels('1/0/1');
  res.json({ oltId: olt.id, levels });
});

app.listen(PORT, () => {
  console.log(`🚀 OLT Manager Core corriendo en http://localhost:${PORT}`);
});
