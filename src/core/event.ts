import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect } from 'react';

export function emit2window(
  event: string,
  data: any,
  label = getCurrentWebviewWindow().label,
) {
  const win = getCurrentWebviewWindow();
  return win.emitTo(label, event, data);
}

export function useListen<T>(event: string, callback: (data: T) => void) {
  useEffect(() => {
    const unlisten = listen<T>(event, async (event) => {
      callback(event.payload);
    });
    return () => {
      unlisten.then((u) => u());
    };
  }, [event, callback]);
}
