import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <h1>Welcome to LayerScape</h1>
      <p>探索电脑桌面壁纸层 + 悬浮层 + 状态栏的各种 GUI 交互能力。</p>
      <div className="features-grid">
        <div className="feature-card">
          <h3>桌面悬浮球</h3>
          <p>交互式悬浮球组件</p>
        </div>
        <div className="feature-card">
          <h3>桌面动态壁纸</h3>
          <p>Web 技术的动态壁纸</p>
        </div>
        <div className="feature-card">
          <h3>状态栏小工具</h3>
          <p>自定义系统状态栏扩展</p>
        </div>
        <div className="feature-card">
          <h3>截屏</h3>
          <p>高级截屏与标注工具</p>
        </div>
      </div>
    </div>
  );
};

export default Home;

