export function FloatingBallWidget() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        border: '2px solid rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
