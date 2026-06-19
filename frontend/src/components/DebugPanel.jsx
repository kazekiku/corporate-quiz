import { useState } from 'react';
import { useToast } from '../hooks/useToast';

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
  onSkipTurn,
  onAddPoints,
  onResetGame,
  onForceNextQuestion,
  onForceEndGame,
  isFinalLobby,
  isFinalGame
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();
  const [isBecomingFinalist, setIsBecomingFinalist] = useState(false);
  const [isClearingDB, setIsClearingDB] = useState(false);
  const [isAddingTestTeams, setIsAddingTestTeams] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

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
        showToast('Вы стали финалистом!', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setIsBecomingFinalist(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ Полностью очистить базу данных? Это НЕОБРАТИМО!')) return;
    setIsClearingDB(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/debug/clear-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast('База данных очищена!', 'success');
        localStorage.clear();
        setTimeout(() => window.location.href = '/', 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setIsClearingDB(false);
    }
  };

  const handleAddTestTeams = async () => {
    if (!isFinalLobby) {
      showToast('Эта функция доступна только в лобби финала', 'warning');
      return;
    }
    setIsAddingTestTeams(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/final/add-test-teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Добавлено ${data.addedCount} тестовых команд!`, 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setIsAddingTestTeams(false);
    }
  };

  // ========== ПРИНУДИТЕЛЬНО НАЧАТЬ ФИНАЛ (для лобби) ==========
  const handleForceGameStart = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/final/force-start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Финал принудительно начат!', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    }
  };

  const handleForceNextQuestion = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/final/next-question', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Следующий вопрос!', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    }
  };

  // ========== ПЕРЕДАТЬ ХОД СЛЕДУЮЩЕЙ КОМАНДЕ ==========
  // ========== ПЕРЕДАТЬ ХОД СЛЕДУЮЩЕЙ КОМАНДЕ (ДЕБАГ) ==========
const handleNextTurn = async () => {
  setIsLoading(true);
  try {
    const token = localStorage.getItem('token');
    console.log('🔄 Принудительная передача хода...');
    
    const response = await fetch('http://localhost:3001/api/final/debug-next-turn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📊 Ответ /debug-next-turn:', data);
    
    if (data.success) {
      showToast(`Ход передан команде #${data.nextTeamId}`, 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast('Ошибка: ' + (data.message || 'Не удалось передать ход'), 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    showToast('Ошибка: ' + error.message, 'error');
  } finally {
    setIsLoading(false);
  }
};

  // ========== ЗАВЕРШИТЬ ФИНАЛ ==========
  const handleForceFinishFinal = async () => {
    if (!confirm('⚠️ Принудительно завершить финал? Это действие нельзя отменить!')) return;
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const resultsResponse = await fetch('http://localhost:3001/api/final/results', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resultsData = await resultsResponse.json();
      console.log('📊 Финальные результаты:', resultsData);
      
      const endResponse = await fetch('http://localhost:3001/api/final/end-game', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const endData = await endResponse.json();
      
      if (endData.success) {
        showToast('Финал завершён!', 'success');
        setTimeout(() => {
          window.location.href = `/final-results?results=${encodeURIComponent(JSON.stringify(resultsData.data || []))}`;
        }, 1500);
      } else {
        showToast('Ошибка: ' + endData.message, 'error');
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/final/add-points', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points: pointsToAdd })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Добавлено ${pointsToAdd} баллов!`, 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
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
          minWidth: '280px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '10px', color: '#8b92b0', marginBottom: '4px', borderBottom: '1px solid #2d3348', paddingBottom: '4px' }}>
            🔧 ОТЛАДОЧНЫЕ УТИЛИТЫ
          </div>
          
          <button
            onClick={handleClearDatabase}
            disabled={isClearingDB}
            style={{
              background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              border: '2px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              padding: '8px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: isClearingDB ? 0.7 : 1
            }}
          >
            {isClearingDB ? '🔄 Очистка...' : '💣 ПОЛНОСТЬЮ ОЧИСТИТЬ БД'}
          </button>

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
              opacity: isBecomingFinalist ? 0.7 : 1
            }}
          >
            {isBecomingFinalist ? '🔄 Обработка...' : '👑 СТАТЬ ФИНАЛИСТОМ'}
          </button>

          {/* ========== КНОПКИ ДЛЯ ЛОББИ ФИНАЛА ========== */}
          {isFinalLobby && !isFinalGame && (
            <>
              <div style={{ fontSize: '10px', color: '#a855f7', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #2d3348' }}>
                🎮 ДЕБАГ ЛОББИ
              </div>

              <button
                onClick={handleAddTestTeams}
                disabled={isAddingTestTeams}
                style={{
                  background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                  border: '2px solid #a855f7',
                  borderRadius: '6px',
                  color: '#a855f7',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: isAddingTestTeams ? 0.7 : 1
                }}
              >
                {isAddingTestTeams ? '🔄 Добавление...' : '🤖 ДОБАВИТЬ ТЕСТОВЫЕ КОМАНДЫ'}
              </button>

              <button
                onClick={handleForceGameStart}
                style={{
                  background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                  border: '2px solid #10b981',
                  borderRadius: '6px',
                  color: '#10b981',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🚀 ПРИНУДИТЕЛЬНО НАЧАТЬ ФИНАЛ
              </button>
            </>
          )}

          {/* ========== КНОПКИ ДЛЯ ФИНАЛА ========== */}
          {isFinalGame && (
            <>
              <div style={{ fontSize: '10px', color: '#f0c564', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #2d3348' }}>
                🎮 ДЕБАГ ФИНАЛА
              </div>

              <button
                onClick={handleNextTurn}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                  border: '2px solid #f0c564',
                  borderRadius: '6px',
                  color: '#f0c564',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? '🔄 Обработка...' : '🔄 ПЕРЕДАТЬ ХОД СЛЕДУЮЩЕЙ КОМАНДЕ'}
              </button>

              <button
                onClick={handleForceFinishFinal}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #2d1f3d, #1f1f2d)',
                  border: '2px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? '🔄 Завершение...' : '🏁 ЗАВЕРШИТЬ ФИНАЛ'}
              </button>

              <button
                onClick={handleForceNextQuestion}
                style={{
                  background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  color: '#3b82f6',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ⏭ СЛЕДУЮЩИЙ ВОПРОС
              </button>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  style={{
                    flex: 1,
                    background: '#1a1d2a',
                    border: '1px solid #f0c564',
                    borderRadius: '4px',
                    padding: '6px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                  placeholder="Баллы"
                />
                <button
                  onClick={handleAddPoints}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #1f2d3d, #162230)',
                    border: '2px solid #f0c564',
                    borderRadius: '6px',
                    color: '#f0c564',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💰 ДОБАВИТЬ БАЛЛЫ
                </button>
              </div>
            </>
          )}

          {/* ========== ОБЫЧНЫЕ ФУНКЦИИ (для квалификации) ========== */}
          {!isFinalGame && !isFinalLobby && (
            <>
              {onResetProgress && (
                <button onClick={onResetProgress} style={{
                  background: '#2d1f1f',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}>
                  🔄 Сбросить прогресс викторины
                </button>
              )}

              {onPerfectPass && (
                <button onClick={onPerfectPass} style={{
                  background: '#1f2d3d',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#10b981',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}>
                  ⭐ ПРОЙТИ ТУР ИДЕАЛЬНО
                </button>
              )}
            </>
          )}

          <button
            onClick={() => {
              if (confirm('Очистить localStorage?')) {
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
              cursor: 'pointer'
            }}
          >
            🗑️ ОЧИСТИТЬ LOCALSTORAGE
          </button>

          <div style={{ fontSize: '10px', color: '#5a6380', marginTop: '6px', borderTop: '1px solid #2d3348', paddingTop: '6px' }}>
            ⚠️ Используйте осторожно
          </div>
        </div>
      )}
    </div>
  );
}