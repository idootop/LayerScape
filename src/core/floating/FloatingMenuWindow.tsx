import type React from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useListen } from '../event';
import { FloatingBall } from '.';
import { kFloatingMenuItems } from './FloatingMenu';

export function FloatingMenuWindow() {
  return (
    <div
      style={{
        width: '100vw',
        boxSizing: 'border-box',
        overflowY: 'hidden',
        background: 'rgba(255, 255, 255, 1)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
        }}
      >
        <FloatingMenu />
      </div>
    </div>
  );
}

function FloatingMenu() {
  const [searchParams, setSearchParams] = useSearchParams({ mode: 'default' });
  const menuItems =
    kFloatingMenuItems[searchParams.get('mode') as 'default' | 'context'];

  useListen<'default' | 'context'>('floating-menu-mode', (mode) => {
    setSearchParams({ mode });
  });

  return (
    <div
      style={{
        width: '100%',
        padding: `${FloatingBall.menuPadding}px`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {menuItems.map((item) => (
        <MenuItem
          icon={item.icon}
          key={item.id}
          label={item.label}
          onClick={item.onClick}
        />
      ))}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={async () => {
        await onClick?.();
        await FloatingBall.hideMenu();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: `${FloatingBall.menuItemHeight}px`,
        padding: '0 12px',
        gap: '12px',
        borderRadius: '8px',
        background: isHovered ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        transition: 'background 0.2s',
        cursor: 'pointer',
      }}
    >
      <div style={{ color: '#333', display: 'flex' }}>{icon}</div>
      <div style={{ fontSize: '14px', color: '#333', userSelect: 'none' }}>
        {label}
      </div>
    </div>
  );
}
