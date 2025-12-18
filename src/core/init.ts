import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import { Tray } from '@/core/tray';

let isInitialized = false;

export async function initAPP() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;
  const win = getCurrentWebviewWindow();
  if (win.label === 'app') {
    await _initAPP();
  }
}

// 初始化 APP（应用启动时运行）
async function _initAPP() {
  await Tray.init();
}
