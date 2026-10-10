import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';

/**
 * Genera el HTML completo para el Portal Web / PWA de Clientes
 * Incluye:
 * - Autenticación segura por Teléfono + Contraseña
 * - Flujo de creación de contraseña inicial (Onboarding)
 * - Recuperación de contraseña por WhatsApp con código OTP de 6 dígitos
 * - Soporte Multi-Servicio con selector interactivo
 * - Historial detallado de facturas y pagos (WispHub / Sipgun)
 * - Gestión Wi-Fi con generador de QR para visitas
 * - Diagnóstico óptico con protección de API SmartOLT
 */
export function getClientPortalHtml(): string {
  const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
  const supportPhone = SettingsService.get('SUPPORT_PHONE', 'SUPPORT_PHONE', config.isp.soporteHumanoPhone || '');
  const bankName = SettingsService.get('PAYMENT_BANK_NAME', 'PAYMENT_BANK_NAME', 'BBVA Bancomer');
  const bankClabe = SettingsService.get('PAYMENT_BANK_CLABE', 'PAYMENT_BANK_CLABE', '012320001234567890');
  const bankAccount = SettingsService.get('PAYMENT_BANK_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '0123456789');

  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${ispName} - Portal del Cliente</title>
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${ispName}">
  <meta name="description" content="Consulta tu conexión de fibra óptica, potencia, Wi-Fi, facturas y reporta fallas en tiempo real.">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/portal-icon.svg">
  <link rel="apple-touch-icon" href="/portal-icon.svg">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <!-- QRCode.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: #0f172a;
      --bg-card: rgba(30, 41, 59, 0.7);
      --bg-card-hover: rgba(51, 65, 85, 0.75);
      --border-subtle: rgba(148, 163, 184, 0.12);
      --border-glow: rgba(56, 189, 248, 0.3);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-faint: #64748b;
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-indigo: #6366f1;
      --accent-green: #10b981;
      --accent-emerald: #059669;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-base);
      background-image: 
        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.08) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    
    /* Header */
    .header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-main);
    }
    
    .brand-logo {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: white;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
    }
    
    .brand-text h1 {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .brand-text span {
      font-size: 11px;
      color: var(--accent-cyan);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-pwa-install {
      display: none;
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-blue));
      color: white;
      border: none;
      padding: 7px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
      transition: all 0.2s ease;
    }
    
    .btn-icon {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-icon:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.1);
    }
    
    /* Container */
    .container {
      max-width: 680px;
      width: 100%;
      margin: 0 auto;
      padding: 20px 16px 80px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Auth Cards */
    .auth-container {
      max-width: 440px;
      margin: 20px auto;
      width: 100%;
    }

    .auth-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: var(--radius-xl);
      padding: 30px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .auth-header {
      text-align: center;
    }

    .auth-header h2 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .auth-header p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      color: var(--text-faint);
      font-size: 14px;
    }

    .input-toggle-pass {
      position: absolute;
      right: 14px;
      color: var(--text-faint);
      cursor: pointer;
      background: none;
      border: none;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 14px 12px 40px;
      color: var(--text-main);
      font-size: 15px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      color: white;
      border: none;
      border-radius: var(--radius-md);
      padding: 13px 20px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
      transition: all 0.2s;
      width: 100%;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      width: 100%;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .auth-links {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      margin-top: 4px;
    }

    .auth-link {
      color: var(--accent-cyan);
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .auth-link:hover {
      text-decoration: underline;
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 18px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title i {
      color: var(--accent-cyan);
    }

    /* Multi-Service Switcher */
    .service-switcher-wrapper {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .service-switcher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
    }

    .service-select-control {
      background: var(--bg-surface);
      border: 1px solid var(--border-glow);
      color: var(--text-main);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      font-weight: 600;
      outline: none;
      cursor: pointer;
      width: 100%;
    }

    /* Signal Gauge */
    .signal-box {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .signal-status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-green { background: var(--accent-green); box-shadow: 0 0 10px var(--accent-green); }
    .dot-yellow { background: var(--accent-amber); box-shadow: 0 0 10px var(--accent-amber); }
    .dot-red { background: var(--accent-rose); box-shadow: 0 0 10px var(--accent-rose); }

    /* WiFi Info */
    .wifi-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .wifi-card {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .wifi-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .wifi-ssid {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }

    .wifi-pass {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--accent-cyan);
    }

    /* Billing */
    .billing-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
    }

    .billing-amount {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
    }

    .billing-status-tag {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .tag-paid { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); border: 1px solid var(--accent-green); }
    .tag-pending { background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); border: 1px solid var(--accent-rose); }

    /* Invoices History Table */
    .invoices-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 6px;
    }

    .invoices-table th {
      text-align: left;
      padding: 8px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 11px;
      text-transform: uppercase;
    }

    .invoices-table td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.06);
    }

    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-xl);
      padding: 24px;
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      font-size: 17px;
      font-weight: 700;
    }

    .btn-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1e293b;
      border: 1px solid var(--accent-cyan);
      color: white;
      padding: 12px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 500;
      z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #toast.show {
      transform: translateX(-50%) translateY(0);
    }

    /* Hidden Utility */
    .hidden { display: none !important; }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="header">
    <a href="/portal" class="brand">
      <div class="brand-logo"><i class="fa-solid fa-wifi"></i></div>
      <div class="brand-text">
        <h1>${ispName}</h1>
        <span>Portal del Cliente</span>
      </div>
    </a>
    <div class="header-actions">
      <button id="btnInstallPwa" class="btn-pwa-install"><i class="fa-solid fa-download"></i> App</button>
      <button id="btnLogout" class="btn-icon hidden" title="Cerrar Sesión"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="container">

    <!-- 1. VISTA DE INICIO DE SESIÓN -->
    <div id="viewLogin" class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Iniciar Sesión</h2>
          <p>Ingresa tu número de teléfono registrado y tu contraseña para acceder a tu conexión y facturas.</p>
        </div>

        <form id="formLogin" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Número de Teléfono</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-phone input-icon"></i>
              <input type="tel" id="loginPhone" class="form-control" placeholder="Ej: 7721234567" maxlength="10" required>
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <label class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-lock input-icon"></i>
              <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
              <button type="button" class="input-toggle-pass" onclick="togglePass('loginPassword')"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 16px;">
            <i class="fa-solid fa-right-to-bracket"></i> Entrar a mi Portal
          </button>
        </form>

        <div class="auth-links">
          <span class="auth-link" onclick="showForgotPassword()">¿Olvidaste tu contraseña?</span>
          <span class="auth-link" onclick="showRegister()">Crear cuenta</span>
        </div>
      </div>
    </div>

    <!-- 2. VISTA DE REGISTRO / CREAR CONTRASEÑA -->
    <div id="viewRegister" class="auth-container hidden">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Activar mi Cuenta</h2>
          <p>Crea tu contraseña de acceso para gestionar tu Wi-Fi, revisar tu conexión y pagar en línea.</p>
        </div>

        <form id="formRegister" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Número de Teléfono</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-phone input-icon"></i>
              <input type="tel" id="regPhone" class="form-control" placeholder="10 dígitos registrados" maxlength="10" required>
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <label class="form-label">Nueva Contraseña (mínimo 6 caracteres)</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-key input-icon"></i>
              <input type="password" id="regPassword" class="form-control" placeholder="Crea tu contraseña segura" minlength="6" required>
              <button type="button" class="input-toggle-pass" onclick="togglePass('regPassword')"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 16px;">
            <i class="fa-solid fa-check-circle"></i> Guardar y Entrar
          </button>
        </form>

        <div class="auth-links" style="justify-content: center;">
          <span class="auth-link" onclick="showLogin()">Ya tengo contraseña · Iniciar Sesión</span>
        </div>
      </div>
    </div>

    <!-- 3. VISTA DE RECUPERACIÓN POR WHATSAPP -->
    <div id="viewForgot" class="auth-container hidden">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Recuperar Contraseña</h2>
          <p>Te enviaremos un código de seguridad de 6 dígitos a tu WhatsApp para restablecer tu clave.</p>
        </div>

        <div id="forgotStep1">
          <form onsubmit="handleSendOtp(event)">
            <div class="form-group">
              <label class="form-label">Número de Teléfono</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-phone input-icon"></i>
                <input type="tel" id="forgotPhone" class="form-control" placeholder="10 dígitos registrados" maxlength="10" required>
              </div>
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 16px;">
              <i class="fa-brands fa-whatsapp"></i> Enviar Código por WhatsApp
            </button>
          </form>
        </div>

        <div id="forgotStep2" class="hidden">
          <form onsubmit="handleResetPassword(event)">
            <div class="form-group">
              <label class="form-label">Código de 6 dígitos recibido</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-shield-halved input-icon"></i>
                <input type="text" id="resetOtp" class="form-control" placeholder="Ej: 123456" maxlength="6" required>
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Nueva Contraseña</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-lock input-icon"></i>
                <input type="password" id="resetNewPass" class="form-control" placeholder="Mínimo 6 caracteres" minlength="6" required>
              </div>
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 16px;">
              <i class="fa-solid fa-rotate"></i> Restablecer y Entrar
            </button>
          </form>
        </div>

        <div class="auth-links" style="justify-content: center;">
          <span class="auth-link" onclick="showLogin()">Regresar al inicio de sesión</span>
        </div>
      </div>
    </div>

    <!-- 4. DASHBOARD PRINCIPAL DEL CLIENTE -->
    <div id="viewDashboard" class="hidden" style="display: flex; flex-direction: column; gap: 16px;">

      <!-- Selector Multi-Servicio -->
      <div id="multiServiceContainer" class="service-switcher-wrapper hidden">
        <div class="service-switcher-header">
          <span><i class="fa-solid fa-building-user"></i> Tus Contratos Activos</span>
          <span id="serviceCountBadge">1 Contrato</span>
        </div>
        <select id="serviceSelector" class="service-select-control" onchange="onSelectService(this.value)">
          <!-- Opciones dinámicas -->
        </select>
      </div>

      <!-- Alerta de Corte de Zona -->
      <div id="outageBanner" class="card hidden" style="border-color: var(--accent-amber); background: rgba(245, 158, 11, 0.1);">
        <div class="card-title" style="color: var(--accent-amber);">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span id="outageTitle">Mantenimiento de Red en Curso</span>
        </div>
        <p id="outageDesc" style="font-size: 13px; color: var(--text-muted);"></p>
      </div>

      <!-- Tarjeta 1: Estado de Fibra Óptica -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-tower-broadcast"></i> Conexión de Fibra Óptica</div>
          <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 11px;" onclick="refreshSignal()"><i class="fa-solid fa-rotate"></i> Probar Señal</button>
        </div>

        <div class="signal-box">
          <div class="signal-status-badge">
            <span id="statusDot" class="status-dot dot-green"></span>
            <span id="statusText">Conexión Excelente</span>
          </div>
          <div id="signalDbm" style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-muted);">
            -21.4 dBm
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-muted);">
          <span>Plan contratado: <strong id="planName" style="color: var(--text-main);">50 Megas</strong></span>
          <span>Titular: <strong id="clientTitular" style="color: var(--text-main);">Juan</strong></span>
        </div>

        <button id="btnReboot" class="btn-secondary" onclick="rebootModem()">
          <i class="fa-solid fa-power-off"></i> Reiniciar mi Módem
        </button>
      </div>

      <!-- Tarjeta 2: Configuración Wi-Fi -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-wifi"></i> Tu Red Wi-Fi</div>
          <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 11px;" onclick="openWifiModal()"><i class="fa-solid fa-pen"></i> Cambiar Clave</button>
        </div>

        <div class="wifi-grid">
          <div class="wifi-card">
            <div class="wifi-details">
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Nombre de Red (SSID)</span>
              <span id="wifiSsid" class="wifi-ssid">Cargando...</span>
            </div>
            <button class="btn-icon" onclick="copyWifiSsid()" title="Copiar nombre"><i class="fa-solid fa-copy"></i></button>
          </div>

          <div class="wifi-card">
            <div class="wifi-details">
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Contraseña</span>
              <span id="wifiPass" class="wifi-pass">••••••••</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon" onclick="toggleWifiPassVisibility()" title="Ver contraseña"><i class="fa-solid fa-eye"></i></button>
              <button class="btn-icon" onclick="copyWifiPass()" title="Copiar contraseña"><i class="fa-solid fa-copy"></i></button>
              <button class="btn-icon" onclick="openQrModal()" title="Generar QR para visitas"><i class="fa-solid fa-qrcode"></i></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjeta 3: Facturación e Historial de Pagos -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-receipt"></i> Estado de Cuenta y Facturas</div>
          <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 11px;" onclick="loadBillingHistory()"><i class="fa-solid fa-rotate"></i> Actualizar</button>
        </div>

        <div class="billing-summary">
          <div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Saldo Actual</div>
            <div id="billingAmount" class="billing-amount">$0.00</div>
            <div id="billingDueDate" style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Corte: Día 5 de cada mes</div>
          </div>
          <span id="billingStatusTag" class="billing-status-tag tag-paid">Al Corriente</span>
        </div>

        <!-- Botones de Pago -->
        <div id="paymentActions" style="display: flex; gap: 10px;">
          <button class="btn-primary" onclick="openBankModal()"><i class="fa-solid fa-building-columns"></i> Datos de Transferencia</button>
          <a id="btnPayOnline" href="#" target="_blank" class="btn-secondary hidden" style="text-decoration: none;"><i class="fa-solid fa-credit-card"></i> Pagar en Línea</a>
        </div>

        <!-- Tabla Historial -->
        <div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Historial de Recibos y Pagos</div>
          <div style="overflow-x: auto;">
            <table class="invoices-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody id="invoicesTbody">
                <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Consultando recibos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tarjeta 4: Soporte Técnico Directo -->
      <div class="card" style="text-align: center; align-items: center; padding: 20px;">
        <i class="fa-brands fa-whatsapp" style="font-size: 32px; color: var(--accent-green);"></i>
        <div style="font-weight: 700; font-size: 16px;">¿Necesitas ayuda con tu servicio?</div>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 380px;">Nuestro asistente inteligente y equipo técnico están disponibles las 24 horas por WhatsApp.</p>
        <a id="btnWhatsappSupport" href="https://wa.me/${supportPhone}?text=Hola,%20necesito%20apoyo%20con%20mi%20servicio" target="_blank" class="btn-primary" style="width: auto; text-decoration: none;">
          <i class="fa-brands fa-whatsapp"></i> Chatear con Soporte
        </a>
      </div>

    </div>

  </div>

  <!-- Modal Wi-Fi -->
  <div id="modalWifi" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Cambiar Clave Wi-Fi</span>
        <button class="btn-close" onclick="closeModal('modalWifi')">&times;</button>
      </div>
      <form onsubmit="handleSaveWifi(event)">
        <div class="form-group">
          <label class="form-label">Nombre de Red Wi-Fi (SSID)</label>
          <input type="text" id="modalSsid" class="form-control" style="padding-left: 14px;" required>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label class="form-label">Nueva Contraseña (mínimo 8 caracteres)</label>
          <input type="password" id="modalPass" class="form-control" style="padding-left: 14px;" minlength="8" required>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 16px;"><i class="fa-solid fa-save"></i> Aplicar en mi Módem</button>
      </form>
    </div>
  </div>

  <!-- Modal QR Wi-Fi -->
  <div id="modalQr" class="modal-backdrop">
    <div class="modal-box" style="text-align: center; align-items: center;">
      <div class="modal-header" style="width: 100%;">
        <span class="modal-title">Conectar por Código QR</span>
        <button class="btn-close" onclick="closeModal('modalQr')">&times;</button>
      </div>
      <p style="font-size: 13px; color: var(--text-muted);">Pídele a tus visitas que apunten la cámara de su celular para conectarse al instante.</p>
      <div id="qrcodeContainer" style="background: white; padding: 16px; border-radius: 12px; margin: 10px 0;"></div>
      <button class="btn-secondary" onclick="closeModal('modalQr')">Cerrar</button>
    </div>
  </div>

  <!-- Modal Datos Bancarios -->
  <div id="modalBank" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Datos para Pago por Transferencia (SPEI)</span>
        <button class="btn-close" onclick="closeModal('modalBank')">&times;</button>
      </div>
      <div style="font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
        <div><strong>Banco:</strong> ${bankName}</div>
        <div><strong>CLABE Interbancaria:</strong> <span id="bankClabeVal" style="font-family: monospace; color: var(--accent-cyan);">${bankClabe}</span></div>
        <div><strong>Número de Cuenta:</strong> ${bankAccount}</div>
        <div><strong>Beneficiario:</strong> ${ispName}</div>
        <div><strong>Concepto / Referencia:</strong> <span id="bankRefVal" style="font-weight: 700; color: var(--accent-green);">SRV-100</span></div>
      </div>
      <button class="btn-primary" onclick="copyBankClabe()"><i class="fa-solid fa-copy"></i> Copiar CLABE</button>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast"><i class="fa-solid fa-circle-check"></i> <span id="toastMsg">Listo</span></div>

  <script>
    let currentToken = localStorage.getItem('cp_token') || '';
    let currentPhone = localStorage.getItem('cp_phone') || '';
    let currentServices = [];
    let currentServiceId = '';
    let currentWifiRealPass = '';
    let isPassVisible = false;

    // Inicializar PWA y Eventos
    document.addEventListener('DOMContentLoaded', () => {
      initPwa();
      checkUrlParams();
      if (currentToken) {
        loadDashboard();
      } else {
        showLogin();
      }
    });

    function checkUrlParams() {
      const url = new URL(window.location.href);
      const autoAuth = url.searchParams.get('auth') || url.searchParams.get('token');
      const resetCode = url.searchParams.get('resetCode');
      const p = url.searchParams.get('p') || url.searchParams.get('phone');

      if (p) {
        document.getElementById('loginPhone').value = p;
        document.getElementById('regPhone').value = p;
        document.getElementById('forgotPhone').value = p;
      }

      if (autoAuth) {
        localStorage.setItem('cp_token', autoAuth);
        currentToken = autoAuth;
        loadDashboard();
      } else if (resetCode && p) {
        showForgotStep2(p, resetCode);
      }
    }

    function initPwa() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const btn = document.getElementById('btnInstallPwa');
        if (btn) {
          btn.style.display = 'flex';
          btn.onclick = () => {
            deferredPrompt.prompt();
          };
        }
      });
    }

    // UI View Switchers
    function showLogin() {
      document.getElementById('viewLogin').classList.remove('hidden');
      document.getElementById('viewRegister').classList.add('hidden');
      document.getElementById('viewForgot').classList.add('hidden');
      document.getElementById('viewDashboard').classList.add('hidden');
      document.getElementById('btnLogout').classList.add('hidden');
    }

    function showRegister() {
      document.getElementById('viewLogin').classList.add('hidden');
      document.getElementById('viewRegister').classList.remove('hidden');
      document.getElementById('viewForgot').classList.add('hidden');
      document.getElementById('viewDashboard').classList.add('hidden');
    }

    function showForgotPassword() {
      document.getElementById('viewLogin').classList.add('hidden');
      document.getElementById('viewRegister').classList.add('hidden');
      document.getElementById('viewForgot').classList.remove('hidden');
      document.getElementById('forgotStep1').classList.remove('hidden');
      document.getElementById('forgotStep2').classList.add('hidden');
      document.getElementById('viewDashboard').classList.add('hidden');
    }

    function showForgotStep2(phone, code) {
      showForgotPassword();
      document.getElementById('forgotStep1').classList.add('hidden');
      document.getElementById('forgotStep2').classList.remove('hidden');
      if (code) document.getElementById('resetOtp').value = code;
      if (phone) currentPhone = phone;
    }

    function togglePass(id) {
      const el = document.getElementById(id);
      el.type = el.type === 'password' ? 'text' : 'password';
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMsg').innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // Auth Handlers
    async function handleLogin(e) {
      e.preventDefault();
      const phone = document.getElementById('loginPhone').value.trim();
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch('/api/portal/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem('cp_token', data.token);
          localStorage.setItem('cp_phone', phone);
          currentToken = data.token;
          currentPhone = phone;
          showToast('¡Bienvenido a tu portal!');
          loadDashboard();
        } else if (data.needsRegistration) {
          document.getElementById('regPhone').value = phone;
          showToast(data.message);
          showRegister();
        } else {
          showToast(data.message || 'Error al iniciar sesión');
        }
      } catch {
        showToast('Error de conexión al autenticar.');
      }
    }

    async function handleRegister(e) {
      e.preventDefault();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;

      try {
        const res = await fetch('/api/portal/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem('cp_token', data.token);
          localStorage.setItem('cp_phone', phone);
          currentToken = data.token;
          currentPhone = phone;
          showToast('¡Cuenta activada con éxito!');
          loadDashboard();
        } else {
          showToast(data.message || 'No se pudo crear la cuenta.');
        }
      } catch {
        showToast('Error al conectar con el servidor.');
      }
    }

    async function handleSendOtp(e) {
      e.preventDefault();
      const phone = document.getElementById('forgotPhone').value.trim();
      currentPhone = phone;

      try {
        const res = await fetch('/api/portal/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          document.getElementById('forgotStep1').classList.add('hidden');
          document.getElementById('forgotStep2').classList.remove('hidden');
        } else {
          showToast(data.message || 'Error al enviar código.');
        }
      } catch {
        showToast('Error de conexión.');
      }
    }

    async function handleResetPassword(e) {
      e.preventDefault();
      const code = document.getElementById('resetOtp').value.trim();
      const newPassword = document.getElementById('resetNewPass').value;

      try {
        const res = await fetch('/api/portal/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: currentPhone, code, newPassword })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('cp_token', data.token);
          currentToken = data.token;
          showToast(data.message);
          loadDashboard();
        } else {
          showToast(data.message || 'Código incorrecto');
        }
      } catch {
        showToast('Error al restablecer contraseña.');
      }
    }

    document.getElementById('btnLogout').onclick = () => {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_phone');
      currentToken = '';
      currentPhone = '';
      showLogin();
      showToast('Sesión cerrada.');
    };

    // Dashboard Data Loading
    async function loadDashboard(serviceId) {
      try {
        const url = `/api/portal/me?token=${encodeURIComponent(currentToken)}${serviceId ? '&serviceId=' + serviceId : ''}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success || !data.client) {
          showLogin();
          return;
        }

        document.getElementById('viewLogin').classList.add('hidden');
        document.getElementById('viewRegister').classList.add('hidden');
        document.getElementById('viewForgot').classList.add('hidden');
        document.getElementById('viewDashboard').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');

        renderDashboardData(data);
      } catch {
        showToast('Error al cargar datos del servicio.');
      }
    }

    function renderDashboardData(data) {
      const c = data.client;
      currentServiceId = String(c.id_servicio);
      currentServices = data.relatedServices || [];

      // Titular y Plan
      document.getElementById('clientTitular').innerText = c.nombre;
      document.getElementById('planName').innerText = c.plan_internet || 'Fibra Óptica';

      // Multi-Servicio Switcher
      const switcherContainer = document.getElementById('multiServiceContainer');
      const selector = document.getElementById('serviceSelector');
      if (currentServices.length > 1) {
        switcherContainer.classList.remove('hidden');
        document.getElementById('serviceCountBadge').innerText = `${currentServices.length} Contratos`;
        selector.innerHTML = currentServices.map(s => `
          <option value="${s.id_servicio}" ${String(s.id_servicio) === currentServiceId ? 'selected' : ''}>
            🏠 ${s.direccion || s.router} · Folio #${s.id_servicio} (${s.plan_internet || 'Fibra'})
          </option>
        `).join('');
      } else {
        switcherContainer.classList.add('hidden');
      }

      // Outage
      const outBanner = document.getElementById('outageBanner');
      if (data.outage && data.outage.active) {
        outBanner.classList.remove('hidden');
        document.getElementById('outageTitle').innerText = data.outage.title;
        document.getElementById('outageDesc').innerText = data.outage.description;
      } else {
        outBanner.classList.add('hidden');
      }

      // Signal
      const dot = document.getElementById('statusDot');
      const stText = document.getElementById('statusText');
      const sigDbm = document.getElementById('signalDbm');
      const sig = data.signal || {};

      if (sig.status === 'ONLINE') {
        dot.className = 'status-dot dot-green';
        stText.innerText = 'Conexión Excelente y Activa';
      } else if (sig.status === 'LOS' || sig.status === 'OFFLINE') {
        dot.className = 'status-dot dot-red';
        stText.innerText = 'Sin Señal (Fibra desconectada o corte)';
      } else {
        dot.className = 'status-dot dot-yellow';
        stText.innerText = 'Equipo Sincronizado';
      }

      sigDbm.innerText = sig.opticalPowerDbm ? `${sig.opticalPowerDbm} dBm` : 'OK';

      // Wi-Fi
      const wifi = data.wifi || {};
      document.getElementById('wifiSsid').innerText = wifi.ssid24 || `CloudWare_${c.id_servicio}`;
      currentWifiRealPass = wifi.password || '********';
      document.getElementById('wifiPass').innerText = isPassVisible ? currentWifiRealPass : '••••••••';

      // Facturación
      const balance = Number(c.saldo || 0);
      document.getElementById('billingAmount').innerText = `$${balance.toFixed(2)}`;
      document.getElementById('billingDueDate').innerText = `Corte: ${c.fecha_corte || ('Día ' + (c.dia_corte || 5) + ' de cada mes')}`;

      const tag = document.getElementById('billingStatusTag');
      if (balance <= 0) {
        tag.className = 'billing-status-tag tag-paid';
        tag.innerText = 'Al Corriente';
      } else {
        tag.className = 'billing-status-tag tag-pending';
        tag.innerText = 'Pago Pendiente';
      }

      document.getElementById('bankRefVal').innerText = `SRV-${c.id_servicio}`;

      loadBillingHistory();
    }

    function onSelectService(serviceId) {
      loadDashboard(serviceId);
    }

    async function loadBillingHistory() {
      if (!currentServiceId) return;
      try {
        const res = await fetch(`/api/portal/billing-history?serviceId=${currentServiceId}&token=${encodeURIComponent(currentToken)}`);
        const data = await res.json();
        const tbody = document.getElementById('invoicesTbody');

        if (data.success && data.invoices && data.invoices.length > 0) {
          tbody.innerHTML = data.invoices.map(inv => `
            <tr>
              <td><strong>#${inv.folio || inv.id}</strong></td>
              <td>${inv.fecha_emision || 'N/A'}</td>
              <td>$${Number(inv.monto || 0).toFixed(2)}</td>
              <td>
                <span class="billing-status-tag ${inv.estado.toLowerCase().includes('pagad') ? 'tag-paid' : 'tag-pending'}" style="font-size: 10px; padding: 2px 6px;">
                  ${inv.estado}
                </span>
              </td>
              <td>
                ${inv.pdf_url ? `<a href="${inv.pdf_url}" target="_blank" class="btn-icon" style="display:inline-flex; width:28px; height:28px;" title="Ver PDF"><i class="fa-solid fa-file-pdf"></i></a>` : ''}
                ${!inv.estado.toLowerCase().includes('pagad') && inv.link_pago ? `<a href="${inv.link_pago}" target="_blank" class="btn-primary" style="display:inline-flex; width:auto; padding:4px 8px; font-size:11px;" title="Pagar">Pagar</a>` : ''}
              </td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Sin facturas pendientes registradas.</td></tr>`;
        }
      } catch {}
    }

    async function refreshSignal() {
      showToast('Verificando potencia óptica...');
      await loadDashboard(currentServiceId);
      showToast('Señal actualizada.');
    }

    async function rebootModem() {
      const btn = document.getElementById('btnReboot');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando orden...';

      try {
        const res = await fetch('/api/portal/reboot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: currentServiceId })
        });
        const data = await res.json();
        showToast(data.message || 'Señal de reinicio enviada');
      } catch {
        showToast('No se pudo reiniciar el módem.');
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-power-off"></i> Reiniciar mi Módem';
        }, 5000);
      }
    }

    function toggleWifiPassVisibility() {
      isPassVisible = !isPassVisible;
      document.getElementById('wifiPass').innerText = isPassVisible ? currentWifiRealPass : '••••••••';
    }

    function copyWifiSsid() {
      navigator.clipboard.writeText(document.getElementById('wifiSsid').innerText);
      showToast('Nombre de red copiado');
    }

    function copyWifiPass() {
      navigator.clipboard.writeText(currentWifiRealPass);
      showToast('Contraseña Wi-Fi copiada');
    }

    function copyBankClabe() {
      navigator.clipboard.writeText(document.getElementById('bankClabeVal').innerText);
      showToast('CLABE copiada al portapapeles');
    }

    function openWifiModal() {
      document.getElementById('modalSsid').value = document.getElementById('wifiSsid').innerText;
      document.getElementById('modalPass').value = '';
      document.getElementById('modalWifi').style.display = 'flex';
    }

    function openQrModal() {
      const ssid = document.getElementById('wifiSsid').innerText;
      const pass = currentWifiRealPass;
      const qrData = `WIFI:T:WPA;S:${ssid};P:${pass};;`;

      const container = document.getElementById('qrcodeContainer');
      container.innerHTML = '';
      new QRCode(container, {
        text: qrData,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      document.getElementById('modalQr').style.display = 'flex';
    }

    function openBankModal() {
      document.getElementById('modalBank').style.display = 'flex';
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    async function handleSaveWifi(e) {
      e.preventDefault();
      const ssid = document.getElementById('modalSsid').value.trim();
      const password = document.getElementById('modalPass').value;

      try {
        const res = await fetch('/api/portal/wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: currentServiceId, ssid, password })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Wi-Fi actualizado con éxito.');
          closeModal('modalWifi');
          loadDashboard(currentServiceId);
        } else {
          showToast(data.message || 'Error al actualizar Wi-Fi.');
        }
      } catch {
        showToast('Error al conectar con la OLT.');
      }
    }
  </script>
</body>
</html>
`;
}
