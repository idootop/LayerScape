import { Mic, Monitor, Presentation, Scissors, Subtitles } from 'lucide-react';
import { useState } from 'react';

import { FloatingBall } from '@/core/floating';

export function FloatingMenuWidget() {
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

function MenuItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = async () => {
    // await message(label);
    await FloatingBall.hideMenu();
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
