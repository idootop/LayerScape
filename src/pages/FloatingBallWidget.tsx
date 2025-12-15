import { useEffect, useRef, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  getCurrentWindow,
  availableMonitors,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";

// 常量配置
const CONFIG = {
  BALL_SIZE: 60, // 悬浮球大小
  SNAP_THRESHOLD: 100, // 边缘吸附阈值
  VISIBLE_WIDTH: 16, // 隐藏时露出的宽度
  ANIMATION_DELAY: 200, // 鼠标离开后多久缩回 (ms)
  WINDOW_PADDING: 8, // 窗口内边距
};

export default function FloatingBallWidget() {
  // 状态
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [snapSide, setSnapSide] = useState<"left" | "right" | null>(null);

  // 缓存吸附目标信息
  const snapTargetRef = useRef<{
    monitorX: number;
    monitorWidth: number;
    monitorScale: number;
  } | null>(null);

  const windowRef = useRef(getCurrentWindow());
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startWinX: 0,
    startWinY: 0,
    scaleFactor: 1,
  });
  const isMovingWindow = useRef(false);

  // 缓存窗口位置信息
  const windowRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const isDraggingRef = useRef(isDragging);
  const snapSideRef = useRef(snapSide);

  // 同步 isDragging
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // 同步 snapSide
  useEffect(() => {
    snapSideRef.current = snapSide;
  }, [snapSide]);

  // 更新窗口缓存辅助函数
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
      console.error("Failed to update window rect cache", e);
    }
  }, []);

  // 初始化
  useEffect(() => {
    const init = async () => {
      const win = windowRef.current;
      await win.setAlwaysOnTop(true);
      const factor = await win.scaleFactor();
      dragRef.current.scaleFactor = factor;

      await win.show();

      // 初始确保窗口是全尺寸 (包含 padding)
      const paddingPhys = CONFIG.WINDOW_PADDING * factor;
      const ballSizePhys = CONFIG.BALL_SIZE * factor;
      const totalSizePhys = ballSizePhys + paddingPhys * 2;

      await win.setSize(new PhysicalSize(totalSizePhys, totalSizePhys));

      const monitors = await availableMonitors();
      if (monitors.length > 0) {
        const primary = monitors[0];
        const { width: mw, height: mh } = primary.size;
        const { x: mx, y: my } = primary.position;

        // 初始位置：右侧吸附
        const initialX = mx + mw - ballSizePhys - paddingPhys * 2;
        const initialY = my + mh / 2 - ballSizePhys / 2 - paddingPhys;

        await win.setPosition(new PhysicalPosition(initialX, initialY));
        await updateWindowRectCache();

        // 设置初始吸附状态
        setSnapSide("right");
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

  // 窗口移动逻辑
  const moveWindow = useCallback(async (x: number, y: number) => {
    if (isMovingWindow.current) return;
    isMovingWindow.current = true;
    try {
      await windowRef.current.setPosition(new PhysicalPosition(x, y));
    } catch (e) {
      console.error("Move window failed", e);
    } finally {
      isMovingWindow.current = false;
    }
  }, []);

  const handleMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;

    setIsDragging(true);
    setSnapSide(null);
    snapTargetRef.current = null;

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

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startX, startY, startWinX, startWinY, scaleFactor } =
        dragRef.current;
      const deltaX = (e.screenX - startX) * scaleFactor;
      const deltaY = (e.screenY - startY) * scaleFactor;
      moveWindow(
        Math.round(startWinX + deltaX),
        Math.round(startWinY + deltaY)
      );
    };

    const handleMouseUp = async () => {
      setIsDragging(false);
      await checkSnapRef.current();
      await updateWindowRectCache();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, moveWindow, updateWindowRectCache]);

  const checkSnapRef = useRef<() => Promise<void>>(() => Promise.resolve());

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

      // 计算球体边缘距离
      const ballLeft = windowLeft + paddingPhys;
      // 窗口宽度包含 2*padding + ballSize
      const ballRight = windowLeft + size.width - paddingPhys;

      const distLeft = Math.abs(ballLeft - mx);
      const distRight = Math.abs(ballRight - (mx + mw));

      if (distLeft < threshold || distRight < threshold) {
        if (distLeft <= distRight) {
          setSnapSide("left");
          snapTargetRef.current = {
            monitorX: mx,
            monitorWidth: mw,
            monitorScale,
          };
        } else {
          setSnapSide("right");
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
      console.error("Snap check failed", e);
    }
  }, []);

  useEffect(() => {
    checkSnapRef.current = checkSnap;
  });

  // 仅在吸附状态改变时调整一次窗口位置
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

      // 窗口始终保持全尺寸，不改变 Size
      const paddingPhys = CONFIG.WINDOW_PADDING * monitorScale;
      const ballSizePhys = CONFIG.BALL_SIZE * monitorScale;

      let targetX = pos.x;

      if (snapSide === "left") {
        // 左侧吸附：球体左边距离边缘 padding
        targetX = mx;
      } else if (snapSide === "right") {
        // 右侧吸附：球体右边距离边缘 padding
        targetX = mx + mw - ballSizePhys - paddingPhys * 2;
      }

      await win.setPosition(new PhysicalPosition(Math.round(targetX), pos.y));
      await updateWindowRectCache();
    };

    updateWindowPosition();
  }, [snapSide, isDragging, updateWindowRectCache]);

  // 监听全局鼠标事件
  useEffect(() => {
    let unlisten: () => void;
    let lastHit = false;
    let leaveTimer: number | null = null;

    const startListening = async () => {
      unlisten = await listen<[number, number]>("mouse-pos", async (event) => {
        if (isDraggingRef.current) return;

        const [mx, my] = event.payload;
        const { x, y, width, height } = windowRectRef.current;
        const scaleFactor = dragRef.current.scaleFactor;
        const visibleWidthPhys = CONFIG.VISIBLE_WIDTH * scaleFactor;

        // 修复坐标不一致问题
        const isMac = navigator.userAgent.includes("Mac");
        const mouseX = isMac ? mx * scaleFactor : mx;
        const mouseY = isMac ? my * scaleFactor : my;

        let isHit = false;
        const currentSnapSide = snapSideRef.current;
        const useExpandedLogic = lastHit || leaveTimer !== null;

        if (useExpandedLogic) {
          // 展开状态（或在收起延迟期）：检测整个窗口范围（包含 padding），防止误触收起
          isHit =
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height;
        } else {
          // 收起/普通状态
          if (currentSnapSide === "left") {
            // 左侧吸附：只检测露出的部分 (窗口左边缘的 VISIBLE_WIDTH)
            isHit =
              mouseX >= x &&
              mouseX <= x + visibleWidthPhys &&
              mouseY >= y &&
              mouseY <= y + height;
          } else if (currentSnapSide === "right") {
            // 右侧吸附：只检测露出的部分 (窗口右边缘的 VISIBLE_WIDTH)
            isHit =
              mouseX >= x + width - visibleWidthPhys &&
              mouseX <= x + width &&
              mouseY >= y &&
              mouseY <= y + height;
          } else {
            // 未吸附：检测球体区域
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

        if (isHit !== lastHit) {
          lastHit = isHit;
          const win = windowRef.current;

          if (isHit) {
            // 鼠标进入
            if (leaveTimer) {
              clearTimeout(leaveTimer);
              leaveTimer = null;
            }
            // 激活窗口交互
            await win.setIgnoreCursorEvents(false);
            setIsHovered(true);
          } else {
            // 鼠标离开

            // 开启穿透
            await win.setIgnoreCursorEvents(true);

            // 延迟收起 UI
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

  // CSS 样式计算
  const getBallStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: `${CONFIG.BALL_SIZE}px`,
      height: `${CONFIG.BALL_SIZE}px`,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6366f1, #a855f7)",
      boxSizing: "border-box",
      pointerEvents: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      userSelect: "none",
      border: "2px solid rgba(255,255,255,0.8)",
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      transform: "translateX(0)",
      opacity: 1,
    };

    if (snapSide) {
      // 吸附状态下，鼠标没悬停时，半透明
      if (!isHovered) {
        baseStyle.opacity = 0.8;
      }

      if (snapSide === "left") {
        // 左侧吸附
        if (!isHovered) {
          // 收起：向左平移，只露右边 (需要多移一个 padding 距离)
          const offset =
            CONFIG.BALL_SIZE - CONFIG.VISIBLE_WIDTH + CONFIG.WINDOW_PADDING;
          baseStyle.transform = `translateX(-${offset}px)`;
        } else {
          // 展开：恢复原位
          baseStyle.transform = "translateX(0)";
        }
      } else if (snapSide === "right") {
        // 右侧吸附
        if (!isHovered) {
          // 收起：向右平移，只露左边 (需要多移一个 padding 距离)
          const offset =
            CONFIG.BALL_SIZE - CONFIG.VISIBLE_WIDTH + CONFIG.WINDOW_PADDING;
          baseStyle.transform = `translateX(${offset}px)`;
        } else {
          // 展开
          baseStyle.transform = "translateX(0)";
        }
      }
    }

    return baseStyle;
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onMouseDown={handleMouseDown}
        style={getBallStyle()}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      </button>
    </div>
  );
}
