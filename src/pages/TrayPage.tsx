import type React from 'react';
import { useState } from 'react';

import { Tray } from '@/core/tray';

export const TrayPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateIcon = async () => {
    if (!imageUrl) return;
    setLoading(true);
    await Tray.updateIcon(imageUrl);
    setLoading(false);
  };

  return (
    <div className="module-page" style={{ padding: '20px' }}>
      <h2>状态栏小工具</h2>
      <p>这里将实现状态栏小工具（支持动态图标 + 自定菜单页面）。</p>

      <div className="placeholder-content">
        <h3 style={{ marginTop: 0 }}>动态更新任务栏图标</h3>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <input
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="输入图片URL (例如: https://tauri.app/logo.png)"
            style={{
              width: '50%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color, #ccc)',
            }}
            type="text"
            value={imageUrl}
          />
          <button
            disabled={loading}
            onClick={handleUpdateIcon}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--primary-color, #007bff)',
              color: 'white',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
            type="button"
          >
            {loading ? '更新中...' : '更新图标'}
          </button>
        </div>
        <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
          请输入有效的图片链接 (PNG)
        </p>
      </div>
    </div>
  );
};
