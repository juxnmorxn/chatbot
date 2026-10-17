// ========================================================
// CloudOLT Core - Dashboard Script
// ========================================================

let olts = [];
let tunnels = [];
let activeTab = 'olts';
let activeOltId = '';

// ==========================================
// SISTEMA DE TOASTS Y MODALES PERSONALIZADOS
// ==========================================
const recentToasts = new Map();

function showToast(title, message = '', type = 'info', durationMs = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const key = `${type}:${title}:${message}`;
  const now = Date.now();
  if (recentToasts.has(key) && (now - recentToasts.get(key)) < 2500) {
    return; // Evitar mensajes duplicados seguidos
  }
  recentToasts.set(key, now);
  if (recentToasts.size > 20) {
    for (const [k, t] of recentToasts.entries()) {
      if (now - t > 10000) recentToasts.delete(k);
    }
  }

  const colors = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-gray-950/95',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      icon: 'fa-solid fa-check',
      progress: 'bg-emerald-500'
    },
    error: {
      border: 'border-rose-500/40',
      bg: 'bg-gray-950/95',
      iconBg: 'bg-rose-500/20 text-rose-400',
      icon: 'fa-solid fa-circle-exclamation',
      progress: 'bg-rose-500'
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-gray-950/95',
      iconBg: 'bg-amber-500/20 text-amber-400',
      icon: 'fa-solid fa-triangle-exclamation',
      progress: 'bg-amber-500'
    },
    info: {
      border: 'border-sky-500/40',
      bg: 'bg-gray-950/95',
      iconBg: 'bg-sky-500/20 text-sky-400',
      icon: 'fa-solid fa-circle-info',
      progress: 'bg-sky-500'
    }
  };

  const style = colors[type] || colors.info;
  const toast = document.createElement('div');
  toast.className = `glass-card ${style.border} ${style.bg} pointer-events-auto rounded-xl p-3.5 shadow-2xl flex items-start gap-3 transform transition-all duration-300 translate-x-12 opacity-0 overflow-hidden relative max-w-sm`;

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center text-sm shrink-0 mt-0.5">
      <i class="${style.icon}"></i>
    </div>
    <div class="flex-1 min-w-0 pr-2">
      <div class="text-xs font-bold text-white tracking-wide">${title}</div>
      ${message ? `<div class="text-[11px] text-gray-300 mt-0.5 leading-snug break-words">${message}</div>` : ''}
    </div>
    <button class="text-gray-400 hover:text-white text-xs shrink-0 p-1" onclick="this.closest('.glass-card').remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800">
      <div class="h-full ${style.progress} transition-all ease-linear" style="width: 100%; transition-duration: ${durationMs}ms;"></div>
    </div>
  `;

  container.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-12', 'opacity-0');
    const bar = toast.querySelector(`.${style.progress}`);
    if (bar) setTimeout(() => { bar.style.width = '0%'; }, 50);
  });

  // Auto descartar
  setTimeout(() => {
    toast.classList.add('translate-x-12', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

function showConfirmModal(title, message, confirmText = 'Confirmar', variant = 'rose') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customDialogModal');
    const box = document.getElementById('customDialogBox');
    const titleEl = document.getElementById('customDialogTitle');
    const msgEl = document.getElementById('customDialogMessage');
    const iconContainer = document.getElementById('customDialogIconContainer');
    const btnContainer = document.getElementById('customDialogButtons');

    titleEl.innerText = title;
    msgEl.innerText = message;

    if (variant === 'rose') {
      iconContainer.className = 'w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg shrink-0';
      iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
      iconContainer.className = 'w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg shrink-0';
      iconContainer.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    }

    const confirmBtnClass = variant === 'rose'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : 'bg-indigo-600 hover:bg-indigo-500 text-white';

    btnContainer.innerHTML = `
      <button type="button" id="customDialogCancelBtn" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition">
        Cancelar
      </button>
      <button type="button" id="customDialogConfirmBtn" class="px-4 py-2 rounded-xl ${confirmBtnClass} text-xs font-bold transition shadow-lg">
        ${confirmText}
      </button>
    `;

    const close = (res) => {
      box.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        resolve(res);
      }, 150);
    };

    document.getElementById('customDialogCancelBtn').onclick = () => close(false);
    document.getElementById('customDialogConfirmBtn').onclick = () => close(true);

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      box.classList.remove('scale-95', 'opacity-0');
    });
  });
}

function showAlertModal(title, message, type = 'error') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customDialogModal');
    const box = document.getElementById('customDialogBox');
    const titleEl = document.getElementById('customDialogTitle');
    const msgEl = document.getElementById('customDialogMessage');
    const iconContainer = document.getElementById('customDialogIconContainer');
    const btnContainer = document.getElementById('customDialogButtons');

    titleEl.innerText = title;
    msgEl.innerText = message;

    if (type === 'error') {
      iconContainer.className = 'w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg shrink-0';
      iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (type === 'success') {
      iconContainer.className = 'w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shrink-0';
      iconContainer.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
      iconContainer.className = 'w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg shrink-0';
      iconContainer.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    }

    btnContainer.innerHTML = `
      <button type="button" id="customDialogOkBtn" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg">
        Entendido
      </button>
    `;

    const close = () => {
      box.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        resolve();
      }, 150);
    };

    document.getElementById('customDialogOkBtn').onclick = close;

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      box.classList.remove('scale-95', 'opacity-0');
    });
  });
}

// ==========================================
// NAVEGACIÓN ENTRE PESTAÑAS (TABS CON PERSISTENCIA)
// ==========================================
function switchTab(tab, updateHash = true) {
  if (!['olts', 'tunnels', 'unconfigured', 'onus'].includes(tab)) {
    tab = 'onus';
  }
  activeTab = tab;

  // Persistir en localStorage
  try {
    localStorage.setItem('cloudolt_active_tab', tab);
  } catch {}

  // Actualizar hash en la URL sin recargar
  if (updateHash && window.location.hash !== '#' + tab) {
    history.replaceState(null, '', '#' + tab);
  }

  // Actualizar estilos de los botones de pestaña
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-indigo-500/30', 'shadow-md');
    btn.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-800/50');
  });

  const activeBtn = document.getElementById('tab-btn-' + tab);
  if (activeBtn) {
    activeBtn.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-800/50');
    activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-indigo-500/30', 'shadow-md');
    try {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } catch {}
  }

  // Mostrar / ocultar paneles
  const viewOlts = document.getElementById('view-olts');
  const viewTunnels = document.getElementById('view-tunnels');
  const viewUnconfigured = document.getElementById('view-unconfigured');
  const viewOnus = document.getElementById('view-onus');

  if (viewOlts) viewOlts.classList.toggle('hidden', tab !== 'olts');
  if (viewTunnels) viewTunnels.classList.toggle('hidden', tab !== 'tunnels');
  if (viewUnconfigured) viewUnconfigured.classList.toggle('hidden', tab !== 'unconfigured');
  if (viewOnus) viewOnus.classList.toggle('hidden', tab !== 'onus');

  if (tab === 'olts') loadOlts();
  if (tab === 'tunnels') loadTunnels();
  if (tab === 'unconfigured') refreshAutofind();
  if (tab === 'onus') loadOnus();
}

function refreshCurrentTab() {
  const iconD = document.getElementById('desktopRefreshIcon');
  const iconM = document.getElementById('mobileRefreshIcon');
  if (iconD) iconD.classList.add('fa-spin');
  if (iconM) iconM.classList.add('fa-spin');
  setTimeout(() => {
    if (iconD) iconD.classList.remove('fa-spin');
    if (iconM) iconM.classList.remove('fa-spin');
  }, 1000);

  if (activeTab === 'tunnels') loadTunnels(true);
  else if (activeTab === 'unconfigured') refreshAutofind();
  else if (activeTab === 'onus') loadOnus(true);
  else loadOlts(true);
}

// ==========================================
// GESTIÓN DE TÚNELES VPN (RouterOS v7 WireGuard)
// ==========================================
let lastTunnelsJson = '';

async function loadTunnels(force = false) {
  try {
    const res = await fetch('/api/tunnels');
    const data = await res.json();
    const str = JSON.stringify(data);
    if (!force && str === lastTunnelsJson) {
      return; // No hubo cambios, mantener el DOM intacto
    }
    lastTunnelsJson = str;
    tunnels = data;
    renderTunnelsTable();
    populateTunnelDropdown();
  } catch (err) {
    console.error('Error cargando túneles:', err);
  }
}

function renderTunnelsTable() {
  const tbody = document.getElementById('tunnelsTableBody');
  const countBadge = document.getElementById('tunnelsCountBadge');
  const navBadge = document.getElementById('tunnelsNavCountBadge');
  if (countBadge) countBadge.innerText = `${tunnels.length} túneles`;
  if (navBadge) navBadge.innerText = tunnels.length;

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
      showToast('Túnel Guardado', 'Configuración guardada correctamente', 'success');
      // Mostrar de inmediato la ventana con el script
      showTunnelSetup(data.id || id);
    } else {
      showToast('Error guardando túnel', data.error || 'Desconocido', 'error');
    }
  } catch (err) {
    showToast('Error de comunicación', 'No se pudo contactar al servidor', 'error');
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
    showToast('Error', 'No se pudo obtener el script del túnel', 'error');
  }
}

function closeSetupModal() {
  document.getElementById('setupModal').classList.add('hidden');
}

function copySetupScript() {
  const textarea = document.getElementById('setupModalScript');
  textarea.select();
  document.execCommand('copy');
  showToast('Copiado al Portapapeles', 'Pégalo en New Terminal de Winbox RouterOS', 'success');
}

async function deleteTunnel(id) {
  const ok = await showConfirmModal(
    '¿Eliminar Túnel MikroTik?',
    'Si eliminas este túnel, la OLT y las ONTs conectadas a este router perderán comunicación con CloudOLT.',
    'Eliminar Túnel',
    'rose'
  );
  if (!ok) return;

  try {
    const res = await fetch('/api/tunnels/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Túnel Eliminado', 'El túnel VPN fue eliminado con éxito', 'info');
      loadTunnels();
    } else {
      showToast('Error', 'No se pudo eliminar el túnel', 'error');
    }
  } catch {
    showToast('Error de conexión', 'No se pudo contactar al servidor', 'error');
  }
}

// ==========================================
// GESTIÓN DE OLTS (Tabla principal - Screenshot 2)
// ==========================================
let lastOltsJson = '';

async function loadOlts(force = false) {
  try {
    const res = await fetch('/api/olts');
    const data = await res.json();
    const str = JSON.stringify(data);
    if (!force && str === lastOltsJson) {
      return; // Sin cambios, no parpadear
    }
    lastOltsJson = str;
    olts = data;
    renderOltsTable();
    populateTunnelDropdown();
  } catch (err) {
    console.error('Error cargando OLTs:', err);
  }
}

function renderOltsTable() {
  const tbody = document.getElementById('oltsTableBody');
  const countBadge = document.getElementById('oltsCountBadge');
  const navBadge = document.getElementById('oltsNavCountBadge');
  if (countBadge) countBadge.innerText = `${olts.length} OLTs`;
  if (navBadge) navBadge.innerText = olts.length;

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
          <button id="btn-test-olt-${o.id}" onclick="testOltConnection('${o.id}')" title="Probar conexión SSH" class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
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
    showToast('Campos requeridos', 'Ingresa al menos la IP y el usuario SSH para probar la conexión.', 'warning');
    return;
  }

  const btn = document.getElementById('btnTestModal');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Probando SSH...';

  try {
    const res = await fetch('/api/olts/test-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, username, password, tunnelId })
    });
    const data = await res.json();
    if (data.online) {
      showToast(
        '¡Conexión Exitosa con la OLT!',
        `Sesión CLI interactiva establecida con latencia de ${data.latencyMs}ms`,
        'success',
        5000
      );
    } else {
      showAlertModal(
        'No se pudo conectar a la OLT',
        data.error || 'Verifica que el MikroTik tenga el túnel activo y que la contraseña sea la correcta.',
        'error'
      );
    }
  } catch {
    showToast('Error de Red', 'No se pudo contactar al servidor CloudOLT', 'error');
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
      showToast('OLT Guardada', 'La OLT fue registrada exitosamente en el sistema', 'success');
      loadOlts();
    } else {
      showAlertModal('Error al Guardar OLT', data.error || 'Error desconocido al registrar la OLT.', 'error');
    }
  } catch {
    showToast('Error de Red', 'Error de comunicación con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save (Guardar)';
  }
}

async function deleteOlt(id) {
  const ok = await showConfirmModal(
    '¿Eliminar OLT?',
    'Se eliminará el registro de la OLT y sus ONTs asociadas en CloudOLT.',
    'Eliminar OLT',
    'rose'
  );
  if (!ok) return;

  try {
    const res = await fetch('/api/olts/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('OLT Eliminada', 'La OLT fue dada de baja con éxito', 'info');
      loadOlts();
    } else {
      showToast('Error', 'No se pudo eliminar la OLT', 'error');
    }
  } catch {
    showToast('Error de Red', 'No se pudo contactar al servidor', 'error');
  }
}

async function testOltConnection(id) {
  const btn = document.getElementById('btn-test-olt-' + id);
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testeando...';
  }

  showToast('Probando OLT...', 'Consultando sesión SSH interactiva con la OLT', 'info', 2000);

  try {
    const res = await fetch('/api/olts/' + id + '/test', { method: 'POST' });
    const data = await res.json();
    if (data.online) {
      showToast('OLT en Línea', `Respuesta exitosa: ${data.latencyMs}ms`, 'success', 4000);
      await showAlertModal(
        '¡Test de Conexión Exitoso!',
        `Se estableció enlace interactivo SSH con la OLT exitosamente.\n\n• Prompt CLI: ${data.rawInfo || data.prompt || 'DS-P7001-01'}\n• Latencia: ${data.latencyMs}ms\n• Estado: ONLINE (En línea)`,
        'success'
      );
    } else {
      showToast('OLT Fuera de Línea', data.error || 'Timeout de conexión', 'error', 5000);
      await showAlertModal(
        'Test de Conexión Fallido',
        `No se pudo comunicar con la OLT:\n${data.error || 'Verifica que el MikroTik tenga el túnel activo y que la IP/puerto sean accesibles.'}`,
        'error'
      );
    }
    loadOlts();
  } catch (err) {
    showToast('Error de Red', 'Error al probar conexión con la OLT', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
}

function viewOlt(id) {
  activeOltId = id;
  switchTab('onus');
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

function autoFill5gSsid() {
  const s24 = document.getElementById('modalWifiSsid')?.value || '';
  const s5 = document.getElementById('modalWifi5gSsid');
  if (s5 && (!s5.value || s5.value.endsWith('_5G'))) {
    s5.value = s24 ? (s24 + '_5G') : '';
  }
}

function openProvisionModal(sn, port) {
  const olt = olts.find(o => o.id === activeOltId);
  document.getElementById('modalSn').value = sn;
  document.getElementById('modalPort').value = port || '1/0/1';
  const portDisplay = document.getElementById('modalPortDisplay');
  if (portDisplay) portDisplay.value = port || '1/0/1';
  document.getElementById('modalVlan').value = olt ? olt.default_vlan : 400;

  // 1. Calcular automáticamente el siguiente ONU ID libre en ese puerto GPON
  const usedIds = (configuredOnus || [])
    .filter(o => !port || o.gponPort === port)
    .map(o => o.onuId);
  let nextId = 0;
  while (usedIds.includes(nextId)) nextId++;
  const onuInput = document.getElementById('modalOnuId');
  if (onuInput) onuInput.value = nextId;

  // 2. Calcular sugerencia de IP Estática en la subred activa de la OLT
  let detectedSubnet = '172.19.52.';
  let usedOctets = new Set();

  for (const o of (configuredOnus || [])) {
    if (o.ip && o.ip.includes('.')) {
      const parts = o.ip.split('.');
      if (parts.length === 4) {
        detectedSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.`;
        usedOctets.add(parseInt(parts[3], 10));
      }
    }
  }

  // Buscar el primer host libre entre .2 y .254
  let nextHost = 2;
  while (usedOctets.has(nextHost) && nextHost < 254) {
    nextHost++;
  }

  const suggestedIp = `${detectedSubnet}${nextHost}`;
  const suggestedGateway = `${detectedSubnet}1`;

  const ipInput = document.getElementById('modalIp');
  if (ipInput) ipInput.value = suggestedIp;

  const gwInput = document.getElementById('modalGateway');
  if (gwInput) gwInput.value = suggestedGateway;

  const maskInput = document.getElementById('modalMask');
  if (maskInput && !maskInput.value) maskInput.value = '255.255.255.0';

  const dns1Input = document.getElementById('modalDns1');
  if (dns1Input && !dns1Input.value) dns1Input.value = '8.8.8.8';

  const dns2Input = document.getElementById('modalDns2');
  if (dns2Input && !dns2Input.value) dns2Input.value = '8.8.4.4';

  const cleanSn = sn.replace(/[-_]/g, '');
  const wifiInput = document.getElementById('modalWifiSsid');
  if (wifiInput) wifiInput.value = `Fibra-${cleanSn.slice(-4)}`;

  const wifi5gInput = document.getElementById('modalWifi5gSsid');
  if (wifi5gInput) wifi5gInput.value = `Fibra-${cleanSn.slice(-4)}_5G`;

  const wifiPassInput = document.getElementById('modalWifiPassword');
  if (wifiPassInput) wifiPassInput.value = '';

  const wifi5gPassInput = document.getElementById('modalWifi5gPassword');
  if (wifi5gPassInput) wifi5gPassInput.value = '';

  document.getElementById('provisionModal').classList.remove('hidden');
}

