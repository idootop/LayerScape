import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import { TrayWindow } from '@/core/tray/TrayWindow';

import Layout from './components/Layout';
import { Wallpaper } from './components/Wallpaper';
import { FloatingBallWindow } from './core/floating/FloatingBallWindow';
import { initAPP } from './core/init';
import { WallpaperWindow } from './core/wallpaper/WallpaperWindow';
import { FloatingBallPage } from './pages/FloatingBallPage';
import { HomePage } from './pages/HomePage';
import { TrayPage } from './pages/TrayPage';
import { WallpaperPage } from './pages/WallpaperPage';

function App() {
  useEffect(() => {
    initAPP();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<FloatingBallPage />} path="floating" />
          <Route element={<WallpaperPage />} path="wallpaper" />
          <Route element={<TrayPage />} path="status-bar" />
        </Route>
        {/* 全局隐藏窗口，用来做一些后台任务，如初始化应用等 */}
        <Route element={<div />} path="/background" />
        <Route
          element={
            <TrayWindow>
              <HomePage />
            </TrayWindow>
          }
          path="/tray"
        />
        <Route element={<FloatingBallWindow />} path="/floating-ball" />
        <Route
          element={
            <WallpaperWindow>
              <Wallpaper />
            </WallpaperWindow>
          }
          path="/wallpaper-window"
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
