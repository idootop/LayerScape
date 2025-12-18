import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useRef } from 'react';

import { useWindowFocus } from '@/core/window';

interface TrayWindowProps {
  children: React.ReactNode;
}

export const TrayWindow = ({ children }: TrayWindowProps) => {
  const trayShowTimeRef = useRef(0);

  useEffect(() => {
    const unlisten = listen<number>('tray-show', () => {
      trayShowTimeRef.current = Date.now();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useWindowFocus({
    onBlur: async () => {
      setTimeout(async () => {
        // 延迟关闭，防止窗口关闭又被快速打开造成闪烁
        const trayShowTimeAfter = trayShowTimeRef.current;
        if (Date.now() - trayShowTimeAfter < 300) {
          return;
        }
        await getCurrentWindow().close();
      }, 150);
    },
  });

  return (
    <div
      style={{
        background: 'var(--bg-color, white)',
        height: '100%',
        borderRadius: '12px',
        border: '1px solid var(--hover-color)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
};
