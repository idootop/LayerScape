import { invoke } from "@tauri-apps/api/core";
import { useFloatingBallLogic } from "./FloatingBall.logic";
import { FloatingBallUI } from "./FloatingBall.ui";

export default function FloatingBallWidget() {
  const { isHovered, isMenuOpen, snapSide, handleDragStart, toggleMenu } =
    useFloatingBallLogic();

  const handleMenuItemClick = (action: string) => {
    switch (action) {
      case "about":
        console.log("About");
        break;
      case "settings":
        console.log("Settings");
        break;
      case "quit":
        invoke("quit_app");
        break;
    }
    toggleMenu();
  };

  return (
    <FloatingBallUI
      isHovered={isHovered}
      isMenuOpen={isMenuOpen}
      snapSide={snapSide}
      onMouseDown={handleDragStart}
      onMenuItemClick={handleMenuItemClick}
      onCloseMenu={() => toggleMenu(false)}
    />
  );
}
