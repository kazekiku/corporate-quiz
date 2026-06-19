// components/BossNotification.jsx
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const BossAvatar = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 260 260"
    style={{ display: 'block' }}
  >
    <ellipse cx="130" cy="170" rx="70" ry="90" fill="#243a74" />
    <circle cx="130" cy="75" r="55" fill="#f0d3a5" />
    <ellipse cx="130" cy="45" rx="60" ry="30" fill="#22233b" />
    <circle cx="105" cy="75" r="9" fill="#263238" />
    <circle cx="155" cy="75" r="9" fill="#263238" />
    <polygon points="125,120 135,120 145,190 115,190" fill="#8b1f2d" />
  </svg>
);

const getMessageByPath = (path) => {
  if (path === '/') return '«У вас есть ещё работа? Сейчас посмотрим, на что способны.»';
  if (path === '/main' || path === '/home') return '«Не заставляйте меня ждать. Время — деньги. Мои деньги.»';
  if (path.includes('/lobby')) return '«Кто не готов — тот не работает. Кто не работает — тот уволен.»';
  if (path.includes('/qualification')) return '«Покажите, на что способны. Ошибки не прощаю.»';
  if (path.includes('/rating')) return '«Смотрю на рейтинг. Кто на дне — подумайте о будущем.»';
  if (path.includes('/final-lobby')) return '«ФИНАЛ. Покажите, на что способны. Или провалитесь.»';
  if (path.includes('/final')) return '«Это последний шанс. Не подведите.»';
  if (path.includes('/team')) return '«Команда? Посмотрим, чего вы стоите.»';
  if (path.includes('/auth')) return '«Авторизация? Не подведите меня.»';
  return '«Докажите свою эффективность.»';
};

export default function BossNotification() {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Очищаем предыдущий таймер
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const message = getMessageByPath(currentPath);
    console.log('📢 Показываем сообщение:', message);
    
    setNotification({ message, timestamp: new Date() });
    setIsVisible(true);
    setIsExiting(false);

    // Устанавливаем таймер на скрытие через 8 секунд
    timerRef.current = setTimeout(() => {
      console.log('⏰ Таймер сработал, скрываем сообщение');
      setIsExiting(true);
      // Через 400ms после начала анимации полностью скрываем
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        timerRef.current = null;
      }, 400);
    }, 8000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [location.pathname]);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
    }, 400);
  };

  if (!notification || !isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      zIndex: 200,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      opacity: isExiting ? 0 : 1,
      transition: 'opacity 0.4s ease-out',
    }}>
      <div style={{
        pointerEvents: 'auto',
        maxWidth: '500px',
        width: '100%',
        transform: isExiting ? 'translateY(30px)' : 'translateY(0)',
        opacity: isExiting ? 0 : 1,
        transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
      }}>
        <div style={{
          background: 'linear-gradient(to right, rgba(127, 29, 29, 0.95), rgba(127, 29, 29, 0.95))',
          backdropFilter: 'blur(8px)',
          borderLeft: '4px solid #ef4444',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
          }}>
            {/* Аватар */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(to bottom right, #b91c1c, #7f1d1d)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                border: '2px solid #ef4444',
                overflow: 'hidden',
              }}>
                <BossAvatar />
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite',
                boxShadow: '0 0 5px #ef4444',
              }} />
            </div>

            {/* Текст */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '4px',
              }}>
                <span style={{
                  color: '#f87171',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>ДИРЕКТОР</span>
                <span style={{ color: 'rgba(239, 68, 68, 0.5)', fontSize: '12px' }}>•</span>
                <span style={{ color: 'rgba(239, 68, 68, 0.5)', fontSize: '12px' }}>
                  {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p style={{
                color: '#fecaca',
                fontSize: '14px',
                fontWeight: '500',
                lineHeight: 1.5,
                margin: 0,
              }}>{notification.message}</p>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={handleClose}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: 'rgba(239, 68, 68, 0.5)',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '4px',
                borderRadius: '8px',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.5)'}
            >
              ✕
            </button>
          </div>

          {/* Прогресс-бар */}
          <div style={{ height: '4px', backgroundColor: 'rgba(127, 29, 29, 0.5)' }}>
            <div style={{
              height: '100%',
              backgroundColor: '#ef4444',
              width: '100%',
              animation: 'shrink 8s linear forwards',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Добавляем CSS анимации в head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.2);
      }
    }
  `;
  if (!document.querySelector('#boss-notification-styles')) {
    styleSheet.id = 'boss-notification-styles';
    document.head.appendChild(styleSheet);
  }
}