import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export function emit2window(
  event: string,
  data: any,
  window = getCurrentWebviewWindow(),
) {
  const win = getCurrentWebviewWindow();
  return win.emit(event, { window: window.label, data: data });
}

export function listen2window<T>(
  event: string,
  callback: (data: T) => void,
  window = getCurrentWebviewWindow(),
) {
  const win = getCurrentWebviewWindow();
  return win.listen<any>(event, (event) => {
    if (event.payload?.window !== window.label) return;
    callback(event.payload.data);
  });
}
