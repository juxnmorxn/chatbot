export function getAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudWareMx - Admin SPA Suite</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #030712;
      --bg-surface: rgba(17, 24, 39, 0.75);
      --bg-surface-elevated: rgba(31, 41, 55, 0.85);
      --bg-sidebar: rgba(10, 15, 30, 0.92);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-border-hover: rgba(99, 102, 241, 0.4);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.25);
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --accent-purple: #a855f7;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --font-main: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --sidebar-width: 260px;
      --sidebar-collapsed-width: 76px;
      --topbar-height: 64px;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
      --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.6);
      --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-base);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.04) 0px, transparent 50%);
      color: var(--text-main);
      font-family: var(--font-main);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
    }

    /* Custom Scrollbars */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--primary);
    }

    /* Layout */
    #app-container {
      display: flex;
      width: 100%;
      min-height: 100vh;
    }

    /* Sidebar */
    aside#sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 100;
      transition: var(--transition);
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
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--primary), var(--accent-cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 16px var(--primary-glow);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      transition: var(--transition);
    }

    .brand-title {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.3px;
      background: linear-gradient(90deg, #fff, #9ca3af);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 10px;
      color: var(--accent-cyan);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    #sidebar.collapsed .brand-text {
      display: none;
    }

    .sidebar-toggle-btn {
      background: transparent;
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
    }

    .sidebar-toggle-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--primary);
    }

    #sidebar.collapsed .sidebar-toggle-btn {
      display: none;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
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
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.1));
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.15);
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
      font-size: 18px;
      width: 22px;
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
      animation: pulse-badge 2s infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    #sidebar.collapsed .nav-badge,
    #sidebar.collapsed .nav-text {
      display: none;
    }

    .sidebar-footer {
      padding: 14px;
      border-top: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-purple), var(--primary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
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

    .btn-logout {
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 16px;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-logout:hover {
      color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.1);
    }

    /* Main Content Area */
    main#main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: var(--transition);
    }

    aside#sidebar.collapsed + main#main-content {
      margin-left: var(--sidebar-collapsed-width);
    }

    /* Topbar */
    header.topbar {
      height: var(--topbar-height);
      background: rgba(10, 15, 30, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
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
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      font-size: 20px;
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
      font-size: 18px;
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
      animation: fadeInView 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .view-container.active {
      display: block;
    }

    @keyframes fadeInView {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* UI Cards & Glass Panels */
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
      gap: 18px;
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
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
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
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

    /* Buttons & Form Controls */
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
      box-shadow: 0 6px 18px var(--primary-glow);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border-color: var(--card-border);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-success {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    .btn-success:hover {
      background: rgba(16, 185, 129, 0.25);
    }

    .btn-danger {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.4);
      color: #fda4af;
    }

    .btn-danger:hover {
      background: rgba(244, 63, 94, 0.25);
    }

    .btn-sm {
      padding: 5px 10px;
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
      background: rgba(0, 0, 0, 0.5);
    }

    select.form-control {
      cursor: pointer;
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

    /* Badges & Status Tags */
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

    /* ==========================================
       WHATSAPP LIVE CHAT VIEW
       ========================================== */
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
      position: relative;
    }

    .chat-thread-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .chat-thread-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-left: 3px solid var(--primary);
    }

    .thread-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #374151, #1f2937);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
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

    .thread-status-tag {
      align-self: flex-start;
      margin-top: 2px;
      font-size: 9.5px;
    }

    .chat-main-area {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: radial-gradient(circle at 50% 50%, rgba(17, 24, 39, 0.6) 0%, rgba(3, 7, 18, 0.9) 100%);
    }

    .chat-header-bar {
      padding: 12px 20px;
      border-bottom: 1px solid var(--card-border);
      background: rgba(10, 15, 30, 0.6);
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
      background: #1f2937;
      color: #f3f4f6;
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
      background: rgba(10, 15, 30, 0.8);
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

    /* ==========================================
       KANBAN TICKETS BOARD
       ========================================== */
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

    /* ==========================================
       TOAST NOTIFICATION QUEUE (NO NATIVE ALERTS)
       ========================================== */
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
      animation: slideInToast 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    @keyframes slideInToast {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast.hide {
      animation: slideOutToast 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideOutToast {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }

    .toast-icon {
      font-size: 18px;
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

    /* ==========================================
       GLASS MODAL SYSTEM (NO NATIVE ALERTS)
       ========================================== */
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
      animation: fadeInBackdrop 0.2s ease-out;
    }

    .modal-backdrop.show {
      display: flex;
    }

    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-box {
      background: #111827;
      border: 1px solid var(--card-border-hover);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUpModal 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes scaleUpModal {
      from { opacity: 0; transform: scale(0.95); }
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

    /* Auth Login Overlay View */
    #login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-box {
      width: 100%;
      max-width: 400px;
      background: rgba(17, 24, 39, 0.85);
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

    /* Responsive */
    @media (max-width: 1024px) {
      .kanban-board {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      aside#sidebar {
        transform: translateX(-100%);
      }
      aside#sidebar.mobile-open {
        transform: translateX(0);
        width: 260px;
      }
      main#main-content {
        margin-left: 0 !important;
      }
      .mobile-menu-btn {
        display: flex;
      }
      .chat-layout {
        grid-template-columns: 1fr;
      }
      .chat-sidebar {
        display: none;
      }
      .chat-sidebar.mobile-active {
        display: flex;
      }
      .kanban-board {
        grid-template-columns: 1fr;
      }
      .grid-metrics {
        grid-template-columns: 1fr;
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
      <div id="modal-body-content" class="modal-body">
        <!-- Dynamic Content -->
      </div>
      <div id="modal-footer-actions" class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button id="modal-confirm-btn" class="btn btn-primary">Confirmar</button>
      </div>
    </div>
  </div>

  <!-- Login Overlay View (If unauthenticated) -->
  <div id="login-overlay" style="display: none;">
    <div class="login-box">
      <div style="text-align: center;">
        <div class="brand-logo" style="margin: 0 auto 12px; width: 52px; height: 52px; font-size: 26px;">⚡</div>
        <h2 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CloudWare ISP</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Panel Administrativo & Gestión del Bot</p>
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
        <button type="submit" id="login-btn-submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px;">
          Ingresar al Panel
        </button>
      </form>
    </div>
  </div>

  <!-- App Layout Container -->
  <div id="app-container">
    
    <!-- Sidebar Navigation -->
    <aside id="sidebar">
      <div class="sidebar-header">
        <a href="#dashboard" class="sidebar-brand" onclick="navigateTo('dashboard')">
          <div class="brand-logo">⚡</div>
          <div class="brand-text">
            <span class="brand-title">CloudWareMx</span>
            <span class="brand-subtitle">ISP Command</span>
          </div>
        </a>
        <button class="sidebar-toggle-btn" onclick="toggleSidebar()" title="Colapsar Sidebar">◀</button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-category">Operación</div>
        <div class="nav-item active" data-view="dashboard" onclick="navigateTo('dashboard')">
          <span class="nav-icon">📊</span>
          <span class="nav-text">Dashboard</span>
        </div>
        <div class="nav-item" data-view="live-chat" onclick="navigateTo('live-chat')">
          <span class="nav-icon">💬</span>
          <span class="nav-text">Live WhatsApp</span>
          <span id="badge-live-chat" class="nav-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="tickets" onclick="navigateTo('tickets')">
          <span class="nav-icon">🎫</span>
          <span class="nav-text">Mesa de Tickets</span>
          <span id="badge-tickets-open" class="nav-badge alert-badge" style="display: none;">0</span>
        </div>

        <div class="nav-category">Red & Gestión</div>
        <div class="nav-item" data-view="ipam" onclick="navigateTo('ipam')">
          <span class="nav-icon">🌐</span>
          <span class="nav-text">IPAM & Pools</span>
          <span id="badge-unconfigured-onus" class="nav-badge" style="display: none;">0</span>
        </div>
        <div class="nav-item" data-view="audit" onclick="navigateTo('audit')">
          <span class="nav-icon">⚡</span>
          <span class="nav-text">Auditoría SmartOLT</span>
        </div>
        <div class="nav-item" data-view="technicians" onclick="navigateTo('technicians')">
          <span class="nav-icon">🔧</span>
          <span class="nav-text">Técnicos & PINs</span>
        </div>

        <div class="nav-category">Sistema</div>
        <div class="nav-item" data-view="settings" onclick="navigateTo('settings')">
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">Configuración</span>
        </div>
        <div class="nav-item" id="nav-item-users" data-view="users" onclick="navigateTo('users')">
          <span class="nav-icon">👥</span>
          <span class="nav-text">Usuarios & Roles</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div id="user-avatar-badge" class="user-avatar">AD</div>
        <div class="user-info">
          <span id="user-display-name" class="user-name">Admin</span>
          <span id="user-display-role" class="user-role-badge">Superadmin</span>
        </div>
        <button class="btn-logout" onclick="handleLogout()" title="Cerrar Sesión">🚪</button>
      </div>
    </aside>

    <!-- Main Content Body -->
    <main id="main-content">
      
      <!-- Topbar Header -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button>
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
            🔄 Actualizar
          </button>
        </div>
      </header>

      <!-- VIEW 1: DASHBOARD -->
      <section id="view-dashboard" class="view-container active">
        <div class="grid-metrics">
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>ONUs Registradas</span>
              <div class="metric-icon-box">📡</div>
            </div>
            <div id="metric-onus" class="metric-value">--</div>
            <div class="metric-footer">SmartOLT DB Sync</div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Clientes WispHub</span>
              <div class="metric-icon-box">👥</div>
            </div>
            <div id="metric-wisphub" class="metric-value">--</div>
            <div class="metric-footer">Base Local Turso</div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Tickets Abiertos</span>
              <div class="metric-icon-box" style="color: var(--accent-amber);">🎫</div>
            </div>
            <div id="metric-tickets" class="metric-value">--</div>
            <div class="metric-footer">Pendientes de atención</div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-header">
              <span>Conflictos IP</span>
              <div class="metric-icon-box" style="color: var(--accent-rose);">⚠️</div>
            </div>
            <div id="metric-mismatch" class="metric-value">--</div>
            <div class="metric-footer">SmartOLT vs WispHub</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 700;">Diagnóstico Rápido de Conectividad</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
              <button class="btn btn-secondary" onclick="testServiceConnection('turso')">
                <span>🗄️ Turso DB</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('smartolt')">
                <span>🌐 SmartOLT</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('wisphub')">
                <span>⚡ WispHub</span>
              </button>
              <button class="btn btn-secondary" onclick="testServiceConnection('groq')">
                <span>🤖 Groq AI</span>
              </button>
            </div>
          </div>

          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 700;">Acciones de Sincronización</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary" onclick="triggerSmartOltSync(false)">
                <span>🔄 Sincronizar SmartOLT</span>
              </button>
              <button class="btn btn-secondary" onclick="triggerWisphubSync()">
                <span>🔄 Sincronizar WispHub</span>
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
          <!-- Left threads list -->
          <div class="chat-sidebar" id="chat-threads-sidebar">
            <div class="chat-search-header">
              <input type="text" id="chat-filter-input" class="form-control" placeholder="Buscar cliente o número..." oninput="filterChatThreads(this.value)">
            </div>
            <div id="chat-threads-container" class="chat-threads-list">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Right conversation pane -->
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
              <div style="display: flex; align-items: center; gap: 10px;">
                <div id="takeover-status-indicator" class="badge badge-success">🤖 Bot Automático</div>
                <button id="btn-toggle-takeover" class="btn btn-secondary btn-sm" onclick="toggleCurrentChatTakeover()">
                  ⏸️ Pausar Bot
                </button>
              </div>
            </div>

            <div id="chat-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim); gap: 12px;">
              <span style="font-size: 42px;">💬</span>
              <p>Selecciona una conversación del panel izquierdo para chatear en tiempo real.</p>
            </div>

            <div id="chat-messages-wrap" class="chat-messages-container" style="display: none;">
              <!-- Rendered message bubbles -->
            </div>

            <div id="chat-input-container" class="chat-input-bar" style="display: none;">
              <textarea id="chat-text-input" class="chat-input-box" placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter nueva línea)" rows="1" onkeydown="handleChatInputKeyDown(event)"></textarea>
              <button class="btn btn-primary" onclick="sendActiveChatMessage()" style="height: 42px; padding: 0 18px;">
                <span>Enviar</span> 🚀
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
            <p style="font-size: 12px; color: var(--text-muted);">Mueve y asigna técnicos a los folios generados por el bot.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="loadTicketsData()">
            🔄 Recargar Tablero
          </button>
        </div>

        <div class="kanban-board">
          <!-- Column 1: ABIERTO -->
          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-amber);">
              <span>🟡 ABIERTOS</span>
              <span id="badge-count-abierto" class="badge badge-warning">0</span>
            </div>
            <div id="col-tickets-abierto" class="kanban-cards-wrap"></div>
          </div>

          <!-- Column 2: EN PROCESO -->
          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-cyan);">
              <span>🔵 EN PROCESO</span>
              <span id="badge-count-proceso" class="badge badge-info">0</span>
            </div>
            <div id="col-tickets-en-proceso" class="kanban-cards-wrap"></div>
          </div>

          <!-- Column 3: VISITA TÉCNICA -->
          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-purple);">
              <span>🟣 VISITA TÉCNICA</span>
              <span id="badge-count-visita" class="badge badge-purple">0</span>
            </div>
            <div id="col-tickets-visita" class="kanban-cards-wrap"></div>
          </div>

          <!-- Column 4: RESUELTO -->
          <div class="kanban-column">
            <div class="kanban-col-header" style="border-top: 3px solid var(--accent-green);">
              <span>🟢 RESUELTOS</span>
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
          <div id="ipam-pools-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <!-- Rendered pools progress -->
          </div>
        </div>

        <div class="glass-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 700;">ONUs Nuevas Sin Configurar en SmartOLT</h3>
              <p style="font-size: 12px; color: var(--text-muted);">Detectadas en el PON para activación y asignación de IP.</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="loadIpamData()">🔄 Refrescar PON</button>
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
              <button class="btn btn-danger btn-sm" onclick="setAuditFilter('MISMATCH')">⚠️ Mismatches</button>
              <button class="btn btn-success btn-sm" onclick="setAuditFilter('MATCH')">✅ Correctos</button>
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
            <span>➕ Nuevo Técnico</span>
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
              <span style="font-size: 36px; margin-bottom: 8px;">📡</span>
              <p id="evolution-status-text" style="font-size: 13px; color: var(--text-muted);">Consultando estado de WhatsApp...</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="fetchWhatsAppStatus()">🔄 Refrescar QR</button>
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
            <button class="btn btn-danger btn-sm" onclick="clearSessionsData()">🗑️ Vaciar Sesiones</button>
            <button class="btn btn-danger btn-sm" onclick="clearLogsData()">🗑️ Vaciar Historial Logs</button>
            <button class="btn btn-danger btn-sm" onclick="clearTicketsData()">🗑️ Vaciar Tickets</button>
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
            <span>➕ Crear Administrador</span>
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

  <!-- SPA Client-Side Application Logic -->
  <script>
    // State Store
    const state = {
      token: localStorage.getItem('cloudware_admin_token') || '',
      user: null,
      currentView: 'dashboard',
      chats: [],
      activeChatPhone: null,
      activeChatData: null,
      tickets: [],
      audit: { filter: 'all', search: '', page: 1, limit: 30, total: 0 },
      technicians: [],
      adminUsers: [],
      sseConnected: false,
    };

    // ==========================================
    // TOAST NOTIFICATION ENGINE (Zero native alerts)
    // ==========================================
    function showToast(title, message, type = 'info', duration = 3500) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;

      let icon = 'ℹ️';
      if (type === 'success') icon = '✅';
      if (type === 'error') icon = '❌';
      if (type === 'warning') icon = '⚠️';

      toast.innerHTML = \`
        <span class="toast-icon">\${icon}</span>
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
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    // ==========================================
    // GLASS MODAL ENGINE (Zero native alerts)
    // ==========================================
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
      const modal = document.getElementById('generic-modal');
      modal.classList.remove('show');
    }

    function showConfirmDialog(title, message, onConfirm, isDanger = true) {
      const content = \`<p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5;">\${message}</p>\`;
      openModal(title, content, onConfirm, 'Sí, Continuar', isDanger);
    }

    // ==========================================
    // HTTP CLIENT WITH AUTOMATIC AUTH HEADERS
    // ==========================================
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
          // Token expired or invalid
          handleLogout();
          throw new Error('Sesión expirada. Por favor inicie sesión.');
        }
        const data = await res.json();
        return data;
      } catch (err) {
        console.error('API Fetch Error:', err);
        throw err;
      }
    }

    // ==========================================
    // AUTHENTICATION & LOGIN FLOW
    // ==========================================
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

      // Hide Users nav item if not superadmin
      const userNav = document.getElementById('nav-item-users');
      if (userNav) {
        userNav.style.display = state.user.role === 'superadmin' ? 'flex' : 'none';
      }
    }

    // ==========================================
    // NAVIGATION & VIEW SWITCHER (Zero Reloads)
    // ==========================================
    function navigateTo(viewId) {
      state.currentView = viewId;

      // Update Nav active classes
      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // Update View Containers
      document.querySelectorAll('.view-container').forEach(v => {
        v.classList.remove('active');
      });

      const target = document.getElementById('view-' + viewId);
      if (target) target.classList.add('active');

      // Update Topbar Title
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

      // Close mobile menu if open
      document.getElementById('sidebar').classList.remove('mobile-open');

      // Trigger view data refresh
      loadViewData(viewId);
    }

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('collapsed');
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
        case 'dashboard':
          loadDashboardData();
          break;
        case 'live-chat':
          loadLiveChatData();
          break;
        case 'tickets':
          loadTicketsData();
          break;
        case 'ipam':
          loadIpamData();
          break;
        case 'audit':
          loadAuditData();
          break;
        case 'technicians':
          loadTechniciansData();
          break;
        case 'settings':
          loadSettingsData();
          break;
        case 'users':
          loadAdminUsersData();
          break;
      }
    }

    // ==========================================
    // REAL-TIME SSE (Server-Sent Events) ENGINE
    // ==========================================
    function initSSEStream() {
      if (window.EventSource) {
        const evtSource = new EventSource('/api/admin/live-stream');
        
        evtSource.addEventListener('connected', () => {
          state.sseConnected = true;
          document.getElementById('whatsapp-live-pill').style.opacity = '1';
        });

        evtSource.addEventListener('chat:message', (e) => {
          const data = JSON.parse(e.data || '{}');
          if (state.currentView === 'live-chat') {
            loadLiveChatData(false);
            if (state.activeChatPhone && state.activeChatPhone === data.phone) {
              appendChatMessage(data);
            }
          }
        });

        evtSource.addEventListener('tickets:update', () => {
          if (state.currentView === 'tickets') loadTicketsData();
          loadDashboardBadgeCounters();
        });

        evtSource.onerror = () => {
          state.sseConnected = false;
        };
      }
    }

    // ==========================================
    // MODULE 1: DASHBOARD
    // ==========================================
    async function loadDashboardData() {
      try {
        const [smartStats, wisphubStats, ticketStats, logsRes] = await Promise.all([
          apiFetch('/api/smartolt/stats').catch(() => ({ stats: { total_onus: 0 } })),
          apiFetch('/api/wisphub/stats').catch(() => ({ stats: { total: 0 } })),
          apiFetch('/api/tickets/stats').catch(() => ({ stats: { abiertos: 0 } })),
          apiFetch('/api/logs?limit=8').catch(() => ({ logs: [] })),
        ]);

        document.getElementById('metric-onus').innerText = (smartStats.stats?.total_onus || 0).toLocaleString();
        document.getElementById('metric-wisphub').innerText = (wisphubStats.stats?.total || 0).toLocaleString();
        document.getElementById('metric-tickets').innerText = (ticketStats.stats?.abiertos || 0).toLocaleString();

        const auditRes = await apiFetch('/api/audit/ip-cross?filter=MISMATCH&limit=1').catch(() => ({ total: 0 }));
        document.getElementById('metric-mismatch').innerText = (auditRes.total || 0).toLocaleString();

        // Render Recent Logs Table
        const tbody = document.getElementById('table-recent-logs-body');
        if (logsRes.logs && logsRes.logs.length > 0) {
          tbody.innerHTML = logsRes.logs.map(l => \`
            <tr>
              <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">\${new Date(l.created_at).toLocaleTimeString()}</td>
              <td style="font-family: var(--font-mono); font-weight: 600;">\${l.phone}</td>
              <td>\${l.client_name || '<span style="color: var(--text-dim);">Desconocido</span>'}</td>
              <td><span class="badge \${l.direction === 'IN' ? 'badge-info' : 'badge-purple'}">\${l.direction === 'IN' ? 'Entrante' : 'Saliente'}</span></td>
              <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${escapeHtml(l.message)}</td>
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
      showToast('Comprobando...', \`Verificando conexión con \${service.toUpperCase()}...\`, 'info', 2000);
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

    // ==========================================
    // MODULE 2: LIVE WHATSAPP CHAT
    // ==========================================
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
              <span class="badge \${c.is_human_paused ? 'badge-warning' : 'badge-info'} thread-status-tag">
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
      document.getElementById('active-chat-avatar').innerText = (chat?.client_name || phone).substring(0, 2).toUpperCase();

      updateTakeoverButton(chat?.is_human_paused);

      try {
        const res = await apiFetch(\`/api/admin/chats/\${encodeURIComponent(phone)}/messages\`);
        renderChatMessages(res.messages || []);
      } catch (err) {
        showToast('Error', 'No se pudieron cargar los mensajes', 'error');
      }
    }

    function renderChatMessages(messages) {
      const wrap = document.getElementById('chat-messages-wrap');
      if (!messages || messages.length === 0) {
        wrap.innerHTML = '<div style="text-align: center; color: var(--text-dim); margin-top: 40px;">No hay mensajes registrados con este cliente.</div>';
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
            autoPauseMinutes: 60,
          }),
        });

        if (res.success) {
          updateTakeoverButton(true);
        } else {
          showToast('Error', res.error || 'No se pudo enviar el mensaje', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    function updateTakeoverButton(isPaused) {
      const ind = document.getElementById('takeover-status-indicator');
      const btn = document.getElementById('btn-toggle-takeover');

      if (isPaused) {
        ind.className = 'badge badge-warning';
        ind.innerText = '⏸️ Operador Humano';
        btn.innerText = '▶️ Reactivar Bot';
        btn.className = 'btn btn-success btn-sm';
      } else {
        ind.className = 'badge badge-success';
        ind.innerText = '🤖 Bot Automático';
        btn.innerText = '⏸️ Pausar Bot';
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
            minutes: 60,
          }),
        });

        if (res.success) {
          if (chat) chat.is_human_paused = willPause;
          updateTakeoverButton(willPause);
          showToast('Modo de Atención', res.message, 'success');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }

    // ==========================================
    // MODULE 3: KANBAN TICKETS BOARD
    // ==========================================
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

    // ==========================================
    // MODULE 4: IPAM & POOLS
    // ==========================================
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
                  ⚡ Aprovisionar
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
          showToast('Campos requeridos', 'Ingrese nombre e IP', 'warning');
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

    // ==========================================
    // MODULE 5: AUDITORÍA SMARTOLT VS WISPHUB
    // ==========================================
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
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No se encontraron registros con este filtro.</td></tr>';
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

    // ==========================================
    // MODULE 6: TÉCNICOS AUTORIZADOS & PINS
    // ==========================================
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
      showConfirmDialog('Eliminar Técnico', \`¿Seguro que deseas eliminar el acceso a \${name}?\`, async () => {
        const res = await apiFetch(\`/api/technicians/\${id}\`, { method: 'DELETE' });
        if (res.success) {
          showToast('Eliminado', 'Técnico eliminado.', 'success');
          loadTechniciansData();
        }
      });
    }

    // ==========================================
    // MODULE 7: CONFIGURACIÓN & INTEGRACIONES
    // ==========================================
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
            <span style="font-size: 48px; color: var(--accent-green);">✅</span>
            <h4 style="font-size: 15px; font-weight: 700; margin-top: 8px;">WhatsApp Conectado</h4>
            <p style="font-size: 12px; color: var(--text-muted);">Instancia activa y recibiendo webhooks.</p>
          \`;
          document.getElementById('whatsapp-pill-label').innerText = 'WhatsApp Activo';
        } else if (res.qr) {
          container.innerHTML = \`
            <img src="\${res.qr}" style="width: 180px; height: 180px; border-radius: 8px; background: #fff; padding: 6px;" alt="QR Code">
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 10px;">Escanea este código desde WhatsApp</p>
          \`;
          document.getElementById('whatsapp-pill-label').innerText = 'WhatsApp Desconectado';
        } else {
          container.innerHTML = '<p style="color: var(--text-muted);">Instancia de WhatsApp desconectada o cargando...</p>';
        }
      } catch (err) {
        text.innerText = 'No se pudo contactar a Evolution API';
      }
    }

    async function disconnectWhatsAppSession() {
      showConfirmDialog('Desvincular WhatsApp', '¿Deseas cerrar la sesión activa de WhatsApp para regenerar el QR?', async () => {
        const res = await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
        if (res.success) {
          showToast('WhatsApp Desvinculado', 'Sesión cerrada exitosamente.', 'info');
          fetchWhatsAppStatus();
        }
      });
    }

    function clearSessionsData() {
      showConfirmDialog('Vaciar Sesiones', '¿Deseas eliminar todas las sesiones de clientes en memoria de Turso?', async () => {
        const res = await apiFetch('/api/sessions/clear-all', { method: 'DELETE' });
        showToast('Sesiones Vaciadas', res.message, 'success');
        loadDashboardData();
      });
    }

    function clearLogsData() {
      showConfirmDialog('Vaciar Historial', '¿Deseas vaciar todos los logs de conversación de prueba?', async () => {
        const res = await apiFetch('/api/logs/clear-all', { method: 'DELETE' });
        showToast('Historial Vaciado', res.message, 'success');
        loadDashboardData();
      });
    }

    function clearTicketsData() {
      showConfirmDialog('Vaciar Tickets', '¿Deseas eliminar todos los tickets de soporte registrados?', async () => {
        const res = await apiFetch('/api/tickets/clear-all', { method: 'DELETE' });
        showToast('Tickets Vaciados', res.message, 'success');
        loadDashboardData();
      });
    }

    // ==========================================
    // MODULE 8: USUARIOS & ROLES (RBAC)
    // ==========================================
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
      showConfirmDialog('Eliminar Usuario', \`¿Seguro que deseas eliminar al usuario @\${username}?\`, async () => {
        const res = await apiFetch(\`/api/admin/users/\${id}\`, { method: 'DELETE' });
        if (res.success) {
          showToast('Usuario Eliminado', 'El usuario ha sido retirado.', 'success');
          loadAdminUsersData();
        }
      });
    }

    // ==========================================
    // UTILITIES
    // ==========================================
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

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function initApp() {
      initSSEStream();
      loadViewData(state.currentView);
      loadDashboardBadgeCounters();
      setInterval(loadDashboardBadgeCounters, 15000);
    }

    // Bootstrap
    window.addEventListener('DOMContentLoaded', () => {
      checkAuthSession();
    });
  </script>
</body>
</html>
`;
}
