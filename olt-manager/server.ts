import express, { Request, Response } from 'express';
import cors from 'cors';
import { TpLinkDeltaStreamDriver, OltDevice } from './drivers/tplink-deltastream.js';
import { getOltDb, initOltDatabase } from './db.js';

const app = express();
const PORT = process.env.OLT_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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

  <script>
    let olts = [];

    async function loadOlts() {
      try {
        const res = await fetch('/api/olts');
        olts = await res.json();
        renderOltsGrid();
        populateOltSelect();
      } catch (err) {
        console.error('Error cargando OLTs:', err);
      }
    }

    function populateOltSelect() {
      const select = document.getElementById('oltSelect');
      const currentVal = select.value;
      if (olts.length === 0) {
        select.innerHTML = '<option value="">-- Sin OLTs registradas --</option>';
        return;
      }
      select.innerHTML = olts.map(o => \`<option value="\${o.id}">\${o.name} (\${o.community})</option>\`).join('');
      if (currentVal && olts.find(o => o.id === currentVal)) {
        select.value = currentVal;
      }
      onOltChange();
    }

    function renderOltsGrid() {
      const grid = document.getElementById('oltsGrid');
      const badge = document.getElementById('oltCountBadge');
      badge.innerText = olts.length + ' registradas';

      if (olts.length === 0) {
        grid.innerHTML = \`
          <div class="col-span-3 text-center py-10 glass-card rounded-2xl">
            <i class="fa-solid fa-server text-3xl text-gray-600 mb-2 block"></i>
            <p class="text-sm text-gray-400">No hay OLTs registradas todavía.</p>
            <button onclick="openOltModal()" class="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">
              + Dar de Alta mi Primera OLT
            </button>
          </div>
        \`;
        return;
      }

      let onlineCount = 0;
      grid.innerHTML = olts.map(o => {
        const isOnline = o.status === 'online';
        if (isOnline) onlineCount++;
        const statusBadge = isOnline 
          ? \`<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> EN LÍNEA (\${o.last_latency_ms || 15}ms)</span>\`
          : \`<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> DESCONECTADA</span>\`;

        return \`
          <div class="glass-card p-5 rounded-2xl glass-card-hover flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  VLAN \${o.default_vlan}
                </span>
                \${statusBadge}
              </div>
              <h3 class="text-base font-bold text-white">\${o.name}</h3>
              <p class="text-[11px] text-gray-400 mt-1">\${o.model} &bull; \${o.community}</p>
              <p class="text-xs text-gray-400 mt-2">IP Gestión: <code class="text-indigo-300 font-mono font-semibold">\${o.ip}:\${o.port}</code></p>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
              <button onclick="testOltConnection('\${o.id}')" class="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                <i class="fa-solid fa-arrows-rotate"></i> Probar Enlace
              </button>
              <div class="flex items-center gap-2">
                <button onclick="editOlt('\${o.id}')" class="text-gray-400 hover:text-white"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteOlt('\${o.id}')" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        \`;
      }).join('');

      document.getElementById('statOltsOnline').innerText = onlineCount + ' / ' + olts.length;
    }

    async function onOltChange() {
      const selectedId = document.getElementById('oltSelect').value;
      const statusDiv = document.getElementById('oltLiveStatus');
      const olt = olts.find(o => o.id === selectedId);

      if (!olt) {
        statusDiv.innerHTML = '<span class="text-gray-500">Sin OLT</span>';
        document.getElementById('autofindContainer').innerHTML = '<div class="text-center py-6 text-gray-500 text-xs">Da de alta una OLT para comenzar el descubrimiento.</div>';
        return;
      }

      statusDiv.innerHTML = \`
        <span class="text-gray-400 font-mono">\${olt.ip}</span>
        <button onclick="testOltConnection('\${olt.id}')" class="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded text-[11px] font-semibold">
          <i class="fa-solid fa-bolt"></i> Ping Test
        </button>
      \`;

      refreshData();
    }

    async function refreshData() {
      const oltId = document.getElementById('oltSelect').value;
      const container = document.getElementById('autofindContainer');
      if (!oltId) return;

      container.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-lg text-indigo-400 mb-1"></i><p>Consultando OLT por SSH...</p></div>';

      try {
        const res = await fetch('/api/autofind?oltId=' + oltId);
        const data = await res.json();
        
        document.getElementById('statAutofind').innerText = data.onts ? data.onts.length : 0;

        if (!data.onts || data.onts.length === 0) {
          container.innerHTML = \`
            <div class="text-center py-8 text-gray-500 text-xs">
              <i class="fa-solid fa-check-circle text-2xl text-emerald-500/50 mb-2 block"></i>
              No hay ONTs pendientes por autorizar en esta OLT. Todas las líneas están aprovisionadas.
            </div>
          \`;
          return;
        }

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
        data.onts.forEach(ont => {
          html += \`
            <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold text-white">\${ont.sn}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold">\${ont.vendor}</span>
                </div>
                <p class="text-[11px] text-gray-400 mt-1">Puerto: \${ont.gponPort} &bull; Detectado recientemente</p>
              </div>
              <button onclick="openProvisionModal('\${ont.sn}', '\${ont.gponPort}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                <i class="fa-solid fa-bolt"></i> Activar
              </button>
            </div>
          \`;
        });
        html += '</div>';
        container.innerHTML = html;

      } catch (e) {
        container.innerHTML = '<div class="text-center py-6 text-rose-400 text-xs">Error conectando a la OLT. Verifique el túnel VPN del MikroTik o credenciales SSH.</div>';
      }
    }

    async function testOltConnection(oltId) {
      const btn = event.target;
      const origText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Probando...';
      try {
        const res = await fetch('/api/olts/' + oltId + '/test', { method: 'POST' });
        const data = await res.json();
        if (data.online) {
          alert('✅ ¡OLT En Línea! Latencia SSH: ' + data.latencyMs + 'ms');
        } else {
          alert('❌ OLT Desconectada o inaccesible: ' + (data.error || 'Timeout'));
        }
        loadOlts();
      } catch (err) {
        alert('❌ Error al probar conexión.');
      } finally {
        btn.innerHTML = origText;
      }
    }

    function openOltModal() {
      document.getElementById('formOltId').value = '';
      document.getElementById('formOltName').value = '';
      document.getElementById('formOltIp').value = '';
      document.getElementById('formOltPort').value = 22;
      document.getElementById('formOltUser').value = 'admin';
      document.getElementById('formOltPass').value = '';
      document.getElementById('formOltVlan').value = '';
      document.getElementById('formOltCommunity').value = '';
      document.getElementById('formOltMikrotik').value = '';
      document.getElementById('oltModalTitle').innerHTML = '<i class="fa-solid fa-plus-circle text-indigo-400"></i> Registrar Nueva OLT';
      document.getElementById('oltModal').classList.remove('hidden');
    }

    function editOlt(oltId) {
      const olt = olts.find(o => o.id === oltId);
      if (!olt) return;
      document.getElementById('formOltId').value = olt.id;
      document.getElementById('formOltName').value = olt.name;
      document.getElementById('formOltModel').value = olt.model;
      document.getElementById('formOltIp').value = olt.ip;
      document.getElementById('formOltPort').value = olt.port || 22;
      document.getElementById('formOltUser').value = olt.username;
      document.getElementById('formOltPass').value = '';
      document.getElementById('formOltVlan').value = olt.default_vlan;
      document.getElementById('formOltCommunity').value = olt.community;
      document.getElementById('formOltMikrotik').value = olt.mikrotik_name || '';
      document.getElementById('oltModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-400"></i> Editar OLT';
      document.getElementById('oltModal').classList.remove('hidden');
    }

    function closeOltModal() {
      document.getElementById('oltModal').classList.add('hidden');
    }

    async function testModalConnection() {
      const ip = document.getElementById('formOltIp').value;
      const port = document.getElementById('formOltPort').value;
      const username = document.getElementById('formOltUser').value;
      const password = document.getElementById('formOltPass').value;

      if (!ip || !username) {
        alert('Ingresa al menos la IP y el usuario SSH para probar la conexión.');
        return;
      }

      const res = await fetch('/api/olts/test-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port: parseInt(port, 10), username, password })
      });
      const data = await res.json();
      if (data.online) {
        alert('✅ Conexión Exitosa con la OLT (' + data.latencyMs + 'ms).');
      } else {
        alert('❌ No se pudo conectar: ' + (data.error || 'Revisa la IP privada o túnel VPN.'));
      }
    }

    async function saveOlt(e) {
      e.preventDefault();
      const id = document.getElementById('formOltId').value;
      const payload = {
        name: document.getElementById('formOltName').value,
        model: document.getElementById('formOltModel').value,
        ip: document.getElementById('formOltIp').value,
        port: parseInt(document.getElementById('formOltPort').value, 10),
        username: document.getElementById('formOltUser').value,
        password: document.getElementById('formOltPass').value,
        default_vlan: parseInt(document.getElementById('formOltVlan').value, 10),
        community: document.getElementById('formOltCommunity').value,
        mikrotik_name: document.getElementById('formOltMikrotik').value
      };

      const url = id ? '/api/olts/' + id : '/api/olts';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeOltModal();
        loadOlts();
      } else {
        alert('❌ Error guardando OLT: ' + (data.error || 'Error desconocido'));
      }
    }

    async function deleteOlt(id) {
      if (!confirm('¿Estás seguro de eliminar esta OLT de la plataforma?')) return;
      const res = await fetch('/api/olts/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadOlts();
      } else {
        alert('❌ Error al eliminar OLT');
      }
    }

    function openProvisionModal(sn, port) {
      const oltId = document.getElementById('oltSelect').value;
      const olt = olts.find(o => o.id === oltId);
      document.getElementById('modalSn').value = sn;
      document.getElementById('modalVlan').value = olt ? olt.default_vlan : 400;
      document.getElementById('provisionModal').classList.remove('hidden');
    }

    function closeProvisionModal() {
      document.getElementById('provisionModal').classList.add('hidden');
    }

    async function submitProvision(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitModal');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovisionando...';

      const payload = {
        oltId: document.getElementById('oltSelect').value,
        serial: document.getElementById('modalSn').value,
        clientName: document.getElementById('modalClient').value,
        vlanId: parseInt(document.getElementById('modalVlan').value, 10),
        onuId: parseInt(document.getElementById('modalOnuId').value, 10),
        gponPort: '1/0/1'
      };

      try {
        const res = await fetch('/api/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ¡ONT activada y aprovisionada con éxito en la OLT!');
          closeProvisionModal();
          refreshData();
        } else {
          alert('❌ Error al aprovisionar: ' + (data.log || data.error));
        }
      } catch (err) {
        alert('❌ Error de comunicación con el servidor');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Ejecutar Activación';
      }
    }

    // Carga inicial
    loadOlts();
  </script>
</body>
</html>
  `;
  res.send(html);
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
