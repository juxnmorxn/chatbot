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
    /* Modern iOS Toggle Switch */
    .switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .slider {
      position: relative;
      width: 38px;
      height: 22px;
      background-color: rgba(239, 68, 68, 0.4);
      border: 1px solid rgba(239, 68, 68, 0.6);
      border-radius: 22px;
      transition: all 0.25s ease;
      display: inline-block;
      flex-shrink: 0;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: #f9fafb;
      border-radius: 50%;
      transition: all 0.25s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    input:checked + .slider {
      background-color: #10b981;
      border-color: #059669;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }

    input:checked + .slider:before {
      transform: translateX(16px);
      background-color: #ffffff;
    }

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
      <button class="nav-tab active" onclick="switchTab('apis', this)">🔑 Conexión y Pagos</button>
      <button class="nav-tab" onclick="switchTab('technicians', this)" style="border: 1px solid rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08); color: #a5b4fc;">👷 Técnicos y PINs</button>
      <button class="nav-tab" onclick="switchTab('audit', this)" style="border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08); color: #fca5a5;">🔍 Auditoría IPs (SmartOLT vs WispHub)</button>
      <button class="nav-tab" onclick="switchTab('ipam', this)" style="border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.08); color: #6ee7b7;">🌐 Pool de IPs y VLANs (IPAM)</button>
      <button class="nav-tab" onclick="switchTab('whatsapp', this)">📲 Vincular WhatsApp</button>
      <button class="nav-tab" onclick="switchTab('tickets', this)">🎫 Mesa de Tickets</button>
      <button class="nav-tab" onclick="switchTab('sessions', this)">👥 Sesiones en Turso</button>
      <button class="nav-tab" onclick="switchTab('logs', this)">📜 Historial y Problemas</button>
      <button class="nav-tab" onclick="switchTab('tester', this)">🧪 Simulador de Bot</button>
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
            <input type="text" id="wisphubUrl" placeholder="https://api.wisphub.io/api">
          </div>

          <div class="form-group">
            <label>Token / API Key de WispHub</label>
            <input type="password" id="wisphubApiKey" class="mono" placeholder="Pega tu token de WispHub aquí">
          </div>

          <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-test" onclick="testService('wisphub')">🩺 Probar Conexión</button>
            <button type="button" id="btnSyncWh" class="btn btn-cyan" onclick="syncWisphubAction()">🔄 Sincronizar con Turso DB</button>
          </div>

          <div id="wisphubStatsBox" style="margin-top: 12px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 12px; color: var(--text-muted); border: 1px solid rgba(255,255,255,0.06);">
            📊 <strong>Clientes en Turso:</strong> <span id="whStatsText">Consultando...</span> (Auto-sync cada 10 min)
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

          <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-test" onclick="testService('smartolt')">🩺 Probar Conexión</button>
            <button type="button" id="btnSyncOlt" class="btn btn-cyan" onclick="syncSmartOlt()">🔄 Sincronizar con Turso DB</button>
          </div>

          <div id="smartoltStatsBox" style="margin-top: 12px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 12px; color: var(--text-muted); border: 1px solid rgba(255,255,255,0.06);">
            📊 <strong>Inventario en Turso:</strong> <span id="oltStatsText">Consultando...</span>
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

        <!-- Payment & Schedule Card -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <div class="card-title">💳 Datos Bancarios y Horarios de Atención</div>
            <span class="card-badge">Cobranza y Turnos</span>
          </div>

          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
            Estos datos bancarios se enviarán automáticamente a los clientes que soliciten pagar o consulten saldo. El bot les indicará colocar su nombre como concepto y mandar captura de pantalla de su comprobante.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
            <div class="form-group">
              <label>Banco Receptor</label>
              <input type="text" id="paymentBank" placeholder="Ej: BBVA México / Banco Azteca / Santander">
            </div>

            <div class="form-group">
              <label>Número de Cuenta / CLABE Interbancaria</label>
              <input type="text" id="paymentAccount" class="mono" placeholder="Ej: 012 180 0000000000 00">
            </div>

            <div class="form-group">
              <label>Nombre del Titular / Beneficiario</label>
              <input type="text" id="paymentBeneficiary" placeholder="Ej: CloudWare Telecomunicaciones S.A.">
            </div>

            <div class="form-group">
              <label>Instrucciones Adicionales de Pago</label>
              <input type="text" id="paymentNotes" placeholder="Ej: Transferencia SPEI o depósito en tiendas OXXO">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-top: 14px; border-top: 1px solid var(--card-border);">
            <div class="form-group">
              <label>⏰ Inicio de Horario Laboral de Oficina (Turno)</label>
              <input type="time" id="workHoursStart" value="09:00">
              <small style="color: var(--text-muted); font-size: 11px;">Los reportes nocturnos o antes de esta hora se agendan para atenderse a las 9:00 AM.</small>
            </div>

            <div class="form-group">
              <label>⏰ Fin de Horario Laboral de Oficina</label>
              <input type="time" id="workHoursEnd" value="18:00">
              <small style="color: var(--text-muted); font-size: 11px;">Hora en que concluye el turno regular de atención en oficina.</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Auditoría de IPs (SmartOLT vs WispHub) -->
    <div id="tab-audit" class="tab-pane">
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <div class="card-title" style="display: flex; align-items: center; gap: 8px;">
              <span>🔍 Auditoría de Cruce de IPs (SmartOLT vs WispHub)</span>
              <span class="card-badge" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4);">Detección de Discrepancias</span>
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Comparación cruzada 100% de Solo Lectura. Compara la IP asignada en SmartOLT contra la IP registrada en WispHub para el mismo folio o cliente.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-secondary" onclick="loadAuditData(1)">🔄 Refrescar Cruce</button>
            <button class="btn btn-cyan" id="btnSyncAuditWh" onclick="syncWisphubAction()">📥 Sincronizar WispHub</button>
          </div>
        </div>

        <!-- Banner Modo Solo Lectura -->
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; padding: 10px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 13px;">
          <span style="font-size: 18px;">🛡️</span>
          <span><strong>Modo 100% Seguro (Solo Lectura):</strong> Este módulo jamás altera nombres ni IPs en SmartOLT ni en WispHub. Toda la auditoría se procesa localmente en las tablas <code>smartolt_onus</code> y <code>wisphub_clients</code> de Turso DB.</span>
        </div>

        <!-- KPI Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div class="stat-card" style="border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.2); cursor: pointer;" onclick="setAuditFilter('mismatches')">
            <div style="font-size: 11px; color: #fca5a5; font-weight: 600; text-transform: uppercase;">🔴 Discrepancias de IP</div>
            <div id="statMismatches" style="font-size: 28px; font-weight: 700; color: #f87171; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Mismo cliente, distinta IP</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.2); cursor: pointer;" onclick="setAuditFilter('matches')">
            <div style="font-size: 11px; color: #6ee7b7; font-weight: 600; text-transform: uppercase;">🟢 IPs Coincidentes</div>
            <div id="statMatches" style="font-size: 28px; font-weight: 700; color: #34d399; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">IP SmartOLT = IP WispHub</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #06b6d4; background: rgba(6, 182, 212, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(6,182,212,0.2);">
            <div style="font-size: 11px; color: #67e8f9; font-weight: 600; text-transform: uppercase;">📡 ONUs en SmartOLT</div>
            <div id="statTotalOlt" style="font-size: 28px; font-weight: 700; color: #22d3ee; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Total en base de datos</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #818cf8; background: rgba(99, 102, 241, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.2);">
            <div style="font-size: 11px; color: #a5b4fc; font-weight: 600; text-transform: uppercase;">🏢 Clientes WispHub</div>
            <div id="statTotalWh" style="font-size: 28px; font-weight: 700; color: #818cf8; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Total en base de datos</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(245,158,11,0.2); cursor: pointer;" onclick="setAuditFilter('no_ip')">
            <div style="font-size: 11px; color: #fcd34d; font-weight: 600; text-transform: uppercase;">⚠️ Sin IP Registrada</div>
            <div id="statNoIp" style="font-size: 28px; font-weight: 700; color: #fbbf24; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Falta IP en un sistema</div>
          </div>
        </div>

        <!-- Filter Controls & Search -->
        <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 16px; background: rgba(0,0,0,0.25); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--card-border);">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="auditFilterButtons">
            <button class="btn btn-secondary btn-test" id="filterBtn-all" onclick="setAuditFilter('all')">📋 Todos</button>
            <button class="btn btn-secondary btn-test" id="filterBtn-mismatches" style="color: #f87171; border-color: rgba(239,68,68,0.4);" onclick="setAuditFilter('mismatches')">🔴 Solo Discrepancias (Alertas)</button>
            <button class="btn btn-secondary btn-test" id="filterBtn-matches" style="color: #34d399;" onclick="setAuditFilter('matches')">🟢 IPs Coincidentes</button>
            <button class="btn btn-secondary btn-test" id="filterBtn-only_olt" onclick="setAuditFilter('only_olt')">📡 Solo SmartOLT</button>
            <button class="btn btn-secondary btn-test" id="filterBtn-only_wisphub" onclick="setAuditFilter('only_wisphub')">🏢 Solo WispHub</button>
          </div>

          <div style="display: flex; gap: 8px; min-width: 280px; flex: 1; max-width: 400px;">
            <input type="text" id="auditSearchInput" placeholder="🔍 Buscar por folio, cliente, IP o serie..." oninput="onAuditSearchChange()" style="padding: 8px 12px; font-size: 13px;">
          </div>
        </div>

        <!-- Table Container -->
        <div class="table-container" style="border: 1px solid var(--card-border); border-radius: 10px; background: rgba(0,0,0,0.2);">
          <table>
            <thead>
              <tr style="background: rgba(255,255,255,0.02);">
                <th style="width: 80px;">Folio</th>
                <th>Cliente / Servicio</th>
                <th style="color: #60a5fa;">🌐 IP WispHub</th>
                <th style="color: #22d3ee;">⚡ IP SmartOLT</th>
                <th>Estatus Cruce</th>
                <th>Estado WispHub</th>
                <th>Zona / Router</th>
                <th>Serie ONU</th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                  ⏳ Cargando datos de auditoría...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 13px; color: var(--text-muted);" id="auditPaginationInfo">
            Mostrando 0 registros
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-test" id="btnAuditPrev" onclick="changeAuditPage(-1)">◀ Anterior</button>
            <span id="auditPageIndicator" style="display: inline-flex; align-items: center; font-size: 13px; padding: 0 10px; font-family: var(--font-mono);">Pág 1 / 1</span>
            <button class="btn btn-secondary btn-test" id="btnAuditNext" onclick="changeAuditPage(1)">Siguiente ▶</button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: IPAM & VLANs Pool -->
    <div id="tab-ipam" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🌐 Gestión de Direcciones IP y VLANs (IPAM)</div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Monitoreo y cálculo en tiempo real de IPs disponibles para aprovisionamiento de módems en SmartOLT y WispHub.
            </p>
          </div>
          <button class="btn btn-secondary btn-test" onclick="loadIpamData()" style="color: #6ee7b7; border-color: rgba(16,185,129,0.4);">
            🔄 Actualizar IPAM
          </button>
        </div>

        <!-- Global IPAM Stat Cards -->
        <div class="stat-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div class="stat-card" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.2);">
            <div style="font-size: 11px; color: #6ee7b7; font-weight: 600; text-transform: uppercase;">🟢 IPs Disponibles</div>
            <div id="statIpamAvailable" style="font-size: 28px; font-weight: 700; color: #34d399; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">Listas para asignar</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #6366f1; background: rgba(99, 102, 241, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.2);">
            <div style="font-size: 11px; color: #a5b4fc; font-weight: 600; text-transform: uppercase;">📡 IPs Ocupadas</div>
            <div id="statIpamUsed" style="font-size: 28px; font-weight: 700; color: #818cf8; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">SmartOLT / WispHub</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #06b6d4; background: rgba(6, 182, 212, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(6,182,212,0.2);">
            <div style="font-size: 11px; color: #67e8f9; font-weight: 600; text-transform: uppercase;">📊 Capacidad Total</div>
            <div id="statIpamTotal" style="font-size: 28px; font-weight: 700; color: #22d3ee; margin: 4px 0;">-</div>
            <div style="font-size: 11px; color: var(--text-muted);">12 Subredes /24</div>
          </div>

          <div class="stat-card" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 14px; border-radius: 10px; border: 1px solid rgba(245,158,11,0.2);">
            <div style="font-size: 11px; color: #fcd34d; font-weight: 600; text-transform: uppercase;">📈 Ocupación Global</div>
            <div id="statIpamPercent" style="font-size: 28px; font-weight: 700; color: #fbbf24; margin: 4px 0;">-%</div>
            <div style="font-size: 11px; color: var(--text-muted);">Promedio de red</div>
          </div>
        </div>

        <!-- Section: VLAN Pools Breakdown -->
        <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
          <span>⚡ Subredes y Capacidad por VLAN</span>
        </h3>
        <div id="ipamPoolsContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 24px;">
          <div style="color: var(--text-muted); font-size: 13px;">⏳ Cargando subredes...</div>
        </div>

        <!-- Section: Available IPs Explorer -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <h3 style="font-size: 16px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
            <span>🔍 Explorador de IPs Disponibles</span>
          </h3>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <select id="ipamVlanSelect" onchange="filterIpamAvailable()" style="background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--card-border); border-radius: 8px; padding: 6px 12px; font-size: 13px;">
              <option value="">Todas las VLANs</option>
              <option value="510">VLAN 510 (172.19.1.0/24 - Actopan)</option>
              <option value="520">VLAN 520 (172.19.2.0/24 - Actopan)</option>
              <option value="530">VLAN 530 (172.19.3.0/24 - Actopan)</option>
              <option value="540">VLAN 540 (172.19.4.0/24 - Actopan)</option>
              <option value="550">VLAN 550 (172.19.5.0/24 - Actopan)</option>
              <option value="560">VLAN 560 (172.19.6.0/24 - Actopan)</option>
              <option value="570">VLAN 570 (172.19.7.0/24 - Actopan)</option>
              <option value="580">VLAN 580 (172.19.8.0/24 - Actopan)</option>
              <option value="590">VLAN 590 (172.19.9.0/24 - Actopan)</option>
              <option value="600">VLAN 600 (172.19.10.0/24 - Actopan)</option>
              <option value="610">VLAN 610 (172.19.11.0/24 - Actopan)</option>
              <option value="800">VLAN 800 (172.16.80.0/24 - San Agustín)</option>
            </select>

            <input type="text" id="ipamSearchInput" placeholder="Buscar IP (ej: 172.19.1.20)..." oninput="filterIpamAvailable()" style="background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--card-border); border-radius: 8px; padding: 6px 12px; font-size: 13px; min-width: 180px;">
          </div>
        </div>

        <div class="table-container" style="border: 1px solid var(--card-border); border-radius: 10px; background: rgba(0,0,0,0.2); max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr style="background: rgba(255,255,255,0.02); position: sticky; top: 0; backdrop-filter: blur(10px); z-index: 2;">
                <th style="width: 50px;">#</th>
                <th style="color: #34d399;">🌐 Dirección IP Libre</th>
                <th>VLAN</th>
                <th>Gateway</th>
                <th>Segmento</th>
                <th>OLT Destino</th>
                <th>Estado</th>
                <th style="text-align: right;">Acción</th>
              </tr>
            </thead>
            <tbody id="ipamTableBody">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                  ⏳ Cargando listado de IPs disponibles...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="ipamCountInfo" style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">
          Mostrando 0 IPs libres
        </div>

        <!-- Section: Unconfigured ONUs in SmartOLT -->
        <div style="margin-top: 28px; border-top: 1px solid var(--card-border); padding-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h3 style="font-size: 16px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span>📡 ONUs Sin Configurar en SmartOLT (Auto-Activación)</span>
              </h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Módems detectados en las OLTs listos para ser activados por los técnicos vía WhatsApp usando los <strong>últimos 6 dígitos del SN</strong>.
              </p>
            </div>
            <button class="btn btn-secondary btn-test" onclick="loadUnconfiguredOnus()" style="font-size: 12px;">
              🔄 Refrescar ONUs
            </button>
          </div>

          <div class="table-container" style="border: 1px solid var(--card-border); border-radius: 10px; background: rgba(0,0,0,0.2);">
            <table>
              <thead>
                <tr style="background: rgba(255,255,255,0.02);">
                  <th>Serie Completo</th>
                  <th style="color: #38bdf8;">Últimos 6 Dígitos</th>
                  <th>OLT</th>
                  <th>Tarjeta / PON</th>
                  <th>Modelo</th>
                  <th>Potencia RX (1490)</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody id="unconfiguredTableBody">
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                    Haz clic en "Refrescar ONUs" o cambia de pestaña para consultar SmartOLT en vivo.
                  </td>
                </tr>
              </tbody>
            </table>
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

    <!-- TAB: Mesa de Tickets -->
    <div id="tab-tickets" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎫 Mesa de Tickets y Reportes Técnicos</div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Reportes generados por el bot tras realizar las comprobaciones automáticas con el cliente. Permite al personal aplicar ajustes manuales en SmartOLT y dar seguimiento.
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <select id="ticketFilterStatus" onchange="loadTickets()" style="background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--card-border); border-radius: 8px; padding: 6px 12px; font-size: 13px;">
              <option value="TODOS">Todos los Estados</option>
              <option value="ABIERTO" selected>Solo Abiertos / Pendientes</option>
              <option value="EN_PROCESO">En Proceso</option>
              <option value="RESUELTO">Resueltos</option>
            </select>
            <button class="btn btn-secondary btn-test" onclick="loadTickets()">🔄 Recargar</button>
            <button class="btn btn-test" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="clearAllTicketsAction()" title="Vaciar todos los tickets generados en pruebas">🗑️ Vaciar Tickets</button>
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 12px; padding: 14px;">
            <div style="color: var(--text-muted); font-size: 12px; font-weight: 500;">Total Histórico</div>
            <div id="statTotalTickets" style="font-size: 24px; font-weight: 700; color: #fff; margin-top: 4px;">0</div>
          </div>
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 14px;">
            <div style="color: #f87171; font-size: 12px; font-weight: 500;">Abiertos / Por Atender</div>
            <div id="statAbiertosTickets" style="font-size: 24px; font-weight: 700; color: #ef4444; margin-top: 4px;">0</div>
          </div>
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; padding: 14px;">
            <div style="color: #fbbf24; font-size: 12px; font-weight: 500;">⏰ Fuera de Horario (Noche/Madrugada)</div>
            <div id="statFueraHorarioTickets" style="font-size: 24px; font-weight: 700; color: #f59e0b; margin-top: 4px;">0</div>
          </div>
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 14px;">
            <div style="color: #34d399; font-size: 12px; font-weight: 500;">Resueltos</div>
            <div id="statResueltosTickets" style="font-size: 24px; font-weight: 700; color: #10b981; margin-top: 4px;">0</div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha / Hora</th>
                <th>Teléfono</th>
                <th>Cliente / ONU</th>
                <th>Problema Reportado</th>
                <th>Comprobaciones</th>
                <th>Estado</th>
                <th>Acción / Notas</th>
              </tr>
            </thead>
            <tbody id="ticketsTableBody">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Cargando tickets desde Turso DB...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: Sesiones en Turso -->
    <div id="tab-sessions" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <div class="card-title">💾 Clientes y Sesiones Persistidas en Turso DB</div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-test" onclick="loadSessions()">🔄 Recargar</button>
            <button class="btn btn-test" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="clearAllSessionsAction()" title="Borrar todas las sesiones de clientes para iniciar limpio">🗑️ Vaciar Todas las Sesiones</button>
          </div>
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
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="sessionsTableBody">
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Cargando sesiones desde Turso...</td>
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
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-test" onclick="loadLogs()">🔄 Actualizar Historial</button>
            <button class="btn btn-test" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="clearAllLogsAction()" title="Vaciar todo el registro de mensajes de prueba">🗑️ Vaciar Historial</button>
          </div>
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

    <!-- TAB TÉCNICOS AUTORIZADOS Y PINS -->
    <div id="tab-technicians" class="tab-pane">
      <!-- KPI Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; color: #a5b4fc; text-transform: uppercase; font-weight: 600;">👷 Técnicos Registrados</div>
          <div id="statTotalTechs" style="font-size: 28px; font-weight: 700; color: #f9fafb; margin-top: 4px;">0</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Guardados en Turso DB</div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; color: #6ee7b7; text-transform: uppercase; font-weight: 600;">🟢 Técnicos Activos</div>
          <div id="statActiveTechs" style="font-size: 28px; font-weight: 700; color: #34d399; margin-top: 4px;">0</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Con permisos de activación y planes</div>
        </div>

        <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 16px;">
          <div style="font-size: 12px; color: #67e8f9; text-transform: uppercase; font-weight: 600;">🔐 Seguridad y PIN</div>
          <div style="font-size: 16px; font-weight: 700; color: #e0f2fe; margin-top: 6px;">PIN Personal (5 Dígitos)</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Validación automática por WhatsApp</div>
        </div>
      </div>

      <!-- Main Card -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
          <div>
            <div class="card-title">👷 Lista de Técnicos Autorizados para WhatsApp</div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              Solo los números y PINs registrados en esta lista pueden ejecutar comandos de activación en SmartOLT y cambios de paquetes.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-primary" onclick="openTechnicianModal()">➕ Registrar Nuevo Técnico</button>
            <button type="button" class="btn btn-secondary btn-test" onclick="loadTechnicians()">🔄 Refrescar</button>
          </div>
        </div>

        <!-- Guía rápida de Comandos -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; margin-bottom: 20px;">
          <div style="font-weight: 600; font-size: 13px; color: #38bdf8; margin-bottom: 6px;">💡 Comandos habilitados para los técnicos autorizados en WhatsApp:</div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
            • <strong>Activación en un solo mensaje:</strong> <code style="color: #67e8f9; font-family: var(--font-mono);">activar cliente [SN] [Folio-Nombre] [Plan] [Zona]</code><br>
            • <strong>Cambio de Paquete en tiempo real:</strong> <code style="color: #67e8f9; font-family: var(--font-mono);">cambiar plan [Folio o SN] a [Nuevo Paquete]</code> <em>(ej: cambiar plan 3000 a 600 megas)</em>
          </div>
        </div>

        <!-- Tabla de Técnicos -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del Técnico</th>
                <th>Teléfono WhatsApp</th>
                <th>PIN (5 Dígitos)</th>
                <th>Estatus</th>
                <th>Rol / Permisos</th>
                <th>Fecha de Alta</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody id="techniciansTableBody">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">⏳ Cargando técnicos desde Turso DB...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL REGISTRO / EDICIÓN DE TÉCNICO -->
    <div id="technicianModal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: #111827; border: 1px solid var(--card-border); border-radius: 16px; width: 100%; max-width: 520px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <h3 id="modalTechTitle" style="font-size: 18px; font-weight: 700; color: #f9fafb;">➕ Registrar Técnico Autorizado</h3>
          <button type="button" onclick="closeTechnicianModal()" style="background: transparent; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer;">✕</button>
        </div>

        <form id="techForm" onsubmit="event.preventDefault(); saveTechnician();">
          <input type="hidden" id="techId" value="">

          <div class="form-group">
            <label>Nombre Completo del Técnico *</label>
            <input type="text" id="techName" placeholder="Ej: Juan Pérez / Técnico Zona 1" required>
          </div>

          <div class="form-group">
            <label>Número de WhatsApp (con lada o 10 dígitos) *</label>
            <input type="text" id="techPhone" class="mono" placeholder="Ej: 7721155543 o 5217721155543" required>
            <small style="color: var(--text-muted); font-size: 11px;">El bot identificará automáticamente los mensajes provenientes de este número.</small>
          </div>

          <div class="form-group">
            <label>PIN Personal de 5 Dígitos *</label>
            <div class="input-row">
              <input type="text" id="techPin" class="mono" maxlength="5" placeholder="12345" required style="font-size: 16px; letter-spacing: 2px; font-weight: 700;">
              <button type="button" class="btn btn-cyan" onclick="generateRandomPin()" title="Generar PIN aleatorio">🎲 Generar PIN</button>
            </div>
            <small style="color: var(--text-muted); font-size: 11px;">PIN exclusivo de 5 dígitos numéricos asignado a este técnico.</small>
          </div>

          <div class="form-group">
            <label>Estado en el Sistema</label>
            <select id="techActive">
              <option value="1">🟢 Activo (Autorizado para activar y cambiar planes)</option>
              <option value="0">🔴 Inactivo (Acceso suspendido)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notas / Zona Asignada (Opcional)</label>
            <input type="text" id="techNotes" placeholder="Ej: Técnico de campo Actopan / San Agustín">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button type="button" class="btn btn-secondary" onclick="closeTechnicianModal()">Cancelar</button>
            <button type="submit" id="btnSaveTech" class="btn btn-primary">💾 Guardar en Turso DB</button>
          </div>
        </form>
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
    function switchTab(tabId, el) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      const pane = document.getElementById('tab-' + tabId);
      if (pane) pane.classList.add('active');

      if (el) {
        el.classList.add('active');
      } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
      } else {
        document.querySelectorAll('.nav-tab').forEach(btn => {
          if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("switchTab('" + tabId + "'")) {
            btn.classList.add('active');
          }
        });
      }

      try {
        if (tabId === 'technicians') {
          loadTechnicians();
        }
        if (tabId === 'audit') {
          loadAuditData(1);
          loadWisphubStats();
        }
        if (tabId === 'ipam') {
          loadIpamData();
        }
        if (tabId === 'whatsapp') loadWhatsAppStatus();
        if (tabId === 'tickets') loadTickets();
        if (tabId === 'sessions') loadSessions();
        if (tabId === 'logs') loadLogs();
      } catch (e) {
        console.error('Error al cambiar pestaña:', e);
      }
    }

    function showToast(msg, isError = false) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.innerText = msg;
      t.style.background = isError ? '#ef4444' : '#10b981';
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3500);
    }

    async function loadWhatsAppStatus() {
      const statusBox = document.getElementById('whatsappStatusBox');
      const qrBox = document.getElementById('qrContainer');
      if (!statusBox || !qrBox) return;

      statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">⏳ Consultando estado en Evolution API...</div>';

      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();

        if (data.state === 'open') {
          statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">🟢 WhatsApp Conectado y Operativo</div>';
          qrBox.innerHTML = '<div style="width: 260px; height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #10b981; font-size: 14px; font-weight: 600;"><span style="font-size: 48px; margin-bottom: 12px;">✅</span>¡Instancia Vinculada!<br><span style="color: #6b7280; font-weight: normal; font-size: 12px; margin-top: 6px;">Listo para enviar y recibir mensajes</span></div>';
        } else {
          statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">🔴 Desconectado (Escanea el QR)</div>';
          if (data.qr) {
            qrBox.innerHTML = '<img src="' + data.qr + '" style="width: 260px; height: 260px; border-radius: 8px;" alt="QR Code">';
          } else {
            qrBox.innerHTML = '<div style="width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 13px;">No se pudo cargar el QR. Haz clic en Actualizar QR.</div>';
          }
        }
      } catch (err) {
        statusBox.innerHTML = '<div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">Error al conectar con Evolution API</div>';
      }
    }

    async function disconnectWhatsApp() {
      if (!confirm("¿Estás seguro de que deseas desvincular la sesión actual de WhatsApp? Se generará un nuevo QR para volver a vincular.")) return;
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

    async function loadTickets() {
      const tbody = document.getElementById('ticketsTableBody');
      const filter = document.getElementById('ticketFilterStatus')?.value || 'TODOS';
      try {
        const [resTickets, resStats] = await Promise.all([
          fetch('/api/tickets?status=' + encodeURIComponent(filter)),
          fetch('/api/tickets/stats')
        ]);
        const dataTickets = await resTickets.json();
        const dataStats = await resStats.json();

        if (dataStats.success && dataStats.stats) {
          const st = dataStats.stats;
          document.getElementById('statTotalTickets').innerText = st.total || 0;
          document.getElementById('statAbiertosTickets').innerText = st.abiertos || 0;
          document.getElementById('statFueraHorarioTickets').innerText = st.fueraHorario || 0;
          document.getElementById('statResueltosTickets').innerText = st.resueltos || 0;
        }

        if (dataTickets.success && dataTickets.tickets) {
          if (dataTickets.tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted);">No hay tickets registrados con el filtro actual.</td></tr>';
            return;
          }

          tbody.innerHTML = dataTickets.tickets.map(t => {
            const dateStr = t.created_at ? new Date(t.created_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
            
            let statusBadge = '<span class="pill pill-red">🔴 Abierto</span>';
            if (t.status === 'EN_PROCESO') statusBadge = '<span class="pill pill-amber">🟡 En Proceso</span>';
            if (t.status === 'RESUELTO') statusBadge = '<span class="pill pill-green">🟢 Resuelto</span>';

            const outBadge = t.is_out_of_hours === 1 ? ' <span class="pill pill-amber" title="Reportado fuera de horario">⏰ 9:00 AM</span>' : '';

            let checksBadges = '';
            if (t.has_photo === 1) checksBadges += '<span class="pill pill-blue" style="margin-right:4px;">📸 Foto Módem</span>';
            if (t.has_speedtest === 1) checksBadges += '<span class="pill pill-purple" style="margin-right:4px;">🚀 Speedtest</span>';
            if (t.all_devices === 1) checksBadges += '<span class="pill pill-amber">📶 Multidispositivo</span>';
            if (!checksBadges) checksBadges = '<span style="color:var(--text-muted); font-size:11px;">Módem/Luces revisados</span>';

            const clientText = t.client_name ? '<b>' + t.client_name + '</b>' : '<em style="color:var(--text-muted);">No identificado</em>';
            const onuText = t.onu_id ? '<br><small style="font-family:var(--font-mono); color:var(--text-muted);">' + t.onu_id + '</small>' : '';
            const notesHtml = t.notes ? '<div style="margin-top: 6px; font-size: 11px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 5px 8px; color: #7dd3fc; max-width: 260px; word-break: break-word; white-space: normal;">' + t.notes + '</div>' : '';

            const isPaused = t.bot_paused && t.bot_paused.pausado;
            const pauseBadge = isPaused
              ? '<br><span class="pill pill-purple" style="font-size:10px; margin-top:4px; display:inline-block;">⏸️ Humano (' + t.bot_paused.minutosRestantes + 'm)</span> <a href="javascript:void(0)" onclick="toggleBotPauseAction(&quot;' + t.phone + '&quot;, false)" style="color:#34d399; font-size:11px; margin-left:2px;">▶️ Reactivar</a>'
              : '<br><a href="javascript:void(0)" onclick="toggleBotPauseAction(&quot;' + t.phone + '&quot;, true)" style="color:var(--text-muted); font-size:11px; display:inline-block; margin-top:3px;">⏸️ Pausar Bot</a>';

            return '<tr>' +
              '<td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">' + t.folio + '</td>' +
              '<td style="color: var(--text-muted); font-size: 12px; white-space: nowrap;">' + dateStr + outBadge + '</td>' +
              '<td style="font-family: var(--font-mono); font-weight: 600;">' + t.phone + pauseBadge + '</td>' +
              '<td>' + clientText + onuText + '</td>' +
              '<td style="max-width: 250px; font-size: 13px; word-break: break-word;">' + (t.issue_summary || '') + '</td>' +
              '<td style="font-size: 11px;">' + checksBadges + '</td>' +
              '<td>' + statusBadge + '</td>' +
              '<td>' +
                '<select onchange="updateTicketStatusAction(&quot;' + t.folio + '&quot;, this.value)" style="background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--card-border); border-radius: 6px; padding: 4px 8px; font-size: 12px;">' +
                  '<option value="" disabled selected>Cambiar Estado...</option>' +
                  '<option value="ABIERTO">🔴 Marcar Abierto</option>' +
                  '<option value="EN_PROCESO">🟡 En Atención / Ajuste OLT</option>' +
                  '<option value="RESUELTO">🟢 Marcar Resuelto</option>' +
                '</select>' +
                notesHtml +
              '</td>' +
            '</tr>';
          }).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="color: red; text-align:center;">Error al cargar tickets desde Turso</td></tr>';
      }
    }

    async function updateTicketStatusAction(folio, status) {
      if (!status) return;
      try {
        const res = await fetch('/api/tickets/' + folio + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Ticket ' + folio + ' actualizado');
          loadTickets();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al actualizar ticket', true);
      }
    }

    async function toggleBotPauseAction(phone, pause) {
      try {
        const res = await fetch('/api/sessions/' + phone + '/toggle-pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pause: pause, minutes: 60 })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          loadTickets();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al modificar estado del bot', true);
      }
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
          document.getElementById('paymentBank').value = s.paymentBank || '';
          document.getElementById('paymentAccount').value = s.paymentAccount || '';
          document.getElementById('paymentBeneficiary').value = s.paymentBeneficiary || '';
          document.getElementById('paymentNotes').value = s.paymentNotes || '';
          document.getElementById('workHoursStart').value = s.workHoursStart || '09:00';
          document.getElementById('workHoursEnd').value = s.workHoursEnd || '18:00';
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
        PAYMENT_BANK: document.getElementById('paymentBank').value,
        PAYMENT_ACCOUNT: document.getElementById('paymentAccount').value,
        PAYMENT_BENEFICIARY: document.getElementById('paymentBeneficiary').value,
        PAYMENT_NOTES: document.getElementById('paymentNotes').value,
        WORK_HOURS_START: document.getElementById('workHoursStart').value,
        WORK_HOURS_END: document.getElementById('workHoursEnd').value,
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No hay sesiones activas. La base de datos está limpia.</td></tr>';
            return;
          }

          tbody.innerHTML = data.sessions.map(s => {
            const clientText = s.client_name ? s.client_name : '<em style="color:var(--text-muted)">Sin identificar</em>';
            const optOutBadge = s.opt_out === 1 ? '<span class="pill pill-red">Dado de Baja</span>' : '<span class="pill pill-green">Activo</span>';
            const dateStr = s.last_interaction ? new Date(s.last_interaction).toLocaleString('es-MX') : '-';
            const deleteBtn = '<button class="btn btn-test" style="background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); padding: 3px 8px; font-size: 11px;" onclick="deleteSessionAction(&quot;' + s.phone + '&quot;)">🗑️ Borrar</button>';
            return '<tr>' +
              '<td style="font-family: var(--font-mono); font-weight: 600;">' + s.phone + '</td>' +
              '<td>' + clientText + '</td>' +
              '<td><span class="pill pill-blue">' + (s.step || '-') + '</span></td>' +
              '<td>' + (s.onu_id || '-') + '</td>' +
              '<td>' + optOutBadge + '</td>' +
              '<td style="color: var(--text-muted); font-size: 12px;">' + dateStr + '</td>' +
              '<td>' + deleteBtn + '</td>' +
            '</tr>';
          }).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="color: red; text-align:center;">Error al cargar sesiones</td></tr>';
      }
    }

    async function clearAllSessionsAction() {
      if (!confirm('¿Estás seguro de que deseas vaciar todas las sesiones de clientes en Turso? Los usuarios empezarán desde cero en su próximo mensaje.')) return;
      try {
        const res = await fetch('/api/sessions/clear-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
          loadSessions();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al vaciar sesiones', true);
      }
    }

    async function deleteSessionAction(phone) {
      if (!confirm('¿Eliminar la sesión del número ' + phone + '?')) return;
      try {
        const res = await fetch('/api/sessions/' + encodeURIComponent(phone), { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
          loadSessions();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al eliminar sesión', true);
      }
    }

    async function clearAllLogsAction() {
      if (!confirm('¿Estás seguro de que deseas vaciar todo el historial de mensajes de prueba de Turso DB?')) return;
      try {
        const res = await fetch('/api/logs/clear-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
          loadLogs();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al vaciar historial', true);
      }
    }

    async function clearAllTicketsAction() {
      if (!confirm('¿Estás seguro de que deseas vaciar todos los tickets de prueba registrados?')) return;
      try {
        const res = await fetch('/api/tickets/clear-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
          loadTickets();
        } else {
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al vaciar tickets', true);
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

    async function loadSmartOltStats() {
      const el = document.getElementById('oltStatsText');
      if (!el) return;
      try {
        const res = await fetch('/api/smartolt/stats');
        const data = await res.json();
        if (data.success && data.stats) {
          const count = data.stats.count || 0;
          const last = data.stats.lastSync ? new Date(data.stats.lastSync).toLocaleString('es-MX') : 'Nunca';
          el.innerHTML = '<strong style="color:var(--cyan);">' + count + ' ONUs registradas</strong> (Último sync: ' + last + ')';
        } else {
          el.innerText = 'Sin registros sincronizados aún.';
        }
      } catch (e) {
        el.innerText = 'No se pudo obtener el estado.';
      }
    }

    async function syncSmartOlt() {
      const btn = document.getElementById('btnSyncOlt');
      const el = document.getElementById('oltStatsText');
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Sincronizando...';
      }
      if (el) el.innerText = 'Descargando ONUs desde SmartOLT...';

      try {
        const res = await fetch('/api/smartolt/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ' + data.message);
        } else {
          alert('⚠️ ' + data.message);
        }
        await loadSmartOltStats();
      } catch (err) {
        alert('❌ Error al conectar con el servidor: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = '🔄 Sincronizar con Turso DB';
        }
      }
    }

    // ==========================================
    // MÓDULO DE AUDITORÍA DE CRUCE DE IPS
    // ==========================================
    let currentAuditPage = 1;
    let currentAuditFilter = 'all';
    let currentAuditSearch = '';
    let auditSearchDebounce = null;
    let totalAuditPages = 1;

    function setAuditFilter(filterType) {
      currentAuditFilter = filterType;
      document.querySelectorAll('#auditFilterButtons button').forEach(b => {
        b.style.borderColor = '';
        b.style.boxShadow = '';
      });
      const activeBtn = document.getElementById('filterBtn-' + filterType);
      if (activeBtn) {
        activeBtn.style.borderColor = 'var(--primary)';
        activeBtn.style.boxShadow = '0 0 0 2px var(--primary-glow)';
      }
      loadAuditData(1);
    }

    function onAuditSearchChange() {
      clearTimeout(auditSearchDebounce);
      auditSearchDebounce = setTimeout(() => {
        currentAuditSearch = (document.getElementById('auditSearchInput').value || '').trim();
        loadAuditData(1);
      }, 300);
    }

    function changeAuditPage(delta) {
      const target = currentAuditPage + delta;
      if (target >= 1 && target <= totalAuditPages) {
        loadAuditData(target);
      }
    }

    async function loadAuditData(page = 1) {
      currentAuditPage = page;
      const tbody = document.getElementById('auditTableBody');
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">⏳ Consultando cruce de IPs en Turso DB...</td></tr>';

      try {
        const queryParams = new URLSearchParams({
          filter: currentAuditFilter,
          search: currentAuditSearch,
          page: String(currentAuditPage),
          limit: '50',
        });

        const res = await fetch('/api/audit/ip-cross?' + queryParams.toString());
        const data = await res.json();

        if (!data.success) {
          tbody.innerHTML = '<tr><td colspan="8" style="color: #f87171; text-align: center; padding: 24px;">❌ Error: ' + (data.error || 'No se pudo cargar la auditoría') + '</td></tr>';
          return;
        }

        // Actualizar contadores KPI
        if (data.summary) {
          document.getElementById('statMismatches').innerText = data.summary.mismatches || 0;
          document.getElementById('statMatches').innerText = data.summary.matches || 0;
          document.getElementById('statTotalOlt').innerText = data.summary.totalSmartOlt || 0;
          document.getElementById('statTotalWh').innerText = data.summary.totalWisphub || 0;
          document.getElementById('statNoIp').innerText = data.summary.noIp || 0;
        }

        totalAuditPages = data.totalPages || 1;
        document.getElementById('auditPageIndicator').innerText = 'Pág ' + data.page + ' / ' + totalAuditPages;
        document.getElementById('auditPaginationInfo').innerText = 'Mostrando ' + data.items.length + ' de ' + data.total + ' registros (Filtro: ' + currentAuditFilter + ')';
        document.getElementById('btnAuditPrev').disabled = currentAuditPage <= 1;
        document.getElementById('btnAuditNext').disabled = currentAuditPage >= totalAuditPages;

        if (!data.items || data.items.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No se encontraron registros con los criterios actuales.</td></tr>';
          return;
        }

        tbody.innerHTML = data.items.map(item => {
          let statusBadge = '';
          let rowBg = '';
          if (item.ip_status === 'MISMATCH') {
            statusBadge = '<span class="pill pill-red" style="font-weight: 700; font-size: 11px;">🔴 IP DIFERENTE</span>';
            rowBg = 'background: rgba(239, 68, 68, 0.05);';
          } else if (item.ip_status === 'MATCH') {
            statusBadge = '<span class="pill pill-green">🟢 IP COINCIDE</span>';
          } else if (item.ip_status === 'NO_IP') {
            statusBadge = '<span class="pill pill-amber">⚠️ SIN IP</span>';
          } else if (item.ip_status === 'ONLY_SMARTOLT') {
            statusBadge = '<span class="pill pill-blue">📡 SOLO EN SMARTOLT</span>';
          } else if (item.ip_status === 'ONLY_WISPHUB') {
            statusBadge = '<span class="pill pill-purple">🏢 SOLO EN WISPHUB</span>';
          }

          const whIpText = item.wisphub_ip 
            ? '<span style="font-family: var(--font-mono); font-weight: 600; color: #60a5fa;">' + item.wisphub_ip + '</span>' 
            : '<span style="color: var(--text-muted); font-size: 11px;">-</span>';

          const oltIpText = item.smartolt_ip 
            ? '<span style="font-family: var(--font-mono); font-weight: 600; color: #22d3ee;">' + item.smartolt_ip + '</span>' 
            : '<span style="color: var(--text-muted); font-size: 11px;">-</span>';

          const whEstadoBadge = item.wisphub_estado
            ? '<span class="pill ' + (item.wisphub_estado.toLowerCase() === 'activo' ? 'pill-green' : 'pill-red') + '">' + item.wisphub_estado + '</span>'
            : '<span style="color: var(--text-muted); font-size: 11px;">-</span>';

          const clientFull = '<strong>' + (item.cliente || '-') + '</strong><br><small style="color: var(--text-muted);">' + (item.servicio || '') + '</small>';

          return '<tr style="' + rowBg + '">' +
            '<td style="font-family: var(--font-mono); font-weight: 700; color: #f9fafb;">' + (item.folio || '-') + '</td>' +
            '<td>' + clientFull + '</td>' +
            '<td>' + whIpText + '</td>' +
            '<td>' + oltIpText + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + whEstadoBadge + '</td>' +
            '<td style="font-size: 12px; color: var(--text-muted);">' + (item.zona_o_router || '-') + '</td>' +
            '<td style="font-family: var(--font-mono); font-size: 11px;">' + (item.sn_smartolt || item.sn_wisphub || '-') + '</td>' +
          '</tr>';
        }).join('');

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="color: #f87171; text-align: center; padding: 24px;">❌ Error de conexión al servidor: ' + err.message + '</td></tr>';
      }
    }

    async function loadWisphubStats() {
      const el = document.getElementById('whStatsText');
      if (!el) return;
      try {
        const res = await fetch('/api/wisphub/stats');
        const data = await res.json();
        if (data.success && data.stats) {
          const count = data.stats.count || 0;
          const last = data.stats.lastSync ? new Date(data.stats.lastSync).toLocaleString('es-MX') : 'Nunca';
          el.innerHTML = '<strong style="color: #818cf8;">' + count + ' clientes registrados</strong> (Último sync: ' + last + ')';
        } else {
          el.innerText = 'Sin registros sincronizados aún.';
        }
      } catch (e) {
        el.innerText = 'No se pudo obtener el estado.';
      }
    }

    async function syncWisphubAction() {
      const btnTab1 = document.getElementById('btnSyncWh');
      const btnAudit = document.getElementById('btnSyncAuditWh');
      const el = document.getElementById('whStatsText');

      if (btnTab1) { btnTab1.disabled = true; btnTab1.innerText = '⏳ Sincronizando...'; }
      if (btnAudit) { btnAudit.disabled = true; btnAudit.innerText = '⏳ Sincronizando...'; }
      if (el) el.innerText = 'Descargando clientes desde WispHub API (Paginado)...';

      try {
        const res = await fetch('/api/wisphub/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + data.message);
          loadWisphubStats();
          loadAuditData(currentAuditPage);
        } else {
          showToast('❌ Error: ' + (data.error || data.message), true);
        }
      } catch (err) {
        showToast('❌ Error al conectar: ' + err.message, true);
      } finally {
        if (btnTab1) { btnTab1.disabled = false; btnTab1.innerText = '🔄 Sincronizar con Turso DB'; }
        if (btnAudit) { btnAudit.disabled = false; btnAudit.innerText = '📥 Sincronizar WispHub'; }
      }
    }

    let allIpamAvailable = [];

    async function loadIpamData() {
      await Promise.all([loadIpamPools(), loadIpamAvailable(), loadUnconfiguredOnus()]);
    }

    async function loadIpamPools() {
      const container = document.getElementById('ipamPoolsContainer');
      try {
        const res = await fetch('/api/ipam/pools');
        const data = await res.json();
        if (data.success && data.pools) {
          let totalUsable = 0;
          let totalUsed = 0;
          let totalAvailable = 0;

          container.innerHTML = data.pools.map(p => {
            totalUsable += p.totalUsable;
            totalUsed += p.usedCount;
            totalAvailable += p.availableCount;

            const isSanAgustin = p.vlan === '800';
            const badgeColor = isSanAgustin ? '#c084fc' : '#38bdf8';
            const barColor = p.usagePercent > 80 ? '#ef4444' : p.usagePercent > 50 ? '#f59e0b' : '#10b981';

            return '<div style="background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; position: relative; overflow: hidden;">' +
              '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">' +
                '<span style="font-weight: 700; font-size: 14px; color: ' + badgeColor + ';">VLAN ' + p.vlan + '</span>' +
                '<span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">' + p.segment + '</span>' +
              '</div>' +
              '<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">' + p.oltName + ' | GW: ' + p.gateway + '</div>' +
              '<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">' +
                '<span style="color: #34d399; font-weight: 600;">' + p.availableCount + ' libres</span>' +
                '<span style="color: var(--text-muted);">' + p.usedCount + ' / ' + p.totalUsable + ' (' + p.usagePercent + '%)</span>' +
              '</div>' +
              '<div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">' +
                '<div style="width: ' + p.usagePercent + '%; height: 100%; background: ' + barColor + '; border-radius: 999px;"></div>' +
              '</div>' +
            '</div>';
          }).join('');

          const globalPercent = totalUsable > 0 ? Math.round((totalUsed / totalUsable) * 100) : 0;
          document.getElementById('statIpamAvailable').innerText = totalAvailable;
          document.getElementById('statIpamUsed').innerText = totalUsed;
          document.getElementById('statIpamTotal').innerText = totalUsable;
          document.getElementById('statIpamPercent').innerText = globalPercent + '%';
        }
      } catch (err) {
        if (container) container.innerHTML = '<div style="color: #f87171;">Error al cargar pools de IPAM</div>';
      }
    }

    async function loadIpamAvailable() {
      const tbody = document.getElementById('ipamTableBody');
      try {
        const res = await fetch('/api/ipam/available');
        const data = await res.json();
        if (data.success && data.available) {
          allIpamAvailable = data.available;
          renderIpamTable(allIpamAvailable);
        }
      } catch (err) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="color: #f87171; text-align: center;">Error al cargar IPs disponibles</td></tr>';
      }
    }

    function filterIpamAvailable() {
      const vlanFilter = document.getElementById('ipamVlanSelect')?.value || '';
      const search = (document.getElementById('ipamSearchInput')?.value || '').toLowerCase().trim();

      const filtered = allIpamAvailable.filter(item => {
        const matchVlan = !vlanFilter || item.vlan === vlanFilter;
        const matchSearch = !search || item.ip.toLowerCase().includes(search) || item.vlan.includes(search) || item.gateway.includes(search);
        return matchVlan && matchSearch;
      });

      renderIpamTable(filtered);
    }

    function renderIpamTable(items) {
      const tbody = document.getElementById('ipamTableBody');
      const countInfo = document.getElementById('ipamCountInfo');
      if (!tbody) return;

      if (countInfo) countInfo.innerText = 'Mostrando ' + items.length + ' IPs libres';

      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No se encontraron IPs disponibles para este filtro.</td></tr>';
        return;
      }

      const displayItems = items.slice(0, 150);
      tbody.innerHTML = displayItems.map((item, idx) => {
        return '<tr>' +
          '<td style="color: var(--text-muted); font-family: var(--font-mono);">' + (idx + 1) + '</td>' +
          '<td style="font-family: var(--font-mono); font-weight: 700; color: #34d399; font-size: 14px;">' + item.ip + '</td>' +
          '<td><span class="pill pill-blue">VLAN ' + item.vlan + '</span></td>' +
          '<td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 12px;">' + item.gateway + '</td>' +
          '<td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 12px;">' + item.segment + '</td>' +
          '<td style="font-size: 12px;">' + item.olt + '</td>' +
          '<td><span class="pill pill-green">🟢 Disponible</span></td>' +
          '<td style="text-align: right;">' +
            '<button class="btn btn-secondary btn-test" onclick="copyIpToClipboard(&quot;' + item.ip + '&quot;)" style="padding: 4px 10px; font-size: 11px;">📋 Copiar IP</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function copyIpToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 IP ' + text + ' copiada al portapapeles');
      }).catch(() => {
        showToast('IP: ' + text);
      });
    }

    async function loadUnconfiguredOnus() {
      const tbody = document.getElementById('unconfiguredTableBody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">⏳ Consultando SmartOLT en tiempo real...</td></tr>';
      try {
        const res = await fetch('/api/smartolt/unconfigured');
        const data = await res.json();
        if (data.success && data.unconfigured) {
          if (data.unconfigured.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #34d399; padding: 20px;">✅ No hay ONUs pendientes por autorizar en este momento.</td></tr>';
            return;
          }

          tbody.innerHTML = data.unconfigured.map(onu => {
            const snSuffix = onu.sn.length >= 6 ? onu.sn.slice(-6) : onu.sn;
            return '<tr>' +
              '<td style="font-family: var(--font-mono); font-weight: 600;">' + onu.sn + '</td>' +
              '<td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8; font-size: 14px;">' + snSuffix + '</td>' +
              '<td>' + (onu.olt_name || onu.olt_id) + '</td>' +
              '<td style="font-family: var(--font-mono); font-size: 12px;">Tarjeta ' + onu.board + ' / PON ' + onu.port + '</td>' +
              '<td>' + (onu.onu_type_name || onu.onu_type || '-') + '</td>' +
              '<td style="color: #34d399; font-family: var(--font-mono);">' + (onu.onu_signal_1490 || onu.onu_signal || 'Detectada') + '</td>' +
              '<td><span class="pill pill-amber">Pendiente</span></td>' +
            '</tr>';
          }).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="color: #f87171; text-align: center;">Error al consultar ONUs sin configurar</td></tr>';
      }
    }

    // ==========================================
    // MÓDULO DE GESTIÓN DE TÉCNICOS Y PINS (TIEMPO REAL)
    // ==========================================
    let allTechnicians = [];

    function updateTechniciansKpi() {
      const total = allTechnicians.length;
      const active = allTechnicians.filter(t => t.is_active === 1).length;
      const elTotal = document.getElementById('statTotalTechs');
      const elActive = document.getElementById('statActiveTechs');
      if (elTotal) elTotal.innerText = total;
      if (elActive) elActive.innerText = active;
    }

    function renderTechniciansTable() {
      const tbody = document.getElementById('techniciansTableBody');
      if (!tbody) return;

      updateTechniciansKpi();

      if (allTechnicians.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">' +
          'No hay técnicos registrados aún.<br>' +
          '<button class="btn btn-primary" onclick="openTechnicianModal()" style="margin-top: 10px; font-size: 12px;">➕ Registrar Primer Técnico</button>' +
        '</td></tr>';
        return;
      }

      tbody.innerHTML = allTechnicians.map(t => {
        const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
        const isActive = t.is_active === 1;

        const cleanPhone = t.phone.replace(/\D/g, '');
        const waLink = '<a href="https://wa.me/' + cleanPhone + '" target="_blank" style="color: #60a5fa; text-decoration: none; font-family: var(--font-mono); font-weight: 600;">' + t.phone + ' ↗</a>';

        const pinDisplay = '<span style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #fbbf24; background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: 6px; letter-spacing: 2px;">' + t.pin + '</span> ' +
          '<button type="button" onclick="copyPinToClipboard(&quot;' + t.pin + '&quot;)" style="background: transparent; border: none; cursor: pointer; font-size: 13px; color: var(--text-muted);" title="Copiar PIN">📋</button>';

        const notesText = t.notes ? '<br><small style="color: var(--text-muted);">' + t.notes + '</small>' : '';

        // Switch interactivo en tiempo real estilo iOS
        const switchHtml = '<label class="switch" title="Clic para activar o desactivar en tiempo real">' +
          '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="toggleTechnicianRealtime(' + t.id + ', this)">' +
          '<span class="slider"></span>' +
          '<span id="techStatusText-' + t.id + '" style="font-size: 12px; font-weight: 600; color: ' + (isActive ? '#34d399' : '#f87171') + ';">' +
            (isActive ? 'Activo' : 'Inactivo') +
          '</span>' +
        '</label>';

        return '<tr id="techRow-' + t.id + '">' +
          '<td style="color: var(--text-muted); font-family: var(--font-mono);">' + t.id + '</td>' +
          '<td style="font-weight: 700; color: #f9fafb;">' + t.name + notesText + '</td>' +
          '<td>' + waLink + '</td>' +
          '<td>' + pinDisplay + '</td>' +
          '<td>' + switchHtml + '</td>' +
          '<td><span class="pill pill-blue">' + (t.role || 'TECNICO') + '</span></td>' +
          '<td style="font-size: 12px; color: var(--text-muted);">' + dateStr + '</td>' +
          '<td style="text-align: right; white-space: nowrap;">' +
            '<button class="btn btn-secondary btn-test" onclick="editTechnicianAction(' + t.id + ')" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">✏️ Editar</button>' +
            '<button class="btn btn-secondary btn-test" onclick="deleteTechnicianAction(' + t.id + ', &quot;' + t.name + '&quot;)" style="padding: 4px 8px; font-size: 11px; color: #f87171;">🗑️</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    async function loadTechnicians() {
      const tbody = document.getElementById('techniciansTableBody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">⏳ Consultando técnicos en Turso DB...</td></tr>';

      try {
        const res = await fetch('/api/technicians');
        const data = await res.json();

        if (data.success && data.technicians) {
          allTechnicians = data.technicians;
          renderTechniciansTable();
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" style="color: #f87171; text-align: center; padding: 24px;">❌ Error al cargar técnicos desde Turso DB</td></tr>';
      }
    }

    async function toggleTechnicianRealtime(id, inputElem) {
      const isChecked = inputElem.checked;
      const statusText = document.getElementById('techStatusText-' + id);
      const tech = allTechnicians.find(t => t.id === id);

      // 1. Actualización instantánea en pantalla (Zero lag)
      if (statusText) {
        statusText.innerText = isChecked ? 'Activo' : 'Inactivo';
        statusText.style.color = isChecked ? '#34d399' : '#f87171';
      }
      if (tech) {
        tech.is_active = isChecked ? 1 : 0;
      }
      updateTechniciansKpi();

      // 2. Guardar en Turso DB en segundo plano
      try {
        const res = await fetch('/api/technicians/' + id + '/toggle', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(isChecked ? '🟢 Técnico "' + (tech?.name || '') + '" activado en Turso' : '⏸️ Técnico "' + (tech?.name || '') + '" desactivado');
        } else {
          // Revertir si hubo error
          inputElem.checked = !isChecked;
          if (statusText) {
            statusText.innerText = !isChecked ? 'Activo' : 'Inactivo';
            statusText.style.color = !isChecked ? '#34d399' : '#f87171';
          }
          if (tech) tech.is_active = !isChecked ? 1 : 0;
          updateTechniciansKpi();
          showToast('❌ Error: ' + data.error, true);
        }
      } catch (err) {
        // Revertir
        inputElem.checked = !isChecked;
        if (statusText) {
          statusText.innerText = !isChecked ? 'Activo' : 'Inactivo';
          statusText.style.color = !isChecked ? '#34d399' : '#f87171';
        }
        if (tech) tech.is_active = !isChecked ? 1 : 0;
        updateTechniciansKpi();
        showToast('❌ Error de conexión al servidor', true);
      }
    }

    function generateRandomPin() {
      const pin = Math.floor(10000 + Math.random() * 90000).toString();
      document.getElementById('techPin').value = pin;
    }

    function copyPinToClipboard(pin) {
      navigator.clipboard.writeText(pin).then(() => {
        showToast('📋 PIN ' + pin + ' copiado');
      }).catch(() => {
        showToast('PIN: ' + pin);
      });
    }

    function openTechnicianModal(editData = null) {
      const modal = document.getElementById('technicianModal');
      const title = document.getElementById('modalTechTitle');
      const techId = document.getElementById('techId');
      const techName = document.getElementById('techName');
      const techPhone = document.getElementById('techPhone');
      const techPin = document.getElementById('techPin');
      const techActive = document.getElementById('techActive');
      const techNotes = document.getElementById('techNotes');

      if (editData) {
        title.innerText = '✏️ Editar Técnico';
        techId.value = editData.id;
        techName.value = editData.name || '';
        techPhone.value = editData.phone || '';
        techPin.value = editData.pin || '';
        techActive.value = String(editData.is_active ?? 1);
        techNotes.value = editData.notes || '';
      } else {
        title.innerText = '➕ Registrar Nuevo Técnico';
        techId.value = '';
        techName.value = '';
        techPhone.value = '';
        generateRandomPin();
        techActive.value = '1';
        techNotes.value = '';
      }

      modal.style.display = 'flex';
    }

    function closeTechnicianModal() {
      document.getElementById('technicianModal').style.display = 'none';
    }

    function editTechnicianAction(id) {
      const tech = allTechnicians.find(t => t.id === id);
      if (tech) {
        openTechnicianModal(tech);
      }
    }

    async function saveTechnician() {
      const id = document.getElementById('techId').value;
      const name = document.getElementById('techName').value.trim();
      const phone = document.getElementById('techPhone').value.trim();
      const pin = document.getElementById('techPin').value.trim();
      const is_active = parseInt(document.getElementById('techActive').value, 10);
      const notes = document.getElementById('techNotes').value.trim();
      const btn = document.getElementById('btnSaveTech');

      if (!name || !phone || !pin) {
        showToast('Por favor completa nombre, teléfono y PIN de 5 dígitos', true);
        return;
      }

      if (pin.length !== 5) {
        showToast('El PIN debe tener exactamente 5 dígitos numéricos', true);
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Guardando en Turso...';

      try {
        const payload = { name, phone, pin, is_active, notes, role: 'TECNICO' };
        const url = id ? ('/api/technicians/' + id + '/update') : '/api/technicians';
        const method = 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast('✅ ' + (data.message || 'Técnico guardado exitosamente'));
          closeTechnicianModal();
          // Actualización en caliente
          await loadTechnicians();
        } else {
          showToast('❌ Error: ' + (data.error || 'No se pudo guardar'), true);
        }
      } catch (err) {
        showToast('❌ Error de conexión: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btn.innerText = '💾 Guardar en Turso DB';
      }
    }

    async function deleteTechnicianAction(id, name) {
      if (!confirm('¿Estás seguro de que deseas eliminar al técnico "' + name + '" del sistema?')) return;
      try {
        // Eliminar fila inmediatamente de pantalla
        const row = document.getElementById('techRow-' + id);
        if (row) row.style.opacity = '0.3';

        const res = await fetch('/api/technicians/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          allTechnicians = allTechnicians.filter(t => t.id !== id);
          renderTechniciansTable();
          showToast('✅ Técnico eliminado');
        } else {
          if (row) row.style.opacity = '1';
          showToast('Error: ' + data.error, true);
        }
      } catch (err) {
        showToast('Error al eliminar técnico', true);
      }
    }

    // Inicializar
    loadSettings();
    loadSmartOltStats();
    loadWisphubStats();
    loadTechnicians();
  </script>
</body>
</html>`;
}
