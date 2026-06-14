// components/DebugPanel.js
import { useState } from 'react';

export default function DebugPanel({ 
  teamId, 
  sessionId,
  onResetProgress, 
  onSkipQuestion, 
  onSpeedUpTimer,
  onForceAllReady,
  onForceStartFinal,
  onAddBot,
  onForceFinalist,
  onPerfectPass,
  onAddTestTeams,
  isFinalLobby 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBecomingFinalist, setIsBecomingFinalist] = useState(false);

  const handleBecomeFinalist = async () => {
    setIsBecomingFinalist(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/auth/become-finalist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Вы стали финалистом! Теперь вам доступен Тур 2.');
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.isFinalist = true;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        window.location.reload();
      } else {
        alert('❌ Ошибка: ' + data.message);
      }
    } catch (error) {
      console.error('Ошибка при получении статуса финалиста:', error);
      alert('❌ Ошибка соединения с сервером');
    } finally {
      setIsBecomingFinalist(false);
    }
  };

  // Функция для добавления тестовых команд до 3-х
  const handleAddTestTeams = async () => {
    if (!sessionId) {
      alert('❌ ID лобби не найден');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/final/add-test-teams/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Добавлено ${data.addedCount} тестовых команд. Теперь в лобби ${data.totalCount} команд.`);
        window.location.reload();
      } else {
        alert('❌ Ошибка: ' + data.message);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('❌ Ошибка соединения с сервером');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      zIndex: 999,
      fontFamily: 'monospace'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#1a1d2a',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#ef4444',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        🐛 DEBUG {isOpen ? '▼' : '▲'}
      </button>

      {isOpen && (
        <div style={{
          marginTop: '8px',
          background: '#1a1d2a',
          border: '1px solid #2d3348',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '220px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '10px', color: '#8b92b0', marginBottom: '4px', borderBottom: '1px solid #2d3348', paddingBottom: '4px' }}>
            🔧 ОТЛАДОЧНЫЕ УТИЛИТЫ
          </div>
          
          {/* Добавить тестовые команды (для финала) */}
          {onAddTestTeams && isFinalLobby && (
            <button
              onClick={handleAddTestTeams}
              style={{
                background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                border: '2px solid #a855f7',
                borderRadius: '6px',
                color: '#a855f7',
                padding: '8px 10px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              🤖 ДОБАВИТЬ ТЕСТОВЫЕ КОМАНДЫ ДО 3-Х
            </button>
          )}

          {/* Стать финалистом */}
          <button
            onClick={handleBecomeFinalist}
            disabled={isBecomingFinalist}
            style={{
              background: 'linear-gradient(135deg, #2d2d3d, #1f1f2d)',
              border: '2px solid #f0c564',
              borderRadius: '6px',
              color: '#f0c564',
              padding: '8px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'center',
              opacity: isBecomingFinalist ? 0.7 : 1
            }}
          >
            {isBecomingFinalist ? '🔄 Обработка...' : '👑 СТАТЬ ФИНАЛИСТОМ (ДЕБАГ)'}
          </button>

          {/* Прогресс викторины */}
          {onResetProgress && (
            <button
              onClick={onResetProgress}
              style={{
                background: '#2d1f1f',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                color: '#ef4444',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🔄 Сбросить прогресс викторины
            </button>
          )}

          {/* Пройти тур идеально */}
          {onPerfectPass && (
            <button
              onClick={onPerfectPass}
              style={{
                background: '#1f2d3d',
                border: '1px solid #10b981',
                borderRadius: '6px',
                color: '#10b981',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 'bold'
              }}
            >
              ⭐ ПРОЙТИ ТУР ИДЕАЛЬНО
            </button>
          )}

          {/* Пропустить вопрос */}
          {onSkipQuestion && (
            <button
              onClick={onSkipQuestion}
              style={{
                background: '#1f2d1f',
                border: '1px solid #10b981',
                borderRadius: '6px',
                color: '#10b981',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              ⏭ Пропустить вопрос
            </button>
          )}

          {/* Ускорить таймер */}
          {onSpeedUpTimer && (
            <button
              onClick={onSpeedUpTimer}
              style={{
                background: '#2d2d1f',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                color: '#f59e0b',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              ⚡ Ускорить таймер (-10 сек)
            </button>
          )}

          {/* Добавить бота */}
          {onAddBot && (
            <button
              onClick={onAddBot}
              style={{
                background: '#1f2d3d',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🤖 Добавить бота в команду
            </button>
          )}

          {/* Принудительная готовность всех команд (лобби) */}
          {onForceAllReady && !isFinalLobby && (
            <button
              onClick={onForceAllReady}
              style={{
                background: '#1f2d3d',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🔓 Все игроки готовы (лобби)
            </button>
          )}

          {/* Принудительная готовность всех команд (финал) */}
          {onForceAllReady && isFinalLobby && (
            <button
              onClick={onForceAllReady}
              style={{
                background: '#1f2d3d',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                color: '#3b82f6',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🔓 Принудительно готовы все команды (финал)
            </button>
          )}

          {/* Принудительный старт финала */}
          {onForceStartFinal && isFinalLobby && (
            <button
              onClick={onForceStartFinal}
              style={{
                background: '#2d1f3d',
                border: '1px solid #a855f7',
                borderRadius: '6px',
                color: '#a855f7',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 'bold'
              }}
            >
              🎮 ПРИНУДИТЕЛЬНЫЙ СТАРТ ФИНАЛА
            </button>
          )}

          {/* Очистить localStorage */}
          <button
            onClick={() => {
              if (confirm('Очистить все данные? Это удалит пользователя, команду и прогресс.')) {
                localStorage.clear();
                window.location.href = '/';
              }
            }}
            style={{
              background: '#2d1f1f',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            🗑️ ОЧИСТИТЬ ВСЕ ДАННЫЕ
          </button>

          <div style={{ fontSize: '10px', color: '#5a6380', marginTop: '6px', borderTop: '1px solid #2d3348', paddingTop: '6px' }}>
            ⚠️ Используйте осторожно
          </div>
        </div>
      )}
    </div>
  );
}