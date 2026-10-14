// ========================================================
// CloudOLT Core - Dashboard Script
// ========================================================

let olts = [];
let tunnels = [];
let activeTab = 'olts';
let activeOltId = '';

// ==========================================
// NAVEGACIÓN ENTRE PESTAÑAS (TABS)
// ==========================================
function switchTab(tab) {
  activeTab = tab;
  
  // Actualizar estilos de los botones de pestaña
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-indigo-500/30', 'shadow-md');
    btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-800/50');
  });
  
  const activeBtn = document.getElementById('tab-btn-' + tab);
  if (activeBtn) {
    activeBtn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-800/50');
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-indigo-500/30', 'shadow-md');
  }

  // Mostrar / ocultar paneles
  document.getElementById('view-olts').classList.toggle('hidden', tab !== 'olts');
  document.getElementById('view-tunnels').classList.toggle('hidden', tab !== 'tunnels');
  document.getElementById('view-unconfigured').classList.toggle('hidden', tab !== 'unconfigured');

  if (tab === 'olts') loadOlts();
  if (tab === 'tunnels') loadTunnels();
  if (tab === 'unconfigured') refreshAutofind();
}

// ==========================================
// GESTIÓN DE TÚNELES VPN (RouterOS v7 WireGuard)
// ==========================================
async function loadTunnels() {
  try {
    const res = await fetch('/api/tunnels');
    tunnels = await res.json();
    renderTunnelsTable();
    populateTunnelDropdown();
  } catch (err) {
    console.error('Error cargando túneles:', err);
  }
}

