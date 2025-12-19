import type React from 'react';

export const FloatingBallPage: React.FC = () => {
  return (
    <div className="module-page">
      <h2>桌面悬浮球</h2>
      <p>这里将实现桌面悬浮球功能（支持拖拽 + 贴边收起/展开）。</p>
      <div className="placeholder-content">[悬浮球预览区域]</div>
    </div>
  );
};
