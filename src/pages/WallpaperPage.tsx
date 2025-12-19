import type React from 'react';

import { Monitor } from '@/core/wallpaper/monitor';

export const WallpaperPage: React.FC = () => {
  const handleEnableWallpaper = async () => {
    try {
      await Monitor.syncWallpaperWindows();
    } catch (error) {
      console.error('Failed to init wallpaper:', error);
      alert('启动壁纸模式失败: ' + error);
    }
  };

  return (
    <div className="module-page">
      <h2>桌面动态壁纸</h2>
      <p>这里将实现动态壁纸功能（支持任意网页 + 鼠标交互）。</p>
      <div className="placeholder-content">
        <button
          onClick={handleEnableWallpaper}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          type="button"
        >
          开启壁纸模式
        </button>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
          点击将为每个屏幕创建一个全屏、底层的透明窗口。
        </p>
      </div>
    </div>
  );
};
