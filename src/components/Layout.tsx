import { CircleDot, Home, Monitor, PanelTop } from 'lucide-react';
import type React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../App.css'; // Ensure styles are available

import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

const Layout: React.FC = () => {
  const path = useLocation().pathname;
  const navigate = useNavigate();

  useEffect(() => {
    if (path === '/tray') return;
    const unlisten = listen<string>('navigate', (event) => {
      console.log('main-goto-page', event.payload);
      navigate(event.payload);
    });
    return () => {
      unlisten.then((u) => u());
    };
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="window-controls-placeholder"></div>
        </div>
        <nav className="sidebar-nav">
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="首页"
            to="/"
          >
            <Home size={24} />
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="桌面悬浮球"
            to="/floating-ball-page"
          >
            <CircleDot size={24} />
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="桌面动态壁纸"
            to="/wallpaper-page"
          >
            <Monitor size={24} />
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="状态栏小工具"
            to="/tray-page"
          >
            <PanelTop size={24} />
          </NavLink>
        </nav>
      </aside>
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
