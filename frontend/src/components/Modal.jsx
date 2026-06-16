import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, children, title, className }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${className || ''}`} 
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0
        }}
      >
        {/* Заголовок с крестиком */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          zIndex: 10
        }}>
          {title && (
            typeof title === 'string' 
              ? <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{title}</h3>
              : <div style={{ flex: 1 }}>{title}</div>
          )}
          
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '12px',
              width: '36px',
              height: '36px',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.2s',
              marginLeft: 'auto'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}