import { Info, Power, Settings } from 'lucide-react';
import type React from 'react';

import { CONFIG, type SnapSide } from './FloatingBall.logic';

interface FloatingBallUIProps {
  isHovered: boolean;
  isMenuOpen: boolean;
  snapSide: SnapSide;
  onMouseDown: (e: React.MouseEvent) => void;
  onMenuItemClick: (action: string) => void;
  onCloseMenu: () => void;
}

export function FloatingBallUI({
  isHovered,
  isMenuOpen,
  snapSide,
  onMouseDown,
  onMenuItemClick,
  onCloseMenu,
}: FloatingBallUIProps) {
  // 菜单项配置
  const menuItems = [
    { icon: Info, label: '关于', action: 'about' },
    { icon: Settings, label: '设置', action: 'settings' },
    { icon: Power, label: '退出', action: 'quit' },
  ];

  // 球体样式计算
  const getBallStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: `${CONFIG.BALL_SIZE}px`,
      height: `${CONFIG.BALL_SIZE}px`,
      flexShrink: 0,
      aspectRatio: '1/1',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
      boxSizing: 'border-box',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      border: '2px solid rgba(255,255,255,0.8)',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      willChange: 'transform',
      transform: 'translateX(0)',
      opacity: 1,
      zIndex: 10,
    };

    if (snapSide) {
      // 吸附状态下，鼠标没悬停且菜单未打开时，半透明
      if (!isHovered && !isMenuOpen) {
        baseStyle.opacity = 0.8;
      }

      if (snapSide === 'left') {
        if (!isHovered && !isMenuOpen) {
          // 收起：向左平移，只露右边
          const offset =
            CONFIG.BALL_SIZE - CONFIG.VISIBLE_WIDTH + CONFIG.WINDOW_PADDING;
          baseStyle.transform = `translateX(-${offset}px)`;
        } else {
          baseStyle.transform = 'translateX(0)';
        }
      } else if (snapSide === 'right') {
        if (!isHovered && !isMenuOpen) {
          // 收起：向右平移，只露左边
          const offset =
            CONFIG.BALL_SIZE - CONFIG.VISIBLE_WIDTH + CONFIG.WINDOW_PADDING;
          baseStyle.transform = `translateX(${offset}px)`;
        } else {
          baseStyle.transform = 'translateX(0)';
        }
      }
    }

    return baseStyle;
  };

  // 菜单项样式计算
  const getMenuItemStyle = (index: number, total: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      width: `${CONFIG.MENU_ITEM_SIZE}px`,
      height: `${CONFIG.MENU_ITEM_SIZE}px`,
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.9)',
      color: '#6366f1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      pointerEvents: isMenuOpen ? 'auto' : 'none',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      opacity: isMenuOpen ? 1 : 0,
      zIndex: 5,
    };

    if (isMenuOpen) {
      let angle = 0;
      const radius = CONFIG.MENU_RADIUS;

      if (snapSide === 'left') {
        const startAngle = -60;
        const step = 60;
        angle = startAngle + index * step;
      } else if (snapSide === 'right') {
        const startAngle = 120;
        const step = 60;
        angle = startAngle + index * step;
      } else {
        angle = (360 / total) * index;
      }

      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;

      style.transform = `translate(${x}px, ${y}px) scale(1)`;
    } else {
      style.transform = `translate(0px, 0px) scale(0)`;
    }

    return style;
  };

  const getContainerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      willChange: 'transform, top, left, right',
      width: 0,
      height: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (snapSide === 'left') {
      // 左吸附：靠左定位
      const leftDist = CONFIG.WINDOW_PADDING + CONFIG.BALL_SIZE / 2;
      return {
        ...base,
        left: `${leftDist}px`,
        transform: 'translate(-50%, -50%)',
      };
    }

    if (snapSide === 'right') {
      // 右吸附：靠右定位
      const rightDist = CONFIG.WINDOW_PADDING + CONFIG.BALL_SIZE / 2;
      return {
        ...base,
        right: `${rightDist}px`,
        transform: 'translate(50%, -50%)',
      };
    }

    // 默认居中
    return {
      ...base,
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div
      onClick={() => isMenuOpen && onCloseMenu()}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        pointerEvents: isMenuOpen ? 'auto' : 'none',
        overflow: 'visible',
      }}
    >
      {/* 始终居中的锚点容器 */}
      <div style={getContainerStyle()}>
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={(e) => {
              e.stopPropagation();
              onMenuItemClick(item.action);
            }}
            style={{
              ...getMenuItemStyle(index, menuItems.length),
              border: 'none',
              outline: 'none',
              padding: 0,
            }}
            title={item.label}
            type="button"
          >
            <item.icon size={20} />
          </button>
        ))}

        <button
          onClick={(e) => e.stopPropagation()}
          onMouseDown={onMouseDown}
          style={getBallStyle()}
          type="button"
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        </button>
      </div>
    </div>
  );
}
