import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { useWallpaperInteractions } from '../core/window';

const WallpaperWindow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // 监听全局鼠标位置
  useWallpaperInteractions();

  // 鼠标移动处理函数
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    // 将鼠标坐标转换为 Canvas 坐标（考虑 devicePixelRatio）
    mousePosRef.current = {
      x: (e.clientX - rect.left) * pixelRatio,
      y: (e.clientY - rect.top) * pixelRatio,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初始化 Canvas 大小
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

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
          vx: (Math.random() - 0.5) * 2 * pixelRatio,
          vy: (Math.random() - 0.5) * 2 * pixelRatio,
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
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block', // 移除 Canvas 默认的内边距
        }}
      />
    </div>
  );
};

export default WallpaperWindow;
