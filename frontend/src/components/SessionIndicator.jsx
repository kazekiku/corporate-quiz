import { useEffect, useState } from 'react';

export default function SessionIndicator() {
  const [activeSession, setActiveSession] = useState(true);

  useEffect(() => {
    // Генерируем ID сессии при загрузке
    const sessionId = sessionStorage.getItem('sessionId') || Math.random().toString(36).substring(2);
    sessionStorage.setItem('sessionId', sessionId);
    
    // Периодически проверяем активность
    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity && Date.now() - parseInt(lastActivity) > 24 * 60 * 60 * 1000) {
        setActiveSession(false);
      }
    }, 60000);
    
    // Обновляем время активности
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
      setActiveSession(true);
    };
    
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    updateActivity();
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
    };
  }, []);

  if (!activeSession) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(239,68,68,0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        ⚠️ Сессия истекла. Обновите страницу.
      </div>
    );
  }

  return null;
}