import { emit } from '@tauri-apps/api/event';
import { availableMonitors } from '@tauri-apps/api/window';

class _Monitor {
  private interval: number | null = null;
  private lastMonitorCount = 0;

  /**
   * 监控显示器变化
   */
  async start() {
    this.stop();
    this.interval = window.setInterval(async () => {
      const monitors = await availableMonitors();
      if (monitors.length !== this.lastMonitorCount) {
        emit('monitor-changed', monitors);
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
}

export const Monitor = new _Monitor();
