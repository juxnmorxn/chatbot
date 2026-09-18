export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudWareMx - Admin ISP Control Center</title>
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
      grid-template-columns: 320px 1fr;
      height: calc(100vh - var(--topbar-height) - 48px);
      background: var(--bg-surface);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .chat-sidebar {
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.2);
    }

    .chat-search-header {
      padding: 14px;
      border-bottom: 1px solid var(--card-border);
    }

    .chat-threads-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
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
      background: radial-gradient(circle at 50% 50%, rgba(17, 24, 39, 0.6) 0%, rgba(9, 13, 22, 0.95) 100%);
    }

    .chat-header-bar {
      padding: 12px 20px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(11, 15, 25, 0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chat-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chat-messages-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .chat-bubble {
      max-width: 72%;
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
      padding: 14px 20px;
      border-top: 1px solid var(--card-border);
      background: rgba(11, 15, 25, 0.85);
      display: flex;
      align-items: flex-end;
      gap: 12px;
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

    @media (max-width: 768px) {
      aside#sidebar { transform: translateX(-100%); }
      aside#sidebar.mobile-open { transform: translateX(0); width: 260px; }
      main#main-content { margin-left: 0 !important; }
      .mobile-menu-btn { display: flex; }
      .chat-layout { grid-template-columns: 1fr; }
      .chat-sidebar { display: none; }
      .chat-sidebar.mobile-active { display: flex; }
      .kanban-board { grid-template-columns: 1fr; }
      .grid-metrics { grid-template-columns: 1fr 1fr; }
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
          <div id="whatsapp-live-pill" class="live-status-pill">
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
              <input type="text" id="chat-filter-input" class="form-control" placeholder="Buscar cliente o número..." oninput="filterChatThreads(this.value)">
            </div>
            <div id="chat-threads-container" class="chat-threads-list"></div>
          </div>

          <div class="chat-main-area">
            <div id="chat-active-header" class="chat-header-bar" style="display: none;">
              <div class="chat-header-left">
                <button class="btn btn-secondary btn-sm" style="display: none;" id="btn-back-to-threads" onclick="toggleMobileChatThreads()">◀ Hilos</button>
                <div class="thread-avatar" id="active-chat-avatar">📱</div>
                <div>
                  <h4 id="active-chat-name" style="font-size: 14px; font-weight: 700;">Seleccione un chat</h4>
                  <span id="active-chat-phone" style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">--</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div id="takeover-status-indicator" class="badge badge-success">🤖 Bot Automático</div>
                <button id="btn-toggle-takeover" class="btn btn-secondary btn-sm" onclick="toggleCurrentChatTakeover()">
                  Pausar 4h
                </button>
                <button class="btn btn-secondary btn-sm" title="Pausar hasta mañana a las 10:00 AM" onclick="pauseCurrentChatUntilMorning()">
                  🌙 Hasta Mañana
                </button>
                <button class="btn btn-danger btn-sm" title="Finalizar caso y reactivar bot" onclick="closeCurrentChatCase()">
                  <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                  <span>Cerrar Caso</span>
                </button>
              </div>
            </div>

            <div id="chat-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim); gap: 12px;">
              <svg class="svg-icon" style="width: 48px; height: 48px; opacity: 0.5;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <p>Selecciona una conversación para chatear en tiempo real.</p>
            </div>

            <div id="chat-messages-wrap" class="chat-messages-container" style="display: none;"></div>

            <div id="chat-input-container" class="chat-input-bar" style="display: none;">
              <textarea id="chat-text-input" class="chat-input-box" placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)" rows="1" onkeydown="handleChatInputKeyDown(event)"></textarea>
              <button class="btn btn-primary" onclick="sendActiveChatMessage()" style="height: 42px; padding: 0 18px;">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 3: KANBAN TICKETS BOARD -->
      <section id="view-tickets" class="view-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700;">Tablero de Soporte Técnico</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Mueve y asigna técnicos a los folios de servicio.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="loadTicketsData()">
            <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>
            <span>Recargar Tablero</span>
          </button>
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
          <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">Ocupación de Pools por VLAN</h3>
          <div id="ipam-pools-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;"></div>
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

      <!-- VIEW 5: AUDITORÍA SMARTOLT VS WISPHUB -->
      <section id="view-audit" class="view-container">
        <div class="glass-card" style="margin-bottom: 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="audit-filter-buttons">
              <button class="btn btn-secondary btn-sm active" onclick="setAuditFilter('all')">Todos</button>
              <button class="btn btn-danger btn-sm" onclick="setAuditFilter('MISMATCH')">Mismatches</button>
              <button class="btn btn-success btn-sm" onclick="setAuditFilter('MATCH')">Correctos</button>
              <button class="btn btn-secondary btn-sm" onclick="setAuditFilter('ONLY_SMARTOLT')">Solo SmartOLT</button>
              <button class="btn btn-secondary btn-sm" onclick="setAuditFilter('ONLY_WISPHUB')">Solo WispHub</button>
            </div>
            <input type="text" id="audit-search-input" class="form-control" style="max-width: 260px;" placeholder="Buscar por nombre, IP o SN..." oninput="handleAuditSearch(this.value)">
          </div>
        </div>

        <div class="glass-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Servicio / Folio</th>
                  <th>IP SmartOLT</th>
                  <th>IP WispHub</th>
                  <th>Estado IP</th>
                  <th>Plan WispHub</th>
                </tr>
              </thead>
              <tbody id="table-audit-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Cargando auditoría...</td></tr>
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
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <!-- Evolution QR & WhatsApp Status -->
          <div class="glass-card">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">Vinculación de WhatsApp (Evolution API)</h3>
            <div id="evolution-qr-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); margin-bottom: 16px; padding: 16px;">
              <svg class="svg-icon" style="width: 44px; height: 44px; margin-bottom: 8px; color: var(--accent-cyan);" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              <p id="evolution-status-text" style="font-size: 13px; color: var(--text-muted);">Consultando estado de WhatsApp...</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="fetchWhatsAppStatus()">Refrescar QR</button>
              <button class="btn btn-danger btn-sm" onclick="disconnectWhatsAppSession()">Desvincular</button>
            </div>
          </div>

          <!-- Settings Form -->
          <div class="glass-card">
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px;">Variables de Entorno en Turso DB</h3>
            <form id="settings-form" onsubmit="handleSaveSettings(event)">
              <div class="form-group">
                <label class="form-label">Evolution API URL</label>
                <input type="text" id="setting-EVOLUTION_URL" class="form-control" placeholder="https://evolution.example.com">
              </div>
              <div class="form-group">
                <label class="form-label">Evolution API Key</label>
                <input type="password" id="setting-EVOLUTION_API_KEY" class="form-control" placeholder="••••••••">
              </div>
              <div class="form-group">
                <label class="form-label">Groq API Key</label>
                <input type="password" id="setting-GROQ_API_KEY" class="form-control" placeholder="••••••••">
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                Guardar Configuraciones
              </button>
            </form>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="glass-card" style="margin-top: 24px; border-color: rgba(244, 63, 94, 0.3);">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--accent-rose); margin-bottom: 12px;">Zona de Pruebas & Reset</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Elimina datos de prueba sin afectar la base de datos de producción.</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-danger btn-sm" onclick="clearSessionsData()">Vaciar Sesiones</button>
            <button class="btn btn-danger btn-sm" onclick="clearLogsData()">Vaciar Historial Logs</button>
            <button class="btn btn-danger btn-sm" onclick="clearTicketsData()">Vaciar Tickets</button>
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
      tickets: [],
      audit: { filter: 'all', search: '', page: 1, limit: 30, total: 0 },
      technicians: [],
      adminUsers: [],
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

      const userNav = document.getElementById('nav-item-users');
      if (userNav) {
        userNav.style.display = state.user.role === 'superadmin' ? 'flex' : 'none';
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
        'tickets': 'Mesa de Tickets (Kanban)',
        'ipam': 'IPAM & Gestión de Pools VLAN',
        'audit': 'Auditoría SmartOLT vs WispHub',
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
        case 'tickets': loadTicketsData(); break;
        case 'ipam': loadIpamData(); break;
        case 'audit': loadAuditData(); break;
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


        evtSource.addEventListener('tickets:update', () => {
          if (state.currentView === 'tickets') loadTicketsData();
          loadDashboardBadgeCounters();
        });
      }
    }

    // Dashboard Data
    async function loadDashboardData() {
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

    async function loadDashboardBadgeCounters() {
      try {
        const [ticketStats, ipamRes] = await Promise.all([
          apiFetch('/api/tickets/stats').catch(() => ({ stats: { abiertos: 0 } })),
          apiFetch('/api/smartolt/unconfigured').catch(() => ({ count: 0 })),
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
        const res = await apiFetch('/api/admin/chats');
        state.chats = res.conversations || [];
        renderChatThreads(state.chats);

        if (reselect && state.chats.length > 0 && !state.activeChatPhone) {
          selectChat(state.chats[0].phone);
        }
      } catch (err) {
        console.error('Error loading chats:', err);
      }
    }

    function renderChatThreads(list) {
      const container = document.getElementById('chat-threads-container');
      if (!list || list.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">Sin conversaciones activas.</div>';
        return;
      }

      container.innerHTML = list.map(c => {
        const isActive = c.phone === state.activeChatPhone ? 'active' : '';
        const name = c.client_name || c.phone;
        const initials = name.substring(0, 2).toUpperCase();
        return \`
          <div class="chat-thread-item \${isActive}" onclick="selectChat('\${c.phone}')">
            <div class="thread-avatar">\${initials}</div>
            <div class="thread-content">
              <div class="thread-top">
                <span class="thread-name">\${escapeHtml(name)}</span>
                <span class="thread-time">\${formatShortTime(c.last_interaction)}</span>
              </div>
              <div class="thread-preview">\${escapeHtml(c.last_message || '')}</div>
              <span class="badge \${c.is_human_paused ? 'badge-warning' : 'badge-info'}" style="align-self: flex-start; margin-top: 2px; font-size: 9.5px;">
                \${c.is_human_paused ? '⏸️ Humano' : '🤖 Bot'}
              </span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function filterChatThreads(q) {
      const term = q.toLowerCase();
      const filtered = state.chats.filter(c => 
        (c.client_name && c.client_name.toLowerCase().includes(term)) ||
        c.phone.includes(term) ||
        (c.last_message && c.last_message.toLowerCase().includes(term))
      );
      renderChatThreads(filtered);
    }

    async function selectChat(phone) {
      state.activeChatPhone = phone;
      renderChatThreads(state.chats);

      document.getElementById('chat-empty-state').style.display = 'none';
      document.getElementById('chat-active-header').style.display = 'flex';
      document.getElementById('chat-messages-wrap').style.display = 'flex';
      document.getElementById('chat-input-container').style.display = 'flex';

      const chat = state.chats.find(c => c.phone === phone);
      document.getElementById('active-chat-name').innerText = chat?.client_name || phone;
      document.getElementById('active-chat-phone').innerText = phone;
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

      input.value = '';
      appendChatMessage({ message: text, direction: 'OUT' });

      try {
        const res = await apiFetch('/api/admin/chats/send', {
          method: 'POST',
          body: JSON.stringify({
            phone: state.activeChatPhone,
            message: text,
            mode: '4h',
          }),
        });

        if (res.success) {
          updateTakeoverButton(true, res.takeover);
          const chat = state.chats.find(c => c.phone === state.activeChatPhone);
          if (chat) chat.is_human_paused = true;
          renderChatThreads(state.chats);
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
        const desc = takeover?.descripcion || (takeover?.minutosRestantes ? (takeover.minutosRestantes + 'm restantes') : 'Humano Activo');
        ind.innerText = '⏸️ Operador (' + desc + ')';
        btn.innerText = 'Reactivar Bot';
        btn.className = 'btn btn-success btn-sm';
      } else {
        ind.className = 'badge badge-success';
        ind.innerText = '🤖 Bot Automático';
        btn.innerText = 'Pausar 4h';
        btn.className = 'btn btn-secondary btn-sm';
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
      const chat = state.chats.find(c => c.phone === state.activeChatPhone);
      const phone = state.activeChatPhone;

      try {
        const res = await apiFetch('/api/admin/chats/' + encodeURIComponent(phone) + '/close', {
          method: 'POST',
        });

        if (res.success) {
          if (chat) chat.is_human_paused = false;
          updateTakeoverButton(false);
          renderChatThreads(state.chats);
          showToast('Caso Finalizado', res.message, 'success');
        } else {
          showToast('Error', res.error || 'No se pudo cerrar el caso', 'error');
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
            const pct = p.total > 0 ? Math.round((p.used / p.total) * 100) : 0;
            return \`
              <div class="glass-card" style="background: rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-weight: 700; font-size: 14px;">VLAN \${p.vlan} (\${p.subnet})</span>
                  <span class="badge badge-info">\${pct}% Ocupado</span>
                </div>
                <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                  <div style="background: linear-gradient(90deg, var(--accent-cyan), var(--primary)); width: \${pct}%; height: 100%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
                  <span>Usadas: \${p.used}</span>
                  <span>Disponibles: \${p.free}</span>
                  <span>Total: \${p.total}</span>
                </div>
              </div>
            \`;
          }).join('');
        }

        const unconfTable = document.getElementById('table-unconfigured-onus-body');
        if (unconfRes.unconfigured && unconfRes.unconfigured.length > 0) {
          unconfTable.innerHTML = unconfRes.unconfigured.map(o => \`
            <tr>
              <td>\${escapeHtml(o.olt_name || 'OLT')}</td>
              <td style="font-family: var(--font-mono);">\${o.pon_port || 'PON'}</td>
              <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">\${o.sn}</td>
              <td>\${escapeHtml(o.model || 'ONU')}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="openAuthorizeOnuModal('\${o.sn}', '\${o.olt_id || 1}')">
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
      try {
        const params = new URLSearchParams({
          filter: state.audit.filter,
          search: state.audit.search,
          page: state.audit.page,
          limit: state.audit.limit,
        });

        const res = await apiFetch('/api/audit/ip-cross?' + params.toString());
        state.audit.total = res.total || 0;

        document.getElementById('audit-pagination-info').innerText = \`Mostrando página \${state.audit.page} de \${Math.ceil((res.total || 1) / state.audit.limit)} (\${res.total} registros)\`;

        const tbody = document.getElementById('table-audit-body');
        if (res.items && res.items.length > 0) {
          tbody.innerHTML = res.items.map(item => {
            let statusBadge = '<span class="badge badge-success">MATCH</span>';
            if (item.ip_status === 'MISMATCH') statusBadge = '<span class="badge badge-danger">MISMATCH</span>';
            if (item.ip_status === 'ONLY_SMARTOLT') statusBadge = '<span class="badge badge-info">Solo SmartOLT</span>';
            if (item.ip_status === 'ONLY_WISPHUB') statusBadge = '<span class="badge badge-purple">Solo WispHub</span>';
            if (item.ip_status === 'NO_IP') statusBadge = '<span class="badge badge-warning">Sin IP</span>';

            return \`
              <tr>
                <td style="font-weight: 600;">\${escapeHtml(item.cliente || 'Desconocido')}</td>
                <td style="font-family: var(--font-mono); font-size: 11px;">\${item.servicio || item.folio || '--'}</td>
                <td style="font-family: var(--font-mono); color: var(--accent-cyan);">\${item.smartolt_ip || '--'}</td>
                <td style="font-family: var(--font-mono); color: var(--accent-green);">\${item.wisphub_ip || '--'}</td>
                <td>\${statusBadge}</td>
                <td>\${escapeHtml(item.wisphub_plan || '--')}</td>
              </tr>
            \`;
          }).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No se encontraron registros.</td></tr>';
        }
      } catch (err) {
        console.error('Error loading audit:', err);
      }
    }

    function setAuditFilter(f) {
      state.audit.filter = f;
      state.audit.page = 1;
      document.querySelectorAll('#audit-filter-buttons button').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      loadAuditData();
    }

    function handleAuditSearch(q) {
      state.audit.search = q.trim();
      state.audit.page = 1;
      loadAuditData();
    }

    function changeAuditPage(dir) {
      const maxPage = Math.ceil(state.audit.total / state.audit.limit) || 1;
      const newPage = state.audit.page + dir;
      if (newPage >= 1 && newPage <= maxPage) {
        state.audit.page = newPage;
        loadAuditData();
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
          Object.keys(res.settings).forEach(k => {
            const input = document.getElementById('setting-' + k);
            if (input) input.value = res.settings[k];
          });
        }
        fetchWhatsAppStatus();
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }

    async function handleSaveSettings(e) {
      e.preventDefault();
      const settings = {
        EVOLUTION_URL: document.getElementById('setting-EVOLUTION_URL')?.value.trim(),
        EVOLUTION_API_KEY: document.getElementById('setting-EVOLUTION_API_KEY')?.value.trim(),
        GROQ_API_KEY: document.getElementById('setting-GROQ_API_KEY')?.value.trim(),
      };

      try {
        const res = await apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ settings }),
        });
        if (res.success) {
          showToast('Guardado', 'Variables actualizadas correctamente en Turso DB.', 'success');
        } else {
          showToast('Error', res.error, 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    async function fetchWhatsAppStatus() {
      const container = document.getElementById('evolution-qr-container');
      const text = document.getElementById('evolution-status-text');
      try {
        const res = await apiFetch('/api/whatsapp/status');
        if (res.state === 'open') {
          container.innerHTML = \`
            <svg class="svg-icon" style="width: 48px; height: 48px; color: var(--accent-green); margin-bottom: 8px;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <h4 style="font-size: 15px; font-weight: 700;">WhatsApp Conectado</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Instancia activa y recibiendo mensajes.</p>
          \`;
          document.getElementById('whatsapp-pill-label').innerText = 'WhatsApp Activo';
        } else if (res.qr) {
          container.innerHTML = \`
            <img src="\${res.qr}" style="width: 180px; height: 180px; border-radius: 8px; background: #fff; padding: 6px;" alt="QR Code">
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">Escanea este código desde WhatsApp</p>
          \`;
          document.getElementById('whatsapp-pill-label').innerText = 'WhatsApp Desconectado';
        } else {
          container.innerHTML = '<p style="color: var(--text-muted);">Instancia desconectada o esperando QR...</p>';
        }
      } catch (err) {
        text.innerText = 'No se pudo contactar a Evolution API';
      }
    }

    async function disconnectWhatsAppSession() {
      showConfirmDialog('Desvincular WhatsApp', '¿Deseas cerrar la sesión activa de WhatsApp?', async () => {
        const res = await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
        if (res.success) {
          showToast('Desvinculado', 'Sesión cerrada.', 'info');
          fetchWhatsAppStatus();
        }
      });
    }

    function clearSessionsData() {
      showConfirmDialog('Vaciar Sesiones', '¿Deseas eliminar todas las sesiones de clientes en Turso?', async () => {
        const res = await apiFetch('/api/sessions/clear-all', { method: 'DELETE' });
        showToast('Sesiones Vaciadas', res.message, 'success');
        loadDashboardData();
      });
    }

    function clearLogsData() {
      showConfirmDialog('Vaciar Historial', '¿Deseas vaciar todos los logs de conversación?', async () => {
        const res = await apiFetch('/api/logs/clear-all', { method: 'DELETE' });
        showToast('Historial Vaciado', res.message, 'success');
        loadDashboardData();
      });
    }

    function clearTicketsData() {
      showConfirmDialog('Vaciar Tickets', '¿Deseas eliminar todos los tickets de prueba?', async () => {
        const res = await apiFetch('/api/tickets/clear-all', { method: 'DELETE' });
        showToast('Tickets Vaciados', res.message, 'success');
        loadDashboardData();
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
