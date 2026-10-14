import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TpLinkDeltaStreamDriver, OltDevice } from './drivers/tplink-deltastream.js';
import { getOltDb, initOltDatabase } from './db.js';
import {
  generateWireguardKeypair,
  applyWireguardPeer,
  removeWireguardPeer,
  getWireguardStats,
  buildMikrotikScript
} from './wireguard.js';
import { GenieAcsClient } from './services/genieacs-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.OLT_PORT || 3001;
const acsClient = new GenieAcsClient();

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

// Sincronizar todos los peers existentes en la DB con WireGuard al arrancar
try {
  const db = getOltDb();
  const existingPeers = await db.execute('SELECT * FROM wireguard_peers');
  for (const peer of existingPeers.rows as any[]) {
    applyWireguardPeer(peer.public_key, peer.client_ip, peer.allowed_subnets);
  }
} catch (e) {
  console.warn('[CloudOLT] Aviso sincronizando peers al inicio:', e);
}

// ==========================================
// INTERFAZ WEB DASHBOARD (CloudOLT)
// ==========================================
app.get('/', async (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudOLT - Gestión Centralizada de OLTs y Fibra Óptica</title>
  <script>
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
    .glass-card-hover:hover { border-color: rgba(99, 102, 241, 0.5); transform: translateY(-1px); transition: all 0.2s ease; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Header Superior (SmartOLT Style) -->
  <header class="glass-card sticky top-0 z-50 px-6 py-3.5 border-b border-gray-800/80">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      
      <!-- Brand & Navigation Tabs -->
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="switchTab('olts')">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <i class="fa-solid fa-network-wired text-white text-base"></i>
          </div>
          <div>
            <h1 class="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              CloudOLT <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold uppercase tracking-wider">Core v3.6</span>
            </h1>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="hidden md:flex items-center space-x-1.5 bg-gray-950/80 p-1 rounded-xl border border-gray-800">
          <button id="tab-btn-olts" onclick="switchTab('olts')" class="nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition bg-indigo-600 text-white shadow-md shadow-indigo-500/30 flex items-center gap-1.5">
            <i class="fa-solid fa-server"></i> OLTs
          </button>
          <button id="tab-btn-onus" onclick="switchTab('onus')" class="nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition flex items-center gap-1.5">
            <i class="fa-solid fa-network-wired text-sky-400"></i> ONUs
            <span id="onusCountBadge" class="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">0</span>
          </button>
          <button id="tab-btn-unconfigured" onclick="switchTab('unconfigured')" class="nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition flex items-center gap-1.5">
            <i class="fa-solid fa-satellite-dish"></i> Unconfigured
            <span id="unconfiguredBadge" class="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">0</span>
          </button>
          <button id="tab-btn-tunnels" onclick="switchTab('tunnels')" class="nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition flex items-center gap-1.5">
            <i class="fa-solid fa-shield-halved text-emerald-400"></i> VPN Tunnels
            <span id="tunnelsCountBadge" class="text-[10px] text-gray-500 font-mono">0</span>
          </button>
        </nav>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-2.5">
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-950/70 border border-emerald-500/20 text-[11px] text-emerald-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>En vivo (2s)</span>
        </div>
        <button onclick="openCreateTunnelModal()" class="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
          <i class="fa-solid fa-plus text-emerald-400"></i> Create a new tunnel
        </button>
        <button onclick="openOltModal()" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition">
          <i class="fa-solid fa-plus"></i> Add OLT
        </button>
        <button onclick="activeTab === 'tunnels' ? loadTunnels() : (activeTab === 'unconfigured' ? refreshAutofind() : (activeTab === 'onus' ? loadOnus(true) : loadOlts()))" class="px-2.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs transition" title="Actualizar datos">
          <i class="fa-solid fa-rotate"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Contenedor Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

    <!-- ========================================== -->
    <!-- VISTA 1: TABLA PRINCIPAL DE OLTS (Screenshot 2) -->
    <!-- ========================================== -->
    <section id="view-olts" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            OLTs <span id="oltsCountBadge" class="text-xs px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">0 OLTs</span>
          </h2>
          <p class="text-xs text-gray-400">Add and manage the OLTs that CloudOLT connects to.</p>
        </div>

        <button onclick="openOltModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition">
          <i class="fa-solid fa-plus"></i> Add OLT
        </button>
      </div>

      <div class="glass-card rounded-2xl overflow-hidden border border-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-950/60 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4 w-20">View</th>
                <th class="py-3 px-4 w-12">ID</th>
                <th class="py-3 px-4 w-10 text-center">&bull;</th>
                <th class="py-3 px-4">VPN</th>
                <th class="py-3 px-4">Name</th>
                <th class="py-3 px-4">OLT IP</th>
                <th class="py-3 px-4">TCP</th>
                <th class="py-3 px-4">OLT hardware version</th>
                <th class="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="oltsTableBody">
              <!-- Renderizado por app.js -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- VISTA 2: VPN TUNNELS (Screenshot 4) -->
    <!-- ========================================== -->
    <section id="view-tunnels" class="hidden space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            System Config &bull; <span class="text-emerald-400">VPN Tunnels</span>
          </h2>
          <p class="text-xs text-gray-400">Set up the WireGuard VPN tunnels from your MikroTik routers to reach your OLTs.</p>
        </div>

        <button onclick="openCreateTunnelModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition">
          <i class="fa-solid fa-plus"></i> Create a new tunnel
        </button>
      </div>

      <!-- Banner Informativo WireGuard -->
      <div class="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/50 text-sky-200 text-xs flex items-center gap-3">
        <i class="fa-solid fa-circle-info text-sky-400 text-base"></i>
        <div>
          <p class="font-bold">WireGuard is faster and uses less router CPU.</p>
          <p class="text-[11px] text-gray-300">Funciona de forma nativa en MikroTik RouterOS v7.12.1 o superior. No requiere IPs públicas fijas en campo.</p>
        </div>
      </div>

      <div class="glass-card rounded-2xl overflow-hidden border border-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-950/60 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4 w-12">#</th>
                <th class="py-3 px-4">User / tunnel name</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Subnet</th>
                <th class="py-3 px-4">Connected subnets</th>
                <th class="py-3 px-4">Used by</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="tunnelsTableBody">
              <!-- Renderizado por app.js -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- VISTA 3: UNCONFIGURED ONTS (Autofind) -->
    <!-- ========================================== -->
    <section id="view-unconfigured" class="hidden space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Unconfigured ONTs (Autofind en Vivo)
          </h2>
          <p class="text-xs text-gray-400">ONTs conectadas en campo pendientes por autorizar. 1-Click Activate.</p>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-gray-400">Filtrar por OLT:</label>
          <select id="autofindOltSelect" onchange="onAutofindOltChange()" class="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
            <!-- OLT options -->
          </select>
          <button onclick="refreshAutofind()" class="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-rotate"></i> Escanear
          </button>
        </div>
      </div>

      <div id="autofindContainer" class="glass-card p-6 rounded-2xl min-h-[220px]">
        <!-- Renderizado dinámicamente -->
      </div>
    </section>

    <!-- ========================================== -->
    <!-- VISTA 4: ONUS CONFIGURADAS (SmartOLT Style) -->
    <!-- ========================================== -->
    <section id="view-onus" class="hidden space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            ONUs <span id="onusTotalBadge" class="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">0 ONUs</span>
          </h2>
          <p class="text-xs text-gray-400">Listado de abonados y ONTs configuradas en la OLT con lectura óptica en vivo (dBm), paquetes y estado.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-500 text-xs"></i>
            <input type="text" id="onusSearchInput" oninput="filterOnusTable()" placeholder="Buscar cliente o SN..." class="bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 w-48 sm:w-60">
          </div>

          <select id="onusOltSelect" onchange="loadOnus()" class="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500">
            <!-- OLT options -->
          </select>

          <button onclick="loadOnus(true)" class="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-rotate" id="btnRefreshOnusIcon"></i> Actualizar Señales
          </button>
        </div>
      </div>

      <!-- Métricas rápidas de fibra -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="glass-card p-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-semibold">Online</div>
            <div id="statOnusOnline" class="text-sm font-bold text-white font-mono">0</div>
          </div>
        </div>
        <div class="glass-card p-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-sm">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-semibold">Offline / Caídas</div>
            <div id="statOnusOffline" class="text-sm font-bold text-white font-mono">0</div>
          </div>
        </div>
        <div class="glass-card p-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center text-sm">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-semibold">Señal Óptima (&gt; -25)</div>
            <div id="statOnusOptimal" class="text-sm font-bold text-white font-mono">0</div>
          </div>
        </div>
        <div class="glass-card p-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-semibold">Atenuación Alta (&lt; -25)</div>
            <div id="statOnusWarning" class="text-sm font-bold text-white font-mono">0</div>
          </div>
        </div>
      </div>

      <!-- Tabla SmartOLT de ONUs -->
      <div class="glass-card rounded-2xl overflow-hidden border border-gray-800">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-950/60 border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4 w-12">#</th>
                <th class="py-3 px-4">Estado</th>
                <th class="py-3 px-4">Cliente / Nombre</th>
                <th class="py-3 px-4">Serial (SN)</th>
                <th class="py-3 px-4">Puerto GPON</th>
                <th class="py-3 px-4">Potencia RX (ONU)</th>
                <th class="py-3 px-4">Potencia TX</th>
                <th class="py-3 px-4">VLAN / Perfil</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="onusTableBody">
              <!-- Renderizado dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

  </main>

  <!-- ========================================== -->
  <!-- MODAL 1: ADD / EDIT OLT (Screenshot 3) -->
  <!-- ========================================== -->
  <div id="oltModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-xl rounded-2xl p-6 border border-indigo-500/30 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 id="oltModalTitle" class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-server text-indigo-400"></i> Add OLT (Dar de Alta OLT)
        </h3>
        <button onclick="closeOltModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="saveOlt(event)" class="space-y-3.5 text-xs">
        <input type="hidden" id="formOltId">

        <div>
          <label class="text-gray-300 block mb-1 font-semibold">Name (Nombre Descriptivo de la OLT)</label>
          <input type="text" id="formOltName" required placeholder="Ej. OLT-FrayBartolome o OLT-SanAgustin" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
        </div>

        <div>
          <label class="text-emerald-400 block mb-1 font-bold flex items-center justify-between">
            <span>VPN Tunnel (MikroTik Cabecera)</span>
            <button type="button" onclick="closeOltModal(); openCreateTunnelModal();" class="text-[11px] text-indigo-400 hover:underline font-normal">+ Crear nuevo túnel</button>
          </label>
          <select id="formOltTunnel" required class="w-full bg-gray-950 border border-emerald-500/40 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono">
            <!-- Tunnels options -->
          </select>
          <span class="text-[10px] text-gray-500 mt-0.5 block">Selecciona el túnel del MikroTik al que está conectada la OLT.</span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="text-gray-300 block mb-1 font-semibold">OLT IP or FQDN</label>
            <input type="text" id="formOltIp" required placeholder="172.19.60.2" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="text-gray-300 block mb-1 font-semibold">TCP port (SSH)</label>
            <input type="number" id="formOltPort" value="22" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-300 block mb-1 font-semibold">OLT username</label>
            <input type="text" id="formOltUser" value="admin" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="text-gray-300 block mb-1 font-semibold">OLT password</label>
            <input type="password" id="formOltPass" placeholder="••••••••" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-300 block mb-1 font-semibold">Manufacturer & Hardware version</label>
            <select id="formOltModel" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
              <option value="TP-Link DeltaStream DS-P7001-01">TP-Link DeltaStream DS-P7001-01 (1 Puerto)</option>
              <option value="TP-Link DeltaStream DS-P7001-04">TP-Link DeltaStream DS-P7001-04 (4 Puertos)</option>
              <option value="Huawei-MA5608T">Huawei SmartAX MA5608T</option>
              <option value="Huawei-EA5800-X15">Huawei EA5800-X15</option>
            </select>
          </div>
          <div>
            <label class="text-gray-300 block mb-1 font-semibold">VLAN Clientes por Defecto</label>
            <input type="number" id="formOltVlan" value="400" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500">
          </div>
        </div>

        <input type="hidden" id="formOltCommunity" value="public">

        <div class="flex items-center justify-between pt-3 border-t border-gray-800">
          <button type="button" id="btnTestModal" onclick="testModalConnection()" class="px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-xl font-bold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-bolt"></i> Test connection
          </button>

          <div class="flex items-center gap-2">
            <button type="button" onclick="closeOltModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancel</button>
            <button type="submit" id="btnSaveOlt" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition">
              <i class="fa-solid fa-check"></i> Save
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 2: CREATE / EDIT VPN TUNNEL (Screenshot 4) -->
  <!-- ========================================== -->
  <div id="tunnelModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-emerald-500/30 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 id="tunnelModalTitle" class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-emerald-400"></i> Crear Nuevo Túnel VPN MikroTik
        </h3>
        <button onclick="closeTunnelModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="saveTunnel(event)" class="space-y-3.5 text-xs">
        <input type="hidden" id="formTunnelId">

        <div>
          <label class="text-gray-300 block mb-1 font-semibold">User / tunnel name (Nombre del MikroTik)</label>
          <input type="text" id="formTunnelName" required placeholder="Ej. fray o plomosas" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="text-gray-300 block mb-1 font-semibold">Connected subnets (Red Privada de la OLT)</label>
          <input type="text" id="formTunnelSubnets" placeholder="Ej. 172.19.60.0/24" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500">
          <span class="text-[10px] text-gray-500 mt-0.5 block">La subred local donde vive tu OLT (ej. 172.19.60.0/24 para la IP 172.19.60.2). El VPS creará la ruta en Linux automáticamente.</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
          <button type="button" onclick="closeTunnelModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSaveTunnel" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition">
            <i class="fa-solid fa-shield-halved"></i> Guardar y Generar Script
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 3: VPN SETUP SCRIPT (SmartOLT exact style) -->
  <!-- ========================================== -->
  <div id="setupModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-2xl rounded-2xl p-6 border border-sky-500/30 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <div>
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-terminal text-sky-400"></i> VPN Setup - RouterOS Terminal Commands
          </h3>
          <p class="text-[11px] text-gray-400 mt-0.5">
            Tunnel: <span id="setupModalTunnelName" class="font-mono text-emerald-400 font-semibold">tunnel1@cloudware.cloudolt.com</span> &bull; Protocol: <span class="text-sky-300 font-semibold">WireGuard</span>
          </p>
        </div>
        <button onclick="closeSetupModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <div class="space-y-3 text-xs">
        <p class="text-gray-300">
          Copia y pega el siguiente bloque de comandos en la consola (Terminal) de tu RouterOS. El túnel quedará enlazado al instante y permitirá alcanzar la OLT sin necesidad de IPs públicas fijas.
        </p>

        <textarea id="setupModalScript" readonly rows="9" class="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-[11px] font-mono text-emerald-300 focus:outline-none"></textarea>

        <div class="flex items-center justify-between pt-2">
          <p class="text-[11px] text-gray-400 flex items-center gap-1">
            <i class="fa-solid fa-lightbulb text-amber-400"></i> Pega estos comandos en New Terminal de Winbox.
          </p>
          <div class="flex items-center gap-2">
            <button onclick="closeSetupModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cerrar</button>
            <button onclick="copySetupScript()" class="px-4 py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/20">
              <i class="fa-solid fa-copy"></i> Copiar Todo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 4: PROVISION ONT -->
  <!-- ========================================== -->
  <div id="provisionModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-amber-500/30 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-400"></i> Aprovisionar ONT en OLT
        </h3>
        <button onclick="closeProvisionModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="submitProvision(event)" class="space-y-3 text-xs">
        <input type="hidden" id="modalPort">
        <div>
          <label class="text-gray-400 block mb-1">Serial Number (SN)</label>
          <input type="text" id="modalSn" readonly class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
        </div>

        <div>
          <label class="text-gray-400 block mb-1">Nombre Completo del Cliente / ID Contrato</label>
          <input type="text" id="modalClient" required placeholder="Ej. Juan Pérez - Plan 50M" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-400 block mb-1">VLAN de Servicio</label>
            <input type="number" id="modalVlan" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">ONU ID</label>
            <input type="number" id="modalOnuId" value="1" min="1" max="128" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono">
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-800">
          <button type="button" onclick="closeProvisionModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSubmitModal" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-play"></i> Ejecutar Activación
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 5: DETALLE DE LA ONU (SmartOLT Screenshot 3) -->
  <!-- ========================================== -->
  <div id="viewOnuModal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 hidden flex items-center justify-center p-3 sm:p-5">
    <div class="glass-card w-full max-w-4xl rounded-2xl p-6 border border-gray-700/60 space-y-4 max-h-[92vh] overflow-y-auto">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-800 gap-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-network-wired"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white flex items-center gap-2">
              <span id="viewOnuTitleName">Cliente</span>
              <span id="viewOnuStatusPill" class="text-[10px] px-2 py-0.5 rounded-full font-bold">ONLINE</span>
            </h3>
            <p class="text-xs text-gray-400 font-mono" id="viewOnuSubtitle">gpon-onu_1/0/1:1 &bull; HWTC-685E10B6</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
            <i class="fa-solid fa-server text-[10px]"></i> TR-069 ACS: 10.200.0.1:7547
          </span>
          <button onclick="closeViewOnuModal()" class="text-gray-400 hover:text-white p-1 text-lg">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-1.5 text-xs">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dispositivo & OLT</div>
          <div class="flex justify-between"><span class="text-gray-400">OLT:</span> <span id="viewOnuOltName" class="font-bold text-white">fray</span></div>
          <div class="flex justify-between"><span class="text-gray-400">Puerto GPON:</span> <span id="viewOnuPort" class="font-mono text-gray-200">1/0/1:1</span></div>
          <div class="flex justify-between"><span class="text-gray-400">Número de Serie:</span> <span id="viewOnuSn" class="font-mono text-sky-400 font-bold">HWTC-685E10B6</span></div>
          <div class="flex justify-between"><span class="text-gray-400">Modelo:</span> <span id="viewOnuModel" class="text-gray-200">Huawei GPON ONT</span></div>
        </div>

        <div class="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-2 text-xs">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Potencia Óptica (dBm)</div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">Rx Power (ONU):</span>
            <span id="viewOnuRxDbm" class="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 text-xs">-19.79 dBm</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">Tx Power (Láser):</span>
            <span id="viewOnuTxDbm" class="font-mono text-gray-300 text-xs">1.94 dBm</span>
          </div>
          <div class="w-full bg-gray-900 rounded-full h-1.5 mt-1 overflow-hidden">
            <div id="viewOnuSignalBar" class="bg-emerald-400 h-1.5 rounded-full" style="width: 85%;"></div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-2 text-xs">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado TR-069 CWMP</div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">Servidor CWMP:</span>
            <span class="text-emerald-400 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> GenieACS Online</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">VLAN de Servicio:</span>
            <span id="viewOnuVlanBadge" class="font-mono text-indigo-300 px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/30">VLAN 400</span>
          </div>
          <div class="text-[11px] text-gray-400 flex items-center gap-1">
            <i class="fa-solid fa-circle-check text-emerald-400 text-[10px]"></i> TR-069 / OMCI Habilitado
          </div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-sliders text-indigo-400"></i> Modo de Operación & Enrutamiento WAN (IPv4 / IPv6)
          </h4>
          <button onclick="openUpdateWanModal()" class="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20">
            <i class="fa-solid fa-pen-to-square"></i> Update ONU mode / IP
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-2.5 rounded-lg bg-gray-950 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 uppercase block font-semibold">Modo ONU</span>
            <span id="viewWanOnuMode" class="font-bold text-white">Routing</span>
          </div>
          <div class="p-2.5 rounded-lg bg-gray-950 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 uppercase block font-semibold">Tipo Conexión WAN</span>
            <span id="viewWanSetupMode" class="font-bold text-sky-400">Static IP (TR-069)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-gray-950 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 uppercase block font-semibold">Dirección IPv4 WAN</span>
            <span id="viewWanIp" class="font-mono font-bold text-indigo-300">172.19.60.100</span>
          </div>
          <div class="p-2.5 rounded-lg bg-gray-950 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 uppercase block font-semibold">Protocolo IP</span>
            <span id="viewWanProtocol" class="font-bold text-emerald-400">Dual stack IPv4/IPv6</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div class="text-gray-400 flex justify-between px-2"><span>Máscara de Red:</span> <span id="viewWanMask" class="font-mono text-gray-200">255.255.255.0</span></div>
          <div class="text-gray-400 flex justify-between px-2"><span>Gateway:</span> <span id="viewWanGw" class="font-mono text-gray-200">172.19.60.1</span></div>
          <div class="text-gray-400 flex justify-between px-2"><span>Prefijo IPv6:</span> <span id="viewWanIpv6Prefix" class="font-mono text-emerald-300">DHCPv6-PD (Auto)</span></div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-wifi text-emerald-400"></i> Red Inalámbrica Wi-Fi & Seguridad
          </h4>
          <div class="flex items-center gap-2">
            <button onclick="openChangePasswordModal()" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition flex items-center gap-1">
              <i class="fa-solid fa-key"></i> Clave Web
            </button>
            <button onclick="openChangeWifiModal()" class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
              <i class="fa-solid fa-wifi"></i> Cambiar Wi-Fi
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-lg bg-gray-950 border border-gray-800/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-gray-400 uppercase block font-semibold">Nombre de Red (SSID)</span>
              <span id="viewWifiSsid" class="font-bold text-white text-sm">CloudWare_Fibra</span>
            </div>
            <i class="fa-solid fa-signal text-emerald-400/60 text-lg"></i>
          </div>
          <div class="p-3 rounded-lg bg-gray-950 border border-gray-800/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-gray-400 uppercase block font-semibold">Contraseña Wi-Fi (WPA2)</span>
              <span id="viewWifiPass" class="font-mono text-gray-200 text-sm">••••••••••••</span>
            </div>
            <button onclick="toggleWifiPassVisibility()" class="text-gray-400 hover:text-white p-1 text-xs">
              <i class="fa-solid fa-eye" id="btnToggleWifiEye"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between pt-3 border-t border-gray-800 gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="actionViewOnuReboot()" class="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <i class="fa-solid fa-power-off"></i> Reboot
          </button>
          <button onclick="actionViewOnuResync()" class="px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <i class="fa-solid fa-rotate"></i> Resync config
          </button>
          <button onclick="actionViewOnuRestoreDefaults()" class="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left"></i> Restore defaults
          </button>
          <button onclick="actionViewOnuToggleActive()" id="btnViewOnuDisable" class="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <i class="fa-solid fa-ban"></i> Disable ONU
          </button>
        </div>

        <button onclick="actionViewOnuDelete()" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/25">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 6: UPDATE ONU MODE / IP (SmartOLT Screenshot 4 - EXACT MATCH) -->
  <!-- ========================================== -->
  <div id="updateWanModal" class="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] hidden flex items-center justify-center p-3 sm:p-5">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-gray-700/80 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
      <div class="flex justify-between items-center pb-2.5 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          Update ONU mode
        </h3>
        <button onclick="closeUpdateWanModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="submitUpdateWan(event)" class="space-y-4 text-xs">
        <input type="hidden" id="wanModalSn">
        <input type="hidden" id="wanModalOltId">
        <input type="hidden" id="wanModalGponPort">
        <input type="hidden" id="wanModalOnuId">

        <div>
          <label class="text-gray-300 font-semibold block mb-1">WAN VLAN-ID</label>
          <input type="number" id="wanModalVlan" value="400" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500">
          <span class="text-[10px] text-gray-500 mt-0.5 block">After changing the WAN VLAN-ID, please check the Ethernet ports settings and update VLANs as desired.</span>
        </div>

        <div class="flex items-center justify-between py-1">
          <span class="text-gray-300 font-semibold">ONU mode</span>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-200">
              <input type="radio" name="wanOnuModeRadio" value="Routing" checked class="text-indigo-600 focus:ring-0"> Routing
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-200">
              <input type="radio" name="wanOnuModeRadio" value="Bridging" class="text-indigo-600 focus:ring-0"> Bridging
            </label>
          </div>
        </div>

        <div class="space-y-1.5 pt-1 border-t border-gray-800/80">
          <span class="text-gray-300 font-semibold block">WAN mode</span>
          <div class="flex flex-wrap items-center gap-4 pl-1">
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-400 text-[11px]">
              <input type="radio" name="wanTypeRadio" value="DHCP" onchange="toggleWanFields()"> DHCP
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-white font-semibold text-[11px]">
              <input type="radio" name="wanTypeRadio" value="Static" checked onchange="toggleWanFields()"> Static IP
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-400 text-[11px]">
              <input type="radio" name="wanTypeRadio" value="PPPoE" onchange="toggleWanFields()"> PPPoE
            </label>
          </div>
        </div>

        <div class="flex items-center justify-between py-1 border-t border-gray-800/80">
          <span class="text-gray-300 font-semibold">Config method</span>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-300 text-[11px]">
              <input type="radio" name="wanConfigMethodRadio" value="OMCI"> OMCI
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-sky-400 font-bold text-[11px]">
              <input type="radio" name="wanConfigMethodRadio" value="TR069" checked> TR069
            </label>
          </div>
        </div>

        <div class="flex items-center justify-between py-1 border-t border-gray-800/80">
          <span class="text-gray-300 font-semibold">IP Protocol</span>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 cursor-pointer text-gray-300 text-[11px]">
              <input type="radio" name="wanIpProtocolRadio" value="IPv4"> IPv4
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-emerald-400 font-bold text-[11px]">
              <input type="radio" name="wanIpProtocolRadio" value="DualStack" checked> Dual stack IPv4/IPv6
            </label>
          </div>
        </div>

        <div id="wanStaticDetailsContainer" class="space-y-2.5 p-3.5 rounded-xl bg-gray-950/80 border border-gray-800">
          <div>
            <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">IPv4 ADDRESS</label>
            <input type="text" id="wanModalIp" placeholder="172.19.60.100" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">SUBNET MASK</label>
              <input type="text" id="wanModalMask" value="255.255.255.0" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">DEFAULT GATEWAY</label>
              <input type="text" id="wanModalGw" placeholder="172.19.60.1" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">DNS 1</label>
              <input type="text" id="wanModalDns1" value="8.8.8.8" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">DNS 2</label>
              <input type="text" id="wanModalDns2" value="8.8.4.4" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500">
            </div>
          </div>
        </div>

        <div id="wanPppoeDetailsContainer" class="hidden space-y-2.5 p-3.5 rounded-xl bg-gray-950/80 border border-gray-800">
          <div>
            <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">PPPoE Username</label>
            <input type="text" id="wanModalPppoeUser" placeholder="usuario@cloudware" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white text-xs">
          </div>
          <div>
            <label class="text-gray-400 uppercase text-[10px] font-bold block mb-1">PPPoE Password</label>
            <input type="password" id="wanModalPppoePass" placeholder="••••••••" class="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white text-xs">
          </div>
        </div>

        <div class="space-y-1.5 pt-1 border-t border-gray-800/80">
          <div class="flex items-center justify-between">
            <span class="text-gray-300 font-semibold">IPv6 address</span>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1 cursor-pointer text-emerald-400 font-bold text-[11px]"><input type="radio" name="wanIpv6AddrRadio" value="DHCPv6" checked> DHCPv6</label>
              <label class="flex items-center gap-1 cursor-pointer text-gray-400 text-[11px]"><input type="radio" name="wanIpv6AddrRadio" value="Auto"> Auto</label>
              <label class="flex items-center gap-1 cursor-pointer text-gray-400 text-[11px]"><input type="radio" name="wanIpv6AddrRadio" value="None"> None</label>
            </div>
          </div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-gray-300 font-semibold">IPv6 prefix</span>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1 cursor-pointer text-emerald-400 font-bold text-[11px]"><input type="radio" name="wanIpv6PrefixRadio" value="DHCPv6-PD" checked> DHCPv6-PD</label>
              <label class="flex items-center gap-1 cursor-pointer text-gray-400 text-[11px]"><input type="radio" name="wanIpv6PrefixRadio" value="None"> None</label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
          <button type="button" onclick="closeUpdateWanModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Close</button>
          <button type="submit" id="btnSubmitWanUpdate" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition">
            <i class="fa-solid fa-check"></i> Update
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 7: CAMBIO DE WI-FI (SSID / PASSWORD) -->
  <!-- ========================================== -->
  <div id="changeWifiModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[65] hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md rounded-2xl p-6 border border-emerald-500/40 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center pb-2.5 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-wifi text-emerald-400"></i> Cambiar Wi-Fi (TR-069)
        </h3>
        <button onclick="closeChangeWifiModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="submitChangeWifi(event)" class="space-y-3.5 text-xs">
        <div>
          <label class="text-gray-300 font-semibold block mb-1">Nombre de Red Wi-Fi (SSID)</label>
          <input type="text" id="wifiModalSsid" required placeholder="MiRedWifi" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="text-gray-300 font-semibold block mb-1">Nueva Contraseña Wi-Fi (WPA2-PSK)</label>
          <input type="text" id="wifiModalPass" required minlength="8" placeholder="Mínimo 8 caracteres" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500">
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
          <button type="button" onclick="closeChangeWifiModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSubmitWifiModal" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition">
            <i class="fa-solid fa-floppy-disk"></i> Aplicar en ONT
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- MODAL 8: CAMBIAR CONTRASEÑA WEB DEL MÓDEM -->
  <!-- ========================================== -->
  <div id="changeWebPassModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[65] hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md rounded-2xl p-6 border border-indigo-500/40 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center pb-2.5 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-key text-indigo-400"></i> Cambiar Contraseña Web del Módem
        </h3>
        <button onclick="closeChangeWebPassModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <form onsubmit="submitChangeWebPass(event)" class="space-y-3.5 text-xs">
        <div>
          <label class="text-gray-300 font-semibold block mb-1">Nueva Contraseña Web de Administración</label>
          <input type="password" id="webPassModalPass" required minlength="6" placeholder="••••••••" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500">
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
          <button type="button" onclick="closeChangeWebPassModal()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSubmitWebPassModal" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition">
            <i class="fa-solid fa-floppy-disk"></i> Guardar en ONT
          </button>
        </div>
      </form>
    </div>
  </div>
  <!-- SISTEMA DE TOASTS EN VIVO -->
  <!-- ========================================== -->
  <div id="toastContainer" class="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none"></div>

  <!-- ========================================== -->
  <!-- MODAL DE DIÁLOGO / CONFIRMACIÓN PERSONALIZADO -->
  <!-- ========================================== -->
  <div id="customDialogModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998] hidden flex items-center justify-center p-4">
    <div id="customDialogBox" class="glass-card w-full max-w-md rounded-2xl p-6 border border-gray-700/60 space-y-4 shadow-2xl transform transition-all scale-95 opacity-0 duration-200">
      <div class="flex items-start gap-3.5">
        <div id="customDialogIconContainer" class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"></div>
        <div class="flex-1 min-w-0">
          <h3 id="customDialogTitle" class="text-base font-bold text-white mb-1.5"></h3>
          <p id="customDialogMessage" class="text-xs text-gray-300 leading-relaxed"></p>
        </div>
      </div>
      <div class="flex justify-end gap-2.5 pt-3 border-t border-gray-800/80" id="customDialogButtons"></div>
    </div>
  </div>

  <script src="/app.js"></script>
</body>
</html>
  `;
  res.send(html);
});

// ==========================================
// APIS CRUD DE TÚNELES VPN (RouterOS WireGuard)
// ==========================================

// 1. Listar todos los túneles con estadísticas en vivo
app.get('/api/tunnels', async (req: Request, res: Response) => {
  try {
    const db = getOltDb();
    const result = await db.execute('SELECT * FROM wireguard_peers ORDER BY created_at DESC');
    const liveStats = getWireguardStats();

    const tunnels = result.rows.map((row: any) => {
      const stats = liveStats.get(row.public_key);
      const isConnected = stats ? stats.isConnected : false;
      return {
        ...row,
        status: isConnected ? 'connected' : 'disconnected',
        seconds_ago: stats ? stats.secondsAgo : null,
        transfer_rx: stats ? stats.transferRx : 0,
        transfer_tx: stats ? stats.transferTx : 0,
        latest_handshake: stats ? stats.latestHandshake : 0
      };
    });

    res.json(tunnels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Crear un nuevo túnel VPN
app.post('/api/tunnels', async (req: Request, res: Response) => {
  try {
    const { name, subnets } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre del túnel es obligatorio' });
    }

    const db = getOltDb();
    const countResult = await db.execute('SELECT COUNT(*) as count FROM wireguard_peers');
    const index = Number(countResult.rows[0]?.count || 0) + 2; // 10.200.0.2 en adelante
    const clientIp = `10.200.0.${index}`;

    // Generar llaves Curve25519
    const keypair = generateWireguardKeypair();

    // Aplicar peer y rutas en el kernel de Linux
    const sanitizedSubnets = (subnets && typeof subnets === 'string') ? subnets.trim() : '';
    applyWireguardPeer(keypair.publicKey, clientIp, sanitizedSubnets);

    const tunnelId = 'tunnel-' + Date.now();
    await db.execute({
      sql: `INSERT INTO wireguard_peers (id, name, client_ip, public_key, private_key, allowed_subnets)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [tunnelId, name.trim(), clientIp, keypair.publicKey, keypair.privateKey, sanitizedSubnets]
    });

    res.json({ success: true, id: tunnelId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Editar subredes de un túnel
app.put('/api/tunnels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subnets } = req.body;
    const db = getOltDb();

    const existingResult = await db.execute({ sql: 'SELECT * FROM wireguard_peers WHERE id = ?', args: [id] });
    const peer = existingResult.rows[0] as any;
    if (!peer) return res.status(404).json({ error: 'Túnel no encontrado' });

    const sanitizedSubnets = (subnets && typeof subnets === 'string') ? subnets.trim() : '';
    applyWireguardPeer(peer.public_key, peer.client_ip, sanitizedSubnets);

    await db.execute({
      sql: 'UPDATE wireguard_peers SET name = ?, allowed_subnets = ? WHERE id = ?',
      args: [name.trim(), sanitizedSubnets, id]
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Obtener script de configuración MikroTik para un túnel
app.get('/api/tunnels/:id/script', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getOltDb();
    const result = await db.execute({ sql: 'SELECT * FROM wireguard_peers WHERE id = ?', args: [id] });
    const peer = result.rows[0] as any;
    if (!peer) return res.status(404).json({ error: 'Túnel no encontrado' });

    const script = buildMikrotikScript(peer.name, peer.client_ip, peer.private_key);
    res.json({ success: true, script, peer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Eliminar un túnel VPN
app.delete('/api/tunnels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getOltDb();
    const result = await db.execute({ sql: 'SELECT * FROM wireguard_peers WHERE id = ?', args: [id] });
    const peer = result.rows[0] as any;
    if (peer) {
      removeWireguardPeer(peer.public_key, peer.allowed_subnets);
      await db.execute({ sql: 'DELETE FROM wireguard_peers WHERE id = ?', args: [id] });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// APIS CRUD DE OLTS
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
    const { name, model, ip, port, username, password, default_vlan, community, tunnel_id, mikrotik_name } = req.body;
    const id = 'olt-' + Date.now();

    // Auto-enrutar la subred de la OLT si hay un túnel asociado
    if (tunnel_id) {
      const tunnelResult = await db.execute({ sql: 'SELECT * FROM wireguard_peers WHERE id = ?', args: [tunnel_id] });
      const tunnel = tunnelResult.rows[0] as any;
      if (tunnel) {
        // Extraer subred /24 de la IP de la OLT
        const ipParts = ip.split('.');
        if (ipParts.length === 4) {
          const autoSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
          const currentSubnets = tunnel.allowed_subnets || '';
          if (!currentSubnets.includes(autoSubnet)) {
            const updatedSubnets = currentSubnets ? `${currentSubnets},${autoSubnet}` : autoSubnet;
            applyWireguardPeer(tunnel.public_key, tunnel.client_ip, updatedSubnets);
            await db.execute({
              sql: 'UPDATE wireguard_peers SET allowed_subnets = ? WHERE id = ?',
              args: [updatedSubnets, tunnel.id]
            });
          }
        }
      }
    }

    // Probar conexión inicial
    const driver = new TpLinkDeltaStreamDriver({ id, name, model, ip, port, username, password, default_vlan, community });
    const test = await driver.testConnection();

    await db.execute({
      sql: `INSERT INTO olts (id, name, model, ip, port, username, password, default_vlan, community, tunnel_id, mikrotik_name, status, last_latency_ms, last_checked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [id, name, model, ip, port || 22, username, password || '', default_vlan || 400, community, tunnel_id || '', mikrotik_name || '', test.online ? 'online' : 'offline', test.latencyMs]
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
    const { name, model, ip, port, username, password, default_vlan, community, tunnel_id, mikrotik_name } = req.body;

    let updateSql = `
      UPDATE olts 
      SET name = ?, model = ?, ip = ?, port = ?, username = ?, default_vlan = ?, community = ?, tunnel_id = ?, mikrotik_name = ?
    `;
    const args: any[] = [name, model, ip, port, username, default_vlan, community, tunnel_id || '', mikrotik_name || ''];

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
    const { ip, port, username, password, tunnelId } = req.body;

    // Asegurar enrutamiento hacia el túnel si se envió tunnelId
    if (tunnelId) {
      const db = getOltDb();
      const tunnelResult = await db.execute({ sql: 'SELECT * FROM wireguard_peers WHERE id = ?', args: [tunnelId] });
      const tunnel = tunnelResult.rows[0] as any;
      if (tunnel) {
        const ipParts = ip.split('.');
        if (ipParts.length === 4) {
          const autoSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
          const currentSubnets = tunnel.allowed_subnets || '';
          if (!currentSubnets.includes(autoSubnet)) {
            const updatedSubnets = currentSubnets ? `${currentSubnets},${autoSubnet}` : autoSubnet;
            applyWireguardPeer(tunnel.public_key, tunnel.client_ip, updatedSubnets);
            await db.execute({
              sql: 'UPDATE wireguard_peers SET allowed_subnets = ? WHERE id = ?',
              args: [updatedSubnets, tunnel.id]
            });
            // Breve espera para que la tabla de rutas del kernel aplique la interfaz
            await new Promise(r => setTimeout(r, 200));
          } else {
            // Asegurar que la ruta esté activa en wg0
            applyWireguardPeer(tunnel.public_key, tunnel.client_ip, currentSubnets);
          }
        }
      }
    }

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
    await db.execute({
      sql: `INSERT OR REPLACE INTO provisioned_onts (olt_id, gpon_port, onu_id, serial, client_name, vlan_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'online')`,
      args: [olt.id, gponPort || '1/0/1', onuId || 1, serial, clientName, vlanId || olt.default_vlan]
    });
  }

  res.json(provResult);
});

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

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.type('image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#4f46e5"/><path d="M25 50h50M50 25v50" stroke="#fff" stroke-width="12" stroke-linecap="round"/><circle cx="50" cy="50" r="10" fill="#38bdf8"/></svg>`);
});

// ==========================================
// APIS DE ONUS CONFIGURADAS (SmartOLT Style)
// ==========================================

// 1. Listar todas las ONUs configuradas en la OLT con lectura óptica y nombres
app.get('/api/onus', async (req: Request, res: Response) => {
  try {
    const oltId = req.query.oltId as string;
    const db = getOltDb();

    let oltRows: any[] = [];
    if (oltId) {
      const resDb = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
      oltRows = resDb.rows;
    } else {
      const resDb = await db.execute('SELECT * FROM olts ORDER BY created_at ASC');
      oltRows = resDb.rows;
    }

    if (oltRows.length === 0) {
      return res.json({ onts: [] });
    }

    const allOnts: any[] = [];
    for (const row of oltRows) {
      const olt = row as unknown as OltDevice;
      try {
        const driver = new TpLinkDeltaStreamDriver(olt);
        const onts = await driver.getConfiguredOnts('1/0/1');
        const enriched = onts.map(o => ({
          ...o,
          oltId: olt.id,
          oltName: olt.name,
          oltIp: olt.ip
        }));
        allOnts.push(...enriched);
      } catch (e) {
        console.error(`[API /api/onus] Error en OLT ${olt.name}:`, e);
      }
    }

    res.json({ onts: allOnts });
  } catch (err: any) {
    res.status(500).json({ error: err.message, onts: [] });
  }
});

// 2. Reiniciar remotamente una ONT por software
app.post('/api/onus/reboot', async (req: Request, res: Response) => {
  try {
    const { oltId, gponPort, onuId } = req.body;
    if (!oltId || onuId === undefined) {
      return res.status(400).json({ error: 'oltId y onuId son obligatorios' });
    }

    const db = getOltDb();
    const result = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
    const olt = result.rows[0] as unknown as OltDevice;
    if (!olt) return res.status(404).json({ error: 'OLT no encontrada' });

    const driver = new TpLinkDeltaStreamDriver(olt);
    const rebootRes = await driver.rebootOnt(gponPort || '1/0/1', parseInt(onuId, 10));
    res.json(rebootRes);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// APIS TR-069 GENIEACS CWMP INTEGRATION
// ==========================================

// 3. Consultar todos los dispositivos TR-069 reportados en GenieACS
app.get('/api/tr069/devices', async (_req: Request, res: Response) => {
  try {
    const devices = await acsClient.getDevices();
    res.json({ success: true, count: devices.length, devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, devices: [] });
  }
});

// 4. Consultar un dispositivo TR-069 específico por número de serie
app.get('/api/tr069/devices/:sn', async (req: Request, res: Response) => {
  try {
    const serial = req.params.sn;
    const device = await acsClient.getDeviceBySerial(serial);
    res.json({ success: true, device });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, device: null });
  }
});

// 5. Cambiar Wi-Fi (SSID y Contraseña WPA2) por TR-069
app.post('/api/tr069/devices/:sn/wifi', async (req: Request, res: Response) => {
  try {
    const serial = req.params.sn;
    const { ssid, password } = req.body;

    if (!ssid || !password) {
      return res.status(400).json({ success: false, error: 'SSID y Contraseña son requeridos' });
    }

    const dev = await acsClient.getDeviceBySerial(serial);
    const deviceId = dev ? dev._id : serial;

    const result = await acsClient.setWifi(deviceId, ssid, password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Cambiar Modo WAN (IP Estática / DHCP / PPPoE / IPv6) vía TR-069 y/o OMCI
app.post('/api/tr069/devices/:sn/wan', async (req: Request, res: Response) => {
  try {
    const serial = req.params.sn;
    const {
      oltId,
      gponPort,
      onuId,
      vlanId,
      onuMode,
      wanMode,
      configMethod,
      ipProtocol,
      ip,
      mask,
      gateway,
      dns1,
      dns2,
      pppoeUser,
      pppoePass,
      enableIpv6
    } = req.body;

    let omciResult: any = { success: true };

    // Si se especificó método OMCI o OLT presente, aplicar configuración en OLT CLI
    if (configMethod === 'OMCI' && oltId && gponPort && onuId !== undefined) {
      const db = getOltDb();
      const resDb = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
      const olt = resDb.rows[0] as unknown as OltDevice;
      if (olt) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        omciResult = await driver.configureOntWanOmci(gponPort, parseInt(onuId, 10), {
          mode: wanMode || 'Static',
          ip,
          mask,
          gateway,
          vlanId: vlanId ? parseInt(vlanId, 10) : undefined
        });
      }
    }

    // Configuración por TR-069 GenieACS
    const dev = await acsClient.getDeviceBySerial(serial);
    const deviceId = dev ? dev._id : serial;

    const acsResult = await acsClient.setWanMode(deviceId, {
      mode: wanMode || 'Static',
      ip,
      mask,
      gateway,
      dns1,
      dns2,
      pppoeUser,
      pppoePass,
      vlanId: vlanId ? parseInt(vlanId, 10) : undefined,
      enableIpv6: ipProtocol === 'DualStack' || !!enableIpv6
    });

    res.json({
      success: acsResult.success || omciResult.success,
      acs: acsResult,
      omci: omciResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Cambiar Contraseña Web del Módem por TR-069
app.post('/api/tr069/devices/:sn/password', async (req: Request, res: Response) => {
  try {
    const serial = req.params.sn;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'La nueva contraseña es requerida' });
    }

    const dev = await acsClient.getDeviceBySerial(serial);
    const deviceId = dev ? dev._id : serial;

    const result = await acsClient.setWebPassword(deviceId, password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Acciones avanzadas SmartOLT (Reboot, Resync, Restore defaults, Toggle Active, Delete)
app.post('/api/onus/action', async (req: Request, res: Response) => {
  try {
    const { action, oltId, gponPort, onuId, serial, active } = req.body;
    const db = getOltDb();

    let olt: OltDevice | null = null;
    if (oltId) {
      const resDb = await db.execute({ sql: 'SELECT * FROM olts WHERE id = ?', args: [oltId] });
      olt = (resDb.rows[0] as unknown as OltDevice) || null;
    }

    let result: any = { success: true };

    if (action === 'reboot') {
      if (olt && gponPort && onuId !== undefined) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        result = await driver.rebootOnt(gponPort, parseInt(onuId, 10));
      }
      if (serial) {
        const dev = await acsClient.getDeviceBySerial(serial);
        if (dev) await acsClient.reboot(dev._id);
      }
    } else if (action === 'restore-defaults') {
      if (olt && gponPort && onuId !== undefined) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        result = await driver.restoreOntFactory(gponPort, parseInt(onuId, 10));
      }
      if (serial) {
        const dev = await acsClient.getDeviceBySerial(serial);
        if (dev) await acsClient.factoryReset(dev._id);
      }
    } else if (action === 'toggle-active') {
      if (olt && gponPort && onuId !== undefined) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        result = await driver.setOntAdminState(gponPort, parseInt(onuId, 10), !!active);
      }
    } else if (action === 'delete') {
      if (olt && gponPort && onuId !== undefined) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        result = await driver.deleteOnt(gponPort, parseInt(onuId, 10));
      }
      if (serial) {
        await db.execute({ sql: 'DELETE FROM provisioned_onts WHERE serial = ?', args: [serial] });
      }
    } else if (action === 'resync') {
      if (olt && gponPort) {
        const driver = new TpLinkDeltaStreamDriver(olt);
        const optical = await driver.getOpticalLevels(gponPort);
        result = { success: true, optical };
      }
    } else {
      return res.status(400).json({ success: false, error: `Acción '${action}' no reconocida` });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CloudOLT Core corriendo en http://localhost:${PORT}`);
});
