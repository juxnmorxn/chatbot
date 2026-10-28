import { config } from '../config/env';
import { SettingsService } from '../services/settings.service';
import { getCloudWareSphereSvg, getCloudWareFullLogoHtml } from './brand';

/**
 * Genera el HTML completo para el Portal Móvil / PWA de Clientes
 * Diseñado 100% para celulares (Mobile-First), interfaz limpia, cero tecnicismos y muy intuitiva.
 */
export function getClientPortalHtml(customOfficePhone?: string): string {
  const ispName = SettingsService.get('ISP_NAME', 'ISP_NAME', config.isp.name || 'CloudWareMx');
  const supportPhone = SettingsService.get('SUPPORT_PHONE', 'SUPPORT_PHONE', config.isp.soporteHumanoPhone || '7721284398');
  const bankName = SettingsService.get('PAYMENT_BANK', 'PAYMENT_BANK_NAME', 'BBVA Bancomer');
  const bankAccount = SettingsService.get('PAYMENT_ACCOUNT', 'PAYMENT_BANK_ACCOUNT', '012 180 0152433212 90');
  const bankClabe = SettingsService.get('PAYMENT_CLABE', 'PAYMENT_BANK_CLABE', bankAccount || '012 180 0152433212 90');
  const bankBeneficiary = SettingsService.get('PAYMENT_BENEFICIARY', 'PAYMENT_BENEFICIARY', ispName || 'CloudWare Telecomunicaciones');
  const rawOffice = customOfficePhone || SettingsService.get('PAYMENT_OFFICE_PHONE', 'OFFICE_PHONE', SettingsService.get('SOPORTE_HUMANO_PHONE', 'SOPORTE_HUMANO_PHONE', '7721284398'));
  const officePhone = (rawOffice.replace(/\D/g, '').slice(-10)) || '7721284398';

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
  <!-- Openpay.js & Device Data SDK -->
  <script type="text/javascript" src="https://js.openpay.mx/openpay.v1.min.js"></script>
  <script type="text/javascript" src="https://js.openpay.mx/openpay-data.v1.min.js"></script>

  <style>
    :root, [data-theme="dark"] {
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
      --input-bg: #0f172a;
      --input-text: #ffffff;
      --input-border: rgba(255, 255, 255, 0.12);
      --modal-bg: #0f172a;
      --modal-text: #ffffff;
      --btn-header-bg: rgba(255, 255, 255, 0.06);
      --btn-header-hover: rgba(255, 255, 255, 0.12);
      --btn-header-text: #cbd5e1;
      --btn-icon-bg: rgba(255, 255, 255, 0.06);
      --btn-icon-text: #94a3b8;
      --btn-outline-bg: rgba(255, 255, 255, 0.05);
      --btn-outline-text: #f1f5f9;
      --card-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      --wifi-band-bg: rgba(15, 23, 42, 0.7);
      --onboard-bg: linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(37, 99, 235, 0.18) 100%);
      --onboard-border: rgba(56, 189, 248, 0.4);
      --plan-card-bg: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%);
      --slogan-color: #94a3b8;
      --service-card-bg: #131d36;
      --service-card-active-bg: rgba(14, 165, 233, 0.18);
      --radius-sm: 12px;
      --radius-md: 18px;
      --radius-lg: 24px;
      --radius-full: 9999px;
    }

    [data-theme="light"] {
      --bg-body: #f1f5f9;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --bg-card-alt: #f8fafc;
      --border-card: rgba(0, 0, 0, 0.12);
      --border-highlight: rgba(2, 132, 199, 0.45);
      --text-title: #090d16;
      --text-body: #1e293b;
      --text-muted: #64748b;
      --primary: #0284c7;
      --primary-gradient: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%);
      --success: #059669;
      --success-bg: rgba(16, 185, 129, 0.14);
      --warning: #d97706;
      --warning-bg: rgba(245, 158, 11, 0.14);
      --danger: #dc2626;
      --danger-bg: rgba(239, 68, 68, 0.14);
      --input-bg: #ffffff;
      --input-text: #090d16;
      --input-border: #cbd5e1;
      --modal-bg: #ffffff;
      --modal-text: #090d16;
      --btn-header-bg: rgba(0, 0, 0, 0.06);
      --btn-header-hover: rgba(0, 0, 0, 0.12);
      --btn-header-text: #0f172a;
      --btn-icon-bg: #e2e8f0;
      --btn-icon-text: #1e293b;
      --btn-outline-bg: #ffffff;
      --btn-outline-text: #090d16;
      --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      --wifi-band-bg: #f8fafc;
      --onboard-bg: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
      --onboard-border: #0284c7;
      --plan-card-bg: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
      --slogan-color: #334155;
      --service-card-bg: #ffffff;
      --service-card-active-bg: rgba(2, 132, 199, 0.12);
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
    
    html, body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-body);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.12) 0%, transparent 60%),
        radial-gradient(circle at 100% 100%, rgba(37, 99, 235, 0.06) 0%, transparent 50%);
      background-attachment: fixed;
      color: var(--text-title);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 0;
      transition: background-color 0.25s ease, color 0.25s ease;
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
      min-width: 0;
      box-sizing: border-box;
      transition: max-width 0.25s ease;
    }

    /* Breakpoint Tablets y Pantallas Medianas (768px - 1059px) */
    @media (min-width: 768px) and (max-width: 1059px) {
      .app-screen {
        max-width: 980px;
        width: 95%;
        padding: 20px 24px 80px 24px;
        gap: 18px;
      }

      .dashboard-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 18px;
        align-items: stretch !important;
      }

      .card-billing-box {
        grid-column: 1 / -1;
      }

      .dashboard-bottom-grid {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px;
        width: 100%;
      }

      .app-card {
        padding: 20px;
      }
    }

    /* Breakpoint Pantallas Grandes / Desktop (>= 1060px) */
    @media (min-width: 1060px) {
      .app-screen {
        max-width: 1440px;
        width: 95%;
        padding: 24px 36px 90px 36px;
        gap: 20px;
      }

      .dashboard-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 20px;
        align-items: stretch !important;
      }

      .dashboard-bottom-grid {
        display: grid !important;
        grid-template-columns: 1.85fr 1.15fr !important;
        gap: 20px;
        align-items: stretch !important;
        width: 100%;
      }

      .card-plan-box, .card-wifi-box, .card-billing-box, .card-history-box, .support-banner-card {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
      }

      .invoices-scroll-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 10px !important;
        max-height: 310px !important;
        overflow-y: auto !important;
      }

      .app-card {
        padding: 22px;
      }
    }

    /* Breakpoint Pantallas Extra Grandes / Monitores Ultra-Wide (>= 1440px) */
    @media (min-width: 1440px) {
      .app-screen {
        max-width: 1560px;
        width: 95%;
        padding: 28px 48px 100px 48px;
        gap: 24px;
      }
      .dashboard-grid {
        gap: 24px;
      }
      .dashboard-bottom-grid {
        gap: 24px;
      }
    }

    /* Tarjeta Perfil Ejecutivo del Titular */
    .titular-profile-card {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(30, 41, 59, 0.75) 100%);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      margin-bottom: 18px;
    }

    @media (min-width: 1060px) {
      .titular-profile-card {
        margin-bottom: 22px;
      }
    }

    [data-theme="light"] .titular-profile-card {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(241, 245, 249, 0.95) 100%);
      border: 1px solid rgba(2, 132, 199, 0.25);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }

    .titular-profile-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }

    .titular-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }

    .titular-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .titular-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .titular-verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      background: rgba(2, 132, 199, 0.12);
      border: 1px solid rgba(2, 132, 199, 0.25);
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .titular-folio-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--success);
      background: var(--success-bg);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .titular-hero-name {
      font-family: 'Outfit', sans-serif;
      font-size: 19px;
      font-weight: 800;
      color: var(--text-title);
      letter-spacing: -0.3px;
      line-height: 1.2;
      word-break: break-word;
    }

    .titular-sub-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .titular-profile-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .titular-profile-card {
        flex-direction: column;
        align-items: flex-start;
        padding: 14px 16px;
      }
      .titular-profile-right {
        width: 100%;
        margin-top: 6px;
      }
      .titular-profile-right .btn-outline {
        width: 100%;
      }
    }

    /* Cuadrícula Adaptativa del Dashboard (Fila Superior 3 Columnas) */
    .dashboard-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    /* Cuadrícula Adaptativa del Dashboard (Fila Inferior 2 Columnas) */
    .dashboard-bottom-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    /* Lista de bandas Wi-Fi 2.4G y 5G (Siempre contenida sin desbordamiento) */
    .wifi-networks-grid {
      display: flex;
      flex-direction: column;
      gap: 7px;
      width: 100%;
      min-width: 0;
    }

    /* Scrollbar estilizada y límite de altura para historial de facturas */
    #invoicesList, .invoices-scroll-grid {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 4px;
    }

    #invoicesList::-webkit-scrollbar {
      width: 5px;
    }

    #invoicesList::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
    }

    #invoicesList::-webkit-scrollbar-thumb {
      background: rgba(14, 165, 233, 0.3);
      border-radius: 4px;
    }

    /* Banner VIP Horizontal de Asistencia y Soporte WhatsApp */
    .support-banner-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: var(--radius-lg);
      padding: 16px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      transition: all 0.25s ease;
    }

    [data-theme="light"] .support-banner-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(240, 253, 244, 0.95) 100%);
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.08);
    }

    .support-banner-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }

    .support-icon-circle {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(16, 185, 129, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      color: #10b981;
      flex-shrink: 0;
      box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
    }

    .support-banner-title {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-title);
    }

    .support-banner-sub {
      font-size: 12.5px;
      color: var(--text-body);
      margin-top: 2px;
    }

    @media (max-width: 680px) {
      .support-banner-card {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
        padding: 18px 16px;
      }
      .support-banner-left {
        flex-direction: column;
        text-align: center;
        gap: 10px;
      }
      .support-banner-card .btn-whatsapp {
        width: 100%;
        justify-content: center;
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

    .brand-sphere-wrap {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 12px rgba(14, 165, 233, 0.35));
    }

    .brand-info h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-title);
      line-height: 1.2;
    }

    .brand-info span {
      font-size: 11.5px;
      color: var(--slogan-color);
      font-weight: 600;
    }

    .btn-header-action {
      background: var(--btn-header-bg);
      border: 1px solid var(--border-card);
      color: var(--btn-header-text);
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
      background: var(--btn-header-hover);
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
      box-shadow: var(--card-shadow);
    }

    .service-pill-select label {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .select-styled {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      color: var(--input-text);
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
      background: var(--onboard-bg);
      border: 1px solid var(--onboard-border);
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
      color: var(--text-title);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onboarding-desc {
      font-size: 13px;
      color: var(--text-body);
      line-height: 1.45;
    }

    .onboarding-desc strong {
      color: #0284c7;
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
      box-shadow: var(--card-shadow);
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      transition: background-color 0.25s ease, border-color 0.25s ease;
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
      color: #0284c7;
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
      color: var(--text-title);
      line-height: 1.3;
    }

    .status-text-sub {
      font-size: 12px;
      color: var(--text-body);
    }

    .status-speed-badge {
      background: rgba(14, 165, 233, 0.15);
      color: #0284c7;
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Selector visual de multi-servicio para titulares con varios contratos */
    .multi-service-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-highlight);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 20px;
      box-shadow: var(--card-shadow);
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
      color: #0284c7;
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
      background: var(--service-card-bg, var(--bg-card));
      border: 2px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 5px;
      position: relative;
      color: var(--text-title);
    }

    .service-card-item:hover {
      border-color: #0284c7;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.16);
    }

    .service-card-item.active {
      border-color: #0284c7 !important;
      background: var(--service-card-active-bg, rgba(14, 165, 233, 0.16)) !important;
      box-shadow: 0 0 0 1px #0284c7, 0 6px 20px rgba(14, 165, 233, 0.22) !important;
    }

    .service-card-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.3px;
    }

    .service-card-badge.active {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
    }

    .service-card-badge.inactive {
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-muted);
      border: 1px solid var(--border-card);
    }

    /* Wi-Fi Dual-Band Styling */
    .wifi-band-card {
      background: var(--wifi-band-bg);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-md);
      padding: 14px;
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
      color: #0284c7;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .wifi-band-tag.tag-5g {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
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
      padding: 9px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .wifi-item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      overflow: hidden;
      flex: 1;
    }

    .wifi-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wifi-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-title);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .wifi-val.mono {
      font-family: 'Outfit', monospace;
      color: #0284c7;
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
      background: var(--btn-icon-bg);
      border: 1px solid var(--border-card);
      color: var(--btn-icon-text);
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
      background: var(--btn-header-hover);
      color: var(--text-title);
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
      color: var(--text-title);
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
      background: var(--btn-outline-bg);
      border: 1px solid var(--border-card);
      color: var(--btn-outline-text);
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
      background: var(--btn-header-hover);
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
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      color: var(--input-text);
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
      box-shadow: var(--card-shadow);
      margin-top: 10px;
    }

    .auth-title {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: var(--text-title);
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
      -webkit-backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 16px;
      transition: opacity 0.2s ease;
    }

    .modal-sheet {
      background: var(--modal-bg);
      color: var(--modal-text);
      border: 1px solid var(--border-highlight);
      border-radius: var(--radius-lg);
      padding: 18px 18px 22px 18px;
      max-width: 420px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      touch-action: pan-y;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      position: relative;
    }

    .modal-drag-bar {
      width: 36px;
      height: 4px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.4);
      margin: 0 auto 2px auto;
      display: block;
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
      color: var(--text-title);
    }

    .btn-close-modal {
      background: var(--btn-header-bg);
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
      background: var(--bg-surface);
      border: 1px solid #38bdf8;
      color: var(--text-title);
      padding: 12px 20px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
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
        <div class="brand-sphere-wrap">
          ${getCloudWareSphereSvg({ size: '100%', isDark: true })}
        </div>
        <div class="brand-info">
          <div style="display: flex; align-items: center; gap: 4px;">
            <h1 style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: var(--text-title); line-height: 1.2;">CloudWare</h1>
            <span style="font-size: 10px; font-weight: 900; color: #0284c7; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 4px; padding: 1px 4px;">MX</span>
          </div>
          <span id="headerGreeting" style="font-size: 11.5px; color: var(--slogan-color); font-weight: 600;">Cada segundo cuenta</span>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button id="btnThemeToggle" class="btn-header-action" onclick="togglePortalTheme()" title="Cambiar tema claro / oscuro">
          <i class="fa-solid fa-sun" id="themeIcon"></i>
        </button>
        <button id="btnChangePassword" class="btn-header-action hidden" onclick="openCreatePasswordModal(currentPhone, true)" title="Cambiar mi contraseña de acceso">
          <i class="fa-solid fa-key"></i>
        </button>
        <button id="btnPwa" class="btn-header-action hidden"><i class="fa-solid fa-download"></i> App</button>
        <button id="btnLogout" class="btn-header-action hidden" onclick="logoutClient()" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div>
    </header>

    <!-- 0. VISTA CARGANDO INICIAL (Apertura Instantánea) -->
    <div id="viewLoading" class="auth-box" style="text-align: center; padding: 40px 20px;">
      <div style="margin-bottom: 16px;">
        ${getCloudWareFullLogoHtml(true)}
      </div>
      <div style="font-size: 28px; color: #0284c7; margin-bottom: 10px;">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <div style="font-size: 16px; font-weight: 700; color: var(--text-title);">Conectando a tu Portal...</div>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Sincronizando módem y servicios en vivo</p>
    </div>

    <!-- 1. VISTA DE INICIO DE SESIÓN -->
    <div id="viewLogin" class="auth-box hidden">
      <div style="margin-bottom: 8px;">
        ${getCloudWareFullLogoHtml(true)}
      </div>
      <div class="auth-title" style="font-size: 18px;">Iniciar Sesión</div>
      <p class="auth-sub">Accede desde cualquier dispositivo con tu número celular (usuario) y tu contraseña.</p>

      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 11.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 4px; display: block;">
            <i class="fa-solid fa-user" style="color: #0284c7;"></i> Usuario (Tu Celular - 10 dígitos)
          </label>
          <input type="tel" id="loginPhone" class="form-input" placeholder="Ej. 7721284398" maxlength="10" required>
        </div>
        <div>
          <label style="font-size: 11.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 4px; display: block;">
            <i class="fa-solid fa-lock" style="color: #0284c7;"></i> Contraseña
          </label>
          <div style="position: relative;">
            <input type="password" id="loginPass" class="form-input" placeholder="Tu contraseña de acceso" required style="padding-right: 42px;">
            <button type="button" onclick="toggleModalPassVisibility('loginPass', 'eyeLoginPass')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px;">
              <i id="eyeLoginPass" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>
        <button type="submit" class="btn-main"><i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi Cuenta</button>
      </form>

      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px;">
        <span style="color: #0284c7; cursor: pointer; font-weight: 600;" onclick="showForgot()">¿Olvidaste tu clave?</span>
        <span style="color: #0284c7; cursor: pointer; font-weight: 600;" onclick="showRegister()">Crear contraseña</span>
      </div>
    </div>

    <!-- 1.5 VISTA VINCULAR WHATSAPP (Si el número no coincide de inicio) -->
    <div id="viewNotFound" class="auth-box hidden">
      <div style="margin-bottom: 8px;">
        ${getCloudWareFullLogoHtml(true)}
      </div>
      <div class="auth-title" style="font-size: 18px;">Vincular mi WhatsApp</div>
      <p class="auth-sub">
        No encontramos un servicio registrado con el celular <strong id="notFoundPhoneLabel" style="color: #0284c7;"></strong>.<br>
        Ingresa el <strong>Nombre completo del titular</strong> tal como aparece en tu contrato para vincular tu WhatsApp:
      </p>

      <form onsubmit="handleLinkContract(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="linkIdentifier" class="form-input" placeholder="Nombre completo del titular (ej. María del Pilar)" required>
        <span style="font-size: 11.5px; color: var(--text-muted); margin-top: -6px; line-height: 1.3;">Buscamos por el nombre del titular para asegurar que se enlace el servicio correcto.</span>
        <button type="submit" class="btn-main"><i class="fa-solid fa-user-check"></i> Vincular mi WhatsApp</button>
      </form>

      <div style="text-align: center; margin-top: 4px;">
        <span style="color: var(--text-muted); font-size: 13px; cursor: pointer;" onclick="showLogin()">Iniciar sesión normal</span>
      </div>
    </div>

    <!-- 2. VISTA CREAR CONTRASEÑA -->
    <div id="viewRegister" class="auth-box hidden">
      <div style="margin-bottom: 8px;">
        ${getCloudWareFullLogoHtml(true)}
      </div>
      <div class="auth-title" style="font-size: 18px;">Activar mi Contraseña</div>
      <p class="auth-sub">Crea una contraseña segura para entrar a tu cuenta cuando quieras.</p>

      <form onsubmit="handleRegister(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="tel" id="regPhone" class="form-input" placeholder="Número celular (10 dígitos)" maxlength="10" required>
        <input type="password" id="regPass" class="form-input" placeholder="Crea tu contraseña (mínimo 6 letras o números)" minlength="6" required>
        <button type="submit" class="btn-main"><i class="fa-solid fa-key"></i> Guardar y Entrar</button>
      </form>

      <div style="text-align: center; margin-top: 4px;">
        <span style="color: #0284c7; font-size: 13px; cursor: pointer; font-weight: 600;" onclick="showLogin()">Ya tengo contraseña · Entrar</span>
      </div>
    </div>

    <!-- 3. VISTA RECUPERAR CLAVE -->
    <div id="viewForgot" class="auth-box hidden">
      <div style="margin-bottom: 8px;">
        ${getCloudWareFullLogoHtml(true)}
      </div>
      <div class="auth-title" style="font-size: 18px;">Recuperar Contraseña</div>
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
        <span style="color: var(--text-muted); font-size: 13px; cursor: pointer;" onclick="showLogin()">Regresar al inicio</span>
      </div>
    </div>

    <!-- 4. DASHBOARD DEL CLIENTE (100% AMIGABLE Y VISUAL) -->
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
            <span>Tus Servicios / Domicilios (<strong id="multiServiceCount" style="color: var(--text-title);">0</strong>)</span>
          </div>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Toca para cambiar de contrato</span>
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
        <p id="outageDesc" style="font-size: 13px; color: var(--text-body); line-height: 1.4;"></p>
      </div>

      <!-- TARJETA EJECUTIVA DE PERFIL DEL TITULAR (MÁXIMO ÉNFASIS) -->
      <div class="titular-profile-card">
        <div class="titular-profile-left">
          <div class="titular-avatar">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <div class="titular-info">
            <div class="titular-badge-row">
              <span class="titular-verified-badge"><i class="fa-solid fa-circle-check"></i> Titular Verificado</span>
              <span id="titularContractBadge" class="titular-folio-badge">Contrato <strong id="titularHeroFolio" style="margin-left: 2px;">#---</strong></span>
            </div>
            <div id="titularHeroName" class="titular-hero-name">Cargando titular...</div>
            <div class="titular-sub-meta">
              <span><i class="fa-solid fa-phone"></i> <span id="titularHeroPhone">Teléfono registrado</span></span>
              <span>•</span>
              <span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> Servicio Activo</span>
            </div>
          </div>
        </div>
        <div class="titular-profile-right">
          <button class="btn-outline" onclick="openModalBank()" style="padding: 10px 16px; font-size: 13px; border-color: rgba(2, 132, 199, 0.35); background: rgba(2, 132, 199, 0.1); color: var(--primary); font-weight: 700;">
            <i class="fa-solid fa-building-columns"></i> Datos de Pago SPEI
          </button>
        </div>
      </div>

      <!-- Fila Superior: 3 Tarjetas de Servicio Equilibradas y de Misma Altura -->
      <div class="dashboard-grid">

        <!-- TARJETA 1: TU PAQUETE CONTRATADO Y MÓDEM -->
        <div class="app-card card-plan-box" style="background: var(--plan-card-bg); border: 1px solid var(--border-highlight); box-shadow: var(--card-shadow); display: flex; flex-direction: column;">
          <div class="card-head" style="margin-bottom: 4px;">
            <div class="card-head-title" style="color: #0284c7; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px;">
              <i class="fa-solid fa-bolt"></i> Tu Paquete de Internet
            </div>
            <span id="planStatusBadge" class="status-speed-badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; border-color: rgba(16, 185, 129, 0.3); font-size: 11px;">
              <i class="fa-solid fa-circle-check"></i> Activo
            </span>
          </div>

          <!-- Nombre de Paquete y Velocidad -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 10px 0; padding-bottom: 10px; border-bottom: 1px solid var(--border-card);">
            <div style="min-width: 0; flex: 1;">
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Plan Contratado</span>
              <div id="planNameBig" style="font-family: 'Outfit', sans-serif; font-size: 21px; font-weight: 800; color: var(--text-title); line-height: 1.2; word-break: break-word;">
                Paquete 40 Megas
              </div>
              <div id="planPriceLabel" style="font-size: 12px; color: #38bdf8; font-weight: 700; margin-top: 2px;">$250.00 MXN / mes</div>
            </div>
            <div style="text-align: right; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 6px 14px; flex-shrink: 0;">
              <div id="planSpeedBig" style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0284c7; line-height: 1;">
                40M
              </div>
              <span style="font-size: 9.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Velocidad</span>
            </div>
          </div>

          <!-- Estado del Módem y Conexión en Vivo -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="statusPulseDot" class="status-pulse-circle"></span>
                <span id="statusFriendlyTitle" style="font-size: 12px; font-weight: 700; color: var(--text-title);">Conexión de Fibra Estable</span>
              </div>
              <span id="opticalPowerBadge" style="font-size: 10.5px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 2px 7px; border-radius: 6px;">-23.0 dBm</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
              <span><i class="fa-solid fa-microchip"></i> <span id="onuSnLabel">ONU: --</span></span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%;"><i class="fa-solid fa-location-dot"></i> <span id="clientAddressLabel">Francisco Villa S/N</span></span>
            </div>
          </div>

          <!-- Pie de tarjeta: Folio y Botón de Reinicio -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted); margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border-card);">
            <span>Folio Contrato: <strong id="contractFolio" style="color: #0284c7;">#-</strong></span>
            <button class="btn-outline" onclick="handleRebootModem()" style="width: auto; padding: 4px 10px; font-size: 11px; border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">
              <i class="fa-solid fa-rotate-right"></i> Reiniciar Módem
            </button>
            <span id="titularName" style="display: none;">-</span>
          </div>
        </div>

        <!-- TARJETA 2: TU RED WI-FI (DOBLE BANDA - UNA SOLA CONTRASEÑA) -->
        <div class="app-card card-wifi-box" style="display: flex; flex-direction: column;">
          <div class="card-head" style="margin-bottom: 4px;">
            <div class="card-head-title" style="color: #0284c7; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px;">
              <i class="fa-solid fa-wifi"></i> Tu Red Wi-Fi
            </div>
            <span class="wifi-band-tag tag-5g" style="font-size: 11px;"><i class="fa-solid fa-shield-halved"></i> 2.4G & 5G</span>
          </div>

          <!-- Nombres de Red (2.4 GHz y 5 GHz) -->
          <div class="wifi-networks-grid">
            <!-- 2.4 GHz -->
            <div class="wifi-item">
              <div class="wifi-item-info">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="wifi-band-tag tag-24g" style="font-size: 10px; padding: 2px 7px;"><i class="fa-solid fa-tower-broadcast"></i> 2.4 GHz</span>
                  <span style="font-size: 10.5px; color: var(--text-muted);">Mayor cobertura</span>
                </div>
                <span id="wifiSsid24Label" class="wifi-val" style="margin-top: 2px;">Cargando...</span>
              </div>
              <button class="btn-action-icon" style="width: 32px; height: 32px; font-size: 13px;" onclick="copyWifiSsid24()" title="Copiar nombre de red 2.4G"><i class="fa-solid fa-copy"></i></button>
            </div>

            <!-- 5 GHz -->
            <div id="boxWifi5g" class="wifi-item">
              <div class="wifi-item-info">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="wifi-band-tag tag-5g" style="font-size: 10px; padding: 2px 7px;"><i class="fa-solid fa-bolt"></i> 5 GHz</span>
                  <span style="font-size: 10.5px; color: var(--text-muted);">Ultra velocidad</span>
                </div>
                <span id="wifiSsid5gLabel" class="wifi-val" style="margin-top: 2px;">Cargando...</span>
              </div>
              <button class="btn-action-icon" style="width: 32px; height: 32px; font-size: 13px;" onclick="copyWifiSsid5g()" title="Copiar nombre de red 5G"><i class="fa-solid fa-copy"></i></button>
            </div>
          </div>

          <!-- Contraseña Wi-Fi ÚNICA y Compartida -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-highlight); border-radius: var(--radius-md); padding: 10px 12px; margin-top: auto; display: flex; flex-direction: column; gap: 7px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="wifi-label" style="color: #0284c7; font-size: 11px; display: flex; align-items: center; gap: 5px;">
                <i class="fa-solid fa-key"></i> Contraseña Única Wi-Fi
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">Misma clave 2.4G/5G</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--bg-card); padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
              <span id="wifiPassSharedLabel" class="wifi-val mono" style="font-size: 15px; letter-spacing: 1px;">Cargando...</span>
              <div class="wifi-actions">
                <button class="btn-action-icon" style="width: 30px; height: 30px; font-size: 12px;" onclick="copyWifiPassShared()" title="Copiar contraseña"><i class="fa-solid fa-copy"></i></button>
              </div>
            </div>

            <!-- Acciones Rápidas: QR 5 GHz Directo y Cambiar Clave -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 2px;">
              <button class="btn-outline" onclick="openQrModal('5g')" style="padding: 7px 10px; font-size: 11.5px; border-color: rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.12); color: #a855f7; font-weight: 700;">
                <i class="fa-solid fa-qrcode"></i> Conectar QR
              </button>
              <button class="btn-main" onclick="openModalWifi()" style="padding: 7px 10px; font-size: 11.5px;">
                <i class="fa-solid fa-pen"></i> Cambiar Clave
              </button>
            </div>
          </div>
        </div>

        <!-- TARJETA 3: TU SALDO Y PAGOS INMEDIATOS -->
        <div class="app-card card-billing-box" style="display: flex; flex-direction: column;">
          <div class="card-head" style="margin-bottom: 4px;">
            <div class="card-head-title" style="color: #0284c7; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px;">
              <i class="fa-solid fa-wallet"></i> Tu Saldo y Pagos
            </div>
            <span id="billingBadge" class="badge-status paid">Al Corriente</span>
          </div>

          <div class="billing-hero" style="padding: 10px 14px; margin: 4px 0 10px 0;">
            <div class="billing-hero-left">
              <span style="font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Saldo a Pagar</span>
              <div id="billingAmountLabel" class="billing-hero-amount" style="font-size: 26px;">$0.00</div>
              <div id="billingDueLabel" class="billing-hero-date" style="font-size: 11px;">Día 11 de cada mes</div>
            </div>
          </div>

          <!-- Acciones de Pago Inmediatas -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <button class="btn-main" style="padding: 9px 10px; font-size: 12px; background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%); font-weight: 700;" onclick="openModalCardPayment()">
              <i class="fa-solid fa-credit-card"></i> Pagar Tarjeta
            </button>
            <button class="btn-outline" style="padding: 9px 10px; font-size: 12px; border-color: rgba(2, 132, 199, 0.4); color: var(--primary); font-weight: 700;" onclick="openModalBank()">
              <i class="fa-solid fa-building-columns"></i> SPEI / Banco
            </button>
          </div>

          <!-- Cuadro de Referencia Rápida SPEI -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 9px 12px; margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
            <div style="min-width: 0;">
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: block;">Referencia SPEI / Banco:</span>
              <span id="bankRefText" class="mono" style="font-size: 13.5px; font-weight: 800; color: #38bdf8;">SRV-696</span>
            </div>
            <button class="btn-action-icon" style="width: 30px; height: 30px; font-size: 12px;" onclick="copyBankRef()" title="Copiar referencia"><i class="fa-solid fa-copy"></i></button>
          </div>
        </div>

      </div>

      <!-- SEGUNDA FILA: HISTORIAL DE RECIBOS Y CENTRO DE SOPORTE -->
      <div class="dashboard-bottom-grid">

        <!-- TARJETA: HISTORIAL DE RECIBOS Y FACTURAS (AMPLIO Y ORGANIZADO) -->
        <div class="app-card card-history-box" style="display: flex; flex-direction: column;">
          <div class="card-head" style="margin-bottom: 8px;">
            <div class="card-head-title" style="color: #0284c7; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.6px;">
              <i class="fa-solid fa-clock-rotate-left"></i> Historial de Recibos y Facturas
            </div>
            <span id="invoicesTotalCountBadge" style="font-size: 10.5px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; padding: 2px 8px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.25);">0 Pagos</span>
          </div>

          <div id="invoicesList" class="invoices-scroll-grid">
            <div style="text-align: center; color: var(--text-muted); font-size: 12.5px; padding: 20px;">Consultando facturas...</div>
          </div>
        </div>

        <!-- TARJETA: CENTRO DE ASISTENCIA Y SOPORTE DIRECTO -->
        <div class="app-card support-banner-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div class="support-icon-circle" style="flex-shrink: 0;">
              <i class="fa-brands fa-whatsapp"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Atención Inmediata</div>
              <div class="support-banner-title" style="font-size: 16px; line-height: 1.3;">¿Dudas o fallas con tu servicio?</div>
              <p class="support-banner-sub" style="font-size: 12.5px; margin-top: 4px;">Atención personalizada técnica por WhatsApp y en oficinas.</p>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 11.5px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-headset" style="color: #10b981;"></i> Soporte Técnico</span>
            <span style="color: #10b981; font-weight: 700;">Lun - Sáb 9am a 7pm</span>
          </div>

          <a id="btnSupportWa" href="https://wa.me/${supportPhone}?text=Hola,%20necesito%20apoyo%20con%20mi%20servicio" target="_blank" class="btn-whatsapp" style="width: 100%; padding: 11px 18px; font-size: 13.5px; text-align: center; justify-content: center;">
            <i class="fa-brands fa-whatsapp"></i> Chatear con Soporte Técnico
          </a>
        </div>

      </div>

      <!-- Footer de Marca Oficial CloudWare -->
      <div style="text-align: center; margin-top: 24px; padding-bottom: 24px; font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 7px; font-weight: 700; color: var(--text-title);">
          <div style="width: 18px; height: 18px;">
            ${getCloudWareSphereSvg({ size: 18, isDark: true })}
          </div>
          <span>CloudWare MX</span>
        </div>
        <span style="font-size: 11px; letter-spacing: 0.3px;">Cada segundo cuenta · Portal de Autoservicio</span>
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
            <strong id="modalSsid24Display" style="color: var(--text-title); font-family: monospace;">-</strong>
          </div>
          <div id="modalSsid5gRow" style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-body);"><i class="fa-solid fa-bolt" style="color: #c084fc;"></i> Red 5 GHz:</span>
            <strong id="modalSsid5gDisplay" style="color: var(--text-title); font-family: monospace;">-</strong>
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

  <!-- MODAL: CÓDIGO QR PARA VISITAS (CONEXIÓN DIRECTA 5 GHz) -->
  <div id="modalQr" class="modal-overlay">
    <div class="modal-sheet" style="text-align: center; align-items: center;">
      <div class="modal-sheet-header" style="width: 100%;">
        <div class="modal-sheet-title" id="qrModalTitle" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-bolt" style="color: #c084fc;"></i> Conectar por QR (5 GHz)
        </div>
        <button class="btn-close-modal" onclick="closeModal('modalQr')">&times;</button>
      </div>

      <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: var(--radius-sm); padding: 6px 12px; margin-top: 4px;">
        <span id="qrNetworkName" style="font-size: 13px; color: #c084fc; font-weight: 700;"></span>
      </div>

      <p style="font-size: 12px; color: var(--text-body); margin-top: 6px;">
        Escanea este código con la cámara de tu celular para conectarte a <strong>máxima velocidad (5 GHz)</strong> sin escribir la clave:
      </p>

      <div id="qrcodeBox" style="background: white; padding: 16px; border-radius: 16px; margin: 10px auto; display: flex; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></div>

      <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
        <button id="qrAltBandBtn" class="btn-outline" onclick="toggleQrBand()" style="font-size: 12px; padding: 8px 12px;">
          <i class="fa-solid fa-tower-broadcast"></i> Cambiar a Red 2.4 GHz
        </button>
        <button class="btn-main" onclick="closeModal('modalQr')" style="font-size: 13px; padding: 10px 14px;">
          Listo, cerrar
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: AVISO TRAS CAMBIO DE CONTRASEÑA (DESCONEXIÓN WI-FI TEMPORAL) -->
  <div id="modalPostWifiSuccess" class="modal-overlay">
    <div class="modal-sheet" style="text-align: center;">
      <div style="font-size: 42px; color: #10b981; margin-bottom: 4px;">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <div class="modal-sheet-title" style="font-size: 18px; color: var(--text-title);">¡Contraseña Guardada en tu Módem!</div>
      
      <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 12px; margin: 12px 0; text-align: left; font-size: 12.5px; color: var(--text-body); line-height: 1.4;">
        ⚠️ <strong>Tu teléfono se desconectará del Wi-Fi en unos segundos.</strong><br>
        Para volver a tener internet, conéctate a tu red usando esta nueva clave:
      </div>

      <div style="background: var(--bg-surface); border: 2px dashed #38bdf8; border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px;">
        <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px;">Tu Nueva Contraseña Wi-Fi:</span>
        <div id="postWifiNewPassLabel" style="font-family: monospace; font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: 2px;"></div>
        <button class="btn-outline" onclick="copyPostWifiPass()" style="margin-top: 10px; padding: 8px 12px; font-size: 12px; width: 100%;">
          <i class="fa-solid fa-copy"></i> Copiar Contraseña
        </button>
      </div>

      <button class="btn-main" onclick="openQrModal('5g')" style="margin-bottom: 8px;">
        <i class="fa-solid fa-qrcode"></i> Conectar por QR (Red 5 GHz)
      </button>
      <button class="btn-outline" onclick="closeModal('modalPostWifiSuccess')">
        Entendido, cerrar
      </button>
    </div>
  </div>

  <!-- MODAL: DATOS BANCARIOS (SPEI) -->
  <div id="modalBank" class="modal-overlay">
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-building-columns" style="color: #38bdf8;"></i> Datos de Pago por Transferencia (SPEI)
        </div>
        <button class="btn-close-modal" onclick="closeModal('modalBank')">&times;</button>
      </div>

      <div style="display: none;" id="bankTitularName"></div>

      <!-- Tarjetas de Cuentas y Datos para Copiar -->
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
        
        <!-- Tarjeta: Banco y Beneficiario -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-card); padding: 12px 14px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Banco:</span>
            <strong id="bankNameDisplay" style="color: var(--text-title); font-size: 13.5px; font-weight: 700;">${bankName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-card); padding-top: 8px;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Beneficiario:</span>
            <strong id="bankBeneficiaryText" style="color: var(--text-title); font-size: 13px; font-weight: 700;">${bankBeneficiary}</strong>
          </div>
        </div>

        <!-- Tarjeta: CLABE Interbancaria (SPEI Openpay / Banco) -->
        <div style="background: var(--bg-surface); border: 1.5px solid rgba(56, 189, 248, 0.4); padding: 12px 14px; border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; color: #38bdf8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-bolt" style="color: #f59e0b;"></i> Tu CLABE Única (SPEI Inmediato)
            </span>
            <span id="clabeLiveBadge" style="font-size: 9.5px; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 7px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">
              Auto-Acreditación 24/7
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div id="bankClabeText" style="color: var(--text-title); font-family: monospace; font-size: 15.5px; font-weight: 800; letter-spacing: 0.8px; word-break: break-all;">
              ${bankClabe}
            </div>
            <button class="btn-outline" onclick="copyClabe()" style="width: auto; padding: 4px 10px; font-size: 11px; height: 28px; flex-shrink: 0;">
              <i class="fa-solid fa-copy"></i> Copiar
            </button>
          </div>
          <div id="speiConvenioBox" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08); font-size: 11.5px; color: var(--text-body);">
            <span>Convenio CIE BBVA: <strong id="speiAgreementLabel" style="color: #38bdf8; font-family: monospace;">-</strong></span>
            <span style="margin: 0 6px;">•</span>
            <span>Referencia: <strong id="speiReferenceLabel" style="color: var(--text-title); font-family: monospace;">-</strong></span>
          </div>
        </div>

        <!-- Tarjeta: Número de Cuenta -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-card); padding: 12px 14px; border-radius: var(--radius-md);">
          <div style="margin-bottom: 6px;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid fa-credit-card"></i> Número de Cuenta
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div id="bankAccountText" style="color: var(--text-title); font-family: monospace; font-size: 14.5px; font-weight: 700;">
              ${bankAccount}
            </div>
            <button class="btn-outline" onclick="copyBankAccount()" style="width: auto; padding: 4px 10px; font-size: 11px; height: 28px; flex-shrink: 0;">
              <i class="fa-solid fa-copy"></i> Copiar
            </button>
          </div>
        </div>

        <!-- Tarjeta: Concepto (Nombre del Titular de la Cuenta) -->
        <div style="background: rgba(14, 165, 233, 0.08); border: 1.5px solid rgba(14, 165, 233, 0.35); padding: 12px 14px; border-radius: var(--radius-md);">
          <div style="margin-bottom: 6px;">
            <span style="font-size: 11px; color: #0284c7; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;">
              <i class="fa-solid fa-pen-to-square"></i> En concepto escribe el nombre del titular de la cuenta:
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div id="bankConceptText" style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; color: var(--text-title); line-height: 1.3;">
              Cargando...
            </div>
            <button class="btn-outline" onclick="copyBankConcept()" style="width: auto; padding: 4px 10px; font-size: 11px; height: 28px; flex-shrink: 0; color: #0284c7; border-color: rgba(14, 165, 233, 0.4);">
              <i class="fa-solid fa-copy"></i> Copiar
            </button>
          </div>
          <span id="bankRefText" style="display: none;">-</span>
        </div>

        <!-- Tarjeta: Instrucción de Reenviar Comprobante / Captura al WhatsApp de Oficina -->
        <div style="background: var(--bg-surface); border: 1.5px solid rgba(16, 185, 129, 0.35); padding: 13px 14px; border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <i class="fa-brands fa-whatsapp" style="font-size: 20px; color: var(--success);"></i>
            <span style="font-weight: 800; font-size: 13px; color: var(--text-title);">
              Confirmar Pago por WhatsApp:
            </span>
          </div>
          <div style="font-size: 12px; color: var(--text-body); line-height: 1.45; margin-bottom: 10px;">
            Manda la <strong>captura de pantalla</strong> de tu transferencia y <strong>escribe tu nombre</strong> a nuestro número de oficina:
          </div>

          <!-- Caja con el número visible y botón copiar -->
          <div style="background: var(--bg-card); border: 1px dashed rgba(16, 185, 129, 0.4); padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; display: block;">WhatsApp Oficina:</span>
              <span id="bankOfficePhoneDisplay" style="color: var(--success); font-size: 14.5px; font-weight: 800; font-family: monospace; letter-spacing: 0.5px;">${officePhone}</span>
              <span id="bankOfficePhoneText" style="display: none;">${officePhone}</span>
            </div>
            <button type="button" class="btn-outline" onclick="copyOfficePhone()" style="width: auto; padding: 4px 10px; font-size: 11px; height: 28px; color: var(--success); border-color: rgba(16, 185, 129, 0.4);">
              <i class="fa-solid fa-copy"></i> Copiar
            </button>
          </div>

          <!-- Botón de apertura directa hacia WhatsApp -->
          <a id="btnOfficePaymentWa" href="https://wa.me/52${officePhone}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 800; font-size: 13px; padding: 11px 16px; border-radius: 9px; text-decoration: none; width: 100%; box-sizing: border-box; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);">
            <i class="fa-brands fa-whatsapp" style="font-size: 18px;"></i>
            <span>Mandar Captura y Nombre por WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  </div>

  <!-- MODAL: CREACIÓN OBLIGATORIA / CAMBIO DE CONTRASEÑA -->
  <div id="modalCreatePassword" class="modal-overlay" style="z-index: 250;">
    <div class="modal-sheet" style="border-color: rgba(56, 189, 248, 0.45); max-width: 440px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title" id="createPassModalTitle" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-shield-halved" style="color: #38bdf8;"></i> Crea tu Contraseña de Acceso
        </div>
        <button id="btnCloseCreatePassModal" class="btn-close-modal" onclick="closeModal('modalCreatePassword')" style="display: none;">&times;</button>
      </div>

      <p id="createPassModalSubtitle" style="font-size: 13px; color: var(--text-body); line-height: 1.45; margin: -4px 0 0;">
        Configura tu contraseña para entrar a tu portal desde cualquier celular, computadora o tablet cuando quieras.
      </p>

      <!-- Ficha destacada: Tu Usuario es tu Celular -->
      <div style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(37, 99, 235, 0.12) 100%); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: var(--radius-md); padding: 14px 16px;">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-id-badge"></i> Tus Datos de Acceso para Cualquier Dispositivo
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; margin-bottom: 4px;">
          <span style="color: var(--text-body); font-weight: 600;"><i class="fa-solid fa-user" style="color: #38bdf8;"></i> Tu Usuario:</span>
          <strong id="modalCreatePassPhoneDisplay" style="color: #ffffff; font-family: monospace; font-size: 15px; letter-spacing: 0.5px; background: rgba(0, 0, 0, 0.4); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);">-</strong>
        </div>
        <div style="font-size: 12px; color: var(--text-body); line-height: 1.4; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          💡 <strong>¡Importante!</strong> Tu número celular registrado es tu <strong>nombre de usuario</strong>. Con él y la contraseña que crees aquí podrás iniciar sesión en <strong style="color: #38bdf8;">portal.cloudwaremx.com</strong> desde cualquier equipo o navegador.
        </div>
      </div>

      <form onsubmit="handleSaveCreatePassword(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 5px; display: block; font-weight: 600;">
            Nueva Contraseña (mínimo 6 caracteres)
          </label>
          <div style="position: relative;">
            <input type="password" id="modalCreatePassInput" class="form-input" minlength="6" placeholder="Escribe tu nueva contraseña" required style="padding-right: 42px;">
            <button type="button" onclick="toggleModalPassVisibility('modalCreatePassInput', 'eyeModalCreatePass1')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px;">
              <i id="eyeModalCreatePass1" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <div>
          <label style="font-size: 12px; color: var(--text-body); margin-bottom: 5px; display: block; font-weight: 600;">
            Confirmar Nueva Contraseña
          </label>
          <div style="position: relative;">
            <input type="password" id="modalCreatePassConfirmInput" class="form-input" minlength="6" placeholder="Vuelve a escribir la contraseña" required style="padding-right: 42px;">
            <button type="button" onclick="toggleModalPassVisibility('modalCreatePassConfirmInput', 'eyeModalCreatePass2')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px;">
              <i id="eyeModalCreatePass2" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <div id="createPassErrorAlert" style="display: none; font-size: 12px; color: #ef4444; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); padding: 8px 12px; border-radius: var(--radius-sm);"></div>

        <button type="submit" id="btnSubmitCreatePass" class="btn-main" style="padding: 13px 16px; font-size: 14.5px; font-weight: 700; margin-top: 4px;">
          <i class="fa-solid fa-floppy-disk"></i> Guardar mi Contraseña y Continuar
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: CONTRASEÑA GUARDADA CON ÉXITO -->
  <div id="modalPasswordSuccess" class="modal-overlay" style="z-index: 260;">
    <div class="modal-sheet" style="text-align: center; max-width: 420px; border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center; margin: 4px auto 8px; font-size: 26px; color: #10b981;">
        <i class="fa-solid fa-circle-check"></i>
      </div>

      <div class="modal-sheet-title" style="font-size: 19px; color: var(--text-title); justify-content: center;">
        ¡Contraseña Guardada con Éxito!
      </div>

      <p style="font-size: 13px; color: var(--text-body); line-height: 1.45; margin: 0;">
        Tu cuenta está protegida. Ahora puedes entrar a tu portal cuando quieras desde cualquier dispositivo:
      </p>

      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px 16px; text-align: left; display: flex; flex-direction: column; gap: 8px; font-size: 13.5px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);"><i class="fa-solid fa-globe" style="color: #38bdf8;"></i> Portal Web:</span>
          <strong style="color: #38bdf8; font-size: 13px;">portal.cloudwaremx.com</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);"><i class="fa-solid fa-user" style="color: #38bdf8;"></i> Tu Usuario:</span>
          <strong id="successModalPhoneDisplay" style="color: var(--text-title); font-family: monospace; font-size: 14px;">-</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);"><i class="fa-solid fa-key" style="color: #38bdf8;"></i> Contraseña:</span>
          <span style="color: #10b981; font-weight: 700;">(La que acabas de guardar)</span>
        </div>
      </div>

      <button type="button" class="btn-main" onclick="closeModal('modalPasswordSuccess')" style="padding: 12px 18px; font-size: 14.5px; font-weight: 700; margin-top: 4px;">
        <i class="fa-solid fa-arrow-right"></i> Entendido, ir a Mi Portal
      </button>
    </div>
  </div>

  <!-- MODAL: PAGO CON TARJETA DE DÉBITO / CRÉDITO (OPENPAY) -->
  <div id="modalCardPayment" class="modal-overlay" style="z-index: 240;">
    <div class="modal-sheet" style="max-width: 440px; border-color: rgba(14, 165, 233, 0.45); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);">
      <div class="modal-sheet-header">
        <div class="modal-sheet-title" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-credit-card" style="color: #38bdf8;"></i> Pagar con Tarjeta Bancaria
        </div>
        <button class="btn-close-modal" onclick="closeModal('modalCardPayment')">&times;</button>
      </div>

      <!-- Resumen del Pago con Comisión Desglosada -->
      <div style="background: rgba(14, 165, 233, 0.08); border: 1.5px solid rgba(14, 165, 233, 0.35); border-radius: var(--radius-md); padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-body); margin-bottom: 5px;">
          <span>Mensualidad de Internet:</span>
          <strong id="cardPayBaseAmountLabel" style="color: var(--text-title); font-size: 14px;">$0.00 MXN</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted); margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed var(--border-card);">
          <span>Comisión pasarela bancaria:</span>
          <strong id="cardPayFeeAmountLabel" style="color: #f59e0b;">+$0.00 MXN</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; font-size: 13px; color: var(--text-title);">Total a Cobrar:</span>
          <strong id="cardPayTotalAmountLabel" style="font-size: 19px; font-weight: 800; color: #38bdf8; font-family: 'Outfit', sans-serif;">$0.00 MXN</strong>
        </div>
      </div>

      <!-- Formulario Seguro Openpay -->
      <form id="cardPaymentForm" onsubmit="handleProcessCardPayment(event)" style="display: flex; flex-direction: column; gap: 11px;">
        <input type="hidden" id="openpayDeviceSessionId">

        <div>
          <label style="font-size: 12px; color: var(--text-body); font-weight: 600; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span>Número de Tarjeta (16 dígitos)</span>
            <span style="display: flex; gap: 4px; font-size: 14px; color: var(--text-muted);">
              <i class="fa-brands fa-cc-visa"></i>
              <i class="fa-brands fa-cc-mastercard"></i>
            </span>
          </label>
          <div style="position: relative;">
            <input type="tel" inputmode="numeric" id="cardInputNumber" class="form-input" autocomplete="cc-number" placeholder="4152 0000 0000 1234" maxlength="19" required oninput="formatCardNumber(this)" style="font-family: monospace; letter-spacing: 1.5px; font-size: 15px;">
            <span id="cardBrandIcon" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted);"></span>
          </div>
        </div>

        <div>
          <label style="font-size: 12px; color: var(--text-body); font-weight: 600; margin-bottom: 4px; display: block;">
            Nombre del Titular (como aparece en la tarjeta)
          </label>
          <input type="text" id="cardInputHolder" class="form-input" autocomplete="cc-name" placeholder="JUAN PEREZ" required style="text-transform: uppercase;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 12px; color: var(--text-body); font-weight: 600; margin-bottom: 4px; display: block;">
              Vencimiento (MM/AA)
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <input type="tel" inputmode="numeric" id="cardInputExpMonth" class="form-input" autocomplete="cc-exp-month" placeholder="MM" maxlength="2" required oninput="handleExpMonthInput(this)" style="text-align: center; font-family: monospace; font-size: 15px;">
              <input type="tel" inputmode="numeric" id="cardInputExpYear" class="form-input" autocomplete="cc-exp-year" placeholder="AA" maxlength="2" required oninput="handleExpYearInput(this)" style="text-align: center; font-family: monospace; font-size: 15px;">
            </div>
          </div>
          <div>
            <label style="font-size: 12px; color: var(--text-body); font-weight: 600; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span>CVV / CVC</span>
              <span style="font-size: 10px; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> 3 dígitos</span>
            </label>
            <input type="password" inputmode="numeric" id="cardInputCvv" class="form-input" autocomplete="cc-csc" placeholder="123" maxlength="4" required oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="text-align: center; font-family: monospace; letter-spacing: 2px; font-size: 15px;">
          </div>
        </div>

        <div id="cardPayErrorAlert" style="display: none; font-size: 12px; color: #ef4444; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); padding: 8px 12px; border-radius: var(--radius-sm); line-height: 1.35;"></div>

        <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; justify-content: center;">
          <i class="fa-solid fa-shield-halved" style="color: #10b981;"></i>
          <span>Pagos protegidos por Openpay BBVA con cifrado SSL</span>
        </div>

        <button type="submit" id="btnSubmitCardPay" class="btn-main" style="padding: 13px 16px; font-size: 15px; font-weight: 700; margin-top: 2px; background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%);">
          <i class="fa-solid fa-lock"></i> <span id="btnCardPayText">Confirmar y Pagar</span>
        </button>
      </form>
    </div>
  </div>

  <!-- MODAL: RECIBO DE PAGO CONFIRMADO CON TARJETA -->
  <div id="modalPaymentReceipt" class="modal-overlay" style="z-index: 250;">
    <div class="modal-sheet" style="text-align: center; max-width: 420px; border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center; margin: 4px auto 8px; font-size: 26px; color: #10b981;">
        <i class="fa-solid fa-circle-check"></i>
      </div>

      <div class="modal-sheet-title" style="font-size: 19px; color: var(--text-title); justify-content: center;">
        ¡Pago Aprobado con Éxito!
      </div>

      <p style="font-size: 13px; color: var(--text-body); line-height: 1.45; margin: 0;">
        Tu pago ha sido acreditado en tu cuenta y tu servicio de internet queda activo al 100%.
      </p>

      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px 16px; text-align: left; display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);">Monto Pagado:</span>
          <strong id="receiptAmountLabel" style="color: #10b981; font-size: 16px;">$0.00 MXN</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);">Método de Pago:</span>
          <strong id="receiptMethodLabel" style="color: var(--text-title); font-size: 13px;">Tarjeta Bancaria</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--text-muted);">Autorización Bancaria:</span>
          <strong id="receiptAuthLabel" style="color: #38bdf8; font-family: monospace; font-size: 13px;">-</strong>
        </div>
      </div>

      <button type="button" class="btn-main" onclick="closeModal('modalPaymentReceipt')" style="padding: 12px 18px; font-size: 14.5px; font-weight: 700; margin-top: 4px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <i class="fa-solid fa-check"></i> Listo, Continuar en mi Portal
      </button>
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
        initPortalTheme();
        initPwa();
        initPortal();
      });
    } else {
      initPortalTheme();
      initPwa();
      initPortal();
    }

    function initPortalTheme() {
      const isManual = localStorage.getItem('cw_portal_theme_manual') === 'true';
      let theme = 'dark';
      
      if (isManual) {
        theme = localStorage.getItem('cw_portal_theme') || 'dark';
      } else {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        theme = prefersLight ? 'light' : 'dark';
      }
      
      applyPortalTheme(theme, isManual);

      // Sincronización automática en vivo con el modo del celular del cliente
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const onSystemThemeChange = (e) => {
          if (localStorage.getItem('cw_portal_theme_manual') !== 'true') {
            applyPortalTheme(e.matches ? 'light' : 'dark', false);
          }
        };
        try {
          if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', onSystemThemeChange);
          } else if (mediaQuery.addListener) {
            mediaQuery.addListener(onSystemThemeChange);
          }
        } catch (_) {}
      }
    }

    function applyPortalTheme(theme, isManual = false) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('cw_portal_theme', theme);
      if (isManual) {
        localStorage.setItem('cw_portal_theme_manual', 'true');
      }
      const icon = document.getElementById('themeIcon');
      if (icon) {
        icon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      }
    }

    function togglePortalTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      applyPortalTheme(newTheme, true);
      showToast(newTheme === 'light' ? '☀️ Tema Claro activado' : '🌙 Tema Oscuro activado');
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
      localStorage.removeItem('cp_selected_service');
      currentToken = '';
      currentPhone = '';
      const btnPass = document.getElementById('btnChangePassword');
      if (btnPass) btnPass.classList.add('hidden');
      const btnLogout = document.getElementById('btnLogout');
      if (btnLogout) btnLogout.classList.add('hidden');
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
        showToast('Ingresa el nombre completo del titular');
        return;
      }

      const submitBtn = e.target.querySelector('button[type="submit"]') || document.querySelector('#viewNotFound button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando y vinculando...';
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
        const urlP = new URLSearchParams(window.location.search).get('p') || new URLSearchParams(window.location.search).get('phone') || '';
        const cleanUrlP = urlP.replace(/\D/g, '').slice(-10);
        const savePhone = (cleanUrlP || currentPhone || localStorage.getItem('cp_phone') || '').replace(/\D/g, '').slice(-10);
        const res = await fetch('/api/portal/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: savePhone, password: pass })
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

    let isPassRevealedShared = true;
    let currentQrBand = '5g';

    // Dashboard Data Loading (Carga Instantánea y Conexión Segura con Soporte Offline)
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

        if (!data.success || !data.client || data.sessionRevoked || res.status === 401 || res.status === 403) {
          localStorage.removeItem('cp_token');
          localStorage.removeItem('cp_phone');
          localStorage.removeItem('cp_selected_service');
          sessionStorage.clear();
          if (data?.sessionRevoked || res.status === 401 || res.status === 403) {
            showToast(data?.message || 'Tu enlace o sesión ha sido revocado. Ingresa de nuevo.', 'warning');
            showLogin();
          } else if (res.status === 404 && targetPhone) {
            showNotFound(targetPhone);
          } else {
            if (data?.message) showToast(data.message, 'error');
            showLogin();
          }
          return;
        }

        if (data.token) {
          localStorage.setItem('cp_token', data.token);
          currentToken = data.token;
        }
        const urlParamsNow = new URLSearchParams(window.location.search);
        const cleanPNow = (urlParamsNow.get('p') || urlParamsNow.get('phone') || '').replace(/\D/g, '').slice(-10);
        const activeClientPhone = cleanPNow || targetPhone || (data.client && data.client.telefono) || '';
        if (activeClientPhone) {
          currentPhone = activeClientPhone.replace(/\D/g, '').slice(-10);
          localStorage.setItem('cp_phone', currentPhone);
        }

        // Guardar en caché local para persistencia 100% offline
        try {
          localStorage.setItem('cp_cached_dashboard_' + currentPhone, JSON.stringify(data));
        } catch (e) {}

        hideAllViews();
        document.getElementById('viewDashboard').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        const btnChangePass1 = document.getElementById('btnChangePassword');
        if (btnChangePass1) btnChangePass1.classList.remove('hidden');

        renderDashboard(data);
      } catch (err) {
        console.warn('[Portal] Conexión caída o cambio de Wi-Fi. Intentando cargar caché offline...', err);
        // Rescatar datos de caché offline solo si no hay error de autenticación
        const cachedStr = localStorage.getItem('cp_cached_dashboard_' + targetPhone);
        if (cachedStr && targetToken) {
          try {
            const cachedData = JSON.parse(cachedStr);
            const localPass = localStorage.getItem('cp_last_pass');
            if (localPass) {
              if (!cachedData.wifi) cachedData.wifi = {};
              cachedData.wifi.password = localPass;
              cachedData.wifi.password24 = localPass;
              cachedData.wifi.password5g = localPass;
            }
            hideAllViews();
            document.getElementById('viewDashboard').classList.remove('hidden');
            document.getElementById('btnLogout').classList.remove('hidden');
            const btnChangePass2 = document.getElementById('btnChangePassword');
            if (btnChangePass2) btnChangePass2.classList.remove('hidden');
            renderDashboard(cachedData);
            showToast('Mostrando datos guardados en tu dispositivo');
            return;
          } catch (e2) {}
        }

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

    function cleanTitularName(raw) {
      if (!raw) return 'Cliente CloudWare';
      let str = String(raw).trim();
      // Limpiar prefijos de OLT/WispHub como "696 - ", "696-", "#715 ", "001: "
      str = str.replace(/^\\s*#?\\d+\\s*[-_.:|]+\\s*/, '').trim();
      // Limpiar números iniciales sueltos como "696 Maria..."
      str = str.replace(/^\\s*\\d{2,}\\s+/, '').trim();
      return str || String(raw).trim();
    }

    function renderDashboard(data) {
      const c = data.client;
      currentContractId = String(c.id_servicio);
      currentServices = data.relatedServices || [];
      const urlPNow = new URLSearchParams(window.location.search).get('p') || new URLSearchParams(window.location.search).get('phone') || '';
      const cleanUrlPNow = urlPNow.replace(/\D/g, '').slice(-10);
      const activeDisplayPhone = cleanUrlPNow || currentPhone || (c.telefono || '').replace(/\D/g, '').slice(-10);
      if (activeDisplayPhone) {
        currentPhone = activeDisplayPhone.replace(/\D/g, '').slice(-10);
        localStorage.setItem('cp_phone', currentPhone);
      }

      // Header Saludo y Perfil Ejecutivo del Titular
      const rawTitular = data.onu?.name || c.smartolt_name || c.nombre || 'Cliente';
      const cleanTitular = cleanTitularName(rawTitular);
      const firstName = cleanTitular.split(' ')[0] || 'Cliente';

      document.getElementById('headerGreeting').innerText = 'Hola, ' + firstName;

      // 1. Tarjeta Perfil Ejecutivo Superior
      const heroNameEl = document.getElementById('titularHeroName');
      if (heroNameEl) heroNameEl.innerText = cleanTitular;

      const heroFolioEl = document.getElementById('titularHeroFolio');
      if (heroFolioEl) heroFolioEl.innerText = '#' + (c.folio || c.id_servicio);

      const heroPhoneEl = document.getElementById('titularHeroPhone');
      if (heroPhoneEl) heroPhoneEl.innerText = currentPhone || 'Registrado';

      // 2. Tarjeta de Paquete
      document.getElementById('titularName').innerText = cleanTitular;
      document.getElementById('contractFolio').innerText = '#' + (c.folio || c.id_servicio);

      // 3. Modal Datos de Pago Bancario
      const bankTitularEl = document.getElementById('bankTitularName');
      if (bankTitularEl) bankTitularEl.innerText = cleanTitular;

      const bankRefEl = document.getElementById('bankRefText');
      if (bankRefEl) bankRefEl.innerText = 'SRV-' + (c.folio || c.id_servicio);

      const bankConceptEl = document.getElementById('bankConceptText');
      if (bankConceptEl) {
        // En concepto el nombre del titular de la cuenta
        bankConceptEl.innerText = cleanTitular;
      }

      if (data.bankDetails) {
        cachedBankDetails = data.bankDetails;
        applyBankDetails(data.bankDetails, cleanTitular, c.id_servicio);
      } else {
        updateOfficePaymentLink('${officePhone}', cleanTitular, c.id_servicio);
      }

      // Paquete Contratado con Gran Énfasis Visual y Corrección de Discrepancias
      const rawPlan = (c.plan_internet || data.onu?.speed_profile || '').trim();
      let cleanPlan = rawPlan.replace(/^(?:paquete|pakete|plan)\\s+/i, '').trim();
      if (!cleanPlan) cleanPlan = '40 Megas';
      
      // Extraer velocidad en Megas / Mbps / Gigas
      let speedBig = '';
      const speedMatch = rawPlan.match(/(\\d+)\\s*(?:m|megas?|mbps|g|gb|gigas?)\\b/i) || cleanPlan.match(/(\\d+)\\s*(?:m|megas?|mbps|g|gb|gigas?)\\b/i);
      if (speedMatch) {
        speedBig = speedMatch[1] + (/(?:g|gb|gigas?)/i.test(speedMatch[0]) ? 'G' : 'M');
      } else {
        const numOnly = rawPlan.match(/\\b(\\d{2,4})\\b/) || cleanPlan.match(/\\b(\\d{2,4})\\b/);
        if (numOnly) {
          speedBig = numOnly[1] + 'M';
        } else if (cleanPlan.length <= 6 && /\\d/.test(cleanPlan)) {
          speedBig = cleanPlan.toUpperCase();
        } else {
          speedBig = '40M';
        }
      }

      // Nombre completo formateado amigablemente
      let displayPlanName = '';
      if (/^(?:paquete|pakete|plan)\\s+/i.test(rawPlan)) {
        displayPlanName = rawPlan.replace(/^pakete\\s+/i, 'Paquete ').replace(/^paquete\\s+/i, 'Paquete ').replace(/^plan\\s+/i, 'Plan ');
      } else {
        displayPlanName = 'Paquete ' + cleanPlan;
      }

      const planNameEl = document.getElementById('planNameBig');
      if (planNameEl) {
        planNameEl.innerText = displayPlanName;
      }
      const planSpeedEl = document.getElementById('planSpeedBig');
      if (planSpeedEl) {
        planSpeedEl.innerText = speedBig;
      }

      // Onboarding Password Banner & Modal Obligatorio de Creación
      const onb = document.getElementById('onboardingBanner');
      if (data.hasPassword === false) {
        if (onb) {
          onb.classList.remove('hidden');
          const phoneLbl = document.getElementById('onboardingPhoneLabel');
          if (phoneLbl) phoneLbl.innerText = currentPhone;
        }
        // Desplegar modal obligatorio para crear contraseña
        openCreatePasswordModal(currentPhone, false);
      } else {
        if (onb) onb.classList.add('hidden');
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
          const activeBadge = isActive 
            ? '<span class="service-card-badge active"><i class="fa-solid fa-circle-check"></i> En Pantalla</span>' 
            : '<span class="service-card-badge inactive"><i class="fa-regular fa-circle"></i> Tocar para ver</span>';
          const dir = s.direccion || s.zona || s.router || ('Servicio ' + (idx + 1));
          const folioVal = s.folio || s.id_servicio;
          const srvTitle = s.smartolt_name || s.nombre || ('Servicio #' + folioVal);
          let plan = (s.plan_internet || 'Internet Fibra').replace(/^(?:paquete|pakete|plan)\\s+/i, '');
          const saldo = Number(s.saldo || 0);
          const saldoTxt = saldo <= 0 ? 'Al corriente' : ('Debe $' + saldo.toFixed(2));
          const saldoColor = saldo <= 0 ? '#10b981' : '#f59e0b';
          const onuTag = s.sn_onu ? ('<span style="font-family:monospace; font-size:10.5px; background:rgba(2,132,199,0.12); color:#38bdf8; padding:2px 5px; border-radius:4px;">ONU: ' + s.sn_onu + '</span>') : '';

          return '<div class="service-card-item ' + activeClass + '" data-service-id="' + s.id_servicio + '" onclick="onSwitchService(' + s.id_servicio + ')">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">' +
              '<span style="font-weight:800; font-size:13.5px; color:var(--text-title); display:flex; align-items:center; gap:6px;">' +
                '<i class="fa-solid fa-house-signal" style="color:#0284c7;"></i> Folio #' + folioVal +
              '</span>' +
              activeBadge +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:700; color:#38bdf8; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + srvTitle + '">' + srvTitle + '</div>' +
            '<div style="font-size:11.5px; color:var(--text-body); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px; display:flex; align-items:center; gap:6px;">' +
              '<span>' + dir + '</span>' +
              onuTag +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; margin-top:6px; padding-top:6px; border-top:1px solid var(--border-card);">' +
              '<span style="color:var(--text-muted); font-weight:600;"><i class="fa-solid fa-bolt" style="color:#0284c7; font-size:10px;"></i> ' + plan + '</span>' +
              '<span style="font-weight:700; color:' + saldoColor + ';">' + saldoTxt + '</span>' +
            '</div>' +
          '</div>';
        }).join('');
      } else {
        multiBox.classList.add('hidden');
      }

      // Estado de Conexión (si existe el contenedor)
      const dot = document.getElementById('statusPulseDot');
      const title = document.getElementById('statusFriendlyTitle');
      const sub = document.getElementById('statusFriendlySub');
      const sig = data.signal || {};

      if (dot && title && sub) {
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
      }

      // Información complementaria de paquete y módem
      const priceEl = document.getElementById('planPriceLabel');
      if (priceEl && c.precio_plan) {
        priceEl.innerText = '$' + Number(c.precio_plan).toFixed(2) + ' MXN / mes';
      }

      const pwrBadge = document.getElementById('opticalPowerBadge');
      if (pwrBadge) {
        if (sig.opticalPowerDbm) {
          pwrBadge.innerText = sig.opticalPowerDbm + ' dBm';
          pwrBadge.style.color = (Number(sig.opticalPowerDbm) < -27) ? '#f59e0b' : '#10b981';
        } else {
          pwrBadge.innerText = 'Fibra OK';
        }
      }

      const onuSnEl = document.getElementById('onuSnLabel');
      if (onuSnEl) {
        onuSnEl.innerText = 'ONU: ' + (data.onu?.sn || c.sn_onu || 'GPON');
      }

      const addrEl = document.getElementById('clientAddressLabel');
      if (addrEl) {
        addrEl.innerText = (c.direccion || data.onu?.zone_name || 'Domicilio registrado');
      }

      // Wi-Fi Real Dual Band Simplificado (Una Sola Contraseña Compartida)
      const wifi = data.wifi || {};
      realWifiSsid24 = wifi.ssid24 || ('CloudWare_' + c.id_servicio);
      realWifiPassword24 = wifi.password24 || wifi.password || '********';
      realWifiSsid5g = wifi.ssid5g || (realWifiSsid24 + '-5G');
      realWifiPassword5g = wifi.password5g || realWifiPassword24;

      document.getElementById('wifiSsid24Label').innerText = realWifiSsid24;

      const box5g = document.getElementById('boxWifi5g');
      if (wifi.has5g !== false) {
        if (box5g) box5g.style.display = 'flex';
        document.getElementById('wifiSsid5gLabel').innerText = realWifiSsid5g;
      } else {
        if (box5g) box5g.style.display = 'none';
      }

      const sharedPass = realWifiPassword5g || realWifiPassword24;
      document.getElementById('wifiPassSharedLabel').innerText = sharedPass;

      // Facturación y Saldo
      currentClientPlanPrice = Number(c.precio_plan || 250);
      const balance = Number(c.saldo !== undefined ? c.saldo : 0);
      const hasPending = !!c.has_pending || balance > 0;
      const bAmt = document.getElementById('billingAmountLabel');
      const bDue = document.getElementById('billingDueLabel');
      const bBadge = document.getElementById('billingBadge');

      if (bAmt) bAmt.innerText = '$' + balance.toFixed(2);
      if (bDue) bDue.innerText = 'Corte: ' + (c.fecha_corte || ('Día ' + (c.dia_corte || 5) + ' del mes'));

      if (bBadge) {
        if (!hasPending && balance <= 0) {
          bBadge.className = 'badge-status paid';
          bBadge.innerText = 'Al Corriente';
        } else {
          bBadge.className = 'badge-status pending';
          bBadge.innerText = 'Pago Pendiente';
        }
      }

      document.getElementById('bankRefText').innerText = 'SRV-' + (c.folio || c.id_servicio);
      if (data.bankDetails) {
        cachedBankDetails = data.bankDetails;
        applyBankDetails(data.bankDetails, c.nombre || data.bankDetails.titular, c.id_servicio);
      }

      loadInvoicesHistory();
    }

    function onSwitchService(serviceId) {
      if (!serviceId) return;
      const sIdStr = String(serviceId);
      localStorage.setItem('cp_selected_service', sIdStr);

      // 1. Feedback visual instantáneo e inconfundible en las tarjetas
      document.querySelectorAll('.service-card-item').forEach(el => {
        const isCurrent = el.getAttribute('data-service-id') === sIdStr;
        el.classList.toggle('active', isCurrent);
        const badgeEl = el.querySelector('.service-card-badge');
        if (badgeEl) {
          if (isCurrent) {
            badgeEl.className = 'service-card-badge active';
            badgeEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> En Pantalla';
          } else {
            badgeEl.className = 'service-card-badge inactive';
            badgeEl.innerHTML = '<i class="fa-regular fa-circle"></i> Tocar para ver';
          }
        }
      });

      // 2. Feedback visual inmediato en la tarjeta de paquete y velocidad
      const planNameEl = document.getElementById('planNameBig');
      if (planNameEl) {
        planNameEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:17px; color:#0284c7;"></i> Cambiando al Folio #' + sIdStr + '...';
      }
      const planSpeedEl = document.getElementById('planSpeedBig');
      if (planSpeedEl) {
        planSpeedEl.innerText = '...';
      }

      // 3. Forzar carga inmediata del contrato seleccionado
      isLoadingDashboard = false;
      loadDashboard(sIdStr);
    }

    let cachedBankDetails = null;

    async function loadInvoicesHistory() {
      if (!currentContractId) return;
      try {
        const res = await fetch('/api/portal/billing-history?serviceId=' + currentContractId + '&token=' + encodeURIComponent(currentToken));
        const data = await res.json();
        const container = document.getElementById('invoicesList');

        if (data.bankDetails) {
          cachedBankDetails = data.bankDetails;
          const titular = document.getElementById('bankConceptText')?.innerText || document.getElementById('titularHeroName')?.innerText || data.bankDetails.titular || 'Cliente';
          applyBankDetails(data.bankDetails, titular, currentContractId);
        }

        if (data.success) {
          // Sincronizar dinámicamente saldo principal con el balance real y facturas pendientes
          const effectiveBalance = Number(data.balance !== undefined ? data.balance : 0);
          const hasPending = data.hasPending || (data.invoices && data.invoices.some(inv => !String(inv.estado || '').toLowerCase().includes('pagad')));
          const bAmt = document.getElementById('billingAmountLabel');
          const bBadge = document.getElementById('billingBadge');
          const bDue = document.getElementById('billingDueLabel');

          if (hasPending || effectiveBalance > 0) {
            if (bAmt) bAmt.innerText = '$' + effectiveBalance.toFixed(2);
            if (bBadge) {
              bBadge.className = 'badge-status pending';
              bBadge.innerText = 'Pago Pendiente';
            }
            if (bDue && data.dueDate) {
              bDue.innerText = 'Vence: ' + data.dueDate;
            }
          } else {
            if (bAmt) bAmt.innerText = '$0.00';
            if (bBadge) {
              bBadge.className = 'badge-status paid';
              bBadge.innerText = 'Al Corriente';
            }
          }
        }

        if (data.success && data.invoices && data.invoices.length > 0) {
          const countBadge = document.getElementById('invoicesTotalCountBadge');
          if (countBadge) {
            countBadge.innerText = data.invoices.length + ' Pagos';
          }
          container.innerHTML = data.invoices.map(inv => {
            const isPaid = String(inv.estado || '').toLowerCase().includes('pagad');
            const statusClass = isPaid ? 'paid' : 'pending';
            const statusText = isPaid ? 'Pagada' : (inv.estado || 'Pendiente de Pago');
            const payBtn = (!isPaid) 
              ? '<button onclick="openModalCardPayment(' + inv.id + ', ' + Number(inv.monto || 0) + ')" class="btn-main" style="width:auto; padding:5px 12px; font-size:12px; height:30px; border-radius:7px; display:inline-flex; align-items:center; gap:5px; background:linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%); font-weight:700;"><i class="fa-solid fa-credit-card"></i> Pagar con Tarjeta</button>' 
              : '';
            
            let fechaPagoStr = '';
            if (inv.fecha_pago) {
              const dt = new Date(inv.fecha_pago);
              if (!isNaN(dt.getTime())) {
                const day = String(dt.getDate()).padStart(2, '0');
                const mon = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][dt.getMonth()];
                const yr = dt.getFullYear();
                const hrs = String(dt.getHours()).padStart(2, '0');
                const min = String(dt.getMinutes()).padStart(2, '0');
                fechaPagoStr = day + '/' + mon + '/' + yr + ' ' + hrs + ':' + min;
              } else {
                fechaPagoStr = String(inv.fecha_pago).slice(0, 16).replace('T', ' ');
              }
            }
            let venceStr = '';
            if (inv.fecha_vencimiento) {
              const parts = String(inv.fecha_vencimiento).split('T')[0].split('-');
              if (parts.length === 3) {
                const day = parts[2];
                const mon = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(parts[1], 10) - 1] || parts[1];
                const yr = parts[0];
                venceStr = day + '/' + mon + '/' + yr;
              } else {
                venceStr = inv.fecha_vencimiento;
              }
            }
            const fechaLabel = isPaid 
              ? ('Pagada el ' + (fechaPagoStr || inv.fecha_emision || 'Reciente'))
              : ('Vence el ' + (venceStr || 'Próximo corte'));

            const receiptBtn = inv.pdf_url ? '<a href="' + inv.pdf_url + '" target="_blank" style="font-size:11px; color:#0284c7; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:600; padding:3px 8px; border-radius:6px; background:rgba(2,132,199,0.08); border:1px solid rgba(2,132,199,0.25);"><i class="fa-solid fa-file-arrow-down"></i> Recibo</a>' : '';

            return '<div style="background:var(--bg-surface); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:11px 13px; display:flex; flex-direction:column; gap:7px;">' +
              '<div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">' +
                '<div style="min-width:0; flex:1;">' +
                  '<div style="font-weight:700; font-size:13px; color:var(--text-title); display:flex; align-items:center; gap:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    '<i class="fa-solid fa-receipt" style="color:#0284c7;"></i> Factura #' + (inv.folio || inv.id) +
                  '</div>' +
                  '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">' + fechaLabel + '</div>' +
                '</div>' +
                '<div style="text-align:right; flex-shrink:0;">' +
                  '<span style="font-weight:800; font-size:15.5px; color:var(--text-title); display:block;">$' + Number(inv.monto || 0).toFixed(2) + '</span>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:6px; border-top:1px solid var(--border-card);">' +
                '<span class="badge-status ' + statusClass + '" style="font-size:10.5px; padding:2px 7px;"><i class="fa-solid ' + (isPaid ? 'fa-circle-check' : 'fa-clock') + '"></i> ' + statusText + '</span>' +
                (payBtn || receiptBtn || '<span style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Liquidado</span>') +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          const countBadge = document.getElementById('invoicesTotalCountBadge');
          if (countBadge) countBadge.innerText = '0 Pagos';
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:12px; background:rgba(255,255,255,0.02); border-radius:12px;">Estás al corriente con tus pagos 👍 No hay facturas pendientes.</div>';
        }
      } catch (err) {
        console.warn('Error al cargar facturas:', err);
      }
    }

    function applyBankDetails(b, titularName, contractId) {
      if (!b) return;
      if (b.bank) {
        const el = document.getElementById('bankNameDisplay');
        if (el) el.innerText = b.bank;
      }
      if (b.clabe) {
        const el = document.getElementById('bankClabeText');
        if (el) el.innerText = b.clabe;
      }
      if (b.account) {
        const el = document.getElementById('bankAccountText');
        if (el) el.innerText = b.account;
      }
      if (b.beneficiary) {
        const el = document.getElementById('bankBeneficiaryText');
        if (el) el.innerText = b.beneficiary;
      }
      const conceptTitular = titularName || b.titular || b.concept || 'Cliente';
      const conceptEl = document.getElementById('bankConceptText');
      if (conceptEl) conceptEl.innerText = conceptTitular;
      const rawPhone = b.officePhone || '${officePhone}';
      updateOfficePaymentLink(rawPhone, titularName || b.titular, contractId);
    }

    function updateOfficePaymentLink(rawPhone, titularName, contractId) {
      if (!rawPhone) return;
      let digits = String(rawPhone).replace(/\\D/g, '');
      if (digits.startsWith('521') && digits.length === 13) {
        digits = '52' + digits.slice(3);
      } else if (digits.length === 10) {
        digits = '52' + digits;
      }
      const titular = titularName || document.getElementById('bankConceptText')?.innerText || document.getElementById('titularHeroName')?.innerText || 'Cliente';
      const folio = contractId || currentContractId || '';
      const textMsg = 'Hola, envío comprobante de pago de mi servicio.\\nTitular: ' + titular + (folio ? ('\\nContrato: #' + folio) : '');
      const waUrl = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(textMsg);
      
      const btn = document.getElementById('btnOfficePaymentWa');
      if (btn) btn.href = waUrl;

      const formatted = rawPhone.replace(/\\D/g, '').slice(-10);
      const displayTxt = formatted ? ('+52 ' + formatted) : rawPhone;

      const display = document.getElementById('bankOfficePhoneDisplay');
      if (display) display.innerText = displayTxt;
      const span = document.getElementById('bankOfficePhoneText');
      if (span) span.innerText = displayTxt;
    }

    function copyOfficePhone() {
      const val = (document.getElementById('bankOfficePhoneDisplay')?.innerText || document.getElementById('bankOfficePhoneText')?.innerText || '').trim();
      navigator.clipboard.writeText(val);
      showToast('Número de oficina copiado: ' + val);
    }

    // Copiado de Contraseña Única
    function copyWifiPassShared() {
      const pass = realWifiPassword5g || realWifiPassword24;
      navigator.clipboard.writeText(pass);
      showToast('Contraseña Wi-Fi copiada al portapapeles');
    }

    function copyPostWifiPass() {
      const pass = realWifiPassword5g || realWifiPassword24;
      navigator.clipboard.writeText(pass);
      showToast('Contraseña Wi-Fi copiada');
    }

    function copyWifiSsid24() {
      navigator.clipboard.writeText(realWifiSsid24 || document.getElementById('wifiSsid24Label').innerText);
      showToast('Nombre de red 2.4 GHz copiado');
    }

    function copyWifiSsid5g() {
      navigator.clipboard.writeText(realWifiSsid5g || document.getElementById('wifiSsid5gLabel').innerText);
      showToast('Nombre de red 5 GHz copiado');
    }

    function copyClabe() {
      const val = (document.getElementById('bankClabeText')?.innerText || '').replace(/\\s+/g, '');
      navigator.clipboard.writeText(val);
      showToast('CLABE copiada: ' + val);
    }

    function copyBankAccount() {
      const val = (document.getElementById('bankAccountText')?.innerText || '').replace(/\\s+/g, '');
      navigator.clipboard.writeText(val);
      showToast('Número de cuenta copiado: ' + val);
    }

    function copyBankConcept() {
      const val = (document.getElementById('bankConceptText')?.innerText || '').trim();
      navigator.clipboard.writeText(val);
      showToast('Nombre de titular copiado: ' + val);
    }

    function copyBankRef() {
      const val = (document.getElementById('bankRefText')?.innerText || '').trim();
      if (val) {
        navigator.clipboard.writeText(val);
        showToast('Referencia copiada: ' + val);
      }
    }

    async function handleRebootModem() {
      if (!confirm('¿Deseas enviar una señal para reiniciar tu módem de fibra? El equipo tardará entre 1 y 2 minutos en volver a sincronizar.')) return;
      showToast('Enviando señal de reinicio a tu módem...');
      try {
        const res = await fetch('/api/portal/reboot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: currentContractId, token: currentToken })
        });
        const d = await res.json();
        if (d.success) {
          showToast('✅ Señal enviada. El módem se está reiniciando.');
        } else {
          showToast(d.message || 'No se pudo reiniciar el módem.');
        }
      } catch (e) {
        showToast('Error de conexión con el servidor.');
      }
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

      openModalWithState('modalWifi');
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
        box.style.color = '#059669';
        box.innerHTML = '<div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:12px;">' +
          '<i class="fa-solid fa-shield-halved"></i> Contraseña de Alta Seguridad (Recomendada)' +
          '</div>' +
          '<div style="font-size:11px; color:var(--text-body); margin-top:4px; line-height:1.3;">' +
          'Cumple con 10 caracteres, mayúsculas, minúsculas, números y símbolo. Tu red estará 100% protegida.' +
          '</div>';
      } else {
        box.style.background = 'rgba(245, 158, 11, 0.12)';
        box.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        box.style.color = '#d97706';
        box.innerHTML = '<div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:12px;">' +
          '<i class="fa-solid fa-triangle-exclamation"></i> Contraseña manual poco segura' +
          '</div>' +
          '<div style="font-size:11px; color:var(--text-body); margin-top:4px; line-height:1.3;">' +
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

    // QR Code por defecto conectando a 5 GHz (Ultra Velocidad)
    function openQrModal(band = '5g') {
      currentQrBand = (band === '24' || (!realWifiSsid5g && band !== '5g')) ? '24' : '5g';
      const is5g = currentQrBand === '5g';
      const ssid = is5g ? (realWifiSsid5g || (realWifiSsid24 + '-5G')) : (realWifiSsid24 || document.getElementById('wifiSsid24Label').innerText);
      const pass = realWifiPassword5g || realWifiPassword24;

      const titleEl = document.getElementById('qrModalTitle');
      if (titleEl) {
        titleEl.innerHTML = is5g 
          ? '<i class="fa-solid fa-bolt" style="color: #c084fc;"></i> Conectar por QR (Red 5 GHz)' 
          : '<i class="fa-solid fa-tower-broadcast" style="color: #38bdf8;"></i> Conectar por QR (Red 2.4 GHz)';
      }
      
      const nameEl = document.getElementById('qrNetworkName');
      if (nameEl) {
        nameEl.innerText = ssid + (is5g ? ' · Red 5 GHz (Ultra Velocidad)' : ' · Red 2.4 GHz (Mayor Alcance)');
      }

      const altBtn = document.getElementById('qrAltBandBtn');
      if (altBtn) {
        altBtn.innerHTML = is5g 
          ? '<i class="fa-solid fa-tower-broadcast"></i> Cambiar a Red 2.4 GHz' 
          : '<i class="fa-solid fa-bolt"></i> Cambiar a Red 5 GHz';
      }

      const qrData = 'WIFI:T:WPA;S:' + ssid + ';P:' + pass + ';;';
      const box = document.getElementById('qrcodeBox');
      box.innerHTML = '';
      new QRCode(box, {
        text: qrData,
        width: 175,
        height: 175,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      openModalWithState('modalQr');
    }

    function toggleQrBand() {
      openQrModal(currentQrBand === '5g' ? '24' : '5g');
    }

    function openModalBank() {
      const titular = document.getElementById('bankConceptText')?.innerText || document.getElementById('titularHeroName')?.innerText || 'Cliente';
      if (cachedBankDetails) {
        applyBankDetails(cachedBankDetails, titular, currentContractId);
      }
      fetchFreshBankDetails();
      openModalWithState('modalBank');
    }

    async function fetchFreshBankDetails() {
      try {
        const cId = currentContractId || localStorage.getItem('cp_selected_service') || '';
        if (!cId) return;
        const res = await fetch('/api/portal/billing-history?serviceId=' + encodeURIComponent(cId) + (currentToken ? ('&token=' + encodeURIComponent(currentToken)) : ''));
        const data = await res.json();
        if (data && data.success && data.bankDetails) {
          cachedBankDetails = data.bankDetails;
          const titular = document.getElementById('bankConceptText')?.innerText || document.getElementById('titularHeroName')?.innerText || data.bankDetails.titular || 'Cliente';
          applyBankDetails(data.bankDetails, titular, cId);
        }

        // Consultar CLABE personalizada de Openpay en segundo plano
        fetch('/api/portal/openpay/spei?serviceId=' + encodeURIComponent(cId))
          .then(r => r.json())
          .then(speiData => {
            if (speiData && speiData.success && speiData.spei?.clabe) {
              const clabeVal = String(speiData.spei.clabe).trim();
              if (clabeVal.length === 18 && clabeVal !== '000000000000000001') {
                const clabeEl = document.getElementById('bankClabeText');
                if (clabeEl) clabeEl.innerText = clabeVal;
              }
              if (speiData.spei.agreement) {
                const box = document.getElementById('speiConvenioBox');
                const agEl = document.getElementById('speiAgreementLabel');
                const refEl = document.getElementById('speiReferenceLabel');
                if (box) box.style.display = 'block';
                if (agEl) agEl.innerText = speiData.spei.agreement;
                if (refEl) refEl.innerText = speiData.spei.reference || ('SRV-' + cId);
              }
            }
          })
          .catch(() => {});
      } catch (err) {
        console.warn('Error al actualizar datos bancarios en vivo:', err);
      }
    }

    // ==========================================
    // LOGICA OPENPAY (TARJETA Y DISPOSITIVO)
    // ==========================================
    let openpayConfig = null;
    let currentPendingAmount = 0;
    let currentTargetInvoiceId = null;

    async function initOpenpaySdk() {
      if (openpayConfig) return true;
      try {
        const res = await fetch('/api/portal/openpay/config');
        const data = await res.json();
        if (data && data.success && data.merchantId && data.publicKey) {
          openpayConfig = data;
          if (window.OpenPay) {
            OpenPay.setId(data.merchantId);
            OpenPay.setApiKey(data.publicKey);
            OpenPay.setSandboxMode(data.isSandbox);
          }
          return true;
        }
      } catch (err) {
        console.warn('Error al cargar config de Openpay:', err);
      }
      return false;
    }

    async function openModalCardPayment(invoiceId, amount) {
      await initOpenpaySdk();

      currentTargetInvoiceId = invoiceId || null;
      if (amount !== undefined && Number(amount) > 0) {
        currentPendingAmount = Number(amount);
      } else {
        const saldoTxt = document.getElementById('billingAmountLabel')?.innerText || '$0';
        const num = parseFloat(saldoTxt.replace(/[^0-9.]/g, '')) || 0;
        currentPendingAmount = num > 0 ? num : (currentClientPlanPrice || 250);
      }

      updateCardPaymentFeeDisplay(currentPendingAmount);

      const form = document.getElementById('cardPaymentForm');
      if (form) form.reset();
      const errBox = document.getElementById('cardPayErrorAlert');
      if (errBox) errBox.style.display = 'none';

      if (window.OpenPay && window.OpenPay.deviceData) {
        try {
          const deviceSessionId = OpenPay.deviceData.setup('cardPaymentForm');
          const devIn = document.getElementById('openpayDeviceSessionId');
          if (devIn) devIn.value = deviceSessionId;
        } catch (e) {
          console.warn('Error setup OpenPay deviceData:', e);
        }
      }

      openModalWithState('modalCardPayment');
    }

    function updateCardPaymentFeeDisplay(net) {
      const p = openpayConfig?.feePercent || 2.9;
      const f = openpayConfig?.feeFixed || 2.5;
      const taxFactor = 1.16;
      const P = (p / 100) * taxFactor;
      const F = f * taxFactor;
      const total = Math.round(((net + F) / (1 - P)) * 100) / 100;
      const fee = Math.round((total - net) * 100) / 100;

      const baseEl = document.getElementById('cardPayBaseAmountLabel');
      if (baseEl) baseEl.innerText = '$' + net.toFixed(2) + ' MXN';

      const feeEl = document.getElementById('cardPayFeeAmountLabel');
      if (feeEl) feeEl.innerText = '+$' + fee.toFixed(2) + ' MXN (' + p + '% + $' + f + ' +IVA)';

      const totalEl = document.getElementById('cardPayTotalAmountLabel');
      if (totalEl) totalEl.innerText = '$' + total.toFixed(2) + ' MXN';

      const btnTxt = document.getElementById('btnCardPayText');
      if (btnTxt) btnTxt.innerText = 'Pagar $' + total.toFixed(2) + ' MXN';
    }

    function formatCardNumber(input) {
      // 1. Extraer estrictamente los dígitos (sin backslashes vulnerables a template literal)
      var val = (input.value || '').replace(/[^0-9]/g, '').slice(0, 16);
      
      // 2. Formatear en bloques de 4 dígitos limpios (ej: 4111 1111 1111 1111)
      var parts = [];
      for (var i = 0; i < val.length; i += 4) {
        parts.push(val.substring(i, i + 4));
      }
      input.value = parts.join(' ');

      // 3. Detectar marca de tarjeta y mostrar icono
      var icon = document.getElementById('cardBrandIcon');
      if (icon) {
        if (/^4/.test(val)) {
          icon.innerHTML = '<i class="fa-brands fa-cc-visa" style="color:#0284c7;"></i>';
        } else if (/^(5[1-5]|2[2-7])/.test(val)) {
          icon.innerHTML = '<i class="fa-brands fa-cc-mastercard" style="color:#f59e0b;"></i>';
        } else if (/^3[47]/.test(val)) {
          icon.innerHTML = '<i class="fa-brands fa-cc-amex" style="color:#10b981;"></i>';
        } else {
          icon.innerHTML = '';
        }
      }

      // Si ya completó los 16 dígitos, pasar el foco al nombre del titular
      if (val.length === 16) {
        var holderIn = document.getElementById('cardInputHolder');
        if (holderIn && !holderIn.value.trim()) {
          holderIn.focus();
        }
      }
    }

    function handleExpMonthInput(input) {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
      if (input.value.length === 2) {
        var num = parseInt(input.value, 10);
        if (num > 12) input.value = '12';
        if (num === 0) input.value = '01';
        var yIn = document.getElementById('cardInputExpYear');
        if (yIn) yIn.focus();
      }
    }

    function handleExpYearInput(input) {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
      if (input.value.length === 2) {
        var cIn = document.getElementById('cardInputCvv');
        if (cIn) cIn.focus();
      }
    }

    async function handleProcessCardPayment(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitCardPay');
      const errBox = document.getElementById('cardPayErrorAlert');
      if (errBox) errBox.style.display = 'none';

      const origText = btn ? btn.innerHTML : '';

      if (!window.OpenPay) {
        if (errBox) {
          errBox.innerText = 'No se pudo cargar la pasarela bancaria. Verifica tu conexión a internet.';
          errBox.style.display = 'block';
        }
        return;
      }

      const holderName = (document.getElementById('cardInputHolder')?.value || '').trim();
      const cardNumber = (document.getElementById('cardInputNumber')?.value || '').replace(/[^0-9]/g, '');
      const expMonth = (document.getElementById('cardInputExpMonth')?.value || '').replace(/[^0-9]/g, '').padStart(2, '0');
      const expYear = (document.getElementById('cardInputExpYear')?.value || '').replace(/[^0-9]/g, '').slice(-2);
      const cvv2 = (document.getElementById('cardInputCvv')?.value || '').replace(/[^0-9]/g, '');

      // Validaciones previas en el cliente con mensajes en español claro
      if (!cardNumber || cardNumber.length < 15 || cardNumber.length > 19) {
        if (errBox) {
          errBox.innerText = 'Por favor ingresa los 16 dígitos completos de tu tarjeta.';
          errBox.style.display = 'block';
        }
        document.getElementById('cardInputNumber')?.focus();
        return;
      }

      if (!holderName || holderName.length < 3) {
        if (errBox) {
          errBox.innerText = 'Escribe el nombre del titular como aparece en la tarjeta.';
          errBox.style.display = 'block';
        }
        document.getElementById('cardInputHolder')?.focus();
        return;
      }

      if (!expMonth || parseInt(expMonth, 10) < 1 || parseInt(expMonth, 10) > 12) {
        if (errBox) {
          errBox.innerText = 'Mes de vencimiento inválido (01 al 12).';
          errBox.style.display = 'block';
        }
        document.getElementById('cardInputExpMonth')?.focus();
        return;
      }

      if (!expYear || expYear.length !== 2) {
        if (errBox) {
          errBox.innerText = 'Año de vencimiento inválido (2 dígitos, ej: 26).';
          errBox.style.display = 'block';
        }
        document.getElementById('cardInputExpYear')?.focus();
        return;
      }

      if (!cvv2 || cvv2.length < 3) {
        if (errBox) {
          errBox.innerText = 'Ingresa el código CVV (3 dígitos al reverso de tu tarjeta).';
          errBox.style.display = 'block';
        }
        document.getElementById('cardInputCvv')?.focus();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando tarjeta con banco...';
      }

      const tokenData = {
        holder_name: holderName,
        card_number: cardNumber,
        cvv2: cvv2,
        expiration_month: expMonth,
        expiration_year: expYear
      };

      OpenPay.token.create(tokenData, async (response) => {
        const tokenId = response.data.id;
        let deviceSessionId = document.getElementById('openpayDeviceSessionId')?.value;
        if (!deviceSessionId && OpenPay.deviceData) {
          deviceSessionId = OpenPay.deviceData.setup('cardPaymentForm');
        }

        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando cargo bancario...';

        try {
          const chargeRes = await fetch('/api/portal/openpay/charge-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId,
              deviceSessionId: deviceSessionId || 'sandbox_session',
              amount: currentPendingAmount,
              clientId: currentContractId,
              orderId: 'CARD_' + currentContractId + '_' + Date.now(),
              phone: currentPhone,
              description: 'Pago de Internet CloudWare Contrato #' + currentContractId
            })
          });

          const chargeData = await chargeRes.json();
          if (chargeData.success) {
            closeModal('modalCardPayment');
            showToast('✅ ¡Pago con tarjeta aprobado!');

            openModalPaymentReceipt({
              amount: chargeData.amount || currentPendingAmount,
              authorization: chargeData.authorization || 'N/A',
              cardBrand: chargeData.card?.brand || 'Tarjeta Bancaria',
              cardLast4: chargeData.card?.cardNumber ? chargeData.card.cardNumber.slice(-4) : ''
            });

            setTimeout(() => loadDashboard(), 1500);
          } else {
            if (errBox) {
              errBox.innerText = chargeData.message || 'La tarjeta fue rechazada por el banco emisor.';
              errBox.style.display = 'block';
            }
          }
        } catch (err) {
          if (errBox) {
            errBox.innerText = 'Error de conexión con el servidor al procesar el cobro.';
            errBox.style.display = 'block';
          }
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        }
      }, (error) => {
        var rawMsg = (error.data && error.data.description) ? String(error.data.description) : (error.message || '');
        var friendly = 'Los datos de la tarjeta son inválidos.';
        if (/must contain only digits/i.test(rawMsg)) {
          friendly = 'El número de tarjeta debe contener solo números (16 dígitos).';
        } else if (/length is invalid/i.test(rawMsg)) {
          friendly = 'El número de tarjeta debe tener 16 dígitos.';
        } else if (/holder_name/i.test(rawMsg)) {
          friendly = 'Ingresa el nombre del titular de la tarjeta.';
        } else if (/expiration_month/i.test(rawMsg) || /expiration/i.test(rawMsg)) {
          friendly = 'La fecha de vencimiento es inválida o la tarjeta está vencida.';
        } else if (/cvv/i.test(rawMsg)) {
          friendly = 'El código CVV es incorrecto (3 dígitos al reverso).';
        } else if (/declined|rechaz/i.test(rawMsg)) {
          friendly = 'Tarjeta rechazada por el banco emisor. Verifica fondos o llama a tu banco.';
        } else if (rawMsg) {
          friendly = rawMsg;
        }

        if (errBox) {
          errBox.innerText = friendly;
          errBox.style.display = 'block';
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      });
    }

    function openModalPaymentReceipt(info) {
      const amtEl = document.getElementById('receiptAmountLabel');
      if (amtEl) amtEl.innerText = '$' + Number(info.amount || 0).toFixed(2) + ' MXN';

      const methEl = document.getElementById('receiptMethodLabel');
      if (methEl) {
        const last4 = info.cardLast4 ? (' •••• ' + info.cardLast4) : '';
        methEl.innerText = (info.cardBrand || 'Tarjeta') + last4;
      }

      const authEl = document.getElementById('receiptAuthLabel');
      if (authEl) authEl.innerText = info.authorization || 'N/A';

      openModalWithState('modalPaymentReceipt');
    }

    let isCreatePassMandatory = false;

    function openCreatePasswordModal(phone, isManual = false) {
      isCreatePassMandatory = !isManual;
      const urlP = new URLSearchParams(window.location.search).get('p') || new URLSearchParams(window.location.search).get('phone') || '';
      const cleanUrlP = urlP.replace(/\D/g, '').slice(-10);
      const targetP = (cleanUrlP || phone || currentPhone || localStorage.getItem('cp_phone') || '').replace(/\D/g, '').slice(-10);
      if (targetP) {
        currentPhone = targetP;
        localStorage.setItem('cp_phone', targetP);
      }
      const displayEl = document.getElementById('modalCreatePassPhoneDisplay');
      if (displayEl) displayEl.innerText = targetP || 'Tu celular';
      const inputPass = document.getElementById('modalCreatePassInput');
      if (inputPass) inputPass.value = '';
      const inputConf = document.getElementById('modalCreatePassConfirmInput');
      if (inputConf) inputConf.value = '';
      const errBox = document.getElementById('createPassErrorAlert');
      if (errBox) errBox.style.display = 'none';

      const closeBtn = document.getElementById('btnCloseCreatePassModal');
      const titleEl = document.getElementById('createPassModalTitle');
      const subEl = document.getElementById('createPassModalSubtitle');

      if (isManual) {
        if (closeBtn) closeBtn.style.display = 'flex';
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-key" style="color: #38bdf8;"></i> Cambiar Contraseña de Acceso';
        if (subEl) subEl.innerText = 'Actualiza tu clave para iniciar sesión en tu portal desde cualquier celular, computadora o tablet.';
      } else {
        if (closeBtn) closeBtn.style.display = 'none';
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #38bdf8;"></i> Crea tu Contraseña de Acceso';
        if (subEl) subEl.innerText = 'Configura tu contraseña para entrar a tu portal desde cualquier celular, computadora o tablet sin depender de WhatsApp.';
      }

      openModalWithState('modalCreatePassword');
    }

    async function handleSaveCreatePassword(e) {
      e.preventDefault();
      const pass = document.getElementById('modalCreatePassInput').value;
      const confirmPass = document.getElementById('modalCreatePassConfirmInput').value;
      const errBox = document.getElementById('createPassErrorAlert');

      if (!pass || pass.length < 6) {
        errBox.innerText = 'La contraseña debe tener al menos 6 caracteres.';
        errBox.style.display = 'block';
        return;
      }

      if (pass !== confirmPass) {
        errBox.innerText = 'Las contraseñas no coinciden. Por favor verifícalas.';
        errBox.style.display = 'block';
        return;
      }

      errBox.style.display = 'none';
      const submitBtn = document.getElementById('btnSubmitCreatePass');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
      }

      const urlP = new URLSearchParams(window.location.search).get('p') || new URLSearchParams(window.location.search).get('phone') || '';
      const cleanUrlP = urlP.replace(/\D/g, '').slice(-10);
      const phone = (cleanUrlP || currentPhone || localStorage.getItem('cp_phone') || '').replace(/\D/g, '').slice(-10);

      try {
        const res = await fetch('/api/portal/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password: pass })
        });
        const d = await res.json();
        if (d.success) {
          isCreatePassMandatory = false;
          closeModal('modalCreatePassword');
          if (d.token) {
            localStorage.setItem('cp_token', d.token);
            currentToken = d.token;
          }
          const onb = document.getElementById('onboardingBanner');
          if (onb) onb.classList.add('hidden');

          // Desplegar modal de confirmación con datos de acceso
          const succPhone = document.getElementById('successModalPhoneDisplay');
          if (succPhone) succPhone.innerText = phone;
          openModalWithState('modalPasswordSuccess');
        } else {
          errBox.innerText = d.message || 'Error al guardar la contraseña.';
          errBox.style.display = 'block';
        }
      } catch (err) {
        errBox.innerText = 'Error de conexión. Intenta nuevamente.';
        errBox.style.display = 'block';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    }

    let activeModalId = null;

    function openModalWithState(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = 'flex';
      activeModalId = id;
      try {
        window.history.pushState({ modalOpen: id }, '');
      } catch {}
    }

    function closeModal(id, fromPopState = false) {
      if (id === 'modalCreatePassword' && isCreatePassMandatory) {
        showToast('Debes crear tu contraseña para continuar');
        return;
      }
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
      if (activeModalId === id) {
        activeModalId = null;
      }
      if (!fromPopState) {
        try {
          if (window.history.state && window.history.state.modalOpen === id) {
            window.history.back();
          }
        } catch {}
      }
    }

    // Navegación táctil hacia atrás (gesto de retroceso de Android / iOS / botón Volver)
    window.addEventListener('popstate', (e) => {
      const modals = document.querySelectorAll('.modal-overlay');
      modals.forEach(m => {
        if (m.style.display === 'flex') {
          closeModal(m.id, true);
        }
      });
    });

    // Cerrar al pulsar el fondo oscuro del modal
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay.id);
        }
      });
    });

    // Gestos táctiles de deslizamiento hacia abajo para cerrar modal en móvil
    document.querySelectorAll('.modal-sheet').forEach(sheet => {
      let touchStartY = 0;
      let touchCurrentY = 0;
      let isDragging = false;

      sheet.addEventListener('touchstart', (e) => {
        if (sheet.scrollTop <= 0) {
          touchStartY = e.touches[0].clientY;
          isDragging = true;
        }
      }, { passive: true });

      sheet.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        touchCurrentY = e.touches[0].clientY;
        const diff = touchCurrentY - touchStartY;
        if (diff > 0 && sheet.scrollTop <= 0) {
          sheet.style.transform = 'translateY(' + Math.min(diff * 0.7, 180) + 'px)';
          sheet.style.opacity = String(Math.max(1 - (diff / 280), 0.5));
        }
      }, { passive: true });

      sheet.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = touchCurrentY - touchStartY;
        const parentModal = sheet.closest('.modal-overlay');
        if (diff > 90 && sheet.scrollTop <= 0 && parentModal) {
          sheet.style.transform = 'translateY(100%)';
          sheet.style.opacity = '0';
          setTimeout(() => {
            sheet.style.transform = '';
            sheet.style.opacity = '';
            closeModal(parentModal.id);
          }, 180);
        } else {
          sheet.style.transform = '';
          sheet.style.opacity = '';
        }
        touchStartY = 0;
        touchCurrentY = 0;
      }, { passive: true });
    });

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
          realWifiPassword24 = password;
          realWifiPassword5g = password;
          localStorage.setItem('cp_last_pass', password);

          // Actualizar contraseña en el dashboard de inmediato
          document.getElementById('wifiPassSharedLabel').innerText = password;

          closeModal('modalWifi');

          // Mostrar modal con la nueva contraseña y el QR 5G
          document.getElementById('postWifiNewPassLabel').innerText = password;
          openModalWithState('modalPostWifiSuccess');

          showToast('✅ ¡Contraseña guardada en tu módem!');
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
