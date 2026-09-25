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
      display: none;
    }

    /* Persistent Toggle Button (NEVER vanishes) */
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

    #sidebar.collapsed .sidebar-header {
      justify-content: center;
      padding: 0;
    }

    #sidebar.collapsed .sidebar-brand {
      display: none;
    }

    #sidebar.collapsed .sidebar-toggle-btn {
      margin: 0 auto;
      width: 36px;
      height: 36px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
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
      display: none;
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

    #sidebar.collapsed .nav-badge,
    #sidebar.collapsed .nav-text {
      display: none;
    }

    #sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 12px 0;
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
      display: none;
    }

    #sidebar.collapsed .sidebar-footer {
      flex-direction: column;
      padding: 12px 0;
      gap: 10px;
      justify-content: center;
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

    /* Main Content Area */
    main#main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    aside#sidebar.collapsed + main#main-content {
      margin-left: var(--sidebar-collapsed-width);
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
    }

    .glass-card:hover {
      border-color: var(--card-border-hover);
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

    /* Live Chat View */
    .chat-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      height: calc(100vh - var(--topbar-height) - 48px);
      max-height: calc(100vh - var(--topbar-height) - 48px);
      background: var(--bg-surface);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      position: relative;
    }

    .chat-sidebar {
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.2);
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .chat-search-header {
      padding: 14px;
      border-bottom: 1px solid var(--card-border);
      flex-shrink: 0;
    }

    .chat-threads-list {
      flex: 1 1 auto;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .chat-thread-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: var(--transition);
    }

    .chat-thread-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .btn-thread-delete {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      border-radius: 6px;
      padding: 4px 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      opacity: 0.6;
      margin-left: auto;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-thread-delete:hover {
      background: rgba(239, 68, 68, 0.35);
      border-color: rgba(239, 68, 68, 0.6);
      color: #fff;
      opacity: 1;
      transform: scale(1.1);
    }

    .chat-thread-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-left: 3px solid var(--primary);
    }

    .thread-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #334155, #1e293b);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-cyan);
      flex-shrink: 0;
      border: 1px solid var(--card-border);
    }

    .thread-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .thread-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .thread-name {
      font-weight: 600;
      font-size: 13.5px;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .thread-time {
      font-size: 11px;
      color: var(--text-dim);
      font-family: var(--font-mono);
    }

    .thread-preview {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-main-area {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      position: relative;
      background: radial-gradient(circle at 50% 50%, rgba(17, 24, 39, 0.6) 0%, rgba(9, 13, 22, 0.95) 100%);
    }

    .chat-header-bar {
      padding: 10px 18px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(11, 15, 25, 0.85);
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
      gap: 10px;
      min-width: 0;
      flex-shrink: 1;
    }

    .chat-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      flex-wrap: nowrap;
    }

    .btn-xs {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      height: 28px;
    }

    .chat-messages-container {
      flex: 1 1 auto;
      min-height: 0;
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .chat-bubble {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      position: relative;
      word-wrap: break-word;
      animation: fadeInMsg 0.2s ease-out;
    }

    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-bubble.in {
      align-self: flex-start;
      background: #1e293b;
      color: #f1f5f9;
      border-bottom-left-radius: 4px;
      border: 1px solid var(--card-border);
    }

    .chat-bubble.out {
      align-self: flex-end;
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }

    .bubble-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 4px;
      font-family: var(--font-mono);
    }

    .chat-input-bar {
      padding: 12px 18px;
      border-top: 1px solid var(--card-border);
      background: rgba(11, 15, 25, 0.95);
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
      position: relative;
      z-index: 5;
    }

    .chat-input-box {
      flex: 1;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: #fff;
      font-family: var(--font-main);
      font-size: 13.5px;
      resize: none;
      min-height: 42px;
      max-height: 120px;
      outline: none;
    }

    .chat-input-box:focus {
      border-color: var(--primary);
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

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .kanban-board { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 900px) {
      .chat-layout {
        grid-template-columns: 1fr;
        height: calc(100vh - var(--topbar-height) - 20px);
        max-height: calc(100vh - var(--topbar-height) - 20px);
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
      .chat-header-actions {
        gap: 4px;
      }
      .chat-header-actions .btn-xs span:not(.badge) {
        display: none;
      }
    }

    @media (max-width: 768px) {
      aside#sidebar { transform: translateX(-100%); }
      aside#sidebar.mobile-open { transform: translateX(0); width: 260px; }
      main#main-content { margin-left: 0 !important; }
      .mobile-menu-btn { display: flex; }
      .kanban-board { grid-template-columns: 1fr; }
      .grid-metrics { grid-template-columns: 1fr 1fr; }
      .view-container { padding: 12px; }
    }

    @media (max-width: 480px) {
      .grid-metrics { grid-template-columns: 1fr; }
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
        <div class="nav-category">Operación</div>
        <div class="nav-item active" data-view="dashboard" onclick="navigateTo('dashboard')" title="Dashboard">
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
        <div class="nav-item" data-view="clients" onclick="navigateTo('clients')" title="Directorio de Clientes & GPS">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M20 8c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 8 0z"></path><circle cx="16" cy="8" r="1.5"></circle></svg>
          </span>
          <span class="nav-text">Clientes & GPS</span>
          <span id="badge-clients-total" class="nav-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="tickets" onclick="navigateTo('tickets')" title="Mesa de Tickets">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
          </span>
          <span class="nav-text">Mesa de Tickets</span>
          <span id="badge-tickets-open" class="nav-badge alert-badge" style="display: none;">0</span>
        </div>

        <div class="nav-category">Red & Gestión</div>
        <div class="nav-item" data-view="ipam" onclick="navigateTo('ipam')" title="IPAM & Pools">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          </span>
          <span class="nav-text">IPAM & Pools</span>
          <span id="badge-unconfigured-onus" class="nav-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="audit" onclick="navigateTo('audit')" title="Comparativa SmartOLT vs WispHub & Sincronización por VLAN">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </span>
          <span class="nav-text">Comparar & Sync WispHub</span>
        </div>
        <div class="nav-item" data-view="provisioning" onclick="navigateTo('provisioning')" title="Aprovisionamiento TR-069 & IPv6 Dual Stack">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="m13 2-2 2.5h3L11 9h4l-5 7 1.5-4.5H8.5L13 2z"></path></svg>
          </span>
          <span class="nav-text">Aprovisionar IPv6 & Sync</span>
          <span id="badge-prov-pending" class="nav-badge alert-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="technicians" onclick="navigateTo('technicians')" title="Técnicos & PINs">
          <span class="nav-icon">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
          </span>
          <span class="nav-text">Técnicos & PINs</span>
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

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 700;">Diagnóstico Rápido de Conectividad</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
              <button class="btn btn-secondary" onclick="testServiceConnection('turso')">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                <span>Turso DB</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('smartolt')">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span>SmartOLT</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('wisphub')">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                <span>WispHub</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('groq')">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                <span>Groq AI</span>
              </button>
            </div>
          </div>

          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 700;">Acciones de Sincronización</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary" onclick="triggerSmartOltSync(false)">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
                <span>Sincronizar SmartOLT</span>
              </button>
              <button class="btn btn-secondary" onclick="triggerWisphubSync()">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
                <span>Sincronizar WispHub</span>
              </button>
            </div>
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
          <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">Últimas Interacciones del Bot</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Teléfono</th>
                  <th>Cliente</th>
                  <th>Flujo</th>
                  <th>Mensaje</th>
                </tr>
              </thead>
              <tbody id="table-recent-logs-body">
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Cargando interacciones...</td></tr>
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
              <input type="text" id="chat-filter-input" class="form-control" placeholder="Buscar cliente o número..." oninput="filterChatThreads(this.value)" style="margin-bottom: 8px;">
              <div id="chat-dept-filter-bar" style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin;">
                <button class="btn btn-primary btn-sm active" id="btn-filter-dept-all" style="padding:4px 8px; font-size:11px; white-space: nowrap;" onclick="setChatDeptFilter('all', this)">Todos</button>
              </div>
            </div>
            <div id="chat-threads-container" class="chat-threads-list"></div>
          </div>

          <div class="chat-main-area">
            <div id="chat-active-header" class="chat-header-bar" style="display: none;">
              <div class="chat-header-left">
                <button class="btn btn-secondary btn-xs btn-back-to-threads" style="display: none;" id="btn-back-to-threads" onclick="toggleMobileChatThreads()" title="Volver a lista de chats">◀ Volver</button>
                <div class="thread-avatar" id="active-chat-avatar">📱</div>
                <div style="min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <h4 id="active-chat-name" style="font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">Seleccione un chat</h4>
                    <span id="active-chat-dept-badge" class="badge badge-info" style="font-size: 9.5px; padding: 2px 6px;">General</span>
                    <span id="active-chat-instance-badge" class="badge badge-purple" style="font-size: 9.5px; padding: 2px 6px; display: none;" title="Línea de WhatsApp remitente">Línea: --</span>
                  </div>
                  <span id="active-chat-phone" style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">--</span>
                </div>
              </div>
              <div class="chat-header-actions">
                <button id="btn-transfer-dept" class="btn btn-secondary btn-xs" onclick="openTransferChatModal()" title="Traspasar conversación a otra oficina o área">
                  🔄 <span>Traspasar Área</span>
                </button>
                <div id="takeover-status-indicator" class="badge badge-success" style="font-size: 10px; padding: 3px 8px;">🤖 Bot Activo</div>
                <button id="btn-toggle-takeover" class="btn btn-secondary btn-xs" onclick="toggleCurrentChatTakeover()" title="Pausar bot para atención humana">
                  ⏸️ <span>Pausar 4h</span>
                </button>
                <button class="btn btn-secondary btn-xs" title="Pausar hasta mañana a las 10:00 AM" onclick="pauseCurrentChatUntilMorning()">
                  🌙 <span>Mañana</span>
                </button>
                <div style="width: 1px; height: 18px; background: var(--card-border); margin: 0 2px;"></div>
                <button class="btn btn-warning btn-xs" title="Finalizar caso y reactivar bot" onclick="closeCurrentChatCase()">
                  <svg class="svg-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                  <span>Cerrar</span>
                </button>
                <button id="btn-delete-active-chat" class="btn btn-danger btn-xs" style="display: none;" title="Borrar conversación y mensajes definitivamente (Superadmin)" onclick="deleteCurrentChat()">
                  <svg class="svg-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <div id="chat-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim); gap: 12px;">
              <svg class="svg-icon" style="width: 48px; height: 48px; opacity: 0.5;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <p>Selecciona una conversación para chatear en tiempo real.</p>
            </div>

            <div id="chat-messages-wrap" class="chat-messages-container" style="display: none;"></div>

            <div id="chat-input-container" class="chat-input-bar" style="display: none; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px; font-size: 11.5px; color: var(--text-muted);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span>Remitente de WhatsApp:</span>
                  <select id="chat-sender-instance" class="form-control" style="font-size: 11px; padding: 3px 8px; height: auto; width: auto; background: rgba(0,0,0,0.4);">
                    <option value="atencion">💳 Atención (WhatsApp 1)</option>
                    <option value="soporte">🔧 Soporte (WhatsApp 2)</option>
                  </select>
                </div>
                <span style="font-size: 10.5px; color: var(--text-dim);">Enter para enviar</span>
              </div>
              <div style="display: flex; gap: 10px; width: 100%;">
                <textarea id="chat-text-input" class="chat-input-box" placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)" rows="1" onkeydown="handleChatInputKeyDown(event)" style="flex: 1;"></textarea>
                <button class="btn btn-primary" onclick="sendActiveChatMessage()" style="height: 42px; padding: 0 18px;">
                  <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  <span>Enviar</span>
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

        <!-- Filter & Search Toolbar -->
        <div class="glass-card" style="margin-bottom: 20px; padding: 16px 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
              <div style="position: relative; flex: 1; min-width: 240px; max-width: 440px;">
                <input type="text" id="input-clients-search" class="form-control" placeholder="Buscar por nombre, teléfono, IP, serie ONU o dirección..." oninput="handleClientsSearchInput(this.value)">
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" id="btn-client-filter-all" onclick="setClientsStatusFilter('ALL', this)">Todos</button>
                <button class="btn btn-secondary btn-sm" id="btn-client-filter-gps" onclick="setClientsStatusFilter('CON_GPS', this)">📍 Con GPS</button>
                <button class="btn btn-secondary btn-sm" id="btn-client-filter-nogps" onclick="setClientsStatusFilter('SIN_GPS', this)">⚠️ Sin GPS</button>
                <button class="btn btn-secondary btn-sm" id="btn-client-filter-act" onclick="setClientsStatusFilter('ACTIVO', this)">🟢 Activos</button>
                <button class="btn btn-secondary btn-sm" id="btn-client-filter-susp" onclick="setClientsStatusFilter('SUSPENDIDO', this)">🔴 Suspendidos</button>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" onclick="triggerWisphubSync()">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
                <span>Sincronizar WispHub</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Table Container -->
        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h3 style="font-size: 15px; font-weight: 700;">Directorio de Clientes & Geolocalización</h3>
            <span id="clients-count-label" style="font-size: 12px; color: var(--text-muted);">Cargando clientes...</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente / Servicio</th>
                  <th>Estado</th>
                  <th>Corte</th>
                  <th>Teléfonos (Principal & Familiares)</th>
                  <th>Ubicación GPS & Google Maps</th>
                  <th>Datos Técnicos</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-clients-body">
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">Cargando listado de clientes...</td></tr>
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

      <!-- VIEW 3: KANBAN TICKETS BOARD -->
      <section id="view-tickets" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">Tablero de Soporte Técnico</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Mueve y asigna técnicos a los folios de servicio.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="loadTicketsData()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
              <span>Recargar Tablero</span>
            </button>
            <button id="btn-clear-all-tickets" class="btn btn-danger btn-sm" style="display: none;" onclick="confirmClearAllTickets()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Vaciar Tickets</span>
            </button>
          </div>
        </div>


        <div class="kanban-board">
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
                <span>🔍 Auto-Detectar Subredes</span>
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
            <div>
              <h3 style="font-size: 15px; font-weight: 700;">ONUs Nuevas Sin Configurar en SmartOLT</h3>
              <p style="font-size: 12px; color: var(--text-muted);">Detectadas en el PON para activación y asignación de IP.</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="loadIpamData()">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
              <span>Refrescar PON</span>
            </button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>OLT</th>
                  <th>PON</th>
                  <th>Serial (SN)</th>
                  <th>Modelo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody id="table-unconfigured-onus-body">
                <tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Buscando ONUs en espera...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 5: AUDITORÍA Y SINCRONIZACIÓN SMARTOLT VS WISPHUB -->
      <section id="view-audit" class="view-container">
        <!-- Metric Cards -->
        <div class="grid-metrics" style="margin-bottom: 20px;">
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Total Auditados</span>
              <div class="metric-icon-box" style="color: var(--accent-cyan);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
              </div>
            </div>
            <div id="metric-audit-total" class="metric-value">--</div>
            <div class="metric-footer" id="metric-audit-vlan-label">Todas las VLANs</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>100% Sincronizados</span>
              <div class="metric-icon-box" style="color: var(--accent-green);">
                <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
            <div id="metric-audit-synced" class="metric-value" style="color: var(--accent-green);">--</div>
            <div class="metric-footer">MAC + IPv4 + IPv6 idénticos</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Falta IPv6 en WispHub</span>
              <div class="metric-icon-box" style="color: var(--accent-amber);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="m10.29 3.86-8.47 14.14A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
              </div>
            </div>
            <div id="metric-audit-missing-ipv6" class="metric-value" style="color: var(--accent-amber);">--</div>
            <div class="metric-footer">Riesgo de fuga en corte por IPv6</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Falta MAC en WispHub</span>
              <div class="metric-icon-box" style="color: var(--accent-rose);">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
            </div>
            <div id="metric-audit-missing-mac" class="metric-value" style="color: var(--accent-rose);">--</div>
            <div class="metric-footer">Sin MAC_CPE en WispHub</div>
          </div>
        </div>

        <!-- Filters & Batch Control Bar -->
        <div class="glass-card" style="margin-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <!-- VLAN Selector -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">VLAN:</label>
                <select id="audit-vlan-filter" class="form-control" style="font-size: 13px; font-weight: 600; padding: 6px 12px; min-width: 170px; background: rgba(0,0,0,0.35); border-color: var(--card-border-hover);" onchange="handleAuditVlanChange(this.value)">
                  <option value="">Todas las VLANs</option>
                </select>
              </div>

              <!-- Filter Buttons -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="audit-filter-buttons">
                <button class="btn btn-secondary btn-sm active" onclick="setAuditFilter('all', this)">Todos</button>
                <button class="btn btn-warning btn-sm" onclick="setAuditFilter('desync', this)" title="Cualquier dato desalineado">⚠️ Desincronizados</button>
                <button class="btn btn-info btn-sm" onclick="setAuditFilter('missing_ipv6', this)" title="Falta Prefijo IPv6 en WispHub">⚡ Falta IPv6</button>
                <button class="btn btn-danger btn-sm" onclick="setAuditFilter('missing_mac', this)" title="Falta MAC CPE en WispHub">🔍 Falta MAC</button>
                <button class="btn btn-success btn-sm" onclick="setAuditFilter('synced', this)">🟢 100% Empatados</button>
                <button class="btn btn-secondary btn-sm" onclick="setAuditFilter('only_olt', this)">Solo OLT</button>
                <button class="btn btn-secondary btn-sm" onclick="setAuditFilter('only_wisphub', this)">Solo WispHub</button>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button id="btn-sync-current-vlan" class="btn btn-primary btn-sm" onclick="syncCurrentVlanBatch()" title="Sincronizar automáticamente todos los clientes desincronizados de la VLAN seleccionada">
                ⚡ Sincronizar VLAN a WispHub
              </button>
              <input type="text" id="audit-search-input" class="form-control" style="max-width: 240px; font-size: 12px;" placeholder="Buscar cliente, MAC, IPv6, IP..." oninput="handleAuditSearch(this.value)">
            </div>
          </div>
        </div>

        <!-- Comparison Table -->
        <div class="glass-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente / Folio</th>
                  <th>VLAN / OLT</th>
                  <th>IP WAN (SmartOLT vs WispHub)</th>
                  <th>MAC CPE (SmartOLT vs WispHub)</th>
                  <th>Prefijo IPv6 (SmartOLT vs WispHub)</th>
                  <th>Estado Sync</th>
                  <th style="text-align: center;">Acción</th>
                </tr>
              </thead>
              <tbody id="table-audit-body">
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Cargando auditoría...</td></tr>
              </tbody>
            </table>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;">
            <span id="audit-pagination-info" style="font-size: 12px; color: var(--text-muted);">Página 1</span>
            <div style="display: flex; gap: 8px;">
              <button id="btn-audit-prev" class="btn btn-secondary btn-sm" onclick="changeAuditPage(-1)">◀ Anterior</button>
              <button id="btn-audit-next" class="btn btn-secondary btn-sm" onclick="changeAuditPage(1)">Siguiente ▶</button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW: APROVISIONAMIENTO TR-069 & IPV6 CON COMPARACIÓN WISPHUB -->
      <section id="view-provisioning" class="view-container">
        <div class="grid-metrics" style="margin-bottom: 20px;">
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Total ONUs en SmartOLT</span>
              <div class="metric-icon-box" style="color: var(--accent-cyan);">
                <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>
              </div>
            </div>
            <div id="metric-prov-total" class="metric-value">--</div>
            <div class="metric-footer" id="metric-prov-vlan-label">Registradas en la red</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Falta TR-069</span>
              <div class="metric-icon-box" style="color: var(--accent-amber);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="m10.29 3.86-8.47 14.14A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
              </div>
            </div>
            <div id="metric-prov-tr069" class="metric-value" style="color: var(--accent-amber);">--</div>
            <div class="metric-footer">Sin perfil TR-069 activo</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Falta IPv6 en WispHub</span>
              <div class="metric-icon-box" style="color: #38bdf8;">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"></path></svg>
              </div>
            </div>
            <div id="metric-prov-ipv6" class="metric-value" style="color: #38bdf8;">--</div>
            <div class="metric-footer">Sin prefijo delegado en WispHub</div>
          </div>

          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>100% Sincronizados</span>
              <div class="metric-icon-box" style="color: var(--accent-green);">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
            <div id="metric-prov-ready" class="metric-value" style="color: var(--accent-green);">--</div>
            <div class="metric-footer">TR-069 + IPv6 + MAC empatados</div>
          </div>
        </div>

        <div class="glass-card" style="margin-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <!-- VLAN Selector -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">VLAN:</label>
                <select id="prov-vlan-filter" class="form-control" style="font-size: 13px; font-weight: 600; padding: 6px 12px; min-width: 170px; background: rgba(0,0,0,0.35); border-color: var(--card-border-hover);" onchange="handleProvVlanChange(this.value)">
                  <option value="">Todas las VLANs</option>
                </select>
              </div>

              <!-- Filter Buttons -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="prov-filter-buttons">
                <button class="btn btn-warning btn-sm active" onclick="setProvFilter('pending', this)">Pendientes (TR-069 / IPv6)</button>
                <button class="btn btn-info btn-sm" onclick="setProvFilter('missing_ipv6', this)">⚡ Falta IPv6 WispHub</button>
                <button class="btn btn-danger btn-sm" onclick="setProvFilter('missing_mac', this)">🔍 Falta MAC WispHub</button>
                <button class="btn btn-secondary btn-sm" onclick="setProvFilter('missing_tr069', this)">Falta TR-069</button>
                <button class="btn btn-success btn-sm" onclick="setProvFilter('ready', this)">🟢 100% Sincronizados</button>
                <button class="btn btn-secondary btn-sm" onclick="setProvFilter('all', this)">Todas las ONUs</button>
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button id="btn-sync-prov-vlan" class="btn btn-primary btn-sm" onclick="syncCurrentProvVlanBatch()" title="Sincronizar automáticamente todos los clientes desincronizados de la VLAN seleccionada hacia WispHub">
                ⚡ Sincronizar VLAN a WispHub
              </button>
              <input type="text" id="prov-search-input" class="form-control" style="max-width: 240px; font-size: 12px;" placeholder="Buscar cliente, SN, IP, MAC o VLAN..." oninput="handleProvSearch(this.value)">
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente / Folio</th>
                  <th>VLAN / OLT</th>
                  <th>IP WAN (SmartOLT vs WispHub)</th>
                  <th>MAC CPE (SmartOLT vs WispHub)</th>
                  <th>Prefijo IPv6 (SmartOLT vs WispHub)</th>
                  <th>Estado TR-069 / Sync</th>
                  <th style="text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody id="table-prov-body">
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Cargando aprovisionamiento y sincronización...</td></tr>
              </tbody>
            </table>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;">
            <span id="prov-pagination-info" style="font-size: 12px; color: var(--text-muted);">Página 1</span>
            <div style="display: flex; gap: 8px;">
              <button id="btn-prov-prev" class="btn btn-secondary btn-sm" onclick="changeProvPage(-1)">◀ Anterior</button>
              <button id="btn-prov-next" class="btn btn-secondary btn-sm" onclick="changeProvPage(1)">Siguiente ▶</button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 6: TÉCNICOS & PINS -->
      <section id="view-technicians" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
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
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono WhatsApp</th>
                  <th>PIN (5 Dígitos)</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="table-technicians-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Cargando técnicos...</td></tr>
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
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre Completo</th>
                  <th>Rol</th>
                  <th>Último Ingreso</th>
                  <th>Acciones</th>
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
      clients: { filter: 'ALL', search: '', page: 1, limit: 25, total: 0, items: [] },
      audit: { filter: 'all', search: '', vlan: '', page: 1, limit: 30, total: 0 },
      provisioning: { filter: 'pending', search: '', vlan: '', page: 1, limit: 30, total: 0 },
      technicians: [],
      adminUsers: [],
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


    // Navigation
    function navigateTo(viewId) {
      state.currentView = viewId;

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
        'live-chat': 'Live WhatsApp & Human Takeover',
        'clients': 'Directorio de Clientes & Geolocalización GPS',
        'tickets': 'Mesa de Tickets (Kanban)',
        'ipam': 'IPAM & Gestión de Pools VLAN',
        'audit': 'Comparativa SmartOLT vs WispHub & Sincronización',
        'provisioning': 'Aprovisionamiento TR-069 & IPv6 Dual Stack',
        'technicians': 'Técnicos Autorizados & PINs',
        'settings': 'Configuración del Sistema',
        'users': 'Usuarios & Roles de Acceso',
      };
      document.getElementById('current-view-title').innerText = titles[viewId] || 'Panel';
      document.getElementById('sidebar').classList.remove('mobile-open');
      loadViewData(viewId);
    }

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
      sidebar.classList.toggle('collapsed', state.isSidebarCollapsed);

      document.getElementById('toggle-icon-left').style.display = state.isSidebarCollapsed ? 'none' : 'block';
      document.getElementById('toggle-icon-right').style.display = state.isSidebarCollapsed ? 'block' : 'none';
    }

    function toggleMobileMenu() {
      document.getElementById('sidebar').classList.toggle('mobile-open');
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
        case 'provisioning': loadProvisioningData(); break;
        case 'technicians': loadTechniciansData(); break;
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
          apiFetch('/api/logs?limit=8').catch(() => ({ logs: [] })),
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

        // Render Logs
        const tbody = document.getElementById('table-recent-logs-body');
        if (logsRes.logs && logsRes.logs.length > 0) {
          tbody.innerHTML = logsRes.logs.map(l => \`
            <tr>
              <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">\${new Date(l.created_at).toLocaleTimeString()}</td>
              <td style="font-family: var(--font-mono); font-weight: 600;">\${l.phone}</td>
              <td>\${l.client_name || '<span style="color: var(--text-dim);">Desconocido</span>'}</td>
              <td><span class="badge \${l.direction === 'IN' ? 'badge-info' : 'badge-purple'}">\${l.direction === 'IN' ? 'Entrante' : 'Saliente'}</span></td>
              <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${escapeHtml(l.message)}</td>
            </tr>
          \`).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Sin registros recientes.</td></tr>';
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
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

      // Calcular conteos por área
      const counts = { all: state.chats.length };
      state.chats.forEach(c => {
        const d = (c.department || 'General').trim();
        counts[d] = (counts[d] || 0) + 1;
      });

      // Conjunto único de áreas detectadas
      const areaSet = new Set();
      state.whatsappAreas.forEach(a => areaSet.add(a.area_name));
      state.chats.forEach(c => {
        if (c.department) areaSet.add(c.department);
      });

      const sortedAreas = Array.from(areaSet);

      let html = \`
        <button class="btn \${state.chatDeptFilter === 'all' ? 'btn-primary active' : 'btn-secondary'} btn-sm" style="padding:4px 8px; font-size:11px; white-space: nowrap;" onclick="setChatDeptFilter('all', this)">
          Todos (\${counts.all})
        </button>
      \`;

      sortedAreas.forEach(areaName => {
        const c = counts[areaName] || 0;
        const isCurrent = state.chatDeptFilter.toLowerCase() === areaName.toLowerCase();
        let icon = '🏢';
        const lower = areaName.toLowerCase();
        if (lower.includes('soporte') || lower.includes('tecnic')) icon = '🔧';
        else if (lower.includes('cobranza') || lower.includes('pago') || lower.includes('caja')) icon = '💳';
        else if (lower.includes('ventas') || lower.includes('contrat')) icon = '💼';

        html += \`
          <button class="btn \${isCurrent ? 'btn-primary active' : 'btn-secondary'} btn-sm" style="padding:4px 8px; font-size:11px; white-space: nowrap;" onclick="setChatDeptFilter('\${escapeHtml(areaName)}', this)">
            \${icon} \${escapeHtml(areaName)} (\${c})
          </button>
        \`;
      });

      bar.innerHTML = html;
    }

    function populateChatSenderInstances() {
      const select = document.getElementById('chat-sender-instance');
      if (!select) return;

      if (!state.whatsappInstances || state.whatsappInstances.length === 0) {
        select.innerHTML = '<option value="">Línea activa por defecto</option>';
        return;
      }

      const currentVal = select.value;
      select.innerHTML = state.whatsappInstances.map(inst => {
        const phone = inst.phone ? \`(+52 \${inst.phone.slice(-10)})\` : '';
        const area = inst.area_name ? \`[\${inst.area_name}] \` : '';
        return \`<option value="\${escapeHtml(inst.name)}">\${area}\${escapeHtml(inst.name)} \${phone}</option>\`;
      }).join('');

      if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
        select.value = currentVal;
      }
    }

    function setChatDeptFilter(dept, btn) {
      state.chatDeptFilter = dept;
      document.querySelectorAll('#chat-dept-filter-bar .btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-secondary');
      });
      if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary', 'active');
      }
      filterChatThreads(document.getElementById('chat-filter-input')?.value || '');
    }

    function toggleMobileChatThreads() {
      const layout = document.querySelector('.chat-layout');
      if (layout) {
        layout.classList.remove('mobile-chat-active');
      }
    }

    function renderChatThreads(list) {
      const container = document.getElementById('chat-threads-container');
      if (!list || list.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">Sin conversaciones en esta área.</div>';
        return;
      }

      const isSuperAdmin = state.user?.role === 'superadmin';

      container.innerHTML = list.map(c => {
        const isActive = c.phone === state.activeChatPhone ? 'active' : '';
        const name = c.client_name || c.phone;
        const initials = name.substring(0, 2).toUpperCase();
        const dept = c.department || 'General';
        const instanceLabel = c.last_instance ? \`<span style="font-size: 9px; color: var(--text-dim); margin-left: 2px;">[\${c.last_instance}]</span>\` : '';
        const deleteBtnHtml = isSuperAdmin ? \`
            <button class="btn-thread-delete" title="Eliminar conversación" onclick="deleteChatThread(event, '\${c.phone}')">
              <svg class="svg-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>\` : '';

        return \`
          <div class="chat-thread-item \${isActive}" onclick="selectChat('\${c.phone}')">
            <div class="thread-avatar">\${initials}</div>
            <div class="thread-content" style="flex:1; min-width: 0;">
              <div class="thread-top">
                <span class="thread-name">\${escapeHtml(name)}</span>
                <span class="thread-time">\${formatShortTime(c.last_interaction)}</span>
              </div>
              <div class="thread-preview">\${escapeHtml(c.last_message || '')}</div>
              <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
                <span class="badge badge-info" style="font-size: 9px; padding: 2px 5px;">
                  \${escapeHtml(dept)}
                </span>
                <span class="badge \${c.is_human_paused ? 'badge-warning' : 'badge-success'}" style="font-size: 9px; padding: 2px 5px;">
                  \${c.is_human_paused ? '⏸️ Humano' : '🤖 Bot'}
                </span>
                \${instanceLabel}
              </div>
            </div>
            \${deleteBtnHtml}
          </div>
        \`;
      }).join('');
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
          instBadge.innerText = \`Línea: \${activeInst}\`;
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
      document.querySelector('.chat-layout')?.classList.add('mobile-chat-active');
      filterChatThreads(document.getElementById('chat-filter-input')?.value || '');

      document.getElementById('chat-empty-state').style.display = 'none';
      document.getElementById('chat-active-header').style.display = 'flex';
      document.getElementById('chat-messages-wrap').style.display = 'flex';
      document.getElementById('chat-input-container').style.display = 'flex';

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

    function openTransferChatModal() {
      if (!state.activeChatPhone) return;
      const chat = state.chats.find(c => c.phone === state.activeChatPhone);
      const currentDept = chat?.department || 'General';

      const areaOptions = state.whatsappAreas.map(a => {
        const isSelected = a.area_name.toLowerCase() === currentDept.toLowerCase();
        const phoneTxt = a.phone_number ? \` (+52 \${a.phone_number.slice(-10)})\` : '';
        return \`<option value="\${escapeHtml(a.area_name)}" data-instance="\${escapeHtml(a.instance_name)}" \${isSelected ? 'selected' : ''}>\${escapeHtml(a.area_name)}\${phoneTxt} [Línea: \${escapeHtml(a.instance_name)}]</option>\`;
      }).join('');

      const content = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <p style="font-size: 13px; color: var(--text-muted);">
            Transfiere la conversación del cliente <strong>\${escapeHtml(chat?.client_name || state.activeChatPhone)}</strong> a otra área u oficina. El historial de mensajes se conservará intacto.
          </p>

          <div class="form-group">
            <label class="form-label">Área / Oficina Destino</label>
            <select id="transfer-modal-area-select" class="form-control" onchange="handleTransferAreaChange(this)">
              \${areaOptions || '<option value="Atención al Cliente">Atención al Cliente</option><option value="Soporte Técnico">Soporte Técnico</option>'}
              <option value="__CUSTOM__">-- Otra área personalizada --</option>
            </select>
            <input type="text" id="transfer-modal-area-custom" class="form-control" placeholder="Escribe el nombre del área..." style="display: none; margin-top: 6px;">
          </div>

          <div class="form-group" style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--card-border);">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <strong style="font-size: 13px; color: var(--text-main);">💬 Notificar al cliente por WhatsApp</strong>
                <div style="font-size: 11px; color: var(--text-dim);">Envía un mensaje automático avisando que su caso fue transferido</div>
              </div>
              <input type="checkbox" id="transfer-modal-notify-toggle" style="transform: scale(1.3); cursor: pointer;" checked onchange="document.getElementById('transfer-modal-msg-wrap').style.display = this.checked ? 'block' : 'none';">
            </label>
            <div id="transfer-modal-msg-wrap" style="margin-top: 10px;">
              <textarea id="transfer-modal-custom-msg" class="form-control" rows="2" placeholder="Tu conversación ha sido transferida al área de..."></textarea>
            </div>
          </div>
        </div>
      \`;

      openModal('🔄 Traspasar Conversación a Otra Área / Oficina', content, async () => {
        const select = document.getElementById('transfer-modal-area-select');
        let selectedArea = select.value;
        if (selectedArea === '__CUSTOM__') {
          selectedArea = document.getElementById('transfer-modal-area-custom')?.value.trim();
        }

        if (!selectedArea) {
          showToast('Área requerida', 'Debes seleccionar o escribir un área de destino', 'warning');
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
            showToast('Traspaso Exitoso', res.message || \`Chat transferido a \${selectedArea}.\`, 'success');
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
          msgInput.value = \`Tu conversación ha sido transferida al área de *\${select.value}*. En un momento un asesor continuará con tu atención por este medio.\`;
        }
      }
    }

    function renderChatMessages(messages) {
      const wrap = document.getElementById('chat-messages-wrap');
      if (!messages || messages.length === 0) {
        wrap.innerHTML = '<div style="text-align: center; color: var(--text-dim); margin-top: 40px;">No hay mensajes registrados.</div>';
        return;
      }

      wrap.innerHTML = messages.map(m => {
        const isOut = m.direction === 'OUT';
        return \`
          <div class="chat-bubble \${isOut ? 'out' : 'in'}">
            <div>\${escapeHtml(m.message)}</div>
            <div class="bubble-meta">
              <span>\${formatShortTime(m.created_at)}</span>
              \${isOut ? '<span>✓✓</span>' : ''}
            </div>
          </div>
        \`;
      }).join('');

      wrap.scrollTop = wrap.scrollHeight;
    }

    function appendChatMessage(data) {
      const wrap = document.getElementById('chat-messages-wrap');
      const isOut = data.direction === 'OUT';
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble ' + (isOut ? 'out' : 'in');
      bubble.innerHTML = \`
        <div>\${escapeHtml(data.message)}</div>
        <div class="bubble-meta">
          <span>\${formatShortTime(data.created_at || new Date().toISOString())}</span>
          \${isOut ? '<span>✓✓</span>' : ''}
        </div>
      \`;
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
      const ind = document.getElementById('takeover-status-indicator');
      const btn = document.getElementById('btn-toggle-takeover');
      if (!ind || !btn) return;

      if (isPaused) {
        ind.className = 'badge badge-warning';
        const desc = takeover?.descripcion || (takeover?.minutosRestantes ? (takeover.minutosRestantes + 'm restantes') : 'Pausado');
        ind.innerText = '⏸️ ' + desc;
        btn.innerHTML = '▶️ Reactivar';
        btn.className = 'btn btn-success btn-xs';
      } else {
        ind.className = 'badge badge-success';
        ind.innerText = '🤖 Bot Activo';
        btn.innerHTML = '⏸️ Pausar 4h';
        btn.className = 'btn btn-secondary btn-xs';
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


    // Tickets Kanban Module
    async function loadTicketsData() {
      try {
        const res = await apiFetch('/api/tickets?limit=100');
        state.tickets = res.tickets || [];
        renderKanbanBoard(state.tickets);
      } catch (err) {
        console.error('Error loading tickets:', err);
      }
    }

    function renderKanbanBoard(tickets) {
      const cols = {
        'ABIERTO': document.getElementById('col-tickets-abierto'),
        'EN_PROCESO': document.getElementById('col-tickets-en-proceso'),
        'VISITA_TECNICA': document.getElementById('col-tickets-visita'),
        'RESUELTO': document.getElementById('col-tickets-resuelto'),
      };

      const counts = { 'ABIERTO': 0, 'EN_PROCESO': 0, 'VISITA_TECNICA': 0, 'RESUELTO': 0 };
      Object.values(cols).forEach(c => c.innerHTML = '');

      tickets.forEach(t => {
        const status = (t.status || 'ABIERTO').toUpperCase();
        const targetCol = cols[status] || cols['ABIERTO'];
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

      document.getElementById('badge-count-abierto').innerText = counts['ABIERTO'] || 0;
      document.getElementById('badge-count-proceso').innerText = counts['EN_PROCESO'] || 0;
      document.getElementById('badge-count-visita').innerText = counts['VISITA_TECNICA'] || 0;
      document.getElementById('badge-count-resuelto').innerText = counts['RESUELTO'] || 0;
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
            const badgeClass = pct > 85 ? 'badge-danger' : (pct > 60 ? 'badge-warning' : 'badge-success');
            const safeName = (p.name || '').replace(/'/g, "\\'");
            const safeSubnet = subnet.replace(/'/g, "\\'");
            const safeGateway = gateway.replace(/'/g, "\\'");
            const safeOlt = olt.replace(/'/g, "\\'");

            return \`
              <div class="glass-card" style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="font-weight: 700; font-size: 15px; color: var(--accent-cyan);">VLAN \${escapeHtml(p.vlan)}</div>
                      <div style="font-size: 12px; color: var(--text-muted);">\${escapeHtml(p.name || subnet)}</div>
                    </div>
                    <span class="badge \${badgeClass}">\${pct}% Ocupado</span>
                  </div>

                  <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); margin-bottom: 10px; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: var(--radius-sm);">
                    <div>🌐 <strong>Subred:</strong> \${escapeHtml(subnet)}</div>
                    <div>🚪 <strong>Gateway:</strong> \${escapeHtml(gateway || '172.19.x.254')}</div>
                    <div>📡 <strong>OLT:</strong> \${escapeHtml(olt)}</div>
                  </div>

                  <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                    <div style="background: linear-gradient(90deg, var(--accent-cyan), var(--primary)); width: \${Math.min(100, pct)}%; height: 100%;"></div>
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

        const unconfTable = document.getElementById('table-unconfigured-onus-body');
        if (unconfRes.unconfigured && unconfRes.unconfigured.length > 0) {
          unconfTable.innerHTML = unconfRes.unconfigured.map(o => \`
            <tr>
              <td>\${escapeHtml(o.olt_name || 'OLT')}</td>
              <td style="font-family: var(--font-mono);">\${o.pon_port || o.port || 'PON'}</td>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">\${o.sn}</td>
              <td>\${escapeHtml(o.model || o.onu_type_name || 'ONU')}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="openAuthorizeOnuModal('\${o.sn}', '\${o.olt_id || 3}')">
                  Aprovisionar
                </button>
              </td>
            </tr>
          \`).join('');
        } else {
          unconfTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No hay ONUs en espera de configuración en el PON.</td></tr>';
        }
      } catch (err) {
        console.error('Error loading IPAM:', err);
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

    // Audit & Cross-Sync Module (SmartOLT <-> WispHub)
    async function loadAuditData() {
      const tbody = document.getElementById('table-audit-body');
      if (tbody) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px 20px;">
              <div class="spinner" style="margin-bottom: 10px;"></div>
              <div style="font-size: 13px; color: var(--text-dim);">Comparando SmartOLT vs WispHub y calculando estados...</div>
            </td>
          </tr>
        \`;
      }

      try {
        const params = new URLSearchParams({
          filter: state.audit.filter || 'all',
          search: state.audit.search || '',
          vlan: state.audit.vlan || '',
          page: state.audit.page || 1,
          limit: state.audit.limit || 30,
        });

        const res = await apiFetch('/api/audit/ip-cross?' + params.toString());
        state.audit.total = res.total || 0;

        // Populate VLAN selector options if provided
        if (res.vlans && Array.isArray(res.vlans)) {
          const vlanSelect = document.getElementById('audit-vlan-filter');
          if (vlanSelect) {
            const currentSelected = state.audit.vlan || '';
            let optionsHtml = '<option value="">Todas las VLANs</option>';
            res.vlans.forEach(v => {
              const sel = (v.vlan === currentSelected) ? 'selected' : '';
              optionsHtml += \`<option value="\${escapeHtml(v.vlan)}" \${sel}>VLAN \${escapeHtml(v.vlan)} (\${v.count} clientes)</option>\`;
            });
            vlanSelect.innerHTML = optionsHtml;
          }
        }

        // Update metric counters
        if (res.metrics) {
          const elTotal = document.getElementById('metric-audit-total');
          const elSynced = document.getElementById('metric-audit-synced');
          const elMissingIpv6 = document.getElementById('metric-audit-missing-ipv6');
          const elMissingMac = document.getElementById('metric-audit-missing-mac');
          const elVlanLabel = document.getElementById('metric-audit-vlan-label');

          if (elTotal) elTotal.innerText = res.metrics.total || 0;
          if (elSynced) elSynced.innerText = res.metrics.synced || 0;
          if (elMissingIpv6) elMissingIpv6.innerText = res.metrics.missing_ipv6 || 0;
          if (elMissingMac) elMissingMac.innerText = res.metrics.missing_mac || 0;
          if (elVlanLabel) {
            elVlanLabel.innerText = state.audit.vlan ? \`VLAN \${state.audit.vlan}\` : 'Todas las VLANs';
          }
        }

        const totalPages = Math.max(1, Math.ceil((res.total || 0) / state.audit.limit));
        const pagInfo = document.getElementById('audit-pagination-info');
        if (pagInfo) {
          pagInfo.innerText = \`Mostrando página \${state.audit.page} de \${totalPages} (\${res.total || 0} registros)\`;
        }

        if (res.items && res.items.length > 0) {
          tbody.innerHTML = res.items.map((item, idx) => {
            const rowId = \`audit-row-\${idx}\`;
            
            // Sync status badge
            let syncBadge = '<span class="badge badge-success">🟢 Sincronizado</span>';
            if (item.sync_status === 'MISSING_IPV6') {
              syncBadge = '<span class="badge badge-warning" title="WispHub no tiene prefijo IPv6">🟡 Falta IPv6</span>';
            } else if (item.sync_status === 'MISSING_MAC') {
              syncBadge = '<span class="badge badge-danger" title="WispHub no tiene MAC registrada">🟠 Falta MAC</span>';
            } else if (item.sync_status === 'MISMATCH_IP') {
              syncBadge = '<span class="badge badge-danger" title="La IP no coincide">🔴 IP Diferente</span>';
            } else if (item.sync_status === 'ONLY_SMARTOLT') {
              syncBadge = '<span class="badge badge-info">🔵 Solo SmartOLT</span>';
            } else if (item.sync_status === 'ONLY_WISPHUB') {
              syncBadge = '<span class="badge badge-purple">🟣 Solo WispHub</span>';
            } else if (item.sync_status === 'DESYNCHRONIZED') {
              syncBadge = '<span class="badge badge-danger">🔴 Desincronizado</span>';
            }

            // IP comparison
            const oltIp = item.smartolt_ip ? \`<span style="color: var(--accent-cyan);">\${escapeHtml(item.smartolt_ip)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whIp = item.wisphub_ip ? \`<span style="color: var(--accent-green);">\${escapeHtml(item.wisphub_ip)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const ipDisplay = \`
              <div style="font-family: var(--font-mono); font-size: 11.5px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">OLT:</span> \${oltIp}</div>
                <div><span style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">WH:</span> \${whIp}</div>
              </div>
            \`;

            // MAC comparison
            const oltMac = item.mac_smartolt ? \`<span style="color: var(--accent-cyan); font-weight: 600;">\${escapeHtml(item.mac_smartolt)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whMac = item.mac_wisphub ? \`<span style="color: var(--accent-green); font-weight: 600;">\${escapeHtml(item.mac_wisphub)}</span>\` : '<span style="color: var(--accent-rose); font-style: italic;">Sin MAC</span>';
            const macDisplay = \`
              <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim);">OLT:</span> \${oltMac}</div>
                <div><span style="font-size: 9px; color: var(--text-dim);">WH:</span> \${whMac}</div>
              </div>
            \`;

            // IPv6 Prefix comparison
            const oltIpv6 = item.ipv6_smartolt ? \`<span style="color: #38bdf8;">\${escapeHtml(item.ipv6_smartolt)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whIpv6 = item.ipv6_wisphub ? \`<span style="color: var(--accent-green);">\${escapeHtml(item.ipv6_wisphub)}</span>\` : '<span style="color: var(--accent-amber); font-weight: 600;">⚠️ Sin IPv6</span>';
            const ipv6Display = \`
              <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim);">OLT:</span> \${oltIpv6}</div>
                <div><span style="font-size: 9px; color: var(--text-dim);">WH:</span> \${whIpv6}</div>
              </div>
            \`;

            // VLAN & Zone
            const vlanBadge = item.vlan ? \`<span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); font-weight: 700;">VLAN \${escapeHtml(item.vlan)}</span>\` : '<span style="color: var(--text-dim); font-size: 11px;">S/VLAN</span>';
            const oltZone = item.smartolt_name ? \`<div style="font-size: 10.5px; color: var(--text-dim); margin-top: 3px;">\${escapeHtml(item.smartolt_name)}</div>\` : '';

            // Action Button
            let actionBtn = '<span style="font-size: 11px; color: var(--text-dim);">--</span>';
            if (item.wisphub_id) {
              const syncData = {
                wisphub_id: item.wisphub_id,
                smartolt_id: item.smartolt_id || '',
                mac: item.mac_wisphub || item.mac_smartolt || '',
                ipv6_prefix: item.ipv6_wisphub || (item.ipv6_smartolt && !item.ipv6_smartolt.includes('Solo') ? item.ipv6_smartolt : '') || '',
                ip: item.smartolt_ip || item.wisphub_ip || '',
                sn: item.sn || item.sn_smartolt || item.sn_wisphub || '',
                cliente: item.cliente || '',
                folio: item.folio || item.servicio || '',
                router: item.zona_o_router || ''
              };
              const jsonStr = encodeURIComponent(JSON.stringify(syncData));

              if (item.sync_status === 'SYNCED') {
                actionBtn = \`
                  <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <span class="badge badge-success" style="opacity: 0.9; font-size: 11px;">✓ Sincronizado</span>
                    <button class="btn btn-secondary btn-sm" onclick="openSyncClientModal('\${jsonStr}', '\${rowId}')" title="Editar MAC o IPv6" style="padding: 2px 6px; font-size: 11px;">✏️</button>
                  </div>
                \`;
              } else {
                actionBtn = \`
                  <button id="btn-sync-cli-\${item.wisphub_id}" class="btn btn-primary btn-sm" onclick="openSyncClientModal('\${jsonStr}', '\${rowId}')" title="Completar MAC e IPv6 en WispHub" style="font-size: 11.5px; padding: 5px 10px;">
                    ⚡ Sincronizar WH
                  </button>
                \`;
              }
            } else if (item.smartolt_id) {
              actionBtn = '<span style="font-size: 11px; color: var(--accent-cyan);">Solo en OLT</span>';
            }

            return \`
              <tr id="\${rowId}">
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">\${escapeHtml(item.cliente || 'Desconocido')}</div>
                  <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    Folio: \${escapeHtml(item.folio || item.servicio || '--')} | SN: \${escapeHtml(item.sn || item.sn_smartolt || item.sn_wisphub || '--')}
                  </div>
                </td>
                <td>
                  \${vlanBadge}
                  \${oltZone}
                </td>
                <td>\${ipDisplay}</td>
                <td>\${macDisplay}</td>
                <td>\${ipv6Display}</td>
                <td id="\${rowId}-status">\${syncBadge}</td>
                <td id="\${rowId}-action" style="text-align: center;">\${actionBtn}</td>
              </tr>
            \`;
          }).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No se encontraron registros coincidentes con los filtros seleccionados.</td></tr>';
        }
      } catch (err) {
        console.error('Error loading audit:', err);
        if (tbody) {
          tbody.innerHTML = \`<tr><td colspan="7" style="text-align: center; color: var(--accent-rose); padding: 24px;">Error al cargar auditoría: \${escapeHtml(err.message || 'Error')}</td></tr>\`;
        }
      }
    }

    function openSyncClientModal(jsonEncoded, rowId) {
      let data = {};
      try {
        data = JSON.parse(decodeURIComponent(jsonEncoded));
      } catch (e) {
        console.error('Error decoding sync payload:', e);
        return;
      }

      const modalHtml = \`
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 700; font-size: 14px; color: #fff;">\${escapeHtml(data.cliente || 'Cliente')}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono);">
              IP: <strong style="color: var(--accent-cyan);">\${escapeHtml(data.ip || '--')}</strong> | 
              SN: <strong style="color: var(--accent-green);">\${escapeHtml(data.sn || '--')}</strong> | 
              WispHub ID: <strong>#\${escapeHtml(String(data.wisphub_id))}</strong>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight: 600; display: flex; justify-content: space-between;">
              <span>Dirección MAC CPE (Antena / Router)</span>
              <span style="font-size: 11px; color: var(--text-dim); font-weight: normal;">Guardar en WispHub (mac_cpe)</span>
            </label>
            <input type="text" id="sync-input-mac" class="form-control" placeholder="Ej: 48:D8:69:27:69:F6" value="\${escapeHtml(data.mac || '')}" style="font-family: var(--font-mono); text-transform: uppercase;">
            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
              💡 Si la conoces o la obtuviste de ARP / etiqueta física, ingrésala para empatar el cliente.
            </small>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight: 600; display: flex; justify-content: space-between;">
              <span>Prefijo IPv6 Delegado (Remote IPv6 Prefix)</span>
              <span style="font-size: 11px; color: var(--accent-amber); font-weight: normal;">Bloquea fugas en corte</span>
            </label>
            <input type="text" id="sync-input-ipv6" class="form-control" placeholder="Ej: 2806:108e:xxxx:xxxx::/64" value="\${escapeHtml(data.ipv6_prefix || '')}" style="font-family: var(--font-mono);">
            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
              💡 Prefijo IPv6 de MikroTik DHCPv6 / TR-069. Al guardarlo, WispHub cortará IPv6 correctamente al suspender.
            </small>
          </div>
        </div>
      \`;

      openModal(
        \`Sincronizar Datos en WispHub (#\${data.wisphub_id})\`,
        modalHtml,
        async () => {
          const macVal = (document.getElementById('sync-input-mac')?.value || '').trim().toUpperCase();
          const ipv6Val = (document.getElementById('sync-input-ipv6')?.value || '').trim();

          const payload = {
            ...data,
            mac: macVal,
            remote_ipv6_prefix: ipv6Val,
          };

          showToast('Sincronizando', \`Guardando MAC e IPv6 en WispHub para \${data.cliente}...\`, 'info', 3000);

          try {
            const res = await apiFetch('/api/audit/sync-client', {
              method: 'POST',
              body: JSON.stringify(payload),
            });

            if (res.success) {
              showToast('Sincronizado', \`Datos guardados con éxito en WispHub para \${data.cliente}.\`, 'success', 4000);
              
              // Dynamically update row UI
              const statusEl = document.getElementById(\`\${rowId}-status\`);
              const actionEl = document.getElementById(\`\${rowId}-action\`);
              
              const isFullySynced = macVal.length > 0 && ipv6Val.length > 0;
              if (statusEl) {
                statusEl.innerHTML = isFullySynced ? '<span class="badge badge-success">🟢 Sincronizado</span>' : '<span class="badge badge-warning">🟡 Actualizado</span>';
              }
              if (actionEl) {
                const newJson = encodeURIComponent(JSON.stringify({ ...data, mac: macVal, ipv6_prefix: ipv6Val }));
                actionEl.innerHTML = \`
                  <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <span class="badge badge-success" style="font-size: 11px;">✓ Guardado</span>
                    <button class="btn btn-secondary btn-sm" onclick="openSyncClientModal('\${newJson}', '\${rowId}')" title="Editar de nuevo" style="padding: 2px 6px; font-size: 11px;">✏️</button>
                  </div>
                \`;
              }

              return true;
            } else {
              showToast('Error', res.error || res.message || 'No se pudo guardar en WispHub.', 'error', 5000);
              return false;
            }
          } catch (err) {
            showToast('Error', err.message || 'Fallo de red', 'error');
            return false;
          }
        },
        '💾 Guardar en WispHub'
      );
    }

    async function syncCurrentVlanBatch() {
      const currentVlan = state.audit.vlan;
      const vlanLabel = currentVlan ? \`VLAN \${currentVlan}\` : 'todas las VLANs';
      
      showConfirmDialog(
        \`Sincronizar \${vlanLabel} a WispHub\`,
        \`¿Deseas sincronizar automáticamente la MAC y el Prefijo IPv6 de SmartOLT a WispHub para todos los clientes desincronizados de \${vlanLabel}?\`,
        async () => {
          const btn = document.getElementById('btn-sync-current-vlan');
          if (btn) {
            btn.disabled = true;
            btn.innerText = '⏳ Sincronizando Lote...';
          }
          showToast('Sincronización Masiva', \`Iniciando sincronización para \${vlanLabel}...\`, 'info', 4000);

          try {
            const res = await apiFetch('/api/audit/sync-vlan', {
              method: 'POST',
              body: JSON.stringify({ vlan: currentVlan }),
            });

            if (res.success) {
              showToast('Lote Completado', \`Sincronizados: \${res.synced_count || 0} clientes de \${vlanLabel}.\`, 'success', 5000);
              loadAuditData();
            } else {
              showToast('Error', res.error || 'Fallo en la sincronización del lote', 'error', 5000);
            }
          } catch (err) {
            showToast('Error', err.message || 'Error de comunicación', 'error');
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.innerText = '⚡ Sincronizar VLAN a WispHub';
            }
          }
        },
        false
      );
    }

    function handleAuditVlanChange(vlan) {
      state.audit.vlan = (vlan || '').trim();
      state.audit.page = 1;
      loadAuditData();
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

    // Provisioning & IPv6 Module (SmartOLT + WispHub Sync)
    async function loadProvisioningData() {
      const tbody = document.getElementById('table-prov-body');
      if (tbody) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px 20px;">
              <div class="spinner" style="margin-bottom: 10px;"></div>
              <div style="font-size: 13px; color: var(--text-dim);">Comparando SmartOLT vs WispHub por VLAN...</div>
            </td>
          </tr>
        \`;
      }

      try {
        const params = new URLSearchParams({
          filter: state.provisioning.filter || 'pending',
          search: state.provisioning.search || '',
          vlan: state.provisioning.vlan || '',
          page: state.provisioning.page || 1,
          limit: state.provisioning.limit || 30,
        });

        const res = await apiFetch('/api/audit/ip-cross?' + params.toString());
        state.provisioning.total = res.total || 0;

        // Populate VLAN selector options if provided
        if (res.vlans && Array.isArray(res.vlans)) {
          const vlanSelect = document.getElementById('prov-vlan-filter');
          if (vlanSelect) {
            const currentSelected = state.provisioning.vlan || '';
            let optionsHtml = '<option value="">Todas las VLANs</option>';
            res.vlans.forEach(v => {
              const sel = (v.vlan === currentSelected) ? 'selected' : '';
              optionsHtml += \`<option value="\${escapeHtml(v.vlan)}" \${sel}>VLAN \${escapeHtml(v.vlan)} (\${v.count} clientes)</option>\`;
            });
            vlanSelect.innerHTML = optionsHtml;
          }
        }

        // Update metric cards
        const sum = res.summary || {};
        const missingTr = sum.missingTr069 || 0;
        const missingV6 = sum.missingIpv6 || 0;
        const totalOlt = sum.totalSmartOlt || 0;
        const readyCount = sum.synced || Math.max(0, totalOlt - Math.max(missingTr, missingV6));

        const elTot = document.getElementById('metric-prov-total');
        const elTr = document.getElementById('metric-prov-tr069');
        const elV6 = document.getElementById('metric-prov-ipv6');
        const elReady = document.getElementById('metric-prov-ready');
        const elVlanLbl = document.getElementById('metric-prov-vlan-label');

        if (elTot) elTot.innerText = Number(totalOlt).toLocaleString();
        if (elTr) elTr.innerText = Number(missingTr).toLocaleString();
        if (elV6) elV6.innerText = Number(missingV6).toLocaleString();
        if (elReady) elReady.innerText = Number(readyCount).toLocaleString();
        if (elVlanLbl) {
          elVlanLbl.innerText = state.provisioning.vlan ? \`VLAN \${state.provisioning.vlan}\` : 'Todas las VLANs';
        }

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
        if (pInfo) {
          pInfo.innerText = \`Mostrando página \${state.provisioning.page} de \${totalPages} (\${res.total || 0} registros)\`;
        }

        if (res.items && res.items.length > 0) {
          tbody.innerHTML = res.items.map((item, idx) => {
            const rowId = \`prov-row-\${idx}\`;

            // TR-069 badge
            let trBadge = '<span class="badge badge-success">ACTIVO</span>';
            if (item.tr069_status === 'OMCI') trBadge = '<span class="badge badge-warning">OMCI</span>';
            if (item.tr069_status === 'MISSING' || !item.tr069_status) trBadge = '<span class="badge badge-danger">FALTA TR069</span>';

            // Sync status badge
            let syncBadge = '<span class="badge badge-success" style="margin-top: 3px; display: inline-block;">🟢 SYNC</span>';
            if (item.sync_status === 'MISSING_IPV6') {
              syncBadge = '<span class="badge badge-warning" style="margin-top: 3px; display: inline-block;">🟡 Falta IPv6 WH</span>';
            } else if (item.sync_status === 'MISSING_MAC') {
              syncBadge = '<span class="badge badge-danger" style="margin-top: 3px; display: inline-block;">🟠 Falta MAC WH</span>';
            } else if (item.sync_status === 'MISMATCH_IP') {
              syncBadge = '<span class="badge badge-danger" style="margin-top: 3px; display: inline-block;">🔴 IP Dif</span>';
            }

            // IP comparison
            const oltIp = item.smartolt_ip ? \`<span style="color: var(--accent-cyan);">\${escapeHtml(item.smartolt_ip)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whIp = item.wisphub_ip ? \`<span style="color: var(--accent-green);">\${escapeHtml(item.wisphub_ip)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const ipDisplay = \`
              <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim);">OLT:</span> \${oltIp}</div>
                <div><span style="font-size: 9px; color: var(--text-dim);">WH:</span> \${whIp}</div>
              </div>
            \`;

            // MAC comparison
            const oltMac = item.mac_smartolt ? \`<span style="color: var(--accent-cyan); font-weight: 600;">\${escapeHtml(item.mac_smartolt)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whMac = item.mac_wisphub ? \`<span style="color: var(--accent-green); font-weight: 600;">\${escapeHtml(item.mac_wisphub)}</span>\` : '<span style="color: var(--accent-rose); font-style: italic;">Sin MAC</span>';
            const macDisplay = \`
              <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim);">OLT:</span> \${oltMac}</div>
                <div><span style="font-size: 9px; color: var(--text-dim);">WH:</span> \${whMac}</div>
              </div>
            \`;

            // IPv6 comparison
            const oltIpv6 = item.ipv6_smartolt ? \`<span style="color: #38bdf8;">\${escapeHtml(item.ipv6_smartolt)}</span>\` : '<span style="color: var(--text-dim);">--</span>';
            const whIpv6 = item.ipv6_wisphub ? \`<span style="color: var(--accent-green);">\${escapeHtml(item.ipv6_wisphub)}</span>\` : '<span style="color: var(--accent-amber); font-weight: 600;">⚠️ Sin IPv6</span>';
            const ipv6Display = \`
              <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.4;">
                <div><span style="font-size: 9px; color: var(--text-dim);">OLT:</span> \${oltIpv6}</div>
                <div><span style="font-size: 9px; color: var(--text-dim);">WH:</span> \${whIpv6}</div>
              </div>
            \`;

            // VLAN & Zone
            const vlanBadge = item.vlan ? \`<span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); font-weight: 700;">VLAN \${escapeHtml(item.vlan)}</span>\` : '<span style="color: var(--text-dim); font-size: 11px;">S/VLAN</span>';
            const oltZone = item.smartolt_name || item.zona_o_router ? \`<div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">\${escapeHtml(item.smartolt_name || item.zona_o_router)}</div>\` : '';

            // Actions (Sync to WispHub + Configure SmartOLT)
            const actions = [];

            // 1. Sync button for WispHub
            if (item.wisphub_id) {
              const syncData = {
                wisphub_id: item.wisphub_id,
                smartolt_id: item.smartolt_id || '',
                mac: item.mac_wisphub || item.mac_smartolt || '',
                ipv6_prefix: item.ipv6_wisphub || (item.ipv6_smartolt && !item.ipv6_smartolt.includes('Solo') ? item.ipv6_smartolt : '') || '',
                ip: item.smartolt_ip || item.wisphub_ip || '',
                sn: item.sn || item.sn_smartolt || item.sn_wisphub || '',
                cliente: item.cliente || '',
                folio: item.folio || item.servicio || '',
                router: item.zona_o_router || ''
              };
              const jsonStr = encodeURIComponent(JSON.stringify(syncData));

              if (item.sync_status === 'SYNCED') {
                actions.push(\`
                  <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <span class="badge badge-success" style="font-size: 10.5px;">✓ WH Sincronizado</span>
                    <button class="btn btn-secondary btn-sm" onclick="openSyncClientModal('\${jsonStr}', '\${rowId}')" title="Editar MAC o IPv6" style="padding: 2px 6px; font-size: 10px;">✏️</button>
                  </div>
                \`);
              } else {
                actions.push(\`
                  <button id="btn-prov-sync-\${item.wisphub_id}" class="btn btn-primary btn-sm" onclick="openSyncClientModal('\${jsonStr}', '\${rowId}')" title="Completar MAC e IPv6 en WispHub" style="font-size: 11px; padding: 4px 8px;">
                    ⚡ Sincronizar WH
                  </button>
                \`);
              }
            }

            // 2. SmartOLT Provisioning Button (TR-069 + IPv6 in OLT)
            const needsOltConfig = item.tr069_status !== 'ACTIVE' || item.ipv6_status !== 'DUAL_STACK';
            if (item.smartolt_id && needsOltConfig) {
              const safeClient = (item.cliente || 'Cliente').replace(/'/g, "\\'");
              actions.push(\`
                <button class="btn btn-warning btn-sm" onclick="applyTr069AndIpv6Config('\${item.smartolt_id}', '\${safeClient}')" title="Aprovisionar perfil TR-069 en SmartOLT" style="font-size: 11px; padding: 4px 8px;">
                  🔧 Config OLT
                </button>
              \`);
            }

            const actionsHtml = actions.length > 0 ? \`<div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">\${actions.join('')}</div>\` : '<span style="font-size: 11px; color: var(--text-dim);">--</span>';

            return \`
              <tr id="\${rowId}">
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">\${escapeHtml(item.cliente || 'Desconocido')}</div>
                  <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    SN: \${escapeHtml(item.sn || item.sn_smartolt || item.sn_wisphub || '--')}
                  </div>
                </td>
                <td>
                  \${vlanBadge}
                  \${oltZone}
                </td>
                <td>\${ipDisplay}</td>
                <td>\${macDisplay}</td>
                <td>\${ipv6Display}</td>
                <td id="\${rowId}-status">
                  <div>\${trBadge}</div>
                  <div>\${syncBadge}</div>
                </td>
                <td id="\${rowId}-action" style="text-align: center;">\${actionsHtml}</td>
              </tr>
            \`;
          }).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No se encontraron ONUs con los filtros seleccionados.</td></tr>';
        }
      } catch (err) {
        console.error('Error loading provisioning:', err);
        if (tbody) {
          tbody.innerHTML = \`<tr><td colspan="7" style="text-align: center; color: var(--accent-rose); padding: 24px;">Error al cargar datos: \${escapeHtml(err.message || 'Error')}</td></tr>\`;
        }
      }
    }

    function handleProvVlanChange(vlan) {
      state.provisioning.vlan = (vlan || '').trim();
      state.provisioning.page = 1;
      loadProvisioningData();
    }

    async function syncCurrentProvVlanBatch() {
      const currentVlan = state.provisioning.vlan;
      const vlanLabel = currentVlan ? \`VLAN \${currentVlan}\` : 'todas las VLANs';
      
      showConfirmDialog(
        \`Sincronizar \${vlanLabel} a WispHub\`,
        \`¿Deseas sincronizar automáticamente la MAC y el Prefijo IPv6 de SmartOLT a WispHub para todos los clientes desincronizados de \${vlanLabel}?\`,
        async () => {
          const btn = document.getElementById('btn-sync-prov-vlan');
          if (btn) {
            btn.disabled = true;
            btn.innerText = '⏳ Sincronizando Lote...';
          }
          showToast('Sincronización Masiva', \`Iniciando sincronización para \${vlanLabel}...\`, 'info', 4000);

          try {
            const res = await apiFetch('/api/audit/sync-vlan', {
              method: 'POST',
              body: JSON.stringify({ vlan: currentVlan }),
            });

            if (res.success) {
              showToast('Lote Completado', \`Sincronizados: \${res.synced_count || 0} clientes de \${vlanLabel}.\`, 'success', 5000);
              loadProvisioningData();
            } else {
              showToast('Error', res.error || 'Fallo en la sincronización del lote', 'error', 5000);
            }
          } catch (err) {
            showToast('Error', err.message || 'Error de comunicación', 'error');
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.innerText = '⚡ Sincronizar VLAN a WispHub';
            }
          }
        },
        false
      );
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
        renderTechniciansTable(state.technicians);
      } catch (err) {
        console.error('Error loading technicians:', err);
      }
    }

    function renderTechniciansTable(techs) {
      const tbody = document.getElementById('table-technicians-body');
      if (!techs || techs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No hay técnicos registrados.</td></tr>';
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
          <td>
            <div style="display: flex; gap: 8px;">
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
        renderAdminUsersTable(state.adminUsers);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    }

    function renderAdminUsersTable(users) {
      const tbody = document.getElementById('table-admin-users-body');
      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No hay usuarios registrados.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(u => \`
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">@\${u.username}</td>
          <td style="font-weight: 600;">\${escapeHtml(u.name)}</td>
          <td><span class="badge badge-purple">\${u.role}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim);">\${u.last_login ? new Date(u.last_login).toLocaleString() : 'Nunca'}</td>
          <td>
            \${u.username !== 'admin' ? \`
              <button class="btn btn-danger btn-sm" onclick="deleteAdminUserItem(\${u.id}, '\${u.username}')">
                Eliminar
              </button>
            \` : '<span style="color: var(--text-dim); font-size: 11px;">Principal</span>'}
          </td>
        </tr>
      \`).join('');
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

        const res = await apiFetch('/api/admin/clients?' + params.toString());
        if (!res.success) {
          showToast('Error', res.error || 'No se pudieron cargar los clientes.', 'error');
          return;
        }

        state.clients.items = res.clients || [];
        state.clients.total = res.total || 0;

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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No se encontraron clientes con los filtros aplicados.</td></tr>';
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
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; cursor: pointer;" title="Teléfono Principal de WhatsApp" onclick="selectChat('\${primaryPhone}'); navigateTo('live-chat');">
                📱 \${primaryPhone}
              </span>
              <a href="https://wa.me/52\${primaryPhone}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px;" title="Abrir en WhatsApp">
                💬
              </a>
            </div>
          \`;
        }

        if (extraPhones.length > 0) {
          phonesHtml += \`
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px;">
              \${extraPhones.map(ep => \`
                <span class="badge badge-purple" style="font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; cursor: pointer;" title="Número adicional / Familiar" onclick="copyToClipboard('\${ep}')">
                  📞 \${ep}
                </span>
              \`).join('')}
            </div>
          \`;
        }

        if (!primaryPhone && extraPhones.length === 0) {
          phonesHtml = '<span style="color: var(--text-dim); font-size: 11px;">Sin teléfono</span>';
        }

        phonesHtml += \`
          <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px; margin-top: 2px;" onclick='openClientPhonesModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
            ✏️ Teléfonos
          </button>
        \`;

        // Render Ubicación & GPS
        let gpsHtml = '';
        const coords = c.coordenadas_gps;
        const mapsUrl = c.google_maps_url || (coords ? \`https://www.google.com/maps?q=\${coords}\` : '');

        if (coords || mapsUrl) {
          gpsHtml = \`
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-success" style="font-family: var(--font-mono); font-size: 11px; padding: 2px 6px;">
                  📍 \${coords || 'GPS'}
                </span>
                <a href="\${mapsUrl || '#'}" target="_blank" class="btn btn-primary btn-sm" style="padding: 3px 8px; font-size: 10.5px; text-decoration: none;" title="Abrir en Google Maps">
                  🗺️ Maps
                </a>
              </div>
              \${c.direccion ? \`<span style="font-size: 11px; color: var(--text-dim); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${escapeHtml(c.direccion)}">🏠 \${escapeHtml(c.direccion)}</span>\` : ''}
              <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px; align-self: flex-start;" onclick='openClientLocationModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
                ✏️ Editar GPS
              </button>
            </div>
          \`;
        } else {
          gpsHtml = \`
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">
                ⚠️ Sin ubicación GPS
              </span>
              \${c.direccion ? \`<span style="font-size: 11px; color: var(--text-dim); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${escapeHtml(c.direccion)}">\${escapeHtml(c.direccion)}</span>\` : ''}
              <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10.5px; align-self: flex-start;" onclick='openClientLocationModal(\${JSON.stringify(c).replace(/'/g, "&apos;")})'>
                📍 Asignar GPS
              </button>
            </div>
          \`;
        }

        // Datos Técnicos (IP, SN ONU, Plan, Router)
        const techHtml = \`
          <div style="display: flex; flex-direction: column; gap: 2px; font-size: 11.5px;">
            <div><span style="color: var(--text-dim);">IP:</span> <span style="font-family: var(--font-mono); font-weight: 600;">\${c.ip || '--'}</span></div>
            <div><span style="color: var(--text-dim);">SN:</span> <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;">\${c.sn_onu || '--'}</span></div>
            <div><span style="color: var(--text-dim);">Plan:</span> <span>\${escapeHtml(c.plan_internet || '--')}</span></div>
          </div>
        \`;

        return \`
          <tr>
            <td>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-weight: 700; font-size: 13.5px; color: #fff;">\${escapeHtml(c.nombre)}</div>
                <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                  <span style="font-family: var(--font-mono); color: var(--primary);">#\${c.id_servicio}</span>
                  <span>\${escapeHtml(c.servicio || '')}</span>
                </div>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                \${estadoBadge}
                \${facturasBadge}
              </div>
            </td>
            <td>
              <span class="badge badge-purple" style="font-size: 11px;">
                Día \${c.dia_corte || '--'}
              </span>
            </td>
            <td>\${phonesHtml}</td>
            <td>\${gpsHtml}</td>
            <td>\${techHtml}</td>
            <td style="text-align: right;">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="openClientDetailModal(\${c.id_servicio})" title="Ver Expediente Completo">
                  👁️ Ficha
                </button>
                \${primaryPhone ? \`
                  <button class="btn btn-primary btn-sm" onclick="selectChat('\${primaryPhone}'); navigateTo('live-chat');" title="Abrir Chat WhatsApp">
                    💬 Chat
                  </button>
                \` : ''}
              </div>
            </td>
          </tr>
        \`;
      }).join('');
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
      loadViewData(state.currentView);
      loadDashboardBadgeCounters();
      setInterval(loadDashboardBadgeCounters, 15000);
    }

    window.addEventListener('DOMContentLoaded', () => {
      checkAuthSession();
    });
  </script>
</body>
</html>
`;
}
