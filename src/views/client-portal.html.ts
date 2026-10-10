import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';

/**
 * Genera el HTML completo para el Portal Móvil / PWA de Clientes
 * Diseñado 100% para celulares (Mobile-First), interfaz limpia, cero tecnicismos y muy intuitiva.
 */
export function getClientPortalHtml(): string {
  const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
  const supportPhone = SettingsService.get('SUPPORT_PHONE', 'SUPPORT_PHONE', config.isp.soporteHumanoPhone || '7721284398');
  const bankName = SettingsService.get('PAYMENT_BANK_NAME', 'PAYMENT_BANK_NAME', 'BBVA Bancomer');
  const bankClabe = SettingsService.get('PAYMENT_BANK_CLABE', 'PAYMENT_BANK_CLABE', '012320001234567890');
  const bankAccount = SettingsService.get('PAYMENT_BANK_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '0123456789');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${ispName} · Mi Servicio</title>
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#0b1329">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${ispName}">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/portal-icon.svg">
  <link rel="apple-touch-icon" href="/portal-icon.svg">
  
  <!-- Google Fonts: Outfit & Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Font Awesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <!-- QRCode.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <style>
    :root {
      --bg-body: #080d1a;
      --bg-surface: #0f172a;
      --bg-card: #131d36;
      --bg-card-alt: #182342;
      --border-card: rgba(255, 255, 255, 0.08);
      --border-highlight: rgba(14, 165, 233, 0.35);
      --text-title: #ffffff;
      --text-body: #94a3b8;
      --text-muted: #64748b;
      --primary: #0284c7;
      --primary-gradient: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.12);
      --radius-sm: 12px;
      --radius-md: 18px;
      --radius-lg: 24px;
      --radius-full: 9999px;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-body);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 60%),
        radial-gradient(circle at 100% 100%, rgba(37, 99, 235, 0.08) 0%, transparent 50%);
      background-attachment: fixed;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 0;
    }

    /* App Wrapper Móvil / Tablet / Desktop Responsivo */
    .app-screen {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: transparent;
      padding: 16px 16px 80px 16px;
      gap: 16px;
      position: relative;
    }

    @media (min-width: 640px) {
      .app-screen {
        max-width: 640px;
        padding: 24px 20px 90px 20px;
        gap: 18px;
      }
    }

    @media (min-width: 1024px) {
      .app-screen {
        max-width: 720px;
        padding: 36px 24px 100px 24px;
        gap: 20px;
      }
    }

    /* Barra Superior */
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 4px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      background: var(--primary-gradient);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      color: white;
      box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
    }

    .brand-info h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-title);
      line-height: 1.2;
    }

    .brand-info span {
      font-size: 12px;
      color: #38bdf8;
      font-weight: 600;
    }

    .btn-header-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-card);
      color: var(--text-body);
      border-radius: var(--radius-full);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-header-action:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.12);
    }

    /* Selector de Contratos */
    .service-pill-select {
      background: var(--bg-card);
      border: 1px solid var(--border-highlight);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .service-pill-select label {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .select-styled {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      outline: none;
      width: 100%;
    }

    /* Banner Onboarding (Crear Contraseña) */
    .onboarding-card {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(37, 99, 235, 0.18) 100%);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: var(--radius-lg);
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(14, 165, 233, 0.12);
      animation: pulseBorder 3s infinite ease-in-out;
    }

    @keyframes pulseBorder {
      0%, 100% { border-color: rgba(56, 189, 248, 0.35); }
      50% { border-color: rgba(56, 189, 248, 0.7); }
    }

    .onboarding-title {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onboarding-desc {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .onboarding-desc strong {
      color: #38bdf8;
    }

    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Tarjetas Principales */
    .app-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-head-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-title);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-head-title i {
      color: #38bdf8;
      font-size: 16px;
    }

    /* Estado de Conexión Amigable */
    .status-banner-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-pulse-circle {
      width: 14px;
      height: 14px;
      border-radius: var(--radius-full);
      background: var(--success);
      box-shadow: 0 0 12px var(--success);
      flex-shrink: 0;
    }

    .status-pulse-circle.red {
      background: var(--danger);
      box-shadow: 0 0 12px var(--danger);
    }

    .status-pulse-circle.yellow {
      background: var(--warning);
      box-shadow: 0 0 12px var(--warning);
    }

    .status-text-main {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
    }

    .status-text-sub {
      font-size: 12px;
      color: var(--text-body);
    }

    .status-speed-badge {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Wi-Fi Card Items */
    .wifi-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .wifi-item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .wifi-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wifi-val {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .wifi-val.mono {
      font-family: 'Outfit', monospace;
      color: #38bdf8;
      letter-spacing: 1px;
    }

    .wifi-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .btn-action-icon {
      width: 38px;
      height: 38px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-card);
      color: var(--text-body);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-action-icon:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
    }

    /* Estado de Cuenta */
    .billing-hero {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .billing-hero-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .billing-hero-amount {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
    }

    .billing-hero-date {
      font-size: 12px;
      color: var(--text-body);
    }

    .badge-status {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-status.paid {
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-status.pending {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Botones Principales */
    .btn-main {
      background: var(--primary-gradient);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      padding: 13px 18px;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
      transition: all 0.2s ease;
      text-decoration: none;
      width: 100%;
    }

    .btn-main:active {
      transform: scale(0.97);
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-card);
      color: #f1f5f9;
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      text-decoration: none;
      width: 100%;
      transition: all 0.2s ease;
    }

    .btn-outline:active {
      background: rgba(255, 255, 255, 0.1);
      transform: scale(0.98);
    }

    .btn-whatsapp {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
      width: 100%;
    }

    .btn-whatsapp:active {
      transform: scale(0.97);
    }

    /* Formularios y Cajas de Texto */
    .form-input-group {
      display: flex;
      gap: 8px;
    }

    .form-input {
      background: var(--bg-surface);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      color: #ffffff;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      width: 100%;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
    }

    /* Vistas de Login / Vincular */
    .auth-box {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      padding: 24px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      margin-top: 10px;
    }

    .auth-title {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      text-align: center;
    }

    .auth-sub {
      font-size: 13px;
      color: var(--text-body);
      text-align: center;
      line-height: 1.4;
    }

    /* Modales */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-sheet {
      background: #0f172a;
      border: 1px solid var(--border-highlight);
      border-radius: var(--radius-lg);
      padding: 22px 18px;
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
    }

    .modal-sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-sheet-title {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: #fff;
    }

    .btn-close-modal {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: var(--text-body);
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      background: #1e293b;
      border: 1px solid #38bdf8;
      color: #fff;
      padding: 12px 20px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 90%;
      text-align: center;
    }

    #toast.show {
      transform: translateX(-50%) translateY(0);
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>

  <div class="app-screen">

    <!-- Header Móvil -->
    <header class="app-header">
      <div class="brand-group">
        <div class="brand-icon"><i class="fa-solid fa-wifi"></i></div>
        <div class="brand-info">
          <h1>${ispName}</h1>
          <span id="headerGreeting">Mi Conexión</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="btnPwa" class="btn-header-action hidden"><i class="fa-solid fa-download"></i> App</button>
        <button id="btnLogout" class="btn-header-action hidden" onclick="logoutClient()" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div>
    </header>

    <!-- 0. VISTA CARGANDO INICIAL (Apertura Instantánea) -->
    <div id="viewLoading" class="auth-box" style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 38px; color: #38bdf8; margin-bottom: 14px;">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <div style="font-size: 17px; font-weight: 700; color: #fff;">Conectando a tu Portal...</div>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Sincronizando módem y servicios en vivo</p>
    </div>

    <!-- 1. VISTA DE INICIO DE SESIÓN -->
    <div id="viewLogin" class="auth-box hidden">
      <div class="auth-title">Iniciar Sesión</div>
      <p class="auth-sub">Ingresa tu número celular y tu contraseña para ver tu red, facturas y saldo.</p>

      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="tel" id="loginPhone" class="form-input" placeholder="Número de celular (10 dígitos)" maxlength="10" required>
        <input type="password" id="loginPass" class="form-input" placeholder="Tu contraseña" required>
        <button type="submit" class="btn-main"><i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi Cuenta</button>
      </form>

      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
        <span style="color: #38bdf8; cursor: pointer;" onclick="showForgot()">¿Olvidaste tu clave?</span>
        <span style="color: #38bdf8; cursor: pointer;" onclick="showRegister()">Crear contraseña</span>
      </div>
    </div>

    <!-- 1.5 VISTA VINCULAR WHATSAPP (Si el número no coincide de inicio) -->
    <div id="viewNotFound" class="auth-box hidden">
      <div style="text-align: center; font-size: 38px; color: #38bdf8; margin-bottom: 2px;">
        <i class="fa-solid fa-link"></i>
      </div>
      <div class="auth-title">Vincular mi WhatsApp</div>
      <p class="auth-sub">
        No encontramos un servicio con el celular <strong id="notFoundPhoneLabel" style="color: #38bdf8;"></strong>.<br>
        Ingresa tu <strong>Folio de servicio</strong> (ej. 696 o 2) o tu <strong>Nombre completo</strong> para vincularlo en 1 clic:
      </p>

      <form onsubmit="handleLinkContract(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="linkIdentifier" class="form-input" placeholder="Folio (ej. 696) o Nombre completo" required>
        <button type="submit" class="btn-main"><i class="fa-solid fa-check-circle"></i> Vincular y Entrar</button>
      </form>

      <div style="text-align: center; margin-top: 4px;">
        <span style="color: #94a3b8; font-size: 13px; cursor: pointer;" onclick="showLogin()">Iniciar sesión normal</span>
      </div>
    </div>

    <!-- 2. VISTA CREAR CONTRASEÑA -->
    <div id="viewRegister" class="auth-box hidden">
      <div class="auth-title">Activar mi Contraseña</div>
      <p class="auth-sub">Crea una contraseña segura para entrar a tu cuenta cuando quieras.</p>

      <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="tel" id="regPhone" class="form-input" placeholder="Número celular (10 dígitos)" maxlength="10" required>
        <input type="password" id="regPass" class="form-input" placeholder="Crea tu contraseña (mínimo 6 letras o números)" minlength="6" required>
        <button type="submit" class="btn-main"><i class="fa-solid fa-key"></i> Guardar y Entrar</button>
      </form>

      <div style="text-align: center; margin-top: 4px;">
        <span style="color: #38bdf8; font-size: 13px; cursor: pointer;" onclick="showLogin()">Ya tengo contraseña · Entrar</span>
      </div>
    </div>

    <!-- 3. VISTA RECUPERAR CLAVE -->
    <div id="viewForgot" class="auth-box hidden">
      <div class="auth-title">Recuperar Contraseña</div>
      <p class="auth-sub">Te enviaremos un código de seguridad de 6 dígitos a tu WhatsApp.</p>

      <div id="forgotStep1">
        <form onsubmit="handleSendOtp(event)" style="display: flex; flex-direction: column; gap: 12px;">
          <input type="tel" id="forgotPhone" class="form-input" placeholder="Tu número de celular" maxlength="10" required>
          <button type="submit" class="btn-main"><i class="fa-brands fa-whatsapp"></i> Enviar Código a mi WhatsApp</button>
        </form>
      </div>

      <div id="forgotStep2" class="hidden">
        <form onsubmit="handleResetPassword(event)" style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="resetOtp" class="form-input" placeholder="Código de 6 dígitos recibido" maxlength="6" required>
          <input type="password" id="resetNewPass" class="form-input" placeholder="Nueva contraseña (mín 6 caracteres)" minlength="6" required>
          <button type="submit" class="btn-main"><i class="fa-solid fa-rotate"></i> Restablecer y Entrar</button>
        </form>
      </div>

      <div style="text-align: center; margin-top: 6px;">
        <span style="color: #94a3b8; font-size: 13px; cursor: pointer;" onclick="showLogin()">Regresar al inicio</span>
      </div>
    </div>

    <!-- 4. DASHBOARD DEL CLIENTE (100% AMIGABLE Y VISUAL) -->
    <div id="viewDashboard" class="hidden" style="display: flex; flex-direction: column; gap: 14px;">

      <!-- Banner Amigable de Creación de Contraseña -->
      <div id="onboardingBanner" class="onboarding-card hidden">
        <div class="onboarding-title">
          <i class="fa-solid fa-shield-halved" style="color: #38bdf8;"></i>
          <span>¡Asegura tu cuenta de cliente!</span>
        </div>
        <p class="onboarding-desc">
          📱 <strong>Tu usuario es tu celular:</strong> <span id="onboardingPhoneLabel"></span><br>
          🔒 Crea tu contraseña para entrar desde cualquier teléfono o computadora:
        </p>
        <form onsubmit="handleSaveOnboardingPassword(event)" class="onboarding-form">
          <input type="password" id="onboardingPassInput" class="form-input" placeholder="Crea tu contraseña (mín 6 caracteres)" minlength="6" required>
          <button type="submit" class="btn-main" style="padding: 11px 16px;"><i class="fa-solid fa-floppy-disk"></i> Guardar mi Contraseña</button>
        </form>
      </div>

      <!-- Selector si el titular tiene múltiples casas o contratos -->
      <div id="multiServiceBox" class="service-pill-select hidden">
        <label><i class="fa-solid fa-house"></i> Selecciona tu Domicilio / Contrato</label>
        <select id="serviceSelect" class="select-styled" onchange="onSwitchService(this.value)">
          <!-- Opciones dinámicas -->
        </select>
      </div>

      <!-- Alerta Amigable de Mantenimiento / Falla de Zona -->
      <div id="outageBox" class="app-card hidden" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.4);">
        <div style="display: flex; align-items: center; gap: 10px; color: #f59e0b; font-weight: 700;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 20px;"></i>
          <span id="outageTitle">Mantenimiento en tu Zona</span>
        </div>
        <p id="outageDesc" style="font-size: 13px; color: #e2e8f0; line-height: 1.4;"></p>
      </div>

      <!-- TARJETA 1: ESTADO DEL INTERNET (Cero tecnicismos) -->
      <div class="app-card">
        <div class="card-head">
          <div class="card-head-title"><i class="fa-solid fa-circle-nodes"></i> Estado de tu Conexión</div>
          <span id="planSpeedTag" class="status-speed-badge">40 Megas</span>
        </div>

        <div class="status-banner-box">
          <div class="status-left">
            <div id="statusPulseDot" class="status-pulse-circle"></div>
            <div>
              <div id="statusFriendlyTitle" class="status-text-main">Tu internet está funcionando al 100%</div>
              <div id="statusFriendlySub" class="status-text-sub">Señal excelente en tu domicilio</div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-body); padding: 0 4px;">
          <span>Titular: <strong id="titularName" style="color: #fff;">-</strong></span>
          <span>Folio: <strong id="contractFolio" style="color: #38bdf8;">#-</strong></span>
        </div>

        <button id="btnRebootModem" class="btn-outline" onclick="triggerModemReboot()">
          <i class="fa-solid fa-rotate"></i> Optimizar / Reiniciar mi Conexión
        </button>
      </div>

      <!-- TARJETA 2: TU RED WI-FI DE CASA -->
      <div class="app-card">
        <div class="card-head">
          <div class="card-head-title"><i class="fa-solid fa-wifi"></i> Tu Red Wi-Fi</div>
          <button class="btn-header-action" onclick="openModalWifi()" style="padding: 6px 12px; font-size: 12px;">
            <i class="fa-solid fa-pen"></i> Cambiar
          </button>
        </div>

        <!-- Nombre de red -->
        <div class="wifi-item">
          <div class="wifi-item-info">
            <span class="wifi-label">Nombre de Red</span>
            <span id="wifiSsidLabel" class="wifi-val">Cargando...</span>
          </div>
          <button class="btn-action-icon" onclick="copyWifiSsid()" title="Copiar nombre de red"><i class="fa-solid fa-copy"></i></button>
        </div>

        <!-- Contraseña -->
        <div class="wifi-item">
          <div class="wifi-item-info">
            <span class="wifi-label">Contraseña Wi-Fi</span>
            <span id="wifiPassLabel" class="wifi-val mono">••••••••</span>
          </div>
          <div class="wifi-actions">
            <button class="btn-action-icon" onclick="toggleShowWifiPass()" title="Ver u ocultar contraseña"><i id="eyeIcon" class="fa-solid fa-eye"></i></button>
            <button class="btn-action-icon" onclick="copyWifiPass()" title="Copiar contraseña"><i class="fa-solid fa-copy"></i></button>
            <button class="btn-action-icon" onclick="openQrModal()" title="Compartir con visitas"><i class="fa-solid fa-qrcode"></i></button>
          </div>
        </div>
      </div>

      <!-- TARJETA 3: TU SALDO Y PAGOS -->
      <div class="app-card">
        <div class="card-head">
          <div class="card-head-title"><i class="fa-solid fa-receipt"></i> Tu Saldo y Recibos</div>
          <span id="billingBadge" class="badge-status paid">Al Corriente</span>
        </div>

        <div class="billing-hero">
          <div class="billing-hero-left">
            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Saldo a Pagar</span>
            <div id="billingAmountLabel" class="billing-hero-amount">$0.00</div>
            <div id="billingDueLabel" class="billing-hero-date">Día 5 de cada mes</div>
          </div>
          <button class="btn-outline" style="width: auto; padding: 10px 14px; font-size: 13px;" onclick="openModalBank()">
            <i class="fa-solid fa-building-columns"></i> Datos de Pago
          </button>
        </div>

        <!-- Lista limpia de recibos -->
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Historial de Recibos</div>
          <div id="invoicesList" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 10px;">Consultando recibos...</div>
          </div>
        </div>
      </div>

      <!-- TARJETA 4: ASISTENCIA Y SOPORTE DIRECTO -->
      <div class="app-card" style="text-align: center; align-items: center; gap: 10px;">
        <i class="fa-brands fa-whatsapp" style="font-size: 36px; color: #10b981;"></i>
        <div style="font-size: 16px; font-weight: 700; color: #fff;">¿Tienes alguna duda o problema?</div>
        <p style="font-size: 13px; color: var(--text-body); max-width: 320px;">Estamos listos para atenderte 24/7 por WhatsApp.</p>
        <a id="btnSupportWa" href="https://wa.me/${supportPhone}?text=Hola,%20necesito%20apoyo%20con%20mi%20servicio" target="_blank" class="btn-whatsapp">
          <i class="fa-brands fa-whatsapp"></i> Chatear con Soporte
        </a>
      </div>

    </div>

  </div>

  <!-- MODAL: CAMBIAR CLAVE WI-FI -->
  <div id="modalWifi" class="modal-overlay">
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title">Cambiar Nombre o Clave Wi-Fi</div>
        <button class="btn-close-modal" onclick="closeModal('modalWifi')">&times;</button>
      </div>
      <form onsubmit="handleSaveWifi(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 4px; display: block;">Nombre de Red (SSID)</label>
          <input type="text" id="modalSsidInput" class="form-input" required>
        </div>
        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 4px; display: block;">Nueva Contraseña (mínimo 8 caracteres)</label>
          <input type="password" id="modalPassInput" class="form-input" minlength="8" placeholder="Escribe tu nueva clave" required>
        </div>
        <button type="submit" class="btn-main" style="margin-top: 6px;"><i class="fa-solid fa-save"></i> Aplicar en mi Módem</button>
      </form>
    </div>
  </div>

  <!-- MODAL: CÓDIGO QR PARA VISITAS -->
  <div id="modalQr" class="modal-overlay">
    <div class="modal-sheet" style="text-align: center; align-items: center;">
      <div class="modal-sheet-header" style="width: 100%;">
        <div class="modal-sheet-title">Conectar por Código QR</div>
        <button class="btn-close-modal" onclick="closeModal('modalQr')">&times;</button>
      </div>
      <p style="font-size: 13px; color: var(--text-body);">Pídele a tus visitas que escaneen este código con la cámara de su celular para conectarse sin escribir la clave:</p>
      <div id="qrcodeBox" style="background: white; padding: 16px; border-radius: 16px; margin: 10px auto;"></div>
      <button class="btn-outline" onclick="closeModal('modalQr')">Listo, cerrar</button>
    </div>
  </div>

  <!-- MODAL: DATOS BANCARIOS (SPEI) -->
  <div id="modalBank" class="modal-overlay">
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title">Datos para Pago por Transferencia</div>
        <button class="btn-close-modal" onclick="closeModal('modalBank')">&times;</button>
      </div>
      <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
        <div><strong>Banco:</strong> ${bankName}</div>
        <div><strong>CLABE Interbancaria:</strong> <span id="bankClabeText" style="color: #38bdf8; font-family: monospace; font-weight: 700;">${bankClabe}</span></div>
        <div><strong>Cuenta:</strong> ${bankAccount}</div>
        <div><strong>Beneficiario:</strong> ${ispName}</div>
        <div><strong>Concepto / Referencia:</strong> <strong id="bankRefText" style="color: #10b981;">SRV-100</strong></div>
      </div>
      <button class="btn-main" onclick="copyClabe()"><i class="fa-solid fa-copy"></i> Copiar CLABE Interbancaria</button>
    </div>
  </div>

  <!-- TOAST NOTIFICACIÓN -->
  <div id="toast"><i class="fa-solid fa-circle-check"></i> <span id="toastMessage">Listo</span></div>

  <script>
    let currentToken = localStorage.getItem('cp_token') || '';
    let currentPhone = localStorage.getItem('cp_phone') || '';
    let currentContractId = '';
    let currentServices = [];
    let realWifiPassword = '';
    let isPassRevealed = false;
    let isLoadingDashboard = false;

    document.addEventListener('DOMContentLoaded', () => {
      initPwa();
      initPortal();
    });

    function initPortal() {
      try {
        const params = new URLSearchParams(window.location.search);
        const autoAuth = params.get('auth') || params.get('token') || '';
        const resetCode = params.get('resetCode') || '';
        const rawP = params.get('p') || params.get('phone') || '';
        const cleanP = rawP.replace(/[^0-9]/g, '').slice(-10);

        if (cleanP) {
          currentPhone = cleanP;
          localStorage.setItem('cp_phone', cleanP);
          const lPhone = document.getElementById('loginPhone');
          if (lPhone) lPhone.value = cleanP;
          const rPhone = document.getElementById('regPhone');
          if (rPhone) rPhone.value = cleanP;
          const fPhone = document.getElementById('forgotPhone');
          if (fPhone) fPhone.value = cleanP;
        }

        if (autoAuth) {
          localStorage.setItem('cp_token', autoAuth);
          currentToken = autoAuth;
        }

        if (resetCode && cleanP) {
          showForgotStep2(cleanP, resetCode);
        } else if (currentToken || currentPhone) {
          loadDashboard();
        } else {
          showLogin();
        }
      } catch (err) {
        console.warn('[Portal] Error initPortal:', err);
        showLogin();
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
        const btn = document.getElementById('btnPwa');
        if (btn) {
          btn.classList.remove('hidden');
          btn.onclick = () => { deferredPrompt.prompt(); };
        }
      });
    }

    function showToast(text) {
      const t = document.getElementById('toast');
      document.getElementById('toastMessage').innerText = text;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }

    function hideAllViews() {
      const vLoad = document.getElementById('viewLoading');
      if (vLoad) vLoad.classList.add('hidden');
      document.getElementById('viewLogin').classList.add('hidden');
      document.getElementById('viewNotFound').classList.add('hidden');
      document.getElementById('viewRegister').classList.add('hidden');
      document.getElementById('viewForgot').classList.add('hidden');
      document.getElementById('viewDashboard').classList.add('hidden');
    }

    function showLoading() {
      hideAllViews();
      const vLoad = document.getElementById('viewLoading');
      if (vLoad) vLoad.classList.remove('hidden');
    }

    function showLogin() {
      hideAllViews();
      document.getElementById('viewLogin').classList.remove('hidden');
      document.getElementById('btnLogout').classList.add('hidden');
    }

    function showNotFound(phone) {
      hideAllViews();
      document.getElementById('viewNotFound').classList.remove('hidden');
      document.getElementById('notFoundPhoneLabel').innerText = phone || currentPhone;
    }

    function showRegister() {
      hideAllViews();
      document.getElementById('viewRegister').classList.remove('hidden');
    }

    function showForgot() {
      hideAllViews();
      document.getElementById('viewForgot').classList.remove('hidden');
      document.getElementById('forgotStep1').classList.remove('hidden');
      document.getElementById('forgotStep2').classList.add('hidden');
    }

    function showForgotStep2(phone, code) {
      showForgot();
      document.getElementById('forgotStep1').classList.add('hidden');
      document.getElementById('forgotStep2').classList.remove('hidden');
      if (code) document.getElementById('resetOtp').value = code;
      if (phone) currentPhone = phone;
    }

    function logoutClient() {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_phone');
      currentToken = '';
      currentPhone = '';
      showLogin();
      showToast('Sesión cerrada');
    }

    // Handlers de Autenticación
    async function handleLogin(e) {
      e.preventDefault();
      const phone = document.getElementById('loginPhone').value.trim();
      const password = document.getElementById('loginPass').value;

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
          showToast('¡Bienvenido!');
          loadDashboard();
        } else if (data.needsRegistration) {
          document.getElementById('regPhone').value = phone;
          showToast(data.message);
          showRegister();
        } else {
          showToast(data.message || 'Error al iniciar sesión');
        }
      } catch {
        showToast('Error de conexión');
      }
    }

    async function handleLinkContract(e) {
      e.preventDefault();
      const identifier = document.getElementById('linkIdentifier').value.trim();
      const phone = currentPhone || localStorage.getItem('cp_phone') || '';

      if (!identifier) {
        showToast('Ingresa tu folio o nombre completo');
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]') || document.querySelector('#viewNotFound button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vinculando...';
      }

      try {
        const res = await fetch('/api/portal/auth/link-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, identifier })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('cp_token', data.token);
          currentToken = data.token;
          if (data.client && data.client.telefono) {
            localStorage.setItem('cp_phone', data.client.telefono);
            currentPhone = data.client.telefono;
          } else if (phone) {
            localStorage.setItem('cp_phone', phone);
            currentPhone = phone;
          }
          showToast('✅ ¡WhatsApp vinculado con éxito!');
          hideAllViews();
          showLoading();
          isLoadingDashboard = false;
          const targetServiceId = data.client ? data.client.id_servicio : undefined;
          await loadDashboard(targetServiceId);
        } else {
          showToast(data.message || 'No se encontró el contrato');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }
      } catch (err) {
        showToast('Error al vincular servicio');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    }

    async function handleRegister(e) {
      e.preventDefault();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPass').value;

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
          showToast('¡Cuenta activada!');
          loadDashboard();
        } else {
          showToast(data.message || 'Error al crear cuenta');
        }
      } catch {
        showToast('Error de conexión');
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
          showToast(data.message || 'Error al enviar código');
        }
      } catch {
        showToast('Error al conectar');
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
        showToast('Error de conexión');
      }
    }

    async function handleSaveOnboardingPassword(e) {
      e.preventDefault();
      const pass = document.getElementById('onboardingPassInput').value;
      if (!pass || pass.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      try {
        const res = await fetch('/api/portal/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: currentPhone, password: pass })
        });
        const d = await res.json();
        if (d.success) {
          showToast('✅ ¡Contraseña guardada! Tu usuario es ' + currentPhone);
          document.getElementById('onboardingBanner').classList.add('hidden');
          if (d.token) {
            localStorage.setItem('cp_token', d.token);
            currentToken = d.token;
          }
        } else {
          showToast(d.message || 'Error al guardar contraseña');
        }
      } catch {
        showToast('Error de conexión');
      }
    }

    // Dashboard Data Loading (Carga Instantánea y Conexión Segura)
    async function loadDashboard(serviceId) {
      if (isLoadingDashboard) return;
      isLoadingDashboard = true;

      const targetPhone = currentPhone || localStorage.getItem('cp_phone') || '';
      const targetToken = currentToken || localStorage.getItem('cp_token') || '';

      if (!targetPhone && !targetToken) {
        isLoadingDashboard = false;
        showLogin();
        return;
      }

      // Si el dashboard no está visible todavía, mostrar spinner
      const isDashVisible = !document.getElementById('viewDashboard').classList.contains('hidden');
      if (!isDashVisible) {
        showLoading();
      }

      try {
        const url = '/api/portal/me?token=' + encodeURIComponent(targetToken) + '&p=' + encodeURIComponent(targetPhone) + (serviceId ? '&serviceId=' + encodeURIComponent(serviceId) : '');
        
        // AbortController para que jamás se quede congelado
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutTimer);

        const data = await res.json();

        if (!data.success || !data.client) {
          if (targetPhone) {
            showNotFound(targetPhone);
          } else {
            showLogin();
          }
          return;
        }

        if (data.token) {
          localStorage.setItem('cp_token', data.token);
          currentToken = data.token;
        }
        if (data.client && data.client.telefono) {
          localStorage.setItem('cp_phone', data.client.telefono);
          currentPhone = data.client.telefono;
        }

        hideAllViews();
        document.getElementById('viewDashboard').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');

        renderDashboard(data);
      } catch (err) {
        console.warn('[Portal] Error al cargar datos:', err);
        if (!isDashVisible) {
          if (targetPhone) {
            showNotFound(targetPhone);
          } else {
            showLogin();
          }
        }
        showToast('Verificando conexión...');
      } finally {
        isLoadingDashboard = false;
      }
    }

    function renderDashboard(data) {
      const c = data.client;
      currentContractId = String(c.id_servicio);
      currentServices = data.relatedServices || [];
      currentPhone = c.telefono || currentPhone;

      // Header Saludo
      const firstName = (c.nombre || '').split(' ')[0] || 'Cliente';
      document.getElementById('headerGreeting').innerText = 'Hola, ' + firstName;
      document.getElementById('titularName').innerText = c.nombre;
      document.getElementById('contractFolio').innerText = '#' + c.id_servicio;

      // Plan amigable
      const cleanPlan = (c.plan_internet || 'Fibra Óptica').replace(/^paquete\\s+/i, '');
      document.getElementById('planSpeedTag').innerText = cleanPlan;

      // Onboarding Password Banner
      const onb = document.getElementById('onboardingBanner');
      if (data.hasPassword === false) {
        onb.classList.remove('hidden');
        document.getElementById('onboardingPhoneLabel').innerText = currentPhone;
      } else {
        onb.classList.add('hidden');
      }

      // Multi-Servicio
      const multiBox = document.getElementById('multiServiceBox');
      const select = document.getElementById('serviceSelect');
      if (currentServices.length > 1) {
        multiBox.classList.remove('hidden');
        select.innerHTML = currentServices.map(s => {
          const sel = String(s.id_servicio) === currentContractId ? 'selected' : '';
          const dir = s.direccion || s.router || 'Domicilio registrado';
          return '<option value="' + s.id_servicio + '" ' + sel + '>🏠 ' + dir + ' (Folio #' + s.id_servicio + ')</option>';
        }).join('');
      } else {
        multiBox.classList.add('hidden');
      }

      // Estado Amigable (Cero dBm o tecnicismos)
      const dot = document.getElementById('statusPulseDot');
      const title = document.getElementById('statusFriendlyTitle');
      const sub = document.getElementById('statusFriendlySub');
      const sig = data.signal || {};

      if (sig.status === 'ONLINE' || c.estado === 'activo') {
        dot.className = 'status-pulse-circle';
        title.innerText = 'Tu internet está funcionando al 100%';
        sub.innerText = 'Señal excelente y estable';
      } else if (sig.status === 'LOS' || sig.status === 'OFFLINE') {
        dot.className = 'status-pulse-circle red';
        title.innerText = 'Módem sin señal de fibra';
        sub.innerText = 'Verifica que el cable amarillo esté bien conectado';
      } else {
        dot.className = 'status-pulse-circle yellow';
        title.innerText = 'Módem sincronizando conexión';
        sub.innerText = 'Revisa tu equipo';
      }

      // Wi-Fi Real (Directo de módem / OLT)
      const wifi = data.wifi || {};
      const rawSsid = wifi.ssid24 || ('CloudWare_' + c.id_servicio);
      document.getElementById('wifiSsidLabel').innerText = rawSsid;
      realWifiPassword = wifi.password || '********';
      document.getElementById('wifiPassLabel').innerText = isPassRevealed ? realWifiPassword : '••••••••';

      // Facturación y Saldo
      const balance = Number(c.saldo || 0);
      document.getElementById('billingAmountLabel').innerText = '$' + balance.toFixed(2);
      document.getElementById('billingDueLabel').innerText = 'Corte: ' + (c.fecha_corte || ('Día ' + (c.dia_corte || 5) + ' del mes'));

      const bBadge = document.getElementById('billingBadge');
      if (balance <= 0) {
        bBadge.className = 'badge-status paid';
        bBadge.innerText = 'Al Corriente';
      } else {
        bBadge.className = 'badge-status pending';
        bBadge.innerText = 'Pago Pendiente';
      }

      document.getElementById('bankRefText').innerText = 'SRV-' + c.id_servicio;

      loadInvoicesHistory();
    }

    function onSwitchService(serviceId) {
      loadDashboard(serviceId);
    }

    async function loadInvoicesHistory() {
      if (!currentContractId) return;
      try {
        const res = await fetch('/api/portal/billing-history?serviceId=' + currentContractId + '&token=' + encodeURIComponent(currentToken));
        const data = await res.json();
        const container = document.getElementById('invoicesList');

        if (data.success && data.invoices && data.invoices.length > 0) {
          container.innerHTML = data.invoices.map(inv => {
            const isPaid = String(inv.estado || '').toLowerCase().includes('pagad');
            const statusClass = isPaid ? 'paid' : 'pending';
            const pdfBtn = inv.pdf_url ? '<a href="' + inv.pdf_url + '" target="_blank" class="btn-action-icon" style="width:32px; height:32px;" title="Ver PDF"><i class="fa-solid fa-file-pdf"></i></a>' : '';
            return '<div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:10px 12px;">' +
              '<div>' +
                '<div style="font-weight:700; font-size:13px; color:#fff;">Recibo #' + (inv.folio || inv.id) + '</div>' +
                '<div style="font-size:11px; color:var(--text-muted);">' + (inv.fecha_emision || 'Reciente') + '</div>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:8px;">' +
                '<span style="font-weight:700; font-size:14px; color:#fff;">$' + Number(inv.monto || 0).toFixed(2) + '</span>' +
                '<span class="badge-status ' + statusClass + '" style="font-size:10px; padding:2px 8px;">' + inv.estado + '</span>' +
                pdfBtn +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:10px;">Estás al corriente con tus pagos 👍</div>';
        }
      } catch {}
    }

    async function triggerModemReboot() {
      const btn = document.getElementById('btnRebootModem');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reiniciando tu módem...';

      try {
        const res = await fetch('/api/portal/reboot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: currentContractId })
        });
        const d = await res.json();
        showToast(d.message || 'Módem reiniciado. Espera 1 minuto.');
      } catch {
        showToast('No se pudo enviar la orden de reinicio');
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Optimizar / Reiniciar mi Conexión';
        }, 5000);
      }
    }

    function toggleShowWifiPass() {
      isPassRevealed = !isPassRevealed;
      document.getElementById('wifiPassLabel').innerText = isPassRevealed ? realWifiPassword : '••••••••';
      document.getElementById('eyeIcon').className = isPassRevealed ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }

    function copyWifiSsid() {
      navigator.clipboard.writeText(document.getElementById('wifiSsidLabel').innerText);
      showToast('Nombre de Wi-Fi copiado');
    }

    function copyWifiPass() {
      navigator.clipboard.writeText(realWifiPassword);
      showToast('Contraseña copiada');
    }

    function copyClabe() {
      navigator.clipboard.writeText(document.getElementById('bankClabeText').innerText);
      showToast('CLABE copiada al portapapeles');
    }

    function openModalWifi() {
      document.getElementById('modalSsidInput').value = document.getElementById('wifiSsidLabel').innerText;
      document.getElementById('modalPassInput').value = '';
      document.getElementById('modalWifi').style.display = 'flex';
    }

    function openQrModal() {
      const ssid = document.getElementById('wifiSsidLabel').innerText;
      const pass = realWifiPassword;
      const qrData = 'WIFI:T:WPA;S:' + ssid + ';P:' + pass + ';;';

      const box = document.getElementById('qrcodeBox');
      box.innerHTML = '';
      new QRCode(box, {
        text: qrData,
        width: 170,
        height: 170,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      document.getElementById('modalQr').style.display = 'flex';
    }

    function openModalBank() {
      document.getElementById('modalBank').style.display = 'flex';
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    async function handleSaveWifi(e) {
      e.preventDefault();
      const ssid = document.getElementById('modalSsidInput').value.trim();
      const password = document.getElementById('modalPassInput').value;

      try {
        const res = await fetch('/api/portal/wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: currentContractId, ssid, password })
        });
        const d = await res.json();
        if (d.success) {
          showToast('✅ ¡Wi-Fi actualizado!');
          closeModal('modalWifi');
          loadDashboard(currentContractId);
        } else {
          showToast(d.message || 'Error al actualizar Wi-Fi');
        }
      } catch {
        showToast('Error al conectar con el módem');
      }
    }
  </script>
</body>
</html>
`;
}
