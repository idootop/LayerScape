import { currentMonitor } from '@tauri-apps/api/window';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { emit2window } from '@/core/event';

function MonitorControl() {
  const [level, setLevel] = useState<'below' | 'above'>('below');
  const [monitorName, setMonitorName] = useState<string>('Unknown');

  useEffect(() => {
    (async () => {
      const monitor = await currentMonitor();
      setMonitorName(monitor?.name ?? 'Unknown');
    })();
  }, []);

  const handleClick = async () => {
    const newLevel = level === 'below' ? 'above' : 'below';
    emit2window('set_window_level', newLevel);
    setLevel(newLevel);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        👉 {monitorName || 'Primary'}
      </div>
      <button
        onClick={handleClick}
        style={{
          padding: '8px 12px',
          background: level === 'below' ? '#007AFF' : '#FF3B30',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
        type="button"
      >
        {level === 'below' ? '层级: 桌面图标下' : '层级: 桌面图标上'}
      </button>
    </div>
  );
}

export const WallpaperWidget: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // 鼠标移动处理函数
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // 将鼠标坐标转换为 Canvas 坐标
    mousePosRef.current = {
      x: (e.clientX - rect.left) * devicePixelRatio,
      y: (e.clientY - rect.top) * devicePixelRatio,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初始化 Canvas 大小
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
    }[] = [];

    // 初始化粒子
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2 * devicePixelRatio,
          vy: (Math.random() - 0.5) * 2 * devicePixelRatio,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        });
      }
    };

    initParticles();

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

        const interactDist = 200 * devicePixelRatio;
        const lineDist = 150 * devicePixelRatio;
        const radiusLarge = 10 * devicePixelRatio;
        const radiusSmall = 4 * devicePixelRatio;

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
          ctx.lineWidth = 1 * devicePixelRatio;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block', // 移除 Canvas 默认的内边距
        }}
      />
      <MonitorControl />
    </div>
  );
};
