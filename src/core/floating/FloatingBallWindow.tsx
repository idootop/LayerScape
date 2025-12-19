import { invoke } from '@tauri-apps/api/core';

import { useFloatingBallLogic } from './FloatingBall.logic';
import { FloatingBallUI } from './FloatingBall.ui';

export function FloatingBallWindow() {
  const { isHovered, isMenuOpen, snapSide, handleDragStart, toggleMenu } =
    useFloatingBallLogic();

  const handleMenuItemClick = (action: string) => {
    switch (action) {
      case 'about':
        console.log('About');
        break;
      case 'settings':
        console.log('Settings');
        break;
      case 'quit':
        invoke('quit_app');
        break;
    }
    toggleMenu();
  };

  return (
    <FloatingBallUI
      isHovered={isHovered}
      isMenuOpen={isMenuOpen}
      onCloseMenu={() => toggleMenu(false)}
      onMenuItemClick={handleMenuItemClick}
      onMouseDown={handleDragStart}
      snapSide={snapSide}
    />
  );
}
