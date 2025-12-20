import { message } from '@tauri-apps/plugin-dialog';
import { exit } from '@tauri-apps/plugin-process';
import { Info, LogOut, Mic, Monitor, Scissors, Subtitles } from 'lucide-react';

interface FloatingMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => Promise<void>;
}

export const kFloatingMenuItems: Record<
  'default' | 'context',
  FloatingMenuItem[]
> = {
  default: [
    { id: 'voice', icon: <Mic size={18} />, label: '语音通话' },
    { id: 'share', icon: <Monitor size={18} />, label: '共享屏幕' },
    { id: 'screenshot', icon: <Scissors size={18} />, label: '截图提问' },
    { id: 'subtitles', icon: <Subtitles size={18} />, label: '双语字幕' },
  ],
  context: [
    {
      id: 'about',
      icon: <Info size={18} />,
      label: '关于',
      onClick: async () => {
        await message('Made with ❤️ by LayerScape');
      },
    },
    {
      id: 'exit',
      icon: <LogOut size={18} />,
      label: '退出',
      onClick: async () => {
        await exit(0);
      },
    },
  ],
};
