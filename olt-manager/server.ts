import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TpLinkDeltaStreamDriver, OltConfig } from './drivers/tplink-deltastream.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.OLT_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cargar configuración de OLTs
const configPath = path.join(__dirname, 'config', 'olts.json');
let oltsConfig: { olts: OltConfig[]; profiles: any } = { olts: [], profiles: {} };

try {
  if (fs.existsSync(configPath)) {
    oltsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.error('Error cargando olts.json:', err);
}

// Interfaz Web Dashboard
app.get('/', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartOLT Core CloudWare - Gestión de Fibra Óptica</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
    .glass-card { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-card-hover:hover { border-color: rgba(99, 102, 241, 0.4); transform: translateY(-2px); transition: all 0.2s ease; }
    .badge-signal-good { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-signal-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-signal-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Header Superior -->
  <header class="glass-card sticky top-0 z-50 px-6 py-4 border-b border-gray-800">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i class="fa-solid fa-network-wired text-white text-lg"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            CloudWare <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold uppercase tracking-wider">OLT Manager</span>
          </h1>
          <p class="text-xs text-gray-400">Zero-Touch Provisioning Multi-OLT & TR-069</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <div class="flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-300">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>VPN Cabecera: Conectada</span>
        </div>
        <button onclick="refreshData()" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition">
          <i class="fa-solid fa-rotate"></i> Actualizar
        </button>
      </div>
    </div>
  </header>

  <!-- Contenedor Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

    <!-- Selector de OLT y Métricas Rápidas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass-card p-4 rounded-2xl md:col-span-1">
        <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Seleccionar OLT</label>
        <select id="oltSelect" onchange="onOltChange()" class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition">
          ${oltsConfig.olts.map(o => `<option value="${o.id}">${o.name} (${o.community})</option>`).join('')}
        </select>
        <div id="oltDetails" class="mt-3 text-xs text-gray-400 space-y-1">
          <!-- Detalles dinámicos -->
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <i class="fa-solid fa-satellite-dish text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">Nuevas sin autorizar</p>
          <h3 id="statAutofind" class="text-2xl font-bold text-white">0</h3>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
          <i class="fa-solid fa-circle-check text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">ONTs Online</p>
          <h3 id="statOnline" class="text-2xl font-bold text-white">--</h3>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl flex items-center space-x-4">
        <div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium">Atenuadas / Caídas</p>
          <h3 id="statAlerts" class="text-2xl font-bold text-white">0</h3>
        </div>
      </div>
    </div>

    <!-- Sección 1: ONTs Nuevas Detectadas (Autofind) -->
    <div class="glass-card rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <h2 class="text-base font-bold text-white">Descubrimiento Automático (Autofind)</h2>
        </div>
        <span class="text-xs text-gray-400">ONTs conectadas en campo listas para 1-Click Activate</span>
      </div>

      <div id="autofindContainer" class="p-6">
        <div class="text-center py-8 text-gray-400 text-sm">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400 mb-2"></i>
          <p>Consultando OLT por SSH...</p>
        </div>
      </div>
    </div>

    <!-- Sección 2: Mapeo de Comunidades y VLANs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${oltsConfig.olts.map(o => `
        <div class="glass-card p-5 rounded-2xl glass-card-hover">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              VLAN ${o.defaultVlan}
            </span>
            <span class="text-xs text-gray-500">${o.model}</span>
          </div>
          <h3 class="text-base font-bold text-white">${o.name}</h3>
          <p class="text-xs text-gray-400 mt-1">IP Gestión: <code class="text-indigo-300 font-mono">${o.ip}</code></p>
          <div class="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-xs">
            <span class="text-gray-400">Router: ${o.mikrotik?.name || 'Cabecera'}</span>
            <span class="text-emerald-400 font-medium"><i class="fa-solid fa-link"></i> VLAN Activa</span>
          </div>
        </div>
      `).join('')}
    </div>

  </main>

  <!-- Modal de Activación en 1-Click -->
  <div id="provisionModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg rounded-2xl p-6 border border-gray-700 space-y-4">
      <div class="flex justify-between items-center pb-3 border-b border-gray-800">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-400"></i> Aprovisionar ONT en 1-Click
        </h3>
        <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
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
            <input type="number" id="modalVlan" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
          <div>
            <label class="text-gray-400 block mb-1">ONU ID (Asignado)</label>
            <input type="number" id="modalOnuId" value="1" min="1" max="128" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
          </div>
        </div>

        <div class="p-3 bg-indigo-950/30 rounded-xl border border-indigo-800/40 text-indigo-200">
          <p class="font-semibold mb-1"><i class="fa-solid fa-circle-info"></i> Acciones Automáticas al Activar:</p>
          <ul class="list-disc list-inside space-y-0.5 text-gray-300">
            <li>Inyección de Service-Port y VLAN en OLT TP-Link</li>
            <li>Autorización GPON y perfil TR-069</li>
            <li>Guardado persistente en memoria OLT (startup-config)</li>
          </ul>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold">Cancelar</button>
          <button type="submit" id="btnSubmitModal" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2">
            <i class="fa-solid fa-play"></i> Ejecutar Activación
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const olts = ${JSON.stringify(oltsConfig.olts)};

    function onOltChange() {
      const selectedId = document.getElementById('oltSelect').value;
      const olt = olts.find(o => o.id === selectedId);
      if (olt) {
        document.getElementById('oltDetails').innerHTML = \`
          <p><span class="text-gray-500">IP:</span> \${olt.ip}</p>
          <p><span class="text-gray-500">VLAN Predeterminada:</span> \${olt.defaultVlan}</p>
          <p><span class="text-gray-500">Comunidad:</span> \${olt.community}</p>
        \`;
      }
      refreshData();
    }

    async function refreshData() {
      const oltId = document.getElementById('oltSelect').value;
      const container = document.getElementById('autofindContainer');
      container.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-lg text-indigo-400 mb-1"></i><p>Consultando OLT...</p></div>';

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
        container.innerHTML = '<div class="text-center py-6 text-rose-400 text-xs">Error conectando a la OLT. Verifique el túnel VPN del MikroTik.</div>';
      }
    }

    function openProvisionModal(sn, port) {
      const oltId = document.getElementById('oltSelect').value;
      const olt = olts.find(o => o.id === oltId);
      document.getElementById('modalSn').value = sn;
      document.getElementById('modalVlan').value = olt ? olt.defaultVlan : 400;
      document.getElementById('provisionModal').classList.remove('hidden');
    }

    function closeModal() {
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
          closeModal();
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

    // Inicializar
    onOltChange();
  </script>
</body>
</html>
  `;
  res.send(html);
});

// Endpoint: Listar Autofind de la OLT seleccionada
app.get('/api/autofind', async (req: Request, res: Response) => {
  const oltId = (req.query.oltId as string) || oltsConfig.olts[0]?.id;
  const olt = oltsConfig.olts.find(o => o.id === oltId);

  if (!olt) {
    return res.status(404).json({ error: 'OLT no encontrada' });
  }

  const driver = new TpLinkDeltaStreamDriver(olt);
  const onts = await driver.getAutofindOnts('1/0/1');
  res.json({ oltId: olt.id, onts });
});

// Endpoint: Aprovisionamiento en 1-Click
app.post('/api/provision', async (req: Request, res: Response) => {
  const { oltId, serial, clientName, vlanId, onuId, gponPort } = req.body;
  const olt = oltsConfig.olts.find(o => o.id === oltId);

  if (!olt) {
    return res.status(404).json({ error: 'OLT no encontrada' });
  }

  const driver = new TpLinkDeltaStreamDriver(olt);
  const result = await driver.provisionOnt({
    gponPort: gponPort || '1/0/1',
    onuId: onuId || 1,
    serial,
    clientName,
    vlanId: vlanId || olt.defaultVlan,
    lineProfileId: oltsConfig.profiles?.lineProfileId || 4,
    srvProfileId: oltsConfig.profiles?.srvProfileId || 10,
    srvPortProfileId: oltsConfig.profiles?.srvPortProfileId || 4
  });

  res.json(result);
});

// Endpoint: Niveles Ópticos (dBm)
app.get('/api/optical-info', async (req: Request, res: Response) => {
  const oltId = (req.query.oltId as string) || oltsConfig.olts[0]?.id;
  const olt = oltsConfig.olts.find(o => o.id === oltId);

  if (!olt) {
    return res.status(404).json({ error: 'OLT no encontrada' });
  }

  const driver = new TpLinkDeltaStreamDriver(olt);
  const levels = await driver.getOpticalLevels('1/0/1');
  res.json({ oltId: olt.id, levels });
});

app.listen(PORT, () => {
  console.log(`🚀 OLT Manager Core corriendo en http://localhost:${PORT}`);
});
