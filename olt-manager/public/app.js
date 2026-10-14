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
  select.innerHTML = olts.map(o => `<option value="${o.id}">${o.name} (${o.community})</option>`).join('');
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
    grid.innerHTML = `
      <div class="col-span-3 text-center py-10 glass-card rounded-2xl">
        <i class="fa-solid fa-server text-3xl text-gray-600 mb-2 block"></i>
        <p class="text-sm text-gray-400">No hay OLTs registradas todavía.</p>
        <button onclick="openOltModal()" class="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">
          + Dar de Alta mi Primera OLT
        </button>
      </div>
    `;
    return;
  }

  let onlineCount = 0;
  grid.innerHTML = olts.map(o => {
    const isOnline = o.status === 'online';
    if (isOnline) onlineCount++;
    const statusBadge = isOnline 
      ? `<span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> EN LÍNEA (${o.last_latency_ms || 15}ms)</span>`
      : `<span class="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> DESCONECTADA</span>`;

    return `
      <div class="glass-card p-5 rounded-2xl glass-card-hover flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              VLAN ${o.default_vlan}
            </span>
            ${statusBadge}
          </div>
          <h3 class="text-base font-bold text-white">${o.name}</h3>
          <p class="text-[11px] text-gray-400 mt-1">${o.model} &bull; ${o.community}</p>
          <p class="text-xs text-gray-400 mt-2">IP Gestión: <code class="text-indigo-300 font-mono font-semibold">${o.ip}:${o.port}</code></p>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
          <button onclick="testOltConnection('${o.id}')" class="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            <i class="fa-solid fa-arrows-rotate"></i> Probar Enlace
          </button>
          <div class="flex items-center gap-2">
            <button onclick="editOlt('${o.id}')" class="text-gray-400 hover:text-white"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteOlt('${o.id}')" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
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

  statusDiv.innerHTML = `
    <span class="text-gray-400 font-mono">${olt.ip}</span>
    <button onclick="testOltConnection('${olt.id}')" class="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded text-[11px] font-semibold">
      <i class="fa-solid fa-bolt"></i> Ping Test
    </button>
  `;

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
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 text-xs">
          <i class="fa-solid fa-check-circle text-2xl text-emerald-500/50 mb-2 block"></i>
          No hay ONTs pendientes por autorizar en esta OLT. Todas las líneas están aprovisionadas.
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
    data.onts.forEach(ont => {
      html += `
        <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-white">${ont.sn}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold">${ont.vendor}</span>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">Puerto: ${ont.gponPort} &bull; Detectado recientemente</p>
          </div>
          <button onclick="openProvisionModal('${ont.sn}', '${ont.gponPort}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
            <i class="fa-solid fa-bolt"></i> Activar
          </button>
        </div>
      `;
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

function openWgModal() {
  document.getElementById('wgModal').classList.remove('hidden');
  document.getElementById('wgScriptResult').classList.add('hidden');
}

function closeWgModal() {
  document.getElementById('wgModal').classList.add('hidden');
}

async function generateMikrotikScript(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGenWg');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando llaves...';

  const routerName = document.getElementById('wgRouterName').value;
  const subnet = document.getElementById('wgSubnet').value;

  try {
    const res = await fetch('/api/wireguard/generate-peer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routerName, subnet })
    });
    const data = await res.json();
    if (data.script) {
      document.getElementById('wgScriptContent').value = data.script;
      document.getElementById('wgScriptResult').classList.remove('hidden');
    } else {
      alert('❌ Error: ' + (data.error || 'No se pudo generar el script'));
    }
  } catch (err) {
    alert('❌ Error conectando con el servidor');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-terminal"></i> Generar Script MikroTik';
  }
}

function copyWgScript() {
  const copyText = document.getElementById('wgScriptContent');
  copyText.select();
  document.execCommand('copy');
  alert('📋 ¡Script copiado al portapapeles! Pégalo en New Terminal de Winbox.');
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

// Exponer funciones globalmente en window para llamadas onclick inline
window.loadOlts = loadOlts;
window.populateOltSelect = populateOltSelect;
window.renderOltsGrid = renderOltsGrid;
window.onOltChange = onOltChange;
window.refreshData = refreshData;
window.testOltConnection = testOltConnection;
window.openOltModal = openOltModal;
window.editOlt = editOlt;
window.closeOltModal = closeOltModal;
window.testModalConnection = testModalConnection;
window.saveOlt = saveOlt;
window.deleteOlt = deleteOlt;
window.openProvisionModal = openProvisionModal;
window.closeProvisionModal = closeProvisionModal;
window.openWgModal = openWgModal;
window.closeWgModal = closeWgModal;
window.generateMikrotikScript = generateMikrotikScript;
window.copyWgScript = copyWgScript;
window.submitProvision = submitProvision;

// Carga inicial
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', loadOlts);
} else {
  loadOlts();
}
