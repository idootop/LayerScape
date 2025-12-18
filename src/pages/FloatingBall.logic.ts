import { invoke } from '@tauri-apps/api/core';
import {
  availableMonitors,
  getCurrentWindow,
  PhysicalPosition,
  PhysicalSize,
} from '@tauri-apps/api/window';
import { useCallback, useEffect, useRef, useState } from 'react';

import { onGlobalMouseEvent } from '../core/mouse';

// 常量配置
export const CONFIG = {
  BALL_SIZE: 60, // 悬浮球大小
  SNAP_THRESHOLD: 100, // 边缘吸附阈值
  VISIBLE_WIDTH: 16, // 隐藏时露出的宽度
  ANIMATION_DELAY: 200, // 鼠标离开后多久缩回 (ms)
  WINDOW_PADDING: 8, // 窗口内边距
  EXPANDED_WINDOW_SIZE: 250, // 展开后的窗口大小
  MENU_RADIUS: 75, // 菜单半径
  MENU_ITEM_SIZE: 40, // 菜单项大小
};

export type SnapSide = 'left' | 'right' | null;

export function useFloatingBallLogic() {
  // 状态
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [snapSide, setSnapSide] = useState<SnapSide>(null);

  const windowRef = useRef(getCurrentWindow());
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startWinX: 0,
    startWinY: 0,
    scaleFactor: 1,
  });
  const isMovingWindow = useRef(false);
  const windowRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const isDraggingRef = useRef(isDragging);
  const snapSideRef = useRef(snapSide);
  const isMenuOpenRef = useRef(isMenuOpen);
  const actionHandledRef = useRef(false);
  const ignoreHoverRef = useRef(false);
  const snapTargetRef = useRef<{
    monitorX: number;
    monitorWidth: number;
    monitorScale: number;
  } | null>(null);

  // 同步 Refs
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    snapSideRef.current = snapSide;
  }, [snapSide]);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  // 更新窗口缓存
  const updateWindowRectCache = useCallback(async () => {
    const win = windowRef.current;
    try {
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      windowRectRef.current = {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
      };
    } catch (e) {
      console.error('Failed to update window rect cache', e);
    }
  }, []);

  // 窗口移动
  const moveWindow = useCallback(async (x: number, y: number) => {
    if (isMovingWindow.current) return;
    isMovingWindow.current = true;
    try {
      await windowRef.current.setPosition(new PhysicalPosition(x, y));
    } catch (e) {
      console.error('Move window failed', e);
    } finally {
      isMovingWindow.current = false;
    }
  }, []);

  // 吸附检测
  const checkSnap = useCallback(async () => {
    try {
      const win = windowRef.current;
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      const monitors = await availableMonitors();

      const cx = pos.x + size.width / 2;
      const cy = pos.y + size.height / 2;

      const currentMonitor =
        monitors.find((m) => {
          const { x, y } = m.position;
          const { width, height } = m.size;
          return cx >= x && cx < x + width && cy >= y && cy < y + height;
        }) || monitors[0];

      if (!currentMonitor) return;

      const { x: mx } = currentMonitor.position;
      const { width: mw } = currentMonitor.size;
      const monitorScale =
        currentMonitor.scaleFactor || dragRef.current.scaleFactor;
      const threshold = CONFIG.SNAP_THRESHOLD * monitorScale;
      const paddingPhys = CONFIG.WINDOW_PADDING * monitorScale;

      const windowLeft = pos.x;
      const ballLeft = windowLeft + paddingPhys;
      const ballRight = windowLeft + size.width - paddingPhys;

      const distLeft = Math.abs(ballLeft - mx);
      const distRight = Math.abs(ballRight - (mx + mw));

      if (distLeft < threshold || distRight < threshold) {
        if (distLeft <= distRight) {
          setSnapSide('left');
          snapTargetRef.current = {
            monitorX: mx,
            monitorWidth: mw,
            monitorScale,
          };
        } else {
          setSnapSide('right');
          snapTargetRef.current = {
            monitorX: mx,
            monitorWidth: mw,
            monitorScale,
          };
        }
      } else {
        setSnapSide(null);
        snapTargetRef.current = null;
      }
    } catch (e) {
      console.error('Snap check failed', e);
    }
  }, []);

  const checkSnapRef = useRef(checkSnap);
  useEffect(() => {
    checkSnapRef.current = checkSnap;
  }, [checkSnap]);

  // 处理拖拽开始
  const handleDragStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;

    if (isMenuOpen) {
      toggleMenu(false);
      actionHandledRef.current = true;
      return;
    }

    actionHandledRef.current = false;
    setIsDragging(true);

    const win = windowRef.current;
    const pos = await win.outerPosition();
    const factor = await win.scaleFactor();

    dragRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      startWinX: pos.x,
      startWinY: pos.y,
      scaleFactor: factor,
    };
  };

  // 切换菜单
  const toggleMenu = useCallback(
    async (shouldOpen?: boolean) => {
      const win = windowRef.current;
      const factor = dragRef.current.scaleFactor;
      const monitors = await availableMonitors();

      // 如果没有传入 shouldOpen，则取反
      const nextIsOpen = shouldOpen !== undefined ? shouldOpen : !isMenuOpen;

      if (nextIsOpen === isMenuOpen) return;

      if (nextIsOpen) {
        // 展开菜单
        const expandedSize = CONFIG.EXPANDED_WINDOW_SIZE * factor;
        const pos = await win.outerPosition();
        const size = await win.outerSize();
        const cx = pos.x + size.width / 2;
        const cy = pos.y + size.height / 2;

        let targetX = cx - expandedSize / 2;
        let targetY = cy - expandedSize / 2;

        // 根据吸附状态调整展开方向，保持悬浮球在屏幕上的位置视觉不变
        const currentSnapSide = snapSideRef.current;
        if (currentSnapSide === 'left') {
          // 吸附左侧：窗口左边缘保持不变
          targetX = pos.x;
        } else if (currentSnapSide === 'right') {
          // 吸附右侧：窗口右边缘保持不变
          targetX = pos.x + size.width - expandedSize;
        }

        // 限制在屏幕内
        const monitor =
          monitors.find((m) => {
            const { x, y } = m.position;
            const { width, height } = m.size;
            return cx >= x && cx < x + width && cy >= y && cy < y + height;
          }) || monitors[0];

        if (monitor) {
          const { x: mx, y: my } = monitor.position;
          const { width: mw, height: mh } = monitor.size;

          if (targetX < mx) targetX = mx;
          if (targetX + expandedSize > mx + mw)
            targetX = mx + mw - expandedSize;
          if (targetY < my) targetY = my;
          if (targetY + expandedSize > my + mh)
            targetY = my + mh - expandedSize;
        }

        // 调用 Rust 命令一次性调整大小和位置
        await invoke('resize_and_move', {
          x: Math.round(targetX),
          y: Math.round(targetY),
          width: expandedSize,
          height: expandedSize,
        });

        await updateWindowRectCache();

        // 延迟显示菜单，等待窗口大小调整完成
        setTimeout(() => {
          setIsMenuOpen(true);
        }, 50);
      } else {
        // 收起菜单
        setIsMenuOpen(false);

        // 等待菜单消失动画结束
        setTimeout(async () => {
          const factor = dragRef.current.scaleFactor;
          const paddingPhys = CONFIG.WINDOW_PADDING * factor;
          const ballSizePhys = CONFIG.BALL_SIZE * factor;
          // 关键修复：收起时窗口大小必须精确包含 padding
          const smallSize = ballSizePhys + paddingPhys * 2;

          const pos = await win.outerPosition();
          const expandedSize = CONFIG.EXPANDED_WINDOW_SIZE * factor;
          const cx = pos.x + expandedSize / 2;
          const cy = pos.y + expandedSize / 2;

          let effectiveSnapSide = snapSideRef.current;
          let effectiveSnapTarget = snapTargetRef.current;

          // 若当前未记录吸附状态，检测是否处于吸附阈值内（针对非贴边但靠近边缘的情况）
          if (!effectiveSnapSide) {
            const monitor =
              monitors.find((m) => {
                const { x, y } = m.position;
                const { width, height } = m.size;
                return cx >= x && cx < x + width && cy >= y && cy < y + height;
              }) || monitors[0];

            if (monitor) {
              const { x: mx } = monitor.position;
              const { width: mw } = monitor.size;
              const monitorScale = monitor.scaleFactor || factor;
              const threshold = CONFIG.SNAP_THRESHOLD * monitorScale;

              // 预测收起后的球体边缘位置
              const ballLeft = cx - smallSize / 2 + paddingPhys;
              const ballRight = cx + smallSize / 2 - paddingPhys;

              const distLeft = Math.abs(ballLeft - mx);
              const distRight = Math.abs(ballRight - (mx + mw));

              if (distLeft < threshold || distRight < threshold) {
                const monitorInfo = {
                  monitorX: mx,
                  monitorWidth: mw,
                  monitorScale,
                };

                if (distLeft <= distRight) {
                  effectiveSnapSide = 'left';
                } else {
                  effectiveSnapSide = 'right';
                }
                effectiveSnapTarget = monitorInfo;

                // 更新状态
                setSnapSide(effectiveSnapSide);
                snapTargetRef.current = effectiveSnapTarget;
                snapSideRef.current = effectiveSnapSide;
              }
            }
          }

          let targetX = cx - smallSize / 2;
          const targetY = cy - smallSize / 2;

          if (effectiveSnapSide === 'left' && effectiveSnapTarget) {
            targetX = effectiveSnapTarget.monitorX;
          } else if (effectiveSnapSide === 'right' && effectiveSnapTarget) {
            const { monitorX, monitorWidth } = effectiveSnapTarget;
            targetX = monitorX + monitorWidth - smallSize;
          }

          // 调用 Rust 命令一次性调整大小和位置
          await invoke('resize_and_move', {
            x: Math.round(targetX),
            y: Math.round(targetY),
            width: smallSize,
            height: smallSize,
          });

          await updateWindowRectCache();

          // 移动完成后，如果是吸附状态，强制进入收起模式，并忽略悬停直到移出
          if (snapSideRef.current) {
            setIsHovered(false);
            ignoreHoverRef.current = true;
          }
        }, 300);
      }
    },
    [isMenuOpen, updateWindowRectCache],
  );

  // 处理窗口失焦
  useEffect(() => {
    const win = windowRef.current;

    const unlistenBlur = win.onFocusChanged(({ payload: isFocused }) => {
      if (!isFocused && isMenuOpenRef.current) {
        toggleMenu(false);
      }
    });

    return () => {
      unlistenBlur.then((f) => f());
    };
  }, [toggleMenu]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      const win = windowRef.current;
      await win.setAlwaysOnTop(true);
      const factor = await win.scaleFactor();
      dragRef.current.scaleFactor = factor;

      await win.show();

      const paddingPhys = CONFIG.WINDOW_PADDING * factor;
      const ballSizePhys = CONFIG.BALL_SIZE * factor;
      const totalSizePhys = ballSizePhys + paddingPhys * 2;

      await win.setSize(new PhysicalSize(totalSizePhys, totalSizePhys));

      const monitors = await availableMonitors();
      if (monitors.length > 0) {
        const primary = monitors[0];
        const { width: mw, height: mh } = primary.size;
        const { x: mx, y: my } = primary.position;

        const initialX = mx + mw - ballSizePhys - paddingPhys * 2;
        const initialY = my + mh / 2 - ballSizePhys / 2 - paddingPhys;

        await win.setPosition(new PhysicalPosition(initialX, initialY));
        await updateWindowRectCache();

        setSnapSide('right');
        snapTargetRef.current = {
          monitorX: mx,
          monitorWidth: mw,
          monitorScale: factor,
        };
      }
    };
    init();

    const unlistenScale = windowRef.current.onScaleChanged(({ payload }) => {
      dragRef.current.scaleFactor = payload.scaleFactor;
    });

    return () => {
      unlistenScale.then((f) => f());
    };
  }, [updateWindowRectCache]);

  // 全局鼠标事件监听
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startY, startWinX, startWinY, scaleFactor } =
        dragRef.current;

      // 检测是否为有效拖拽并清除吸附状态
      if (snapSideRef.current) {
        const dist = Math.sqrt(
          (e.screenX - startX) ** 2 + (e.screenY - startY) ** 2,
        );
        if (dist > 5) {
          setSnapSide(null);
          snapTargetRef.current = null;
        }
      }

      const deltaX = (e.screenX - startX) * scaleFactor;
      const deltaY = (e.screenY - startY) * scaleFactor;
      moveWindow(
        Math.round(startWinX + deltaX),
        Math.round(startWinY + deltaY),
      );
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const { startX, startY } = dragRef.current;
      const dist = Math.sqrt(
        (e.screenX - startX) ** 2 + (e.screenY - startY) ** 2,
      );

      setIsDragging(false);

      if (dist < 5) {
        if (actionHandledRef.current) {
          actionHandledRef.current = false;
          return;
        }
        await toggleMenu();
      } else {
        await checkSnapRef.current();
        await updateWindowRectCache();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, moveWindow, updateWindowRectCache, toggleMenu]);

  // 鼠标位置吸附/展开检测
  useEffect(() => {
    let unlisten: () => void;
    let lastHit = false;
    let leaveTimer: number | null = null;

    const startListening = async () => {
      unlisten = await onGlobalMouseEvent(async (payload) => {
        if (isDraggingRef.current) return;

        const { x: mx, y: my } = payload;
        const { x, y, width, height } = windowRectRef.current;
        const scaleFactor = dragRef.current.scaleFactor;
        const visibleWidthPhys = CONFIG.VISIBLE_WIDTH * scaleFactor;

        const isMac = navigator.userAgent.includes('Mac');
        const mouseX = isMac ? mx * scaleFactor : mx;
        const mouseY = isMac ? my * scaleFactor : my;

        let isHit = false;
        const currentSnapSide = snapSideRef.current;
        const currentIsMenuOpen = isMenuOpenRef.current;
        const useExpandedLogic =
          currentIsMenuOpen || lastHit || leaveTimer !== null;

        if (useExpandedLogic) {
          isHit =
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height;
        } else {
          if (currentSnapSide === 'left') {
            isHit =
              mouseX >= x &&
              mouseX <= x + visibleWidthPhys &&
              mouseY >= y &&
              mouseY <= y + height;
          } else if (currentSnapSide === 'right') {
            isHit =
              mouseX >= x + width - visibleWidthPhys &&
              mouseX <= x + width &&
              mouseY >= y &&
              mouseY <= y + height;
          } else {
            const paddingPhys = CONFIG.WINDOW_PADDING * scaleFactor;
            const ballSizePhys = CONFIG.BALL_SIZE * scaleFactor;
            const ballX = x + paddingPhys;
            const ballY = y + paddingPhys;

            isHit =
              mouseX >= ballX &&
              mouseX <= ballX + ballSizePhys &&
              mouseY >= ballY &&
              mouseY <= ballY + ballSizePhys;
          }
        }

        // 如果处于忽略悬停状态（例如刚从吸附状态关闭菜单）
        if (ignoreHoverRef.current) {
          if (!isHit) {
            // 鼠标移出，解除忽略状态
            ignoreHoverRef.current = false;
          } else {
            // 鼠标仍在范围内，强制视为未命中，保持收起状态
            isHit = false;
          }
        }

        if (isHit !== lastHit) {
          lastHit = isHit;
          const win = windowRef.current;

          if (isHit) {
            if (leaveTimer) {
              clearTimeout(leaveTimer);
              leaveTimer = null;
            }
            await win.setIgnoreCursorEvents(false);
            setIsHovered(true);
          } else {
            await win.setIgnoreCursorEvents(true);
            leaveTimer = window.setTimeout(() => {
              setIsHovered(false);
              leaveTimer = null;
            }, CONFIG.ANIMATION_DELAY);
          }
        }
      });
    };

    startListening();

    return () => {
      if (unlisten) unlisten();
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, []);

  // 吸附动画位置修正
  useEffect(() => {
    if (isDragging) return;
    if (!snapSide || !snapTargetRef.current) return;

    const updateWindowPosition = async () => {
      const win = windowRef.current;
      const pos = await win.outerPosition();

      if (!snapTargetRef.current) return;

      const {
        monitorX: mx,
        monitorWidth: mw,
        monitorScale,
      } = snapTargetRef.current;

      const paddingPhys = CONFIG.WINDOW_PADDING * monitorScale;
      const ballSizePhys = CONFIG.BALL_SIZE * monitorScale;

      let targetX = pos.x;

      if (snapSide === 'left') {
        targetX = mx;
      } else if (snapSide === 'right') {
        targetX = mx + mw - ballSizePhys - paddingPhys * 2;
      }

      await win.setPosition(new PhysicalPosition(Math.round(targetX), pos.y));
      await updateWindowRectCache();
    };

    updateWindowPosition();
  }, [snapSide, isDragging, updateWindowRectCache]);

  return {
    isDragging,
    isHovered,
    isMenuOpen,
    snapSide,
    handleDragStart,
    toggleMenu,
  };
}
