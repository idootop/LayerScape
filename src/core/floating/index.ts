import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { availableMonitors, primaryMonitor } from '@tauri-apps/api/window';

import { getWebviewWindow } from '../window';
import { kFloatingMenuItems } from './FloatingMenu';

class _FloatingBall {
  width = 60; // 悬浮球宽度
  height = 60; // 悬浮球高度
  margin = 8; // 悬浮球外边距
  // 贴边收起
  visibleWidth = 16; // 悬浮球可见宽度
  snapThreshold = 100; // 边缘吸附阈值
  snapDelay = 200; // 边缘吸附延迟时间
  // 菜单相关
  menuWidth = 160; // 菜单宽度
  menuPadding = 8; // 菜单内边距
  menuItemHeight = 36; // 菜单项高度
  menuDistance = 0; // 菜单与悬浮球的距离（悬浮球本身有外边距）
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
        shadow: false,
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

  _creatingMenu = false;

  // 显示菜单 (左键默认菜单)
  async showMenu() {
    if (this._creatingMenu) return;
    this._creatingMenu = true;
    await this._showMenuInternal('default');
    this._creatingMenu = false;
  }

  // 显示右键菜单
  async showContextMenu() {
    if (this._creatingMenu) return;
    this._creatingMenu = true;
    await this._showMenuInternal('context');
    this._creatingMenu = false;
  }

  private async _showMenuInternal(mode: 'default' | 'context') {
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

    let menuX = 0;
    let menuY = 0;

    const menuItems = kFloatingMenuItems[mode];
    const targetWidth = Math.round(this.menuWidth * factor);
    const targetHeight = Math.round(
      (this.menuItemHeight * menuItems.length + (this.menuPadding + 1) * 2) *
        factor,
    );

    menuX = pos.x + size.width / 2 - targetWidth / 2;
    menuY = pos.y - targetHeight - this.menuDistance * factor;

    // 水平修正
    if (menuX < mx) {
      menuX = mx + 10 * factor;
    } else if (menuX + targetWidth > mx + mw) {
      menuX = mx + mw - targetWidth - 10 * factor;
    }

    // 垂直修正
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
      width: targetWidth,
      height: targetHeight,
    };
    this.menuRect = mRect;

    const menuWin = await getWebviewWindow('floating-menu');
    if (!menuWin) {
      await invoke('create_floating_ball_window', {
        label: 'floating-menu',
        url: `index.html#/floating-menu?mode=${mode}`,
        shadow: true,
        ...mRect,
      });
    } else {
      // 发送模式切换事件
      await emit('floating-menu-mode', mode);
      // 窗口已存在，先改变尺寸和位置
      await invoke('resize_and_move_window', {
        label: 'floating-menu',
        ...mRect,
      });
    }
  }

  // 隐藏菜单
  async hideMenu() {
    this.menuRect = null;
    const menuWin = await getWebviewWindow('floating-menu');
    if (menuWin) {
      await emit('floating-menu-closed');
      await menuWin.close();
    }
  }
}

export const FloatingBall = new _FloatingBall();
