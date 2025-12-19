import { invoke } from '@tauri-apps/api/core';
import { primaryMonitor } from '@tauri-apps/api/window';

import { getWebviewWindow } from '../window';

class _FloatingBall {
  width = 60;
  height = 60;
  padding = 8;

  // 初始化悬浮球窗口
  async init() {
    const screen = await primaryMonitor();
    if (!screen) return;

    const { width: mw, height: mh } = screen.size;
    const { x: mx, y: my } = screen.position;

    const width = (this.width + this.padding * 2) * screen.scaleFactor;
    const height = (this.height + this.padding * 2) * screen.scaleFactor;
    const x = mx + mw - (this.width + this.padding * 2) * screen.scaleFactor;
    const y =
      my + mh / 2 - (this.height / 2 + this.padding) * screen.scaleFactor;

    const win = await getWebviewWindow('floating-ball');
    if (!win) {
      await invoke('create_floating_ball_window', {
        label: 'floating-ball',
        url: 'index.html#/floating-ball',
        x,
        y,
        width,
        height,
      });
    } else {
      // 恢复初始位置
      await invoke('resize_and_move_window', {
        label: 'floating-ball',
        x,
        y,
        width,
        height,
      });
    }
  }
}

export const FloatingBall = new _FloatingBall();
