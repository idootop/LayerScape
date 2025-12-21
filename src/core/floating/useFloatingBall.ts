import {
  availableMonitors,
  getCurrentWindow,
  type Monitor,
  PhysicalPosition,
} from '@tauri-apps/api/window';
import { useCallback, useEffect, useRef, useState } from 'react';

import { onGlobalMouseEvent } from '@/core/mouse';

import { FloatingBall } from '.';
import { useListen } from '../event';
import { getWebviewWindow } from '../window';

export type SnapSide = 'left' | 'right' | null;

export function useFloatingBall() {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
  const wasDraggedRef = useRef(false);
  const snapSideRef = useRef(snapSide);
  const snapTargetRef = useRef<{
    monitorX: number;
    monitorWidth: number;
    monitorScale: number;
  } | null>(null);

  // 同步状态到 Refs
  isDraggingRef.current = isDragging;
  snapSideRef.current = snapSide;

  // 更新窗口坐标
  const updateWindowRectCache = useCallback(async () => {
    const win = windowRef.current;
    try {
      const [pos, size] = await Promise.all([
        win.outerPosition(),
        win.outerSize(),
      ]);
      windowRectRef.current = {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
      };
    } catch (e) {
      console.error('Update window cache failed:', e);
    }
  }, []);

  // 边缘吸附检测
  const checkSnap = useCallback(async () => {
    try {
      const win = windowRef.current;
      const [pos, size, monitors, factor] = await Promise.all([
        win.outerPosition(),
        win.outerSize(),
        availableMonitors(),
        win.scaleFactor(),
      ]);

      dragRef.current.scaleFactor = factor;

      const cx = pos.x + size.width / 2;
      const cy = pos.y + size.height / 2;

      const monitor =
        monitors.find((m) => {
          const { x, y } = m.position;
          const { width: w, height: h } = m.size;
          return cx >= x && cx < x + w && cy >= y && cy < y + h;
        }) || monitors[0];

      if (!monitor) return;

      const { x: mx } = monitor.position;
      const { width: mw } = monitor.size;
      const scale = monitor.scaleFactor || factor;
      const threshold = FloatingBall.snapThreshold * scale;
      const margin = FloatingBall.margin * scale;

      const ballLeft = pos.x + margin;
      const ballRight = pos.x + size.width - margin;

      const distLeft = Math.abs(ballLeft - mx);
      const distRight = Math.abs(ballRight - (mx + mw));

      if (distLeft < threshold || distRight < threshold) {
        const side = distLeft <= distRight ? 'left' : 'right';
        setSnapSide(side);
        snapTargetRef.current = {
          monitorX: mx,
          monitorWidth: mw,
          monitorScale: scale,
        };
      } else {
        setSnapSide(null);
        snapTargetRef.current = null;
      }
    } catch (e) {
      console.error('Snap check failed:', e);
    }
  }, []);

  // 移动窗口
  const moveWindow = useCallback(async (x: number, y: number) => {
    if (isMovingWindow.current) return;
    isMovingWindow.current = true;
    try {
      await windowRef.current.setPosition(new PhysicalPosition(x, y));
    } finally {
      isMovingWindow.current = false;
    }
  }, []);

  // 拖拽开始
  const handleDragStart = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    // 拖拽时立即关闭菜单
    await FloatingBall.hideMenu();

    setIsDragging(true);
    wasDraggedRef.current = false;
    const win = windowRef.current;
    const [pos, factor] = await Promise.all([
      win.outerPosition(),
      win.scaleFactor(),
    ]);

    dragRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      startWinX: pos.x,
      startWinY: pos.y,
      scaleFactor: factor,
    };
  };

  const handleClick = () => {
    if (wasDraggedRef.current) return;
    // todo 打开主窗口
  };

  // 拖拽过程中与结束后的逻辑
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startY, startWinX, startWinY, scaleFactor } =
        dragRef.current;

      const dist = Math.sqrt(
        (e.screenX - startX) ** 2 + (e.screenY - startY) ** 2,
      );
      if (dist >= 5) {
        wasDraggedRef.current = true;
      }

      if (snapSideRef.current) {
        if (dist > 5) {
          setSnapSide(null);
          snapTargetRef.current = null;
        }
      }

      moveWindow(
        Math.round(startWinX + (e.screenX - startX) * scaleFactor),
        Math.round(startWinY + (e.screenY - startY) * scaleFactor),
      );
    };

    const handleMouseUp = async (e: MouseEvent) => {
      setIsDragging(false);
      const { startX, startY } = dragRef.current;
      if (
        Math.sqrt((e.screenX - startX) ** 2 + (e.screenY - startY) ** 2) >= 5
      ) {
        await checkSnap();
        await updateWindowRectCache();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, moveWindow, checkSnap, updateWindowRectCache]);

  // 监听菜单关闭事件，取消激活状态
  useListen('floating-menu-closed', () => {
    setIsHovered(false);
  });

  // 全局鼠标悬停检测
  useEffect(() => {
    let unlisten: () => void;
    let lastHit = false;
    let leaveTimer: number | null = null;

    const startListening = async () => {
      unlisten = await onGlobalMouseEvent(async ({ x: mx, y: my }) => {
        if (isDraggingRef.current) return;

        const { x, y, width, height } = windowRectRef.current;
        const scale = dragRef.current.scaleFactor;
        const mouseX = mx;
        const mouseY = my;

        // 检测悬浮球
        let isBallHit = false;
        if (lastHit || leaveTimer !== null) {
          isBallHit =
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height;
        } else {
          const side = snapSideRef.current;
          if (side === 'left') {
            isBallHit =
              mouseX >= x &&
              mouseX <= x + FloatingBall.visibleWidth * scale &&
              mouseY >= y &&
              mouseY <= y + height;
          } else if (side === 'right') {
            isBallHit =
              mouseX >= x + width - FloatingBall.visibleWidth * scale &&
              mouseX <= x + width &&
              mouseY >= y &&
              mouseY <= y + height;
          } else {
            const ballWidth = FloatingBall.width * scale;
            const margin = FloatingBall.margin * scale;
            isBallHit =
              mouseX >= x + margin &&
              mouseX <= x + margin + ballWidth &&
              mouseY >= y + margin &&
              mouseY <= y + margin + ballWidth;
          }
        }

        // 检测菜单
        let isMenuHit = false;
        if (FloatingBall.menuRect) {
          const { x: mx, y: my, width: mw, height: mh } = FloatingBall.menuRect;
          isMenuHit =
            mouseX >= mx &&
            mouseX <= mx + mw &&
            mouseY >= my &&
            mouseY <= my + mh;
        }

        const isHit = isBallHit || isMenuHit;

        if (isHit !== lastHit) {
          lastHit = isHit;
          const win = windowRef.current;
          if (isHit) {
            if (leaveTimer) clearTimeout(leaveTimer);
            leaveTimer = null;
            await win.setIgnoreCursorEvents(false);
            setIsHovered(true);

            if (isBallHit) {
              // 鼠标在球上，确保球窗口获得焦点，方便拖拽
              await win.setFocus();
              await FloatingBall.showMenu();
            } else if (isMenuHit) {
              // 鼠标在菜单上，给菜单焦点
              const menuWin = await getWebviewWindow('floating-menu');
              if (menuWin) {
                await menuWin.setFocus();
              }
            }
          } else {
            await win.setIgnoreCursorEvents(true);
            leaveTimer = window.setTimeout(async () => {
              setIsHovered(false);
              leaveTimer = null;
              await FloatingBall.hideMenu();
            }, FloatingBall.snapDelay);
          }
        } else if (isHit) {
          // 持续检测焦点切换
          if (isBallHit) {
            const isFocused = await windowRef.current.isFocused();
            if (!isFocused) await windowRef.current.setFocus();
          } else if (isMenuHit) {
            const menuWin = await getWebviewWindow('floating-menu');
            if (menuWin && !(await menuWin.isFocused())) {
              await menuWin.setFocus();
            }
          }
        }
      });
    };

    startListening();
    return () => {
      unlisten?.();
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, []);

  // 吸附位置修正
  useEffect(() => {
    if (isDragging || !snapSide || !snapTargetRef.current) return;

    (async () => {
      const win = windowRef.current;
      const pos = await win.outerPosition();
      const { monitorX, monitorWidth, monitorScale } = snapTargetRef.current!;
      const width = FloatingBall.width * monitorScale;
      const margin = FloatingBall.margin * monitorScale;

      const targetX =
        snapSide === 'left'
          ? monitorX
          : monitorX + monitorWidth - width - margin * 2;
      await win.setPosition(new PhysicalPosition(Math.round(targetX), pos.y));
      await updateWindowRectCache();
    })();
  }, [snapSide, isDragging, updateWindowRectCache]);

  // 初始化检测
  useEffect(() => {
    (async () => {
      await updateWindowRectCache();
      await checkSnap();
    })();
  }, [updateWindowRectCache, checkSnap]);

  // 检测显示器变更，如果窗口所在显示器消失，恢复到主屏幕初始位置
  useListen<Monitor[]>('monitor-changed', async (monitors) => {
    const { x, y, width, height } = windowRectRef.current;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // 检查当前中心点是否还在任何一个显示器范围内
    const isOnAnyMonitor = monitors.some((m) => {
      const { x: mx, y: my } = m.position;
      const { width: mw, height: mh } = m.size;
      return cx >= mx && cx < mx + mw && cy >= my && cy < my + mh;
    });

    if (!isOnAnyMonitor) {
      await FloatingBall.resetPosition();
      await updateWindowRectCache();
      await checkSnap();
    }
  });

  return { isDragging, isHovered, snapSide, handleDragStart, handleClick };
}
