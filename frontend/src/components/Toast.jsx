import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const colors = {
    success: {
      bg: 'rgba(16,185,129,0.95)',
      border: '#10b981',
      icon: '✅'
    },
    error: {
      bg: 'rgba(239,68,68,0.95)',
      border: '#ef4444',
      icon: '❌'
    },
    warning: {
      bg: 'rgba(245,158,11,0.95)',
      border: '#f59e0b',
      icon: '⚠️'
    },
    info: {
      bg: 'rgba(59,130,246,0.95)',
      border: '#3b82f6',
      icon: 'ℹ️'
    }
  };

  const style = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: `translateX(-50%) translateY(${isExiting ? '-20px' : '0'})`,
      zIndex: 9999,
      opacity: isExiting ? 0 : 1,
      transition: 'all 0.3s ease-out',
      maxWidth: '500px',
      width: '90%',
      pointerEvents: 'none'
    }}>
      <div style={{
        pointerEvents: 'auto',
        background: style.bg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${style.border}`,
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>{style.icon}</span>
        <span style={{ 
          flex: 1, 
          color: 'white', 
          fontSize: '14px',
          fontWeight: '500',
          lineHeight: 1.4
        }}>
          {message}
        </span>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              setIsVisible(false);
              if (onClose) onClose();
            }, 300);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '16px',
            cursor: 'pointer',
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
        >
          ✕
        </button>
      </div>
    </div>
  );
}