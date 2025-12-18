import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useRef } from 'react';

import { type GlobalMouseEvent, onGlobalMouseEvent } from '@/core/mouse';

import { listen2window } from '../event';

export const useWallpaperInteractions = () => {
  const enabledRef = useRef(true);
  const windowRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 监听切换层级指令
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    const unlisten = listen2window<'below' | 'above'>(
      'set_window_level',
      (level) => {
        enabledRef.current = level === 'below';
        invoke('set_window_level', { window: win, level });
      },
    );
    return () => {
      unlisten.then((u) => u());
    };
  }, []);

  // 初始化窗口大小位置
  useEffect(() => {
    (async () => {
      const win = getCurrentWebviewWindow();
      try {
        const pos = await win.outerPosition();
        const size = await win.outerSize();
        windowRectRef.current = {
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height,
        };
      } catch (e) {
        console.error('Failed to update window rect cache', e);
      }
    })();
  }, []);

  // 监听全局鼠标事件
  useEffect(() => {
    const unlisten = onGlobalMouseEvent(onMouseEvent);
    return () => {
      unlisten.then((cleanup) => cleanup());
    };
  }, []);

  // 鼠标事件回调
  function onMouseEvent(payload: GlobalMouseEvent) {
    if (!enabledRef.current) return;

    const { x, y, width, height } = windowRectRef.current;

    // 转换成物理坐标
    const dpr = window.devicePixelRatio;
    const screenX = payload.x * dpr;
    const screenY = payload.y * dpr;

    // 判断是否在窗口内
    const isInWindow =
      screenX >= x &&
      screenX <= x + width &&
      screenY >= y &&
      screenY <= y + height;

    if (!isInWindow) return;

    // 转换为逻辑坐标
    const clientX = (screenX - x) / dpr;
    const clientY = (screenY - y) / dpr;

    // 在窗口内则分发事件到目标元素
    const targetElement =
      document.elementFromPoint(clientX, clientY) || document.body;

    if (targetElement) {
      const buttonsMap = {
        left: 1,
        right: 2,
        middle: 4,
        none: 0,
      };
      const eventType =
        payload.event === 'move' || payload.event === 'drag'
          ? 'mousemove'
          : payload.event === 'down'
            ? 'mousedown'
            : 'mouseup';
      const eventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        screenX,
        screenY,
        clientX,
        clientY,
        buttons: buttonsMap[payload.button] || 0,
      };
      targetElement.dispatchEvent(new MouseEvent(eventType, eventInit));
      if (eventType === 'mouseup' && payload.button === 'left') {
        targetElement.dispatchEvent(new MouseEvent('click', eventInit));
      }
    }
  }
};
