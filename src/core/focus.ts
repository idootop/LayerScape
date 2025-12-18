import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect } from 'react';

import { type GlobalMouseEvent, onGlobalMouseEvent } from '@/core/mouse';

export const useWindowFocus = (
  props?: Partial<{
    onFocus: () => void;
    onBlur: () => void;
  }>,
) => {
  // 监听全局鼠标事件
  useEffect(() => {
    const unlisten = onGlobalMouseEvent((e) => {
      if (['up', 'down'].includes(e.event)) {
        onMouseClick(e);
      }
    });
    return () => {
      unlisten.then((cleanup) => cleanup());
    };
  }, []);

  // 鼠标点击事件
  async function onMouseClick(payload: GlobalMouseEvent) {
    let x: number, y: number, width: number, height: number;
    try {
      const win = getCurrentWebviewWindow();
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      x = pos.x;
      y = pos.y;
      width = size.width;
      height = size.height;
    } catch (e) {
      console.error('Failed to get current window rect', e);
      return;
    }

    // 转换成物理坐标
    const dpr = window.devicePixelRatio;
    const screenX = payload.x * dpr;
    const screenY = payload.y * dpr;

    // 判断是否在窗口内
    const isFocus =
      screenX >= x &&
      screenX <= x + width &&
      screenY >= y &&
      screenY <= y + height;

    if (isFocus) {
      props?.onFocus?.();
    } else {
      props?.onBlur?.();
    }
  }
};
