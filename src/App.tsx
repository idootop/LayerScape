import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import { TrayWindow } from '@/core/tray/TrayWindow';

import { FloatingBallWidget } from './components/FloatingBall';
import { FloatingMenuWidget } from './components/FloatingMenu';
import Layout from './components/Layout';
import { WallpaperWidget } from './components/Wallpaper';
import { FloatingBallWindow } from './core/floating/FloatingBallWindow';
import { FloatingMenuWindow } from './core/floating/FloatingMenuWindow';
import { initAPP } from './core/init';
import { WallpaperWindow } from './core/wallpaper/WallpaperWindow';
import { FloatingBallPage } from './pages/FloatingBallPage';
import { HomePage } from './pages/HomePage';
import { TrayPage } from './pages/TrayPage';
import { WallpaperPage } from './pages/WallpaperPage';

const CORE_ROUTES: React.ReactNode[] = [
  // 全局隐藏窗口，用来做一些后台任务，如初始化应用等
  <Route element={<div />} key="background" path="/background" />,
  // 任务栏弹出窗口
  <Route
    element={
      <TrayWindow>
        <HomePage />
      </TrayWindow>
    }
    key="tray"
    path="/tray"
  />,
  // 悬浮球窗口
  <Route
    element={
      <FloatingBallWindow>
        <FloatingBallWidget />
      </FloatingBallWindow>
    }
    key="floating-ball"
    path="/floating-ball"
  />,
  // 悬浮球菜单窗口
  <Route
    element={
      <FloatingMenuWindow>
        <FloatingMenuWidget />
      </FloatingMenuWindow>
    }
    key="floating-menu"
    path="/floating-menu"
  />,
  // 桌面动态壁纸窗口
  <Route
    element={
      <WallpaperWindow>
        <WallpaperWidget />
      </WallpaperWindow>
    }
    key="wallpaper"
    path="/wallpaper"
  />,
];

function App() {
  useEffect(() => {
    initAPP();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<FloatingBallPage />} path="floating-ball-page" />
          <Route element={<WallpaperPage />} path="wallpaper-page" />
          <Route element={<TrayPage />} path="tray-page" />
        </Route>
        {...CORE_ROUTES}
      </Routes>
    </HashRouter>
  );
}

export default App;
