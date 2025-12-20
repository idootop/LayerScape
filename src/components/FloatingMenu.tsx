import { emit } from '@tauri-apps/api/event';
import { exit } from '@tauri-apps/plugin-process';
import {
  Info,
  LogOut,
  Mic,
  Monitor,
  Presentation,
  Scissors,
  Subtitles,
} from 'lucide-react';
import { useState } from 'react';

import { useListen } from '@/core/event';
import { FloatingBall } from '@/core/floating';

export function FloatingMenuWidget() {
  const [mode, setMode] = useState<'default' | 'context'>('default');

  useListen<'default' | 'context'>('floating-menu-mode', (mode) => {
    setMode(mode);
  });

  if (mode === 'context') {
    return <FloatingContextMenu />;
  }

  return <FloatingDefaultMenu />;
}

function FloatingDefaultMenu() {
  const menuItems = [
    { id: 'voice', icon: <Mic size={18} />, label: '语音通话' },
    { id: 'share', icon: <Monitor size={18} />, label: '共享屏幕' },
    { id: 'record', icon: <Presentation size={18} />, label: '记录会议' },
    { id: 'screenshot', icon: <Scissors size={18} />, label: '截图提问' },
    { id: 'subtitles', icon: <Subtitles size={18} />, label: '双语字幕' },
  ];

  return (
    <div
      style={{
        width: '100%',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {menuItems.map((item) => (
        <MenuItem icon={item.icon} key={item.id} label={item.label} />
      ))}
    </div>
  );
}

function FloatingContextMenu() {
  const onExit = async () => {
    await FloatingBall.hideMenu();
    await exit(0);
  };

  const onAbout = async () => {
    await FloatingBall.hideMenu();
    // 简单的关于弹窗，或者调用系统弹窗
    await emit('open-about-dialog');
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <MenuItem
        icon={<Info size={18} />}
        label="关于 LayerScape"
        onClick={onAbout}
      />
      <MenuItem icon={<LogOut size={18} />} label="退出" onClick={onExit} />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick: propsOnClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = async () => {
    if (propsOnClick) {
      await propsOnClick();
    } else {
      await FloatingBall.hideMenu();
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        cursor: 'default',
        background: isHovered ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        transition: 'background 0.2s',
        userSelect: 'none',
      }}
    >
      <div style={{ color: '#333', display: 'flex' }}>{icon}</div>
      <span style={{ fontSize: '14px', color: '#333' }}>{label}</span>
    </div>
  );
}
