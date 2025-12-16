import React, { useEffect, useRef } from "react";
import { onGlobalMouseEvent } from "../utils/mouse";
import { getCurrentWindow } from "@tauri-apps/api/window";

const WallpaperWindow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const windowPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const appWindow = getCurrentWindow();
    const updateWindowPos = async () => {
      try {
        const pos = await appWindow.innerPosition();
        const factor = await appWindow.scaleFactor();
        windowPosRef.current = {
          x: pos.x / factor,
          y: pos.y / factor,
        };
      } catch (e) {
        console.error("Failed to get window position", e);
      }
    };
    updateWindowPos();

    // 获取设备像素比
    const pixelRatio = window.devicePixelRatio || 1;

    const resize = () => {
      // 设置 Canvas 为物理像素大小，以获得高清渲染
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      // 样式保持为逻辑像素大小
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      updateWindowPos();
    };
    window.addEventListener("resize", resize);
    resize();

    // 监听来自 Rust 的全局鼠标事件 (代理透传)
    const unlistenPromise = onGlobalMouseEvent((payload) => {
      const { x: rawX, y: rawY, event, button } = payload;

      // 1. 坐标转换：全局屏幕坐标 (逻辑) -> 窗口内 Client 坐标 (逻辑)
      const clientX = rawX - windowPosRef.current.x;
      const clientY = rawY - windowPosRef.current.y;

      // 2. 分发事件
      const buttonsMap = {
        left: 1,
        right: 2,
        middle: 4,
        none: 0,
      };
      const buttons = buttonsMap[button] || 0;

      const eventInit: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        screenX: rawX,
        screenY: rawY,
        clientX: clientX,
        clientY: clientY,
        buttons: buttons,
      };

      let eventType = "";
      if (event === "move" || event === "drag") {
        eventType = "mousemove";
      } else if (event === "down") {
        eventType = "mousedown";
      } else if (event === "up") {
        eventType = "mouseup";
      }

      if (eventType) {
        // 使用 document.elementFromPoint 找到当前坐标下的元素
        const targetElement =
          document.elementFromPoint(clientX, clientY) || document.body;
        targetElement.dispatchEvent(new MouseEvent(eventType, eventInit));

        // 模拟 Click
        if (eventType === "mouseup" && button === "left") {
          targetElement.dispatchEvent(new MouseEvent("click", eventInit));
        }
      }

      // 3. 更新 Canvas 粒子动画位置 (需要物理像素)
      const canvasX = clientX * pixelRatio;
      const canvasY = clientY * pixelRatio;

      mousePosRef.current = {
        x: canvasX,
        y: canvasY,
      };
    });

    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
    }[] = [];

    // 初始化粒子 (基于物理像素坐标)
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2 * pixelRatio,
        vy: (Math.random() - 0.5) * 2 * pixelRatio,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mousePos = mousePosRef.current;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // 边界反弹
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // 鼠标交互
        const dx = p.x - mousePos.x;
        const dy = p.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 距离阈值和半径也需要适配 pixelRatio
        const interactDist = 200 * pixelRatio;
        const lineDist = 150 * pixelRatio;
        const radiusLarge = 10 * pixelRatio;
        const radiusSmall = 4 * pixelRatio;

        const radius = dist < interactDist ? radiusLarge : radiusSmall;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // 连线
        if (dist < lineDist) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / lineDist})`;
          ctx.lineWidth = 1 * pixelRatio;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "transparent",
      }}
      // 添加一个测试点击的按钮，验证事件透传是否生效
      onClick={() => {
        document.getElementById("msg")!.innerText += "\nContainer clicked!";
      }}
    >
      <div
        id="msg"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 0 10px 0 rgba(0,0,0,0.1)",
          zIndex: 1000,
          fontSize: "16px",
          fontWeight: "bold",
          color: "#000",
          textAlign: "center",
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        hello
      </div>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
};

export default WallpaperWindow;