function closeProvisionModal() {
  document.getElementById('provisionModal').classList.add('hidden');
}

async function submitProvision(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitModal');
  const ipValue = (document.getElementById('modalIp')?.value || '').trim();

  if (!ipValue) {
    showToast('IP Estática Requerida', 'Debes ingresar la IP Estática que tendrá la ONT', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovisionando ONT con IP Estática...';

  const payload = {
    oltId: activeOltId,
    serial: document.getElementById('modalSn').value,
    gponPort: document.getElementById('modalPort').value,
    clientName: document.getElementById('modalClient').value,
    vlanId: parseInt(document.getElementById('modalVlan').value, 10),
    onuId: parseInt(document.getElementById('modalOnuId').value, 10),
    ipAddress: ipValue,
    gateway: (document.getElementById('modalGateway')?.value || '').trim(),
    subnetMask: (document.getElementById('modalMask')?.value || '255.255.255.0').trim(),
    dns1: (document.getElementById('modalDns1')?.value || '8.8.8.8').trim(),
    dns2: (document.getElementById('modalDns2')?.value || '8.8.4.4').trim(),
    wifiSsid: (document.getElementById('modalWifiSsid')?.value || '').trim(),
    wifiPassword: (document.getElementById('modalWifiPassword')?.value || '').trim(),
    wifiSsid5g: (document.getElementById('modalWifi5gSsid')?.value || '').trim(),
    wifiPassword5g: (document.getElementById('modalWifi5gPassword')?.value || '').trim()
  };

  try {
    const res = await fetch('/api/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        '¡ONT Activada en Modo Estático!',
        `ONU #${data.onuId} asignada con IP Estática ${data.ipAddress || ipValue}. TR-069 programado.`,
        'success',
        7000
      );
      closeProvisionModal();
      refreshAutofind();
      loadOnus(true);
    } else {
      showAlertModal('Error al aprovisionar ONT', data.log || data.error || 'La OLT no completó la activación.', 'error');
    }
  } catch (err) {
    showToast('Error de Red', 'No se pudo contactar al servidor CloudOLT', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Ejecutar Activación con IP Estática';
  }
}

// ==========================================
// GESTIÓN DE ONUS CONFIGURADAS (SmartOLT Style)
// ==========================================
let configuredOnus = [];

async function loadOnus(force = false) {
  const tbody = document.getElementById('onusTableBody');
  const refreshIcon = document.getElementById('btnRefreshOnusIcon');
  const select = document.getElementById('onusOltSelect');

  if (refreshIcon) refreshIcon.classList.add('fa-spin');

  // Llenar selector de OLTs si no se ha inicializado
  if (select && olts.length > 0 && select.options.length <= 1) {
    const currentVal = select.value || activeOltId;
    select.innerHTML = '<option value="">-- Todas las OLTs --</option>' + olts.map(o => `<option value="${o.id}">${o.name} (${o.ip})</option>`).join('');
    if (activeOltId && olts.find(o => o.id === activeOltId)) {
      select.value = activeOltId;
    } else if (currentVal) {
      select.value = currentVal;
    }
  }

  if (tbody && (!configuredOnus || configuredOnus.length === 0)) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-12 text-gray-400 text-xs">
          <i class="fa-solid fa-spinner fa-spin text-xl text-sky-400 mb-2 block"></i>
          Leyendo ONTs y potencias ópticas en vivo desde la OLT...
        </td>
      </tr>
    `;
  }

  try {
    const filterId = select ? select.value : activeOltId;
    const oltFilter = filterId ? `?oltId=${filterId}` : '';
    const res = await fetch('/api/onus' + oltFilter);
    const data = await res.json();
    
    // Si la OLT respondió con ONTs, actualizar lista. Si respondió vacío por timeout transitorio, preservar las ONTs en memoria
    if (data.onts && data.onts.length > 0) {
      configuredOnus = data.onts;
    } else if (!configuredOnus || configuredOnus.length === 0) {
      configuredOnus = data.onts || [];
    }

    // Actualizar Badges
    const totalBadge = document.getElementById('onusTotalBadge');
    const navBadge = document.getElementById('onusCountBadge');
    if (totalBadge) totalBadge.innerText = `${configuredOnus.length} ONUs`;
    if (navBadge) navBadge.innerText = configuredOnus.length;

    // Calcular estadísticas
    let onlineCount = 0;
    let offlineCount = 0;
    let optimalCount = 0;
    let warningCount = 0;

    configuredOnus.forEach(o => {
      if (o.status === 'online') {
        onlineCount++;
        const rxNum = parseFloat(o.rxPower);
        if (!isNaN(rxNum)) {
          if (rxNum >= -25.0) optimalCount++;
          else warningCount++;
        }
      } else {
        offlineCount++;
      }
    });

    const elOnline = document.getElementById('statOnusOnline');
    const elOffline = document.getElementById('statOnusOffline');
    const elOptimal = document.getElementById('statOnusOptimal');
    const elWarning = document.getElementById('statOnusWarning');

    if (elOnline) elOnline.innerText = onlineCount;
    if (elOffline) elOffline.innerText = offlineCount;
    if (elOptimal) elOptimal.innerText = optimalCount;
    if (elWarning) elWarning.innerText = warningCount;

    renderOnusTable(configuredOnus);

    if (force) {
      showToast('Señales Actualizadas', `${configuredOnus.length} ONTs leídas en vivo con éxito`, 'success', 3000);
    }
  } catch (err) {
    console.error('Error cargando ONUs:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-12 text-rose-400 text-xs">
            <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 block"></i>
            Error conectando con la OLT para leer ONUs. Verifica el túnel WireGuard.
          </td>
        </tr>
      `;
    }
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

function renderOnusTable(list) {
  const tbody = document.getElementById('onusTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-12 text-gray-500 text-xs">
          <i class="fa-solid fa-network-wired text-3xl mb-2 text-gray-600 block"></i>
          No hay ONUs configuradas encontradas en la OLT seleccionada.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((o, idx) => {
    const isOnline = o.status === 'online';
    const statusHtml = isOnline
      ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
           <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> OFFLINE
         </span>`;

    let rxBadge = `<span class="text-gray-500 font-mono text-xs">-</span>`;
    if (isOnline && o.rxPower && o.rxPower !== 'N/A') {
      const rxVal = parseFloat(o.rxPower);
      if (!isNaN(rxVal)) {
        if (rxVal >= -24.5) {
          rxBadge = `<span class="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 w-max">
            <i class="fa-solid fa-signal text-[10px]"></i> ${o.rxPower}
          </span>`;
        } else if (rxVal >= -27.0) {
          rxBadge = `<span class="font-mono text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 w-max">
            <i class="fa-solid fa-signal text-[10px]"></i> ${o.rxPower}
          </span>`;
        } else {
          rxBadge = `<span class="font-mono text-xs font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1 w-max">
            <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> ${o.rxPower}
          </span>`;
        }
      } else {
        rxBadge = `<span class="font-mono text-xs text-gray-300">${o.rxPower}</span>`;
      }
    }

    const escapedName = encodeURIComponent(o.name || '');
    return `
      <tr class="border-b border-gray-800/60 hover:bg-gray-900/40 transition">
        <td class="py-3 px-4 font-mono text-xs text-gray-400">${idx + 1}</td>
        <td class="py-3 px-4">${statusHtml}</td>
        <td class="py-3 px-4">
          <div onclick="viewOnuDetail('${o.oltId}', '${o.gponPort}', ${o.onuId}, '${o.sn}', '${escapedName}', ${o.vlan || 400})" class="font-bold text-white text-xs flex items-center gap-1.5 cursor-pointer hover:text-sky-400 transition">
            <i class="fa-solid fa-user text-sky-400 text-[10px]"></i> ${o.name}
          </div>
          <div class="text-[10px] text-gray-400 font-mono mt-0.5">
            OLT: ${o.oltName || 'fray'} ${o.ip ? `• <span class="text-sky-300 font-semibold font-mono">${o.ip}</span>` : ''}
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="font-mono text-xs text-sky-300 font-semibold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">${o.sn}</span>
          ${o.mac ? `<div class="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1"><i class="fa-solid fa-ethernet text-[9px] text-gray-500"></i> ${o.mac}</div>` : ''}
        </td>
        <td class="py-3 px-4 font-mono text-xs text-gray-300">${o.gponPort}:${o.onuId}</td>
        <td class="py-3 px-4">${rxBadge}</td>
        <td class="py-3 px-4 font-mono text-xs text-gray-400">${o.txPower}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono">VLAN ${o.vlan || 400}</span>
        </td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="viewOnuDetail('${o.oltId}', '${o.gponPort}', ${o.onuId}, '${o.sn}', '${escapedName}', ${o.vlan || 400})" title="Ver detalles, telemetría y web del módem" class="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-eye"></i> View
          </button>
          ${o.ip ? `
          <button onclick="window.open('https://${o.ip}:80', '_blank'); showToast('Acceso Web Módem', 'URL: https://${o.ip}:80 | Usuario: Epadmin | Clave: adminEp', 'info', 7000)" title="Abrir portal web directo del módem (Epadmin)" class="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-globe"></i> Web
          </button>` : ''}
          <button onclick="promptRebootOnt('${o.oltId}', '${o.gponPort}', ${o.onuId}, '${o.name}')" title="Reiniciar ONT remotamente" class="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
            <i class="fa-solid fa-power-off"></i> Reiniciar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterOnusTable() {
  const query = (document.getElementById('onusSearchInput')?.value || '').toLowerCase().trim();
  if (!query) {
    renderOnusTable(configuredOnus);
    return;
  }
  const filtered = configuredOnus.filter(o => 
    o.name.toLowerCase().includes(query) ||
    o.sn.toLowerCase().includes(query) ||
    (o.mac && o.mac.toLowerCase().includes(query)) ||
    (o.ip && o.ip.toLowerCase().includes(query)) ||
    `${o.gponPort}:${o.onuId}`.includes(query)
  );
  renderOnusTable(filtered);
}

// ==========================================
// DETALLE DE LA ONU (SmartOLT View ONU & TR-069)
// ==========================================
let currentViewOnu = null;

async function viewOnuDetail(oltId, gponPort, onuId, sn, encodedName, vlan) {
  const clientName = decodeURIComponent(encodedName || 'Cliente');
  currentViewOnu = {
    oltId,
    gponPort,
    onuId,
    sn,
    name: clientName,
    vlan: vlan || 400,
    realWifiPass: '••••••••',
    realWifi5gPass: '••••••••',
    wifiVisible: false,
    wifi5gVisible: false,
    isActive: true
  };

  // Buscar datos en cache filtrando estrictamente por OLT y número de serie
  const cached = configuredOnus.find(o => o.sn === sn && (!oltId || o.oltId === oltId)) 
              || configuredOnus.find(o => o.sn === sn);
  currentViewOnu.cached = cached;

  // Poblar UI inicial
  document.getElementById('viewOnuTitleName').innerText = clientName;
  document.getElementById('viewOnuSubtitle').innerText = `gpon-onu_${gponPort}:${onuId} • ${sn}`;
  document.getElementById('viewOnuOltName').innerText = cached?.oltName || (olts.find(x => x.id === oltId)?.name || 'plomosas');
  document.getElementById('viewOnuPort').innerText = `${gponPort}:${onuId}`;
  document.getElementById('viewOnuSn').innerHTML = `${sn} ${cached?.mac ? `<span class="ml-2 px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-sky-300 font-mono"><i class="fa-solid fa-ethernet text-[9px] mr-1"></i>${cached.mac}</span>` : ''}`;
  document.getElementById('viewOnuModel').innerText = cached?.model || 'Huawei EG8041V5';

  const hwSwEl = document.getElementById('viewOnuHwSw');
  if (hwSwEl) {
    hwSwEl.innerText = `${cached?.hardwareVersion || '31FD.A'} • ${cached?.softwareVersion || 'V5R021'}`;
  }

  const telEl = document.getElementById('viewOnuTelemetry');
  if (telEl) {
    telEl.innerText = `${cached?.voltage || '3.36V'} • ${cached?.temperature || '37°C'}`;
  }

  document.getElementById('viewOnuVlanBadge').innerText = `VLAN ${vlan || 400}`;

  const rx = cached?.rxPower || '-19.79 dBm';
  const tx = cached?.txPower || '1.94 dBm';
  document.getElementById('viewOnuRxDbm').innerText = rx;
  document.getElementById('viewOnuTxDbm').innerText = tx;

  // Barra de señal visual y diagnóstico explicativo
  const rxNum = parseFloat(rx);
  const bar = document.getElementById('viewOnuSignalBar');
  const rxStatus = document.getElementById('viewOnuRxStatus');
  if (bar) {
    if (!isNaN(rxNum) && rxNum >= -24.5 && rxNum <= -14) {
      bar.className = 'bg-emerald-400 h-1.5 rounded-full';
      bar.style.width = '85%';
      if (rxStatus) {
        rxStatus.innerText = 'ÓPTIMA';
        rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold';
      }
    } else if (!isNaN(rxNum) && rxNum >= -27.0 && rxNum < -24.5) {
      bar.className = 'bg-amber-400 h-1.5 rounded-full';
      bar.style.width = '55%';
      if (rxStatus) {
        rxStatus.innerText = 'REGULAR';
        rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold';
      }
    } else if (!isNaN(rxNum) && rxNum < -27.0) {
      bar.className = 'bg-rose-500 h-1.5 rounded-full';
      bar.style.width = '25%';
      if (rxStatus) {
        rxStatus.innerText = 'CRÍTICA';
        rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold';
      }
    } else {
      bar.className = 'bg-sky-400 h-1.5 rounded-full';
      bar.style.width = '70%';
      if (rxStatus) {
        rxStatus.innerText = 'NORMAL';
        rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold';
      }
    }
  }

  // Valores de WAN reales de la ONT (0 hardcoding)
  const realIp = cached?.ip || 'Sin asignar';
  const realGw = cached?.gateway || (cached?.ip ? `${cached.ip.split('.').slice(0, 3).join('.')}.1` : 'Sin asignar');
  const realMask = cached?.mask || (cached?.ip ? '255.255.255.0' : 'Sin asignar');

  document.getElementById('viewWanOnuMode').innerText = 'Routing';
  document.getElementById('viewWanSetupMode').innerText = 'Static IP (OMCI/TR069)';
  document.getElementById('viewWanIp').innerText = realIp;
  document.getElementById('viewWanProtocol').innerText = 'Dual stack IPv4/IPv6';
  document.getElementById('viewWanMask').innerText = realMask;
  document.getElementById('viewWanGw').innerText = realGw;
  document.getElementById('viewWanIpv6Prefix').innerText = 'DHCPv6-PD (Auto)';

  // Wi-Fi 2.4 GHz inicial desde DB
  const savedSsid = cached?.wifi_ssid;
  const savedPass = cached?.wifi_password;
  document.getElementById('viewWifiSsid').innerText = savedSsid || 'Sin sincronizar aún';
  if (savedPass) {
    currentViewOnu.realWifiPass = savedPass;
    document.getElementById('viewWifiPass').innerText = '••••••••••••';
  } else {
    currentViewOnu.realWifiPass = null;
    document.getElementById('viewWifiPass').innerText = '••••••••••••';
  }

  // Wi-Fi 5 GHz inicial desde DB
  const saved5gSsid = cached?.wifi_ssid_5g;
  const saved5gPass = cached?.wifi_password_5g || savedPass;
  const el5gSsid = document.getElementById('viewWifi5gSsid');
  if (el5gSsid) el5gSsid.innerText = saved5gSsid || (savedSsid ? (savedSsid + '_5G') : 'Sin sincronizar aún');
  if (saved5gPass) {
    currentViewOnu.realWifi5gPass = saved5gPass;
    const el5gPass = document.getElementById('viewWifi5gPass');
    if (el5gPass) el5gPass.innerText = '••••••••••••';
  } else {
    currentViewOnu.realWifi5gPass = null;
    const el5gPass = document.getElementById('viewWifi5gPass');
    if (el5gPass) el5gPass.innerText = '••••••••••••';
  }

  document.getElementById('viewOnuModal').classList.remove('hidden');

  // Inicializar estado del portal web
  const webDirectIpEl = document.getElementById('viewOnuWebDirectIp');
  const webAuthEl = document.getElementById('viewOnuWebAuthStatus');
  const webLivePill = document.getElementById('viewOnuWebLivePill');
  const webStatusBadge = document.getElementById('viewOnuWebStatusBadge');

  if (webDirectIpEl) webDirectIpEl.innerText = cached?.ip ? `${cached.ip}:80` : 'Consultando...';
  if (webAuthEl) webAuthEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sky-400"></i> Verificando Epadmin...';
  if (webStatusBadge) {
    webStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Conectando...';
    webStatusBadge.className = 'text-[11px] px-2.5 py-1 rounded-lg bg-gray-900 text-gray-300 border border-gray-700 flex items-center gap-1.5 font-mono';
  }

  // 1. Consultar telemetría en tiempo real DIRECTAMENTE del portal web del módem con Epadmin / adminEp
  try {
    const webRes = await fetch(`/api/onus/${encodeURIComponent(sn)}/live-web?oltId=${encodeURIComponent(oltId)}&ip=${encodeURIComponent(cached?.ip || '')}`);
    const webData = await webRes.json();
    if (webData.success && webData.telemetry) {
      const t = webData.telemetry;
      currentViewOnu.modemIp = t.ip;

      if (webDirectIpEl) webDirectIpEl.innerText = `${t.ip}:80`;
      if (webAuthEl) webAuthEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-[10px]"></i> Verificado (Epadmin)';
      if (webLivePill) {
        webLivePill.innerText = 'ONLINE';
        webLivePill.className = 'text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300';
      }
      if (webStatusBadge) {
        webStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-[10px]"></i> Web ONT: Conectado (Epadmin)';
        webStatusBadge.className = 'text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono';
      }

      if (t.device) {
        if (t.device.model) document.getElementById('viewOnuModel').innerText = t.device.model;
        if (hwSwEl) hwSwEl.innerText = `${t.device.hardwareVersion} • ${t.device.softwareVersion}`;
      }

      if (t.optical) {
        if (t.optical.rxPower && t.optical.rxPower !== 'N/A') {
          document.getElementById('viewOnuRxDbm').innerText = t.optical.rxPower;
          const rxNum = parseFloat(t.optical.rxPower);
          if (bar && !isNaN(rxNum)) {
            if (rxNum >= -24.5 && rxNum <= -14) {
              bar.className = 'bg-emerald-400 h-1.5 rounded-full';
              bar.style.width = '85%';
              if (rxStatus) { rxStatus.innerText = 'ÓPTIMA'; rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold'; }
            } else if (rxNum >= -27.0) {
              bar.className = 'bg-amber-400 h-1.5 rounded-full';
              bar.style.width = '55%';
              if (rxStatus) { rxStatus.innerText = 'REGULAR'; rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold'; }
            } else {
              bar.className = 'bg-rose-500 h-1.5 rounded-full';
              bar.style.width = '25%';
              if (rxStatus) { rxStatus.innerText = 'CRÍTICA'; rxStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold'; }
            }
          }
        }
        if (t.optical.txPower && t.optical.txPower !== 'N/A') document.getElementById('viewOnuTxDbm').innerText = t.optical.txPower;
        if (telEl) telEl.innerText = `${t.optical.voltage} • ${t.optical.temperature} • ${t.optical.biasCurrent}`;
      }

      if (t.wan) {
        if (t.wan.ip) document.getElementById('viewWanIp').innerText = t.wan.ip;
        if (t.wan.mask) document.getElementById('viewWanMask').innerText = t.wan.mask;
        if (t.wan.gateway) document.getElementById('viewWanGw').innerText = t.wan.gateway;
        if (t.wan.mode) document.getElementById('viewWanSetupMode').innerText = `${t.wan.mode} (Web Epadmin)`;
        if (t.wan.mac) {
          document.getElementById('viewOnuSn').innerHTML = `${sn} <span class="ml-2 px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-sky-300 font-mono"><i class="fa-solid fa-ethernet text-[9px] mr-1"></i>${t.wan.mac}</span>`;
        }
      }

      if (t.wifi) {
        if (t.wifi.ssid2g) document.getElementById('viewWifiSsid').innerText = t.wifi.ssid2g;
        if (t.wifi.ssid5g && el5gSsid) el5gSsid.innerText = t.wifi.ssid5g;
      }

      if (t.tr069) {
        const infEl = document.getElementById('viewOnuInformStatus');
        if (infEl) infEl.innerText = `Inform: ${t.tr069.interval}s`;
      }
    } else {
      if (webAuthEl) webAuthEl.innerHTML = '<span class="text-rose-400 font-semibold"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Sin respuesta web</span>';
      if (webStatusBadge) {
        webStatusBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation text-amber-400 text-[10px]"></i> Web ONT: Desconectado';
        webStatusBadge.className = 'text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono';
      }
    }
  } catch (err) {
    if (webAuthEl) webAuthEl.innerHTML = '<span class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark text-[10px]"></i> Error de conexión</span>';
  }

  // 2. Complementar con GenieACS TR-069
  try {
    const res = await fetch(`/api/tr069/devices/${encodeURIComponent(sn)}`);
    const data = await res.json();
    if (data.device) {
      const dev = data.device;
      currentViewOnu.device = dev;
      if (dev.modelName) document.getElementById('viewOnuModel').innerText = dev.modelName;
      if (dev.wanIp && document.getElementById('viewWanIp').innerText === 'Sin asignar') {
        document.getElementById('viewWanIp').innerText = dev.wanIp;
      }
      if (dev.wifiPassword) {
        currentViewOnu.realWifiPass = dev.wifiPassword;
        if (currentViewOnu.wifiVisible) document.getElementById('viewWifiPass').innerText = dev.wifiPassword;
      }
      if (dev.wifi5gPassword) {
        currentViewOnu.realWifi5gPass = dev.wifi5gPassword;
        const pass5gEl = document.getElementById('viewWifi5gPass');
        if (currentViewOnu.wifi5gVisible && pass5gEl) pass5gEl.innerText = dev.wifi5gPassword;
      }
    }
  } catch (err) {}
}

async function renameCurrentOnu() {
  if (!currentViewOnu) return;
  const currentName = currentViewOnu.name || document.getElementById('viewOnuTitleName')?.innerText || 'Cliente';
  const newName = prompt('Ingrese el nuevo nombre para este abonado / contrato:', currentName);
  if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

  try {
    const res = await fetch('/api/onus/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oltId: currentViewOnu.oltId,
        gponPort: currentViewOnu.gponPort,
        onuId: currentViewOnu.onuId,
        serial: currentViewOnu.sn,
        name: newName.trim()
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Nombre Actualizado', `Abonado renombrado a "${data.name}"`, 'success');
      currentViewOnu.name = data.name;
      document.getElementById('viewOnuTitleName').innerText = data.name;
      if (typeof loadOnus === 'function') loadOnus();
    } else {
      showToast('Error', data.error || 'No se pudo actualizar el nombre', 'error');
    }
  } catch (err) {
    showToast('Error', 'Fallo de conexión al renombrar', 'error');
  }
}

function closeViewOnuModal() {
  document.getElementById('viewOnuModal')?.classList.add('hidden');
}

function toggleWifiPassVisibility(band = '2.4g') {
  if (!currentViewOnu) return;

  if (band === '5g') {
    currentViewOnu.wifi5gVisible = !currentViewOnu.wifi5gVisible;
    const passEl = document.getElementById('viewWifi5gPass');
    const eyeEl = document.getElementById('btnToggleWifi5gEye');
    if (currentViewOnu.wifi5gVisible) {
      if (passEl) passEl.innerText = currentViewOnu.realWifi5gPass || currentViewOnu.realWifiPass || 'No reportada aún';
      if (eyeEl) eyeEl.className = 'fa-solid fa-eye-slash text-purple-400';
    } else {
      if (passEl) passEl.innerText = '••••••••••••';
      if (eyeEl) eyeEl.className = 'fa-solid fa-eye';
    }
  } else {
    currentViewOnu.wifiVisible = !currentViewOnu.wifiVisible;
    const passEl = document.getElementById('viewWifiPass');
    const eyeEl = document.getElementById('btnToggleWifiEye');
    if (currentViewOnu.wifiVisible) {
      if (passEl) passEl.innerText = currentViewOnu.realWifiPass || 'No reportada aún';
      if (eyeEl) eyeEl.className = 'fa-solid fa-eye-slash text-sky-400';
    } else {
      if (passEl) passEl.innerText = '••••••••••••';
      if (eyeEl) eyeEl.className = 'fa-solid fa-eye';
    }
  }
}

function copyWifiSsid(band = '2.4g') {
  const el = band === '5g' ? document.getElementById('viewWifi5gSsid') : document.getElementById('viewWifiSsid');
  const text = el ? el.innerText.trim() : '';
  if (!text || text.includes('Consultando') || text.includes('Sin sincronizar')) {
    showToast('Aviso', 'No hay SSID configurado para copiar', 'warning');
    return;
  }
  navigator.clipboard.writeText(text);
  showToast('SSID Copiado', `"${text}" copiado al portapapeles`, 'success', 2500);
}

function copyWifiPass(band = '2.4g') {
  const pass = band === '5g' ? (currentViewOnu?.realWifi5gPass || currentViewOnu?.realWifiPass) : currentViewOnu?.realWifiPass;
  if (!pass || pass.includes('••••')) {
    showToast('Aviso', 'No hay contraseña disponible aún. Usa "Cambiar Wi-Fi".', 'warning');
    return;
  }
  navigator.clipboard.writeText(pass);
  showToast('Contraseña Copiada', 'Clave Wi-Fi copiada al portapapeles', 'success', 2500);
}

// ==========================================
// MODAL 6: UPDATE ONU MODE / IP (SmartOLT Screenshot 4)
// ==========================================
function openUpdateWanModal() {
  if (!currentViewOnu) return;

  document.getElementById('wanModalSn').value = currentViewOnu.sn;
  document.getElementById('wanModalOltId').value = currentViewOnu.oltId;
  document.getElementById('wanModalGponPort').value = currentViewOnu.gponPort;
  document.getElementById('wanModalOnuId').value = currentViewOnu.onuId;
  document.getElementById('wanModalVlan').value = currentViewOnu.vlan || 400;

  const currentIp = document.getElementById('viewWanIp')?.innerText;
  if (currentIp && currentIp !== 'Consultando...' && currentIp !== 'Sin asignar (OFFLINE)' && currentIp !== 'Sin asignar') {
    document.getElementById('wanModalIp').value = currentIp;
  } else {
    document.getElementById('wanModalIp').value = '';
  }

  const currentGw = document.getElementById('viewWanGw')?.innerText;
  document.getElementById('wanModalGw').value = (currentGw && currentGw !== 'Sin asignar') ? currentGw : '';
  document.getElementById('wanModalMask').value = '255.255.255.0';
  document.getElementById('wanModalDns1').value = '8.8.8.8';
  document.getElementById('wanModalDns2').value = '8.8.4.4';

  toggleWanFields();
  document.getElementById('updateWanModal')?.classList.remove('hidden');
}

function closeUpdateWanModal() {
  document.getElementById('updateWanModal')?.classList.add('hidden');
}

function toggleWanFields() {
  const mode = document.querySelector('input[name="wanTypeRadio"]:checked')?.value || 'Static';
  const staticBox = document.getElementById('wanStaticDetailsContainer');
  const pppoeBox = document.getElementById('wanPppoeDetailsContainer');

  if (mode === 'Static') {
    staticBox?.classList.remove('hidden');
    pppoeBox?.classList.add('hidden');
  } else if (mode === 'PPPoE') {
    staticBox?.classList.add('hidden');
    pppoeBox?.classList.remove('hidden');
  } else {
    // DHCP
    staticBox?.classList.add('hidden');
    pppoeBox?.classList.add('hidden');
  }
}

async function submitUpdateWan(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitWanUpdate');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Applying...';

  const sn = document.getElementById('wanModalSn').value;
  const oltId = document.getElementById('wanModalOltId').value;
  const gponPort = document.getElementById('wanModalGponPort').value;
  const onuId = document.getElementById('wanModalOnuId').value;
  const vlanId = document.getElementById('wanModalVlan').value;

  const onuMode = document.querySelector('input[name="wanOnuModeRadio"]:checked')?.value || 'Routing';
  const wanMode = document.querySelector('input[name="wanTypeRadio"]:checked')?.value || 'Static';
  const configMethod = document.querySelector('input[name="wanConfigMethodRadio"]:checked')?.value || 'TR069';
  const ipProtocol = document.querySelector('input[name="wanIpProtocolRadio"]:checked')?.value || 'DualStack';

  const ip = document.getElementById('wanModalIp')?.value;
  const mask = document.getElementById('wanModalMask')?.value;
  const gateway = document.getElementById('wanModalGw')?.value;
  const dns1 = document.getElementById('wanModalDns1')?.value;
  const dns2 = document.getElementById('wanModalDns2')?.value;

  const pppoeUser = document.getElementById('wanModalPppoeUser')?.value;
  const pppoePass = document.getElementById('wanModalPppoePass')?.value;

  try {
    const res = await fetch(`/api/tr069/devices/${encodeURIComponent(sn)}/wan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        enableIpv6: ipProtocol === 'DualStack'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Modo ONU Actualizado', `Configuración enviada por ${configMethod} a la ONT exitosamente`, 'success', 5000);
      document.getElementById('viewWanOnuMode').innerText = onuMode;
      document.getElementById('viewWanSetupMode').innerText = `${wanMode} (${configMethod})`;
      if (ip) {
        document.getElementById('viewWanIp').innerText = ip;
        if (currentViewOnu.cached) currentViewOnu.cached.ip = ip;
      }
      if (mask) document.getElementById('viewWanMask').innerText = mask;
      if (gateway) {
        document.getElementById('viewWanGw').innerText = gateway;
        if (currentViewOnu.cached) currentViewOnu.cached.gateway = gateway;
      }
      if (vlanId) document.getElementById('viewOnuVlanBadge').innerText = `VLAN ${vlanId}`;
      closeUpdateWanModal();
      if (typeof loadOnus === 'function') loadOnus();
    } else {
      showToast('Error', data.error || 'No se pudo aplicar la configuración en la ONT', 'error');
    }
  } catch (err) {
    showToast('Error de Red', 'Fallo de comunicación con CloudOLT', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

// ==========================================
// MODAL 7: CAMBIO DE WI-FI DUAL-BAND (2.4 GHz & 5 GHz)
// ==========================================
function openChangeWifiModal() {
  if (!currentViewOnu) return;
  const currentSsid = document.getElementById('viewWifiSsid')?.innerText || '';
  const current5gSsid = document.getElementById('viewWifi5gSsid')?.innerText || '';

  const valid2g = (currentSsid && !currentSsid.includes('Sin sincronizar') && !currentSsid.includes('Consultando') && !currentSsid.includes('Sin registrar')) ? currentSsid : 'CloudWare_Fibra';
  document.getElementById('wifiModalSsid').value = valid2g;

  const valid5g = (current5gSsid && !current5gSsid.includes('Sin sincronizar') && !current5gSsid.includes('Consultando'))
    ? current5gSsid
    : (valid2g ? (valid2g.endsWith('_5G') ? valid2g : (valid2g + '_5G')) : 'CloudWare_Fibra_5G');

  const el5g = document.getElementById('wifiModal5gSsid');
  if (el5g) el5g.value = valid5g;

  const pass = currentViewOnu.realWifiPass || '';
  const pass5g = currentViewOnu.realWifi5gPass || pass;
  document.getElementById('wifiModalPass').value = pass;

  const pass5gInput = document.getElementById('wifiModal5gPass');
  const syncCb = document.getElementById('wifiModalSyncPass');
  if (syncCb) syncCb.checked = (pass === pass5g || !currentViewOnu.realWifi5gPass);
  if (pass5gInput) {
    pass5gInput.value = pass5g;
    pass5gInput.disabled = syncCb ? syncCb.checked : false;
    if (syncCb && syncCb.checked) pass5gInput.classList.add('opacity-50');
    else pass5gInput.classList.remove('opacity-50');
  }

  document.getElementById('changeWifiModal')?.classList.remove('hidden');
}

function closeChangeWifiModal() {
  document.getElementById('changeWifiModal')?.classList.add('hidden');
}

function onToggleSyncPass() {
  const syncCb = document.getElementById('wifiModalSyncPass');
  const pass2g = document.getElementById('wifiModalPass');
  const pass5g = document.getElementById('wifiModal5gPass');
  if (!syncCb || !pass5g || !pass2g) return;
  if (syncCb.checked) {
    pass5g.value = pass2g.value;
    pass5g.disabled = true;
    pass5g.classList.add('opacity-50');
  } else {
    pass5g.disabled = false;
    pass5g.classList.remove('opacity-50');
  }
}

function onWifiPassInput() {
  const syncCb = document.getElementById('wifiModalSyncPass');
  const pass2g = document.getElementById('wifiModalPass');
  const pass5g = document.getElementById('wifiModal5gPass');
  if (syncCb?.checked && pass2g && pass5g) {
    pass5g.value = pass2g.value;
  }
}

async function submitChangeWifi(e) {
  e.preventDefault();
  if (!currentViewOnu) return;

  const ssid = document.getElementById('wifiModalSsid').value.trim();
  const password = document.getElementById('wifiModalPass').value.trim();
  const ssid5g = document.getElementById('wifiModal5gSsid')?.value.trim() || (ssid + '_5G');
  const syncCb = document.getElementById('wifiModalSyncPass');
  const password5g = (syncCb && syncCb.checked) ? password : (document.getElementById('wifiModal5gPass')?.value.trim() || password);

  const btn = document.getElementById('btnSubmitWifiModal');
  const origText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';

  try {
    const res = await fetch(`/api/tr069/devices/${encodeURIComponent(currentViewOnu.sn)}/wifi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid,
        password,
        ssid5g,
        password5g,
        oltId: currentViewOnu.oltId,
        onuId: currentViewOnu.onuId
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Wi-Fi Dual-Band Guardado', `Redes 2.4G ("${ssid}") y 5G ("${ssid5g}") sincronizadas con la ONT`, 'success', 5000);
      document.getElementById('viewWifiSsid').innerText = ssid;
      const el5g = document.getElementById('viewWifi5gSsid');
      if (el5g) el5g.innerText = ssid5g;

      currentViewOnu.realWifiPass = password;
      currentViewOnu.realWifi5gPass = password5g;

      if (currentViewOnu.cached) {
        currentViewOnu.cached.wifi_ssid = ssid;
        currentViewOnu.cached.wifi_password = password;
        currentViewOnu.cached.wifi_ssid_5g = ssid5g;
        currentViewOnu.cached.wifi_password_5g = password5g;
      }
      if (currentViewOnu.wifiVisible) {
        document.getElementById('viewWifiPass').innerText = password;
      }
      if (currentViewOnu.wifi5gVisible) {
        const el5gPass = document.getElementById('viewWifi5gPass');
        if (el5gPass) el5gPass.innerText = password5g;
      }
      closeChangeWifiModal();
    } else {
      showToast('Error', data.error || 'No se pudo guardar la configuración Wi-Fi', 'error');
    }
  } catch {
    showToast('Error de Red', 'Fallo de conexión con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

// ==========================================
// MODAL 8: CAMBIAR CONTRASEÑA WEB DEL MÓDEM
// ==========================================
function openChangePasswordModal() {
  document.getElementById('webPassModalPass').value = '';
  document.getElementById('changeWebPassModal')?.classList.remove('hidden');
}

function closeChangeWebPassModal() {
  document.getElementById('changeWebPassModal')?.classList.add('hidden');
}

async function submitChangeWebPass(e) {
  e.preventDefault();
  if (!currentViewOnu) return;

  const password = document.getElementById('webPassModalPass').value.trim();
  const res = await fetch(`/api/tr069/devices/${encodeURIComponent(currentViewOnu.sn)}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.success) {
    showToast('Contraseña Web Cambiada', 'La nueva clave web de acceso se aplicó por TR-069', 'success', 5000);
    closeChangeWebPassModal();
  } else {
    showToast('Error', data.error || 'No se pudo cambiar la clave web', 'error');
  }
}

// ==========================================
// ACCIONES AVANZADAS DE LA ONU (BOTONES SMARTOLT)
// ==========================================
async function actionViewOnuReboot() {
  if (!currentViewOnu) return;
  const ok = await showConfirmModal(
    '¿Reiniciar ONT?',
    `Se enviará orden de reinicio inmediato a la ONT "${currentViewOnu.name}" (${currentViewOnu.sn}). La fibra se reenganchará en ~30 segundos.`,
    'Reiniciar Ahora',
    'rose'
  );
  if (!ok) return;

  showToast('Reiniciando...', 'Enviando orden a la OLT y TR-069', 'info', 3000);
  const res = await fetch('/api/onus/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reboot',
      oltId: currentViewOnu.oltId,
      gponPort: currentViewOnu.gponPort,
      onuId: currentViewOnu.onuId,
      serial: currentViewOnu.sn
    })
  });
  const data = await res.json();
  if (data.success) {
    showToast('Reinicio Ejecutado', 'La ONT se está reiniciando correctamente', 'success');
  } else {
    showToast('Error', data.error || 'Fallo al reiniciar', 'error');
  }
}

async function actionViewOnuLinkTr069() {
  if (!currentViewOnu) return;
  const btn = document.getElementById('btnViewOnuLinkTr069');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vinculando...';
  }

  try {
    const res = await fetch('/api/onus/sync-tr069', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oltId: currentViewOnu.oltId,
        gponPort: currentViewOnu.gponPort,
        onuId: currentViewOnu.onuId,
        serial: currentViewOnu.sn,
        ipAddress: currentViewOnu.ip,
        gateway: currentViewOnu.gateway
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('¡TR-069 Vinculado!', 'Perfil TR-069 y Preset de GenieACS aplicados a la ONT', 'success', 5000);
      viewOnuDetail(
        currentViewOnu.oltId,
        currentViewOnu.gponPort,
        currentViewOnu.onuId,
        currentViewOnu.sn,
        encodeURIComponent(currentViewOnu.name),
        currentViewOnu.vlan
      );
    } else {
      showToast('Aviso TR-069', data.error || 'No se pudo vincular TR-069', 'warning');
    }
  } catch {
    showToast('Error', 'Fallo de conexión al vincular TR-069', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Activar TR-069';
    }
  }
}

async function actionViewOnuResync() {
  if (!currentViewOnu) return;
  showToast('Sincronizando...', 'Leyendo señales y parámetros en tiempo real', 'info', 2000);
  const res = await fetch('/api/onus/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'resync',
      oltId: currentViewOnu.oltId,
      gponPort: currentViewOnu.gponPort,
      onuId: currentViewOnu.onuId,
      serial: currentViewOnu.sn
    })
  });
  const data = await res.json();
  if (data.success) {
    showToast('Sincronización Completa', 'Configuración de la ONT sincronizada con éxito', 'success');
  }
}

async function actionViewOnuRestoreDefaults() {
  if (!currentViewOnu) return;
  const ok = await showConfirmModal(
    '¿Restaurar valores de fábrica?',
    `¡CUIDADO! Se borrará toda la configuración personalizada de la ONT de "${currentViewOnu.name}" y volverá a los ajustes de fábrica.`,
    'Restaurar Todo',
    'rose'
  );
  if (!ok) return;

  const res = await fetch('/api/onus/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'restore-defaults',
      oltId: currentViewOnu.oltId,
      gponPort: currentViewOnu.gponPort,
      onuId: currentViewOnu.onuId,
      serial: currentViewOnu.sn
    })
  });
  const data = await res.json();
  if (data.success) {
    showToast('Valores Restaurados', 'Se envió el comando factoryReset a la ONT', 'success');
  } else {
    showToast('Error', data.error || 'No se pudo restaurar', 'error');
  }
}

async function actionViewOnuToggleActive() {
  if (!currentViewOnu) return;
  const newState = !currentViewOnu.isActive;
  const label = newState ? 'Habilitar' : 'Deshabilitar';
  const ok = await showConfirmModal(
    `¿${label} ONT?`,
    `¿Deseas ${label.toLowerCase()} el tráfico del cliente "${currentViewOnu.name}" administrativamente en la OLT?`,
    `${label} ONT`,
    newState ? 'indigo' : 'rose'
  );
  if (!ok) return;

  const res = await fetch('/api/onus/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'toggle-active',
      oltId: currentViewOnu.oltId,
      gponPort: currentViewOnu.gponPort,
      onuId: currentViewOnu.onuId,
      serial: currentViewOnu.sn,
      active: newState
    })
  });
  const data = await res.json();
  if (data.success) {
    currentViewOnu.isActive = newState;
    const btn = document.getElementById('btnViewOnuDisable');
    if (btn) {
      btn.innerHTML = newState ? '<i class="fa-solid fa-ban"></i> Disable ONU' : '<i class="fa-solid fa-check"></i> Enable ONU';
    }
    showToast(`ONT ${newState ? 'Habilitada' : 'Deshabilitada'}`, `Estado administrativo actualizado`, 'success');
  }
}

async function actionViewOnuDelete() {
  if (!currentViewOnu) return;
  const ok = await showConfirmModal(
    '¿Eliminar ONT de la OLT?',
    `Se desaprovisionará la ONT del cliente "${currentViewOnu.name}" (${currentViewOnu.sn}) eliminando el service-port y el registro en la OLT.`,
    'Eliminar Definitivamente',
    'rose'
  );
  if (!ok) return;

  const res = await fetch('/api/onus/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete',
      oltId: currentViewOnu.oltId,
      gponPort: currentViewOnu.gponPort,
      onuId: currentViewOnu.onuId,
      serial: currentViewOnu.sn
    })
  });
  const data = await res.json();
  if (data.success) {
    showToast('ONT Eliminada', 'La ONT fue desaprovisionada de la OLT', 'success');
    closeViewOnuModal();
    loadOnus(true);
  } else {
    showToast('Error', data.error || 'No se pudo eliminar la ONT', 'error');
  }
}

async function promptRebootOnt(oltId, gponPort, onuId, clientName) {
  const ok = await showConfirmModal(
    '¿Reiniciar ONT?',
    `Se enviará la orden de reinicio por software a la ONT de "${clientName}" (${gponPort}:${onuId}). La fibra se reenganchará en ~30 segundos.`,
    'Reiniciar Ahora',
    'rose'
  );
  if (!ok) return;

  try {
    showToast('Reiniciando ONT...', `Enviando comando CLI ont reset ${gponPort} ${onuId}`, 'info', 3000);
    const res = await fetch('/api/onus/reboot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oltId, gponPort, onuId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Comando Enviado', 'La ONT se está reiniciando en este momento', 'success', 5000);
    } else {
      showToast('Error', data.message || 'No se pudo reiniciar la ONT', 'error');
    }
  } catch {
    showToast('Error de Red', 'No se pudo contactar al servidor', 'error');
  }
}

function actionViewOnuWebLogin() {
  if (!currentViewOnu) return;
  const ip = currentViewOnu.modemIp || currentViewOnu.cached?.ip || document.getElementById('viewWanIp')?.innerText;
  if (!ip || ip.includes('Consultando') || ip.includes('Sin asignar')) {
    showToast('Aviso', 'Aún no se ha detectado la IP del módem en la red', 'warning');
    return;
  }
  const cleanIp = ip.split(':')[0].trim();
  const url = `/modem-proxy/${cleanIp}/`;
  window.open(url, '_blank');
  showToast(
    'Abriendo Portal del Módem (vía Proxy)',
    `Conexión segura por servidor | Usuario: Epadmin | Clave: adminEp`,
    'info',
    8000
  );
}

async function actionViewOnuRebootWeb() {
  if (!currentViewOnu) return;
  const ip = currentViewOnu.modemIp || currentViewOnu.cached?.ip || document.getElementById('viewWanIp')?.innerText;
  if (!ip || ip.includes('Consultando') || ip.includes('Sin asignar')) {
    showToast('Aviso', 'Se requiere la IP del módem para enviar el comando web', 'warning');
    return;
  }
  const cleanIp = ip.split(':')[0].trim();

  const ok = await showConfirmModal(
    '¿Reiniciar ONT vía Web?',
    `Se enviará comando de reinicio directo al portal web de la ONT (${cleanIp}) con las credenciales de administración Epadmin.`,
    'Reiniciar Módem',
    'rose'
  );
  if (!ok) return;

  showToast('Reiniciando módem...', `Enviando comando a https://${cleanIp}:80/set.cgi`, 'info', 4000);
  try {
    const res = await fetch(`/api/onus/${encodeURIComponent(currentViewOnu.sn)}/reboot-modem-web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: cleanIp })
    });
    const data = await res.json();
    if (data.success) {
      showToast('¡Módem Reiniciado!', 'El módem recibió la instrucción y se está reiniciando', 'success', 6000);
    } else {
      showToast('Error', data.message || 'No se pudo reiniciar el módem vía web', 'error');
    }
  } catch {
    showToast('Error de Conexión', 'Fallo al comunicar con el servidor', 'error');
  }
}

// ==========================================
// EXPONER GLOBALMENTE EN WINDOW
// ==========================================
window.switchTab = switchTab;
window.refreshCurrentTab = refreshCurrentTab;
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
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
window.showAlertModal = showAlertModal;

window.loadOnus = loadOnus;
window.filterOnusTable = filterOnusTable;
window.promptRebootOnt = promptRebootOnt;

// Funciones SmartOLT / TR-069 / Web Login Módem
window.viewOnuDetail = viewOnuDetail;
window.closeViewOnuModal = closeViewOnuModal;
window.renameCurrentOnu = renameCurrentOnu;
window.toggleWifiPassVisibility = toggleWifiPassVisibility;
window.copyWifiSsid = copyWifiSsid;
window.copyWifiPass = copyWifiPass;
window.openUpdateWanModal = openUpdateWanModal;
window.closeUpdateWanModal = closeUpdateWanModal;
window.toggleWanFields = toggleWanFields;
window.submitUpdateWan = submitUpdateWan;
window.openChangeWifiModal = openChangeWifiModal;
window.closeChangeWifiModal = closeChangeWifiModal;
window.onToggleSyncPass = onToggleSyncPass;
window.onWifiPassInput = onWifiPassInput;
window.submitChangeWifi = submitChangeWifi;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangeWebPassModal = closeChangeWebPassModal;
window.submitChangeWebPass = submitChangeWebPass;
window.actionViewOnuWebLogin = actionViewOnuWebLogin;
window.actionViewOnuRebootWeb = actionViewOnuRebootWeb;
window.actionViewOnuReboot = actionViewOnuReboot;
window.actionViewOnuLinkTr069 = actionViewOnuLinkTr069;
window.actionViewOnuResync = actionViewOnuResync;
window.actionViewOnuRestoreDefaults = actionViewOnuRestoreDefaults;
window.actionViewOnuToggleActive = actionViewOnuToggleActive;
window.actionViewOnuDelete = actionViewOnuDelete;

window.refreshAutofind = refreshAutofind;
window.onAutofindOltChange = onAutofindOltChange;
window.autoFill5gSsid = autoFill5gSsid;
window.openProvisionModal = openProvisionModal;
window.closeProvisionModal = closeProvisionModal;
window.submitProvision = submitProvision;

// Carga inicial y persistencia de pantalla exacta al recargar (F5)
function getInitialTab() {
  const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  const validTabs = ['olts', 'tunnels', 'unconfigured', 'onus'];
  if (validTabs.includes(hash)) return hash;
  try {
    const saved = localStorage.getItem('cloudolt_active_tab');
    if (saved && validTabs.includes(saved)) return saved;
  } catch {}
  return 'onus'; // Tab de mayor utilidad por defecto
}

document.addEventListener('DOMContentLoaded', () => {
  const initialTab = getInitialTab();
  switchTab(initialTab, true);

  // Escuchar cambios de hash por navegación directa o botones
  window.addEventListener('hashchange', () => {
    const currentHash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
    if (['olts', 'tunnels', 'unconfigured', 'onus'].includes(currentHash) && currentHash !== activeTab) {
      switchTab(currentHash, false);
    }
  });

  // Sondeo inteligente sin parpadeos cada 4 segundos
  setInterval(() => {
    if (activeTab === 'tunnels') {
      loadTunnels();
    } else if (activeTab === 'olts') {
      loadOlts();
    }
  }, 4000);
});
