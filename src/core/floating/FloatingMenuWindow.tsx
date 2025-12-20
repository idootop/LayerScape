import type React from 'react';

export function FloatingMenuWindow({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {children}
      </div>
    </div>
  );
}
