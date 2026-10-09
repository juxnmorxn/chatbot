import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';

/**
 * Genera el HTML completo para el Portal Web / PWA de Clientes
 * Diseñado con estética Glassmorphic Dark Mode, mobile-first, 100% responsivo y rápido.
 */
export function getClientPortalHtml(): string {
  const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
  const supportPhone = SettingsService.get('SUPPORT_PHONE', 'SUPPORT_PHONE', config.isp.soporteHumanoPhone || '');
  const bankName = SettingsService.get('PAYMENT_BANK_NAME', 'PAYMENT_BANK_NAME', 'BBVA Bancomer');
  const bankClabe = SettingsService.get('PAYMENT_BANK_CLABE', 'PAYMENT_BANK_CLABE', '012320001234567890');
  const bankAccount = SettingsService.get('PAYMENT_BANK_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '0123456789');
  const oxxoConvenio = SettingsService.get('PAYMENT_OXXO_CONVENIO', 'PAYMENT_OXXO_CONVENIO', '123456');

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
  <meta name="description" content="Consulta tu estado de conexión, potencia óptica, contraseña Wi-Fi, facturas y reporta fallas en tiempo real.">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/portal-icon.svg">
  <link rel="apple-touch-icon" href="/portal-icon.svg">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: #0f172a;
      --bg-card: rgba(30, 41, 59, 0.7);
      --bg-card-hover: rgba(51, 65, 85, 0.7);
      --border-subtle: rgba(148, 163, 184, 0.12);
      --border-glow: rgba(56, 189, 248, 0.25);
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
    
    /* Scrollbar */
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
    
    .btn-pwa-install:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
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
    
    /* Login Screen */
    .login-container {
      max-width: 440px;
      margin: 40px auto 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: var(--radius-xl);
      padding: 32px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .login-header h2 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    
    .login-header p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    
    .form-group {
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .form-input {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      outline: none;
      transition: all 0.2s;
    }
    
    .form-input:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      color: white;
      border: none;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 20px;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35);
      transition: all 0.2s;
    }
    
    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    
    .btn-primary:active {
      transform: translateY(1px);
    }
    
    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    
    .card:hover {
      border-color: var(--border-glow);
    }
    
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .card-title i {
      color: var(--accent-cyan);
    }
    
    /* Profile Banner */
    .profile-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    
    .profile-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .avatar-badge {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: white;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      flex-shrink: 0;
    }
    
    .profile-details h2 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }
    
    .profile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .chip {
      background: rgba(255, 255, 255, 0.06);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .chip-cyan {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    
    .chip-green {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .chip-amber {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .chip-rose {
      background: rgba(244, 63, 94, 0.15);
      color: var(--accent-rose);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    
    /* Connection Pulse & Meter */
    .connection-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 10px;
    }
    
    .status-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .status-box-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-box-val {
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-green 2s infinite;
    }
    
    .pulse-dot.offline {
      background: var(--accent-rose);
      box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7);
      animation: pulse-red 2s infinite;
    }
    
    @keyframes pulse-green {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    
    @keyframes pulse-red {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
    }
    
    /* Optical Power Bar */
    .optical-meter {
      margin-top: 8px;
    }
    
    .optical-meter-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    
    .optical-meter-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }
    
    /* Quick Actions */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .btn-action {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-action:hover {
      background: rgba(51, 65, 85, 0.8);
      border-color: var(--accent-cyan);
      transform: translateY(-2px);
    }
    
    .btn-action i {
      font-size: 20px;
      color: var(--accent-cyan);
    }
    
    .btn-action span {
      font-size: 13px;
      font-weight: 600;
    }
    
    /* Outage Banner */
    .outage-alert {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(244, 63, 94, 0.15));
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    
    .outage-alert i {
      color: var(--accent-amber);
      font-size: 18px;
      margin-top: 2px;
    }
    
    .outage-alert-text h4 {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-amber);
      margin-bottom: 2px;
    }
    
    .outage-alert-text p {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    
    /* Copyable Box */
    .copyable-box {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
    }
    
    .copyable-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-cyan);
    }
    
    .btn-copy {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: var(--text-muted);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    
    .btn-copy:hover {
      color: white;
      background: var(--accent-blue);
    }
    
    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .modal-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      max-width: 460px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border-glow);
      color: var(--text-main);
      padding: 12px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 150;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
    
    /* Speedtest Widget */
    .speed-badge {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15));
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    /* Skeleton Loading */
    .skeleton {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 6px;
    }
    
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
</head>
<body>

  <!-- App Header -->
  <header class="header">
    <a href="/portal" class="brand">
      <div class="brand-logo">
        <i class="fa-solid fa-wifi"></i>
      </div>
      <div class="brand-text">
        <h1>${ispName}</h1>
        <span>Portal de Clientes</span>
      </div>
    </a>
    <div class="header-actions">
      <button id="btn-pwa-install" class="btn-pwa-install" onclick="triggerPwaInstall()">
        <i class="fa-solid fa-download"></i> Instalar App
      </button>
      <button id="btn-logout" class="btn-icon" style="display:none;" onclick="logoutClient()" title="Cerrar sesión">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  </header>

  <!-- Login Section -->
  <div id="login-view" class="container login-container" style="display:none;">
    <div class="login-card">
      <div class="login-header">
        <div style="font-size: 38px; color: var(--accent-cyan); margin-bottom: 10px;">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h2>Acceso a tu Servicio</h2>
        <p>Ingresa tu número de teléfono registrado o tu ID de cliente para consultar tu conexión y pagos.</p>
      </div>
      <form onsubmit="handleLoginSubmit(event)">
        <div class="form-group">
          <label class="form-label" for="login-identifier">Teléfono o Folio</label>
          <input type="text" id="login-identifier" class="form-input" placeholder="Ej: 7711234567 o 3017" required autofocus autocomplete="tel">
        </div>
        <button type="submit" id="btn-login-submit" class="btn-primary" style="margin-top: 16px; width: 100%;">
          <span>Ingresar a mi Portal</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </form>
      <div style="font-size: 12px; color: var(--text-faint);">
        ¿Dudas con tu acceso? Escríbenos por <a href="https://wa.me/${supportPhone.replace(/\D/g, '')}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">WhatsApp aquí</a>.
      </div>
    </div>
  </div>

  <!-- Dashboard Section -->
  <main id="dashboard-view" class="container" style="display:none;">
    
    <!-- Outage Alert Banner (Conditional) -->
    <div id="outage-banner" class="outage-alert" style="display:none;">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div class="outage-alert-text">
        <h4 id="outage-title">Mantenimiento de Red en Zona</h4>
        <p id="outage-desc">Nuestro equipo técnico está trabajando en tu localidad para restablecer el servicio.</p>
      </div>
    </div>

    <!-- Profile Header Card -->
    <div class="card profile-card">
      <div class="profile-info">
        <div class="avatar-badge" id="client-avatar">
          <i class="fa-solid fa-user"></i>
        </div>
        <div class="profile-details" style="flex: 1; min-width: 0;">
          <h2 id="client-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Cargando...</h2>
          <div class="profile-meta">
            <span class="chip chip-cyan" id="client-folio"><i class="fa-solid fa-hashtag"></i> ID --</span>
            <span class="chip" id="client-zone"><i class="fa-solid fa-location-dot"></i> --</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Connection Status & Optical Power -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fa-solid fa-tower-broadcast"></i>
          <span>Estado de tu Conexión</span>
        </div>
        <button class="btn-icon" onclick="refreshLiveSignal(true)" title="Actualizar estado">
          <i id="icon-refresh-signal" class="fa-solid fa-arrows-rotate"></i>
        </button>
      </div>

      <div class="connection-grid">
        <div class="status-box">
          <span class="status-box-label">Estado Módem</span>
          <div class="status-box-val" id="status-onu-val">
            <span class="pulse-dot" id="status-pulse"></span>
            <span id="status-text">En Línea</span>
          </div>
        </div>

        <div class="status-box">
          <span class="status-box-label">Potencia Óptica</span>
          <div class="status-box-val" id="optical-power-val">
            <span id="optical-text">-- dBm</span>
          </div>
        </div>
      </div>

      <!-- Meter bar -->
      <div class="optical-meter">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
          <span>Calidad de Fibra: <b id="optical-quality-label" style="color: var(--accent-green);">Excelente</b></span>
          <span id="optical-range-label">-15 a -27 dBm</span>
        </div>
        <div class="optical-meter-bar">
          <div id="optical-meter-fill" class="optical-meter-fill" style="width: 85%; background: var(--accent-green);"></div>
        </div>
      </div>

      <!-- Speed Profile Info -->
      <div class="speed-badge" style="margin-top: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-bolt" style="color: var(--accent-cyan); font-size: 20px;"></i>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Paquete Contratado</div>
            <div id="plan-name" style="font-size: 16px; font-weight: 700; color: var(--text-main);">40 Megas</div>
          </div>
        </div>
        <span class="chip chip-green" id="plan-status-chip">Fibra Óptica</span>
      </div>
    </div>

    <!-- Wi-Fi Management (Self-Service SmartOLT) -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fa-solid fa-network-wired"></i>
          <span>Gestión de tu Wi-Fi</span>
        </div>
        <button class="btn-icon" onclick="openWifiModal()" title="Cambiar Wi-Fi">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <span style="font-size: 12px; color: var(--text-muted);">Nombre de Red (SSID):</span>
          <div class="copyable-box">
            <span id="wifi-ssid-val" class="copyable-val">MiRed_Fibra</span>
            <button class="btn-copy" onclick="copyText('wifi-ssid-val')">
              <i class="fa-regular fa-copy"></i> Copiar
            </button>
          </div>
        </div>

        <div>
          <span style="font-size: 12px; color: var(--text-muted);">Contraseña Wi-Fi:</span>
          <div class="copyable-box">
            <span id="wifi-pass-val" class="copyable-val">••••••••••</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn-copy" onclick="toggleWifiPassVisibility()">
                <i id="btn-eye-icon" class="fa-regular fa-eye"></i>
              </button>
              <button class="btn-copy" onclick="copyWifiPass()">
                <i class="fa-regular fa-copy"></i> Copiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="actions-grid" style="margin-top: 14px;">
        <button class="btn-action" onclick="openWifiModal()">
          <i class="fa-solid fa-key"></i>
          <span>Cambiar Contraseña</span>
        </button>
        <button class="btn-action" onclick="confirmRebootModem()">
          <i class="fa-solid fa-power-off" style="color: var(--accent-rose);"></i>
          <span>Reiniciar Módem</span>
        </button>
      </div>
    </div>

    <!-- Billing & Payment Details -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fa-solid fa-credit-card"></i>
          <span>Facturación y Pagos</span>
        </div>
        <span id="billing-status-chip" class="chip chip-green">Al corriente</span>
      </div>

      <div class="connection-grid">
        <div class="status-box">
          <span class="status-box-label">Saldo a Pagar</span>
          <div class="status-box-val" id="billing-balance-val" style="color: var(--text-main); font-size: 20px;">
            $0.00
          </div>
        </div>

        <div class="status-box">
          <span class="status-box-label">Próximo Corte</span>
          <div class="status-box-val" id="billing-cutoff-val" style="font-size: 14px;">
            --
          </div>
        </div>
      </div>

      <!-- Payment References -->
      <div style="margin-top: 14px; background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">
          💳 DATOS PARA TRANSFERENCIA SPEI
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Banco:</span>
          <b>${bankName}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; align-items: center; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">CLABE:</span>
          <span class="copyable-val" id="spei-clabe">${bankClabe}</span>
          <button class="btn-copy" onclick="copyText('spei-clabe')"><i class="fa-regular fa-copy"></i></button>
        </div>
      </div>

      <!-- Report Payment Button -->
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <a href="https://wa.me/${supportPhone.replace(/\D/g, '')}?text=Hola,%20deseo%20reportar%20mi%20comprobante%20de%20pago" target="_blank" class="btn-primary" style="flex: 1; text-decoration: none; font-size: 13px; padding: 10px 14px;">
          <i class="fa-brands fa-whatsapp"></i> Reportar Comprobante
        </a>
      </div>
    </div>

    <!-- Support & Direct Assistance -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fa-solid fa-headset"></i>
          <span>Soporte y Asistencia</span>
        </div>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
        ¿Tienes problemas de lentitud o necesitas asistencia con un técnico? Contáctanos de forma inmediata vía WhatsApp con nuestro bot de diagnóstico.
      </p>
      <a href="https://wa.me/${supportPhone.replace(/\D/g, '')}?text=Hola,%20necesito%20soporte%20con%20mi%20servicio" target="_blank" class="btn-primary" style="background: linear-gradient(135deg, #25D366, #128C7E); text-decoration: none; width: 100%;">
        <i class="fa-brands fa-whatsapp" style="font-size: 18px;"></i>
        <span>Chatear con Soporte Técnico</span>
      </a>
    </div>

  </main>

  <!-- Modal: Cambiar Contraseña Wi-Fi -->
  <div id="modal-wifi" class="modal-backdrop">
    <div class="modal-box">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main);">
          <i class="fa-solid fa-key" style="color: var(--accent-cyan); margin-right: 6px;"></i>
          Cambiar Contraseña Wi-Fi
        </h3>
        <button class="btn-icon" onclick="closeWifiModal()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      
      <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
        Al guardar, la nueva contraseña se configurará de inmediato en tu módem. Deberás reconectar tus dispositivos.
      </p>

      <form onsubmit="handleWifiSubmit(event)">
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" for="input-new-ssid">Nombre de Red (Opcional)</label>
          <input type="text" id="input-new-ssid" class="form-input" placeholder="Ej: MiFamilia_Fibra">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="input-new-pass">Nueva Contraseña (mínimo 8 caracteres)</label>
          <input type="text" id="input-new-pass" class="form-input" placeholder="Ej: ClaveSegura2026*" required minlength="8" maxlength="32">
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn-action" style="flex: 1;" onclick="generateRandomPass()">
            <i class="fa-solid fa-dice"></i>
            <span>Generar Clave</span>
          </button>
          <button type="submit" id="btn-save-wifi" class="btn-primary" style="flex: 2;">
            <i class="fa-solid fa-check"></i>
            <span>Guardar en Módem</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="toast">
    <i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>
    <span id="toast-msg">Mensaje</span>
  </div>

  <!-- Client Application Script -->
  <script>
    let currentClient = null;
    let realWifiPassword = '';
    let isPassVisible = false;
    let deferredPrompt = null;

    // 1. PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('[PWA] Service Worker registrado exitosamente:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] No se pudo registrar Service Worker:', err);
        });
      });
    }

    // 2. PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('btn-pwa-install');
      if (btn) btn.style.display = 'inline-flex';
    });

    function triggerPwaInstall() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] El usuario instaló la aplicación');
          const btn = document.getElementById('btn-pwa-install');
          if (btn) btn.style.display = 'none';
        }
        deferredPrompt = null;
      });
    }

    // 3. Inicialización de Sesión / Parámetros URL
    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPhone = urlParams.get('p') || urlParams.get('phone') || urlParams.get('t') || urlParams.get('id');
      const savedPhone = localStorage.getItem('client_portal_identifier');

      const targetIdentifier = urlPhone || savedPhone;

      if (targetIdentifier) {
        await loadClientDashboard(targetIdentifier);
      } else {
        showLoginView();
      }
    });

    function showLoginView() {
      document.getElementById('login-view').style.display = 'flex';
      document.getElementById('dashboard-view').style.display = 'none';
      document.getElementById('btn-logout').style.display = 'none';
    }

    function showDashboardView() {
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('dashboard-view').style.display = 'flex';
      document.getElementById('btn-logout').style.display = 'flex';
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const input = document.getElementById('login-identifier').value.trim();
      if (!input) return;

      const btn = document.getElementById('btn-login-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Validando...';

      try {
        const res = await fetch('/api/portal/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: input }),
        });
        const data = await res.json();

        if (data.success && data.client) {
          localStorage.setItem('client_portal_identifier', input);
          await loadClientDashboard(input);
          showToast('¡Bienvenido, ' + (data.client.nombre || 'Cliente') + '!');
        } else {
          showToast(data.message || 'No se encontró un servicio con ese número o folio.');
        }
      } catch (err) {
        showToast('Error de conexión al verificar servicio.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Ingresar a mi Portal</span> <i class="fa-solid fa-arrow-right"></i>';
      }
    }

    function logoutClient() {
      localStorage.removeItem('client_portal_identifier');
      currentClient = null;
      showLoginView();
      showToast('Sesión finalizada.');
    }

    async function loadClientDashboard(identifier) {
      try {
        const res = await fetch('/api/portal/me?id=' + encodeURIComponent(identifier));
        const data = await res.json();

        if (!data.success || !data.client) {
          localStorage.removeItem('client_portal_identifier');
          showLoginView();
          return;
        }

        currentClient = data.client;
        showDashboardView();
        renderClientData(data);
      } catch (err) {
        showToast('Error al cargar datos del portal.');
      }
    }

    function renderClientData(data) {
      const c = data.client;
      const onu = data.onu || {};
      const signal = data.signal || {};
      const billing = data.billing || {};
      const outage = data.outage;

      // Profile
      document.getElementById('client-name').textContent = c.nombre || 'Cliente';
      document.getElementById('client-folio').innerHTML = '<i class="fa-solid fa-hashtag"></i> Folio ' + (c.id_servicio || c.id || 'N/A');
      document.getElementById('client-zone').innerHTML = '<i class="fa-solid fa-location-dot"></i> ' + (c.router || onu.zone_name || 'Actopan');

      // Outage
      if (outage && outage.active) {
        document.getElementById('outage-banner').style.display = 'flex';
        document.getElementById('outage-title').textContent = outage.title || 'Mantenimiento de Red en Curso';
        document.getElementById('outage-desc').textContent = outage.description || 'Cuadrillas de fibra óptica trabajando en tu zona.';
      } else {
        document.getElementById('outage-banner').style.display = 'none';
      }

      // Signal / Modem
      updateSignalUi(signal);

      // Plan
      document.getElementById('plan-name').textContent = c.plan_internet || onu.speed_profile || '40 Megas';

      // Wi-Fi
      const wifi = data.wifi || {};
      document.getElementById('wifi-ssid-val').textContent = wifi.ssid24 || onu.sn || 'Red_Fibra';
      realWifiPassword = wifi.password || onu.wifi_password || '********';
      document.getElementById('wifi-pass-val').textContent = '••••••••••';
      isPassVisible = false;

      // Billing
      const balance = Number(c.saldo || 0);
      document.getElementById('billing-balance-val').textContent = '$' + balance.toFixed(2);
      const cutoff = c.fecha_corte || (c.dia_corte ? 'Día ' + c.dia_corte + ' de cada mes' : 'Mensual');
      document.getElementById('billing-cutoff-val').textContent = cutoff;

      const chip = document.getElementById('billing-status-chip');
      if (balance <= 0) {
        chip.className = 'chip chip-green';
        chip.textContent = 'Al corriente';
      } else {
        chip.className = 'chip chip-rose';
        chip.textContent = 'Saldo Pendiente';
      }
    }

    function updateSignalUi(signal) {
      const isOnline = signal.status === 'ONLINE' || signal.status === 'Online';
      const statusText = document.getElementById('status-text');
      const pulse = document.getElementById('status-pulse');
      const opticalText = document.getElementById('optical-text');
      const meterFill = document.getElementById('optical-meter-fill');
      const qualityLabel = document.getElementById('optical-quality-label');

      if (isOnline) {
        statusText.textContent = 'En Línea';
        statusText.style.color = 'var(--accent-green)';
        pulse.className = 'pulse-dot';
      } else {
        statusText.textContent = signal.status === 'LOS' ? 'Fibra Desconectada' : 'Fuera de Línea';
        statusText.style.color = 'var(--accent-rose)';
        pulse.className = 'pulse-dot offline';
      }

      const dbm = signal.opticalPowerDbm;
      if (dbm !== null && dbm !== undefined && !isNaN(dbm)) {
        opticalText.textContent = dbm.toFixed(1) + ' dBm';
        
        // Quality evaluation (-15 to -27 is optimal)
        if (dbm >= -24 && dbm <= -14) {
          qualityLabel.textContent = 'Excelente (Óptima)';
          qualityLabel.style.color = 'var(--accent-green)';
          meterFill.style.background = 'var(--accent-green)';
          meterFill.style.width = '95%';
        } else if (dbm < -24 && dbm >= -27) {
          qualityLabel.textContent = 'Buena (Normal)';
          qualityLabel.style.color = 'var(--accent-cyan)';
          meterFill.style.background = 'var(--accent-cyan)';
          meterFill.style.width = '75%';
        } else {
          qualityLabel.textContent = 'Atenuada (Revisar)';
          qualityLabel.style.color = 'var(--accent-amber)';
          meterFill.style.background = 'var(--accent-amber)';
          meterFill.style.width = '40%';
        }
      } else {
        opticalText.textContent = isOnline ? 'Normal' : 'Sin Señal';
        meterFill.style.width = isOnline ? '80%' : '0%';
        qualityLabel.textContent = isOnline ? 'Sincronizado' : 'Sin Potencia';
      }
    }

    async function refreshLiveSignal(userTriggered = false) {
      if (!currentClient) return;
      const icon = document.getElementById('icon-refresh-signal');
      if (icon) icon.classList.add('fa-spin');

      try {
        const res = await fetch('/api/portal/signal?id=' + encodeURIComponent(currentClient.id_servicio || currentClient.telefono));
        const data = await res.json();
        if (data.success && data.signal) {
          updateSignalUi(data.signal);
          if (userTriggered) showToast('Estado de señal actualizado.');
        }
      } catch (err) {
        if (userTriggered) showToast('No se pudo verificar la señal en este momento.');
      } finally {
        if (icon) icon.classList.remove('fa-spin');
      }
    }

    function toggleWifiPassVisibility() {
      const el = document.getElementById('wifi-pass-val');
      const icon = document.getElementById('btn-eye-icon');
      if (isPassVisible) {
        el.textContent = '••••••••••';
        icon.className = 'fa-regular fa-eye';
        isPassVisible = false;
      } else {
        el.textContent = realWifiPassword;
        icon.className = 'fa-regular fa-eye-slash';
        isPassVisible = true;
      }
    }

    function copyWifiPass() {
      navigator.clipboard.writeText(realWifiPassword).then(() => {
        showToast('Contraseña Wi-Fi copiada al portapapeles.');
      });
    }

    function copyText(elementId) {
      const el = document.getElementById(elementId);
      if (!el) return;
      navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        showToast('Copiado al portapapeles.');
      });
    }

    function openWifiModal() {
      document.getElementById('input-new-ssid').value = document.getElementById('wifi-ssid-val').textContent;
      document.getElementById('input-new-pass').value = '';
      document.getElementById('modal-wifi').style.display = 'flex';
    }

    function closeWifiModal() {
      document.getElementById('modal-wifi').style.display = 'none';
    }

    function generateRandomPass() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@*';
      let pass = '';
      for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      document.getElementById('input-new-pass').value = pass;
    }

    async function handleWifiSubmit(e) {
      e.preventDefault();
      if (!currentClient) return;

      const newSsid = document.getElementById('input-new-ssid').value.trim();
      const newPass = document.getElementById('input-new-pass').value.trim();

      if (newPass.length < 8) {
        showToast('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      const btn = document.getElementById('btn-save-wifi');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Aplicando en módem...';

      try {
        const res = await fetch('/api/portal/wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: currentClient.id_servicio || currentClient.telefono,
            ssid: newSsid,
            password: newPass,
          }),
        });
        const data = await res.json();

        if (data.success) {
          realWifiPassword = newPass;
          document.getElementById('wifi-pass-val').textContent = isPassVisible ? newPass : '••••••••••';
          if (newSsid) document.getElementById('wifi-ssid-val').textContent = newSsid;
          closeWifiModal();
          showToast('✅ ¡Contraseña Wi-Fi actualizada con éxito!');
        } else {
          showToast(data.message || 'No se pudo actualizar la contraseña.');
        }
      } catch (err) {
        showToast('Error al enviar orden a la OLT.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Guardar en Módem</span>';
      }
    }

    async function confirmRebootModem() {
      if (!currentClient) return;
      if (!confirm('¿Deseas reiniciar tu módem remotamente? El equipo se apagará y tardará de 1 a 2 minutos en volver a sincronizar.')) {
        return;
      }

      showToast('Enviando señal de reinicio al módem...');

      try {
        const res = await fetch('/api/portal/reboot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: currentClient.id_servicio || currentClient.telefono,
          }),
        });
        const data = await res.json();

        if (data.success) {
          showToast('🔄 Orden de reinicio enviada. Tu módem se está reiniciando.');
          setTimeout(() => refreshLiveSignal(false), 30000);
        } else {
          showToast(data.message || 'No se pudo enviar la orden de reinicio.');
        }
      } catch (err) {
        showToast('Error al conectar con la central OLT.');
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toast-msg');
      toastMsg.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  </script>
</body>
</html>
`;
}
