import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, CircleDot, Monitor, PanelTop } from 'lucide-react';
import '../App.css'; // Ensure styles are available

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="window-controls-placeholder"></div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="首页">
            <Home size={24} />
          </NavLink>
          <NavLink to="/floating-ball" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="桌面悬浮球">
            <CircleDot size={24} />
          </NavLink>
          <NavLink to="/wallpaper" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="桌面动态壁纸">
            <Monitor size={24} />
          </NavLink>
          <NavLink to="/status-bar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="状态栏小工具">
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

