import { invoke } from '@tauri-apps/api/core';
import { availableMonitors, getAllWindows } from '@tauri-apps/api/window';

const WALLPAPER_WINDOW_PREFIX = 'wallpaper';

const formatLabel = (monitor: any) => {
  return `${WALLPAPER_WINDOW_PREFIX}-${monitor.name}`.replace(
    /[^a-zA-Z0-9-_]/g,
    '',
  );
};

class _Monitor {
  private interval: number | null = null;
  private lastMonitorCount = 0;

  async start() {
    this.stop();
    await this.syncWallpaperWindows();
    this.interval = window.setInterval(async () => {
      const monitors = await availableMonitors();
      if (monitors.length !== this.lastMonitorCount) {
        await this.syncWallpaperWindows();
      }
      this.lastMonitorCount = monitors.length;
    }, 1000);
  }

  stop() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  async syncWallpaperWindows() {
    const monitors = await availableMonitors();
    const windows = await getAllWindows();
    const wallpaperWindows = windows.filter((w) =>
      w.label.startsWith(WALLPAPER_WINDOW_PREFIX),
    );

    const currentLabels = monitors.map(formatLabel);

    // 1. 销毁不再存在的显示器对应的窗口
    for (const win of wallpaperWindows) {
      if (!currentLabels.includes(win.label)) {
        await win.destroy();
      }
    }

    // 2. 为新显示器创建窗口
    for (const monitor of monitors) {
      const label = formatLabel(monitor);
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
}

export const Monitor = new _Monitor();
