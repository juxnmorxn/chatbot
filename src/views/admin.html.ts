export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudWareMx - Admin ISP Control Center</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: rgba(17, 24, 39, 0.75);
      --bg-surface-elevated: rgba(30, 41, 59, 0.8);
      --bg-sidebar: rgba(11, 15, 25, 0.95);
      --card-border: rgba(255, 255, 255, 0.07);
      --card-border-hover: rgba(99, 102, 241, 0.35);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.2);
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --accent-purple: #a855f7;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --sidebar-width: 260px;
      --sidebar-collapsed-width: 72px;
      --topbar-height: 64px;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
      --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
      --transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-base);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.06) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.03) 0px, transparent 50%);
      color: var(--text-main);
      font-family: var(--font-main);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--primary); }

    /* SVG Icons Helper */
    .svg-icon {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      flex-shrink: 0;
      display: inline-block;
      vertical-align: middle;
    }
    .svg-icon-lg { width: 22px; height: 22px; }
    .svg-icon-sm { width: 15px; height: 15px; }

    /* App Layout */
    #app-container {
      display: flex;
      width: 100%;
      min-height: 100vh;
    }

    /* Sidebar Navigation */
    aside#sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 100;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    aside#sidebar.collapsed {
      width: var(--sidebar-collapsed-width);
    }

    .sidebar-header {
      height: var(--topbar-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      border-bottom: 1px solid var(--card-border);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text-main);
      overflow: hidden;
      white-space: nowrap;
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--primary), var(--accent-cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 16px var(--primary-glow);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      transition: opacity 0.2s ease;
    }

    .brand-title {
      font-weight: 800;
      font-size: 15px;
      letter-spacing: -0.3px;
      color: #fff;
    }

    .brand-subtitle {
      font-size: 10px;
      color: var(--accent-cyan);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    #sidebar.collapsed .brand-text {
      display: none !important;
    }

    /* Persistent Toggle Button */
    .sidebar-toggle-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      flex-shrink: 0;
    }

    .sidebar-toggle-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--primary);
    }

    /* Collapsed Sidebar Header */
    #sidebar.collapsed .sidebar-header {
      padding: 0 8px;
      justify-content: center;
      position: relative;
    }

    #sidebar.collapsed .sidebar-brand {
      display: flex;
      justify-content: center;
      margin: 0;
    }

    #sidebar.collapsed .brand-logo {
      width: 32px;
      height: 32px;
    }

    #sidebar.collapsed .sidebar-toggle-btn {
      width: 26px;
      height: 26px;
      margin: 0;
      position: absolute;
      right: -12px;
      top: 50%;
      transform: translateY(-50%);
      background: #1e293b;
      border: 1px solid var(--card-border-hover);
      border-radius: 50%;
      z-index: 105;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }

    .sidebar-nav {
      flex: 1;
      padding: 14px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-category {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-dim);
      padding: 12px 12px 4px;
      font-weight: 700;
      white-space: nowrap;
    }

    #sidebar.collapsed .nav-category {
      display: none !important;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: var(--transition);
      position: relative;
      white-space: nowrap;
      user-select: none;
    }

    .nav-item:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.05);
    }

    .nav-item.active {
      color: #fff;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.08));
      border-color: rgba(99, 102, 241, 0.35);
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.12);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      border-radius: 0 4px 4px 0;
      background: var(--primary);
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-badge {
      margin-left: auto;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
      font-family: var(--font-mono);
    }

    .nav-badge.alert-badge {
      background: rgba(244, 63, 94, 0.2);
      color: #fda4af;
      border-color: rgba(244, 63, 94, 0.4);
    }

    /* CRITICAL FIX: Hide badges, spans and text in collapsed mode even when inline styles exist */
    #sidebar.collapsed .nav-badge,
    #sidebar.collapsed .nav-text,
    #sidebar.collapsed span[id^="badge-"] {
      display: none !important;
    }

    #sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 10px 0;
      width: 44px;
      height: 44px;
      margin: 2px auto;
      border-radius: 10px;
    }

    #sidebar.collapsed .nav-item.active::before {
      left: 0;
      top: 10px;
      bottom: 10px;
    }

    .sidebar-footer {
      padding: 12px 14px;
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-purple), var(--primary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .user-role-badge {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--accent-cyan);
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    #sidebar.collapsed .user-info {
      display: none !important;
    }

    #sidebar.collapsed .sidebar-footer {
      flex-direction: column;
      padding: 10px 0;
      gap: 8px;
      justify-content: center;
      align-items: center;
    }

    #sidebar.collapsed .user-avatar {
      margin: 0 auto;
    }

    #sidebar.collapsed .btn-logout {
      margin: 0 auto;
    }

    .btn-logout {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-dim);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .btn-logout:hover {
      color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.12);
      border-color: rgba(244, 63, 94, 0.25);
    }

    /* Sidebar Unified Sync Action */
    .sidebar-sync-wrap {
      padding: 10px 14px;
      border-top: 1px solid var(--card-border);
      background: rgba(0, 0, 0, 0.12);
    }

    .btn-sidebar-sync {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      padding: 9px 12px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15));
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93c5fd;
      cursor: pointer;
      transition: var(--transition);
      box-sizing: border-box;
    }

    .btn-sidebar-sync:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(99, 102, 241, 0.28));
      border-color: rgba(99, 102, 241, 0.6);
      color: #ffffff;
      box-shadow: 0 0 14px rgba(59, 130, 246, 0.25);
    }

    .btn-sidebar-sync:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    #sidebar.collapsed .sidebar-sync-wrap {
      padding: 8px 6px;
      display: flex;
      justify-content: center;
    }

    #sidebar.collapsed .btn-sidebar-sync {
      width: 44px;
      height: 44px;
      padding: 0;
      justify-content: center;
      margin: 0 auto;
    }

    #sidebar.collapsed .btn-sidebar-sync .sync-btn-text {
      display: none !important;
    }

    @keyframes spin-anim {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .spin {
      animation: spin-anim 1s linear infinite !important;
    }

    /* Main Content Area */
    main#main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-width: 0;
      max-width: calc(100vw - var(--sidebar-width));
      overflow-x: hidden;
      transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    aside#sidebar.collapsed + main#main-content {
      margin-left: var(--sidebar-collapsed-width);
      max-width: calc(100vw - var(--sidebar-collapsed-width));
    }

    /* Topbar */
    header.topbar {
      height: var(--topbar-height);
      background: rgba(11, 15, 25, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .mobile-menu-btn {
      display: none;
      background: transparent;
      border: 1px solid var(--card-border);
      color: var(--text-main);
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }

    .view-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .view-title {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .live-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
      animation: pulse-glow 2s infinite;
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Page View Container */
    .view-container {
      flex: 1;
      padding: 24px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      min-width: 0;
      box-sizing: border-box;
      display: none;
      animation: fadeInView 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .view-container.active {
      display: block;
    }

    @keyframes fadeInView {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Glass Cards */
    .glass-card {
      background: var(--bg-surface);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      transition: var(--transition);
      position: relative;
      min-width: 0;
      box-sizing: border-box;
    }

    .glass-card:hover {
      border-color: var(--card-border-hover);
    }

    /* Toggle Switch Components */
    .switch {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 20px;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #4b5563;
      transition: .25s ease-in-out;
      border-radius: 20px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .25s ease-in-out;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    input:checked + .slider {
      background-color: var(--accent-emerald, #10b981);
    }
    input:checked + .slider:before {
      transform: translateX(18px);
    }

    .grid-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 500;
    }

    .metric-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      color: var(--accent-cyan);
    }

    .metric-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      font-family: var(--font-mono);
      color: #fff;
    }

    .metric-footer {
      font-size: 11.5px;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: var(--transition);
      text-decoration: none;
      font-family: var(--font-main);
      user-select: none;
      outline: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #4f46e5);
      color: #fff;
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--card-border);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .btn-success {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .btn-success:hover {
      background: rgba(16, 185, 129, 0.25);
    }

    .btn-danger {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.35);
      color: #fda4af;
    }

    .btn-danger:hover {
      background: rgba(244, 63, 94, 0.25);
    }

    .btn-warning {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.35);
      color: #fcd34d;
    }

    .btn-warning:hover {
      background: rgba(245, 158, 11, 0.25);
    }

    .btn-info {
      background: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.35);
      color: #7dd3fc;
    }

    .btn-info:hover {
      background: rgba(14, 165, 233, 0.25);
    }

    .btn.active, .btn-secondary.active {
      background: var(--primary) !important;
      border-color: #818cf8 !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(99, 102, 241, 0.5) !important;
      font-weight: 700 !important;
    }

    .btn-danger.active {
      background: #e11d48 !important;
      border-color: #fda4af !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(225, 29, 72, 0.5) !important;
      font-weight: 700 !important;
    }

    .btn-warning.active {
      background: #d97706 !important;
      border-color: #fcd34d !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(217, 119, 6, 0.5) !important;
      font-weight: 700 !important;
    }

    .btn-info.active {
      background: #0284c7 !important;
      border-color: #7dd3fc !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(2, 132, 199, 0.5) !important;
      font-weight: 700 !important;
    }

    .btn-success.active {
      background: #059669 !important;
      border-color: #6ee7b7 !important;
      color: #fff !important;
      box-shadow: 0 0 14px rgba(5, 150, 105, 0.5) !important;
      font-weight: 700 !important;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      display: inline-block;
      vertical-align: middle;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
    }

    .form-control {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--text-main);
      font-size: 13.5px;
      font-family: var(--font-main);
      transition: var(--transition);
      outline: none;
    }

    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    select.form-control,
    select {
      background-color: #0f172a;
      color: #f1f5f9;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px 16px;
      padding-right: 40px;
    }

    select.form-control:focus,
    select:focus {
      background-color: #131d33;
      border-color: var(--primary);
    }

    select.form-control option,
    select option {
      background-color: #0f172a;
      color: #f1f5f9;
      padding: 10px 12px;
      font-size: 13.5px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Tables */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      border-radius: var(--radius-sm);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    table.data-table th {
      padding: 12px 14px;
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.6px;
      white-space: nowrap;
    }

    table.data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-main);
      vertical-align: middle;
    }

    table.data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    /* Topbar Contextual Search */
    .topbar-center-search {
      flex: 1;
      max-width: 520px;
      margin: 0 16px;
    }

    .topbar-search-wrap {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      transition: var(--transition);
      gap: 10px;
    }

    .topbar-search-wrap:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
      background: rgba(15, 23, 42, 0.95);
    }

    .topbar-search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 13px;
      font-family: var(--font-main);
      outline: none;
    }

    .topbar-search-input::placeholder {
      color: var(--text-dim);
    }

    .topbar-context-badge {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .topbar-search-clear {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      padding: 0 4px;
      transition: color 0.15s;
    }

    .topbar-search-clear:hover {
      color: var(--accent-rose);
    }

    /* Datatable Controls Toolbar */
    .datatable-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      width: 100%;
      box-sizing: border-box;
    }

    .datatable-search-box {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 7px 12px;
      min-width: 200px;
      flex: 1 1 240px;
      max-width: 380px;
      gap: 8px;
      box-sizing: border-box;
      transition: var(--transition);
    }

    .datatable-search-box:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .datatable-search-box input {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 12.5px;
      font-family: var(--font-main);
      outline: none;
      width: 100%;
    }

    .datatable-search-box input::placeholder {
      color: var(--text-dim);
    }

    .datatable-filters-group {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      flex: 2 1 auto;
      justify-content: flex-end;
      max-width: 100%;
    }

    .datatable-select {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      padding: 7px 11px;
      font-size: 12px;
      font-family: var(--font-main);
      outline: none;
      cursor: pointer;
      max-width: 200px;
      min-width: 110px;
      box-sizing: border-box;
      transition: var(--transition);
    }

    .datatable-select:focus {
      border-color: var(--primary);
    }

    .datatable-select option {
      background: #0b0f19;
      color: #f8fafc;
    }

    th.sortable-th {
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
    }

    th.sortable-th:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #fff;
    }

    .sort-icon {
      font-size: 10px;
      margin-left: 5px;
      opacity: 0.5;
    }

    th.sort-active .sort-icon {
      opacity: 1;
      color: var(--accent-cyan);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-family: var(--font-mono);
    }

    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-danger { background: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); }
    .badge-info { background: rgba(6, 182, 212, 0.15); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.3); }
    .badge-purple { background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3); }

    /* ========================================================
       LIVE WHATSAPP CHAT - WHATSAPP WEB AUTHENTIC THEME
       ======================================================== */
    .chat-layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      height: calc(100vh - var(--topbar-height) - 40px);
      max-height: calc(100vh - var(--topbar-height) - 40px);
      background: #111b21;
      border: 1px solid rgba(134, 150, 160, 0.15);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
    }

    .chat-sidebar {
      border-right: 1px solid rgba(134, 150, 160, 0.15);
      display: flex;
      flex-direction: column;
      background: #111b21;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      width: 100%;
    }

    .chat-search-header {
      padding: 10px 12px;
      background: #111b21;
      border-bottom: 1px solid rgba(134, 150, 160, 0.12);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .chat-search-bar-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #202c33;
      border-radius: 8px;
      padding: 0 12px;
      height: 36px;
      width: 100%;
      box-sizing: border-box;
    }

    .chat-search-bar-wrap svg {
      width: 16px;
      height: 16px;
      color: #8696a0;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .chat-search-input {
      background: transparent;
      border: none;
      outline: none;
      color: #e9edef;
      font-size: 13.5px;
      width: 100%;
      font-family: inherit;
    }

    .chat-search-input::placeholder {
      color: #8696a0;
    }

    .chat-dept-pills-bar {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 2px 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
      width: 100%;
      box-sizing: border-box;
    }

    .chat-dept-pills-bar::-webkit-scrollbar {
      display: none;
    }

    .chat-filter-pill {
      background: #202c33;
      color: #8696a0;
      border: 1px solid transparent;
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 11.5px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
      user-select: none;
    }

    .chat-filter-pill:hover {
      background: #2a3942;
      color: #d1d7db;
    }

    .chat-filter-pill.active {
      background: #005c4b;
      color: #00a884;
      border-color: rgba(0, 168, 132, 0.4);
      font-weight: 600;
    }

    .chat-threads-list {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #111b21;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
      width: 100%;
      box-sizing: border-box;
    }

    .chat-threads-list::-webkit-scrollbar {
      width: 5px;
    }

    .chat-threads-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
    }

    .chat-thread-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.15s ease;
      position: relative;
      user-select: none;
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(134, 150, 160, 0.08);
      overflow: hidden;
    }

    .chat-thread-item:hover {
      background: #202c33;
    }

    .chat-thread-item.active {
      background: #2a3942;
    }

    .thread-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #6b7c85;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      flex-shrink: 0;
      overflow: hidden;
    }

    .thread-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .thread-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .thread-name {
      font-weight: 600;
      font-size: 14px;
      color: #e9edef;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .thread-time {
      font-size: 11px;
      color: #8696a0;
      flex-shrink: 0;
      font-family: inherit;
    }

    .thread-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }

    .thread-preview {
      font-size: 12.5px;
      color: #8696a0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
      line-height: 1.3;
    }

    .thread-tags-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      flex-wrap: nowrap;
      overflow: hidden;
    }

    .btn-thread-delete {
      background: transparent;
      border: none;
      color: #8696a0;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      transition: all 0.15s ease;
      margin-left: 4px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .chat-thread-item:hover .btn-thread-delete {
      opacity: 0.7;
    }

    .btn-thread-delete:hover {
      color: #f87171 !important;
      background: rgba(239, 68, 68, 0.15);
      opacity: 1 !important;
    }

    .chat-main-area {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      position: relative;
      background: #0b141a;
      background-image: radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.4) 0%, rgba(11, 20, 26, 0.95) 100%);
    }

    .chat-header-bar {
      padding: 10px 16px;
      background: #202c33;
      border-bottom: 1px solid rgba(134, 150, 160, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 60px;
      flex-shrink: 0;
      z-index: 5;
    }

    .chat-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex-shrink: 1;
    }

    .chat-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: nowrap;
    }

    .chat-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: #233138;
      border: 1px solid rgba(134, 150, 160, 0.2);
      border-radius: 8px;
      padding: 6px 0;
      min-width: 220px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      flex-direction: column;
    }

    .chat-dropdown-item {
      background: transparent;
      border: none;
      color: #d1d7db;
      padding: 8px 14px;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
      transition: background 0.15s ease;
      font-family: inherit;
    }

    .chat-dropdown-item:hover {
      background: #182229;
      color: #fff;
    }

    .chat-dropdown-item.item-danger {
      color: #f87171;
    }

    .chat-dropdown-item.item-danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }

    .btn-xs {
      padding: 5px 10px;
      font-size: 11.5px;
      font-weight: 500;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      height: 30px;
    }

    .chat-messages-container {
      flex: 1 1 auto;
      min-height: 0;
      padding: 16px 24px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #0b141a;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }

    .chat-messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .chat-messages-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .chat-bubble {
      max-width: 68%;
      min-width: 90px;
      padding: 7px 10px 6px 10px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.45;
      position: relative;
      word-wrap: break-word;
      white-space: pre-wrap;
      box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13);
      animation: fadeInMsg 0.15s ease-out;
    }

    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-bubble.in {
      align-self: flex-start;
      background: #202c33;
      color: #e9edef;
      border-top-left-radius: 0;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .chat-bubble.out {
      align-self: flex-end;
      background: #005c4b;
      color: #e9edef;
      border-top-right-radius: 0;
    }

    .bubble-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      font-size: 11px;
      color: #8696a0;
      margin-top: 3px;
      float: right;
      margin-left: 12px;
      user-select: none;
    }

    .bubble-check {
      color: #53bdeb;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
    }

    .chat-input-bar {
      padding: 10px 16px;
      background: #202c33;
      border-top: 1px solid rgba(134, 150, 160, 0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      position: relative;
      z-index: 5;
    }

    .chat-input-line-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: #8696a0;
    }

    .chat-input-row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      width: 100%;
    }

    .chat-input-box {
      flex: 1;
      background: #2a3942;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      color: #e9edef;
      font-family: inherit;
      font-size: 14px;
      resize: none;
      min-height: 40px;
      max-height: 120px;
      outline: none;
      line-height: 1.4;
    }

    .chat-input-box::placeholder {
      color: #8696a0;
    }

    .chat-send-btn {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #00a884;
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .chat-send-btn:hover {
      background: #008f72;
      transform: scale(1.04);
    }

    .chat-send-btn:active {
      transform: scale(0.96);
    }

    /* Kanban Tickets Board */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      align-items: flex-start;
    }

    .kanban-column {
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - var(--topbar-height) - 100px);
    }

    .kanban-col-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      font-size: 13px;
    }

    .kanban-cards-wrap {
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 150px;
    }

    .ticket-card {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: var(--transition);
      cursor: pointer;
    }

    .ticket-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .ticket-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ticket-folio {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-cyan);
    }

    .ticket-client {
      font-weight: 600;
      font-size: 13px;
      color: #fff;
    }

    .ticket-issue {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .ticket-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-dim);
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 6px;
      margin-top: 4px;
    }

    /* Toast Notifications */
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      min-width: 300px;
      max-width: 420px;
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: #fff;
      animation: slideInToast 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    @keyframes slideInToast {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast.hide {
      animation: slideOutToast 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideOutToast {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }

    .toast-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toast-title {
      font-weight: 700;
      font-size: 13px;
    }

    .toast-message {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: var(--primary);
      width: 100%;
      animation: toastProgress 3.5s linear forwards;
    }

    @keyframes toastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }

    .toast.success { border-color: rgba(16, 185, 129, 0.5); }
    .toast.success .toast-icon { color: var(--accent-green); }
    .toast.success .toast-progress { background: var(--accent-green); }

    .toast.error { border-color: rgba(244, 63, 94, 0.5); }
    .toast.error .toast-icon { color: var(--accent-rose); }
    .toast.error .toast-progress { background: var(--accent-rose); }

    .toast.warning { border-color: rgba(245, 158, 11, 0.5); }
    .toast.warning .toast-icon { color: var(--accent-amber); }
    .toast.warning .toast-progress { background: var(--accent-amber); }

    .toast.info { border-color: rgba(6, 182, 212, 0.5); }
    .toast.info .toast-icon { color: var(--accent-cyan); }
    .toast.info .toast-progress { background: var(--accent-cyan); }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-backdrop.show {
      display: flex;
    }

    .modal-box {
      background: #0f172a;
      border: 1px solid var(--card-border-hover);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUpModal 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes scaleUpModal {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      font-weight: 700;
      font-size: 16px;
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 20px;
      cursor: pointer;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      max-height: 75vh;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      background: rgba(0, 0, 0, 0.2);
    }

    /* Auth Login Overlay */
    #login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-box {
      width: 100%;
      max-width: 390px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 32px;
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
    }

    .login-box::before {
      content: '';
      position: absolute;
      top: -1px;
      left: 20%;
      right: 20%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--primary), var(--accent-cyan), transparent);
    }

    /* Mobile Backdrop Overlay */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 990;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }

    .sidebar-backdrop.active {
      display: block;
      opacity: 1;
      pointer-events: auto;
    }

    /* ========================================================
       FULL RESPONSIVE SYSTEM (MOBILE, TABLETS, DESKTOP)
       ======================================================== */
    @media (max-width: 1200px) {
      .grid-metrics {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 992px) {
      aside#sidebar {
        transform: translateX(-100%);
        width: 280px !important;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 1000;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.85);
      }
      aside#sidebar.mobile-open {
        transform: translateX(0);
      }
      main#main-content {
        margin-left: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
      }
      .mobile-menu-btn {
        display: flex !important;
      }
      .sidebar-toggle-btn {
        display: none !important;
      }
      .topbar {
        padding: 0 14px;
        gap: 10px;
      }
      .topbar-center-search {
        display: none;
      }
      .view-title {
        font-size: 15px;
        max-width: 160px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .kanban-board {
        grid-template-columns: repeat(2, 1fr);
      }
      .chat-layout {
        grid-template-columns: 1fr;
        height: calc(100vh - var(--topbar-height) - 16px);
        max-height: calc(100vh - var(--topbar-height) - 16px);
        border-radius: 8px;
      }
      .chat-sidebar {
        display: flex;
        width: 100%;
      }
      .chat-main-area {
        display: none;
      }
      .chat-layout.mobile-chat-active .chat-sidebar {
        display: none;
      }
      .chat-layout.mobile-chat-active .chat-main-area {
        display: flex;
        width: 100%;
      }
      .btn-back-to-threads {
        display: inline-flex !important;
      }
      .chat-header-actions .btn-xs span:not(.badge) {
        display: none;
      }
      .chat-header-actions .btn-xs {
        padding: 5px 7px;
        min-width: 32px;
      }
    }

    @media (max-width: 768px) {
      .view-container {
        padding: 10px 8px;
      }
      .grid-metrics {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .glass-card {
        padding: 12px;
        margin-bottom: 12px;
        border-radius: 10px;
      }
      .kanban-board {
        grid-template-columns: 1fr;
      }
      .topbar-right .btn-sm span {
        display: none;
      }
      .topbar-right .btn-sm {
        padding: 6px;
        min-width: 34px;
        height: 34px;
      }
      .live-status-pill {
        padding: 3px 8px;
        font-size: 11px;
      }
      .modal-box {
        width: 95vw !important;
        max-width: 95vw !important;
        margin: 10px auto;
        max-height: 90vh;
        padding: 14px;
      }
      .chat-input-line-info {
        font-size: 10.5px;
      }
      .chat-input-line-info span:last-child {
        display: none;
      }
      .chat-bubble {
        max-width: 85%;
        font-size: 13.5px;
      }
    }

    @media (max-width: 480px) {
      .view-title {
        font-size: 13.5px;
        max-width: 110px;
      }
      .topbar {
        padding: 0 8px;
        gap: 6px;
      }
      .chat-messages-container {
        padding: 10px 12px;
      }
      .chat-input-bar {
        padding: 8px 10px;
      }
    }
  </style>
</head>
<body>

  <!-- Toast Notification Container -->
  <div id="toast-container"></div>

  <!-- Global Modal Box -->
  <div id="generic-modal" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3 id="modal-title" class="modal-title">Título</h3>
        <button class="modal-close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div id="modal-body-content" class="modal-body"></div>
      <div id="modal-footer-actions" class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button id="modal-confirm-btn" class="btn btn-primary">Confirmar</button>
      </div>
    </div>
  </div>

  <!-- Login Overlay (Shown if unauthenticated) -->
  <div id="login-overlay" style="display: none;">
    <div class="login-box">
      <div style="text-align: center;">
        <div class="brand-logo" style="margin: 0 auto 12px; width: 48px; height: 48px;">
          <svg class="svg-icon svg-icon-lg" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
        </div>
        <h2 style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CloudWare ISP</h2>
        <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">Acceso al Panel de Administración</p>
      </div>
      <form id="login-form" onsubmit="handleLoginSubmit(event)">
        <div class="form-group">
          <label class="form-label">Usuario</label>
          <input type="text" id="login-username" class="form-control" placeholder="admin" required autocomplete="username">
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <input type="password" id="login-password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button type="submit" id="login-btn-submit" class="btn btn-primary" style="width: 100%; margin-top: 8px; padding: 11px;">
          Ingresar al Panel
        </button>
      </form>
    </div>
  </div>

  <!-- Main App Layout Container -->
  <div id="app-container">
    <!-- Mobile Sidebar Backdrop Overlay -->
    <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="closeMobileMenu()"></div>
    
    <!-- Sidebar Navigation -->
    <aside id="sidebar">
      <div class="sidebar-header">
        <a href="#dashboard" class="sidebar-brand" onclick="navigateTo('dashboard')">
          <div class="brand-logo">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">CloudWareMx</span>
            <span class="brand-subtitle">ISP Control</span>
          </div>
        </a>
        <button class="sidebar-toggle-btn" id="btn-sidebar-toggle" onclick="toggleSidebar()" title="Alternar Sidebar">
          <svg id="toggle-icon-left" class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <svg id="toggle-icon-right" class="svg-icon svg-icon-sm" style="display: none;" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-category">Operación Chatbot</div>
        <div class="nav-item active" data-view="dashboard" onclick="navigateTo('dashboard')" title="Dashboard General">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          </span>
          <span class="nav-text">Dashboard</span>
        </div>
        <div class="nav-item" data-view="live-chat" onclick="navigateTo('live-chat')" title="Live WhatsApp">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </span>
          <span class="nav-text">Live WhatsApp</span>
          <span id="badge-live-chat" class="nav-badge" style="display: none;">0</span>
        </div>

        <div class="nav-category">Gestión & Soporte</div>
        <div class="nav-item" data-view="tickets" onclick="navigateTo('tickets')" title="Mesa de Tickets">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
          </span>
          <span class="nav-text">Mesa de Tickets</span>
          <span id="badge-tickets-open" class="nav-badge alert-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="clients" onclick="navigateTo('clients')" title="Directorio de Clientes & GPS">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M20 8c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 8 0z"></path><circle cx="16" cy="8" r="1.5"></circle></svg>
          </span>
          <span class="nav-text">Clientes & GPS</span>
          <span id="badge-clients-total" class="nav-badge" style="display: none;">0</span>
        </div>

        <div class="nav-category">Red & Operación Bot</div>
        <div class="nav-item" data-view="ipam" onclick="navigateTo('ipam')" title="Control de Pools IP">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          </span>
          <span class="nav-text">Control de Pools IP</span>
          <span id="badge-unconfigured-onus" class="nav-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="audit" onclick="navigateTo('audit')" title="Auditoría SmartOLT">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </span>
          <span class="nav-text">Auditoría SmartOLT</span>
        </div>
        <div class="nav-item" data-view="technicians" onclick="navigateTo('technicians')" title="Técnicos & PINs">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
          </span>
          <span class="nav-text">Técnicos & PINs</span>
        </div>
        <div class="nav-item" data-view="modem-swap" onclick="navigateTo('modem-swap')" title="Cambio de Módem">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          </span>
          <span class="nav-text">Cambio de Módem</span>
        </div>

        <div class="nav-category">Sistema</div>
        <div class="nav-item" data-view="settings" onclick="navigateTo('settings')" title="Configuración">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </span>
          <span class="nav-text">Configuración</span>
        </div>
        <div class="nav-item" id="nav-item-users" data-view="users" onclick="navigateTo('users')" title="Usuarios & Roles">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </span>
          <span class="nav-text">Usuarios & Roles</span>
        </div>
      </nav>

      <!-- Unified Database Synchronization Action -->
      <div class="sidebar-sync-wrap">
        <button id="btn-sidebar-sync-all" class="btn-sidebar-sync" onclick="triggerFullUnifiedSync()" title="Sincronizar SmartOLT y WispHub (Manual)">
          <svg id="sync-unified-icon" class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          <span class="sync-btn-text">Sincronizar Todo</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <div id="user-avatar-badge" class="user-avatar">AD</div>
        <div class="user-info">
          <span id="user-display-name" class="user-name">Administrador</span>
          <span id="user-display-role" class="user-role-badge">Superadmin</span>
        </div>
        <button class="btn-logout" onclick="handleLogout()" title="Cerrar Sesión">
          <svg class="svg-icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </aside>

    <!-- Main Content Body -->
    <main id="main-content">
      
      <!-- Topbar Header -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
            <svg class="svg-icon" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div class="view-title-wrap">
            <h2 id="current-view-title" class="view-title">Resumen General</h2>
          </div>
        </div>

        <!-- Global Context-Aware Search Bar -->
        <div class="topbar-center-search">
          <div class="topbar-search-wrap">
            <svg class="svg-icon svg-icon-sm" style="color: var(--text-muted); flex-shrink: 0;" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="global-context-search" class="topbar-search-input" placeholder="Buscar en la pantalla actual..." oninput="handleGlobalContextSearch(this.value)">
            <span id="global-search-context-badge" class="topbar-context-badge">Dashboard</span>
            <button id="global-search-clear-btn" class="topbar-search-clear" onclick="clearGlobalContextSearch()" style="display: none;" title="Limpiar búsqueda">✕</button>
          </div>
        </div>

        <div class="topbar-right">
          <div id="whatsapp-live-pill" class="live-status-pill" style="cursor: pointer;" onclick="openWhatsAppInstancesModal()" title="Gestionar números e instancias de WhatsApp (Clic para ver)">
            <span class="pulse-dot"></span>
            <span id="whatsapp-pill-label">WhatsApp Activo</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="refreshCurrentView()" title="Actualizar datos">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      <!-- VIEW 1: DASHBOARD -->
      <section id="view-dashboard" class="view-container active">
        <div class="grid-metrics">
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>ONUs SmartOLT</span>
              <div class="metric-icon-box">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              </div>
            </div>
            <div id="metric-onus" class="metric-value">--</div>
            <div class="metric-footer">Sincronizadas en Turso DB</div>
          </div>
          
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Clientes WispHub</span>
              <div class="metric-icon-box" style="color: var(--primary);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
            <div id="metric-wisphub" class="metric-value">--</div>
            <div class="metric-footer">Servicios activos registrados</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Total de Clientes</span>
              <div class="metric-icon-box" style="color: var(--accent-green);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div id="metric-total-clients" class="metric-value">--</div>
            <div class="metric-footer">Base de datos unificada</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Tickets de Soporte</span>
              <div class="metric-icon-box" style="color: var(--accent-amber);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path></svg>
              </div>
            </div>
            <div id="metric-tickets" class="metric-value">--</div>
            <div id="metric-tickets-footer" class="metric-footer">Pendientes de atención</div>
          </div>
        </div>

        <!-- Compact Unified Services & Diagnostic Toolbar -->
        <div class="glass-card" style="margin-bottom: 18px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px;">⚡ Diagnóstico Rápido:</span>
            <button class="btn btn-secondary btn-xs" onclick="testServiceConnection('turso')" title="Probar conexión a Turso DB">
              <span class="pulse-dot" style="width: 7px; height: 7px; margin-right: 2px;"></span> Turso DB
            </button>
            <button class="btn btn-secondary btn-xs" onclick="testServiceConnection('smartolt')" title="Probar API SmartOLT">
              <span class="pulse-dot" style="width: 7px; height: 7px; margin-right: 2px;"></span> SmartOLT
            </button>
            <button class="btn btn-secondary btn-xs" onclick="testServiceConnection('wisphub')" title="Probar API WispHub">
              <span class="pulse-dot" style="width: 7px; height: 7px; margin-right: 2px;"></span> WispHub
            </button>
            <button class="btn btn-secondary btn-xs" onclick="testServiceConnection('groq')" title="Probar IA Groq Llama 3.1">
              <span class="pulse-dot" style="width: 7px; height: 7px; margin-right: 2px;"></span> Groq AI
            </button>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <span>Sincronización automatizada activa</span>
          </div>
        </div>

        <!-- Network Outages & Mass Incident Contingency Control Card -->
        <div class="glass-card" style="margin-bottom: 24px; border: 1px solid rgba(244, 63, 94, 0.25); background: radial-gradient(at 0% 0%, rgba(244, 63, 94, 0.06) 0px, var(--bg-surface) 100%);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="metric-icon-box" style="color: var(--accent-rose); background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <span>Contingencias & Caídas Masivas de Red</span>
                  <span id="badge-active-outages" class="badge badge-danger" style="display: none; font-size: 11px;">0 Activas</span>
                </h3>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                  El bot intercepta automáticamente las consultas de clientes en zonas afectadas para evitar saturación y tickets duplicados.
                </p>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="loadOutagesData()" title="Refrescar fallas">
                🔄 Refrescar
              </button>
              <button class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #f43f5e, #e11d48);" onclick="openDeclareOutageModal()">
                ⚡ Declarar Falla de Zona
              </button>
            </div>
          </div>

          <div id="dashboard-outages-list" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="text-align: center; color: var(--text-dim); padding: 16px;">Cargando contingencias de red...</div>
          </div>
        </div>

        <!-- Recent Logs Activity -->
        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div class="live-status-pill" style="padding: 3px 10px; font-size: 11px;">
                <span id="dashboard-live-dot" class="pulse-dot"></span>
                <span>En Vivo (SSE)</span>
              </div>
              <h3 style="font-size: 15px; font-weight: 700;">Interacciones y Conversaciones del Bot</h3>
              <span id="badge-logs-count" class="badge badge-info" style="font-size: 10px;">0 registros</span>
            </div>
            <button class="btn btn-secondary btn-xs" onclick="loadDashboardData()" title="Refrescar interacciones">
              🔄 Refrescar
            </button>
          </div>

          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-logs-flow" class="datatable-select" onchange="filterDashboardLogs()">
                <option value="">Todos los Flujos</option>
                <option value="IN">Entrante (IN)</option>
                <option value="OUT">Saliente (OUT)</option>
              </select>
              <select id="filter-logs-sort" class="datatable-select" onchange="sortDashboardLogs(this.value)">
                <option value="time_desc">Más Recientes</option>
                <option value="time_asc">Más Antiguos</option>
                <option value="client_asc">Cliente (A-Z)</option>
                <option value="direction_asc">Flujo</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearDashboardLogsFilter()" title="Limpiar filtros">
                Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortDashboardLogs('time')" style="min-width: 120px;">Hora <span id="sort-log-time" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortDashboardLogs('phone')" style="min-width: 140px;">Teléfono <span id="sort-log-phone" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortDashboardLogs('client')" style="min-width: 180px;">Cliente <span id="sort-log-client" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortDashboardLogs('direction')" style="min-width: 110px;">Flujo <span id="sort-log-flow" class="sort-icon">↕</span></th>
                  <th style="min-width: 280px;">Mensaje</th>
                  <th style="text-align: right; min-width: 80px;">Acción</th>
                </tr>
              </thead>
              <tbody id="table-recent-logs-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Cargando interacciones...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 2: LIVE WHATSAPP CHAT -->
      <section id="view-live-chat" class="view-container">
        <div class="chat-layout">
          <div class="chat-sidebar" id="chat-threads-sidebar">
            <div class="chat-search-header">
              <div class="chat-search-bar-wrap">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="chat-filter-input" class="chat-search-input" placeholder="Buscar un chat o número..." oninput="filterChatThreads(this.value)">
              </div>
              <div id="chat-dept-filter-bar" class="chat-dept-pills-bar">
                <button class="chat-filter-pill active" id="btn-filter-dept-all" onclick="setChatDeptFilter('all', this)">Todos</button>
              </div>
            </div>
            <div id="chat-threads-container" class="chat-threads-list"></div>
          </div>

          <div class="chat-main-area">
            <div id="chat-active-header" class="chat-header-bar" style="display: none;">
              <div class="chat-header-left">
                <button class="btn btn-secondary btn-xs btn-back-to-threads" style="display: none;" id="btn-back-to-threads" onclick="toggleMobileChatThreads()" title="Volver a lista de chats">◀ Volver</button>
                <div class="thread-avatar" id="active-chat-avatar">
                  <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px;height:24px;color:#cfd6db;"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div style="min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h4 id="active-chat-name" style="font-size: 14.5px; font-weight: 600; color: #e9edef; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">Seleccione un chat</h4>
                    <span id="active-chat-dept-badge" class="badge badge-info" style="font-size: 9.5px; padding: 2px 6px;">General</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 1px;">
                    <span id="active-chat-phone" style="font-size: 11.5px; color: #8696a0;">--</span>
                    <span id="active-chat-instance-badge" class="badge badge-purple" style="font-size: 9.5px; padding: 2px 6px; display: none;" title="Línea y número de WhatsApp asignado">Línea: --</span>
                  </div>
                </div>
              </div>
              <div class="chat-header-actions">
                <button id="btn-transfer-dept" class="btn btn-secondary btn-xs" onclick="openTransferChatModal()" title="Traspasar conversación a otra línea / área de WhatsApp">
                  🔄 <span>Traspasar</span>
                </button>
                <button id="btn-toggle-takeover" class="btn btn-secondary btn-xs" onclick="toggleCurrentChatTakeover()" title="Alternar modo de atención Bot / Humano">
                  🤖 <span>Bot Activo • Pausar 4h</span>
                </button>
                <div class="chat-menu-dropdown-wrap" style="position: relative;">
                  <button class="btn btn-secondary btn-xs" style="padding: 5px 8px;" onclick="toggleChatActionsMenu(event)" title="Más opciones de conversación">
                    <svg class="svg-icon" style="width: 15px; height: 15px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
                  </button>
                  <div id="chat-actions-menu" class="chat-dropdown-menu" style="display: none;">
                    <button class="chat-dropdown-item" onclick="pauseCurrentChatUntilMorning(); closeChatActionsMenu();">
                      <span>🌙</span> <span>Pausar hasta mañana (10:00 AM)</span>
                    </button>
                    <button class="chat-dropdown-item" onclick="closeCurrentChatCase(); closeChatActionsMenu();">
                      <span>✕</span> <span>Cerrar caso y reactivar bot</span>
                    </button>
                    <button id="btn-delete-active-chat" class="chat-dropdown-item item-danger" style="display: none;" onclick="deleteCurrentChat(); closeChatActionsMenu();">
                      <span>🗑️</span> <span>Eliminar conversación</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="chat-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8696a0; gap: 14px; background: #111b21;">
              <div style="width: 80px; height: 80px; border-radius: 50%; background: #202c33; display: flex; align-items: center; justify-content: center;">
                <svg class="svg-icon" style="width: 44px; height: 44px; color: #00a884; opacity: 0.8;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style="font-size: 17px; font-weight: 600; color: #e9edef;">WhatsApp en Vivo para CloudWareMx</h3>
              <p style="font-size: 13px; max-width: 360px; text-align: center; line-height: 1.5;">Selecciona una conversación del listado izquierdo para chatear en tiempo real con el cliente o traspasarlo de área.</p>
            </div>

            <div id="chat-messages-wrap" class="chat-messages-container" style="display: none;"></div>

            <div id="chat-input-container" class="chat-input-bar" style="display: none;">
              <div class="chat-input-line-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #8696a0;">Línea de WhatsApp Remitente:</span>
                  <select id="chat-sender-instance" class="form-control" style="font-size: 11px; padding: 2px 8px; height: 26px; width: auto; background: #111b21; border-color: rgba(134,150,160,0.25); color: #e9edef; border-radius: 6px;">
                  </select>
                </div>
                <span style="font-size: 11px; color: #8696a0;">Enter para enviar • Shift+Enter para salto de línea</span>
              </div>
              <div class="chat-input-row">
                <textarea id="chat-text-input" class="chat-input-box" placeholder="Escribe un mensaje" rows="1" onkeydown="handleChatInputKeyDown(event)"></textarea>
                <button class="chat-send-btn" onclick="sendActiveChatMessage()" title="Enviar mensaje">
                  <svg class="svg-icon" style="width: 18px; height: 18px;" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW: DIRECTORTIO DE CLIENTES & GEOLOCALIZACIÓN GPS -->
      <section id="view-clients" class="view-container">
        <!-- Metric Overview Cards -->
        <div class="grid-metrics">
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Total Abonados</span>
              <div class="metric-icon-box" style="color: var(--primary);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
            <div id="metric-clients-total" class="metric-value">--</div>
            <div class="metric-footer">Registrados en WispHub</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Con Ubicación GPS</span>
              <div class="metric-icon-box" style="color: var(--accent-green);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
            </div>
            <div id="metric-clients-with-gps" class="metric-value" style="color: #34d399;">--</div>
            <div class="metric-footer">Coordenadas y Google Maps listos</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Sin Coordenadas GPS</span>
              <div class="metric-icon-box" style="color: var(--accent-amber);">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
            </div>
            <div id="metric-clients-without-gps" class="metric-value" style="color: #fcd34d;">--</div>
            <div class="metric-footer">Pendientes de enviar ubicación</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Servicios Activos</span>
              <div class="metric-icon-box" style="color: #60a5fa;">
                <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
            </div>
            <div id="metric-clients-active" class="metric-value" style="color: #60a5fa;">--</div>
            <div class="metric-footer">Con servicio activo en línea</div>
          </div>
        </div>

        <!-- Datatable Toolbar Card -->
        <div class="glass-card" style="margin-bottom: 20px;">
          <div class="datatable-toolbar" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none; justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-client-estado" class="datatable-select" onchange="handleClientColFilter()">
                <option value="">Todos los Estados</option>
                <option value="Activo">Activos</option>
                <option value="Suspendido">Suspendidos</option>
                <option value="Corte">En Corte</option>
                <option value="Gratis">Gratis / Demo</option>
              </select>
              <select id="filter-client-router" class="datatable-select" onchange="handleClientColFilter()">
                <option value="">Todos los Routers / Zonas</option>
              </select>
              <select id="filter-client-gps" class="datatable-select" onchange="handleClientColFilter()">
                <option value="">GPS: Todos</option>
                <option value="CON_GPS">Con Coordenadas GPS</option>
                <option value="SIN_GPS">Sin Coordenadas GPS</option>
              </select>
              <select id="filter-clients-sort" class="datatable-select" onchange="sortClientsBy(this.value)">
                <option value="id_servicio_asc">Orden: ID / Folio</option>
                <option value="nombre_asc">Nombre (A-Z)</option>
                <option value="nombre_desc">Nombre (Z-A)</option>
                <option value="ip_asc">Dirección IP</option>
                <option value="estado_asc">Estado</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearClientColFilters()" title="Limpiar todos los filtros">
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <!-- Table Container -->
        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <h3 style="font-size: 15px; font-weight: 700;">Directorio de Clientes & Geolocalización</h3>
            </div>
            <span id="clients-count-label" style="font-size: 12px; color: var(--text-muted);">Cargando clientes...</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortClientsBy('nombre')" style="min-width: 190px;">Abonado & Servicio <span id="sort-client-nombre" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortClientsBy('ip')" style="min-width: 150px;">Red & SmartOLT <span id="sort-client-ip" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortClientsBy('estado')" style="min-width: 130px;">Estado & Plan <span id="sort-client-estado" class="sort-icon">↕</span></th>
                  <th style="min-width: 140px;">Contacto</th>
                  <th style="min-width: 190px;">Geolocalización GPS & Domicilio</th>
                  <th style="text-align: right; min-width: 140px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-clients-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 24px;">Cargando listado de clientes...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div id="clients-pagination" style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--card-border);">
            <span id="clients-pagination-info" style="font-size: 12.5px; color: var(--text-dim);">Página 1</span>
            <div style="display: flex; gap: 8px;">
              <button id="btn-clients-prev" class="btn btn-secondary btn-sm" onclick="changeClientsPage(-1)">◀ Anterior</button>
              <button id="btn-clients-next" class="btn btn-secondary btn-sm" onclick="changeClientsPage(1)">Siguiente ▶</button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 3: KANBAN & TABLE TICKETS BOARD -->
      <section id="view-tickets" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">Tablero & Listado de Soporte Técnico</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Gestiona los folios de servicio con filtros por columna y vista Kanban.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); border: 1px solid var(--card-border); padding: 2px;">
              <button class="btn btn-primary btn-xs" id="btn-tickets-view-table" onclick="setTicketsDisplayMode('table')">Vista Tabla</button>
              <button class="btn btn-secondary btn-xs" id="btn-tickets-view-kanban" onclick="setTicketsDisplayMode('kanban')">Vista Kanban</button>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="loadTicketsData()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
              <span>Recargar</span>
            </button>
            <button id="btn-clear-all-tickets" class="btn btn-danger btn-sm" style="display: none;" onclick="confirmClearAllTickets()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Vaciar Tickets</span>
            </button>
          </div>
        </div>

        <!-- Tickets Table View -->
        <div id="tickets-table-container" class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h4 style="font-size: 14.5px; font-weight: 700;">Directorio de Folios & Tickets</h4>
              <span id="tickets-count-label" class="badge badge-info" style="font-size: 10px;">0 tickets</span>
            </div>
          </div>

          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-ticket-status" class="datatable-select" onchange="filterTicketsTable()">
                <option value="">Todos los Estados</option>
                <option value="ABIERTO">Abierto</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="VISITA_TECNICA">Visita Técnica</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
              <select id="filter-ticket-tech" class="datatable-select" onchange="filterTicketsTable()">
                <option value="">Todos los Técnicos</option>
              </select>
              <select id="filter-tickets-sort" class="datatable-select" onchange="sortTicketsBy(this.value)">
                <option value="created_at_desc">Más Recientes</option>
                <option value="created_at_asc">Más Antiguos</option>
                <option value="folio_desc">Folio Mayor a Menor</option>
                <option value="folio_asc">Folio Menor a Mayor</option>
                <option value="client_asc">Cliente (A-Z)</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearTicketsTableFilters()" title="Limpiar filtros">
                Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortTicketsBy('folio')" style="min-width: 100px;">Folio <span id="sort-ticket-folio" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTicketsBy('client')" style="min-width: 180px;">Cliente <span id="sort-ticket-client" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTicketsBy('phone')" style="min-width: 140px;">Teléfono <span id="sort-ticket-phone" class="sort-icon">↕</span></th>
                  <th style="min-width: 220px;">Problema / Asunto</th>
                  <th class="sortable-th" onclick="sortTicketsBy('status')" style="min-width: 130px;">Estado <span id="sort-ticket-status" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTicketsBy('tech')" style="min-width: 150px;">Técnico Asignado <span id="sort-ticket-tech" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTicketsBy('date')" style="min-width: 130px;">Fecha <span id="sort-ticket-date" class="sort-icon">↕</span></th>
                  <th style="text-align: right; min-width: 100px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-tickets-body">
                <tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 20px;">Cargando tickets...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Kanban Board View -->
        <div id="tickets-kanban-container" class="kanban-board" style="display: none;">
          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-amber);">
              <span>ABIERTOS</span>
              <span id="badge-count-abierto" class="badge badge-warning">0</span>
            </div>
            <div id="col-tickets-abierto" class="kanban-cards-wrap"></div>
          </div>

          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-cyan);">
              <span>EN PROCESO</span>
              <span id="badge-count-proceso" class="badge badge-info">0</span>
            </div>
            <div id="col-tickets-en-proceso" class="kanban-cards-wrap"></div>
          </div>

          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-purple);">
              <span>VISITA TÉCNICA</span>
              <span id="badge-count-visita" class="badge badge-purple">0</span>
            </div>
            <div id="col-tickets-visita" class="kanban-cards-wrap"></div>
          </div>

          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-green);">
              <span>RESUELTOS</span>
              <span id="badge-count-resuelto" class="badge badge-success">0</span>
            </div>
            <div id="col-tickets-resuelto" class="kanban-cards-wrap"></div>
          </div>
        </div>
      </section>

      <!-- VIEW 4: IPAM & POOLS -->
      <section id="view-ipam" class="view-container">
        <div class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 700;">Ocupación de Pools por VLAN & Subredes</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Detección 100% automática de subredes, gateways y cálculo de capacidad en tiempo real.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="triggerAutoDiscoverVlans()" title="Escanear base de datos y detectar nuevas subredes de ONUs automáticamente">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Auto-Detectar Subredes</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="loadIpamData()" title="Refrescar ocupación">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
          <div id="ipam-pools-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;"></div>
        </div>

        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 700;">ONUs Nuevas Sin Configurar en SmartOLT</h3>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="loadIpamData()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
              <span>Refrescar PON</span>
            </button>
          </div>

          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-pon-olt" class="datatable-select" onchange="filterUnconfiguredOnus()">
                <option value="">Todas las OLTs</option>
              </select>
              <select id="filter-pon-model" class="datatable-select" onchange="filterUnconfiguredOnus()">
                <option value="">Todos los Modelos</option>
              </select>
              <select id="filter-ipam-unconf-sort" class="datatable-select" onchange="sortUnconfiguredOnusBy(this.value)">
                <option value="sn_asc">Serial (A-Z)</option>
                <option value="olt_asc">OLT</option>
                <option value="port_asc">Puerto PON</option>
                <option value="model_asc">Modelo ONT</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearUnconfiguredOnusFilters()" title="Limpiar filtros">
                Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortUnconfiguredOnusBy('olt')" style="min-width: 140px;">OLT <span id="sort-pon-olt" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortUnconfiguredOnusBy('port')" style="min-width: 110px;">PON <span id="sort-pon-port" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortUnconfiguredOnusBy('sn')" style="min-width: 180px;">Serial (SN) <span id="sort-pon-sn" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortUnconfiguredOnusBy('model')" style="min-width: 140px;">Modelo <span id="sort-pon-model" class="sort-icon">↕</span></th>
                  <th style="text-align: right; min-width: 120px;">Acción</th>
                </tr>
              </thead>
              <tbody id="table-unconfigured-onus-body">
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Buscando ONUs en espera...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 5: AUDITORÍA SMARTOLT VS WISPHUB -->
      <section id="view-audit" class="view-container">
        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <h3 style="font-size: 15px; font-weight: 700;">Auditoría Cruzada SmartOLT vs WispHub</h3>
            <span id="audit-pagination-info" style="font-size: 12px; color: var(--text-muted);">Página 1</span>
          </div>

          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-audit-ip-status" class="datatable-select" onchange="handleAuditColFilter()">
                <option value="">🌐 Estado IP: Todos</option>
                <option value="MATCH">🟢 Correctos (Match)</option>
                <option value="MISMATCH">🔴 Discrepancias IP</option>
                <option value="ONLY_SMARTOLT">ℹ️ Solo SmartOLT</option>
                <option value="ONLY_WISPHUB">🟣 Solo WispHub</option>
              </select>
              <select id="filter-audit-tr069" class="datatable-select" onchange="handleAuditColFilter()">
                <option value="">⚙️ TR-069: Todos</option>
                <option value="ACTIVE">🟢 Configurado / Activo</option>
                <option value="INACTIVE">🔴 Falta TR-069</option>
              </select>
              <select id="filter-audit-ipv6" class="datatable-select" onchange="handleAuditColFilter()">
                <option value="">🌐 IPv6: Todos</option>
                <option value="ACTIVE">🟢 Dual Stack</option>
                <option value="INACTIVE">🟡 Solo IPv4</option>
              </select>
              <select id="filter-audit-sort" class="datatable-select" onchange="sortAuditBy(this.value)">
                <option value="cliente_asc">🔤 Cliente (A-Z)</option>
                <option value="cliente_desc">🔤 Cliente (Z-A)</option>
                <option value="smartolt_ip_asc">🌐 IP SmartOLT</option>
                <option value="wisphub_ip_asc">🌐 IP WispHub</option>
                <option value="ip_status_asc">⚡ Estado IP</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearAuditColFilters()" title="Limpiar filtros">
                🧹 Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortAuditBy('cliente')" style="min-width: 180px;">Cliente <span id="sort-audit-client" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAuditBy('servicio')" style="min-width: 130px;">Servicio / Folio <span id="sort-audit-srv" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAuditBy('smartolt_ip')" style="min-width: 130px;">IP SmartOLT <span id="sort-audit-ip-olt" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAuditBy('wisphub_ip')" style="min-width: 130px;">IP WispHub <span id="sort-audit-ip-wisp" class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAuditBy('ip_status')" style="min-width: 110px;">Estado IP <span id="sort-audit-ip-status" class="sort-icon">↕</span></th>
                  <th style="min-width: 110px;">TR-069</th>
                  <th style="min-width: 110px;">IPv6</th>
                  <th style="min-width: 140px;">Plan WispHub</th>
                  <th style="text-align: right; min-width: 100px;">Acción</th>
                </tr>
              </thead>
              <tbody id="table-audit-body">
                <tr><td colspan="9" style="text-align: center; color: var(--text-dim);">Cargando auditoría...</td></tr>
              </tbody>
            </table>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;">
            <span id="audit-pagination-info-bottom" style="font-size: 12px; color: var(--text-muted);">Página 1</span>
            <div style="display: flex; gap: 8px;">
              <button id="btn-audit-prev" class="btn btn-secondary btn-sm" onclick="changeAuditPage(-1)">◀ Anterior</button>
              <button id="btn-audit-next" class="btn btn-secondary btn-sm" onclick="changeAuditPage(1)">Siguiente ▶</button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 6: TÉCNICOS & PINS -->
      <section id="view-technicians" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">Técnicos de Campo Autorizados</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Gestiona los PINs de 5 dígitos para consultas y diagnósticos en WhatsApp.</p>
          </div>
          <button class="btn btn-primary" onclick="openNewTechnicianModal()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Nuevo Técnico</span>
          </button>
        </div>

        <div class="glass-card">
          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-tech-role" class="datatable-select" onchange="filterTechniciansTable()" title="Filtrar por rol">
                <option value="">💼 Todos los roles</option>
                <option value="instalador">Instalador</option>
                <option value="soporte">Soporte</option>
                <option value="supervisor">Supervisor</option>
                <option value="tecnico">Técnico</option>
              </select>
              <select id="filter-tech-status" class="datatable-select" onchange="filterTechniciansTable()" title="Filtrar por estado">
                <option value="">⚡ Todos los estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
              <select id="filter-tech-sort" class="datatable-select" onchange="sortTechniciansBy(this.value)" title="Ordenar técnicos">
                <option value="name_asc">Ordenar: Nombre (A-Z)</option>
                <option value="name_desc">Ordenar: Nombre (Z-A)</option>
                <option value="phone_asc">Ordenar: Teléfono</option>
                <option value="status_asc">Ordenar: Estado</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearTechniciansFilters()" title="Limpiar filtros">
                🧹 Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortTechniciansBy('name')" style="min-width: 180px;">Nombre <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTechniciansBy('phone')" style="min-width: 150px;">Teléfono WhatsApp <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTechniciansBy('pin')" style="min-width: 110px;">PIN (5 Dígitos) <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTechniciansBy('role')" style="min-width: 120px;">Rol <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortTechniciansBy('status')" style="min-width: 110px;">Estado <span class="sort-icon">↕</span></th>
                  <th style="text-align: right; min-width: 100px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-technicians-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Cargando técnicos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW: CAMBIO DE MÓDEM (REEMPLAZO DE ONU) -->
      <section id="view-modem-swap" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 17px; font-weight: 800; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px;">
              <span>🔄</span> Cambio de Módem (Reemplazo de ONU)
            </h3>
            <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
              Reemplaza un módem conservando su IP, VLAN, Cliente, Plan y Zona. Respalda en BD, desvincula en SmartOLT y da de alta el nuevo equipo con notificación al grupo de WhatsApp.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="loadModemSwapData()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
              <span>Refrescar</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('swap-history-card').scrollIntoView({ behavior: 'smooth' })">
              <span>📋 Ver Historial</span>
            </button>
          </div>
        </div>

        <!-- 2 Column Layout: Old Modem vs New Modem -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 20px;">
          
          <!-- Card 1: Old Modem to Replace -->
          <div class="glass-card" style="border-top: 3px solid var(--accent-rose);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <h4 style="font-size: 15px; font-weight: 700; color: var(--accent-rose); display: flex; align-items: center; gap: 6px;">
                <span>🔴 1.</span> Módem Actual a Retirar (SmartOLT)
              </h4>
              <span class="badge badge-danger" style="font-size: 10px;">Se eliminará de OLT</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Busca el cliente o módem actual. Sus parámetros de red (IP, VLAN, Plan, Zona) se transferirán automáticamente al nuevo equipo.
            </p>

            <div class="form-group" style="position: relative;">
              <label class="form-label">Buscar por Nombre de Cliente, Folio, IP o Serie SN</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="swap-search-old-input" class="form-control" placeholder="Ej: Diana Laura, 2982, 172.19.2.178 o HWTCE9C840B3..." oninput="debounceSwapSearchOld(this.value)" autocomplete="off">
                <button type="button" class="btn btn-secondary btn-sm" onclick="searchSwapOldOnus(document.getElementById('swap-search-old-input').value)">🔍</button>
              </div>
              <!-- Dropdown results -->
              <div id="swap-old-dropdown-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: rgba(15, 23, 42, 0.98); border: 1px solid var(--card-border); border-radius: var(--radius-sm); max-height: 220px; overflow-y: auto; z-index: 100; box-shadow: var(--shadow-lg); margin-top: 4px;"></div>
            </div>

            <!-- Selected Old ONU Details Card -->
            <div id="swap-old-selected-card" style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 14px; margin-top: 14px;">
              <div style="text-align: center; color: var(--text-dim); padding: 20px 10px; font-size: 12.5px;">
                👈 Utiliza el buscador para seleccionar el cliente o módem actual.
              </div>
            </div>
          </div>

          <!-- Card 2: New Modem to Authorize -->
          <div class="glass-card" style="border-top: 3px solid var(--accent-emerald);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <h4 style="font-size: 15px; font-weight: 700; color: var(--accent-emerald); display: flex; align-items: center; gap: 6px;">
                <span>🟢 2.</span> Nuevo Módem a Instalar (Alta)
              </h4>
              <button class="btn btn-secondary btn-xs" onclick="loadSwapUnconfiguredOnus()" title="Escanear ONUs no autorizadas en SmartOLT">
                <span>🔄 Escanear OLT</span>
              </button>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Selecciona el nuevo equipo de la lista de ONUs sin autorizar detectadas en SmartOLT o escribe su número de serie.
            </p>

            <div class="form-group">
              <label class="form-label">ONUs Sin Autorizar Detectadas en SmartOLT</label>
              <select id="swap-select-unconfigured" class="form-control" onchange="handleSelectSwapUnconfigured(this.value)">
                <option value="">-- Seleccionar de ONUs no autorizadas --</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">O Ingresar Número de Serie (SN) del Nuevo Módem</label>
              <input type="text" id="swap-input-new-sn" class="form-control" placeholder="Ej: HWTC4317B500 o ZTEG12345678" style="font-family: monospace; font-weight: 700; text-transform: uppercase;" oninput="this.value = this.value.toUpperCase()">
            </div>

            <!-- New ONU Detected Info -->
            <div id="swap-new-selected-card" style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 14px; margin-top: 14px;">
              <div style="text-align: center; color: var(--text-dim); padding: 20px 10px; font-size: 12.5px;">
                ⚡ Selecciona una ONU sin autorizar o ingresa el SN del nuevo módem.
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Execution and Confirmation Summary -->
        <div class="glass-card" style="margin-bottom: 24px; border: 1px solid var(--primary);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <h4 style="font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span>⚡</span> 3. Confirmación y Notificación Automática
            </h4>
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--card-border);">
              <input type="checkbox" id="swap-checkbox-notify-group" style="transform: scale(1.2); cursor: pointer;" checked>
              <label for="swap-checkbox-notify-group" style="font-size: 12px; font-weight: 600; cursor: pointer; margin-bottom: 0;">
                📢 Notificar al grupo de WhatsApp con formato <code style="color: var(--accent-cyan);">CAMBIO DE MODEM</code>
              </label>
            </div>
          </div>

          <div id="swap-summary-box" style="background: rgba(15, 23, 42, 0.6); border: 1px dashed var(--card-border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: var(--text-muted); text-align: center;">
              Completa el Paso 1 (Módem Actual) y el Paso 2 (Nuevo Módem) para habilitar la ejecución del reemplazo.
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; align-items: center;">
            <div id="swap-execution-status" style="font-size: 12.5px; font-weight: 600; color: var(--text-muted);"></div>
            <button type="button" id="btn-execute-swap" class="btn btn-primary" onclick="handleExecuteModemSwap()" style="padding: 12px 28px; font-size: 14px;" disabled>
              🔄 Ejecutar Cambio de Módem
            </button>
          </div>
        </div>

        <!-- Card 4: Modem Swaps History Table -->
        <div id="swap-history-card" class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div>
              <h4 style="font-size: 15px; font-weight: 700;">📋 Historial de Cambios de Módem Realizados</h4>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Bitácora de reemplazos y respaldos de equipos en Turso DB.</p>
            </div>
            <button class="btn btn-secondary btn-xs" onclick="loadModemSwapHistory()">🔄 Actualizar Historial</button>
          </div>

          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-swap-status" class="datatable-select" onchange="filterSwapHistoryTable()" title="Filtrar por estado">
                <option value="">⚡ Todos los estados</option>
                <option value="COMPLETADO">Completado</option>
                <option value="ERROR">Error</option>
              </select>
              <select id="filter-swap-sort" class="datatable-select" onchange="sortSwapHistoryBy(this.value)" title="Ordenar historial">
                <option value="date_desc">Ordenar: Más recientes primero</option>
                <option value="date_asc">Ordenar: Más antiguos primero</option>
                <option value="client_asc">Ordenar: Cliente (A-Z)</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearSwapHistoryFilters()" title="Limpiar filtros">
                🧹 Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('date')" style="min-width: 130px;">Fecha <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('client')" style="min-width: 170px;">Cliente <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('old_sn')" style="min-width: 140px;">Módem Retirado (Old SN) <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('new_sn')" style="min-width: 140px;">Nuevo Módem (New SN) <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('ip')" style="min-width: 130px;">IP / VLAN <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('zone')" style="min-width: 120px;">Zona <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('tech')" style="min-width: 140px;">Técnico / Responsable <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortSwapHistoryBy('status')" style="min-width: 110px;">Estado <span class="sort-icon">↕</span></th>
                  <th style="text-align: right; min-width: 90px;">Acción</th>
                </tr>
              </thead>
              <tbody id="table-swap-history-body">
                <tr><td colspan="9" style="text-align: center; color: var(--text-dim);">Cargando historial...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 7: CONFIGURACIÓN & INTEGRACIONES -->
      <section id="view-settings" class="view-container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
          <!-- Card 1: WhatsApp Multi-Instance & Multi-Number Hub -->
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 700;">📱 Números de WhatsApp (Multi-Instancia)</h3>
              <button class="btn btn-primary btn-sm" onclick="openNewWhatsAppInstanceModal()">
                <span>➕ Conectar Nuevo Número</span>
              </button>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Vincula múltiples números de WhatsApp con Evolution API para soporte, atención o cobranza.
            </p>
            <div id="evolution-instances-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
              <div style="text-align: center; color: var(--text-dim); padding: 16px;">Cargando instancias de WhatsApp...</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="fetchWhatsAppInstancesList()">🔄 Refrescar Números</button>
              <button class="btn btn-secondary btn-sm" onclick="openWhatsAppInstancesModal()">⚙️ Gestor Avanzado</button>
            </div>
          </div>

          <!-- Card 2: APIs y Credenciales -->
          <div class="glass-card">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">⚡ Credenciales de Servicios & Servidor</h3>
            
            <div class="form-group">
              <label class="form-label">🌐 URL Pública del Servidor / VPS (APP_URL)</label>
              <input type="text" id="setting-APP_URL" class="form-control" placeholder="http://2.25.241.239:3000 o https://tudominio.com" autocomplete="off" spellcheck="false">
              <small style="font-size: 11px; color: var(--text-dim);">Dirección donde Evolution API sincroniza los webhooks de WhatsApp.</small>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Evolution API URL</label>
                <input type="text" id="setting-EVOLUTION_URL" class="form-control" placeholder="http://localhost:8080" autocomplete="off" spellcheck="false">
              </div>
              <div class="form-group">
                <label class="form-label">Evolution API Key (Master)</label>
                <input type="password" id="setting-EVOLUTION_API_KEY" class="form-control" placeholder="••••••••" autocomplete="new-password">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Groq API Key (IA)</label>
                <input type="password" id="setting-GROQ_API_KEY" class="form-control" placeholder="gsk_••••••••" autocomplete="new-password">
              </div>
              <div class="form-group">
                <label class="form-label">Modelo Groq</label>
                <input type="text" id="setting-GROQ_MODEL" class="form-control" placeholder="llama-3.1-8b-instant" value="llama-3.1-8b-instant">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">WispHub API URL</label>
                <input type="text" id="setting-WISPHUB_API_URL" class="form-control" placeholder="https://api.wisphub.net/api">
              </div>
              <div class="form-group">
                <label class="form-label">WispHub API Key</label>
                <input type="password" id="setting-WISPHUB_API_KEY" class="form-control" placeholder="••••••••" autocomplete="new-password">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">SmartOLT API URL</label>
                <input type="text" id="setting-SMARTOLT_API_URL" class="form-control" placeholder="https://tudominio.smartolt.com/api">
              </div>
              <div class="form-group">
                <label class="form-label">SmartOLT API Key (X-Token)</label>
                <input type="password" id="setting-SMARTOLT_API_KEY" class="form-control" placeholder="••••••••" autocomplete="new-password">
              </div>
            </div>

            <div class="form-group" style="background: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 12px; margin-top: 14px;">
              <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                <span>📢 Grupo de Activaciones (WhatsApp)</span>
                <span id="group-linked-badge" class="badge badge-success" style="display: none; font-size: 10px;">Vinculado</span>
              </label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="setting-ACTIVATIONS_GROUP_JID" class="form-control" placeholder="https://chat.whatsapp.com/... o 1203630...@g.us">
                <button type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;" onclick="handleResolveGroupLink()" id="btn-resolve-group">
                  🔗 Vincular
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <select id="select-active-groups" class="form-control" style="font-size: 12px; flex: 1;" onchange="handleSelectExistingGroup(this.value)">
                  <option value="">-- O seleccionar de grupos activos --</option>
                </select>
                <button type="button" class="btn btn-secondary btn-sm" onclick="fetchWhatsAppGroups()" title="Refrescar lista">🔄</button>
              </div>
            </div>
          </div>

          <!-- Card 3: 🩺 Diagnóstico de Conexión en Vivo de APIs -->
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <h3 style="font-size: 15px; font-weight: 700;">🩺 Diagnóstico Real de APIs</h3>
              <button type="button" class="btn btn-primary btn-sm" onclick="testAllApisDiagnostic()" id="btn-test-all-apis">
                ⚡ Probar Todas
              </button>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Ejecuta pruebas reales contra los servidores externos para verificar latencia y autenticación.
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Item 1: Evolution API -->
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">📱 Evolution API (WhatsApp)</div>
                  <div id="diag-status-evolution" style="font-size: 11px; color: var(--text-dim);">Sin probar aún</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSingleApi('evolution', this)">⚡ Probar</button>
              </div>

              <!-- Item 2: Groq AI -->
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">🧠 Groq AI (Llama 3.1)</div>
                  <div id="diag-status-groq" style="font-size: 11px; color: var(--text-dim);">Sin probar aún</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSingleApi('groq', this)">⚡ Probar</button>
              </div>

              <!-- Item 3: WispHub -->
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">📊 WispHub (Facturación)</div>
                  <div id="diag-status-wisphub" style="font-size: 11px; color: var(--text-dim);">Sin probar aún</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSingleApi('wisphub', this)">⚡ Probar</button>
              </div>

              <!-- Item 4: SmartOLT -->
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">🌐 SmartOLT (Fibra GPON)</div>
                  <div id="diag-status-smartolt" style="font-size: 11px; color: var(--text-dim);">Sin probar aún</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSingleApi('smartolt', this)">⚡ Probar</button>
              </div>

              <!-- Item 5: Turso DB -->
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">☁️ Turso DB (libSQL Cloud)</div>
                  <div id="diag-status-turso" style="font-size: 11px; color: var(--text-dim);">Sin probar aún</div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSingleApi('turso', this)">⚡ Probar</button>
              </div>
            </div>
          </div>

          <!-- Card 3: Automatizaciones y Avisos de Cobranza (Switches) -->
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <h3 style="font-size: 15px; font-weight: 700;">🔔 Automatizaciones de Cobranza</h3>
              <span class="badge badge-info" style="font-size: 10px;">Anti-Spam Activo</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
              Activa o apaga los avisos automáticos para evitar saturar el WhatsApp de tus clientes.
            </p>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Switch 1: Recordatorio Previo -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--card-border);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">📅 Recordatorio Preventivo</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Avisa cordialmente antes de la fecha límite</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="number" id="setting-NOTIF_RECORDATORIO_PREVIO_DIAS" class="form-control" style="width: 54px; text-align: center; padding: 4px; font-size: 12px;" min="1" max="15" value="3" title="Días antes de corte">
                  <span style="font-size: 11px; color: var(--text-muted);">días</span>
                  <input type="checkbox" id="setting-NOTIF_RECORDATORIO_PREVIO_ENABLED" style="transform: scale(1.3); cursor: pointer;" checked>
                </div>
              </div>

              <!-- Switch 2: Día de Corte -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--card-border);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">⚠️ Aviso el Mismo Día de Corte</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Recomendado apagado si ya envías el previo</div>
                </div>
                <input type="checkbox" id="setting-NOTIF_DIA_CORTE_ENABLED" style="transform: scale(1.3); cursor: pointer;">
              </div>

              <!-- Switch 3: Suspensión -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--card-border);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">🔴 Aviso de Servicio Suspendido</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Informa al cliente con datos bancarios para reconectar</div>
                </div>
                <input type="checkbox" id="setting-NOTIF_SUSPENSION_ENABLED" style="transform: scale(1.3); cursor: pointer;" checked>
              </div>

              <!-- Selector Instancia de Cobro -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">WhatsApp Remitente de Cobranza</label>
                <select id="setting-NOTIF_INSTANCE_NAME" class="form-control" style="font-size: 12px;">
                  <option value="atencion">💳 Instancia Atención al Cliente (atencion)</option>
                  <option value="soporte">🔧 Instancia Soporte Técnico (soporte)</option>
                </select>
                <small style="font-size: 11px; color: var(--text-dim); margin-top: 4px; display: block;">
                  Las respuestas de los clientes ingresarán a la bandeja de Atención/Cobranza.
                </small>
              </div>

              <button type="button" class="btn btn-secondary btn-sm" onclick="runBillingCycleManual()" style="margin-top: 4px;">
                🚀 Probar / Disparar Lote de Cobranza Ahora
              </button>
            </div>
          </div>

          <!-- Card 4: Datos Bancarios & Horarios de Oficina Física -->
          <div class="glass-card">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">🏦 Datos Bancarios & Horarios de Oficina</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Información dinámica que el bot entrega a los clientes al consultar saldo o métodos de pago.
            </p>
            <div class="form-group">
              <label class="form-label">Banco</label>
              <input type="text" id="setting-PAYMENT_BANK" class="form-control" placeholder="BBVA Bancomer" value="BBVA Bancomer">
            </div>
            <div class="form-group">
              <label class="form-label">Número de Cuenta / CLABE Interbancaria (18 dígitos)</label>
              <input type="text" id="setting-PAYMENT_ACCOUNT" class="form-control" placeholder="012 180 0152433212 90" value="012 180 0152433212 90" spellcheck="false">
            </div>
            <div class="form-group">
              <label class="form-label">Nombre del Titular / Beneficiario</label>
              <input type="text" id="setting-PAYMENT_BENEFICIARY" class="form-control" placeholder="CloudWare Telecomunicaciones" value="CloudWare Telecomunicaciones">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label">Horario Lunes a Viernes</label>
                <input type="text" id="setting-OFFICE_HOURS_WEEKDAY" class="form-control" placeholder="9:00 a 18:00 hrs" value="9:00 a 18:00 hrs">
              </div>
              <div class="form-group">
                <label class="form-label">Horario Sábados</label>
                <input type="text" id="setting-OFFICE_HOURS_SATURDAY" class="form-control" placeholder="9:00 a 15:00 hrs" value="9:00 a 15:00 hrs">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Dirección de Oficina (Opcional)</label>
              <input type="text" id="setting-OFFICE_ADDRESS" class="form-control" placeholder="Ej: Av. Principal #123, Actopan, Hgo.">
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-primary" onclick="handleSaveAllSettingsManual()" style="padding: 12px 28px; font-size: 14px;">
            💾 Guardar Todas las Configuraciones
          </button>
        </div>

        <!-- Danger Zone (Superadmin Only) -->
        <div id="settings-danger-zone" class="glass-card" style="margin-top: 24px; border-color: rgba(244, 63, 94, 0.3); display: none;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--accent-rose); margin-bottom: 12px;">Zona de Pruebas & Reset (Superadmin)</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Elimina datos de prueba sin afectar la base de datos de producción. Requiere confirmación.</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-danger btn-sm" onclick="clearSessionsData()">Vaciar Sesiones</button>
            <button class="btn btn-danger btn-sm" onclick="clearLogsData()">Vaciar Historial Logs</button>
            <button class="btn btn-danger btn-sm" onclick="confirmClearAllTickets()">Vaciar Tickets</button>
          </div>
        </div>
      </section>

      <!-- VIEW 8: USUARIOS & ROLES (RBAC) -->
      <section id="view-users" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">Administradores del Panel (RBAC)</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Asigna permisos de superadmin, soporte, técnico o facturación.</p>
          </div>
          <button class="btn btn-primary" onclick="openNewAdminUserModal()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Crear Administrador</span>
          </button>
        </div>

        <div class="glass-card">
          <!-- Datatable Toolbar -->
          <div class="datatable-toolbar" style="justify-content: flex-end;">
            <div class="datatable-filters-group">
              <select id="filter-user-role" class="datatable-select" onchange="filterAdminUsersTable()" title="Filtrar por rol">
                <option value="">👤 Todos los roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="soporte">Soporte</option>
                <option value="tecnico">Técnico</option>
                <option value="facturacion">Facturación</option>
              </select>
              <select id="filter-user-sort" class="datatable-select" onchange="sortAdminUsersBy(this.value)" title="Ordenar usuarios">
                <option value="username_asc">Ordenar: Usuario (A-Z)</option>
                <option value="name_asc">Ordenar: Nombre (A-Z)</option>
                <option value="role_asc">Ordenar: Rol</option>
                <option value="login_desc">Ordenar: Último Ingreso</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="clearAdminUsersFilters()" title="Limpiar filtros">
                🧹 Limpiar
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable-th" onclick="sortAdminUsersBy('username')" style="min-width: 140px;">Usuario <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAdminUsersBy('name')" style="min-width: 180px;">Nombre Completo <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAdminUsersBy('role')" style="min-width: 120px;">Rol <span class="sort-icon">↕</span></th>
                  <th class="sortable-th" onclick="sortAdminUsersBy('last_login')" style="min-width: 140px;">Último Ingreso <span class="sort-icon">↕</span></th>
                  <th style="text-align: right; min-width: 90px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-admin-users-body">
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Cargando usuarios...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- SPA Client Logic -->
  <script>
    const state = {
      token: localStorage.getItem('cloudware_admin_token') || '',
      user: null,
      currentView: 'dashboard',
      chats: [],
      activeChatPhone: null,
      chatDeptFilter: 'all',
      whatsappAreas: [],
      whatsappInstances: [],
      tickets: [],
      ticketsDisplayMode: 'table',
      dashboardLogs: [],
      unconfiguredOnus: [],
      clients: { filter: 'ALL', search: '', colFilters: {}, page: 1, limit: 25, total: 0, items: [] },
      audit: { filter: 'all', search: '', colFilters: {}, page: 1, limit: 30, total: 0, items: [] },
      provisioning: { filter: 'pending', search: '', colFilters: {}, page: 1, limit: 30, total: 0, items: [] },
      technicians: [],
      adminUsers: [],
      swapHistory: [],
      outages: [],
      isSidebarCollapsed: false,
    };

    // Toast Engine
    function showToast(title, message, type = 'info', duration = 3500) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;

      let iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      if (type === 'success') iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      if (type === 'error') iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      if (type === 'warning') iconSvg = '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

      toast.innerHTML = \`
        <span class="toast-icon">\${iconSvg}</span>
        <div class="toast-body">
          <div class="toast-title">\${title}</div>
          <div class="toast-message">\${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        <div class="toast-progress"></div>
      \`;

      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }

    // Modal Engine
    function openModal(title, htmlContent, onConfirm, confirmText = 'Confirmar', isDanger = false) {
      const modal = document.getElementById('generic-modal');
      document.getElementById('modal-title').innerText = title;
      document.getElementById('modal-body-content').innerHTML = htmlContent;

      const confirmBtn = document.getElementById('modal-confirm-btn');
      confirmBtn.innerText = confirmText;
      confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

      confirmBtn.onclick = async () => {
        if (onConfirm) {
          const res = await onConfirm();
          if (res !== false) closeModal();
        } else {
          closeModal();
        }
      };

      modal.classList.add('show');
    }

    function closeModal() {
      document.getElementById('generic-modal').classList.remove('show');
    }

    function showConfirmDialog(title, message, onConfirm, isDanger = true) {
      const content = \`<p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5;">\${message}</p>\`;
      openModal(title, content, onConfirm, 'Sí, Continuar', isDanger);
    }

    // API Fetch wrapper
    async function apiFetch(url, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      if (state.token) {
        headers['Authorization'] = 'Bearer ' + state.token;
      }

      try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
          handleLogout();
          throw new Error('Sesión expirada.');
        }
        return await res.json();
      } catch (err) {
        console.error('API Fetch Error:', err);
        throw err;
      }
    }

    // Auth session
    async function checkAuthSession() {
      if (!state.token) {
        showLoginModal();
        return;
      }

      try {
        const res = await apiFetch('/api/admin/auth/me');
        if (res.success && res.user) {
          state.user = res.user;
          updateUserUI();
          hideLoginModal();
          initApp();
        } else {
          showLoginModal();
        }
      } catch {
        showLoginModal();
      }
    }

    function showLoginModal() {
      document.getElementById('login-overlay').style.display = 'flex';
    }

    function hideLoginModal() {
      document.getElementById('login-overlay').style.display = 'none';
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const uInput = document.getElementById('login-username').value.trim();
      const pInput = document.getElementById('login-password').value.trim();
      const submitBtn = document.getElementById('login-btn-submit');

      submitBtn.disabled = true;
      submitBtn.innerText = 'Verificando...';

      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uInput, password: pInput }),
        });
        const data = await res.json();

        if (data.success && data.token) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('cloudware_admin_token', data.token);
          updateUserUI();
          hideLoginModal();
          showToast('Bienvenido', \`Hola \${data.user.name || data.user.username}\`, 'success');
          initApp();
        } else {
          showToast('Error de Ingreso', data.error || 'Credenciales inválidas', 'error');
        }
      } catch (err) {
        showToast('Error', 'No se pudo contactar al servidor', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Ingresar al Panel';
      }
    }

    function handleLogout() {
      state.token = '';
      state.user = null;
      localStorage.removeItem('cloudware_admin_token');
      showLoginModal();
      showToast('Sesión Cerrada', 'Has salido del panel.', 'info');
    }

    function updateUserUI() {
      if (!state.user) return;
      const initials = (state.user.name || state.user.username || 'AD').substring(0, 2).toUpperCase();
      document.getElementById('user-avatar-badge').innerText = initials;
      document.getElementById('user-display-name').innerText = state.user.name || state.user.username;
      document.getElementById('user-display-role').innerText = state.user.role || 'Admin';

      const isSuper = state.user.role === 'superadmin';
      const userNav = document.getElementById('nav-item-users');
      if (userNav) {
        userNav.style.display = isSuper ? 'flex' : 'none';
      }

      const btnClearTickets = document.getElementById('btn-clear-all-tickets');
      if (btnClearTickets) {
        btnClearTickets.style.display = isSuper ? 'inline-flex' : 'none';
      }

      const dangerZone = document.getElementById('settings-danger-zone');
      if (dangerZone) {
        dangerZone.style.display = isSuper ? 'block' : 'none';
      }

      const btnDeleteActive = document.getElementById('btn-delete-active-chat');
      if (btnDeleteActive) {
        btnDeleteActive.style.display = isSuper ? 'inline-flex' : 'none';
      }

      // Preseleccionar pestaña de departamento según el rol del usuario
      if (!state.chatDeptFilter || state.chatDeptFilter === 'all') {
        const role = (state.user.role || '').toLowerCase();
        if (role === 'soporte') {
          setChatDeptFilter('SOPORTE');
        } else if (role === 'atencion' || role === 'facturacion') {
          setChatDeptFilter('ATENCION');
        } else {
          setChatDeptFilter('all');
        }
      }
    }


    // URL Hash Parser & Route Resolver
    function parseHashView() {
      let rawHash = (window.location.hash || '').trim();
      if (rawHash.startsWith('#/')) rawHash = rawHash.substring(2);
      else if (rawHash.startsWith('#')) rawHash = rawHash.substring(1);
      if (!rawHash) return null;
      const parts = rawHash.split('?');
      const viewName = parts[0];
      const queryStr = parts[1];
      const validViews = ['dashboard', 'live-chat', 'clients', 'tickets', 'ipam', 'audit', 'technicians', 'modem-swap', 'settings', 'users'];
      if (validViews.includes(viewName)) {
        if (queryStr && viewName === 'live-chat') {
          const params = new URLSearchParams(queryStr);
          const phone = params.get('phone');
          if (phone) state.activeChatPhone = phone;
        }
        return viewName;
      }
      return null;
    }

    // Navigation with Full Browser History & Reload Persistence
    function navigateTo(viewId, updateHistory = true) {
      if (!viewId) viewId = 'dashboard';
      state.currentView = viewId;

      if (updateHistory) {
        let hashTarget = viewId;
        if (viewId === 'live-chat' && state.activeChatPhone) {
          hashTarget += '?phone=' + encodeURIComponent(state.activeChatPhone);
        }
        if (window.location.hash !== '#' + hashTarget) {
          history.pushState({ viewId, phone: state.activeChatPhone }, '', '#' + hashTarget);
        }
      }

      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      document.querySelectorAll('.view-container').forEach(v => {
        v.classList.remove('active');
      });

      const target = document.getElementById('view-' + viewId);
      if (target) target.classList.add('active');

      const titles = {
        'dashboard': 'Resumen General',
        'live-chat': 'Live WhatsApp & Atención en Vivo',
        'clients': 'Directorio de Clientes & Geolocalización GPS',
        'tickets': 'Mesa de Tickets & Órdenes de Servicio',
        'ipam': 'Control de Subredes & Pools de IP',
        'audit': 'Auditoría SmartOLT vs WispHub',
        'technicians': 'Técnicos Autorizados & PINs',
        'modem-swap': 'Cambio de Módem (Historial & Reemplazo)',
        'settings': 'Configuración del Sistema',
        'users': 'Usuarios & Roles de Acceso',
      };
      document.getElementById('current-view-title').innerText = titles[viewId] || 'Panel';
      
      closeMobileMenu();
      
      // Actualizar Barra de Búsqueda Contextual del Topbar
      updateGlobalSearchContext(viewId);

      loadViewData(viewId);
    }
    // Topbar Context-Aware Search Engine
    const searchContextMap = {
      'dashboard': { label: 'Dashboard', placeholder: 'Buscar en bitácora de eventos y logs...' },
      'live-chat': { label: 'Live Chat', placeholder: 'Buscar cliente por nombre o teléfono...' },
      'clients': { label: 'Clientes & GPS', placeholder: 'Buscar por cliente, folio, IP, SN o teléfono...' },
      'tickets': { label: 'Tickets', placeholder: 'Buscar por folio, cliente o falla...' },
      'ipam': { label: 'Pools IP', placeholder: 'Buscar ONUs o subredes...' },
      'audit': { label: 'Auditoría', placeholder: 'Buscar por cliente, IP, servicio o plan...' },
      'technicians': { label: 'Técnicos', placeholder: 'Buscar técnico por nombre, teléfono o PIN...' },
      'modem-swap': { label: 'Cambio Módem', placeholder: 'Buscar en bitácora de cambios de módem...' },
      'settings': { label: 'Ajustes', placeholder: 'Buscar configuraciones...' },
      'users': { label: 'Usuarios RBAC', placeholder: 'Buscar administrador por usuario o nombre...' },
    };

    function updateGlobalSearchContext(viewId) {
      const ctx = searchContextMap[viewId] || { label: 'Sistema', placeholder: 'Buscar en el sistema...' };
      const badge = document.getElementById('global-search-context-badge');
      const input = document.getElementById('global-context-search');
      if (badge) badge.innerText = ctx.label;
      if (input) {
        input.placeholder = ctx.placeholder;
        if (input.value.trim()) {
          routeSearchToCurrentView(input.value.trim());
        }
      }
    }

    let globalSearchDebounce = null;
    function handleGlobalContextSearch(q) {
      const clearBtn = document.getElementById('global-search-clear-btn');
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
      
      clearTimeout(globalSearchDebounce);
      globalSearchDebounce = setTimeout(() => {
        routeSearchToCurrentView(q);
      }, 250);
    }

    function clearGlobalContextSearch() {
      const input = document.getElementById('global-context-search');
      if (input) input.value = '';
      const clearBtn = document.getElementById('global-search-clear-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      routeSearchToCurrentView('');
    }

    function matchesFuzzyTokens(query, ...fields) {
      if (!query) return true;
      const cleanQ = String(query).toLowerCase().trim();
      if (!cleanQ) return true;
      const tokens = cleanQ.split(/\s+/).filter(Boolean);
      const combined = fields.map(f => (f !== null && f !== undefined ? String(f).toLowerCase() : '')).join(' ');
      return tokens.every(token => combined.includes(token));
    }

    function routeSearchToCurrentView(q) {
      const v = state.currentView;
      const query = (q || '').trim();

      if (v === 'dashboard') {
        filterDashboardLogs();
      } else if (v === 'live-chat') {
        const inp = document.getElementById('chat-filter-input');
        if (inp) inp.value = query;
        filterChatThreads(query);
      } else if (v === 'clients') {
        handleClientsSearchInput(query);
      } else if (v === 'tickets') {
        filterTicketsTable();
      } else if (v === 'ipam') {
        filterUnconfiguredOnus();
      } else if (v === 'audit') {
        handleAuditColFilter();
      } else if (v === 'technicians') {
        filterTechniciansTable();
      } else if (v === 'modem-swap') {
        filterSwapHistoryTable();
      } else if (v === 'users') {
        filterAdminUsersTable();
      }
    }

    // Universal Datatable Sorting & IP Math Helpers
    function ipToNumeric(ip) {
      if (!ip || typeof ip !== 'string') return -1;
      const match = ip.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/);
      if (!match) return -1;
      return ((+match[1] * 16777216) + (+match[2] * 65536) + (+match[3] * 256) + (+match[4])) >>> 0;
    }

    function parseSortParam(param, currentSort) {
      if (typeof param === 'string' && (param.endsWith('_asc') || param.endsWith('_desc'))) {
        const lastUnderscore = param.lastIndexOf('_');
        return {
          col: param.substring(0, lastUnderscore),
          dir: param.substring(lastUnderscore + 1),
        };
      }
      if (currentSort && currentSort.col === param) {
        return {
          col: param,
          dir: currentSort.dir === 'asc' ? 'desc' : 'asc',
        };
      }
      return { col: param, dir: 'asc' };
    }

    function universalCompare(valA, valB, dir = 'asc') {
      const isNilA = valA === null || valA === undefined || valA === '';
      const isNilB = valB === null || valB === undefined || valB === '';
      if (isNilA && isNilB) return 0;
      if (isNilA) return 1;
      if (isNilB) return -1;

      let res = 0;
      const strA = String(valA).trim();
      const strB = String(valB).trim();

      // IPv4 Numeric Comparison
      const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
      if (ipRegex.test(strA) && ipRegex.test(strB)) {
        res = ipToNumeric(strA) - ipToNumeric(strB);
      } else if (!isNaN(Number(strA)) && !isNaN(Number(strB)) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        // Numeric Comparison (IDs, Folios, Board, Port, PIN)
        res = Number(strA) - Number(strB);
      } else {
        // Date / Timestamp ISO comparison
        const dateA = Date.parse(strA);
        const dateB = Date.parse(strB);
        if (!isNaN(dateA) && !isNaN(dateB) && (strA.includes('T') || strA.includes('-') || strA.includes('/')) && strA.length > 7 && strB.length > 7) {
          res = dateA - dateB;
        } else {
          // Natural Alphanumeric String Comparison
          res = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        }
      }

      return dir === 'asc' ? res : -res;
    }

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
      sidebar.classList.toggle('collapsed', state.isSidebarCollapsed);

      document.getElementById('toggle-icon-left').style.display = state.isSidebarCollapsed ? 'none' : 'block';
      document.getElementById('toggle-icon-right').style.display = state.isSidebarCollapsed ? 'block' : 'none';
    }

    function closeMobileMenu() {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');
    }

    function toggleMobileMenu() {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar) {
        sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', sidebar.classList.contains('mobile-open'));
      }
    }

    function refreshCurrentView() {
      loadViewData(state.currentView);
      showToast('Actualizado', 'Datos sincronizados correctamente.', 'info', 2000);
    }

    function loadViewData(viewId) {
      switch (viewId) {
        case 'dashboard': loadDashboardData(); break;
        case 'live-chat': loadLiveChatData(); break;
        case 'clients': loadClientsData(); break;
        case 'tickets': loadTicketsData(); break;
        case 'ipam': loadIpamData(); break;
        case 'audit': loadAuditData(); break;
        case 'technicians': loadTechniciansData(); break;
        case 'modem-swap': loadModemSwapData(); break;
        case 'settings': loadSettingsData(); break;
        case 'users': loadAdminUsersData(); break;
      }
    }

    // SSE Engine
    function initSSEStream() {
      if (window.EventSource) {
        const evtSource = new EventSource('/api/admin/live-stream');
        
        evtSource.addEventListener('connected', () => {
          document.getElementById('whatsapp-live-pill').style.opacity = '1';
        });

        evtSource.addEventListener('chat:message', (e) => {
          const data = JSON.parse(e.data || '{}');
          if (data && data.phone && data.message) {
            if (!state.dashboardLogs) state.dashboardLogs = [];
            const newLog = {
              phone: data.phone,
              client_name: data.client_name || '',
              direction: data.direction || 'IN',
              message: data.message,
              intention: data.intention || '',
              action: data.action || '',
              created_at: data.created_at || new Date().toISOString(),
            };
            state.dashboardLogs.unshift(newLog);
            if (state.dashboardLogs.length > 100) state.dashboardLogs.pop();
            if (state.currentView === 'dashboard') {
              filterDashboardLogs();
              const liveDot = document.getElementById('dashboard-live-dot');
              if (liveDot) {
                liveDot.style.transform = 'scale(1.4)';
                setTimeout(() => { if (liveDot) liveDot.style.transform = 'scale(1)'; }, 400);
              }
            }
          }
          if (state.currentView === 'live-chat') {
            loadLiveChatData(false);
            if (state.activeChatPhone && state.activeChatPhone === data.phone) {
              appendChatMessage(data);
              if (data.is_paused !== undefined) {
                updateTakeoverButton(data.is_paused, data.takeover);
              }
            }
          }
        });

        evtSource.addEventListener('chat:status', (e) => {
          const data = JSON.parse(e.data || '{}');
          if (state.currentView === 'live-chat') {
            loadLiveChatData(false);
            if (state.activeChatPhone && state.activeChatPhone === data.phone) {
              updateTakeoverButton(data.is_paused, data.takeover);
            }
          }
        });

        evtSource.addEventListener('chat:deleted', (e) => {
          const data = JSON.parse(e.data || '{}');
          if (data.phone) {
            const cleanPhone = data.phone.replace(/\D/g, '');
            state.chats = state.chats.filter(c => c.phone !== data.phone && c.phone !== cleanPhone);
            if (state.activeChatPhone === data.phone || state.activeChatPhone?.replace(/\D/g, '') === cleanPhone) {
              state.activeChatPhone = null;
              document.querySelector('.chat-layout')?.classList.remove('mobile-chat-active');
              document.getElementById('chat-empty-state').style.display = 'flex';
              document.getElementById('chat-active-header').style.display = 'none';
              document.getElementById('chat-messages-wrap').style.display = 'none';
              document.getElementById('chat-input-container').style.display = 'none';
              if (state.chats.length > 0) {
                selectChat(state.chats[0].phone);
              }
            }
            filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
          }
        });

        evtSource.addEventListener('chat:department', (e) => {
          const data = JSON.parse(e.data || '{}');
          if (state.currentView === 'live-chat') {
            const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
            const chat = state.chats.find(c => c.phone === data.phone || (cleanPhone && c.phone.replace(/\D/g, '') === cleanPhone));
            if (chat) {
              chat.department = data.department;
              if (data.instanceName) chat.last_instance = data.instanceName;
              if (data.is_paused !== undefined) {
                chat.is_human_paused = data.is_paused;
              }
              if (state.activeChatPhone === data.phone || (cleanPhone && state.activeChatPhone?.replace(/\D/g, '') === cleanPhone)) {
                updateChatDeptUI(data.department, data.instanceName);
                if (data.is_paused !== undefined) {
                  updateTakeoverButton(data.is_paused, data.takeover);
                }
              }
            } else {
              loadLiveChatData(false);
            }
            renderDynamicDeptFilters();
            filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
          }
        });

        evtSource.addEventListener('client:location_updated', () => {
          if (state.currentView === 'clients') loadClientsData();
          loadDashboardBadgeCounters();
        });

        evtSource.addEventListener('client:phones_updated', () => {
          if (state.currentView === 'clients') loadClientsData();
        });

        evtSource.addEventListener('chat:location_received', (e) => {
          const data = JSON.parse(e.data || '{}');
          showToast('📍 Ubicación Recibida', \`Cliente \${data.phone} compartió su ubicación GPS.\`, 'success', 4000);
          if (state.currentView === 'clients') loadClientsData();
          loadDashboardBadgeCounters();
        });

        evtSource.addEventListener('tickets:update', () => {
          if (state.currentView === 'tickets') loadTicketsData();
          loadDashboardBadgeCounters();
        });

        evtSource.addEventListener('outages:update', () => {
          loadOutagesData();
        });
      }
    }

    // Dashboard Data
    async function loadDashboardData() {
      loadOutagesData();
      try {
        const [smartRes, wisphubRes, ticketRes, logsRes] = await Promise.all([
          apiFetch('/api/smartolt/stats').catch(() => ({ stats: { count: 0, total_onus: 0 } })),
          apiFetch('/api/wisphub/stats').catch(() => ({ stats: { count: 0, total: 0 } })),
          apiFetch('/api/tickets/stats').catch(() => ({ stats: { total: 0, abiertos: 0 } })),
          apiFetch('/api/logs?limit=50').catch(() => ({ logs: [] })),
        ]);

        const onusCount = smartRes.stats?.count ?? smartRes.stats?.total_onus ?? 0;
        const wisphubCount = wisphubRes.stats?.count ?? wisphubRes.stats?.total ?? 0;
        const totalClients = Math.max(onusCount, wisphubCount) || (onusCount + wisphubCount);
        const ticketsTotal = ticketRes.stats?.total ?? 0;
        const ticketsOpen = ticketRes.stats?.abiertos ?? 0;

        document.getElementById('metric-onus').innerText = Number(onusCount).toLocaleString();
        document.getElementById('metric-wisphub').innerText = Number(wisphubCount).toLocaleString();
        document.getElementById('metric-total-clients').innerText = Number(totalClients).toLocaleString();
        document.getElementById('metric-tickets').innerText = Number(ticketsTotal).toLocaleString();
        document.getElementById('metric-tickets-footer').innerText = \`\${ticketsOpen} abiertos / pendientes\`;

        // Store & Render Logs
        state.dashboardLogs = logsRes.logs || [];
        filterDashboardLogs();
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    }

    function renderDashboardLogs(logs) {
      const tbody = document.getElementById('table-recent-logs-body');
      if (!tbody) return;
      if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">No se encontraron interacciones con los filtros aplicados.</td></tr>';
        return;
      }
      tbody.innerHTML = logs.map(l => {
        const phone = l.phone ? String(l.phone).replace(/\\D/g, '') : '';
        return \`
          <tr>
            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); white-space: nowrap;">\${new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
            <td style="font-family: var(--font-mono); font-weight: 600;">\${phone || l.phone || '--'}</td>
            <td>\${l.client_name || '<span style="color: var(--text-dim);">Desconocido</span>'}</td>
            <td><span class="badge \${l.direction === 'IN' ? 'badge-info' : 'badge-purple'}">\${l.direction === 'IN' ? 'Entrante' : 'Saliente'}</span></td>
            <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${escapeHtml(l.message)}">\${escapeHtml(l.message)}</td>
            <td style="text-align: right;">
              \${phone ? \`
                <button class="btn btn-secondary btn-xs" onclick="selectChat('\${phone}'); navigateTo('live-chat');" title="Abrir Chat WhatsApp">
                  💬 Chat
                </button>
              \` : ''}
            </td>
          </tr>
        \`;
      }).join('');
    }

    function filterDashboardLogs() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fFlow = (document.getElementById('filter-logs-flow')?.value || '').toUpperCase().trim();

      const filtered = (state.dashboardLogs || []).filter(l => {
        if (fFlow) {
          const dir = String(l.direction || '').toUpperCase();
          if (fFlow === 'IN' && dir !== 'IN') return false;
          if (fFlow === 'OUT' && dir !== 'OUT') return false;
        }
        if (q) {
          const timeStr = new Date(l.created_at).toLocaleTimeString().toLowerCase();
          const dirStr = String(l.direction || '').toLowerCase() === 'in' ? 'entrante in' : 'saliente out';
          if (!matchesFuzzyTokens(q, timeStr, l.phone, l.client_name, l.message, dirStr)) return false;
        }
        return true;
      });

      const badge = document.getElementById('badge-logs-count');
      if (badge) badge.innerText = \`\${filtered.length} registro\${filtered.length !== 1 ? 's' : ''}\`;

      renderDashboardLogs(filtered);
    }

    let currentLogsSort = { col: 'time', dir: 'desc' };
    function sortDashboardLogs(col) {
      currentLogsSort = parseSortParam(col, currentLogsSort);

      state.dashboardLogs.sort((a, b) => {
        let valA = a[currentLogsSort.col];
        let valB = b[currentLogsSort.col];
        if (currentLogsSort.col === 'time' || currentLogsSort.col === 'created_at') {
          valA = a.created_at;
          valB = b.created_at;
        } else if (currentLogsSort.col === 'client' || currentLogsSort.col === 'client_name') {
          valA = a.client_name;
          valB = b.client_name;
        } else if (currentLogsSort.col === 'phone') {
          valA = a.phone;
          valB = b.phone;
        } else if (currentLogsSort.col === 'direction') {
          valA = a.direction;
          valB = b.direction;
        } else if (currentLogsSort.col === 'message') {
          valA = a.message;
          valB = b.message;
        }
        return universalCompare(valA, valB, currentLogsSort.dir);
      });

      filterDashboardLogs();
    }

    function clearDashboardLogsFilter() {
      clearGlobalContextSearch();
      const selFlow = document.getElementById('filter-logs-flow');
      if (selFlow) selFlow.value = '';
      const selSort = document.getElementById('filter-logs-sort');
      if (selSort) selSort.value = 'time_desc';
      filterDashboardLogs();
    }

    // Outages (Caídas Masivas y Contingencia por Zona)
    async function loadOutagesData() {
      try {
        const res = await apiFetch('/api/admin/outages/active');
        state.outages = res.outages || [];
        renderOutagesList();
      } catch (err) {
        console.error('Error loading outages:', err);
      }
    }

    function renderOutagesList() {
      const container = document.getElementById('dashboard-outages-list');
      const badge = document.getElementById('badge-active-outages');
      if (!container) return;

      if (state.outages && state.outages.length > 0) {
        if (badge) {
          badge.innerText = \`\${state.outages.length} Activa\${state.outages.length > 1 ? 's' : ''}\`;
          badge.style.display = 'inline-block';
        }

        container.innerHTML = state.outages.map(o => \`
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: var(--radius-sm); padding: 12px 16px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 240px; flex: 1;">
              <span class="pulse-dot" style="background: #f43f5e; box-shadow: 0 0 10px #f43f5e;"></span>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <strong style="font-size: 14px; color: #fff;">📍 Zona: \${escapeHtml(o.zone_name)}</strong>
                  <span class="badge badge-warning" style="font-size: 11px;">⏳ Est: \${escapeHtml(o.estimated_time || 'Por definir')}</span>
                  <span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">Inicio: \${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                \${o.notes ? \`<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">💬 \${escapeHtml(o.notes)}</div>\` : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="border-color: rgba(16, 185, 129, 0.4); color: var(--accent-green);" onclick="resolveOutage('\${o.id}', '\${escapeHtml(o.zone_name)}')">
                🟢 Resolver Incidencia
              </button>
            </div>
          </div>
        \`).join('');
      } else {
        if (badge) badge.style.display = 'none';
        container.innerHTML = \`
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.06); border: 1px dashed rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 14px 18px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 18px;">✅</span>
              <div>
                <strong style="font-size: 13.5px; color: var(--accent-green);">Red Operando con Normalidad</strong>
                <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">No hay caídas generales ni contingencias por zona declaradas activas.</p>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 11px;">100% Online</span>
          </div>
        \`;
      }
    }

    async function openDeclareOutageModal() {
      let zones = [];
      try {
        const res = await apiFetch('/api/admin/outages/zones');
        zones = res.zones || [];
      } catch (err) {
        console.error('Error fetching zones:', err);
      }

      const zoneOptions = ['General (Toda la Red)', ...zones]
        .map(z => \`<option value="\${escapeHtml(z)}">\${escapeHtml(z)}</option>\`)
        .join('');

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Zona o Sector Afectado</label>
            <div style="display: flex; gap: 8px;">
              <select id="outage-form-zone-select" class="form-control" style="flex: 1;" onchange="if(this.value) document.getElementById('outage-form-zone-custom').value = this.value;">
                <option value="">-- Seleccionar zona detectada --</option>
                \${zoneOptions}
              </select>
            </div>
            <input type="text" id="outage-form-zone-custom" class="form-control" placeholder="O escribe el nombre de la zona / sector..." style="margin-top: 6px;" value="General (Toda la Red)">
            <small style="font-size: 11px; color: var(--text-dim); margin-top: 4px; display: block;">
              Los clientes cuya dirección o metadata coincida con esta zona recibirán la respuesta de contingencia inmediata al reportar fallas.
            </small>
          </div>

          <div class="form-group">
            <label class="form-label">Tiempo Estimado de Solución</label>
            <input type="text" id="outage-form-est-time" class="form-control" placeholder="Ej: 2 horas, 45 minutos, 3:00 PM" value="1 a 2 horas">
            <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-xs" onclick="document.getElementById('outage-form-est-time').value = '30 a 45 minutos'">30-45 min</button>
              <button type="button" class="btn btn-secondary btn-xs" onclick="document.getElementById('outage-form-est-time').value = '1 a 2 horas'">1-2 horas</button>
              <button type="button" class="btn btn-secondary btn-xs" onclick="document.getElementById('outage-form-est-time').value = '3 a 4 horas'">3-4 horas</button>
              <button type="button" class="btn btn-secondary btn-xs" onclick="document.getElementById('outage-form-est-time').value = 'Aproximadamente a las 6:00 PM'">Hoy 6:00 PM</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Motivo o Notas para el Cliente (Opcional)</label>
            <textarea id="outage-form-notes" class="form-control" rows="3" placeholder="Ej: Corte de fibra dorsal por trabajos de CFE. Nuestras brigadas ya se encuentran en el sitio trabajando en la fusión."></textarea>
          </div>
        </div>
      \`;

      openModal('⚡ Declarar Contingencia de Red / Falla por Zona', content, async () => {
        const zone = (document.getElementById('outage-form-zone-custom').value || document.getElementById('outage-form-zone-select').value || '').trim();
        const estTime = document.getElementById('outage-form-est-time').value.trim();
        const notes = document.getElementById('outage-form-notes').value.trim();

        if (!zone) {
          showToast('Campo Requerido', 'Debes especificar la zona o indicar "General"', 'warning');
          return false;
        }

        const res = await apiFetch('/api/admin/outages', {
          method: 'POST',
          body: JSON.stringify({ zone_name: zone, estimated_time: estTime, notes }),
        });

        if (res.success) {
          showToast('Contingencia Declarada', \`Falla en zona "\${zone}" registrada. El bot responderá automáticamente.\`, 'success', 4500);
          loadOutagesData();
        } else {
          showToast('Error', res.error || 'No se pudo registrar la contingencia', 'error');
          return false;
        }
      }, '⚡ Activar Contingencia');
    }

    async function resolveOutage(id, zoneName) {
      showConfirmDialog(
        \`🟢 Resolver Incidencia en \${zoneName}\`,
        \`¿Confirmas que el servicio en la zona <strong>\${zoneName}</strong> ha sido restablecido? El bot reanudará el diagnóstico individual con SmartOLT para estos clientes.\`,
        async () => {
          const res = await apiFetch(\`/api/admin/outages/\${id}/resolve\`, { method: 'POST' });
          if (res.success) {
            showToast('Falla Resuelta', \`Zona "\${zoneName}" normalizada.\`, 'success', 3500);
            loadOutagesData();
          } else {
            showToast('Error', res.error || 'No se pudo resolver la incidencia', 'error');
          }
        },
        false
      );
    }

    async function loadDashboardBadgeCounters() {
      try {
        const [ticketStats, ipamRes, clientRes] = await Promise.all([
          apiFetch('/api/tickets/stats').catch(() => ({ stats: { abiertos: 0 } })),
          apiFetch('/api/smartolt/unconfigured').catch(() => ({ count: 0 })),
          apiFetch('/api/admin/clients?limit=1').catch(() => ({ total: 0 })),
        ]);

        const openCount = ticketStats.stats?.abiertos || 0;
        const bTicket = document.getElementById('badge-tickets-open');
        if (openCount > 0) {
          bTicket.innerText = openCount;
          bTicket.style.display = 'inline-block';
        } else {
          bTicket.style.display = 'none';
        }

        const unconfCount = ipamRes.count || 0;
        const bIpam = document.getElementById('badge-unconfigured-onus');
        if (unconfCount > 0) {
          bIpam.innerText = unconfCount;
          bIpam.style.display = 'inline-block';
        } else {
          bIpam.style.display = 'none';
        }

        const clientCount = clientRes.total || 0;
        const bClients = document.getElementById('badge-clients-total');
        if (bClients && clientCount > 0) {
          bClients.innerText = clientCount;
          bClients.style.display = 'inline-block';
        }
      } catch {}
    }

    async function testServiceConnection(service) {
      showToast('Comprobando', \`Verificando conexión con \${service.toUpperCase()}...\`, 'info', 2000);
      try {
        const res = await apiFetch('/api/test/' + service, { method: 'POST' });
        if (res.success) {
          showToast('Conexión Exitosa', res.message || \`\${service} operativo.\`, 'success');
        } else {
          showToast('Fallo de Conexión', res.error || 'No respondió el servicio', 'error');
        }
      } catch (err) {
        showToast('Error de Red', err.message || 'Error al conectar', 'error');
      }
    }

    async function triggerFullUnifiedSync() {
      const btn = document.getElementById('btn-sidebar-sync-all');
      const icon = document.getElementById('sync-unified-icon');
      const btnText = btn ? btn.querySelector('.sync-btn-text') : null;

      if (btn) btn.disabled = true;
      if (icon) icon.classList.add('spin');
      if (btnText) btnText.innerText = 'Sincronizando...';

      showToast('Sincronización Global', 'Consultando SmartOLT y WispHub para actualizar Turso DB...', 'info', 4000);

      try {
        const [oltRes, whRes] = await Promise.allSettled([
          apiFetch('/api/smartolt/sync', { method: 'POST', body: JSON.stringify({ force: false }) }),
          apiFetch('/api/wisphub/sync', { method: 'POST' }),
        ]);

        let oltMsg = 'SmartOLT sincronizado';
        let whMsg = 'WispHub sincronizado';

        if (oltRes.status === 'fulfilled' && oltRes.value) {
          if (oltRes.value.success) {
            oltMsg = \`SmartOLT: \${oltRes.value.count || 0} ONUs\`;
          } else {
            oltMsg = \`SmartOLT: \${oltRes.value.message || 'Sin cambios'}\`;
          }
        } else {
          oltMsg = 'SmartOLT: Error de conexión';
        }

        if (whRes.status === 'fulfilled' && whRes.value) {
          if (whRes.value.success) {
            whMsg = \`WispHub: \${whRes.value.count || 0} clientes\`;
          } else {
            whMsg = \`WispHub: \${whRes.value.message || whRes.value.error || 'Sin cambios'}\`;
          }
        } else {
          whMsg = 'WispHub: Error de conexión';
        }

        showToast('Sincronización Completada', \`\${oltMsg} | \${whMsg}\`, 'success', 5000);
        refreshCurrentView();
      } catch (err) {
        showToast('Aviso', 'Sincronización finalizada.', 'info');
        refreshCurrentView();
      } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('spin');
        if (btnText) btnText.innerText = 'Sincronizar Todo';
      }
    }

    async function triggerSmartOltSync(force = false) {
      showToast('Sincronizando', 'Consultando ONUs en SmartOLT...', 'info');
      try {
        const res = await apiFetch('/api/smartolt/sync', { method: 'POST', body: JSON.stringify({ force }) });
        if (res.success) {
          showToast('Sincronización Completada', \`\${res.count} ONUs procesadas en Turso DB.\`, 'success');
          loadDashboardData();
        } else {
          showToast('Error', res.message || 'Error al sincronizar', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function triggerWisphubSync() {
      showToast('Sincronizando', 'Descargando clientes de WispHub API...', 'info');
      try {
        const res = await apiFetch('/api/wisphub/sync', { method: 'POST' });
        if (res.success) {
          showToast('Sincronización Completada', res.message || 'Clientes sincronizados.', 'success');
          loadDashboardData();
        } else {
          showToast('Error', res.error || 'Error al sincronizar WispHub', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    // Live Chat Module
    async function loadLiveChatData(reselect = true) {
      try {
        const [chatsRes, areasRes, instancesRes] = await Promise.all([
          apiFetch('/api/admin/chats'),
          apiFetch('/api/whatsapp/areas').catch(() => ({ areas: [] })),
          apiFetch('/api/whatsapp/instances').catch(() => ({ instances: [] })),
        ]);

        state.chats = chatsRes.conversations || [];
        state.whatsappAreas = areasRes.areas || [];
        state.whatsappInstances = instancesRes.instances || [];

        renderDynamicDeptFilters();
        populateChatSenderInstances();
        filterChatThreads(document.getElementById('chat-filter-input')?.value || '');

        if (reselect && state.chats.length > 0 && !state.activeChatPhone) {
          selectChat(state.chats[0].phone);
        }
      } catch (err) {
        console.error('Error loading chats:', err);
      }
    }

    function renderDynamicDeptFilters() {
      const bar = document.getElementById('chat-dept-filter-bar');
      if (!bar) return;

      const counts = { all: state.chats.length };
      state.chats.forEach(c => {
        const d = (c.department || 'General').trim();
        counts[d] = (counts[d] || 0) + 1;
      });

      const areaSet = new Set();
      state.whatsappAreas.forEach(a => areaSet.add(a.area_name));
      state.chats.forEach(c => {
        if (c.department) areaSet.add(c.department);
      });

      const sortedAreas = Array.from(areaSet);
      let html = '<button class="chat-filter-pill' + (state.chatDeptFilter === 'all' ? ' active' : '') + '" data-area="all" onclick="setChatDeptFilter(this.dataset.area, this)">Todos (' + counts.all + ')</button>';

      sortedAreas.forEach(areaName => {
        const c = counts[areaName] || 0;
        const isCurrent = state.chatDeptFilter.toLowerCase() === areaName.toLowerCase();
        let icon = '🏢';
        const lower = areaName.toLowerCase();
        if (lower.includes('soporte') || lower.includes('tecnic')) icon = '🔧';
        else if (lower.includes('cobranza') || lower.includes('pago') || lower.includes('caja')) icon = '💳';
        else if (lower.includes('ventas') || lower.includes('contrat')) icon = '💼';

        const safeArea = escapeHtml(areaName);
        html += '<button class="chat-filter-pill' + (isCurrent ? ' active' : '') + '" data-area="' + safeArea + '" onclick="setChatDeptFilter(this.dataset.area, this)">' + icon + ' ' + safeArea + ' (' + c + ')</button>';
      });

      bar.innerHTML = html;
    }

    function populateChatSenderInstances() {
      const select = document.getElementById('chat-sender-instance');
      if (!select) return;

      const activeInstances = (state.whatsappAreas || []).filter(a => a.is_connected || a.connection_status === 'open');

      if (activeInstances.length === 0) {
        select.innerHTML = '<option value="">Línea activa por defecto</option>';
        return;
      }

      const currentVal = select.value;
      let html = '';
      for (let i = 0; i < activeInstances.length; i++) {
        const inst = activeInstances[i];
        const phone = inst.phone_number ? ' (' + formatMexPhone(inst.phone_number) + ')' : '';
        const area = inst.area_name ? escapeHtml(inst.area_name) + ' • ' : '';
        const instName = escapeHtml(inst.instance_name || '');
        html += '<option value="' + instName + '">🟢 ' + area + instName + phone + '</option>';
      }
      select.innerHTML = html;

      if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
        select.value = currentVal;
      }
    }

    function setChatDeptFilter(dept, btn) {
      state.chatDeptFilter = dept;
      document.querySelectorAll('#chat-dept-filter-bar .chat-filter-pill').forEach(b => {
        b.classList.remove('active');
      });
      if (btn) {
        btn.classList.add('active');
      }
      filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
    }

    function toggleMobileChatThreads() {
      state.activeChatPhone = null;
      if (state.currentView === 'live-chat') {
        history.replaceState({ viewId: 'live-chat' }, '', '#live-chat');
      }
      const layout = document.querySelector('.chat-layout');
      if (layout) {
        layout.classList.remove('mobile-chat-active');
      }
    }

    function renderChatThreads(list) {
      const container = document.getElementById('chat-threads-container');
      if (!list || list.length === 0) {
        container.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: #8696a0; font-size: 13px;">Sin conversaciones en esta área.</div>';
        return;
      }

      const isSuperAdmin = state.user && state.user.role === 'superadmin';
      let html = '';

      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const isActive = c.phone === state.activeChatPhone ? ' active' : '';
        const name = escapeHtml(c.client_name || c.phone || '');
        const phone = escapeHtml(c.phone || '');
        const dept = escapeHtml(c.department || 'General');
        const lastMsg = escapeHtml(c.last_message || 'Sin mensajes');
        const time = formatShortTime(c.last_interaction);
        const statusBadge = c.is_human_paused
          ? '<span class="badge badge-warning" style="font-size: 9.5px; padding: 1px 5px;">⏸️ Humano</span>'
          : '<span class="badge badge-success" style="font-size: 9.5px; padding: 1px 5px;">🤖 Bot</span>';
        const instanceBadge = c.last_instance
          ? '<span class="badge badge-purple" style="font-size: 9.5px; padding: 1px 5px;">' + escapeHtml(c.last_instance) + '</span>'
          : '';
        const deleteBtn = isSuperAdmin
          ? '<button class="btn-thread-delete" title="Eliminar conversación" data-phone="' + phone + '" onclick="deleteChatThread(event, this.dataset.phone)"><svg class="svg-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>'
          : '';

        html += '<div class="chat-thread-item' + isActive + '" data-phone="' + phone + '" onclick="selectChat(this.dataset.phone)">' +
          '<div class="thread-avatar">' +
            '<svg class="svg-icon" viewBox="0 0 24 24" style="width:24px;height:24px;color:#cfd6db;"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' +
          '</div>' +
          '<div class="thread-content">' +
            '<div class="thread-top">' +
              '<span class="thread-name">' + name + '</span>' +
              '<span class="thread-time">' + time + '</span>' +
            '</div>' +
            '<div class="thread-bottom">' +
              '<span class="thread-preview">' + lastMsg + '</span>' +
              deleteBtn +
            '</div>' +
            '<div class="thread-tags-row">' +
              statusBadge +
              '<span class="badge badge-info" style="font-size: 9.5px; padding: 1px 5px;">' + dept + '</span>' +
              instanceBadge +
            '</div>' +
          '</div>' +
        '</div>';
      }

      container.innerHTML = html;
    }

    function filterChatThreads(q) {
      const term = (q || '').toLowerCase();
      let filtered = state.chats;
      
      if (state.chatDeptFilter && state.chatDeptFilter !== 'all') {
        filtered = filtered.filter(c => (c.department || 'General').toLowerCase() === state.chatDeptFilter.toLowerCase());
      }

      if (term) {
        filtered = filtered.filter(c => 
          (c.client_name && c.client_name.toLowerCase().includes(term)) ||
          c.phone.includes(term) ||
          (c.last_message && c.last_message.toLowerCase().includes(term))
        );
      }
      renderChatThreads(filtered);
    }

    function updateChatDeptUI(dept, instanceName) {
      const currentDept = dept || 'General';
      const badge = document.getElementById('active-chat-dept-badge');
      const instBadge = document.getElementById('active-chat-instance-badge');
      const senderSelect = document.getElementById('chat-sender-instance');

      if (badge) {
        badge.innerText = currentDept;
      }

      const activeInst = instanceName || (senderSelect?.value || '');
      if (instBadge) {
        if (activeInst) {
          const instObj = (state.whatsappAreas || []).find(a => a.instance_name.toLowerCase() === activeInst.toLowerCase());
          const phoneTxt = instObj?.phone_number ? (' (+52 ' + instObj.phone_number.slice(-10) + ')') : '';
          instBadge.innerText = 'Línea: ' + activeInst + phoneTxt;
          instBadge.style.display = 'inline-block';
        } else {
          instBadge.style.display = 'none';
        }
      }

      if (senderSelect && instanceName) {
        senderSelect.value = instanceName;
      }
    }

    async function selectChat(phone) {
      state.activeChatPhone = phone;
      if (state.currentView === 'live-chat') {
        history.replaceState({ viewId: 'live-chat', phone }, '', '#live-chat?phone=' + encodeURIComponent(phone));
      }
      state.activeChatPhone = phone;
      document.querySelector('.chat-layout')?.classList.add('mobile-chat-active');
      filterChatThreads(document.getElementById('chat-filter-input')?.value || '');

      document.getElementById('chat-empty-state').style.display = 'none';
      document.getElementById('chat-active-header').style.display = 'flex';
      document.getElementById('chat-messages-wrap').style.display = 'flex';
      document.getElementById('chat-input-container').style.display = 'flex';

      const isSuperAdmin = state.user && state.user.role === 'superadmin';
      const delBtn = document.getElementById('btn-delete-active-chat');
      if (delBtn) delBtn.style.display = isSuperAdmin ? 'flex' : 'none';

      const chat = state.chats.find(c => c.phone === phone);
      document.getElementById('active-chat-name').innerText = chat?.client_name || phone;
      document.getElementById('active-chat-phone').innerText = phone;
      
      updateChatDeptUI(chat?.department || 'General', chat?.last_instance);
      if (chat?.last_instance) {
        const senderSelect = document.getElementById('chat-sender-instance');
        if (senderSelect) senderSelect.value = chat.last_instance;
      }

      updateTakeoverButton(chat?.is_human_paused);

      try {
        const res = await apiFetch('/api/admin/chats/' + encodeURIComponent(phone) + '/messages');
        renderChatMessages(res.messages || []);
        if (res.is_paused !== undefined) {
          updateTakeoverButton(res.is_paused, res.takeover);
        }
      } catch (err) {
        showToast('Error', 'No se pudieron cargar los mensajes', 'error');
      }
    }

    function toggleChatActionsMenu(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('chat-actions-menu');
      if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
      }
    }

    function closeChatActionsMenu() {
      const menu = document.getElementById('chat-actions-menu');
      if (menu) menu.style.display = 'none';
    }

    document.addEventListener('click', (e) => {
      const menu = document.getElementById('chat-actions-menu');
      if (menu && !menu.contains(e.target) && !e.target.closest('.chat-menu-dropdown-wrap')) {
        menu.style.display = 'none';
      }
    });

    function formatMexPhone(phone) {
      if (!phone) return '';
      const clean = String(phone).replace(/\D/g, '');
      const last10 = clean.slice(-10);
      if (last10.length === 10) {
        return '+52 ' + last10.slice(0, 3) + ' ' + last10.slice(3, 6) + ' ' + last10.slice(6);
      }
      return '+' + clean;
    }

    function openTransferChatModal() {
      if (!state.activeChatPhone) return;
      const chat = state.chats.find(c => c.phone === state.activeChatPhone);
      const currentInstance = (chat?.last_instance || '').toLowerCase();

      // Filtrar instancias activas de WhatsApp
      const liveInstances = (state.whatsappAreas || []).filter(a => a.is_connected || a.connection_status === 'open');

      // Si solo hay 1 o 0 números conectados en el sistema, no se puede traspasar a otra línea
      if (liveInstances.length <= 1) {
        const singlePhone = liveInstances.length === 1 ? formatMexPhone(liveInstances[0].phone_number) : 'Sin número conectado';
        const singleInstName = liveInstances.length === 1 ? liveInstances[0].instance_name : '';
        const singleArea = liveInstances.length === 1 ? (liveInstances[0].area_name || 'General') : '';

        const content = '<div style="text-align: center; padding: 12px 6px;">' +
          '<div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 24px;">' +
            '📱' +
          '</div>' +
          '<h4 style="color: #fff; font-size: 15.5px; font-weight: 700; margin-bottom: 8px;">Solo tienes 1 número de WhatsApp conectado</h4>' +
          '<p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; max-width: 380px; margin: 0 auto 14px;">' +
            'Actualmente todas las conversaciones operan bajo la única línea registrada: <br>' +
            '<strong style="color: var(--accent-cyan); font-size: 13.5px;">' + singlePhone + ' [' + escapeHtml(singleInstName) + ' • ' + escapeHtml(singleArea) + ']</strong>.' +
          '</p>' +
          '<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: var(--radius-sm); padding: 12px 14px; text-align: left; font-size: 12px; color: var(--text-dim); line-height: 1.5;">' +
            '💡 <strong>¿Cómo funciona el traspaso?</strong><br>' +
            'Para traspasar conversaciones a otra sucursal o área, primero debes vincular un segundo número de WhatsApp en <strong>Configuración > Números de WhatsApp</strong>.' +
          '</div>' +
        '</div>';

        openModal('📱 Traspasar a Otra Línea', content, () => {
          navigateTo('settings');
        }, 'Ir a Configuración de Números');
        return;
      }

      // Si hay 2 o más números conectados, mostrar ÚNICAMENTE los otros números reales disponibles
      const otherInstances = liveInstances.filter(inst => inst.instance_name.toLowerCase() !== currentInstance);
      const targetList = otherInstances.length > 0 ? otherInstances : liveInstances;

      let areaOptions = '';
      targetList.forEach(inst => {
        const phoneTxt = inst.phone_number ? ' (' + formatMexPhone(inst.phone_number) + ')' : '';
        const areaTxt = inst.area_name ? escapeHtml(inst.area_name) + ' — ' : '';
        const label = '📱 ' + areaTxt + phoneTxt + ' [' + escapeHtml(inst.instance_name) + ']';
        areaOptions += '<option value="' + escapeHtml(inst.area_name || inst.instance_name) + '" data-instance="' + escapeHtml(inst.instance_name) + '">' + label + '</option>';
      });

      const clientName = escapeHtml(chat?.client_name || state.activeChatPhone || '');
      const content = '<div style="display: flex; flex-direction: column; gap: 14px;">' +
        '<p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0;">' +
          'Traspasa la conversación de <strong>' + clientName + '</strong> a otro número de WhatsApp activo del sistema.' +
        '</p>' +
        '<div class="form-group" style="margin-bottom: 0;">' +
          '<label class="form-label" style="font-weight: 600; margin-bottom: 6px;">Selecciona el Número de Destino</label>' +
          '<select id="transfer-modal-area-select" class="form-control">' +
            areaOptions +
          '</select>' +
        '</div>' +
        '<div class="form-group" style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--card-border); margin-bottom: 0;">' +
          '<label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none;">' +
            '<div>' +
              '<strong style="font-size: 13px; color: var(--text-main);">💬 Notificar al cliente por WhatsApp</strong>' +
              '<div style="font-size: 11px; color: var(--text-dim);">Envía un mensaje automático avisando el traspaso de línea</div>' +
            '</div>' +
            '<input type="checkbox" id="transfer-modal-notify-toggle" style="transform: scale(1.3); cursor: pointer;" checked onchange="toggleTransferModalMsg(this.checked)">' +
          '</label>' +
          '<div id="transfer-modal-msg-wrap" style="margin-top: 10px;">' +
            '<textarea id="transfer-modal-custom-msg" class="form-control" rows="2" placeholder="Tu conversación ha sido canalizada a nuestra otra línea..."></textarea>' +
          '</div>' +
        '</div>' +
      '</div>';

      openModal('🔄 Traspasar Conversación de Línea', content, async () => {
        const select = document.getElementById('transfer-modal-area-select');
        const selectedArea = select.value;

        if (!selectedArea) {
          showToast('Línea requerida', 'Debes seleccionar un número de destino', 'warning');
          return false;
        }

        const selectedOption = select.options[select.selectedIndex];
        const targetInstance = selectedOption?.getAttribute('data-instance') || undefined;
        const notifyClient = document.getElementById('transfer-modal-notify-toggle')?.checked || false;
        const customMessage = document.getElementById('transfer-modal-custom-msg')?.value.trim() || '';

        try {
          const res = await apiFetch('/api/admin/chats/' + encodeURIComponent(state.activeChatPhone) + '/department', {
            method: 'POST',
            body: JSON.stringify({
              department: selectedArea,
              targetInstance,
              notifyClient,
              customMessage,
            }),
          });

          if (res.success) {
            if (chat) {
              chat.department = selectedArea;
              if (res.instanceName) chat.last_instance = res.instanceName;
              chat.is_human_paused = true;
            }
            updateChatDeptUI(selectedArea, res.instanceName);
            if (res.takeover) {
              updateTakeoverButton(true, res.takeover);
            }
            renderDynamicDeptFilters();
            filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
            showToast('Traspaso Exitoso', res.message || ('Chat transferido a ' + selectedArea + '.'), 'success');
          } else {
            showToast('Error', res.error || 'No se pudo transferir el chat', 'error');
            return false;
          }
        } catch (err) {
          showToast('Error', err.message, 'error');
          return false;
        }
      }, '🔄 Confirmar Traspaso');
    }

    function handleTransferAreaChange(select) {
      const customInput = document.getElementById('transfer-modal-area-custom');
      const msgInput = document.getElementById('transfer-modal-custom-msg');
      if (select.value === '__CUSTOM__') {
        if (customInput) {
          customInput.style.display = 'block';
          customInput.focus();
        }
      } else {
        if (customInput) customInput.style.display = 'none';
        if (msgInput && (!msgInput.value || msgInput.value.includes('transferida'))) {
          msgInput.value = 'Tu conversación ha sido transferida al área de *' + select.value + '*. En un momento un asesor continuará con tu atención por este medio.';
        }
      }
    }

    function toggleTransferModalMsg(checked) {
      const wrap = document.getElementById('transfer-modal-msg-wrap');
      if (wrap) wrap.style.display = checked ? 'block' : 'none';
    }

    function renderChatMessages(messages) {
      const wrap = document.getElementById('chat-messages-wrap');
      if (!messages || messages.length === 0) {
        wrap.innerHTML = '<div style="text-align: center; color: #8696a0; margin-top: 40px; font-size: 13px;">No hay mensajes registrados con este número.</div>';
        return;
      }

      let html = '';
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const isOut = m.direction === 'OUT';
        const msgText = escapeHtml(m.message || '');
        const timeText = formatShortTime(m.created_at);
        const checkHtml = isOut ? '<span class="bubble-check">✓✓</span>' : '';
        const bubbleClass = 'chat-bubble ' + (isOut ? 'out' : 'in');

        html += '<div class="' + bubbleClass + '">' +
          '<span>' + msgText + '</span>' +
          '<div class="bubble-meta">' +
            '<span>' + timeText + '</span>' +
            checkHtml +
          '</div>' +
        '</div>';
      }

      wrap.innerHTML = html;
      wrap.scrollTop = wrap.scrollHeight;
    }

    function appendChatMessage(data) {
      const wrap = document.getElementById('chat-messages-wrap');
      const isOut = data.direction === 'OUT';
      const msgText = escapeHtml(data.message || '');
      const timeText = formatShortTime(data.created_at || new Date().toISOString());
      const checkHtml = isOut ? '<span class="bubble-check">✓✓</span>' : '';
      const bubbleClass = 'chat-bubble ' + (isOut ? 'out' : 'in');

      const bubble = document.createElement('div');
      bubble.className = bubbleClass;
      bubble.innerHTML = '<span>' + msgText + '</span>' +
        '<div class="bubble-meta">' +
          '<span>' + timeText + '</span>' +
          checkHtml +
        '</div>';

      wrap.appendChild(bubble);
      wrap.scrollTop = wrap.scrollHeight;
    }

    function handleChatInputKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendActiveChatMessage();
      }
    }

    async function sendActiveChatMessage() {
      const input = document.getElementById('chat-text-input');
      const text = input.value.trim();
      if (!text || !state.activeChatPhone) return;

      const instanceName = document.getElementById('chat-sender-instance')?.value || undefined;

      input.value = '';
      appendChatMessage({ message: text, direction: 'OUT' });

      try {
        const res = await apiFetch('/api/admin/chats/send', {
          method: 'POST',
          body: JSON.stringify({
            phone: state.activeChatPhone,
            message: text,
            mode: '4h',
            instanceName,
          }),
        });

        if (res.success) {
          updateTakeoverButton(true, res.takeover);
          const chat = state.chats.find(c => c.phone === state.activeChatPhone);
          if (chat) {
            chat.is_human_paused = true;
            if (instanceName) chat.last_instance = instanceName;
          }
          filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
        } else {
          showToast('Error', res.error || 'No se pudo enviar el mensaje', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    function updateTakeoverButton(isPaused, takeover) {
      const btn = document.getElementById('btn-toggle-takeover');
      if (!btn) return;

      if (isPaused) {
        const desc = takeover?.descripcion || (takeover?.minutosRestantes ? (takeover.minutosRestantes + 'm restantes') : 'Pausado');
        btn.className = 'btn btn-warning btn-xs';
        btn.innerHTML = '⏸️ <span>' + desc + ' • Reactivar</span>';
        btn.title = 'Bot pausado para atención humana. Clic para reactivar el bot.';
      } else {
        btn.className = 'btn btn-secondary btn-xs';
        btn.innerHTML = '🤖 <span>Bot Activo • Pausar 4h</span>';
        btn.title = 'Bot respondiendo automáticamente. Clic para pausar 4 horas.';
      }
    }

    async function toggleCurrentChatTakeover() {
      if (!state.activeChatPhone) return;
      const chat = state.chats.find(c => c.phone === state.activeChatPhone);
      const willPause = !chat?.is_human_paused;

      try {
        const res = await apiFetch('/api/admin/chats/takeover', {
          method: 'POST',
          body: JSON.stringify({
            phone: state.activeChatPhone,
            pause: willPause,
            mode: willPause ? '4h' : 'resume',
          }),
        });

        if (res.success) {
          if (chat) chat.is_human_paused = willPause;
          updateTakeoverButton(willPause, res.takeover);
          renderChatThreads(state.chats);
          showToast('Modo de Atención', res.message, 'success');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function pauseCurrentChatUntilMorning() {
      if (!state.activeChatPhone) return;
      const chat = state.chats.find(c => c.phone === state.activeChatPhone);

      try {
        const res = await apiFetch('/api/admin/chats/takeover', {
          method: 'POST',
          body: JSON.stringify({
            phone: state.activeChatPhone,
            pause: true,
            mode: 'next_morning',
          }),
        });

        if (res.success) {
          if (chat) chat.is_human_paused = true;
          updateTakeoverButton(true, res.takeover);
          renderChatThreads(state.chats);
          showToast('Pausa Nocturna', res.message, 'success');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function closeCurrentChatCase() {
      if (!state.activeChatPhone) return;
      const phone = state.activeChatPhone;
      const chat = state.chats.find(c => c.phone === phone);

      try {
        const res = await apiFetch('/api/admin/chats/' + encodeURIComponent(phone) + '/close', {
          method: 'POST',
          body: JSON.stringify({ removeSession: true }),
        });

        if (res.success) {
          if (chat) chat.is_human_paused = false;
          updateTakeoverButton(false);
          // Quitar de la lista de chats activos al finalizar el caso
          state.chats = state.chats.filter(c => c.phone !== phone && c.phone !== phone.replace(/\D/g, ''));
          if (state.chats.length > 0) {
            selectChat(state.chats[0].phone);
          } else {
            state.activeChatPhone = null;
            document.getElementById('chat-empty-state').style.display = 'flex';
            document.getElementById('chat-active-header').style.display = 'none';
            document.getElementById('chat-messages-wrap').style.display = 'none';
            document.getElementById('chat-input-container').style.display = 'none';
          }
          filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
          showToast('Caso Finalizado', res.message, 'success');
        } else {
          showToast('Error', res.error || 'No se pudo cerrar el caso', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function deleteCurrentChat() {
      if (!state.activeChatPhone) return;
      const phone = state.activeChatPhone;
      if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta conversación y todos sus mensajes registrados?')) {
        return;
      }
      await executeDeleteChat(phone);
    }

    async function deleteChatThread(e, phone) {
      if (e) e.stopPropagation();
      if (!confirm('¿Eliminar la conversación y registros de ' + phone + '?')) {
        return;
      }
      await executeDeleteChat(phone);
    }

    async function executeDeleteChat(phone) {
      try {
        const res = await apiFetch('/api/admin/chats/' + encodeURIComponent(phone), {
          method: 'DELETE',
        });

        if (res.success) {
          const cleanPhone = phone.replace(/\D/g, '');
          state.chats = state.chats.filter(c => c.phone !== phone && c.phone !== cleanPhone);
          
          if (state.activeChatPhone === phone || state.activeChatPhone?.replace(/\D/g, '') === cleanPhone) {
            state.activeChatPhone = null;
            document.querySelector('.chat-layout')?.classList.remove('mobile-chat-active');
            document.getElementById('chat-empty-state').style.display = 'flex';
            document.getElementById('chat-active-header').style.display = 'none';
            document.getElementById('chat-messages-wrap').style.display = 'none';
            document.getElementById('chat-input-container').style.display = 'none';
            if (state.chats.length > 0) {
              selectChat(state.chats[0].phone);
            }
          }
          filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
          showToast('Chat Eliminado', res.message || 'Conversación eliminada con éxito', 'success');
        } else {
          showToast('Error', res.error || 'No se pudo eliminar el chat', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }


    // Tickets Module (Table & Kanban)
    function setTicketsDisplayMode(mode) {
      state.ticketsDisplayMode = mode;
      const tblCont = document.getElementById('tickets-table-container');
      const kanCont = document.getElementById('tickets-kanban-container');
      const btnTbl = document.getElementById('btn-tickets-view-table');
      const btnKan = document.getElementById('btn-tickets-view-kanban');

      if (mode === 'kanban') {
        if (tblCont) tblCont.style.display = 'none';
        if (kanCont) kanCont.style.display = 'grid';
        if (btnTbl) { btnTbl.classList.remove('btn-primary'); btnTbl.classList.add('btn-secondary'); }
        if (btnKan) { btnKan.classList.remove('btn-secondary'); btnKan.classList.add('btn-primary'); }
      } else {
        if (tblCont) tblCont.style.display = 'block';
        if (kanCont) kanCont.style.display = 'none';
        if (btnTbl) { btnTbl.classList.remove('btn-secondary'); btnTbl.classList.add('btn-primary'); }
        if (btnKan) { btnKan.classList.remove('btn-primary'); btnKan.classList.add('btn-secondary'); }
      }
    }

    async function loadTicketsData() {
      try {
        const res = await apiFetch('/api/tickets?limit=150');
        state.tickets = res.tickets || [];
        populateTicketTechniciansFilter();
        renderKanbanBoard(state.tickets);
        filterTicketsTable();
      } catch (err) {
        console.error('Error loading tickets:', err);
      }
    }

    function populateTicketTechniciansFilter() {
      const selTech = document.getElementById('filter-ticket-tech');
      if (!selTech) return;
      const currentVal = selTech.value;
      const techSet = new Set();
      (state.tickets || []).forEach(t => {
        if (t.assigned_technician_name && t.assigned_technician_name.trim()) {
          techSet.add(t.assigned_technician_name.trim());
        }
      });
      const techs = Array.from(techSet).sort();
      selTech.innerHTML = '<option value="">🔧 Todos los técnicos</option>' +
        techs.map(tech => '<option value="' + escapeHtml(tech) + '">' + escapeHtml(tech) + '</option>').join('');
      if (currentVal && techs.includes(currentVal)) {
        selTech.value = currentVal;
      }
    }

    function renderTicketsTable(tickets) {
      const tbody = document.getElementById('table-tickets-body');
      const countLabel = document.getElementById('tickets-count-label');
      if (countLabel) {
        countLabel.innerText = \`Total: \${tickets.length} tickets\`;
      }
      if (!tbody) return;

      if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">No se encontraron tickets con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = tickets.map(t => {
        const status = (t.status || 'ABIERTO').toUpperCase();
        let statusBadge = '<span class="badge badge-warning">Abierto</span>';
        if (status === 'EN_PROCESO') statusBadge = '<span class="badge badge-info">En Proceso</span>';
        if (status === 'VISITA_TECNICA') statusBadge = '<span class="badge badge-purple">Visita Técnica</span>';
        if (status === 'RESUELTO') statusBadge = '<span class="badge badge-success">Resuelto</span>';
        if (status === 'CANCELADO') statusBadge = '<span class="badge badge-danger">Cancelado</span>';

        const phone = t.phone ? String(t.phone).replace(/\\D/g, '') : '';

        return \`
          <tr>
            <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan); font-size: 13px;">#\${escapeHtml(t.folio || t.id || '')}</strong></td>
            <td>
              <div style="font-weight: 700; color: #fff;">\${escapeHtml(t.client_name || 'Desconocido')}</div>
              \${t.onu_id ? \`<div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">ONU: \${escapeHtml(t.onu_id)}</div>\` : ''}
            </td>
            <td>
              \${phone ? \`
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 11px; padding: 2px 6px; cursor: pointer;" onclick="selectChat('\${phone}'); navigateTo('live-chat');">
                    📱 \${phone}
                  </span>
                </div>
              \` : '<span style="color: var(--text-dim);">--</span>'}
            </td>
            <td>
              <div style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="\${escapeHtml(t.issue_summary || '')}">
                \${escapeHtml(t.issue_summary || 'Sin descripción')}
              </div>
            </td>
            <td>\${statusBadge}</td>
            <td>
              \${t.assigned_technician_name ? \`
                <span class="badge badge-info" style="font-size: 11px;">🔧 \${escapeHtml(t.assigned_technician_name)}</span>
              \` : '<span style="color: var(--text-dim); font-size: 11.5px;">Sin asignar</span>'}
            </td>
            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); white-space: nowrap;">
              \${formatShortDate(t.created_at)}
            </td>
            <td style="text-align: right;">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-xs" onclick='openTicketDetailModal(\${JSON.stringify(t).replace(/'/g, "&apos;")})' title="Ver expediente y cambiar estado">
                  ✏️ Gestionar
                </button>
                \${phone ? \`
                  <button class="btn btn-primary btn-xs" onclick="selectChat('\${phone}'); navigateTo('live-chat');" title="Abrir Chat WhatsApp">
                    💬
                  </button>
                \` : ''}
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function filterTicketsTable() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fStatus = (document.getElementById('filter-ticket-status')?.value || '').toUpperCase().trim();
      const fTech = (document.getElementById('filter-ticket-tech')?.value || '').toLowerCase().trim();

      const filtered = (state.tickets || []).filter(t => {
        if (fStatus && String(t.status || '').toUpperCase() !== fStatus) return false;
        if (fTech && !String(t.assigned_technician_name || '').toLowerCase().includes(fTech)) return false;
        if (q) {
          if (!matchesFuzzyTokens(q, t.folio, t.id, t.client_name, t.phone, t.issue_summary, t.assigned_technician_name, t.status)) return false;
        }
        return true;
      });

      renderTicketsTable(filtered);
    }

    let currentTicketsSort = { col: 'created_at', dir: 'desc' };
    function sortTicketsBy(col) {
      currentTicketsSort = parseSortParam(col, currentTicketsSort);

      state.tickets.sort((a, b) => {
        let valA = a[currentTicketsSort.col];
        let valB = b[currentTicketsSort.col];
        if (currentTicketsSort.col === 'date' || currentTicketsSort.col === 'created_at') {
          valA = a.created_at;
          valB = b.created_at;
        } else if (currentTicketsSort.col === 'folio' || currentTicketsSort.col === 'id') {
          valA = a.folio || a.id;
          valB = b.folio || b.id;
        } else if (currentTicketsSort.col === 'client' || currentTicketsSort.col === 'client_name') {
          valA = a.client_name;
          valB = b.client_name;
        } else if (currentTicketsSort.col === 'phone') {
          valA = a.phone;
          valB = b.phone;
        } else if (currentTicketsSort.col === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (currentTicketsSort.col === 'tech' || currentTicketsSort.col === 'assigned_technician_name') {
          valA = a.assigned_technician_name;
          valB = b.assigned_technician_name;
        }
        return universalCompare(valA, valB, currentTicketsSort.dir);
      });

      filterTicketsTable();
    }

    function clearTicketsTableFilters() {
      clearGlobalContextSearch();
      const selStatus = document.getElementById('filter-ticket-status');
      if (selStatus) selStatus.value = '';
      const selTech = document.getElementById('filter-ticket-tech');
      if (selTech) selTech.value = '';
      const selSort = document.getElementById('filter-tickets-sort');
      if (selSort) selSort.value = 'created_at_desc';
      filterTicketsTable();
    }

    function renderKanbanBoard(tickets) {
      const cols = {
        'ABIERTO': document.getElementById('col-tickets-abierto'),
        'EN_PROCESO': document.getElementById('col-tickets-en-proceso'),
        'VISITA_TECNICA': document.getElementById('col-tickets-visita'),
        'RESUELTO': document.getElementById('col-tickets-resuelto'),
      };

      const counts = { 'ABIERTO': 0, 'EN_PROCESO': 0, 'VISITA_TECNICA': 0, 'RESUELTO': 0 };
      Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

      tickets.forEach(t => {
        const status = (t.status || 'ABIERTO').toUpperCase();
        const targetCol = cols[status] || cols['ABIERTO'];
        if (!targetCol) return;
        counts[status] = (counts[status] || 0) + 1;

        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.onclick = () => openTicketDetailModal(t);

        card.innerHTML = \`
          <div class="ticket-card-top">
            <span class="ticket-folio">\${t.folio}</span>
            <span class="badge badge-info">\${t.phone}</span>
          </div>
          <div class="ticket-client">\${escapeHtml(t.client_name || 'Cliente')}</div>
          <div class="ticket-issue">\${escapeHtml(t.issue_summary || 'Sin descripción')}</div>
          <div class="ticket-footer">
            <span>\${t.assigned_technician_name ? '🔧 ' + escapeHtml(t.assigned_technician_name) : 'Sin asignar'}</span>
            <span>\${formatShortTime(t.created_at)}</span>
          </div>
        \`;

        targetCol.appendChild(card);
      });

      const bAbierto = document.getElementById('badge-count-abierto');
      if (bAbierto) bAbierto.innerText = counts['ABIERTO'] || 0;
      const bProceso = document.getElementById('badge-count-proceso');
      if (bProceso) bProceso.innerText = counts['EN_PROCESO'] || 0;
      const bVisita = document.getElementById('badge-count-visita');
      if (bVisita) bVisita.innerText = counts['VISITA_TECNICA'] || 0;
      const bResuelto = document.getElementById('badge-count-resuelto');
      if (bResuelto) bResuelto.innerText = counts['RESUELTO'] || 0;
    }

    function openTicketDetailModal(t) {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 16px; font-weight: 700; color: var(--accent-cyan);">Folio \${t.folio}</h4>
            <span class="badge badge-warning">\${t.status}</span>
          </div>
          <p><strong>Cliente:</strong> \${escapeHtml(t.client_name || 'Desconocido')} (\${t.phone})</p>
          <p><strong>ONU ID / SN:</strong> \${escapeHtml(t.onu_id || 'N/A')}</p>
          <p><strong>Diagnóstico / Falla:</strong> \${escapeHtml(t.issue_summary || '')}</p>
          \${t.checks_performed ? \`<p><strong>Pruebas:</strong> \${escapeHtml(t.checks_performed)}</p>\` : ''}
          <div class="form-group" style="margin-top: 10px;">
            <label class="form-label">Cambiar Estado</label>
            <select id="modal-ticket-status-select" class="form-control">
              <option value="ABIERTO" \${t.status === 'ABIERTO' ? 'selected' : ''}>ABIERTO</option>
              <option value="EN_PROCESO" \${t.status === 'EN_PROCESO' ? 'selected' : ''}>EN PROCESO</option>
              <option value="VISITA_TECNICA" \${t.status === 'VISITA_TECNICA' ? 'selected' : ''}>VISITA TÉCNICA</option>
              <option value="RESUELTO" \${t.status === 'RESUELTO' ? 'selected' : ''}>RESUELTO</option>
              <option value="CANCELADO" \${t.status === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Asignar Técnico</label>
            <input type="text" id="modal-ticket-tech-input" class="form-control" value="\${escapeHtml(t.assigned_technician_name || '')}" placeholder="Nombre del técnico responsable">
          </div>
          <div class="form-group">
            <label class="form-label">Notas de Resolución</label>
            <textarea id="modal-ticket-notes" class="form-control" rows="2" placeholder="Detalle de solución...">\${escapeHtml(t.resolution_notes || '')}</textarea>
          </div>
          \${state.user?.role === 'superadmin' ? \`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--card-border);">
              <span style="font-size: 11.5px; color: var(--text-dim);">Zona Superadmin</span>
              <button type="button" class="btn btn-danger btn-sm" onclick="confirmDeleteSingleTicket('\${t.folio}')">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Eliminar Ticket</span>
              </button>
            </div>
          \` : ''}
        </div>
      \`;

      openModal(\`Detalle del Ticket \${t.folio}\`, content, async () => {

        const newStatus = document.getElementById('modal-ticket-status-select').value;
        const newTech = document.getElementById('modal-ticket-tech-input').value.trim();
        const notes = document.getElementById('modal-ticket-notes').value.trim();

        if (newTech && newTech !== t.assigned_technician_name) {
          await apiFetch(\`/api/tickets/\${t.folio}/assign\`, {
            method: 'POST',
            body: JSON.stringify({ technicianName: newTech }),
          });
        }

        const res = await apiFetch(\`/api/tickets/\${t.folio}/status\`, {
          method: 'POST',
          body: JSON.stringify({ status: newStatus, notes }),
        });

        if (res.success) {
          showToast('Ticket Actualizado', \`Folio \${t.folio} guardado correctamente.\`, 'success');
          loadTicketsData();
        } else {
          showToast('Error', res.error, 'error');
        }
      }, 'Guardar Cambios');
    }

    // IPAM Module
    async function loadIpamData() {
      try {
        const [poolsRes, unconfRes] = await Promise.all([
          apiFetch('/api/ipam/pools'),
          apiFetch('/api/smartolt/unconfigured'),
        ]);

        const grid = document.getElementById('ipam-pools-grid');
        if (poolsRes.pools && poolsRes.pools.length > 0) {
          grid.innerHTML = poolsRes.pools.map(p => {
            const used = p.usedCount ?? p.used ?? 0;
            const total = p.totalUsable ?? p.total ?? 252;
            const free = p.availableCount ?? p.free ?? Math.max(0, total - used);
            const pct = p.usagePercent ?? (total > 0 ? Math.round((used / total) * 100) : 0);
            const subnet = p.segment ?? p.subnet ?? p.name ?? '';
            const gateway = p.gateway || '';
            const olt = p.oltName || 'OLT';
            const isActive = p.isActive !== false;
            const badgeClass = pct > 85 ? 'badge-danger' : (pct > 60 ? 'badge-warning' : 'badge-success');

            return \`
              <div class="glass-card" style="background: rgba(0,0,0,0.35); border: 1px solid \${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(239, 68, 68, 0.3)'}; display: flex; flex-direction: column; justify-content: space-between; \${isActive ? '' : 'opacity: 0.88;'}">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="font-weight: 700; font-size: 15px; color: \${isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'};">VLAN \${escapeHtml(p.vlan)}</div>
                      <div style="font-size: 12px; color: var(--text-muted);">\${escapeHtml(p.name || subnet)}</div>
                    </div>
                    <span class="badge \${badgeClass}">\${pct}% Ocupado</span>
                  </div>

                  <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); margin-bottom: 10px; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: var(--radius-sm);">
                    <div>🌐 <strong>Subred:</strong> \${escapeHtml(subnet)}</div>
                    <div>🚪 <strong>Gateway:</strong> \${escapeHtml(gateway || '172.19.x.254')}</div>
                    <div>📡 <strong>OLT:</strong> \${escapeHtml(olt)}</div>
                  </div>

                  <!-- Switch de Asignación por el Bot -->
                  <div style="display: flex; justify-content: space-between; align-items: center; background: \${isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1px solid \${isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}; padding: 7px 10px; border-radius: var(--radius-sm); margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 7px;">
                      <span style="font-size: 13px;">\${isActive ? '🤖' : '⛔'}</span>
                      <div>
                        <div style="font-size: 11.5px; font-weight: 700; color: \${isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                          \${isActive ? 'Bot Habilitado' : 'Ignorado por Bot'}
                        </div>
                        <div style="font-size: 10px; color: var(--text-dim);">
                          \${isActive ? 'Asigna IPs automáticamente' : 'Pausado para el bot'}
                        </div>
                      </div>
                    </div>
                    <label class="switch" title="\${isActive ? 'Desactivar para que el bot ignore esta VLAN' : 'Activar para que el bot use esta VLAN'}">
                      <input type="checkbox" \${isActive ? 'checked' : ''} onchange="togglePoolBotActive('\${escapeHtml(p.vlan)}', this.checked)">
                      <span class="slider"></span>
                    </label>
                  </div>

                  <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                    <div style="background: \${isActive ? 'linear-gradient(90deg, var(--accent-cyan), var(--primary))' : '#6b7280'}; width: \${Math.min(100, pct)}%; height: 100%;"></div>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 12px;">
                    <span>Usadas: <strong style="color: var(--text-main);">\${used}</strong></span>
                    <span>Libres: <strong style="color: var(--accent-green);">\${free}</strong></span>
                    <span>Total: <strong>\${total}</strong></span>
                  </div>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                  <button class="btn btn-secondary btn-sm" style="width: 100%; font-size: 11.5px; padding: 5px 8px;" onclick="viewAvailableIps('\${p.vlan}')" title="Ver IPs libres disponibles para asignar">
                    👁️ Ver IPs Disponibles
                  </button>
                </div>
              </div>
            \`;
          }).join('');
        } else {
          grid.innerHTML = \`
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-dim);">
              No hay pools registrados. Haz clic en <strong>🔍 Auto-Detectar Subredes</strong> o sincroniza SmartOLT.
            </div>
          \`;
        }

        state.unconfiguredOnus = unconfRes.unconfigured || [];
        populateIpamUnconfiguredFilters();
        filterUnconfiguredOnus();
      } catch (err) {
        console.error('Error loading IPAM:', err);
      }
    }

    function populateIpamUnconfiguredFilters() {
      const selOlt = document.getElementById('filter-pon-olt');
      const selModel = document.getElementById('filter-pon-model');
      if (selOlt) {
        const currentOlt = selOlt.value;
        const oltSet = new Set();
        (state.unconfiguredOnus || []).forEach(o => {
          const name = (o.olt_name || ('OLT ' + (o.olt_id || '3'))).trim();
          if (name) oltSet.add(name);
        });
        const olts = Array.from(oltSet).sort();
        selOlt.innerHTML = '<option value="">📡 Todas las OLTs</option>' +
          olts.map(olt => '<option value="' + escapeHtml(olt) + '">' + escapeHtml(olt) + '</option>').join('');
        if (currentOlt && olts.includes(currentOlt)) selOlt.value = currentOlt;
      }
      if (selModel) {
        const currentModel = selModel.value;
        const modelSet = new Set();
        (state.unconfiguredOnus || []).forEach(o => {
          const m = (o.model || o.onu_type_name || o.onu_type || 'ONT').trim();
          if (m) modelSet.add(m);
        });
        const models = Array.from(modelSet).sort();
        selModel.innerHTML = '<option value="">📠 Todos los modelos</option>' +
          models.map(m => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');
        if (currentModel && models.includes(currentModel)) selModel.value = currentModel;
      }
    }

    function renderUnconfiguredOnusTable(onus) {
      const unconfTable = document.getElementById('table-unconfigured-onus-body');
      if (!unconfTable) return;
      if (!onus || onus.length === 0) {
        unconfTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 20px;">No se encontraron ONUs sin autorizar con los filtros aplicados.</td></tr>';
        return;
      }
      unconfTable.innerHTML = onus.map(o => \`
        <tr>
          <td>\${escapeHtml(o.olt_name || ('OLT ' + (o.olt_id || '3')))}</td>
          <td style="font-family: var(--font-mono);">Board \${o.board ?? '--'} / Port \${o.port ?? o.pon_port ?? '--'}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">\${escapeHtml(o.sn)}</td>
          <td>\${escapeHtml(o.model || o.onu_type_name || o.onu_type || 'ONT')}</td>
          <td style="text-align: right;">
            <button class="btn btn-primary btn-xs" onclick="openAuthorizeOnuModal('\${escapeHtml(o.sn)}', '\${o.olt_id || 3}')">
              ⚡ Aprovisionar
            </button>
          </td>
        </tr>
      \`).join('');
    }

    function filterUnconfiguredOnus() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fOlt = (document.getElementById('filter-pon-olt')?.value || '').toLowerCase().trim();
      const fModel = (document.getElementById('filter-pon-model')?.value || '').toLowerCase().trim();

      const filtered = (state.unconfiguredOnus || []).filter(o => {
        const oltStr = String(o.olt_name || ('OLT ' + (o.olt_id || '3'))).toLowerCase();
        const modelStr = String(o.model || o.onu_type_name || o.onu_type || 'ONT').toLowerCase();
        const snStr = String(o.sn || '').toLowerCase();
        const boardPortStr = ('board ' + (o.board || '') + ' port ' + (o.port || o.pon_port || '') + ' ' + (o.board || '') + '/' + (o.port || o.pon_port || '') + ' pon ' + (o.port || '')).toLowerCase();

        if (fOlt && !oltStr.includes(fOlt) && String(o.olt_id || '') !== fOlt) return false;
        if (fModel && !modelStr.includes(fModel)) return false;

        if (q) {
          const isHuawei = snStr.startsWith('hwtc') || modelStr.includes('hg') || modelStr.includes('eg');
          const isZte = snStr.startsWith('zte');
          const brandTokens = (isHuawei ? 'huawei ' : '') + (isZte ? 'zte ' : '');
          if (!matchesFuzzyTokens(q, snStr, oltStr, boardPortStr, modelStr, brandTokens)) return false;
        }
        return true;
      });

      renderUnconfiguredOnusTable(filtered);
    }

    let currentUnconfSort = { col: 'sn', dir: 'asc' };
    function sortUnconfiguredOnusBy(col) {
      currentUnconfSort = parseSortParam(col, currentUnconfSort);

      state.unconfiguredOnus.sort((a, b) => {
        let valA = a[currentUnconfSort.col];
        let valB = b[currentUnconfSort.col];
        if (currentUnconfSort.col === 'sn') {
          valA = a.sn;
          valB = b.sn;
        } else if (currentUnconfSort.col === 'olt') {
          valA = a.olt_name || a.olt_id;
          valB = b.olt_name || b.olt_id;
        } else if (currentUnconfSort.col === 'port' || currentUnconfSort.col === 'board_port') {
          valA = (Number(a.board) || 0) * 100 + (Number(a.port ?? a.pon_port) || 0);
          valB = (Number(b.board) || 0) * 100 + (Number(b.port ?? b.pon_port) || 0);
        } else if (currentUnconfSort.col === 'model') {
          valA = a.model || a.onu_type_name || a.onu_type;
          valB = b.model || b.onu_type_name || b.onu_type;
        }
        return universalCompare(valA, valB, currentUnconfSort.dir);
      });

      filterUnconfiguredOnus();
    }

    function clearUnconfiguredOnusFilters() {
      clearGlobalContextSearch();
      const selOlt = document.getElementById('filter-pon-olt');
      if (selOlt) selOlt.value = '';
      const selModel = document.getElementById('filter-pon-model');
      if (selModel) selModel.value = '';
      const selSort = document.getElementById('filter-ipam-unconf-sort');
      if (selSort) selSort.value = 'sn_asc';
      filterUnconfiguredOnus();
    }

    async function togglePoolBotActive(vlan, isActive) {
      try {
        const res = await apiFetch(\`/api/ipam/pools/\${encodeURIComponent(vlan)}/toggle\`, {
          method: 'POST',
          body: JSON.stringify({ active: isActive }),
        });
        if (res.success) {
          showToast(
            isActive ? 'Pool Habilitado' : 'Pool Ignorado por Bot',
            isActive ? \`El bot ahora usará la VLAN \${vlan} para asignar IPs.\` : \`El bot ignorará la VLAN \${vlan} (no asignará IPs de este pool).\`,
            isActive ? 'success' : 'warning',
            3000
          );
          loadIpamData();
        } else {
          showToast('Error', res.error || 'No se pudo cambiar el estado del pool.', 'error');
          loadIpamData();
        }
      } catch (err) {
        showToast('Error', 'Fallo de conexión al alternar el pool.', 'error');
        loadIpamData();
      }
    }

    function openCreateVlanModal(existingData = null) {
      const isEdit = Boolean(existingData && existingData.vlan);
      const title = isEdit ? \`Editar Pool VLAN \${existingData.vlan}\` : '➕ Agregar Nueva VLAN / Pool';
      
      const vlanVal = existingData?.vlan || '';
      const nameVal = existingData?.name || '';
      const segVal = existingData?.segment || '172.19.12.0/24';
      const gwVal = existingData?.gateway || '172.19.12.254';
      const oltVal = existingData?.oltName || 'OLT5800-Actopan';

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label class="form-label">ID de VLAN (Número)</label>
            <input type="text" id="vlan-form-id" class="form-control" placeholder="Ej: 620 o 700" value="\${escapeHtml(vlanVal)}" \${isEdit ? 'readonly' : ''} required>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre Descriptivo</label>
            <input type="text" id="vlan-form-name" class="form-control" placeholder="Ej: 620 - Internet Actopan Norte" value="\${escapeHtml(nameVal)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Segmento de Red CIDR (/24)</label>
            <input type="text" id="vlan-form-segment" class="form-control" placeholder="Ej: 172.19.12.0/24" value="\${escapeHtml(segVal)}" oninput="autoFillGateway(this.value)" required>
          </div>
          <div class="form-group">
            <label class="form-label">Gateway por Defecto</label>
            <input type="text" id="vlan-form-gateway" class="form-control" placeholder="Ej: 172.19.12.254" value="\${escapeHtml(gwVal)}" required>
          </div>
          <div class="form-group">
            <label class="form-label">OLT Asignada</label>
            <select id="vlan-form-olt" class="form-control">
              <option value="3" \${oltVal.includes('Actopan') ? 'selected' : ''}>OLT5800-Actopan (ID 3)</option>
              <option value="2" \${oltVal.includes('SanAgustin') ? 'selected' : ''}>OLT-SanAgustin (ID 2)</option>
            </select>
          </div>
        </div>
      \`;

      openModal(title, content, async () => {
        const vlan = document.getElementById('vlan-form-id').value.trim();
        const name = document.getElementById('vlan-form-name').value.trim();
        const segment = document.getElementById('vlan-form-segment').value.trim();
        const gateway = document.getElementById('vlan-form-gateway').value.trim();
        const oltSelect = document.getElementById('vlan-form-olt');
        const oltId = oltSelect.value;
        const oltName = oltSelect.options[oltSelect.selectedIndex].text.split('(')[0].trim();

        if (!vlan || !segment || !gateway) {
          showToast('Campos requeridos', 'VLAN, Segmento y Gateway son obligatorios', 'warning');
          return false;
        }

        const res = await apiFetch('/api/ipam/pools', {
          method: 'POST',
          body: JSON.stringify({ vlan, name: name || \`\${vlan} - Internet\`, segment, gateway, oltId, oltName }),
        });

        if (res.success) {
          showToast('VLAN Guardada', res.message || 'Pool VLAN configurado exitosamente.', 'success');
          loadIpamData();
        } else {
          showToast('Error', res.error || 'No se pudo guardar la VLAN', 'error');
        }
      }, isEdit ? 'Guardar Cambios' : 'Crear Pool VLAN');
    }

    function autoFillGateway(segmentStr) {
      const clean = (segmentStr || '').trim();
      if (clean.includes('.')) {
        const ipPart = clean.split('/')[0].trim();
        const parts = ipPart.split('.');
        if (parts.length >= 3) {
          const gwInput = document.getElementById('vlan-form-gateway');
          if (gwInput && (!gwInput.value || gwInput.value.endsWith('.254'))) {
            gwInput.value = parts[0] + '.' + parts[1] + '.' + parts[2] + '.254';
          }
        }
      }
    }

    function openEditVlanModal(vlan, name, segment, gateway, oltName) {
      openCreateVlanModal({ vlan, name, segment, gateway, oltName });
    }

    async function deleteVlanPool(vlan) {
      showConfirmDialog(
        \`Eliminar Pool VLAN \${vlan}\`,
        \`¿Estás seguro de que deseas eliminar el pool de la VLAN \${vlan}? Las ONUs existentes no se borrarán, pero dejará de mostrarse en el IPAM.\`,
        async () => {
          const res = await apiFetch(\`/api/ipam/pools/\${encodeURIComponent(vlan)}\`, { method: 'DELETE' });
          if (res.success) {
            showToast('Pool Eliminado', \`VLAN \${vlan} eliminada del IPAM.\`, 'info');
            loadIpamData();
          } else {
            showToast('Error', res.error || 'No se pudo eliminar el pool', 'error');
          }
        }
      );
    }

    async function triggerAutoDiscoverVlans() {
      showToast('Escaneando Red', 'Buscando subredes y VLANs en la base de datos de ONUs...', 'info');
      try {
        const res = await apiFetch('/api/ipam/pools/auto-discover', { method: 'POST' });
        if (res.success) {
          showToast('Auto-Descubrimiento Listo', \`Se sincronizaron \${res.count || 0} pools y subredes en total.\`, 'success', 4000);
          loadIpamData();
        } else {
          showToast('Error', res.error || 'Error al auto-descubrir', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function viewAvailableIps(vlan) {
      try {
        const res = await apiFetch(\`/api/ipam/available?vlan=\${encodeURIComponent(vlan)}\`);
        const ips = res.available || [];
        
        let tableRows = '';
        if (ips.length > 0) {
          tableRows = ips.slice(0, 100).map(i => \`
            <tr>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">\${i.ip}</td>
              <td style="font-family: var(--font-mono);">\${i.gateway}</td>
              <td>\${i.segment}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('\${i.ip}'); showToast('Copiada', 'IP \${i.ip} copiada al portapapeles', 'info', 2000);">
                  📋 Copiar
                </button>
              </td>
            </tr>
          \`).join('');
        } else {
          tableRows = '<tr><td colspan="4" style="text-align: center; color: var(--accent-amber);">No hay IPs libres disponibles en este pool (100% Ocupado).</td></tr>';
        }

        const content = \`
          <div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
              Mostrando las primeras 100 IPs libres disponibles calculadas en tiempo real para <strong>VLAN \${vlan}</strong> (Total libres: \${ips.length}):
            </p>
            <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>IP Disponible</th>
                    <th>Gateway</th>
                    <th>Subred</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>\${tableRows}</tbody>
              </table>
            </div>
          </div>
        \`;

        openModal(\`IPs Disponibles - VLAN \${vlan}\`, content, null, 'Cerrar');
      } catch (err) {
        showToast('Error', 'No se pudieron cargar las IPs libres', 'error');
      }
    }

    function openAuthorizeOnuModal(sn, oltId) {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <p>Aprovisionar ONU Serial: <strong style="color: var(--accent-cyan);">\${sn}</strong></p>
          <div class="form-group">
            <label class="form-label">Nombre del Cliente</label>
            <input type="text" id="auth-onu-name" class="form-control" placeholder="Ej: Juan Perez" required>
          </div>
          <div class="form-group">
            <label class="form-label">VLAN de Servicio</label>
            <select id="auth-onu-vlan" class="form-control">
              <option value="99">VLAN 99 (10.99.0.0/24)</option>
              <option value="60">VLAN 60 (10.60.0.0/24)</option>
              <option value="100">VLAN 100</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">IP WAN Asignada</label>
            <input type="text" id="auth-onu-ip" class="form-control" placeholder="Ej: 10.99.0.45" required>
          </div>
        </div>
      \`;

      openModal('Aprovisionar Nueva ONU', content, async () => {
        const name = document.getElementById('auth-onu-name').value.trim();
        const vlan = document.getElementById('auth-onu-vlan').value;
        const ip = document.getElementById('auth-onu-ip').value.trim();

        if (!name || !ip) {
          showToast('Validación', 'Ingrese nombre e IP', 'warning');
          return false;
        }

        const res = await apiFetch('/api/smartolt/authorize', {
          method: 'POST',
          body: JSON.stringify({ sn, olt_id: oltId, name, vlan, ip_address: ip }),
        });

        if (res.success) {
          showToast('ONU Aprovisionada', 'ONU registrada exitosamente en SmartOLT.', 'success');
          loadIpamData();
        } else {
          showToast('Error', res.error || 'No se pudo aprovisionar', 'error');
        }
      }, 'Aprovisionar en SmartOLT');
    }

    // Audit Module
    async function loadAuditData() {
      const tbody = document.getElementById('table-audit-body');
      if (tbody) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="9" style="text-align: center; padding: 36px 20px;">
              <div class="spinner" style="margin-bottom: 10px;"></div>
              <div style="font-size: 13px; color: var(--text-dim);">Consultando datos y aplicando filtros...</div>
            </td>
          </tr>
        \`;
      }

      try {
        const params = new URLSearchParams({
          filter: state.audit.filter || 'all',
          search: state.audit.search || '',
          page: state.audit.page || 1,
          limit: state.audit.limit || 30,
        });

        const res = await apiFetch('/api/audit/ip-cross?' + params.toString());
        state.audit.total = res.total || 0;
        state.audit.items = res.items || [];

        const totalPages = Math.max(1, Math.ceil((res.total || 0) / state.audit.limit));
        const pInfo = document.getElementById('audit-pagination-info');
        if (pInfo) pInfo.innerText = \`Mostrando página \${state.audit.page} de \${totalPages} (\${res.total || 0} registros)\`;

        handleAuditColFilter();
      } catch (err) {
        console.error('Error loading audit:', err);
      }
    }

    function renderAuditTable(items) {
      const tbody = document.getElementById('table-audit-body');
      if (!tbody) return;
      if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No se encontraron registros coincidentes con los filtros.</td></tr>';
        return;
      }

      tbody.innerHTML = items.map(item => {
        let statusBadge = '<span class="badge badge-success">CORRECTO</span>';
        if (item.ip_status === 'MISMATCH') statusBadge = '<span class="badge badge-danger">DISCREPANCIA</span>';
        if (item.ip_status === 'ONLY_SMARTOLT') statusBadge = '<span class="badge badge-info">Solo SmartOLT</span>';
        if (item.ip_status === 'ONLY_WISPHUB') statusBadge = '<span class="badge badge-purple">Solo WispHub</span>';
        if (item.ip_status === 'NO_IP') statusBadge = '<span class="badge badge-warning">Sin IP</span>';

        let trBadge = '<span class="badge badge-success">ACTIVO</span>';
        if (item.tr069_status === 'OMCI') trBadge = '<span class="badge badge-warning">OMCI</span>';
        if (item.tr069_status === 'MISSING' || !item.tr069_status) trBadge = '<span class="badge badge-danger">FALTA</span>';

        let ipv6Badge = '<span class="badge badge-success">DUAL STACK</span>';
        if (item.ipv6_status === 'IPV4_ONLY') ipv6Badge = '<span class="badge badge-warning">SOLO IPv4</span>';
        if (item.ipv6_status === 'MISSING' || !item.ipv6_status) ipv6Badge = '<span class="badge badge-danger">FALTA</span>';

        let actionBtn = '<span style="font-size: 11px; color: var(--text-dim);">No en OLT</span>';
        if (item.smartolt_id) {
          const needsConfig = item.tr069_status !== 'ACTIVE' || item.ipv6_status !== 'DUAL_STACK';
          if (needsConfig) {
            const safeClient = (item.cliente || 'Cliente').replace(/'/g, "\\'");
            actionBtn = \`
              <button class="btn btn-primary btn-sm" onclick="applyTr069AndIpv6Config('\${item.smartolt_id}', '\${safeClient}')" title="Aprovisionar TR-069 + IPv6">
                ⚡ Aprovisionar
              </button>
            \`;
          } else {
            actionBtn = '<span class="badge badge-success" style="opacity: 0.85;">✓ Configurado</span>';
          }
        }

        return \`
          <tr>
            <td style="font-weight: 600;">\${escapeHtml(item.cliente || 'Desconocido')}</td>
            <td style="font-family: var(--font-mono); font-size: 11px;">\${escapeHtml(item.servicio || item.folio || '--')}</td>
            <td style="font-family: var(--font-mono); color: var(--accent-cyan);">\${item.smartolt_ip || '--'}</td>
            <td style="font-family: var(--font-mono); color: var(--accent-green);">\${item.wisphub_ip || '--'}</td>
            <td>\${statusBadge}</td>
            <td>\${trBadge}</td>
            <td>\${ipv6Badge}</td>
            <td>\${escapeHtml(item.wisphub_plan || '--')}</td>
            <td style="text-align: right;">\${actionBtn}</td>
          </tr>
        \`;
      }).join('');
    }

    function handleAuditColFilter() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fIpStatus = (document.getElementById('filter-audit-ip-status')?.value || '').toUpperCase().trim();
      const fTr = (document.getElementById('filter-audit-tr069')?.value || '').toUpperCase().trim();
      const fV6 = (document.getElementById('filter-audit-ipv6')?.value || '').toUpperCase().trim();

      const items = state.audit.items || [];
      const filtered = items.filter(it => {
        if (fIpStatus) {
          if (fIpStatus === 'MATCH' && it.ip_status !== 'MATCH' && it.ip_status !== 'OK') return false;
          if (fIpStatus === 'MISMATCH' && it.ip_status !== 'MISMATCH') return false;
        }
        if (fTr) {
          if (fTr === 'ACTIVE' && it.tr069_status !== 'ACTIVE') return false;
          if (fTr === 'INACTIVE' && it.tr069_status === 'ACTIVE') return false;
        }
        if (fV6) {
          if (fV6 === 'ACTIVE' && it.ipv6_status !== 'DUAL_STACK') return false;
          if (fV6 === 'INACTIVE' && it.ipv6_status === 'DUAL_STACK') return false;
        }
        if (!matchesFuzzyTokens(q, it.cliente, it.servicio, it.folio, it.smartolt_ip, it.wisphub_ip, it.wisphub_plan, it.ip_status)) return false;
        return true;
      });

      renderAuditTable(filtered);
    }

    let currentAuditSort = { col: 'cliente', dir: 'asc' };
    function sortAuditBy(col) {
      currentAuditSort = parseSortParam(col, currentAuditSort);

      state.audit.items.sort((a, b) => {
        let valA = a[currentAuditSort.col];
        let valB = b[currentAuditSort.col];
        if (currentAuditSort.col === 'cliente') {
          valA = a.cliente;
          valB = b.cliente;
        } else if (currentAuditSort.col === 'service' || currentAuditSort.col === 'servicio') {
          valA = a.servicio || a.folio;
          valB = b.servicio || b.folio;
        } else if (currentAuditSort.col === 'smartolt_ip') {
          valA = a.smartolt_ip;
          valB = b.smartolt_ip;
        } else if (currentAuditSort.col === 'wisphub_ip') {
          valA = a.wisphub_ip;
          valB = b.wisphub_ip;
        } else if (currentAuditSort.col === 'ip_status') {
          valA = a.ip_status;
          valB = b.ip_status;
        } else if (currentAuditSort.col === 'tr069' || currentAuditSort.col === 'tr069_status') {
          valA = a.tr069_status;
          valB = b.tr069_status;
        } else if (currentAuditSort.col === 'ipv6' || currentAuditSort.col === 'ipv6_status') {
          valA = a.ipv6_status;
          valB = b.ipv6_status;
        }
        return universalCompare(valA, valB, currentAuditSort.dir);
      });

      handleAuditColFilter();
    }

    function clearAuditColFilters() {
      clearGlobalContextSearch();
      const selIp = document.getElementById('filter-audit-ip-status');
      if (selIp) selIp.value = '';
      const selTr = document.getElementById('filter-audit-tr069');
      if (selTr) selTr.value = '';
      const selV6 = document.getElementById('filter-audit-ipv6');
      if (selV6) selV6.value = '';
      const selSort = document.getElementById('filter-audit-sort');
      if (selSort) selSort.value = 'cliente_asc';
      renderAuditTable(state.audit.items || []);
    }

    async function applyTr069AndIpv6Config(onuId, clientName) {
      showConfirmDialog(
        'Aprovisionar TR-069 + IPv6',
        \`¿Deseas configurar automáticamente el perfil TR-069 de SmartOLT (VLAN de gestión) y WAN IPv4/IPv6 Dual Stack para <strong>\${clientName}</strong>?\`,
        async () => {
          showToast('Configurando', \`Enviando configuración a SmartOLT para \${clientName}...\`, 'info', 4000);
          try {
            const res = await apiFetch(\`/api/smartolt/configure-tr069/\${encodeURIComponent(onuId)}\`, {
              method: 'POST',
            });
            if (res.success) {
              showToast('Éxito', res.message || 'TR-069 e IPv6 Dual Stack configurados exitosamente.', 'success', 5000);
              if (state.currentView === 'audit') loadAuditData();
              if (state.currentView === 'provisioning') loadProvisioningData();
            } else {
              showToast('Error', res.message || res.error || 'No se pudo aplicar la configuración.', 'error', 5000);
            }
          } catch (err) {
            showToast('Error', err.message || 'Fallo de conexión', 'error');
          }
        },
        false
      );
    }

    function setAuditFilter(f, btnElement) {
      state.audit.filter = f;
      state.audit.page = 1;
      document.querySelectorAll('#audit-filter-buttons button').forEach(b => b.classList.remove('active'));
      if (btnElement) {
        btnElement.classList.add('active');
      }
      loadAuditData();
    }

    let auditSearchDebounce = null;
    function handleAuditSearch(q) {
      clearTimeout(auditSearchDebounce);
      auditSearchDebounce = setTimeout(() => {
        state.audit.search = (q || '').trim();
        state.audit.page = 1;
        loadAuditData();
      }, 250);
    }

    function changeAuditPage(dir) {
      const maxPage = Math.ceil(state.audit.total / state.audit.limit) || 1;
      const newPage = state.audit.page + dir;
      if (newPage >= 1 && newPage <= maxPage) {
        state.audit.page = newPage;
        loadAuditData();
      }
    }

    // Provisioning Dedicated Module
    async function loadProvisioningData() {
      const tbody = document.getElementById('table-prov-body');
      if (tbody) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px 20px;">
              <div class="spinner" style="margin-bottom: 10px;"></div>
              <div style="font-size: 13px; color: var(--text-dim);">Consultando estado de aprovisionamiento...</div>
            </td>
          </tr>
        \`;
      }

      try {
        const params = new URLSearchParams({
          filter: state.provisioning.filter || 'pending',
          search: state.provisioning.search || '',
          page: state.provisioning.page || 1,
          limit: state.provisioning.limit || 30,
        });

        const res = await apiFetch('/api/audit/ip-cross?' + params.toString());
        state.provisioning.total = res.total || 0;
        state.provisioning.items = res.items || [];

        // Update metric cards
        const sum = res.summary || {};
        const missingTr = sum.missingTr069 || 0;
        const missingV6 = sum.missingIpv6 || 0;
        const totalOlt = sum.totalSmartOlt || 0;
        const readyCount = Math.max(0, totalOlt - Math.max(missingTr, missingV6));

        document.getElementById('metric-prov-total').innerText = Number(totalOlt).toLocaleString();
        document.getElementById('metric-prov-tr069').innerText = Number(missingTr).toLocaleString();
        document.getElementById('metric-prov-ipv6').innerText = Number(missingV6).toLocaleString();
        document.getElementById('metric-prov-ready').innerText = Number(readyCount).toLocaleString();

        const bProv = document.getElementById('badge-prov-pending');
        const pendingTotal = Math.max(missingTr, missingV6);
        if (bProv) {
          if (pendingTotal > 0) {
            bProv.innerText = pendingTotal;
            bProv.style.display = 'inline-block';
          } else {
            bProv.style.display = 'none';
          }
        }

        const totalPages = Math.max(1, Math.ceil((res.total || 0) / state.provisioning.limit));
        const pInfo = document.getElementById('prov-pagination-info');
        if (pInfo) pInfo.innerText = \`Mostrando página \${state.provisioning.page} de \${totalPages} (\${res.total || 0} registros)\`;

        handleProvColFilter();
      } catch (err) {
        console.error('Error loading provisioning:', err);
      }
    }

    function renderProvisioningTable(items) {
      const tbody = document.getElementById('table-prov-body');
      if (!tbody) return;
      if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No hay ONUs que requieran aprovisionamiento con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = items.map(item => {
        let trBadge = '<span class="badge badge-success">ACTIVO</span>';
        if (item.tr069_status === 'OMCI') trBadge = '<span class="badge badge-warning">OMCI</span>';
        if (item.tr069_status === 'MISSING' || !item.tr069_status) trBadge = '<span class="badge badge-danger">FALTA</span>';

        let ipv6Badge = '<span class="badge badge-success">DUAL STACK</span>';
        if (item.ipv6_status === 'IPV4_ONLY') ipv6Badge = '<span class="badge badge-warning">SOLO IPv4</span>';
        if (item.ipv6_status === 'MISSING' || !item.ipv6_status) ipv6Badge = '<span class="badge badge-danger">FALTA</span>';

        let actionBtn = '<span class="badge badge-success" style="opacity: 0.85;">✓ Configurado</span>';
        const needsConfig = item.tr069_status !== 'ACTIVE' || item.ipv6_status !== 'DUAL_STACK';
        if (item.smartolt_id && needsConfig) {
          const safeClient = (item.cliente || 'Cliente').replace(/'/g, "\\'");
          actionBtn = \`
            <button class="btn btn-primary btn-sm" onclick="applyTr069AndIpv6Config('\${item.smartolt_id}', '\${safeClient}')">
              ⚡ Aprovisionar TR069+IPv6
            </button>
          \`;
        } else if (!item.smartolt_id) {
          actionBtn = '<span style="font-size: 11px; color: var(--text-dim);">No en OLT</span>';
        }

        return \`
          <tr>
            <td style="font-weight: 600;">\${escapeHtml(item.cliente || 'Desconocido')}</td>
            <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan); font-size: 12px;">\${escapeHtml(item.sn_smartolt || item.sn_wisphub || '--')}</td>
            <td style="font-family: var(--font-mono); color: var(--accent-green);">\${item.smartolt_ip || item.wisphub_ip || '--'}</td>
            <td><span class="badge badge-info">\${escapeHtml(item.zona_o_router || 'Actopan')}</span></td>
            <td>\${trBadge}</td>
            <td>\${ipv6Badge}</td>
            <td style="text-align: right;">\${actionBtn}</td>
          </tr>
        \`;
      }).join('');
    }

    function handleProvColFilter() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fTr = (document.getElementById('filter-prov-tr069')?.value || '').toUpperCase().trim();
      const fV6 = (document.getElementById('filter-prov-ipv6')?.value || '').toUpperCase().trim();

      const items = state.provisioning.items || [];
      const filtered = items.filter(it => {
        if (fTr) {
          if (fTr === 'ACTIVE' && it.tr069_status !== 'ACTIVE') return false;
          if (fTr === 'INACTIVE' && it.tr069_status === 'ACTIVE') return false;
        }
        if (fV6) {
          if (fV6 === 'ACTIVE' && it.ipv6_status !== 'DUAL_STACK') return false;
          if (fV6 === 'INACTIVE' && it.ipv6_status === 'DUAL_STACK') return false;
        }
        if (!matchesFuzzyTokens(q, it.cliente, it.sn_smartolt, it.sn_wisphub, it.smartolt_ip, it.wisphub_ip, it.zona_o_router)) return false;
        return true;
      });

      renderProvisioningTable(filtered);
    }

    let currentProvSort = { col: 'cliente', dir: 'asc' };
    function sortProvisioningBy(col) {
      currentProvSort = parseSortParam(col, currentProvSort);

      state.provisioning.items.sort((a, b) => {
        let valA = a[currentProvSort.col];
        let valB = b[currentProvSort.col];
        if (currentProvSort.col === 'cliente') {
          valA = a.cliente;
          valB = b.cliente;
        } else if (currentProvSort.col === 'sn') {
          valA = a.sn_smartolt || a.sn_wisphub;
          valB = b.sn_smartolt || b.sn_wisphub;
        } else if (currentProvSort.col === 'ip') {
          valA = a.smartolt_ip || a.wisphub_ip;
          valB = b.smartolt_ip || b.wisphub_ip;
        } else if (currentProvSort.col === 'zone') {
          valA = a.zona_o_router;
          valB = b.zona_o_router;
        } else if (currentProvSort.col === 'tr069') {
          valA = a.tr069_status;
          valB = b.tr069_status;
        } else if (currentProvSort.col === 'ipv6') {
          valA = a.ipv6_status;
          valB = b.ipv6_status;
        }
        return universalCompare(valA, valB, currentProvSort.dir);
      });

      handleProvColFilter();
    }

    function clearProvColFilters() {
      clearGlobalContextSearch();
      const selTr = document.getElementById('filter-prov-tr069');
      if (selTr) selTr.value = '';
      const selV6 = document.getElementById('filter-prov-ipv6');
      if (selV6) selV6.value = '';
      const selSort = document.getElementById('filter-prov-sort');
      if (selSort) selSort.value = 'cliente_asc';
      renderProvisioningTable(state.provisioning.items || []);
    }

    function setProvFilter(f, btnElement) {
      state.provisioning.filter = f;
      state.provisioning.page = 1;
      document.querySelectorAll('#prov-filter-buttons button').forEach(b => b.classList.remove('active'));
      if (btnElement) {
        btnElement.classList.add('active');
      }
      loadProvisioningData();
    }

    let provSearchDebounce = null;
    function handleProvSearch(q) {
      clearTimeout(provSearchDebounce);
      provSearchDebounce = setTimeout(() => {
        state.provisioning.search = (q || '').trim();
        state.provisioning.page = 1;
        loadProvisioningData();
      }, 250);
    }

    function changeProvPage(dir) {
      const maxPage = Math.ceil(state.provisioning.total / state.provisioning.limit) || 1;
      const newPage = state.provisioning.page + dir;
      if (newPage >= 1 && newPage <= maxPage) {
        state.provisioning.page = newPage;
        loadProvisioningData();
      }
    }

    // Technicians Module
    async function loadTechniciansData() {
      try {
        const res = await apiFetch('/api/technicians');
        state.technicians = res.technicians || [];
        filterTechniciansTable();
      } catch (err) {
        console.error('Error loading technicians:', err);
      }
    }

    function renderTechniciansTable(techs) {
      const tbody = document.getElementById('table-technicians-body');
      if (!tbody) return;
      if (!techs || techs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">No se encontraron técnicos con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = techs.map(t => \`
        <tr>
          <td style="font-weight: 600;">\${escapeHtml(t.name)}</td>
          <td style="font-family: var(--font-mono);">\${t.phone}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-amber);">\${t.pin}</td>
          <td><span class="badge badge-info">\${escapeHtml(t.role || 'Tecnico')}</span></td>
          <td>
            <span class="badge \${t.is_active === 1 ? 'badge-success' : 'badge-danger'}">
              \${t.is_active === 1 ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="toggleTechnicianActive(\${t.id})">
                \${t.is_active === 1 ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteTechnicianItem(\${t.id}, '\${escapeHtml(t.name)}')">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      \`).join('');
    }

    function filterTechniciansTable() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fRole = (document.getElementById('filter-tech-role')?.value || '').toLowerCase().trim();
      const fStatus = (document.getElementById('filter-tech-status')?.value || '').toUpperCase().trim();

      const techs = state.technicians || [];
      const filtered = techs.filter(t => {
        if (fRole && !String(t.role || '').toLowerCase().includes(fRole)) return false;
        if (fStatus) {
          if (fStatus === 'ACTIVO' && t.is_active !== 1) return false;
          if (fStatus === 'INACTIVO' && t.is_active === 1) return false;
        }
        if (!matchesFuzzyTokens(q, t.name, t.phone, t.pin, t.role)) return false;
        return true;
      });

      renderTechniciansTable(filtered);
    }

    let currentTechSort = { col: 'name', dir: 'asc' };
    function sortTechniciansBy(col) {
      currentTechSort = parseSortParam(col, currentTechSort);

      state.technicians.sort((a, b) => {
        let valA = a[currentTechSort.col];
        let valB = b[currentTechSort.col];
        if (currentTechSort.col === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (currentTechSort.col === 'phone') {
          valA = a.phone;
          valB = b.phone;
        } else if (currentTechSort.col === 'pin') {
          valA = a.pin;
          valB = b.pin;
        } else if (currentTechSort.col === 'role') {
          valA = a.role;
          valB = b.role;
        } else if (currentTechSort.col === 'status') {
          valA = a.is_active;
          valB = b.is_active;
        }
        return universalCompare(valA, valB, currentTechSort.dir);
      });

      filterTechniciansTable();
    }

    function clearTechniciansFilters() {
      clearGlobalContextSearch();
      const selRole = document.getElementById('filter-tech-role');
      if (selRole) selRole.value = '';
      const selStatus = document.getElementById('filter-tech-status');
      if (selStatus) selStatus.value = '';
      const selSort = document.getElementById('filter-tech-sort');
      if (selSort) selSort.value = 'name_asc';
      renderTechniciansTable(state.technicians || []);
    }

    function openNewTechnicianModal() {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Nombre del Técnico</label>
            <input type="text" id="tech-new-name" class="form-control" placeholder="Ej: Carlos Ramírez" required>
          </div>
          <div class="form-group">
            <label class="form-label">Número de WhatsApp (10 o 12 dígitos)</label>
            <input type="text" id="tech-new-phone" class="form-control" placeholder="521..." required>
          </div>
          <div class="form-group">
            <label class="form-label">PIN de Autorización (5 Dígitos)</label>
            <input type="text" id="tech-new-pin" class="form-control" maxlength="5" placeholder="12345" required>
          </div>
          <div class="form-group">
            <label class="form-label">Rol</label>
            <select id="tech-new-role" class="form-control">
              <option value="instalador">Instalador de Campo</option>
              <option value="soporte">Soporte Nivel 2</option>
              <option value="supervisor">Supervisor de Red</option>
            </select>
          </div>
        </div>
      \`;

      openModal('Registrar Nuevo Técnico', content, async () => {
        const name = document.getElementById('tech-new-name').value.trim();
        const phone = document.getElementById('tech-new-phone').value.trim();
        const pin = document.getElementById('tech-new-pin').value.trim();
        const role = document.getElementById('tech-new-role').value;

        if (!name || !phone || !pin || pin.length !== 5) {
          showToast('Validación', 'Complete todos los campos. El PIN debe tener 5 dígitos.', 'warning');
          return false;
        }

        const res = await apiFetch('/api/technicians', {
          method: 'POST',
          body: JSON.stringify({ name, phone, pin, role }),
        });

        if (res.success) {
          showToast('Técnico Creado', \`\${name} ha sido autorizado con PIN \${pin}.\`, 'success');
          loadTechniciansData();
        } else {
          showToast('Error', res.error, 'error');
        }
      }, 'Crear Técnico');
    }

    async function toggleTechnicianActive(id) {
      try {
        const res = await apiFetch(\`/api/technicians/\${id}/toggle\`, { method: 'POST' });
        if (res.success) {
          showToast('Estado Modificado', res.message, 'info');
          loadTechniciansData();
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    function deleteTechnicianItem(id, name) {
      showConfirmDialog('Eliminar Técnico', \`¿Deseas eliminar el acceso a \${name}?\`, async () => {
        const res = await apiFetch(\`/api/technicians/\${id}\`, { method: 'DELETE' });
        if (res.success) {
          showToast('Eliminado', 'Técnico eliminado.', 'success');
          loadTechniciansData();
        }
      });
    }

    // Settings Module
    async function loadSettingsData() {
      try {
        const res = await apiFetch('/api/settings');
        if (res.settings) {
          const s = res.settings;
          const keyMap = {
            appUrl: 'setting-APP_URL',
            APP_URL: 'setting-APP_URL',
            evolutionUrl: 'setting-EVOLUTION_URL',
            evolutionApiKey: 'setting-EVOLUTION_API_KEY',
            EVOLUTION_URL: 'setting-EVOLUTION_URL',
            EVOLUTION_API_KEY: 'setting-EVOLUTION_API_KEY',
            groqApiKey: 'setting-GROQ_API_KEY',
            GROQ_API_KEY: 'setting-GROQ_API_KEY',
            groqModel: 'setting-GROQ_MODEL',
            GROQ_MODEL: 'setting-GROQ_MODEL',
            wisphubUrl: 'setting-WISPHUB_API_URL',
            WISPHUB_API_URL: 'setting-WISPHUB_API_URL',
            wisphubApiKey: 'setting-WISPHUB_API_KEY',
            WISPHUB_API_KEY: 'setting-WISPHUB_API_KEY',
            smartoltUrl: 'setting-SMARTOLT_API_URL',
            SMARTOLT_API_URL: 'setting-SMARTOLT_API_URL',
            smartoltApiKey: 'setting-SMARTOLT_API_KEY',
            SMARTOLT_API_KEY: 'setting-SMARTOLT_API_KEY',
            activationsGroupJid: 'setting-ACTIVATIONS_GROUP_JID',
            ACTIVATIONS_GROUP_JID: 'setting-ACTIVATIONS_GROUP_JID',
            NOTIF_RECORDATORIO_PREVIO_DIAS: 'setting-NOTIF_RECORDATORIO_PREVIO_DIAS',
            NOTIF_INSTANCE_NAME: 'setting-NOTIF_INSTANCE_NAME',
            PAYMENT_BANK: 'setting-PAYMENT_BANK',
            PAYMENT_ACCOUNT: 'setting-PAYMENT_ACCOUNT',
            PAYMENT_BENEFICIARY: 'setting-PAYMENT_BENEFICIARY',
            OFFICE_HOURS_WEEKDAY: 'setting-OFFICE_HOURS_WEEKDAY',
            OFFICE_HOURS_SATURDAY: 'setting-OFFICE_HOURS_SATURDAY',
            OFFICE_ADDRESS: 'setting-OFFICE_ADDRESS',
          };

          Object.keys(s).forEach(k => {
            const targetId = keyMap[k] || ('setting-' + k);
            const input = document.getElementById(targetId);
            if (input && s[k] !== undefined && s[k] !== null) {
              input.value = s[k];
            }
          });

          // Switches booleanos
          const chkPrevio = document.getElementById('setting-NOTIF_RECORDATORIO_PREVIO_ENABLED');
          if (chkPrevio) chkPrevio.checked = s.NOTIF_RECORDATORIO_PREVIO_ENABLED === 'true' || s.NOTIF_RECORDATORIO_PREVIO_ENABLED === true || s.NOTIF_RECORDATORIO_PREVIO_ENABLED === '1';

          const chkCorte = document.getElementById('setting-NOTIF_DIA_CORTE_ENABLED');
          if (chkCorte) chkCorte.checked = s.NOTIF_DIA_CORTE_ENABLED === 'true' || s.NOTIF_DIA_CORTE_ENABLED === true || s.NOTIF_DIA_CORTE_ENABLED === '1';

          const chkSuspension = document.getElementById('setting-NOTIF_SUSPENSION_ENABLED');
          if (chkSuspension) chkSuspension.checked = s.NOTIF_SUSPENSION_ENABLED === 'true' || s.NOTIF_SUSPENSION_ENABLED === true || s.NOTIF_SUSPENSION_ENABLED === '1';
        }
        fetchWhatsAppStatus();
        fetchWhatsAppGroups();
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }

    async function handleSaveAllSettingsManual() {
      const evoUrl = document.getElementById('setting-EVOLUTION_URL')?.value.trim();
      if (evoUrl && !evoUrl.startsWith('http://') && !evoUrl.startsWith('https://')) {
        showToast('URL Inválida', 'Evolution API URL debe comenzar con http:// o https://', 'warning');
        return;
      }

      const settings = {
        APP_URL: document.getElementById('setting-APP_URL')?.value.trim() || '',
        EVOLUTION_URL: evoUrl || '',
        EVOLUTION_API_KEY: document.getElementById('setting-EVOLUTION_API_KEY')?.value.trim() || '',
        GROQ_API_KEY: document.getElementById('setting-GROQ_API_KEY')?.value.trim() || '',
        GROQ_MODEL: document.getElementById('setting-GROQ_MODEL')?.value.trim() || 'llama-3.1-8b-instant',
        WISPHUB_API_URL: document.getElementById('setting-WISPHUB_API_URL')?.value.trim() || '',
        WISPHUB_API_KEY: document.getElementById('setting-WISPHUB_API_KEY')?.value.trim() || '',
        SMARTOLT_API_URL: document.getElementById('setting-SMARTOLT_API_URL')?.value.trim() || '',
        SMARTOLT_API_KEY: document.getElementById('setting-SMARTOLT_API_KEY')?.value.trim() || '',
        ACTIVATIONS_GROUP_JID: document.getElementById('setting-ACTIVATIONS_GROUP_JID')?.value.trim() || '',
        NOTIF_RECORDATORIO_PREVIO_ENABLED: document.getElementById('setting-NOTIF_RECORDATORIO_PREVIO_ENABLED')?.checked ? 'true' : 'false',
        NOTIF_RECORDATORIO_PREVIO_DIAS: document.getElementById('setting-NOTIF_RECORDATORIO_PREVIO_DIAS')?.value || '3',
        NOTIF_DIA_CORTE_ENABLED: document.getElementById('setting-NOTIF_DIA_CORTE_ENABLED')?.checked ? 'true' : 'false',
        NOTIF_SUSPENSION_ENABLED: document.getElementById('setting-NOTIF_SUSPENSION_ENABLED')?.checked ? 'true' : 'false',
        NOTIF_INSTANCE_NAME: document.getElementById('setting-NOTIF_INSTANCE_NAME')?.value || 'atencion',
        PAYMENT_BANK: document.getElementById('setting-PAYMENT_BANK')?.value.trim() || 'BBVA Bancomer',
        PAYMENT_ACCOUNT: document.getElementById('setting-PAYMENT_ACCOUNT')?.value.trim() || '',
        PAYMENT_BENEFICIARY: document.getElementById('setting-PAYMENT_BENEFICIARY')?.value.trim() || '',
        OFFICE_HOURS_WEEKDAY: document.getElementById('setting-OFFICE_HOURS_WEEKDAY')?.value.trim() || '9:00 a 18:00 hrs',
        OFFICE_HOURS_SATURDAY: document.getElementById('setting-OFFICE_HOURS_SATURDAY')?.value.trim() || '9:00 a 15:00 hrs',
        OFFICE_ADDRESS: document.getElementById('setting-OFFICE_ADDRESS')?.value.trim() || '',
      };

      try {
        const res = await apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ settings }),
        });
        if (res.success) {
          showToast('Configuraciones Guardadas', 'Parámetros, credenciales y switches actualizados en Turso DB.', 'success');
        } else {
          showToast('Error', res.error || 'No se pudieron guardar los ajustes', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    // Diagnóstico en vivo de conexiones reales
    async function testSingleApi(service, btnElement) {
      const statusEl = document.getElementById('diag-status-' + service);
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: var(--accent-cyan);">⏳ Probando conexión real...</span>';
      }
      if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerText = 'Probando...';
      }

      const payload = {
        APP_URL: document.getElementById('setting-APP_URL')?.value.trim(),
        EVOLUTION_URL: document.getElementById('setting-EVOLUTION_URL')?.value.trim(),
        EVOLUTION_API_KEY: document.getElementById('setting-EVOLUTION_API_KEY')?.value.trim(),
        GROQ_API_KEY: document.getElementById('setting-GROQ_API_KEY')?.value.trim(),
        GROQ_MODEL: document.getElementById('setting-GROQ_MODEL')?.value.trim(),
        WISPHUB_API_URL: document.getElementById('setting-WISPHUB_API_URL')?.value.trim(),
        WISPHUB_API_KEY: document.getElementById('setting-WISPHUB_API_KEY')?.value.trim(),
        SMARTOLT_API_URL: document.getElementById('setting-SMARTOLT_API_URL')?.value.trim(),
        SMARTOLT_API_KEY: document.getElementById('setting-SMARTOLT_API_KEY')?.value.trim(),
      };

      try {
        const res = await apiFetch('/api/test/' + service, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.success) {
          if (statusEl) {
            statusEl.innerHTML = \`<span style="color: var(--accent-green); font-weight: 600;">🟢 En línea (\${res.latencyMs || 0}ms)</span> - <span style="color: var(--text-muted);">\${res.message || 'Operativo'}</span>\`;
          }
          showToast('Conexión Exitosa (' + service.toUpperCase() + ')', res.message, 'success');
        } else {
          if (statusEl) {
            statusEl.innerHTML = \`<span style="color: var(--accent-rose); font-weight: 600;">🔴 Error</span> - <span style="color: var(--accent-rose);">\${res.error || res.message || 'Fallo'}</span>\`;
          }
          showToast('Error de Conexión (' + service.toUpperCase() + ')', res.error || res.message, 'error', 5000);
        }
      } catch (err) {
        if (statusEl) {
          statusEl.innerHTML = \`<span style="color: var(--accent-rose); font-weight: 600;">🔴 Error</span> - <span style="color: var(--accent-rose);">\${err.message}</span>\`;
        }
        showToast('Error', err.message, 'error');
      } finally {
        if (btnElement) {
          btnElement.disabled = false;
          btnElement.innerText = '⚡ Probar';
        }
      }
    }

    async function testAllApisDiagnostic() {
      const btn = document.getElementById('btn-test-all-apis');
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Verificando APIs...';
      }
      showToast('Diagnóstico Iniciado', 'Comprobando conectividad en vivo con todas las APIs...', 'info');

      const services = ['evolution', 'groq', 'wisphub', 'smartolt', 'turso'];
      await Promise.all(services.map(s => testSingleApi(s)));

      if (btn) {
        btn.disabled = false;
        btn.innerText = '⚡ Probar Todas';
      }
    }

    async function runBillingCycleManual() {
      showToast('Disparando Lote', 'Ejecutando ciclo de verificación y avisos de cobranza...', 'info');
      try {
        const res = await apiFetch('/api/notifications/run-billing-cycle', { method: 'POST' });
        if (res.success) {
          const stats = res.stats || {};
          const msg = \`Recordatorios: \${stats.preventivos || 0} enviados | Cortes: \${stats.dia_corte || 0} | Suspensiones: \${stats.suspensiones || 0}\`;
          showToast('Ciclo de Cobranza Ejecutado', msg, 'success', 5000);
        } else {
          showToast('Error', res.error || 'Fallo en la ejecución del ciclo', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function handleResolveGroupLink() {
      const input = document.getElementById('setting-ACTIVATIONS_GROUP_JID');
      const val = (input?.value || '').trim();
      const btn = document.getElementById('btn-resolve-group');
      if (!val) {
        showToast('Atención', 'Ingresa el enlace de invitación (ej: https://chat.whatsapp.com/...) o JID del grupo.', 'warning');
        return;
      }

      if (btn) btn.innerHTML = '<span class="spinner" style="width:12px;height:12px;margin-right:4px;"></span> Vinculando...';
      try {
        const res = await apiFetch('/api/whatsapp/resolve-group', {
          method: 'POST',
          body: JSON.stringify({ link: val }),
        });
        if (res.success && res.jid) {
          if (input) input.value = res.jid;
          showToast('¡Grupo Vinculado!', res.message || 'Grupo vinculado exitosamente.', 'success');
          fetchWhatsAppGroups();
        } else {
          showToast('Error', res.error || 'No se pudo vincular el grupo.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        if (btn) btn.innerHTML = '🔗 Vincular';
      }
    }

    async function fetchWhatsAppGroups() {
      const select = document.getElementById('select-active-groups');
      if (!select) return;
      try {
        const res = await apiFetch('/api/whatsapp/groups');
        if (res.groups && Array.isArray(res.groups)) {
          select.innerHTML = '<option value="">-- O seleccionar de grupos activos (' + res.groups.length + ') --</option>' +
            res.groups.map(g => '<option value="' + g.id + '">' + (g.subject || g.id) + '</option>').join('');
        }
      } catch (err) {
        console.warn('No se pudieron listar grupos de WhatsApp:', err);
      }
    }

    function handleSelectExistingGroup(jid) {
      if (!jid) return;
      const input = document.getElementById('setting-ACTIVATIONS_GROUP_JID');
      if (input) input.value = jid;
      showToast('Grupo Seleccionado', 'Haz clic en "Guardar Todas las Configuraciones" para aplicar.', 'info');
    }

    // WhatsApp Multi-Instance & Multi-Number Management
    let qrPollInterval = null;

    async function fetchWhatsAppInstancesList() {
      const container = document.getElementById('evolution-instances-list');
      if (!container) return;

      try {
        const res = await apiFetch('/api/whatsapp/instances');
        const instances = res.instances || [];

        if (instances.length === 0) {
          container.innerHTML = \`
            <div style="text-align: center; padding: 20px; color: var(--text-dim); background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
              No hay instancias configuradas en Evolution API.
              <div style="margin-top: 10px;">
                <button class="btn btn-primary btn-sm" onclick="openNewWhatsAppInstanceModal()">➕ Conectar Primer Número</button>
              </div>
            </div>
          \`;
          return;
        }

        let hasActiveOpen = false;
        container.innerHTML = instances.map(inst => {
          const isOpen = inst.connectionStatus === 'open';
          if (isOpen && inst.isActive) hasActiveOpen = true;
          const statusBadge = isOpen 
            ? '<span class="badge badge-success">🟢 Conectado</span>' 
            : (inst.connectionStatus === 'connecting' ? '<span class="badge badge-warning">🟡 Conectando</span>' : '<span class="badge badge-danger">🔴 Desconectado</span>');
          
          const phoneDisplay = inst.phone ? \`+52 \${inst.phone.slice(-10)}\` : 'Sin número vinculado';
          const safeName = inst.name.replace(/'/g, "\\'");
          const areaDisplay = inst.area_name || inst.name;
          const safeArea = (inst.area_name || inst.name).replace(/'/g, "\\'");

          return \`
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid \${inst.isActive ? 'var(--primary)' : 'var(--card-border)'}; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: \${isOpen ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                  \${isOpen ? '📱' : '📵'}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <strong style="font-size: 13.5px; color: var(--text-main);">\${escapeHtml(inst.name)}</strong>
                    <span class="badge badge-info" style="font-size: 10px;">🏢 \${escapeHtml(areaDisplay)}</span>
                    \${inst.isActive ? '<span class="badge badge-primary" style="font-size: 10px;">BOT ACTIVO</span>' : ''}
                  </div>
                  <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
                    \${escapeHtml(phoneDisplay)} \${inst.profileName ? \`(\${escapeHtml(inst.profileName)})\` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                \${statusBadge}
                <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 8px;" onclick="openEditWhatsAppInstanceAreaModal('\${safeName}', '\${safeArea}', '\${(inst.description || '').replace(/'/g, "\\'")}')" title="Editar área / oficina asignada">
                  ✏️ Área
                </button>
                \${!isOpen ? \`
                  <button class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 8px;" onclick="openInstanceQrModal('\${safeName}')" title="Escanear código QR para conectar">
                    📲 QR
                  </button>
                \` : ''}
                \${!inst.isActive ? \`
                  <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 8px;" onclick="selectActiveWhatsAppInstance('\${safeName}')" title="Usar esta línea para las respuestas del Chatbot">
                    ⭐ Activar
                  </button>
                \` : ''}
                \${isOpen ? \`
                  <button class="btn btn-danger btn-sm" style="font-size: 11px; padding: 4px 8px;" onclick="disconnectWhatsAppInstance('\${safeName}')" title="Desconectar sesión">
                    🔌
                  </button>
                \` : ''}
                <button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 8px;" onclick="syncInstanceWebhook('\${safeName}')" title="Re-sincronizar webhook hacia el chatbot">
                  🔄
                </button>
              </div>
            </div>
          \`;
        }).join('');

        // Actualizar píldora de estado superior
        const pillLabel = document.getElementById('whatsapp-pill-label');
        if (pillLabel) {
          pillLabel.innerText = hasActiveOpen ? 'WhatsApp Activo' : 'WhatsApp Desconectado';
        }
      } catch (err) {
        container.innerHTML = '<div style="color: var(--accent-amber); padding: 10px;">No se pudo contactar a Evolution API. Revisa la URL y API Key.</div>';
      }
    }

    async function fetchWhatsAppStatus() {
      return fetchWhatsAppInstancesList();
    }

    function openNewWhatsAppInstanceModal() {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <p style="font-size: 13px; color: var(--text-muted);">
            Registra una nueva cuenta / línea de WhatsApp e indícale a qué área u oficina pertenece:
          </p>
          <div class="form-group">
            <label class="form-label">Nombre del Área / Oficina (Visible para traspasos)</label>
            <input type="text" id="new-instance-area" class="form-control" placeholder="Ej: Oficina Actopan, Cobranza Matriz, Soporte Fibra" required>
          </div>
          <div class="form-group">
            <label class="form-label">Identificador de Instancia (Slug)</label>
            <input type="text" id="new-instance-name" class="form-control" placeholder="ej: actopan, cobranza, soporte-linea2" autocomplete="off" spellcheck="false" required oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')">
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Usa solo minúsculas sin espacios (ej. oficina-actopan).</div>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción o Notas (Opcional)</label>
            <input type="text" id="new-instance-desc" class="form-control" placeholder="Ej: Línea de atención presencial y pagos">
          </div>
        </div>
      \`;

      openModal('➕ Registrar Nueva Línea y Área de WhatsApp', content, async () => {
        const nameInput = document.getElementById('new-instance-name');
        const areaInput = document.getElementById('new-instance-area');
        const descInput = document.getElementById('new-instance-desc');

        const name = (nameInput?.value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const area_name = (areaInput?.value || '').trim();
        const description = (descInput?.value || '').trim();

        if (!name || !area_name) {
          showToast('Campos requeridos', 'Debes ingresar el nombre de la instancia y el área u oficina', 'warning');
          return false;
        }

        showToast('Creando Instancia', \`Registrando "\${name}" para el área "\${area_name}"...\`, 'info');
        const res = await apiFetch('/api/whatsapp/instances', {
          method: 'POST',
          body: JSON.stringify({ name, area_name, description }),
        });

        if (res.success) {
          showToast('Instancia Creada', res.message || 'Instancia creada exitosamente.', 'success');
          fetchWhatsAppInstancesList();
          loadLiveChatData(false);
          setTimeout(() => {
            openInstanceQrModal(name);
          }, 400);
        } else {
          showToast('Error', res.message || res.error || 'No se pudo crear la instancia', 'error');
          return false;
        }
      }, 'Crear & Generar QR');
    }

    function openEditWhatsAppInstanceAreaModal(instanceName, currentArea, currentDesc) {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <p style="font-size: 13px; color: var(--text-muted);">
            Modifica el nombre del área asignada a la línea <strong>\${escapeHtml(instanceName)}</strong>:
          </p>
          <div class="form-group">
            <label class="form-label">Nombre del Área / Oficina</label>
            <input type="text" id="edit-instance-area-name" class="form-control" value="\${escapeHtml(currentArea || '')}" placeholder="Ej: Oficina Actopan, Cobranza, etc." required>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <input type="text" id="edit-instance-area-desc" class="form-control" value="\${escapeHtml(currentDesc || '')}" placeholder="Notas adicionales">
          </div>
        </div>
      \`;

      openModal(\`✏️ Editar Área de \${instanceName}\`, content, async () => {
        const areaName = document.getElementById('edit-instance-area-name')?.value.trim();
        const desc = document.getElementById('edit-instance-area-desc')?.value.trim();

        if (!areaName) {
          showToast('Campo requerido', 'El nombre del área es obligatorio', 'warning');
          return false;
        }

        const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/area\`, {
          method: 'PUT',
          body: JSON.stringify({ area_name: areaName, description: desc }),
        });

        if (res.success) {
          showToast('Área Actualizada', \`Línea \${instanceName} asignada a "\${areaName}".\`, 'success');
          fetchWhatsAppInstancesList();
          loadLiveChatData(false);
        } else {
          showToast('Error', res.error || 'No se pudo actualizar el área', 'error');
          return false;
        }
      }, 'Guardar Cambios');
    }

    async function openInstanceQrModal(instanceName) {
      clearInterval(qrPollInterval);

      const content = \`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 280px; text-align: center;">
          <div id="instance-qr-display" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div class="spinner" style="margin-bottom: 12px;"></div>
            <p style="font-size: 13px; color: var(--text-muted);">Generando código QR para <strong>\${escapeHtml(instanceName)}</strong>...</p>
          </div>
          <div style="font-size: 12px; color: var(--text-dim); margin-top: 14px; max-width: 320px;">
            Abre WhatsApp en tu teléfono ➔ Dispositivos vinculados ➔ Vincular dispositivo y escanea este código.
          </div>
          <div style="margin-top: 14px; display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="loadInstanceQr('\${instanceName}')">🔄 Refrescar Código</button>
          </div>
        </div>
      \`;

      openModal(\`Vincular WhatsApp - \${instanceName}\`, content, () => {
        clearInterval(qrPollInterval);
      }, 'Listo / Cerrar');

      await loadInstanceQr(instanceName);

      // Polling de verificación cada 4 segundos mientras el modal está abierto
      qrPollInterval = setInterval(async () => {
        try {
          const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/qr\`);
          if (res.state === 'open') {
            clearInterval(qrPollInterval);
            const display = document.getElementById('instance-qr-display');
            if (display) {
              display.innerHTML = \`
                <svg class="svg-icon" style="width: 56px; height: 56px; color: var(--accent-green); margin-bottom: 10px;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h4 style="font-size: 16px; font-weight: 700; color: var(--accent-green);">¡WhatsApp Vinculado con Éxito!</h4>
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">La línea está conectada y lista para recibir y enviar mensajes.</p>
              \`;
            }
            showToast('Conectado', \`Instancia \${instanceName} vinculada exitosamente.\`, 'success');
            fetchWhatsAppInstancesList();
          }
        } catch {}
      }, 4000);
    }

    async function loadInstanceQr(instanceName) {
      const display = document.getElementById('instance-qr-display');
      if (!display) return;

      try {
        const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/qr\`);
        if (res.state === 'open') {
          clearInterval(qrPollInterval);
          display.innerHTML = \`
            <svg class="svg-icon" style="width: 56px; height: 56px; color: var(--accent-green); margin-bottom: 10px;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <h4 style="font-size: 16px; font-weight: 700; color: var(--accent-green);">WhatsApp Conectado</h4>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Esta instancia ya se encuentra activa.</p>
          \`;
          fetchWhatsAppInstancesList();
        } else if (res.qr) {
          const qrSrc = res.qr.startsWith('data:') ? res.qr : \`data:image/png;base64,\${res.qr}\`;
          display.innerHTML = \`
            <img src="\${qrSrc}" style="width: 200px; height: 200px; border-radius: 8px; background: #fff; padding: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);" alt="QR WhatsApp">
            \${res.pairingCode ? \`<div style="margin-top: 10px; font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--accent-cyan);">Código de emparejamiento: \${res.pairingCode}</div>\` : ''}
          \`;
        } else {
          display.innerHTML = \`
            <p style="color: var(--accent-amber);">Esperando código QR de Evolution API...</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="loadInstanceQr('\${instanceName}')">Intentar de nuevo</button>
          \`;
        }
      } catch (err) {
        display.innerHTML = '<p style="color: var(--accent-danger);">Error al solicitar código QR a Evolution API.</p>';
      }
    }

    async function selectActiveWhatsAppInstance(instanceName) {
      showConfirmDialog(
        'Activar Instancia Principal',
        \`¿Deseas activar <strong>\${instanceName}</strong> como el número principal de WhatsApp para las respuestas del Chatbot?\`,
        async () => {
          const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/select\`, { method: 'POST' });
          if (res.success) {
            showToast('Instancia Activada', res.message || \`\${instanceName} es ahora la línea activa.\`, 'success');
            fetchWhatsAppInstancesList();
          } else {
            showToast('Error', res.error || 'No se pudo seleccionar la instancia', 'error');
          }
        }
      );
    }

    async function disconnectWhatsAppInstance(instanceName) {
      showConfirmDialog(
        'Desvincular WhatsApp',
        \`¿Deseas cerrar la sesión de WhatsApp en la instancia <strong>\${instanceName}</strong>?\`,
        async () => {
          const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/disconnect\`, { method: 'POST' });
          if (res.success) {
            showToast('Desvinculado', \`Instancia \${instanceName} desvinculada.\`, 'info');
            fetchWhatsAppInstancesList();
          } else {
            showToast('Error', res.error || 'Error al desvincular', 'error');
          }
        }
      );
    }

    async function syncInstanceWebhook(instanceName) {
      showToast('Sincronizando', \`Re-configurando webhook para \${instanceName}...\`, 'info');
      try {
        const res = await apiFetch(\`/api/whatsapp/instances/\${encodeURIComponent(instanceName)}/sync-webhook\`, { method: 'POST' });
        if (res.webhookOk) {
          showToast('Webhook Sincronizado', \`Webhook de \${instanceName} enlazado con éxito hacia /webhook.\`, 'success');
        } else {
          showToast('Aviso', 'Se envió la petición de sincronización a Evolution API.', 'info');
        }
        fetchWhatsAppInstancesList();
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    function openWhatsAppInstancesModal() {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Líneas y números de teléfono conectados a la plataforma:
            </p>
            <button class="btn btn-primary btn-sm" onclick="openNewWhatsAppInstanceModal()">
              ➕ Nuevo Número
            </button>
          </div>
          <div id="modal-evolution-instances-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto;">
            <div style="text-align: center; color: var(--text-dim); padding: 20px;">Cargando lista de instancias...</div>
          </div>
        </div>
      \`;

      openModal('📱 Gestor de Números e Instancias de WhatsApp', content, null, 'Cerrar');

      // Cargar lista dentro del modal
      setTimeout(async () => {
        const modalContainer = document.getElementById('modal-evolution-instances-list');
        if (!modalContainer) return;

        try {
          const res = await apiFetch('/api/whatsapp/instances');
          const instances = res.instances || [];

          if (instances.length === 0) {
            modalContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-dim);">No hay instancias registradas.</div>';
            return;
          }

          modalContainer.innerHTML = instances.map(inst => {
            const isOpen = inst.connectionStatus === 'open';
            const statusBadge = isOpen 
              ? '<span class="badge badge-success">🟢 Conectado</span>' 
              : '<span class="badge badge-danger">🔴 Desconectado</span>';
            const phoneDisplay = inst.phone ? \`+52 \${inst.phone.slice(-10)}\` : 'Sin número vinculado';
            const safeName = inst.name.replace(/'/g, "\\'");

            return \`
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-sm); border: 1px solid \${inst.isActive ? 'var(--primary)' : 'var(--card-border)'};">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 14px;">\${escapeHtml(inst.name)}</strong>
                    \${inst.isActive ? '<span class="badge badge-primary">ACTIVO</span>' : ''}
                  </div>
                  <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
                    \${escapeHtml(phoneDisplay)}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  \${statusBadge}
                  \${!isOpen ? \`
                    <button class="btn btn-primary btn-sm" onclick="openInstanceQrModal('\${safeName}')">📲 QR</button>
                  \` : ''}
                  \${!inst.isActive ? \`
                    <button class="btn btn-secondary btn-sm" onclick="selectActiveWhatsAppInstance('\${safeName}')">⭐ Activar</button>
                  \` : ''}
                  <button class="btn btn-secondary btn-sm" onclick="syncInstanceWebhook('\${safeName}')" title="Re-sincronizar webhook">🔄</button>
                </div>
              </div>
            \`;
          }).join('');
        } catch (err) {
          modalContainer.innerHTML = '<div style="color: var(--accent-danger); padding: 10px;">Error al cargar instancias.</div>';
        }
      }, 100);
    }

    async function disconnectWhatsAppSession() {
      return disconnectWhatsAppInstance('isp-soporte');
    }

    function clearSessionsData() {
      if (state.user?.role !== 'superadmin') {
        showToast('Acceso Denegado', 'Solo el superadmin puede vaciar sesiones.', 'error');
        return;
      }
      showConfirmDialog('⚠️ Vaciar Sesiones de Clientes', '¿Estás seguro de que deseas eliminar todas las sesiones activas en Turso DB? El bot reiniciará el flujo con los clientes.', async () => {
        const res = await apiFetch('/api/sessions/clear-all', { method: 'DELETE' });
        if (res.success) {
          showToast('Sesiones Vaciadas', res.message || 'Sesiones eliminadas correctamente.', 'success');
          loadDashboardData();
        } else {
          showToast('Error', res.error || 'Error al vaciar sesiones.', 'error');
        }
      });
    }

    function clearLogsData() {
      if (state.user?.role !== 'superadmin') {
        showToast('Acceso Denegado', 'Solo el superadmin puede vaciar historiales.', 'error');
        return;
      }
      showConfirmDialog('⚠️ Vaciar Historial de Logs', '¿Estás seguro de que deseas eliminar todos los mensajes y registros de conversación?', async () => {
        const res = await apiFetch('/api/logs/clear-all', { method: 'DELETE' });
        if (res.success) {
          showToast('Historial Vaciado', res.message || 'Logs eliminados correctamente.', 'success');
          loadDashboardData();
        } else {
          showToast('Error', res.error || 'Error al vaciar historial.', 'error');
        }
      });
    }

    function confirmClearAllTickets() {
      if (state.user?.role !== 'superadmin') {
        showToast('Acceso Denegado', 'Solo el superadmin puede vaciar tickets.', 'error');
        return;
      }
      showConfirmDialog('⚠️ Vaciar Todos los Tickets', '¿Estás seguro de que deseas eliminar permanentemente TODOS los tickets de prueba? Esta acción es irreversible.', async () => {
        const res = await apiFetch('/api/tickets/clear-all', { method: 'DELETE' });
        if (res.success) {
          showToast('Tickets Vaciados', res.message || 'Todos los tickets han sido eliminados.', 'success');
          loadTicketsData();
          loadDashboardData();
        } else {
          showToast('Error', res.error || 'Error al vaciar tickets.', 'error');
        }
      });
    }

    function clearTicketsData() {
      confirmClearAllTickets();
    }

    function confirmDeleteSingleTicket(folio) {
      if (state.user?.role !== 'superadmin') {
        showToast('Acceso Denegado', 'Solo el superadmin puede eliminar tickets.', 'error');
        return;
      }
      closeModal();
      showConfirmDialog('Eliminar Ticket', \`¿Deseas eliminar permanentemente el ticket \${folio}? Esta acción no se puede deshacer.\`, async () => {
        const res = await apiFetch(\`/api/tickets/\${encodeURIComponent(folio)}\`, { method: 'DELETE' });
        if (res.success) {
          showToast('Ticket Eliminado', \`El ticket \${folio} fue eliminado correctamente.\`, 'info');
          loadTicketsData();
          loadDashboardData();
        } else {
          showToast('Error', res.error || 'No se pudo eliminar el ticket.', 'error');
        }
      });
    }

    // Admin Users (RBAC) Module
    async function loadAdminUsersData() {
      try {
        const res = await apiFetch('/api/admin/users');
        state.adminUsers = res.users || [];
        filterAdminUsersTable();
      } catch (err) {
        console.error('Error loading users:', err);
      }
    }

    function renderAdminUsersTable(users) {
      const tbody = document.getElementById('table-admin-users-body');
      if (!tbody) return;
      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 20px;">No se encontraron usuarios con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(u => \`
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">@\${u.username}</td>
          <td style="font-weight: 600;">\${escapeHtml(u.name)}</td>
          <td><span class="badge badge-purple">\${u.role}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim);">\${u.last_login ? new Date(u.last_login).toLocaleString() : 'Nunca'}</td>
          <td style="text-align: right;">
            \${u.username !== 'admin' ? \`
              <button class="btn btn-danger btn-sm" onclick="deleteAdminUserItem(\${u.id}, '\${u.username}')">
                Eliminar
              </button>
            \` : '<span style="color: var(--text-dim); font-size: 11px;">Principal</span>'}
          </td>
        </tr>
      \`).join('');
    }

    function filterAdminUsersTable() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fRole = (document.getElementById('filter-user-role')?.value || '').toLowerCase().trim();

      const users = state.adminUsers || [];
      const filtered = users.filter(u => {
        if (fRole && !String(u.role || '').toLowerCase().includes(fRole)) return false;
        if (!matchesFuzzyTokens(q, u.username, u.name, u.role)) return false;
        return true;
      });

      renderAdminUsersTable(filtered);
    }

    let currentUsersSort = { col: 'username', dir: 'asc' };
    function sortAdminUsersBy(col) {
      currentUsersSort = parseSortParam(col, currentUsersSort);

      state.adminUsers.sort((a, b) => {
        let valA = a[currentUsersSort.col];
        let valB = b[currentUsersSort.col];
        if (currentUsersSort.col === 'username') {
          valA = a.username;
          valB = b.username;
        } else if (currentUsersSort.col === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (currentUsersSort.col === 'role') {
          valA = a.role;
          valB = b.role;
        } else if (currentUsersSort.col === 'last_login' || currentUsersSort.col === 'login') {
          valA = a.last_login;
          valB = b.last_login;
        }
        return universalCompare(valA, valB, currentUsersSort.dir);
      });

      filterAdminUsersTable();
    }

    function clearAdminUsersFilters() {
      clearGlobalContextSearch();
      const selRole = document.getElementById('filter-user-role');
      if (selRole) selRole.value = '';
      const selSort = document.getElementById('filter-user-sort');
      if (selSort) selSort.value = 'username_asc';
      renderAdminUsersTable(state.adminUsers || []);
    }

    function openNewAdminUserModal() {
      const content = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Nombre Completo</label>
            <input type="text" id="user-new-name" class="form-control" placeholder="Ej: Diana Pérez" required>
          </div>
          <div class="form-group">
            <label class="form-label">Usuario</label>
            <input type="text" id="user-new-username" class="form-control" placeholder="diana.perez" required>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input type="password" id="user-new-password" class="form-control" placeholder="••••••••" required>
          </div>
          <div class="form-group">
            <label class="form-label">Rol de Acceso</label>
            <select id="user-new-role" class="form-control">
              <option value="soporte">Soporte Técnico</option>
              <option value="tecnico">Técnico de Campo</option>
              <option value="facturacion">Facturación & Cobranza</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>
      \`;

      openModal('Crear Usuario del Panel', content, async () => {
        const name = document.getElementById('user-new-name').value.trim();
        const username = document.getElementById('user-new-username').value.trim();
        const password = document.getElementById('user-new-password').value.trim();
        const role = document.getElementById('user-new-role').value;

        if (!name || !username || !password) {
          showToast('Validación', 'Todos los campos son obligatorios', 'warning');
          return false;
        }

        const res = await apiFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({ name, username, password, role }),
        });

        if (res.success) {
          showToast('Usuario Creado', \`Usuario @\${username} registrado exitosamente.\`, 'success');
          loadAdminUsersData();
        } else {
          showToast('Error', res.message || res.error, 'error');
        }
      }, 'Crear Usuario');
    }

    function deleteAdminUserItem(id, username) {
      showConfirmDialog('Eliminar Usuario', \`¿Deseas eliminar al usuario @\${username}?\`, async () => {
        const res = await apiFetch(\`/api/admin/users/\${id}\`, { method: 'DELETE' });
        if (res.success) {
          showToast('Eliminado', 'Usuario retirado.', 'success');
          loadAdminUsersData();
        }
      });
    }

    // Clientes & Geolocalización GPS Module
    let clientsSearchDebounce = null;

    async function loadClientsData() {
      try {
        const tbody = document.getElementById('table-clients-body');
        if (!tbody) return;

        const params = new URLSearchParams({
          search: state.clients.search || '',
          status: state.clients.filter || 'ALL',
          page: String(state.clients.page || 1),
          limit: String(state.clients.limit || 25),
        });

        if (state.clients.colFilters) {
          if (state.clients.colFilters.nombre) params.set('search_nombre', state.clients.colFilters.nombre);
          if (state.clients.colFilters.servicio) params.set('search_servicio', state.clients.colFilters.servicio);
          if (state.clients.colFilters.ip) params.set('search_ip', state.clients.colFilters.ip);
          if (state.clients.colFilters.estado) params.set('search_estado', state.clients.colFilters.estado);
          if (state.clients.colFilters.plan) params.set('search_plan', state.clients.colFilters.plan);
          if (state.clients.colFilters.router) params.set('search_router', state.clients.colFilters.router);
          if (state.clients.colFilters.telefono) params.set('search_telefono', state.clients.colFilters.telefono);
          if (state.clients.colFilters.gps) params.set('search_gps', state.clients.colFilters.gps);
        }

        const res = await apiFetch('/api/admin/clients?' + params.toString());
        if (!res.success) {
          showToast('Error', res.error || 'No se pudieron cargar los clientes.', 'error');
          return;
        }

        state.clients.items = res.clients || [];
        state.clients.total = res.total || 0;
        if (Array.isArray(res.routers) && res.routers.length > 0) {
          state.clients.routers = res.routers;
        }

        populateClientsRouterFilter(res.routers || state.clients.routers);

        // Actualizar métricas en tiempo real
        const elTotal = document.getElementById('metric-clients-total');
        if (elTotal) elTotal.innerText = Number(res.total || 0).toLocaleString();

        const elWithGps = document.getElementById('metric-clients-with-gps');
        if (elWithGps) elWithGps.innerText = Number(res.totalWithGps || 0).toLocaleString();

        const elWithoutGps = document.getElementById('metric-clients-without-gps');
        if (elWithoutGps) elWithoutGps.innerText = Number(res.totalWithoutGps || 0).toLocaleString();

        const elActive = document.getElementById('metric-clients-active');
        if (elActive) elActive.innerText = Number(res.totalActive || 0).toLocaleString();

        // Actualizar etiqueta de conteo y paginación
        const countLabel = document.getElementById('clients-count-label');
        if (countLabel) {
          const from = state.clients.total > 0 ? (state.clients.page - 1) * state.clients.limit + 1 : 0;
          const to = Math.min(state.clients.page * state.clients.limit, state.clients.total);
          countLabel.innerText = \`Mostrando \${from}-\${to} de \${state.clients.total} clientes\`;
        }

        const pageInfo = document.getElementById('clients-pagination-info');
        if (pageInfo) {
          const totalPages = Math.max(1, Math.ceil(state.clients.total / state.clients.limit));
          pageInfo.innerText = \`Página \${state.clients.page} de \${totalPages}\`;
        }

        const btnPrev = document.getElementById('btn-clients-prev');
        if (btnPrev) btnPrev.disabled = state.clients.page <= 1;

        const btnNext = document.getElementById('btn-clients-next');
        if (btnNext) {
          const totalPages = Math.max(1, Math.ceil(state.clients.total / state.clients.limit));
          btnNext.disabled = state.clients.page >= totalPages;
        }

        renderClientsTable(state.clients.items);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    }

    function renderClientsTable(clients) {
      const tbody = document.getElementById('table-clients-body');
      if (!tbody) return;

      if (!clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No se encontraron clientes con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = clients.map(c => {
        const isActivo = String(c.estado || '').toLowerCase().includes('act');
        const estadoBadge = isActivo
          ? '<span class="badge badge-success">Activo</span>'
          : '<span class="badge badge-danger">Suspendido</span>';

        const facturasBadge = String(c.estado_facturas || '').toLowerCase().includes('pagad')
          ? '<span class="badge badge-info" style="font-size: 10px;">Pagadas</span>'
          : '<span class="badge badge-warning" style="font-size: 10px;">Pendientes</span>';

        // Render Teléfonos (Principal + Adicionales/Familiares)
        const primaryPhone = c.telefono_principal ? String(c.telefono_principal).replace(/\\D/g, '') : '';
        const extraPhones = Array.isArray(c.telefonos_adicionales) ? c.telefonos_adicionales : [];

        let phonesHtml = '';
        if (primaryPhone) {
          phonesHtml += \`
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 11px; padding: 2px 6px; cursor: pointer;" title="Clic para copiar" onclick="copyToClipboard('\${primaryPhone}')">
                \${primaryPhone}
              </span>
              \${extraPhones.map(ep => \`
                <span class="badge badge-purple" style="font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; cursor: pointer;" title="Familiar - Clic para copiar" onclick="copyToClipboard('\${ep}')">
                  \${ep}
                </span>
              \`).join('')}
            </div>
          \`;
        } else if (extraPhones.length > 0) {
          phonesHtml += \`
            <div style="display: flex; flex-direction: column; gap: 3px;">
              \${extraPhones.map(ep => \`
                <span class="badge badge-purple" style="font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; cursor: pointer;" title="Familiar - Clic para copiar" onclick="copyToClipboard('\${ep}')">
                  \${ep}
                </span>
              \`).join('')}
            </div>
          \`;
        } else {
          phonesHtml = '<span style="color: var(--text-dim); font-size: 11px;">Sin teléfono</span>';
        }

        phonesHtml += \`
          <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px; margin-top: 3px;" onclick='openClientPhonesModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
            Teléfonos
          </button>
        \`;

        // Render Ubicación & GPS
        let gpsHtml = '';
        const coords = c.coordenadas_gps;
        const mapsUrl = c.google_maps_url || (coords ? \`https://www.google.com/maps?q=\${coords}\` : '');

        if (coords || mapsUrl) {
          gpsHtml = \`
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 11px; padding: 2px 6px; cursor: pointer;" title="Clic para copiar coordenadas" onclick="copyToClipboard('\${coords || ''}')">
                  \${coords || 'GPS Registrado'}
                </span>
                <a href="\${mapsUrl || '#'}" target="_blank" class="btn btn-primary btn-sm" style="padding: 2px 7px; font-size: 10.5px; text-decoration: none;" title="Abrir en Google Maps">
                  Maps
                </a>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick='openClientLocationModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
                  Editar GPS
                </button>
              </div>
              \${c.direccion ? \`<div style="font-size: 11px; color: var(--text-dim); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${escapeHtml(c.direccion)}">\${escapeHtml(c.direccion)}</div>\` : ''}
            </div>
          \`;
        } else {
          gpsHtml = \`
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">
                  Sin GPS
                </span>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10.5px;" onclick='openClientLocationModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
                  Asignar GPS
                </button>
              </div>
              \${c.direccion ? \`<div style="font-size: 11px; color: var(--text-dim); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${escapeHtml(c.direccion)}">\${escapeHtml(c.direccion)}</div>\` : ''}
            </div>
          \`;
        }

        return \`
          <tr>
            <td>
              <div style="font-weight: 700; font-size: 13px; color: #fff; cursor: pointer;" onclick="openClientDetailModal(\${c.id_servicio})" title="Click para ver expediente completo">\${escapeHtml(c.nombre)}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                <span style="font-family: var(--font-mono); color: var(--primary); font-weight: 700;">#\${c.id_servicio || '--'}</span>
                \${c.servicio ? \` &bull; \${escapeHtml(c.servicio)}\` : ''}
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 2px; font-size: 11.5px;">
                <div><span style="color: var(--text-dim);">IP:</span> <span style="font-family: var(--font-mono); font-weight: 600; color: #38bdf8;">\${c.ip || '--'}</span></div>
                <div><span style="color: var(--text-dim);">SN:</span> <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;">\${c.sn_onu || '--'}</span></div>
                <div style="font-size: 10.5px; color: var(--text-dim);">\${escapeHtml(c.router || '--')}</div>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  \${estadoBadge}
                  \${facturasBadge}
                </div>
                <span class="badge badge-purple" style="font-size: 10.5px; font-weight: 600; align-self: flex-start;">
                  \${escapeHtml(c.plan_internet || '--')}
                </span>
              </div>
            </td>
            <td>\${phonesHtml}</td>
            <td>\${gpsHtml}</td>
            <td style="text-align: right;">
              <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                <button class="btn btn-primary btn-sm" onclick='openDispatchModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})' title="Asignar orden de visita técnica vía WhatsApp">
                  Asignar
                </button>
                \${primaryPhone ? \`
                  <button class="btn btn-secondary btn-sm" onclick="selectChat('\${primaryPhone}'); navigateTo('live-chat');" title="Abrir Chat WhatsApp">
                    Chat
                  </button>
                \` : ''}
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function populateClientsRouterFilter(routersList) {
      const selRouter = document.getElementById('filter-client-router');
      if (!selRouter) return;
      const currentVal = selRouter.value;
      const routerSet = new Set();

      const sourceList = Array.isArray(routersList) && routersList.length > 0 
        ? routersList 
        : (state.clients.routers || []);

      sourceList.forEach(r => {
        if (r && String(r).trim()) routerSet.add(String(r).trim());
      });

      (state.clients.items || []).forEach(c => {
        if (c.router && c.router.trim()) routerSet.add(c.router.trim());
      });

      if (routerSet.size > 0) {
        const routers = Array.from(routerSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        selRouter.innerHTML = '<option value="">📍 Todos los Routers / Zonas</option>' +
          routers.map(r => '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + '</option>').join('');
        if (currentVal && routers.includes(currentVal)) {
          selRouter.value = currentVal;
        }
      }
    }

    function handleClientColFilter() {
      if (clientsSearchDebounce) clearTimeout(clientsSearchDebounce);
      clientsSearchDebounce = setTimeout(() => {
        state.clients.colFilters = {
          estado: document.getElementById('filter-client-estado')?.value || '',
          router: (document.getElementById('filter-client-router')?.value || '').trim(),
          gps: document.getElementById('filter-client-gps')?.value || '',
        };
        state.clients.page = 1;
        loadClientsData();
      }, 300);
    }

    let currentClientsSort = { col: 'nombre', dir: 'asc' };
    function sortClientsBy(col) {
      currentClientsSort = parseSortParam(col, currentClientsSort);

      state.clients.items.sort((a, b) => {
        let valA = a[currentClientsSort.col];
        let valB = b[currentClientsSort.col];
        if (currentClientsSort.col === 'nombre') {
          valA = a.nombre;
          valB = b.nombre;
        } else if (currentClientsSort.col === 'servicio' || currentClientsSort.col === 'id_servicio') {
          valA = a.id_servicio || a.servicio;
          valB = b.id_servicio || b.servicio;
        } else if (currentClientsSort.col === 'ip') {
          valA = a.ip;
          valB = b.ip;
        } else if (currentClientsSort.col === 'router') {
          valA = a.router;
          valB = b.router;
        } else if (currentClientsSort.col === 'estado') {
          valA = a.estado;
          valB = b.estado;
        } else if (currentClientsSort.col === 'gps') {
          valA = Boolean((a.coordenadas_gps && a.coordenadas_gps.length > 3) || (a.google_maps_url && a.google_maps_url.length > 5));
          valB = Boolean((b.coordenadas_gps && b.coordenadas_gps.length > 3) || (b.google_maps_url && b.google_maps_url.length > 5));
        }
        return universalCompare(valA, valB, currentClientsSort.dir);
      });

      renderClientsTable(state.clients.items);
    }

    function clearClientColFilters() {
      clearGlobalContextSearch();
      const inpSearch = document.getElementById('filter-clients-search');
      if (inpSearch) inpSearch.value = '';
      const selEstado = document.getElementById('filter-client-estado');
      if (selEstado) selEstado.value = '';
      const selRouter = document.getElementById('filter-client-router');
      if (selRouter) selRouter.value = '';
      const selGps = document.getElementById('filter-client-gps');
      if (selGps) selGps.value = '';
      const selSort = document.getElementById('filter-clients-sort');
      if (selSort) selSort.value = 'nombre_asc';

      state.clients.colFilters = {};
      state.clients.filter = 'ALL';
      state.clients.search = '';
      state.clients.page = 1;

      document.querySelectorAll('#view-clients .btn-sm').forEach(b => {
        if (b.id && b.id.startsWith('btn-client-filter-')) {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        }
      });
      const btnAll = document.getElementById('btn-client-filter-all');
      if (btnAll) {
        btnAll.classList.remove('btn-secondary');
        btnAll.classList.add('btn-primary');
      }

      loadClientsData();
    }

    function handleClientsSearchInput(val) {
      if (clientsSearchDebounce) clearTimeout(clientsSearchDebounce);
      clientsSearchDebounce = setTimeout(() => {
        state.clients.search = (val || '').trim();
        state.clients.page = 1;
        loadClientsData();
      }, 300);
    }

    function setClientsStatusFilter(status, btn) {
      state.clients.filter = status;
      state.clients.page = 1;

      document.querySelectorAll('#view-clients .btn-sm').forEach(b => {
        if (b.id && b.id.startsWith('btn-client-filter-')) {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        }
      });

      if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      }

      loadClientsData();
    }

    function changeClientsPage(delta) {
      const totalPages = Math.max(1, Math.ceil(state.clients.total / state.clients.limit));
      const newPage = state.clients.page + delta;
      if (newPage >= 1 && newPage <= totalPages) {
        state.clients.page = newPage;
        loadClientsData();
      }
    }

    // Modal para Editar o Asignar Ubicación GPS
    function openClientLocationModal(client) {
      const coords = client.coordenadas_gps || '';
      let lat = '';
      let lng = '';
      if (coords && coords.includes(',')) {
        const parts = coords.split(',');
        lat = parts[0].trim();
        lng = parts[1].trim();
      }

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: var(--radius-sm);">
            <div style="font-weight: 700; color: #fff;">\${escapeHtml(client.nombre)}</div>
            <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">Servicio #\${client.id_servicio} &bull; \${escapeHtml(client.servicio || '')}</div>
          </div>

          <div style="background: rgba(99, 102, 241, 0.08); border: 1px dashed var(--primary); border-radius: var(--radius-sm); padding: 12px;">
            <label class="form-label" style="color: var(--primary);">Pegar Enlace de Google Maps (Recomendado)</label>
            <input type="text" id="loc-input-maps-url" class="form-control" placeholder="https://maps.app.goo.gl/... o https://maps.google.com/?q=..." value="\${client.google_maps_url || ''}" oninput="handleMapsUrlPaste(this.value)">
            <span style="font-size: 11px; color: var(--text-dim); margin-top: 4px; display: block;">Si pegas un link de Google Maps, las coordenadas se extraerán automáticamente.</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">Latitud</label>
              <input type="text" id="loc-input-lat" class="form-control" placeholder="Ej: 20.123456" value="\${lat}">
            </div>
            <div class="form-group">
              <label class="form-label">Longitud</label>
              <input type="text" id="loc-input-lng" class="form-control" placeholder="Ej: -98.765432" value="\${lng}">
            </div>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" onclick="getCurrentDeviceGeolocation()" style="align-self: flex-start;">
            📍 Obtener mi ubicación actual
          </button>

          <div class="form-group">
            <label class="form-label">Dirección / Referencias del Domicilio</label>
            <textarea id="loc-input-direccion" class="form-control" rows="2" placeholder="Calle, número, colonia, color de fachada, portón o referencias...">\${escapeHtml(client.direccion || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Notas Adicionales de Acceso</label>
            <input type="text" id="loc-input-notas" class="form-control" placeholder="Ej: Casa de 2 pisos portón café junto a la tienda" value="\${escapeHtml(client.ubicacion_notas || '')}">
          </div>
        </div>
      \`;

      openModal('Asignar / Editar Ubicación GPS', content, async () => {
        const latVal = document.getElementById('loc-input-lat').value.trim();
        const lngVal = document.getElementById('loc-input-lng').value.trim();
        const urlVal = document.getElementById('loc-input-maps-url').value.trim();
        const dirVal = document.getElementById('loc-input-direccion').value.trim();
        const notVal = document.getElementById('loc-input-notas').value.trim();

        const res = await apiFetch(\`/api/admin/clients/\${client.id_servicio}/location\`, {
          method: 'POST',
          body: JSON.stringify({
            lat: latVal,
            lng: lngVal,
            url: urlVal,
            direccion: dirVal,
            notas: notVal,
          }),
        });

        if (res.success) {
          showToast('Ubicación Guardada', 'Coordenadas y datos actualizados correctamente.', 'success');
          loadClientsData();
          loadDashboardBadgeCounters();
        } else {
          showToast('Error', res.error || 'No se pudo guardar la ubicación.', 'error');
        }
      }, 'Guardar Ubicación');
    }

    function handleMapsUrlPaste(url) {
      if (!url) return;
      const coordMatch = url.match(/(-?\\d{1,2}\\.\\d{4,8})\\s*,\\s*(-?\\d{1,3}\\.\\d{4,8})/);
      if (coordMatch) {
        document.getElementById('loc-input-lat').value = coordMatch[1];
        document.getElementById('loc-input-lng').value = coordMatch[2];
      }
    }

    function getCurrentDeviceGeolocation() {
      if (!navigator.geolocation) {
        showToast('No Compatible', 'Tu navegador no soporta geolocalización.', 'warning');
        return;
      }
      showToast('Obteniendo GPS', 'Leyendo posición del dispositivo...', 'info', 2000);
      navigator.geolocation.getCurrentPosition(
        pos => {
          document.getElementById('loc-input-lat').value = pos.coords.latitude.toFixed(6);
          document.getElementById('loc-input-lng').value = pos.coords.longitude.toFixed(6);
          const mapsUrl = \`https://www.google.com/maps?q=\${pos.coords.latitude.toFixed(6)},\${pos.coords.longitude.toFixed(6)}\`;
          document.getElementById('loc-input-maps-url').value = mapsUrl;
          showToast('Ubicación Detectada', 'Coordenadas cargadas en los campos.', 'success');
        },
        err => {
          showToast('Error GPS', err.message || 'No se pudo obtener la posición.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Modal para Gestión de Múltiples Teléfonos (Principal & Familiares)
    function openClientPhonesModal(client) {
      const mainPhone = client.telefono_principal ? String(client.telefono_principal).replace(/\\D/g, '') : '';
      const extraPhones = Array.isArray(client.telefonos_adicionales) ? client.telefonos_adicionales : [];

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: var(--radius-sm);">
            <div style="font-weight: 700; color: #fff;">\${escapeHtml(client.nombre)}</div>
            <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">Servicio #\${client.id_servicio} &bull; \${escapeHtml(client.servicio || '')}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Teléfono Principal de WhatsApp</label>
            <input type="text" id="phones-input-main" class="form-control" placeholder="10 dígitos (ej. 7711234567)" value="\${mainPhone}">
            <span style="font-size: 11px; color: var(--text-dim); margin-top: 4px; display: block;">Número primario para recordatorios automáticos de pago y avisos de corte.</span>
          </div>

          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <label class="form-label" style="margin-bottom: 0;">Números Adicionales / Familiares</label>
              <button type="button" class="btn btn-secondary btn-sm" onclick="addClientPhoneRow('')" style="padding: 3px 8px; font-size: 11px;">
                + Añadir Familiar
              </button>
            </div>
            <div id="phones-extra-container" style="display: flex; flex-direction: column; gap: 8px;">
              \${extraPhones.map((p, idx) => \`
                <div class="phone-extra-row" style="display: flex; gap: 8px; align-items: center;">
                  <input type="text" class="form-control phone-extra-input" placeholder="Teléfono familiar (10 dígitos)" value="\${p}">
                  <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding: 6px 10px;">✕</button>
                </div>
              \`).join('')}
            </div>
            <span style="font-size: 11px; color: var(--text-dim); margin-top: 6px; display: block;">Si un cliente o sus familiares reportan desde diferentes números, todos quedarán vinculados al mismo contrato de internet.</span>
          </div>
        </div>
      \`;

      openModal('Gestionar Teléfonos de Contacto', content, async () => {
        const mainVal = document.getElementById('phones-input-main').value.trim().replace(/\\D/g, '');
        const extraInputs = document.querySelectorAll('.phone-extra-input');
        const extraVals = [];
        extraInputs.forEach(inp => {
          const val = inp.value.trim().replace(/\\D/g, '');
          if (val && val.length >= 10 && val !== mainVal) {
            extraVals.push(val);
          }
        });

        const res = await apiFetch(\`/api/admin/clients/\${client.id_servicio}/phones\`, {
          method: 'POST',
          body: JSON.stringify({
            principal: mainVal,
            adicionales: extraVals,
          }),
        });

        if (res.success) {
          showToast('Teléfonos Actualizados', 'Números de contacto guardados exitosamente.', 'success');
          loadClientsData();
        } else {
          showToast('Error', res.error || 'No se pudieron actualizar los teléfonos.', 'error');
        }
      }, 'Guardar Teléfonos');
    }

    function addClientPhoneRow(val = '') {
      const container = document.getElementById('phones-extra-container');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'phone-extra-row';
      row.style = 'display: flex; gap: 8px; align-items: center;';
      row.innerHTML = \`
        <input type="text" class="form-control phone-extra-input" placeholder="Teléfono familiar (10 dígitos)" value="\${val}">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding: 6px 10px;">✕</button>
      \`;
      container.appendChild(row);
    }

    // Modal para Despachar Orden de Trabajo / GPS a Técnicos vía WhatsApp
    async function openDispatchModal(client) {
      if (!state.technicians || state.technicians.length === 0) {
        try {
          const res = await apiFetch('/api/technicians');
          state.technicians = res.technicians || [];
        } catch {}
      }

      const activeTechs = (state.technicians || []).filter(t => t.is_active === 1 || t.is_active === true || t.is_active === undefined);
      const coords = client.coordenadas_gps || '';
      const mapsUrl = client.google_maps_url || (coords ? \`https://www.google.com/maps?q=\${coords}\` : '');

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Card Resumen Cliente -->
          <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: var(--radius-md);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <strong style="font-size: 14px; color: #fff;">\${escapeHtml(client.nombre)}</strong>
                <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">(#\${client.id_servicio})</span>
              </div>
              <span class="badge badge-purple">\${escapeHtml(client.plan_internet || 'Plan Internet')}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-dim); display: flex; flex-direction: column; gap: 3px;">
              <div><strong>Dirección:</strong> \${escapeHtml(client.direccion || 'Sin dirección registrada')}</div>
              <div><strong>IP:</strong> <span class="font-mono">\${client.ip || 'N/A'}</span> &bull; <strong>SN:</strong> <span class="font-mono">\${client.sn_onu || 'N/A'}</span></div>
              \${coords ? \`<div><strong>Coordenadas:</strong> <span class="font-mono" style="color: #34d399;">\${coords}</span></div>\` : '<div style="color: var(--accent-amber);">Nota: Este cliente no tiene coordenadas GPS registradas aún.</div>'}
            </div>
          </div>

          <!-- Selección de Técnicos -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="margin-bottom: 0;">Seleccionar Técnicos Destinatarios (WhatsApp)</label>
              \${activeTechs.length > 0 ? \`
                <button type="button" class="btn btn-secondary btn-xs" onclick="toggleAllDispatchTechs(this)">
                  Seleccionar Todos
                </button>
              \` : ''}
            </div>

            \${activeTechs.length === 0 ? \`
              <div style="padding: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--accent-amber); border-radius: var(--radius-sm); font-size: 12px; color: #fcd34d;">
                No hay técnicos registrados activos en el sistema. Puedes ingresar un número de WhatsApp abajo.
              </div>
            \` : \`
              <div id="dispatch-tech-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; padding: 4px; border: 1px solid var(--card-border); border-radius: var(--radius-sm); background: rgba(0,0,0,0.2);">
                \${activeTechs.map(t => \`
                  <label style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: var(--radius-xs); background: rgba(255,255,255,0.02); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                    <input type="checkbox" class="dispatch-tech-checkbox" value="\${t.phone}" style="width: 16px; height: 16px; accent-color: var(--primary);">
                    <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong style="font-size: 12.5px; color: #fff;">\${escapeHtml(t.name)}</strong>
                        <span class="font-mono" style="font-size: 11px; color: var(--text-dim); margin-left: 6px;">\${t.phone}</span>
                      </div>
                      <span class="badge \${t.role === 'ADMIN' ? 'badge-primary' : 'badge-cyan'}" style="font-size: 10px;">\${t.role || 'TECNICO'}</span>
                    </div>
                  </label>
                \`).join('')}
              </div>
            \`}
          </div>

          <!-- Número adicional manual -->
          <div>
            <label class="form-label">Número WhatsApp adicional (opcional)</label>
            <input type="text" id="dispatch-custom-phone" class="form-control" placeholder="10 dígitos (ej. 7711234567)">
          </div>

          <!-- Descripción del trabajo -->
          <div>
            <label class="form-label">Descripción del trabajo a realizar</label>
            <textarea id="dispatch-custom-notes" class="form-control" rows="2" placeholder="Ej: Revisar potencia óptica en caja NAP / Cable cortado / Cambio de drop..."></textarea>
          </div>
        </div>
      \`;

      openModal('Asignar Orden de Trabajo a Técnicos', content, async () => {
        const checkboxes = document.querySelectorAll('.dispatch-tech-checkbox:checked');
        const selectedPhones = Array.from(checkboxes).map(cb => cb.value);
        const customPhone = (document.getElementById('dispatch-custom-phone')?.value || '').trim().replace(/\\D/g, '');
        if (customPhone && customPhone.length >= 10 && !selectedPhones.includes(customPhone)) {
          selectedPhones.push(customPhone);
        }

        if (selectedPhones.length === 0) {
          showToast('Error', 'Debes seleccionar al menos un técnico o ingresar un número de WhatsApp.', 'error');
          return;
        }

        const customNotes = (document.getElementById('dispatch-custom-notes')?.value || '').trim();

        showToast('Asignando Orden', \`Enviando a \${selectedPhones.length} técnico(s)...\`, 'info', 2000);

        const res = await apiFetch(\`/api/admin/clients/\${client.id_servicio}/dispatch\`, {
          method: 'POST',
          body: JSON.stringify({
            tech_phones: selectedPhones,
            custom_notes: customNotes,
          }),
        });

        if (res.success) {
          showToast('Asignación Exitosa', res.message || \`Orden enviada a \${res.sent_count} técnico(s) por WhatsApp.\`, 'success');
        } else {
          showToast('Error de Asignación', res.error || 'No se pudo enviar la orden.', 'error');
        }
      }, 'Asignar por WhatsApp');
    }

    function toggleAllDispatchTechs(btn) {
      const checkboxes = document.querySelectorAll('.dispatch-tech-checkbox');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
      btn.innerText = allChecked ? 'Seleccionar Todos' : 'Deseleccionar Todos';
    }

    // Modal para Ver Ficha Completa del Cliente
    async function openClientDetailModal(idServicio) {
      showToast('Consultando Ficha', 'Obteniendo datos completos del cliente...', 'info', 1500);
      try {
        const res = await apiFetch(\`/api/admin/clients/\${idServicio}\`);
        if (!res.success || !res.client) {
          showToast('Error', 'No se encontró la información del cliente.', 'error');
          return;
        }

        const c = res.client;
        const coords = c.coordenadas_gps || '';
        const mapsUrl = c.google_maps_url || (coords ? \`https://www.google.com/maps?q=\${coords}\` : '');

        const content = \`
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Header Summary -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: var(--radius-md);">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: #fff;">\${escapeHtml(c.nombre)}</h3>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
                  Servicio #\${c.id_servicio} &bull; \${escapeHtml(c.servicio || '')}
                </div>
              </div>
              <div style="display: flex; gap: 6px;">
                <span class="badge \${String(c.estado).toLowerCase().includes('act') ? 'badge-success' : 'badge-danger'}">
                  \${c.estado}
                </span>
                <span class="badge badge-purple">
                  Corte Día \${c.dia_corte || '--'}
                </span>
              </div>
            </div>

            <!-- Grid Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="glass-card" style="padding: 12px;">
                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">💳 Facturación & Plan</div>
                <div style="font-size: 13px;"><strong>Plan:</strong> \${escapeHtml(c.plan_internet || '--')}</div>
                <div style="font-size: 13px;"><strong>Precio:</strong> $\${c.precio_plan || 0} MXN</div>
                <div style="font-size: 13px;"><strong>Saldo Adeudo:</strong> $\${c.saldo || 0} MXN</div>
                <div style="font-size: 13px;"><strong>Facturas:</strong> \${c.estado_facturas || 'Pagadas'}</div>
              </div>

              <div class="glass-card" style="padding: 12px;">
                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">🔧 Red & SmartOLT</div>
                <div style="font-size: 13px;"><strong>IP Asignada:</strong> <span style="font-family: var(--font-mono);">\${c.ip || '--'}</span></div>
                <div style="font-size: 13px;"><strong>Serie ONU:</strong> <span style="font-family: var(--font-mono); color: var(--accent-cyan);">\${c.sn_onu || '--'}</span></div>
                <div style="font-size: 13px;"><strong>Zona / OLT:</strong> \${escapeHtml(c.zona_smartolt || c.router || '--')}</div>
                <div style="font-size: 13px;"><strong>Perfil Velocidad:</strong> \${escapeHtml(c.perfil_velocidad || '--')}</div>
              </div>
            </div>

            <!-- Ubicación GPS -->
            <div class="glass-card" style="padding: 12px;">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">📍 Geolocalización & Domicilio</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div>
                  <strong>Coordenadas:</strong>
                  <span style="font-family: var(--font-mono); color: \${coords ? '#34d399' : 'var(--text-dim)'}; margin-left: 6px;">
                    \${coords || 'Sin coordenadas registradas'}
                  </span>
                </div>
                \${mapsUrl ? \`
                  <a href="\${mapsUrl}" target="_blank" class="btn btn-primary btn-sm" style="padding: 3px 10px; font-size: 11px; text-decoration: none;">
                    🗺️ Abrir en Google Maps
                  </a>
                \` : ''}
              </div>
              <div style="font-size: 12.5px; color: var(--text-main); margin-top: 4px;">
                <strong>Dirección:</strong> \${escapeHtml(c.direccion || 'Sin dirección registrada')}
              </div>
              \${c.ubicacion_notas ? \`
                <div style="font-size: 12px; color: var(--accent-cyan); margin-top: 4px;">
                  <strong>Notas de acceso:</strong> \${escapeHtml(c.ubicacion_notas)}
                </div>
              \` : ''}
            </div>

            <!-- Teléfonos de Contacto -->
            <div class="glass-card" style="padding: 12px;">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">📱 Teléfonos Vinculados</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                \${c.telefono_principal ? \`
                  <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 12px; padding: 4px 10px;">
                    Principal: \${c.telefono_principal}
                  </span>
                \` : ''}
                \${(c.telefonos_adicionales || []).map(p => \`
                  <span class="badge badge-purple" style="font-family: var(--font-mono); font-size: 11.5px; padding: 4px 10px;">
                    Familiar: \${p}
                  </span>
                \`).join('')}
              </div>
            </div>

            <!-- Tickets de Soporte Asociados -->
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 8px;">Historial de Reportes & Tickets (\${(c.tickets || []).length})</div>
              \${(c.tickets && c.tickets.length > 0) ? \`
                <div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
                  \${c.tickets.map(t => \`
                    <div style="padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--card-border); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <span style="font-weight: 700; font-family: var(--font-mono); color: var(--primary);">#\${t.folio}</span>
                        <span style="margin-left: 8px; font-size: 12px;">\${escapeHtml(t.issue_summary)}</span>
                      </div>
                      <span class="badge \${t.status === 'ABIERTO' ? 'badge-warning' : (t.status === 'RESUELTO' ? 'badge-success' : 'badge-info')}">
                        \${t.status}
                      </span>
                    </div>
                  \`).join('')}
                </div>
              \` : '<div style="font-size: 12px; color: var(--text-dim);">Sin reportes de falla registrados para este cliente.</div>'}
            </div>
          </div>
        \`;

        openModal('Ficha de Abonado', content, null, 'Cerrar');
      } catch (err) {
        showToast('Error', 'No se pudo abrir la ficha del cliente.', 'error');
      }
    }

    function copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast('Copiado', \`Teléfono \${text} copiado al portapapeles.\`, 'info', 1800);
      }
    }

    // ==========================================
    // CAMBIO DE MÓDEM (REEMPLAZO DE ONU)
    // ==========================================
    state.swap = {
      oldOnu: null,
      unconfigured: [],
      newOnu: null,
      history: [],
      debounceTimer: null,
    };

    async function loadModemSwapData() {
      loadSwapUnconfiguredOnus();
      loadModemSwapHistory();
    }

    function debounceSwapSearchOld(val) {
      clearTimeout(state.swap.debounceTimer);
      state.swap.debounceTimer = setTimeout(() => {
        searchSwapOldOnus(val);
      }, 300);
    }

    async function searchSwapOldOnus(query) {
      const dropdown = document.getElementById('swap-old-dropdown-results');
      const q = (query || '').trim();
      if (!q || q.length < 2) {
        dropdown.style.display = 'none';
        return;
      }

      try {
        const res = await apiFetch(\`/api/modem-swap/onus?q=\${encodeURIComponent(q)}&limit=15\`);
        if (!res.success || !res.onus || res.onus.length === 0) {
          dropdown.innerHTML = '<div style="padding: 10px 14px; color: var(--text-dim); font-size: 12px;">No se encontraron ONUs activas.</div>';
          dropdown.style.display = 'block';
          return;
        }

        dropdown.innerHTML = res.onus.map(o => \`
          <div class="swap-search-item" onclick="selectSwapOldOnu('\${escapeHtml(o.unique_external_id || o.sn)}')" style="padding: 10px 14px; border-bottom: 1px solid var(--card-border); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
            <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">\${escapeHtml(o.name || 'Sin Nombre')}</div>
            <div style="font-size: 11.5px; color: var(--text-muted); display: flex; gap: 12px; margin-top: 3px; flex-wrap: wrap;">
              <span>🆔 SN: <strong style="color: var(--accent-cyan);">\${escapeHtml(o.sn || o.unique_external_id)}</strong></span>
              <span>🌐 IP: <strong>\${escapeHtml(o.ip_address || 'N/A')}</strong></span>
              <span>📍 Zona: \${escapeHtml(o.zone_name || 'Actopan')}</span>
              <span>📦 Plan: \${escapeHtml(o.speed_profile || '40MB')}</span>
            </div>
          </div>
        \`).join('');
        dropdown.style.display = 'block';
      } catch (err) {
        dropdown.style.display = 'none';
      }
    }

    async function selectSwapOldOnu(id) {
      const dropdown = document.getElementById('swap-old-dropdown-results');
      dropdown.style.display = 'none';
      const card = document.getElementById('swap-old-selected-card');
      card.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 14px;">Cargando datos completos de la ONU...</div>';

      try {
        const res = await apiFetch(\`/api/modem-swap/onu-details/\${encodeURIComponent(id)}\`);
        if (res.success && res.details) {
          state.swap.oldOnu = res.details;
          const d = res.details;
          card.innerHTML = \`
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <div style="font-size: 14px; font-weight: 800; color: var(--text-main);">\${escapeHtml(d.name)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">ID Externo: \${escapeHtml(d.unique_external_id)}</div>
              </div>
              <span class="badge badge-danger">Módem a Retirar</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-top: 8px; background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm);">
              <div>🆔 <strong>SN Actual:</strong> <span style="font-family: monospace; color: var(--accent-rose); font-weight: 700;">\${escapeHtml(d.sn)}</span></div>
              <div>🌐 <strong>IP Asignada:</strong> <span style="font-weight: 700; color: var(--accent-cyan);">\${escapeHtml(d.ip_address || 'N/A')}</span></div>
              <div>📡 <strong>VLAN:</strong> \${escapeHtml(d.vlan || '510')}</div>
              <div>📍 <strong>Zona:</strong> \${escapeHtml(d.zone || 'Actopan')}</div>
              <div>📦 <strong>Plan / Velocidad:</strong> \${escapeHtml(d.download_speed_profile_name || '40MB')}</div>
              <div>🚪 <strong>OLT / Puerto:</strong> \${escapeHtml(d.olt_name || d.olt_id || 'OLT-Actopan')} (B:\${d.board}/P:\${d.port})</div>
              <div>🛡️ <strong>Gateway:</strong> \${escapeHtml(d.gateway || '172.19.2.254')}</div>
              <div>📠 <strong>Modelo ONT:</strong> \${escapeHtml(d.onu_type || 'EG8041V5')}</div>
            </div>
          \`;
          document.getElementById('swap-search-old-input').value = d.name;
          updateSwapSummary();
        } else {
          card.innerHTML = '<div style="color: var(--accent-rose); padding: 10px; font-size: 12px;">Error al obtener datos de la ONU.</div>';
        }
      } catch (err) {
        card.innerHTML = '<div style="color: var(--accent-rose); padding: 10px; font-size: 12px;">No se pudo contactar al servidor.</div>';
      }
    }

    async function loadSwapUnconfiguredOnus() {
      const select = document.getElementById('swap-select-unconfigured');
      select.innerHTML = '<option value="">Escanear OLTs en curso...</option>';

      try {
        const res = await apiFetch('/api/smartolt/unconfigured');
        if (res.success && Array.isArray(res.unconfigured)) {
          state.swap.unconfigured = res.unconfigured;
          if (res.unconfigured.length === 0) {
            select.innerHTML = '<option value="">-- No hay ONUs sin autorizar detectadas en SmartOLT --</option>';
          } else {
            select.innerHTML = '<option value="">-- Seleccionar ONU Sin Autorizar (' + res.unconfigured.length + ' detectadas) --</option>' +
              res.unconfigured.map(u => \`
                <option value="\${escapeHtml(u.sn)}">\${escapeHtml(u.sn)} | \${escapeHtml(u.onu_type_name || u.onu_type || 'ONT')} | \${escapeHtml(u.olt_name || ('OLT ' + u.olt_id))} (B:\${u.board}/P:\${u.port}) [\${escapeHtml(u.onu_signal_1490 || u.onu_signal || 'Rx')}]</option>
              \`).join('');
          }
        } else {
          select.innerHTML = '<option value="">-- Error al consultar ONUs sin autorizar --</option>';
        }
      } catch (err) {
        select.innerHTML = '<option value="">-- No se pudo conectar con SmartOLT --</option>';
      }
    }

    function handleSelectSwapUnconfigured(sn) {
      if (!sn) return;
      document.getElementById('swap-input-new-sn').value = sn;
      const found = state.swap.unconfigured.find(u => u.sn === sn);
      const card = document.getElementById('swap-new-selected-card');

      if (found) {
        state.swap.newOnu = found;
        card.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--accent-emerald);">Módem Sin Configurar Detectado</div>
              <div style="font-size: 11px; color: var(--text-muted);">\${escapeHtml(found.olt_name || ('OLT ID: ' + found.olt_id))}</div>
            </div>
            <span class="badge badge-success">Nuevo Equipo</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-top: 8px; background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm);">
            <div>🆔 <strong>Nuevo SN:</strong> <span style="font-family: monospace; color: var(--accent-emerald); font-weight: 700;">\${escapeHtml(found.sn)}</span></div>
            <div>📠 <strong>Modelo:</strong> \${escapeHtml(found.onu_type_name || found.onu_type || 'EG8041V5')}</div>
            <div>🚪 <strong>Board / Puerto:</strong> Board \${found.board} / Puerto \${found.port}</div>
            <div>📶 <strong>Señal Óptica Rx:</strong> <span style="color: var(--accent-cyan); font-weight: 700;">\${escapeHtml(found.onu_signal_1490 || found.onu_signal || 'Detectada')}</span></div>
          </div>
        \`;
      } else {
        state.swap.newOnu = { sn };
        card.innerHTML = \`
          <div style="font-size: 13px; font-weight: 700; color: var(--accent-emerald);">Nuevo SN Ingresado: <code>\${escapeHtml(sn)}</code></div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Se autorizará en SmartOLT con los mismos parámetros de red del cliente.</div>
        \`;
      }
      updateSwapSummary();
    }

    function updateSwapSummary() {
      const summaryBox = document.getElementById('swap-summary-box');
      const btnExecute = document.getElementById('btn-execute-swap');
      const oldOnu = state.swap.oldOnu;
      const newSn = document.getElementById('swap-input-new-sn')?.value?.trim().toUpperCase() || state.swap.newOnu?.sn;

      if (!oldOnu || !newSn) {
        summaryBox.innerHTML = \`
          <div style="font-size: 13px; color: var(--text-muted); text-align: center;">
            Completa el Paso 1 (Módem Actual) y el Paso 2 (Nuevo Módem) para habilitar la ejecución del reemplazo.
          </div>
        \`;
        if (btnExecute) btnExecute.disabled = true;
        return;
      }

      if (oldOnu.sn === newSn) {
        summaryBox.innerHTML = \`
          <div style="font-size: 13px; color: var(--accent-rose); text-align: center; font-weight: 700;">
            ⚠️ El nuevo número de serie (SN) no puede ser idéntico al módem actual (\${oldOnu.sn}).
          </div>
        \`;
        if (btnExecute) btnExecute.disabled = true;
        return;
      }

      summaryBox.innerHTML = \`
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center;">
          <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: var(--radius-sm); padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--accent-rose); text-transform: uppercase;">🔴 Módem Anterior (Retirar)</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-top: 4px;">\${escapeHtml(oldOnu.name)}</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">SN: <strong style="color: var(--accent-rose);">\${escapeHtml(oldOnu.sn)}</strong></div>
            <div style="font-size: 11px; color: var(--accent-cyan); margin-top: 4px;">IP: \${escapeHtml(oldOnu.ip_address || 'N/A')} | VLAN: \${escapeHtml(oldOnu.vlan || '510')}</div>
          </div>

          <div style="font-size: 24px; color: var(--primary); text-align: center;">➔</div>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--accent-emerald); text-transform: uppercase;">🟢 Nuevo Módem (Dar de Alta)</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-top: 4px;">\${escapeHtml(oldOnu.name)}</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">Nuevo SN: <strong style="color: var(--accent-emerald);">\${escapeHtml(newSn)}</strong></div>
            <div style="font-size: 11px; color: var(--accent-cyan); margin-top: 4px;">Conserva IP: \${escapeHtml(oldOnu.ip_address || 'N/A')} (Mismos datos)</div>
          </div>
        </div>
      \`;

      if (btnExecute) btnExecute.disabled = false;
    }

    async function handleExecuteModemSwap() {
      const oldOnu = state.swap.oldOnu;
      const newSn = document.getElementById('swap-input-new-sn')?.value?.trim().toUpperCase();
      const notifyGroup = document.getElementById('swap-checkbox-notify-group')?.checked !== false;

      if (!oldOnu || !newSn) {
        showToast('Atención', 'Selecciona el módem actual y el nuevo SN.', 'warning');
        return;
      }

      showConfirmDialog(
        'Confirmar Cambio de Módem',
        \`¿Estás seguro de realizar el cambio de módem para <strong>\${escapeHtml(oldOnu.name)}</strong>?<br><br>
        • Se eliminará de SmartOLT el módem anterior <code>\${escapeHtml(oldOnu.sn)}</code>.<br>
        • Se autorizará el nuevo módem <code>\${escapeHtml(newSn)}</code> con la <strong>misma IP (\${escapeHtml(oldOnu.ip_address)})</strong> y misma VLAN (\${escapeHtml(oldOnu.vlan)}).<br>
        • Se enviará notificación al grupo de WhatsApp con formato: <code>\${escapeHtml(oldOnu.name)} \${escapeHtml(oldOnu.ip_address)} \${escapeHtml(oldOnu.zone || 'Actopan')} CAMBIO DE MODEM</code>.\`,
        async () => {
          const btn = document.getElementById('btn-execute-swap');
          const statusDiv = document.getElementById('swap-execution-status');
          btn.disabled = true;
          btn.innerText = '⏳ Ejecutando Cambio...';
          statusDiv.innerText = 'Eliminando módem anterior y aprovisionando nuevo equipo en SmartOLT...';

          try {
            const res = await apiFetch('/api/modem-swap/execute', {
              method: 'POST',
              body: JSON.stringify({
                old_onu_id: oldOnu.unique_external_id || oldOnu.sn,
                new_sn: newSn,
                notify_group: notifyGroup,
              }),
            });

            if (res.success) {
              showToast('¡Cambio Exitoso!', res.message || 'Módem reemplazado y configurado en SmartOLT.', 'success', 6000);
              statusDiv.innerHTML = '<span style="color: var(--accent-emerald);">✅ ¡Cambio de módem completado exitosamente!</span>';
              
              // Limpiar selección
              state.swap.oldOnu = null;
              state.swap.newOnu = null;
              document.getElementById('swap-search-old-input').value = '';
              document.getElementById('swap-input-new-sn').value = '';
              document.getElementById('swap-old-selected-card').innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px 10px; font-size: 12.5px;">👈 Utiliza el buscador para seleccionar el cliente o módem actual.</div>';
              document.getElementById('swap-new-selected-card').innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px 10px; font-size: 12.5px;">⚡ Selecciona una ONU sin autorizar o ingresa el SN del nuevo módem.</div>';
              updateSwapSummary();

              // Recargar datos
              loadSwapUnconfiguredOnus();
              loadModemSwapHistory();
            } else {
              showToast('Error en Cambio', res.message || res.error || 'No se pudo completar el cambio.', 'error', 6000);
              statusDiv.innerHTML = \`<span style="color: var(--accent-rose);">❌ \${escapeHtml(res.message || res.error)}</span>\`;
            }
          } catch (err) {
            showToast('Error', 'Fallo de conexión al ejecutar el cambio de módem.', 'error');
            statusDiv.innerHTML = '<span style="color: var(--accent-rose);">❌ Fallo de conexión con el servidor.</span>';
          } finally {
            btn.disabled = false;
            btn.innerText = '🔄 Ejecutar Cambio de Módem';
          }
        },
        false
      );
    }

    async function loadModemSwapHistory() {
      try {
        const res = await apiFetch('/api/modem-swap/history?limit=100');
        if (res.success && Array.isArray(res.history)) {
          state.swapHistory = res.history;
          filterSwapHistoryTable();
        }
      } catch (err) {
        const tbody = document.getElementById('table-swap-history-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--accent-rose); padding: 20px;">Error al cargar historial.</td></tr>';
      }
    }

    function renderSwapHistoryTable(history) {
      const tbody = document.getElementById('table-swap-history-body');
      if (!tbody) return;
      if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 20px;">No se encontraron registros de cambio de módem con los filtros aplicados.</td></tr>';
        return;
      }

      tbody.innerHTML = history.map(item => \`
        <tr>
          <td style="white-space: nowrap; font-size: 11.5px;">\${formatShortDate(item.created_at)}</td>
          <td style="font-weight: 700;">\${escapeHtml(item.client_name)}</td>
          <td><span class="badge badge-danger" style="font-family: monospace;">\${escapeHtml(item.old_sn)}</span></td>
          <td><span class="badge badge-success" style="font-family: monospace;">\${escapeHtml(item.new_sn)}</span></td>
          <td><strong>\${escapeHtml(item.ip_address || 'N/A')}</strong> <span style="font-size: 11px; color: var(--text-muted);">(VLAN \${escapeHtml(item.vlan || '510')})</span></td>
          <td>\${escapeHtml(item.zone || 'Actopan')}</td>
          <td style="font-size: 12px; color: var(--text-muted);">\${escapeHtml(item.technician_name || 'Admin')}</td>
          <td>
            <span class="badge \${item.status === 'COMPLETADO' ? 'badge-success' : (item.status === 'ERROR' ? 'badge-danger' : 'badge-warning')}">
              \${escapeHtml(item.status || 'COMPLETADO')}
            </span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-xs" onclick="handleSelectSwapUnconfigured('\${escapeHtml(item.new_sn)}')" title="Re-inspeccionar Módem">
              🔍 Ver
            </button>
          </td>
        </tr>
      \`).join('');
    }

    function filterSwapHistoryTable() {
      const q = (document.getElementById('global-context-search')?.value || '').toLowerCase().trim();
      const fStatus = (document.getElementById('filter-swap-status')?.value || '').toUpperCase().trim();

      const items = state.swapHistory || [];
      const filtered = items.filter(it => {
        if (fStatus && String(it.status || '').toUpperCase() !== fStatus) return false;
        if (!matchesFuzzyTokens(q, it.client_name, it.old_sn, it.new_sn, it.ip_address, it.zone, it.technician_name, it.status, formatShortDate(it.created_at))) return false;
        return true;
      });

      renderSwapHistoryTable(filtered);
    }

    let currentSwapSort = { col: 'date', dir: 'desc' };
    function sortSwapHistoryBy(col) {
      currentSwapSort = parseSortParam(col, currentSwapSort);

      state.swapHistory.sort((a, b) => {
        let valA = a[currentSwapSort.col];
        let valB = b[currentSwapSort.col];
        if (currentSwapSort.col === 'date' || currentSwapSort.col === 'created_at') {
          valA = a.created_at;
          valB = b.created_at;
        } else if (currentSwapSort.col === 'client' || currentSwapSort.col === 'client_name') {
          valA = a.client_name;
          valB = b.client_name;
        } else if (currentSwapSort.col === 'old_sn') {
          valA = a.old_sn;
          valB = b.old_sn;
        } else if (currentSwapSort.col === 'new_sn') {
          valA = a.new_sn;
          valB = b.new_sn;
        } else if (currentSwapSort.col === 'ip' || currentSwapSort.col === 'ip_address') {
          valA = a.ip_address;
          valB = b.ip_address;
        } else if (currentSwapSort.col === 'zone') {
          valA = a.zone;
          valB = b.zone;
        } else if (currentSwapSort.col === 'tech' || currentSwapSort.col === 'technician_name') {
          valA = a.technician_name;
          valB = b.technician_name;
        } else if (currentSwapSort.col === 'status') {
          valA = a.status;
          valB = b.status;
        }
        return universalCompare(valA, valB, currentSwapSort.dir);
      });

      filterSwapHistoryTable();
    }

    function clearSwapHistoryFilters() {
      clearGlobalContextSearch();
      const selStatus = document.getElementById('filter-swap-status');
      if (selStatus) selStatus.value = '';
      const selSort = document.getElementById('filter-swap-sort');
      if (selSort) selSort.value = 'date_desc';
      renderSwapHistoryTable(state.swapHistory || []);
    }

    function formatShortDate(iso) {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return iso;
      }
    }

    // Utilities
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatShortTime(iso) {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

    // Bootstrap
    function initApp() {
      initSSEStream();
      const initialView = parseHashView() || 'dashboard';
      navigateTo(initialView, false);
      loadDashboardBadgeCounters();
      setInterval(loadDashboardBadgeCounters, 15000);
    }

    // Global History & Hash Change Listeners for Back/Forward Browser Navigation
    window.addEventListener('popstate', (e) => {
      const hashView = parseHashView() || 'dashboard';
      if (hashView) {
        navigateTo(hashView, false);
        if (hashView === 'live-chat' && state.activeChatPhone) {
          selectChat(state.activeChatPhone);
        } else if (hashView === 'live-chat') {
          toggleMobileChatThreads();
        }
      }
    });

    window.addEventListener('hashchange', () => {
      const hashView = parseHashView() || 'dashboard';
      if (hashView && hashView !== state.currentView) {
        navigateTo(hashView, false);
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      checkAuthSession();
    });
  </script>
</body>
</html>
`;
}
