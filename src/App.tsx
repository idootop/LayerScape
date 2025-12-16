import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { TrayWrapper } from "./components/TrayWrapper";
import Home from "./pages/Home";
import FloatingBall from "./pages/FloatingBall";
import Wallpaper from "./pages/Wallpaper";
import StatusBarWidget from "./pages/StatusBarWidget";
import FloatingBallWidget from "./pages/FloatingBallWidget";
import WallpaperWindow from "./pages/WallpaperWindow";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="floating-ball" element={<FloatingBall />} />
          <Route path="wallpaper" element={<Wallpaper />} />
          <Route path="status-bar" element={<StatusBarWidget />} />
        </Route>
        <Route
          path="/tray"
          element={
            <TrayWrapper>
              <Home />
            </TrayWrapper>
          }
        />
        <Route path="/floating-widget" element={<FloatingBallWidget />} />
        <Route path="/wallpaper-window" element={<WallpaperWindow />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
