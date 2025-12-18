import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Tray } from "./tray";

let isInitialized = false;

const _initAPP = async () => {
  await Tray.init();
};

export const initAPP = () => {
  if (isInitialized) return;

  const win = getCurrentWebviewWindow();
  if (win?.label !== "main") return;

  isInitialized = true;
  _initAPP();
};