function renderTunnelsTable() {
  const tbody = document.getElementById('tunnelsTableBody');
  const countBadge = document.getElementById('tunnelsCountBadge');
  if (countBadge) countBadge.innerText = `${tunnels.length} túneles`;

  if (!tbody) return;

  if (tunnels.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-gray-500 text-xs">
          <i class="fa-solid fa-shield-halved text-3xl mb-2 text-gray-600 block"></i>
          No hay túneles VPN configurados todavía.
          <br>
          <button onclick="openCreateTunnelModal()" class="mt-3 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition">
            + Crear mi Primer Túnel MikroTik
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tunnels.map((t, idx) => {
    const isConn = t.status === 'connected';
    const statusHtml = isConn 
      ? `<div class="flex items-center gap-2">
           <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
           <span class="text-emerald-400 font-semibold text-xs">Connected</span>
         </div>
         <div class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
           <span class="text-emerald-400/90 font-mono text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">
             <i class="fa-solid fa-signal text-[9px] mr-0.5"></i> ${t.seconds_ago !== null ? 'hace ' + t.seconds_ago + 's' : 'online'}
           </span>
           <span class="font-mono text-gray-300">IP: ${t.client_ip}</span>
         </div>`
      : `<div class="flex items-center gap-2">
           <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
           <span class="text-rose-400 text-xs font-semibold">Disconnected</span>
         </div>
         <div class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
           <span class="text-rose-400/80 font-mono text-[10px] bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/20">
             ${t.seconds_ago !== null ? 'caído hace ' + t.seconds_ago + 's' : 'sin señal'}
           </span>
           <span class="font-mono">${t.client_ip}</span>
         </div>`;

    const usedByOlts = olts.filter(o => o.tunnel_id === t.id || o.mikrotik_name === t.name);
    const usedByHtml = usedByOlts.length > 0 
      ? usedByOlts.map(o => `<span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono mr-1">${o.name}</span>`).join('')
      : '<span class="text-gray-500 text-[11px] italic">Sin OLT asignada</span>';

    return `
      <tr class="border-b border-gray-800/60 hover:bg-gray-900/40 transition">
        <td class="py-3 px-4 font-mono text-xs text-gray-400">${idx + 1}</td>
        <td class="py-3 px-4 font-bold text-white text-xs flex items-center gap-2">
          <i class="fa-solid fa-router text-emerald-400"></i> ${t.name}
        </td>
        <td class="py-3 px-4">${statusHtml}</td>
        <td class="py-3 px-4 font-mono text-xs text-gray-300">${t.client_ip}/24</td>
        <td class="py-3 px-4 font-mono text-xs text-emerald-300">${t.allowed_subnets || '10.200.0.0/24'}</td>
        <td class="py-3 px-4">${usedByHtml}</td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="showTunnelSetup('${t.id}')" class="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition">
            <i class="fa-solid fa-terminal"></i> VPN setup
          </button>
          <button onclick="editTunnel('${t.id}')" class="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button onclick="deleteTunnel('${t.id}')" class="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-trash"></i> Del
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateTunnelModal() {
  document.getElementById('formTunnelId').value = '';
  document.getElementById('formTunnelName').value = '';
  document.getElementById('formTunnelSubnets').value = '';
  document.getElementById('tunnelModalTitle').innerText = 'Crear Nuevo Túnel VPN MikroTik';
  document.getElementById('tunnelModal').classList.remove('hidden');
}

function editTunnel(id) {
  const t = tunnels.find(x => x.id === id);
  if (!t) return;
  document.getElementById('formTunnelId').value = t.id;
  document.getElementById('formTunnelName').value = t.name;
  document.getElementById('formTunnelSubnets').value = t.allowed_subnets || '';
  document.getElementById('tunnelModalTitle').innerText = 'Editar Túnel VPN';
  document.getElementById('tunnelModal').classList.remove('hidden');
}

function closeTunnelModal() {
  document.getElementById('tunnelModal').classList.add('hidden');
}

async function saveTunnel(e) {
  e.preventDefault();
  const id = document.getElementById('formTunnelId').value;
  const name = document.getElementById('formTunnelName').value.trim();
  const subnets = document.getElementById('formTunnelSubnets').value.trim();

  const btn = document.getElementById('btnSaveTunnel');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    const url = id ? '/api/tunnels/' + id : '/api/tunnels';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subnets })
    });
    const data = await res.json();
    if (data.success) {
      closeTunnelModal();
      await loadTunnels();
      // Mostrar de inmediato la ventana con el script
      showTunnelSetup(data.id || id);
    } else {
      alert('❌ Error guardando túnel: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    alert('❌ Error de comunicación con el servidor');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Guardar y Generar Script';
  }
}

async function showTunnelSetup(id) {
  const t = tunnels.find(x => x.id === id);
  try {
    const res = await fetch('/api/tunnels/' + id + '/script');
    const data = await res.json();
    if (data.script) {
      document.getElementById('setupModalTunnelName').innerText = `${t ? t.name : 'tunel'}@cloudware.cloudolt.com`;
      document.getElementById('setupModalScript').value = data.script;
      document.getElementById('setupModal').classList.remove('hidden');
    }
  } catch (err) {
    alert('Error obteniendo script del túnel');
  }
}

function closeSetupModal() {
  document.getElementById('setupModal').classList.add('hidden');
}

function copySetupScript() {
  const textarea = document.getElementById('setupModalScript');
  textarea.select();
  document.execCommand('copy');
  alert('📋 ¡Script copiado al portapapeles! Pégalo en New Terminal de Winbox.');
}

async function deleteTunnel(id) {
  if (!confirm('¿Estás seguro de eliminar este túnel? La OLT asociada perderá acceso.')) return;
  try {
    const res = await fetch('/api/tunnels/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadTunnels();
    } else {
      alert('❌ Error al eliminar túnel');
    }
  } catch {
    alert('❌ Error de conexión');
  }
}

// ==========================================
// GESTIÓN DE OLTS (Tabla principal - Screenshot 2)
// ==========================================
async function loadOlts() {
  try {
    const res = await fetch('/api/olts');
    olts = await res.json();
    renderOltsTable();
    populateTunnelDropdown();
  } catch (err) {
    console.error('Error cargando OLTs:', err);
  }
}

function renderOltsTable() {
  const tbody = document.getElementById('oltsTableBody');
  const countBadge = document.getElementById('oltsCountBadge');
  if (countBadge) countBadge.innerText = `${olts.length} OLTs`;

  if (!tbody) return;

  if (olts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-16 text-gray-500 text-xs">
          <i class="fa-solid fa-server text-4xl mb-2 text-gray-600 block"></i>
          No hay OLTs registradas todavía.
          <br>
          <button onclick="openOltModal()" class="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition">
            + Add OLT (Dar de Alta OLT)
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = olts.map((o, idx) => {
    const isOnline = o.status === 'online';
    const statusBullet = isOnline
      ? `<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" title="Online (${o.last_latency_ms || 15}ms)"></span>`
      : `<span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" title="Offline"></span>`;

    const tunnelObj = tunnels.find(t => t.id === o.tunnel_id || t.name === o.mikrotik_name);
    const tunnelName = tunnelObj ? tunnelObj.name : (o.mikrotik_name || 'N/A');

    return `
      <tr class="border-b border-gray-800/60 hover:bg-gray-900/40 transition">
        <td class="py-3 px-4">
          <button onclick="viewOlt('${o.id}')" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition">
            View
          </button>
        </td>
        <td class="py-3 px-4 font-mono text-xs text-gray-400">${idx + 1}</td>
        <td class="py-3 px-4 text-center">${statusBullet}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
            <i class="fa-solid fa-check text-[9px]"></i> ${tunnelName}
          </span>
        </td>
        <td class="py-3 px-4 font-bold text-white text-xs">${o.name}</td>
        <td class="py-3 px-4 font-mono text-xs text-indigo-300 font-semibold">${o.ip}</td>
        <td class="py-3 px-4 font-mono text-xs text-gray-400">${o.port || 22}</td>
        <td class="py-3 px-4 text-xs text-gray-300">${o.model}</td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="testOltConnection('${o.id}')" title="Probar conexión SSH" class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-bolt"></i> Test
          </button>
          <button onclick="editOlt('${o.id}')" class="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold inline-flex items-center transition">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteOlt('${o.id}')" class="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold inline-flex items-center transition">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function populateTunnelDropdown() {
  const select = document.getElementById('formOltTunnel');
  if (!select) return;
  const currentVal = select.value;

  if (tunnels.length === 0) {
    select.innerHTML = '<option value="">-- Sin túneles creados (crea uno primero) --</option>';
    return;
  }

  select.innerHTML = tunnels.map(t => `<option value="${t.id}">${t.name} (IP: ${t.client_ip} &bull; ${t.allowed_subnets || '10.200.0.0/24'})</option>`).join('');
  if (currentVal && tunnels.find(t => t.id === currentVal)) {
    select.value = currentVal;
  }
}

function openOltModal() {
  document.getElementById('formOltId').value = '';
  document.getElementById('formOltName').value = '';
  document.getElementById('formOltIp').value = '';
  document.getElementById('formOltPort').value = 22;
  document.getElementById('formOltUser').value = 'admin';
  document.getElementById('formOltPass').value = '';
  document.getElementById('formOltVlan').value = '400';
  document.getElementById('formOltCommunity').value = 'public';
  document.getElementById('oltModalTitle').innerText = 'Add OLT (Dar de Alta OLT)';
  populateTunnelDropdown();
  document.getElementById('oltModal').classList.remove('hidden');
}

function editOlt(id) {
  const o = olts.find(x => x.id === id);
  if (!o) return;
  document.getElementById('formOltId').value = o.id;
  document.getElementById('formOltName').value = o.name;
  document.getElementById('formOltModel').value = o.model;
  document.getElementById('formOltIp').value = o.ip;
  document.getElementById('formOltPort').value = o.port || 22;
  document.getElementById('formOltUser').value = o.username;
  document.getElementById('formOltPass').value = '';
  document.getElementById('formOltVlan').value = o.default_vlan || 400;
  document.getElementById('formOltCommunity').value = o.community || 'public';
  populateTunnelDropdown();
  if (o.tunnel_id) document.getElementById('formOltTunnel').value = o.tunnel_id;
  document.getElementById('oltModalTitle').innerText = 'Editar OLT';
  document.getElementById('oltModal').classList.remove('hidden');
}

function closeOltModal() {
  document.getElementById('oltModal').classList.add('hidden');
}

async function testModalConnection() {
  const ip = document.getElementById('formOltIp').value.trim();
  const port = parseInt(document.getElementById('formOltPort').value, 10) || 22;
  const username = document.getElementById('formOltUser').value.trim();
  const password = document.getElementById('formOltPass').value;
  const tunnelId = document.getElementById('formOltTunnel').value;

  if (!ip || !username) {
    alert('Ingresa al menos la IP y el usuario SSH para probar la conexión.');
    return;
  }

  const btn = document.getElementById('btnTestModal');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Probando...';

  try {
    const res = await fetch('/api/olts/test-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, username, password, tunnelId })
    });
    const data = await res.json();
    if (data.online) {
      alert(`✅ ¡Conexión Exitosa con la OLT! Latencia: ${data.latencyMs}ms`);
    } else {
      alert('❌ No se pudo conectar a la OLT: ' + (data.error || 'Verifica que el MikroTik tenga el túnel activo.'));
    }
  } catch {
    alert('❌ Error al contactar el servidor');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

async function saveOlt(e) {
  e.preventDefault();
  const id = document.getElementById('formOltId').value;
  const tunnelId = document.getElementById('formOltTunnel').value;
  const tunnelObj = tunnels.find(t => t.id === tunnelId);

  const payload = {
    name: document.getElementById('formOltName').value.trim(),
    model: document.getElementById('formOltModel').value,
    ip: document.getElementById('formOltIp').value.trim(),
    port: parseInt(document.getElementById('formOltPort').value, 10) || 22,
    username: document.getElementById('formOltUser').value.trim(),
    password: document.getElementById('formOltPass').value,
    default_vlan: parseInt(document.getElementById('formOltVlan').value, 10) || 400,
    community: document.getElementById('formOltCommunity').value.trim() || 'public',
    tunnel_id: tunnelId,
    mikrotik_name: tunnelObj ? tunnelObj.name : ''
  };

  const btn = document.getElementById('btnSaveOlt');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
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
  } catch {
    alert('❌ Error de comunicación con el servidor');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save (Guardar)';
  }
}

async function deleteOlt(id) {
  if (!confirm('¿Estás seguro de eliminar esta OLT?')) return;
  try {
    const res = await fetch('/api/olts/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadOlts();
    } else {
      alert('❌ Error al eliminar OLT');
    }
  } catch {
    alert('❌ Error de red');
  }
}

async function testOltConnection(id) {
  try {
    const res = await fetch('/api/olts/' + id + '/test', { method: 'POST' });
    const data = await res.json();
    if (data.online) {
      alert(`✅ OLT en línea (${data.latencyMs}ms)`);
    } else {
      alert(`❌ OLT fuera de línea: ${data.error || 'Timeout'}`);
    }
    loadOlts();
  } catch {
    alert('❌ Error al probar conexión');
  }
}

function viewOlt(id) {
  activeOltId = id;
  switchTab('unconfigured');
}

// ==========================================
// UNCONFIGURED / AUTOFIND
// ==========================================
async function refreshAutofind() {
  const container = document.getElementById('autofindContainer');
  const select = document.getElementById('autofindOltSelect');
  if (!container) return;

  if (olts.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500 text-xs">No hay OLTs registradas. Da de alta una OLT primero.</div>';
    return;
  }

  // Llenar selector
  select.innerHTML = olts.map(o => `<option value="${o.id}">${o.name} (${o.ip})</option>`).join('');
  if (activeOltId && olts.find(o => o.id === activeOltId)) {
    select.value = activeOltId;
  } else {
    activeOltId = select.value;
  }

  container.innerHTML = '<div class="text-center py-12 text-gray-400 text-xs"><i class="fa-solid fa-spinner fa-spin text-xl text-indigo-400 mb-2 block"></i>Consultando ONTs por SSH en OLT...</div>';

  try {
    const res = await fetch('/api/autofind?oltId=' + activeOltId);
    const data = await res.json();
    const countBadge = document.getElementById('unconfiguredBadge');
    if (countBadge) countBadge.innerText = data.onts ? data.onts.length : 0;

    if (!data.onts || data.onts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500 text-xs">
          <i class="fa-solid fa-check-circle text-3xl text-emerald-500/50 mb-2 block"></i>
          No hay ONTs pendientes por autorizar en esta OLT. Todas las líneas están activas.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${data.onts.map(ont => `
          <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-white">${ont.sn}</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold">${ont.vendor}</span>
              </div>
              <p class="text-[11px] text-gray-400 mt-1">Puerto GPON: <span class="font-mono text-gray-200">${ont.gponPort}</span></p>
            </div>
            <button onclick="openProvisionModal('${ont.sn}', '${ont.gponPort}')" class="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-gray-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20">
              <i class="fa-solid fa-bolt"></i> Activar
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="text-center py-10 text-rose-400 text-xs">Error conectando con la OLT. Verifica el túnel VPN en MikroTik o credenciales SSH.</div>';
  }
}

function onAutofindOltChange() {
  activeOltId = document.getElementById('autofindOltSelect').value;
  refreshAutofind();
}

function openProvisionModal(sn, port) {
  const olt = olts.find(o => o.id === activeOltId);
  document.getElementById('modalSn').value = sn;
  document.getElementById('modalPort').value = port || '1/0/1';
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
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovisionando en OLT...';

  const payload = {
    oltId: activeOltId,
    serial: document.getElementById('modalSn').value,
    gponPort: document.getElementById('modalPort').value,
    clientName: document.getElementById('modalClient').value,
    vlanId: parseInt(document.getElementById('modalVlan').value, 10),
    onuId: parseInt(document.getElementById('modalOnuId').value, 10)
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
      refreshAutofind();
    } else {
      alert('❌ Error al aprovisionar: ' + (data.log || data.error));
    }
  } catch {
    alert('❌ Error de red con el servidor');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Ejecutar Activación';
  }
}

// ==========================================
// EXPONER GLOBALMENTE EN WINDOW
// ==========================================
window.switchTab = switchTab;
window.loadTunnels = loadTunnels;
window.openCreateTunnelModal = openCreateTunnelModal;
window.editTunnel = editTunnel;
window.closeTunnelModal = closeTunnelModal;
window.saveTunnel = saveTunnel;
window.showTunnelSetup = showTunnelSetup;
window.closeSetupModal = closeSetupModal;
window.copySetupScript = copySetupScript;
window.deleteTunnel = deleteTunnel;

window.loadOlts = loadOlts;
window.openOltModal = openOltModal;
window.editOlt = editOlt;
window.closeOltModal = closeOltModal;
window.testModalConnection = testModalConnection;
window.saveOlt = saveOlt;
window.deleteOlt = deleteOlt;
window.testOltConnection = testOltConnection;
window.viewOlt = viewOlt;

window.refreshAutofind = refreshAutofind;
window.onAutofindOltChange = onAutofindOltChange;
window.openProvisionModal = openProvisionModal;
window.closeProvisionModal = closeProvisionModal;
window.submitProvision = submitProvision;

// Carga inicial y sondeo en tiempo real (cada 3 segundos)
document.addEventListener('DOMContentLoaded', () => {
  loadTunnels();
  loadOlts();

  // Actualización en tiempo real sin recargar la página (sondeo cada 2 segundos)
  setInterval(() => {
    if (activeTab === 'tunnels') {
      loadTunnels();
    } else if (activeTab === 'olts') {
      loadOlts();
    }
  }, 2000);
});
