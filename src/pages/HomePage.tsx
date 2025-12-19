import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from '@tauri-apps/api/webviewWindow';
import type React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { getWebviewWindow } from '@/core/window';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <h1>👋 LayerScape</h1>
      <p>探索电脑桌面壁纸层 + 悬浮层 + 状态栏的各种 GUI 交互能力。</p>
      <div className="features-grid">
        <MyLink to="/floating-ball-page">
          <h3>桌面悬浮球</h3>
          <p>交互式悬浮球组件</p>
        </MyLink>
        <MyLink to="/wallpaper-page">
          <h3>桌面动态壁纸</h3>
          <p>Web 技术的动态壁纸</p>
        </MyLink>
        <MyLink to="/tray-page">
          <h3>状态栏小工具</h3>
          <p>自定义系统状态栏扩展</p>
        </MyLink>
      </div>
    </div>
  );
};

function MyLink({ children, to }: { children: React.ReactNode; to: string }) {
  const path = useLocation().pathname;

  if (path === '/tray') {
    return (
      <div
        className="feature-card"
        onClick={async () => {
          // 打开主窗口
          let mainWin = await getWebviewWindow('main');
          if (!mainWin) {
            mainWin = new WebviewWindow('main', {
              url: 'index.html#' + to,
              title: 'LayerScape',
              width: 800,
              height: 600,
            });
            await new Promise((resolve) => {
              mainWin!.once('tauri://created', resolve);
            });
          }

          // 跳转页面
          await mainWin.emitTo('main', 'navigate', to);
          await mainWin.show();
          await mainWin.setFocus();

          // 延迟关闭当前窗口（等待事件发送完毕）
          const win = await getCurrentWebviewWindow();
          await win.close();
        }}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
    );
  }

  return (
    <Link className="feature-card" to={to}>
      {children}
    </Link>
  );
}
