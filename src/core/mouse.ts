import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { kIsMac } from './utils';

export interface GlobalMouseEvent {
  x: number;
  y: number;
  event: 'move' | 'drag' | 'down' | 'up';
  button: 'left' | 'right' | 'none';
}

export type GlobalMouseEventHandler = (event: GlobalMouseEvent) => void;

/**
 * 监听全局鼠标事件
 * @param handler 事件处理回调
 * @returns 取消监听的函数
 */
export async function onGlobalMouseEvent(
  handler: GlobalMouseEventHandler,
): Promise<UnlistenFn> {
  return await listen<GlobalMouseEvent>('global-mouse-event', (event) => {
    const scale = kIsMac ? window.devicePixelRatio : 1;
    event.payload.x = event.payload.x * scale;
    event.payload.y = event.payload.y * scale;
    handler(event.payload);
  });
}
