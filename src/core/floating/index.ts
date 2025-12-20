import { invoke } from '@tauri-apps/api/core';
import {
  availableMonitors,
  PhysicalPosition,
  primaryMonitor,
} from '@tauri-apps/api/window';

import { sleep } from '../utils';
import { getWebviewWindow } from '../window';

class _FloatingBall {
  width = 60; // 悬浮球宽度
  height = 60; // 悬浮球高度
  margin = 8; // 悬浮球外边距
  visibleWidth = 16; // 悬浮球可见宽度
  snapThreshold = 100; // 边缘吸附阈值
  snapDelay = 200; // 边缘吸附延迟时间

  menuDistance = 0; // 菜单与悬浮球的距离
  menuWidth = 160; // 菜单宽度
  menuHeight = 240; // 菜单高度 (大概值)
  menuRect: { x: number; y: number; width: number; height: number } | null =
    null;

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

  // 显示菜单
  async showMenu() {
    const ballWin = await getWebviewWindow('floating-ball');
    if (!ballWin) return;

    const [pos, size, factor, monitors] = await Promise.all([
      ballWin.outerPosition(),
      ballWin.outerSize(),
      ballWin.scaleFactor(),
      availableMonitors(),
    ]);

    // 查找当前窗口所在的显示器
    const cx = pos.x + size.width / 2;
    const cy = pos.y + size.height / 2;
    const monitor =
      monitors.find((m) => {
        const { x, y } = m.position;
        const { width: w, height: h } = m.size;
        return cx >= x && cx < x + w && cy >= y && cy < y + h;
      }) || monitors[0];

    const { x: mx, y: my } = monitor.position;
    const { width: mw, height: mh } = monitor.size;

    // 计算菜单位置
    // 优先在球的上方，如果上方放不下，再放到下方
    let menuX = pos.x + size.width / 2 - (this.menuWidth * factor) / 2;
    let menuY = pos.y - this.menuHeight * factor - this.menuDistance * factor;

    // 边界检测与修正
    // 水平修正
    if (menuX < mx) {
      menuX = mx + 10 * factor;
    } else if (menuX + this.menuWidth * factor > mx + mw) {
      menuX = mx + mw - this.menuWidth * factor - 10 * factor;
    }

    // 垂直修正：如果上方放不下，且下方空间更大，就放到下方
    if (menuY < my) {
      const spaceBelow = my + mh - (pos.y + size.height);
      const spaceAbove = pos.y - my;
      if (spaceBelow > spaceAbove) {
        menuY = pos.y + size.height + this.menuDistance * factor;
      }
    }

    const mRect = {
      x: Math.round(menuX),
      y: Math.round(menuY),
      width: Math.round(this.menuWidth * factor),
      height: Math.round(this.menuHeight * factor),
    };
    this.menuRect = mRect;

    const menuWin = await getWebviewWindow('floating-menu');
    if (!menuWin) {
      await invoke('create_floating_ball_window', {
        label: 'floating-menu',
        url: 'index.html#/floating-menu',
        ...mRect,
      });
      // 菜单需要阴影
      await sleep(200);
      await invoke('set_window_shadow', {
        label: 'floating-menu',
        shadow: true,
      });
    } else {
      await menuWin.setPosition(new PhysicalPosition(mRect.x, mRect.y));
      await menuWin.show();
    }
  }

  // 隐藏菜单
  async hideMenu() {
    this.menuRect = null;
    const menuWin = await getWebviewWindow('floating-menu');
    if (menuWin) {
      await menuWin.close();
    }
  }
}

export const FloatingBall = new _FloatingBall();
