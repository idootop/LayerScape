import { FloatingBall } from '.';
import { useFloatingBall } from './useFloatingBall';

export function FloatingBallWindow({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isHovered, snapSide, handleDragStart } = useFloatingBall();

  // 球体样式计算
  const getBallStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: `${FloatingBall.width}px`,
      height: `${FloatingBall.height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      willChange: 'transform',
      transform: 'translateX(0)',
      opacity: 1,
    };

    if (snapSide) {
      if (!isHovered) {
        // 吸附状态下，半透明
        baseStyle.opacity = 0.8;
      }

      if (snapSide === 'left') {
        if (!isHovered) {
          // 收起：向左平移，只露右边
          const offset =
            FloatingBall.width -
            FloatingBall.visibleWidth +
            FloatingBall.margin;
          baseStyle.transform = `translateX(-${offset}px)`;
        } else {
          baseStyle.transform = 'translateX(0)';
        }
      } else if (snapSide === 'right') {
        if (!isHovered) {
          // 收起：向右平移，只露左边
          const offset =
            FloatingBall.width -
            FloatingBall.visibleWidth +
            FloatingBall.margin;
          baseStyle.transform = `translateX(${offset}px)`;
        } else {
          baseStyle.transform = 'translateX(0)';
        }
      }
    }

    return baseStyle;
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div onMouseDown={handleDragStart} style={getBallStyle()}>
        {children}
      </div>
    </div>
  );
}
