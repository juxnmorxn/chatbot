export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudWareMx - Panel de Control del Chatbot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: radial-gradient(circle at 20% 20%, #111827 0%, #030712 100%);
      --card-bg: rgba(17, 24, 39, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.25);
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --font-main: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg-gradient);
      color: var(--text-main);
      font-family: var(--font-main);
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 28px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--primary), var(--accent-cyan));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 20px var(--primary-glow);
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 999px;
      font-size: 13px;
      color: #34d399;
      font-weight: 500;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Navigation Tabs */
    .nav-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      background: rgba(255, 255, 255, 0.03);
      padding: 6px;
      border-radius: 14px;
      border: 1px solid var(--card-border);
      width: fit-content;
    }

    .nav-tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: var(--font-main);
    }

    .nav-tab.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 2px 10px var(--primary-glow);
    }

    .nav-tab:hover:not(.active) {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    /* Content Cards */
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      transition: border-color 0.2s ease;
    }

    .card:hover {
      border-color: var(--card-hover);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 17px;
      font-weight: 600;
    }

    .card-badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Form Inputs */
    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .input-row {
      display: flex;
      gap: 8px;
    }

    input, select, textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text-main);
      font-family: var(--font-main);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }

    input.mono {
      font-family: var(--font-mono);
      font-size: 13px;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: var(--font-main);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-primary {
      background: var(--primary);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      box-shadow: 0 4px 14px var(--primary-glow);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .btn-cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .btn-cyan:hover {
      background: rgba(6, 182, 212, 0.25);
    }

    .btn-test {
      font-size: 12px;
      padding: 6px 12px;
    }

    /* Save Floating Bar */
    .floating-bar {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(17, 24, 39, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      padding: 12px 20px;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 100;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid var(--card-border);
      color: var(--text-muted);
      font-weight: 600;
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .pill-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .pill-red { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .pill-blue { background: rgba(99, 102, 241, 0.2); color: #818cf8; }

    /* Toast */
    #toast {
      position: fixed;
      top: 24px;
      right: 24px;
      padding: 12px 20px;
      background: #10b981;
      color: #fff;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      display: none;
      z-index: 999;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo-badge">⚡</div>
        <div>
          <h1 id="headerIspName">CloudWareMx</h1>
          <p style="color: var(--text-muted); font-size: 13px;">Panel Maestro de Configuración y Gestión de APIs</p>
        </div>
      </div>
      <div class="status-pill">
        <span class="status-dot"></span>
        <span id="backendStatus">Turso DB Conectado</span>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('apis')">🔑 Conexión de APIs</button>
      <button class="nav-tab" onclick="switchTab('whatsapp')">📲 Vincular WhatsApp</button>
      <button class="nav-tab" onclick="switchTab('sessions')">👥 Sesiones en Turso</button>
      <button class="nav-tab" onclick="switchTab('logs')">📜 Historial y Problemas</button>
      <button class="nav-tab" onclick="switchTab('tester')">🧪 Simulador de Bot</button>
    </div>

    <!-- TAB 1: Configuración de APIs -->
    <div id="tab-apis" class="tab-pane active">
      <div class="grid-2">
        <!-- Evolution API Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📱 Evolution API (WhatsApp)</div>
            <span class="card-badge">Mensajería</span>
          </div>

          <div class="form-group">
            <label>URL del Servidor Evolution</label>
            <input type="text" id="evolutionUrl" placeholder="https://tu-evolution-api.com o http://localhost:8080">
          </div>

          <div class="form-group">
            <label>Súper Clave Secreta Maestra (API Key)</label>
            <div class="input-row">
              <input type="text" id="evolutionApiKey" class="mono" placeholder="MI_SUPER_CLAVE_SECRETA_2026">
              <button type="button" class="btn btn-cyan" onclick="generateSuperKey()" title="Generar una clave altamente segura">⚡ Generar Clave</button>
            </div>
            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
              Copia esta clave en tu docker-compose.yml en <code>AUTHENTICATION_API_KEY</code>.
            </small>
          </div>

          <div class="form-group">
            <label>Nombre de la Instancia</label>
            <input type="text" id="evolutionInstanceName" placeholder="isp-soporte">
          </div>
        </div>

        <!-- Groq Cloud Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🧠 Groq Cloud (Traductor IA)</div>
            <span class="card-badge">Llama 3.1 & Modelos</span>
          </div>

          <div class="form-group">
            <label>Groq API Key</label>
            <input type="password" id="groqApiKey" class="mono" placeholder="gsk_...">
          </div>

          <div class="form-group">
            <label>Modelo en Producción</label>
            <select id="groqModel">
              <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Recomendado / Alta Velocidad)</option>
              <option value="qwen/qwen3.6-27b">qwen/qwen3.6-27b</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b</option>
            </select>
          </div>

          <div style="margin-top: 14px;">
            <button type="button" class="btn btn-secondary btn-test" onclick="testService('groq')">🩺 Probar Conexión Groq</button>
          </div>
        </div>

        <!-- WispHub Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🌐 WispHub API</div>
            <span class="card-badge">Facturación y Clientes</span>
          </div>

          <div class="form-group">
            <label>URL Base de API WispHub</label>
            <input type="text" id="wisphubUrl" placeholder="https://api.wisphub.net/api">
          </div>

          <div class="form-group">
            <label>Token / API Key de WispHub</label>
            <input type="password" id="wisphubApiKey" class="mono" placeholder="Pega tu token de WispHub aquí">
          </div>

          <div style="margin-top: 14px;">
            <button type="button" class="btn btn-secondary btn-test" onclick="testService('wisphub')">🩺 Probar Conexión WispHub</button>
          </div>
        </div>

        <!-- SmartOLT Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ SmartOLT API</div>
            <span class="card-badge">Fibra y ONUs</span>
          </div>

          <div class="form-group">
            <label>URL de tu SmartOLT</label>
            <input type="text" id="smartoltUrl" placeholder="https://tu-dominio.smartolt.com/api">
          </div>

          <div class="form-group">
            <label>Token de SmartOLT (X-Token)</label>
            <input type="password" id="smartoltApiKey" class="mono" placeholder="Pega tu X-Token aquí">
          </div>

          <div style="margin-top: 14px;">
            <button type="button" class="btn btn-secondary btn-test" onclick="testService('smartolt')">🩺 Probar Conexión SmartOLT</button>
          </div>
        </div>

        <!-- ISP Info Card -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <div class="card-title">🏢 Configuración General del ISP</div>
            <span class="card-badge">Personalización</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="form-group">
              <label>Nombre Comercial del ISP</label>
              <input type="text" id="ispName" placeholder="CloudWareMx">
            </div>

            <div class="form-group">
              <label>Teléfono de Soporte Humano / Asesor</label>
              <input type="text" id="soporteHumanoPhone" placeholder="5215512345678">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Vincular WhatsApp -->
    <div id="tab-whatsapp" class="tab-pane">
      <div class="card" style="max-width: 680px; margin: 0 auto; text-align: center;">
        <div class="card-header" style="justify-content: center;">
          <div class="card-title">📲 Vinculación de WhatsApp (Evolution API)</div>
        </div>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
          Escanea este código QR desde tu aplicación de WhatsApp para conectar el bot a tu número.
        </p>

        <div id="whatsappStatusBox" style="margin-bottom: 20px;">
          <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">
            ⏳ Verificando estado...
          </div>
        </div>

        <div id="qrContainer" style="background: white; display: inline-block; padding: 16px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 24px;">
          <div style="width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 13px;">
            Generando código QR...
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 24px;">
          <button class="btn btn-secondary" onclick="loadWhatsAppStatus()">🔄 Actualizar QR</button>
          <button class="btn" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);" onclick="disconnectWhatsApp()">⚠️ Desvincular y Regenerar</button>
        </div>

        <div style="text-align: left; background: rgba(0,0,0,0.25); border-radius: 12px; padding: 16px; border: 1px solid var(--card-border);">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text-main);">📋 Instrucciones para vincular:</div>
          <ol style="margin-left: 20px; color: var(--text-muted); font-size: 13px; line-height: 1.8;">
            <li>Abre <b>WhatsApp</b> en tu teléfono celular.</li>
            <li>Entra a <b>Ajustes / Configuración</b> (o los 3 puntos en Android).</li>
            <li>Toca en <b>Dispositivos vinculados</b> y luego en <b>Vincular un dispositivo</b>.</li>
            <li>Apunta tu cámara al código QR de arriba para sincronizarlo.</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- TAB 2: Sesiones en Turso -->
    <div id="tab-sessions" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">💾 Clientes y Sesiones Persistidas en Turso DB</div>
          <button class="btn btn-secondary btn-test" onclick="loadSessions()">🔄 Recargar</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Cliente</th>
                <th>Paso / Estado</th>
                <th>ID ONU</th>
                <th>Anti-Spam</th>
                <th>Última Interacción</th>
              </tr>
            </thead>
            <tbody id="sessionsTableBody">
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Cargando sesiones desde Turso...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB: Historial y Problemas -->
    <div id="tab-logs" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 Registro de Conversaciones, Problemas y Soluciones</div>
          <button class="btn btn-secondary btn-test" onclick="loadLogs()">🔄 Actualizar Historial</button>
        </div>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
          Auditoría en tiempo real de cada mensaje entrante y saliente, intenciones clasificadas por IA, fallas detectadas y acciones tomadas en Turso DB.
        </p>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Teléfono</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Intención</th>
                <th>Mensaje</th>
                <th>Acción / Solución</th>
              </tr>
            </thead>
            <tbody id="logsTableBody">
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Cargando historial desde Turso...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: Simulador -->
    <div id="tab-tester" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">💬 Simulador de Mensaje de WhatsApp</div>
          <span class="card-badge">Pruebas en Vivo</span>
        </div>

        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
          Escribe un mensaje como si fueras un usuario de WhatsApp. El sistema consultará a Turso, enviará el texto al traductor de Groq y ejecutará el flujo de diagnóstico.
        </p>

        <div class="form-group">
          <label>Número Simulado</label>
          <input type="text" id="simPhone" value="5215512345678" style="max-width: 250px;">
        </div>

        <div class="form-group">
          <label>Mensaje del Cliente</label>
          <div class="input-row">
            <input type="text" id="simMessage" placeholder="Ej: hola tengo una luz roja en mi modem no hay internet">
            <button class="btn btn-primary" onclick="runSimulation()">Enviar Mensaje 🚀</button>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="btn btn-secondary btn-test" onclick="fillSim('tengo foco rojo en el modem')">Foco Rojo</button>
          <button class="btn btn-secondary btn-test" onclick="fillSim('cuanto debo este mes')">Consultar Saldo</button>
          <button class="btn btn-secondary btn-test" onclick="fillSim('quiero cancelar las notificaciones')">Cancelar / Baja</button>
        </div>

        <div class="form-group" style="margin-top: 20px;">
          <label>Respuesta del Servidor / Webhook</label>
          <pre id="simResponse" style="background: rgba(0,0,0,0.5); padding: 14px; border-radius: 10px; font-family: var(--font-mono); font-size: 12px; color: #a5f3fc; max-height: 250px; overflow-y: auto;">Esperando mensaje de prueba...</pre>
        </div>
      </div>
    </div>

    <!-- Floating Save Bar -->
    <div class="floating-bar">
      <span style="font-size: 13px; color: var(--text-muted);">Los cambios se guardan directamente en Turso Cloud.</span>
      <button class="btn btn-primary" onclick="saveSettings()">💾 Guardar en Turso DB</button>
    </div>
  </div>

  <div id="toast">Guardado correctamente</div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      event.target.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');

      if (tabId === 'whatsapp') {
        loadWhatsAppStatus();
      }
      if (tabId === 'sessions') {
        loadSessions();
      }
      if (tabId === 'logs') {
        loadLogs();
      }
    }

    async function loadWhatsAppStatus() {
      const statusBox = document.getElementById('whatsappStatusBox');
      const qrBox = document.getElementById('qrContainer');

      statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">⏳ Consultando estado en Evolution API...</div>';

      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();

        if (data.state === 'open') {
          statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">🟢 WhatsApp Conectado y Operativo</div>';
          qrBox.innerHTML = '<div style="width: 260px; height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #10b981; font-size: 14px; font-weight: 600;"><span style="font-size: 48px; margin-bottom: 12px;">✅</span>¡Instancia Vinculada!<br><span style="color: #6b7280; font-weight: normal; font-size: 12px; margin-top: 6px;">Listo para enviar y recibir mensajes</span></div>';
        } else {
          statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">🟡 Desconectado (Escanea el QR)</div>';
          if (data.qr) {
            qrBox.innerHTML = '<img src="' + data.qr + '" alt="QR WhatsApp" style="width: 260px; height: 260px; display: block; border-radius: 8px;">';
          } else {
            qrBox.innerHTML = '<div style="width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 13px;">No se pudo cargar el QR. Haz clic en Actualizar QR.</div>';
          }
        }
      } catch (err) {
        statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">Error al conectar con Evolution API</div>';
      }
    }

    async function disconnectWhatsApp() {
      if (!confirm('¿Estás seguro de que deseas desvincular la sesión actual de WhatsApp? Se generará un nuevo QR para volver a vincular.')) return;
      try {
        const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('Sesión desvinculada. Generando nuevo QR...');
          setTimeout(loadWhatsAppStatus, 1500);
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al desvincular: ' + err.message, true);
      }
    }

    function showToast(msg, isError = false) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.background = isError ? '#ef4444' : '#10b981';
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3500);
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          document.getElementById('evolutionUrl').value = s.evolutionUrl || '';
          document.getElementById('evolutionApiKey').value = s.evolutionApiKey || '';
          document.getElementById('evolutionInstanceName').value = s.evolutionInstanceName || '';
          document.getElementById('groqApiKey').value = s.groqApiKey || '';
          document.getElementById('groqModel').value = s.groqModel || 'openai/gpt-oss-20b';
          document.getElementById('wisphubUrl').value = s.wisphubUrl || '';
          document.getElementById('wisphubApiKey').value = s.wisphubApiKey || '';
          document.getElementById('smartoltUrl').value = s.smartoltUrl || '';
          document.getElementById('smartoltApiKey').value = s.smartoltApiKey || '';
          document.getElementById('ispName').value = s.ispName || '';
          document.getElementById('soporteHumanoPhone').value = s.soporteHumanoPhone || '';
          document.getElementById('headerIspName').innerText = s.ispName || 'CloudWareMx';
        }
      } catch (err) {
        console.error('Error cargando settings:', err);
      }
    }

    async function saveSettings() {
      const payload = {
        EVOLUTION_URL: document.getElementById('evolutionUrl').value,
        EVOLUTION_API_KEY: document.getElementById('evolutionApiKey').value,
        INSTANCE_NAME: document.getElementById('evolutionInstanceName').value,
        GROQ_API_KEY: document.getElementById('groqApiKey').value,
        GROQ_MODEL: document.getElementById('groqModel').value,
        WISPHUB_API_URL: document.getElementById('wisphubUrl').value,
        WISPHUB_API_KEY: document.getElementById('wisphubApiKey').value,
        SMARTOLT_API_URL: document.getElementById('smartoltUrl').value,
        SMARTOLT_API_KEY: document.getElementById('smartoltApiKey').value,
        ISP_NAME: document.getElementById('ispName').value,
        SOPORTE_HUMANO_PHONE: document.getElementById('soporteHumanoPhone').value,
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: payload })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ¡Configuraciones guardadas en Turso DB!');
          document.getElementById('headerIspName').innerText = payload.ISP_NAME || 'CloudWareMx';
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Fallo al conectar con el servidor', true);
      }
    }

    async function generateSuperKey() {
      try {
        const res = await fetch('/api/settings/generate-evolution-key', { method: 'POST' });
        const data = await res.json();
        if (data.success && data.masterKey) {
          document.getElementById('evolutionApiKey').value = data.masterKey;
          showToast('⚡ Súper Clave Secreta Generada con Éxito');
        }
      } catch (err) {
        showToast('Error al generar clave', true);
      }
    }

    async function testService(service) {
      showToast('Probando ' + service + '...');
      try {
        const res = await fetch('/api/test/' + service, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
        } else {
          showToast('⚠️ ' + (data.error || 'Fallo de prueba'), true);
        }
      } catch (err) {
        showToast('Error de conexión', true);
      }
    }

    async function loadSessions() {
      const tbody = document.getElementById('sessionsTableBody');
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        if (data.success && data.sessions) {
          if (data.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">No hay sesiones aún.</td></tr>';
            return;
          }

          tbody.innerHTML = data.sessions.map(s => \`
            <tr>
              <td style="font-family: var(--font-mono); font-weight: 600;">\${s.phone}</td>
              <td>\${s.client_name || '<em style="color:var(--text-muted)">Sin identificar</em>'}</td>
              <td><span class="pill pill-blue">\${s.step}</span></td>
              <td>\${s.onu_id || '-'}</td>
              <td>
                <span class="pill \${s.opt_out === 1 ? 'pill-red' : 'pill-green'}">
                  \${s.opt_out === 1 ? 'Dado de Baja' : 'Activo'}
                </span>
              </td>
              <td style="color: var(--text-muted); font-size: 12px;">\${s.last_interaction ? new Date(s.last_interaction).toLocaleString() : '-'}</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color: red; text-align:center;">Error al cargar sesiones</td></tr>';
      }
    }

    async function loadLogs() {
      const tbody = document.getElementById('logsTableBody');
      try {
        const res = await fetch('/api/logs?limit=50');
        const data = await res.json();
        if (data.success && data.logs) {
          if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px;">No hay mensajes registrados aún en Turso DB.</td></tr>';
            return;
          }

          tbody.innerHTML = data.logs.map(l => {
            const isIncoming = l.direction === 'IN';
            const badgeType = isIncoming ? '<span class="pill pill-blue">📥 Entrante</span>' : '<span class="pill pill-green">📤 Saliente</span>';
            const intentBadge = l.intent ? '<span class="pill pill-blue">' + l.intent + '</span>' : '<span style="color:var(--text-muted); font-size:12px;">-</span>';
            const actionBadge = l.action_taken ? '<span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">' + l.action_taken + '</span>' : '<span style="color:var(--text-muted); font-size:12px;">-</span>';
            const dateStr = l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
            return '<tr>' +
              '<td style="color: var(--text-muted); font-size: 12px; white-space: nowrap;">' + dateStr + '</td>' +
              '<td style="font-family: var(--font-mono); font-weight: 600;">' + l.phone + '</td>' +
              '<td>' + (l.client_name || '<em style="color:var(--text-muted)">-</em>') + '</td>' +
              '<td>' + badgeType + '</td>' +
              '<td>' + intentBadge + '</td>' +
              '<td style="max-width: 300px; word-break: break-word; font-size: 13px;">' + (l.message || '') + '</td>' +
              '<td>' + actionBadge + '</td>' +
            '</tr>';
          }).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="color: red; text-align:center;">Error al cargar historial</td></tr>';
      }
    }

    function fillSim(text) {
      document.getElementById('simMessage').value = text;
    }

    async function runSimulation() {
      const phone = document.getElementById('simPhone').value;
      const text = document.getElementById('simMessage').value;
      const out = document.getElementById('simResponse');

      if (!text) return;

      out.innerText = 'Enviando al webhook...';

      const payload = {
        event: 'messages.upsert',
        data: {
          key: { remoteJid: phone + '@s.whatsapp.net', fromMe: false, id: 'SIM_' + Date.now() },
          pushName: 'Usuario Simulado',
          message: { conversation: text }
        }
      };

      try {
        const res = await fetch('/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resJson = await res.json();
        out.innerText = 'Webhook recibido por el servidor:\\n' + JSON.stringify(resJson, null, 2) + '\\n\\nEl bot ha procesado el mensaje de forma asíncrona.';
      } catch (err) {
        out.innerText = 'Error: ' + err.message;
      }
    }

    // Inicializar
    loadSettings();
  </script>
</body>
</html>`;
}
