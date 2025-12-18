import type React from 'react';

import { useWallpaperInteractions } from './interactions';

export const WallpaperWindow = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // 监听全局鼠标位置
  useWallpaperInteractions();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
      }}
    >
      {children}
    </div>
  );
};
