import { invoke } from '@tauri-apps/api/core';
import { primaryMonitor } from '@tauri-apps/api/window';

import { getWebviewWindow } from '../window';

class _FloatingBall {
  width = 60; // 悬浮球宽度
  height = 60; // 悬浮球高度
  margin = 8; // 悬浮球外边距
  visibleWidth = 16; // 悬浮球可见宽度
  snapThreshold = 100; // 边缘吸附阈值
  snapDelay = 200; // 边缘吸附延迟时间

  // 获取主屏幕右侧收起的初始位置
  async getInitialPosition() {
    const screen = await primaryMonitor();
    if (!screen) return null;

    const { width: mw, height: mh } = screen.size;
    const { x: mx, y: my } = screen.position;
    const factor = screen.scaleFactor;

    const width = (this.width + this.margin * 2) * factor;
    const height = (this.height + this.margin * 2) * factor;
    const x = mx + mw - width;
    const y = my + mh / 2 - height / 2;

    return { x, y, width, height };
  }

  // 初始化悬浮球窗口
  async init() {
    const pos = await this.getInitialPosition();
    if (!pos) return;

    const win = await getWebviewWindow('floating-ball');
    if (!win) {
      await invoke('create_floating_ball_window', {
        label: 'floating-ball',
        url: 'index.html#/floating-ball',
        ...pos,
      });
    } else {
      // 恢复初始位置
      await invoke('resize_and_move_window', {
        label: 'floating-ball',
        ...pos,
      });
    }
  }

  // 恢复到初始位置
  async resetPosition() {
    const pos = await this.getInitialPosition();
    if (!pos) return;

    await invoke('resize_and_move_window', {
      label: 'floating-ball',
      ...pos,
    });
  }
}

export const FloatingBall = new _FloatingBall();
