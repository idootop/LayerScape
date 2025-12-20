import { invoke } from '@tauri-apps/api/core';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { emit } from '@tauri-apps/api/event';
import { Image } from '@tauri-apps/api/image';
import { Menu, MenuItem, type MenuItemOptions } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit } from '@tauri-apps/plugin-process';

import { getWebviewWindow } from '@/core/window';

import { kIsMac, sleep } from '../utils';

class _Tray {
  trayId = 'tray-main';

  menu: MenuItemOptions[] = [
    {
      id: 'home',
      text: '首页',
      action: async () => {
        const mainWin = await getWebviewWindow('main');
        if (mainWin) {
          await mainWin.show();
          await mainWin.setFocus();
        }
      },
    },
    {
      id: 'quit',
      text: '退出',
      action: async () => {
        await exit(0);
      },
    },
  ];

  async init() {
    TrayIcon.new({
      id: this.trayId,
      tooltip: 'LayerScape',
      icon: await this.getImage('/tray-icon.png'),
      menu: await Menu.new({
        items: await Promise.all(
          this.menu.map(async (item) => {
            return MenuItem.new(item);
          }),
        ),
      }),
      showMenuOnLeftClick: false, // 右键菜单
      action: async (event) => {
        // 点击托盘图标显示窗口
        if (
          event.type === 'Click' &&
          event.button === 'Left' &&
          event.buttonState === 'Up'
        ) {
          if (await getWebviewWindow('tray')) {
            return;
          }

          // 动态创建窗口
          const trayWin = new WebviewWindow('tray', {
            url: 'index.html#/tray',
            width: 320,
            height: 540,
            decorations: false,
            transparent: true,
            visible: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            focus: true,
            shadow: true,
            resizable: false,
          });

          // 等待窗口准备好
          await new Promise((resolve) => {
            trayWin.once('tauri://created', resolve);
          });

          // 调整位置
          const trayX = event.rect.position.x;
          const trayY = event.rect.position.y;
          const trayWidth = event.rect.size.width;
          const trayHeight = event.rect.size.height;

          const outerSize = await trayWin.outerSize();
          const winWidth = outerSize.width;
          const winHeight = outerSize.height;

          const trayCenterX = trayX + trayWidth / 2 - winWidth / 2;
          const trayCenterY = kIsMac
            ? trayY + trayHeight + 4 * window.devicePixelRatio
            : trayY - winHeight - 4 * window.devicePixelRatio;

          await trayWin.setPosition(
            new PhysicalPosition(trayCenterX, trayCenterY),
          );

          // 显示窗口
          await emit('tray-show');
          await trayWin.show();

          // 窗口加阴影
          if (kIsMac) {
            await sleep(200);
            await invoke('set_window_shadow', { label: 'tray', shadow: true });
          }
        }
      },
    });
  }

  async updateIcon(image: string | Uint8Array | Image) {
    let icon: Image | undefined;
    if (image instanceof Image) {
      icon = image;
    } else if (image instanceof Uint8Array) {
      icon = await Image.fromBytes(image);
    } else {
      icon = await this.getImage(image);
    }

    if (!icon) {
      console.error('Failed to load tray icon');
      return;
    }

    const tray = await TrayIcon.getById(this.trayId);
    await tray?.setIcon(icon);
  }

  async getImage(url: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return Image.fromBytes(new Uint8Array(buffer));
    } catch (e) {
      console.error('Failed to load tray icon', e);
      return;
    }
  }
}

export const Tray = new _Tray();
