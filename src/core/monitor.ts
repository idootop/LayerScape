import { invoke } from '@tauri-apps/api/core';
import { availableMonitors, getAllWindows } from '@tauri-apps/api/window';

// todo 使用 monitor name 给显示器唯一标识，而不是 index
const WALLPAPER_WINDOW_PREFIX = 'wallpaper-';

/**
 * 同步壁纸窗口与当前显示器
 */
export async function syncWallpaperWindows() {
  const monitors = await availableMonitors();
  const windows = await getAllWindows();
  const wallpaperWindows = windows.filter((w) =>
    w.label.startsWith(WALLPAPER_WINDOW_PREFIX),
  );

  const currentLabels = monitors.map(
    (_, i) => `${WALLPAPER_WINDOW_PREFIX}${i}`,
  );

  // 1. 销毁不再存在的显示器对应的窗口
  for (const win of wallpaperWindows) {
    if (!currentLabels.includes(win.label)) {
      await win.destroy();
    }
  }

  // 2. 为新显示器创建窗口或更新现有窗口
  for (let i = 0; i < monitors.length; i++) {
    const monitor = monitors[i];
    const label = `${WALLPAPER_WINDOW_PREFIX}${i}`;
    const win = wallpaperWindows.find((w) => w.label === label);

    if (!win) {
      await invoke('create_wallpaper_window', {
        label,
        url: 'index.html#/wallpaper-window',
        x: monitor.position.x,
        y: monitor.position.y,
        width: monitor.size.width,
        height: monitor.size.height,
      });
    }
  }
}

/**
 * 监听显示器变化
 */
let monitorInterval: number | null = null;

export function startMonitorListening() {
  if (monitorInterval) return;

  let lastMonitorCount = 0;

  // 初始化显示器数量
  availableMonitors().then((monitors) => {
    lastMonitorCount = monitors.length;
  });

  // 每2秒轮询一次显示器数量变化
  monitorInterval = window.setInterval(async () => {
    try {
      const windows = await getAllWindows();
      const hasWallpaper = windows.some((w) =>
        w.label.startsWith(WALLPAPER_WINDOW_PREFIX),
      );

      if (hasWallpaper) {
        const monitors = await availableMonitors();
        if (monitors.length !== lastMonitorCount) {
          lastMonitorCount = monitors.length;
          await syncWallpaperWindows();
        }
      } else {
        // 如果没有壁纸窗口，重置计数，以便下次开启时能正确同步
        const monitors = await availableMonitors();
        lastMonitorCount = monitors.length;
      }
    } catch (e) {
      console.error('Failed to poll monitors:', e);
    }
  }, 2000);
}

export function stopMonitorListening() {
  if (monitorInterval) {
    window.clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
