import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import { TrayWindow } from '@/core/tray/TrayWindow';

import Layout from './components/Layout';
import { initAPP } from './core/init';
import FloatingBall from './pages/FloatingBall';
import FloatingBallWidget from './pages/FloatingBallWidget';
import Home from './pages/Home';
import TrayPage from './pages/Tray';
import Wallpaper from './pages/Wallpaper';
import WallpaperWindow from './pages/WallpaperWindow';

function App() {
  useEffect(() => {
    initAPP();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<Home />} index />
          <Route element={<FloatingBall />} path="floating-ball" />
          <Route element={<Wallpaper />} path="wallpaper" />
          <Route element={<TrayPage />} path="status-bar" />
        </Route>
        <Route
          element={
            <TrayWindow>
              <Home />
            </TrayWindow>
          }
          path="/tray"
        />
        <Route element={<FloatingBallWidget />} path="/floating-widget" />
        <Route element={<WallpaperWindow />} path="/wallpaper-window" />
      </Routes>
    </HashRouter>
  );
}

export default App;
