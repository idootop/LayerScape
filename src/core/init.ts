import { invoke } from '@tauri-apps/api/core';

import { Tray } from '@/core/tray';

let isInitialized = false;

export async function initAPP() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const alreadyInitialized = await invoke<boolean>('check_and_set_initialized');
  if (!alreadyInitialized) {
    await _initAPP();
  }

  await _initWindow();
}

// 初始化 APP（应用启动时运行）
async function _initAPP() {
  await Tray.init();
}

// 初始化窗口（创建窗口时运行）
async function _initWindow() {
  //
}
