import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import { TrayWindow } from '@/core/tray/TrayWindow';

import Layout from './components/Layout';
import { Wallpaper } from './components/Wallpaper';
import { initAPP } from './core/init';
import { WallpaperWindow } from './core/wallpaper/WallpaperWindow';
import FloatingBall from './pages/FloatingBall';
import FloatingBallWidget from './pages/FloatingBallWidget';
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
          <Route element={<FloatingBall />} path="floating-ball" />
          <Route element={<WallpaperPage />} path="wallpaper" />
          <Route element={<TrayPage />} path="status-bar" />
        </Route>
        <Route
          element={
            <TrayWindow>
              <HomePage />
            </TrayWindow>
          }
          path="/tray"
        />
        <Route element={<FloatingBallWidget />} path="/floating-widget" />
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
