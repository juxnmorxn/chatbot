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
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${ispName}">
  <meta name="application-name" content="${ispName}">
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
      transition: max-width 0.25s ease;
    }

    @media (min-width: 880px) {
      .app-screen {
        max-width: 1140px;
        padding: 24px 32px 100px 32px;
        gap: 20px;
      }

      .dashboard-cols {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: start;
      }
    }

    .dashboard-cols {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    .portal-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
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

    /* Selector visual de multi-servicio para titulares con varios contratos */
    .multi-service-section {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-highlight);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 20px;
      backdrop-filter: blur(12px);
    }

    .multi-service-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .multi-service-title {
      font-size: 13px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .multi-service-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
    }

    .service-card-item {
      background: var(--bg-surface);
      border: 2px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }

    .service-card-item:hover {
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(30, 41, 59, 0.8);
      transform: translateY(-2px);
    }

    .service-card-item.active {
      border-color: #38bdf8;
      background: rgba(14, 165, 233, 0.1);
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
    }

    .service-card-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: #0284c7;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Wi-Fi Dual-Band Styling */
    .wifi-band-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 14px;
      backdrop-filter: blur(10px);
    }

    .wifi-band-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .wifi-band-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.3px;
    }

    .wifi-band-tag.tag-24g {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .wifi-band-tag.tag-5g {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.3);
    }

    .wifi-band-hint {
      font-size: 11px;
      color: var(--text-muted);
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
    <!-- 4. DASHBOARD DEL CLIENTE (RESPONSIVO MÓVIL Y PANTALLAS GRANDES) -->
    <div id="viewDashboard" class="hidden">

      <!-- Banners de alerta que abarcan todo el ancho -->
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

      <!-- Selector interactivo si el titular tiene múltiples contratos / servicios -->
      <div id="multiServiceSection" class="multi-service-section hidden">
        <div class="multi-service-header">
          <div class="multi-service-title">
            <i class="fa-solid fa-layer-group"></i>
            <span>Tus Servicios / Domicilios (<strong id="multiServiceCount" style="color: #fff;">0</strong>)</span>
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">Toca para cambiar de contrato</span>
        </div>
        <div id="multiServiceCards" class="multi-service-grid">
          <!-- Tarjetas interactivas de cada contrato -->
        </div>
      </div>

      <!-- Alerta Amigable de Mantenimiento / Falla de Zona -->
      <div id="outageBox" class="app-card hidden" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.4);">
        <div style="display: flex; align-items: center; gap: 10px; color: #f59e0b; font-weight: 700;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 20px;"></i>
          <span id="outageTitle">Mantenimiento en tu Zona</span>
        </div>
        <p id="outageDesc" style="font-size: 13px; color: #e2e8f0; line-height: 1.4;"></p>
      </div>

      <!-- Contenedor responsivo: 2 columnas en pantallas grandes / 1 columna fluida en móvil -->
      <div class="dashboard-cols">

        <!-- COLUMNA 1: ESTADO DE CONEXIÓN Y RED WI-FI DUAL BAND -->
        <div class="portal-col">

          <!-- TARJETA 1: ESTADO DEL INTERNET -->
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
          </div>

          <!-- TARJETA 2: TU RED WI-FI DE CASA (DOBLE BANDA 2.4G Y 5G) -->
          <div class="app-card">
            <div class="card-head">
              <div class="card-head-title"><i class="fa-solid fa-wifi"></i> Tu Red Wi-Fi (Doble Banda)</div>
              <button class="btn-header-action" onclick="openModalWifi()" style="padding: 6px 12px; font-size: 12px;">
                <i class="fa-solid fa-pen"></i> Cambiar
              </button>
            </div>

            <!-- BANDA 2.4 GHz -->
            <div class="wifi-band-card">
              <div class="wifi-band-head">
                <div class="wifi-band-tag tag-24g">
                  <i class="fa-solid fa-tower-broadcast"></i> Red 2.4 GHz
                </div>
                <span class="wifi-band-hint">Mayor cobertura / Alcance</span>
              </div>

              <div class="wifi-item">
                <div class="wifi-item-info">
                  <span class="wifi-label">Nombre de Red (SSID)</span>
                  <span id="wifiSsid24Label" class="wifi-val">Cargando...</span>
                </div>
                <button class="btn-action-icon" onclick="copyWifiSsid24()" title="Copiar nombre de red"><i class="fa-solid fa-copy"></i></button>
              </div>

              <div class="wifi-item" style="margin-top: 8px;">
                <div class="wifi-item-info">
                  <span class="wifi-label">Contraseña Wi-Fi</span>
                  <span id="wifiPass24Label" class="wifi-val mono">••••••••</span>
                </div>
                <div class="wifi-actions">
                  <button class="btn-action-icon" onclick="toggleShowWifiPass24()" title="Ver u ocultar contraseña"><i id="eyeIcon24" class="fa-solid fa-eye"></i></button>
                  <button class="btn-action-icon" onclick="copyWifiPass24()" title="Copiar contraseña"><i class="fa-solid fa-copy"></i></button>
                  <button class="btn-action-icon" onclick="openQrModal('24')" title="Generar QR para visitas"><i class="fa-solid fa-qrcode"></i></button>
                </div>
              </div>
            </div>

            <!-- BANDA 5 GHz -->
            <div id="boxWifi5g" class="wifi-band-card" style="margin-top: 12px;">
              <div class="wifi-band-head">
                <div class="wifi-band-tag tag-5g">
                  <i class="fa-solid fa-bolt"></i> Red 5 GHz
                </div>
                <span class="wifi-band-hint">Ultra velocidad / Streaming</span>
              </div>

              <div class="wifi-item">
                <div class="wifi-item-info">
                  <span class="wifi-label">Nombre de Red (SSID)</span>
                  <span id="wifiSsid5gLabel" class="wifi-val">Cargando...</span>
                </div>
                <button class="btn-action-icon" onclick="copyWifiSsid5g()" title="Copiar nombre de red"><i class="fa-solid fa-copy"></i></button>
              </div>

              <div class="wifi-item" style="margin-top: 8px;">
                <div class="wifi-item-info">
                  <span class="wifi-label">Contraseña Wi-Fi</span>
                  <span id="wifiPass5gLabel" class="wifi-val mono">••••••••</span>
                </div>
                <div class="wifi-actions">
                  <button class="btn-action-icon" onclick="toggleShowWifiPass5g()" title="Ver u ocultar contraseña"><i id="eyeIcon5g" class="fa-solid fa-eye"></i></button>
                  <button class="btn-action-icon" onclick="copyWifiPass5g()" title="Copiar contraseña"><i class="fa-solid fa-copy"></i></button>
                  <button class="btn-action-icon" onclick="openQrModal('5g')" title="Generar QR para visitas"><i class="fa-solid fa-qrcode"></i></button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMNA 2: SALDO, FACTURAS WISPHUB Y ASISTENCIA -->
        <div class="portal-col">

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

            <!-- Lista de recibos detallados de WispHub -->
            <div style="margin-top: 6px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>Historial de Facturas (WispHub)</span>
                <span style="font-size: 10px; color: #38bdf8; cursor: pointer;" onclick="loadInvoicesHistory()"><i class="fa-solid fa-rotate"></i> Actualizar</span>
              </div>
              <div id="invoicesList" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 10px;">Consultando facturas...</div>
              </div>
            </div>
          </div>

          <!-- TARJETA 4: ASISTENCIA Y SOPORTE DIRECTO -->
          <div class="app-card" style="text-align: center; align-items: center; gap: 10px;">
            <i class="fa-brands fa-whatsapp" style="font-size: 36px; color: #10b981;"></i>
            <div style="font-size: 16px; font-weight: 700; color: #fff;">¿Tienes alguna duda o problema?</div>
            <p style="font-size: 13px; color: var(--text-body); max-width: 320px;">Estamos listos para atenderte por WhatsApp.</p>
            <a id="btnSupportWa" href="https://wa.me/${supportPhone}?text=Hola,%20necesito%20apoyo%20con%20mi%20servicio" target="_blank" class="btn-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> Chatear con Soporte
            </a>
          </div>

        </div>

      </div>

    </div>

  </div>

  <!-- MODAL: CAMBIAR CONTRASEÑA WI-FI -->
  <div id="modalWifi" class="modal-overlay">
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-key" style="color: #38bdf8;"></i> Cambiar Contraseña Wi-Fi
        </div>
        <button class="btn-close-modal" onclick="closeModal('modalWifi')">&times;</button>
      </div>

      <!-- Información de nombres de red actuales (Solo Lectura) -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 12px 14px;">
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
          Tus Redes Wi-Fi Actuales
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-body);"><i class="fa-solid fa-tower-broadcast" style="color: #38bdf8;"></i> Red 2.4 GHz:</span>
            <strong id="modalSsid24Display" style="color: #fff; font-family: monospace;">-</strong>
          </div>
          <div id="modalSsid5gRow" style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-body);"><i class="fa-solid fa-bolt" style="color: #c084fc;"></i> Red 5 GHz:</span>
            <strong id="modalSsid5gDisplay" style="color: #fff; font-family: monospace;">-</strong>
          </div>
        </div>
      </div>

      <!-- Generador de contraseña aleatoria de 10 caracteres -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button type="button" class="btn-outline" onclick="generateSecureRandomWifiPass()" style="border-color: rgba(56, 189, 248, 0.4); background: rgba(14, 165, 233, 0.12); color: #38bdf8; font-weight: 700; padding: 11px 14px;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Generar Contraseña Segura (10 caracteres)
        </button>
        <span style="font-size: 11px; color: var(--text-muted); text-align: center;">
          Crea una clave segura de 10 caracteres (letras, números y símbolo)
        </span>
      </div>

      <form onsubmit="handleSaveWifi(event)" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 6px; display: block; font-weight: 600;">
            Nueva Contraseña Wi-Fi (o escribe una manual)
          </label>
          <div style="position: relative;">
            <input type="password" id="modalPassInput" class="form-input" minlength="8" placeholder="Escribe tu nueva clave" oninput="checkWifiPassStrength(this.value)" required style="padding-right: 42px;">
            <button type="button" onclick="toggleModalPassVisibility('modalPassInput', 'eyeModalPass1')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px;">
              <i id="eyeModalPass1" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <!-- Indicador de seguridad / Advertencia manual -->
        <div id="passStrengthBox" style="display: none; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 10px 12px; transition: all 0.2s ease;"></div>

        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 6px; display: block; font-weight: 600;">
            Confirmar Nueva Contraseña
          </label>
          <div style="position: relative;">
            <input type="password" id="modalPassConfirmInput" class="form-input" minlength="8" placeholder="Vuelve a escribir la clave" required style="padding-right: 42px;">
            <button type="button" onclick="toggleModalPassVisibility('modalPassConfirmInput', 'eyeModalPass2')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px;">
              <i id="eyeModalPass2" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4; background: rgba(56, 189, 248, 0.06); padding: 8px 12px; border-radius: var(--radius-sm); border-left: 3px solid #38bdf8;">
          💡 Tu nueva contraseña se configurará automáticamente para tus redes <strong>2.4 GHz</strong> y <strong>5 GHz</strong> en tu módem.
        </div>

        <button type="submit" id="btnSubmitWifi" class="btn-main" style="margin-top: 4px;">
          <i class="fa-solid fa-floppy-disk"></i> Guardar en mi Módem
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: CÓDIGO QR PARA VISITAS -->
  <div id="modalQr" class="modal-overlay">
    <div class="modal-sheet" style="text-align: center; align-items: center;">
      <div class="modal-sheet-header" style="width: 100%;">
        <div class="modal-sheet-title" id="qrModalTitle">Conectar por Código QR</div>
        <button class="btn-close-modal" onclick="closeModal('modalQr')">&times;</button>
      </div>
      <p id="qrNetworkName" style="font-size: 13px; color: #38bdf8; font-weight: 700; margin-bottom: 4px;"></p>
      <p style="font-size: 12px; color: var(--text-body);">Escanea este código con la cámara de tu celular para conectarte sin escribir la clave:</p>
      <div id="qrcodeBox" style="background: white; padding: 16px; border-radius: 16px; margin: 12px auto; display: flex; justify-content: center;"></div>
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
    let realWifiPassword24 = '';
    let realWifiPassword5g = '';
    let realWifiSsid24 = '';
    let realWifiSsid5g = '';
    let isPassRevealed24 = false;
    let isPassRevealed5g = false;
    let isLoadingDashboard = false;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initPwa();
        initPortal();
      });
    } else {
      initPwa();
      initPortal();
    }

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
        const activeService = serviceId || localStorage.getItem('cp_selected_service') || '';
        const url = '/api/portal/me?token=' + encodeURIComponent(targetToken) + '&p=' + encodeURIComponent(targetPhone) + (activeService ? '&serviceId=' + encodeURIComponent(activeService) : '');
        
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

      // Multi-Servicio: Tarjetas interactivas para titulares con múltiples contratos
      const multiBox = document.getElementById('multiServiceSection');
      const multiCards = document.getElementById('multiServiceCards');
      if (currentServices.length > 1) {
        multiBox.classList.remove('hidden');
        document.getElementById('multiServiceCount').innerText = currentServices.length;
        multiCards.innerHTML = currentServices.map((s, idx) => {
          const isActive = String(s.id_servicio) === String(currentContractId);
          const activeClass = isActive ? 'active' : '';
          const activeBadge = isActive ? '<span class="service-card-badge"><i class="fa-solid fa-circle-check"></i> Activo</span>' : '';
          const dir = s.direccion || s.router || ('Servicio ' + (idx + 1));
          const plan = (s.plan_internet || 'Internet Fibra').replace(/^paquete\s+/i, '');
          const saldo = Number(s.saldo || 0);
          const saldoTxt = saldo <= 0 ? 'Al corriente' : ('Debe $' + saldo.toFixed(2));
          const saldoColor = saldo <= 0 ? '#10b981' : '#f59e0b';

          return '<div class="service-card-item ' + activeClass + '" data-service-id="' + s.id_servicio + '" onclick="onSwitchService(this.dataset.serviceId)">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">' +
              '<span style="font-weight:700; font-size:13px; color:#fff; display:flex; align-items:center; gap:6px;">' +
                '<i class="fa-solid fa-house-signal" style="color:#0ea5e9;"></i> Folio #' + s.id_servicio +
              '</span>' +
              activeBadge +
            '</div>' +
            '<div style="font-size:12px; color:var(--text-body); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + dir + '">' + dir + '</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">' +
              '<span style="color:var(--text-muted);">' + plan + '</span>' +
              '<span style="font-weight:600; color:' + saldoColor + ';">' + saldoTxt + '</span>' +
            '</div>' +
          '</div>';
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

      // Wi-Fi Real Dual Band (Directo de módem / SmartOLT)
      const wifi = data.wifi || {};
      realWifiSsid24 = wifi.ssid24 || ('CloudWare_' + c.id_servicio);
      realWifiPassword24 = wifi.password24 || wifi.password || '********';
      document.getElementById('wifiSsid24Label').innerText = realWifiSsid24;
      document.getElementById('wifiPass24Label').innerText = isPassRevealed24 ? realWifiPassword24 : '••••••••';

      const box5g = document.getElementById('boxWifi5g');
      if (wifi.has5g) {
        if (box5g) box5g.classList.remove('hidden');
        realWifiSsid5g = wifi.ssid5g || (realWifiSsid24 + '-5G');
        realWifiPassword5g = wifi.password5g || realWifiPassword24;
        document.getElementById('wifiSsid5gLabel').innerText = realWifiSsid5g;
        document.getElementById('wifiPass5gLabel').innerText = isPassRevealed5g ? realWifiPassword5g : '••••••••';
      } else {
        if (box5g) box5g.classList.add('hidden');
      }

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
      localStorage.setItem('cp_selected_service', serviceId);
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
            const pdfBtn = inv.pdf_url ? '<a href="' + inv.pdf_url + '" target="_blank" class="btn-action-icon" style="width:34px; height:34px; color:#38bdf8;" title="Ver Recibo PDF"><i class="fa-solid fa-file-pdf"></i></a>' : '';
            const payBtn = (!isPaid && inv.link_pago) ? '<a href="' + inv.link_pago + '" target="_blank" class="btn-main" style="width:auto; padding:6px 12px; font-size:12px; height:34px;" title="Pagar Factura"><i class="fa-solid fa-credit-card"></i> Pagar</a>' : '';
            
            const emision = inv.fecha_emision ? inv.fecha_emision.slice(0, 10) : '';
            const vence = inv.fecha_vencimiento ? inv.fecha_vencimiento.slice(0, 10) : '';
            const fechaLabel = isPaid 
              ? ('Pagada el ' + (inv.fecha_pago ? inv.fecha_pago.slice(0, 10) : (emision || 'Reciente')))
              : ('Vence el ' + (vence || 'Próximo corte'));

            return '<div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-sm); padding:12px 14px; gap:8px;">' +
              '<div style="overflow:hidden;">' +
                '<div style="font-weight:700; font-size:13px; color:#fff; display:flex; align-items:center; gap:6px;">' +
                  '<i class="fa-solid fa-file-invoice" style="color:#0ea5e9;"></i> Recibo #' + (inv.folio || inv.id) +
                '</div>' +
                '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">' + fechaLabel + '</div>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">' +
                '<span style="font-weight:700; font-size:15px; color:#fff;">$' + Number(inv.monto || 0).toFixed(2) + '</span>' +
                '<span class="badge-status ' + statusClass + '" style="font-size:11px; padding:3px 8px;">' + inv.estado + '</span>' +
                pdfBtn +
                payBtn +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:12px; background:rgba(255,255,255,0.02); border-radius:12px;">Estás al corriente con tus pagos 👍 No hay facturas pendientes.</div>';
        }
      } catch (err) {
        console.warn('Error al cargar facturas:', err);
      }
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

    // Toggle y Copiado 2.4 GHz
    function toggleShowWifiPass24() {
      isPassRevealed24 = !isPassRevealed24;
      document.getElementById('wifiPass24Label').innerText = isPassRevealed24 ? realWifiPassword24 : '••••••••';
      document.getElementById('eyeIcon24').className = isPassRevealed24 ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }

    function copyWifiSsid24() {
      navigator.clipboard.writeText(realWifiSsid24 || document.getElementById('wifiSsid24Label').innerText);
      showToast('Nombre de red 2.4 GHz copiado');
    }

    function copyWifiPass24() {
      navigator.clipboard.writeText(realWifiPassword24);
      showToast('Contraseña 2.4 GHz copiada');
    }

    // Toggle y Copiado 5 GHz
    function toggleShowWifiPass5g() {
      isPassRevealed5g = !isPassRevealed5g;
      document.getElementById('wifiPass5gLabel').innerText = isPassRevealed5g ? realWifiPassword5g : '••••••••';
      document.getElementById('eyeIcon5g').className = isPassRevealed5g ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }

    function copyWifiSsid5g() {
      navigator.clipboard.writeText(realWifiSsid5g || document.getElementById('wifiSsid5gLabel').innerText);
      showToast('Nombre de red 5 GHz copiado');
    }

    function copyWifiPass5g() {
      navigator.clipboard.writeText(realWifiPassword5g);
      showToast('Contraseña 5 GHz copiada');
    }

    function copyClabe() {
      navigator.clipboard.writeText(document.getElementById('bankClabeText').innerText);
      showToast('CLABE copiada al portapapeles');
    }

    function openModalWifi() {
      document.getElementById('modalSsid24Display').innerText = realWifiSsid24;
      const m5Row = document.getElementById('modalSsid5gRow');
      const m5Display = document.getElementById('modalSsid5gDisplay');
      if (realWifiSsid5g) {
        if (m5Row) m5Row.style.display = 'flex';
        if (m5Display) m5Display.innerText = realWifiSsid5g;
      } else {
        if (m5Row) m5Row.style.display = 'none';
      }
      const passIn = document.getElementById('modalPassInput');
      const passConf = document.getElementById('modalPassConfirmInput');
      passIn.value = '';
      passConf.value = '';
      passIn.type = 'password';
      passConf.type = 'password';
      const eye1 = document.getElementById('eyeModalPass1');
      const eye2 = document.getElementById('eyeModalPass2');
      if (eye1) eye1.className = 'fa-solid fa-eye';
      if (eye2) eye2.className = 'fa-solid fa-eye';

      const sBox = document.getElementById('passStrengthBox');
      if (sBox) sBox.style.display = 'none';

      document.getElementById('modalWifi').style.display = 'flex';
    }

    function generateSecureRandomWifiPass() {
      const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lowers = 'abcdefghijkmnopqrstuvwxyz';
      const numbers = '23456789';
      const symbols = '@#$%&*!';

      let chars = [];
      // 3 mayúsculas, 3 minúsculas, 3 números, 1 símbolo = 10 caracteres exactos
      for (let i = 0; i < 3; i++) chars.push(uppers[Math.floor(Math.random() * uppers.length)]);
      for (let i = 0; i < 3; i++) chars.push(lowers[Math.floor(Math.random() * lowers.length)]);
      for (let i = 0; i < 3; i++) chars.push(numbers[Math.floor(Math.random() * numbers.length)]);
      chars.push(symbols[Math.floor(Math.random() * symbols.length)]);

      // Mezclar aleatoriamente (Fisher-Yates)
      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = chars[i];
        chars[i] = chars[j];
        chars[j] = temp;
      }

      const generated = chars.join('');
      const passIn = document.getElementById('modalPassInput');
      const passConf = document.getElementById('modalPassConfirmInput');

      passIn.value = generated;
      passConf.value = generated;

      // Hacer visible para que el cliente la pueda ver y memorizar/anotar fácilmente
      passIn.type = 'text';
      passConf.type = 'text';
      const eye1 = document.getElementById('eyeModalPass1');
      const eye2 = document.getElementById('eyeModalPass2');
      if (eye1) eye1.className = 'fa-solid fa-eye-slash';
      if (eye2) eye2.className = 'fa-solid fa-eye-slash';

      checkWifiPassStrength(generated, true);
      showToast('¡Contraseña recomendada de 10 caracteres generada!');
    }

    function checkWifiPassStrength(val, isAutoGenerated = false) {
      const box = document.getElementById('passStrengthBox');
      if (!box) return;

      if (!val || val.length === 0) {
        box.style.display = 'none';
        return;
      }

      box.style.display = 'block';

      const hasUpper = /[A-Z]/.test(val);
      const hasLower = /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);
      const hasSymbol = /[^A-Za-z0-9]/.test(val);
      const isLengthOk = val.length >= 10;

      const isStrong = hasUpper && hasLower && hasNumber && hasSymbol && isLengthOk;

      if (isStrong) {
        box.style.background = 'rgba(16, 185, 129, 0.12)';
        box.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        box.style.color = '#34d399';
        box.innerHTML = '<div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:12px;">' +
          '<i class="fa-solid fa-shield-halved"></i> Contraseña de Alta Seguridad (Recomendada)' +
          '</div>' +
          '<div style="font-size:11px; color:#e2e8f0; margin-top:4px; line-height:1.3;">' +
          'Cumple con 10 caracteres, mayúsculas, minúsculas, números y símbolo. Tu red estará 100% protegida.' +
          '</div>';
      } else {
        box.style.background = 'rgba(245, 158, 11, 0.12)';
        box.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        box.style.color = '#fbbf24';
        box.innerHTML = '<div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:12px;">' +
          '<i class="fa-solid fa-triangle-exclamation"></i> Contraseña manual poco segura' +
          '</div>' +
          '<div style="font-size:11px; color:#f1f5f9; margin-top:4px; line-height:1.3;">' +
          'Las contraseñas manuales o sencillas son fáciles de vulnerar por extraños. Te sugerimos tocar <strong>"Generar Contraseña Segura"</strong> para proteger tu Wi-Fi.' +
          '</div>';
      }
    }

    function toggleModalPassVisibility(inputId, iconId) {
      const input = document.getElementById(inputId);
      const icon = document.getElementById(iconId);
      if (!input || !icon) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    }

    function openQrModal(band) {
      const is5g = band === '5g';
      const ssid = is5g ? (realWifiSsid5g || document.getElementById('wifiSsid5gLabel').innerText) : (realWifiSsid24 || document.getElementById('wifiSsid24Label').innerText);
      const pass = is5g ? realWifiPassword5g : realWifiPassword24;
      const bandName = is5g ? 'Red 5 GHz (Ultra Velocidad)' : 'Red 2.4 GHz (Mayor Alcance)';

      const titleEl = document.getElementById('qrModalTitle');
      if (titleEl) titleEl.innerText = 'Conectar por QR · ' + (is5g ? '5 GHz' : '2.4 GHz');
      const nameEl = document.getElementById('qrNetworkName');
      if (nameEl) nameEl.innerText = ssid + ' (' + bandName + ')';

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
      const password = document.getElementById('modalPassInput').value.trim();
      const confirmPassword = document.getElementById('modalPassConfirmInput').value.trim();

      if (!password || password.length < 8) {
        showToast('La contraseña debe tener mínimo 8 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Las contraseñas no coinciden. Verifícalas.');
        return;
      }

      const btn = document.getElementById('btnSubmitWifi');
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aplicando en tu módem...';
      }

      try {
        const res = await fetch('/api/portal/wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: currentContractId,
            password
          })
        });
        const d = await res.json();
        if (d.success) {
          showToast('✅ ¡Contraseña Wi-Fi configurada con éxito!');
          closeModal('modalWifi');
          realWifiPassword24 = password;
          realWifiPassword5g = password;
          document.getElementById('wifiPass24Label').innerText = isPassRevealed24 ? password : '••••••••';
          if (document.getElementById('wifiPass5gLabel')) {
            document.getElementById('wifiPass5gLabel').innerText = isPassRevealed5g ? password : '••••••••';
          }
        } else {
          showToast(d.message || 'Error al actualizar Wi-Fi');
        }
      } catch {
        showToast('Error de comunicación con el módem');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      }
    }
  </script>
</body>
</html>
`;
}
