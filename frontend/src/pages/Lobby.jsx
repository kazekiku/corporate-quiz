// pages/Lobby.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeam, setReady, addBotToTeam } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import DebugPanel from '../components/DebugPanel';
import LedLight from '../components/LedLight';
import NeonBorder from '../components/NeonBorder';

export default function Lobby() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const loadTeam = async () => {
    if (!teamId) {
      console.log('❌ Нет teamId, пропускаем загрузку');
      setLoading(false);
      return;
    }
    
    try {
      const res = await getTeam(teamId);
      console.log('📋 Полный ответ от getTeam:', res);
      console.log('📋 Данные команды (res.data):', res.data);
      console.log('📋 Данные команды (res.data.data):', res.data?.data);
      
      // Данные находятся в res.data.data
      const teamData = res.data?.data;
      if (teamData) {
        setTeam(teamData);
      } else {
        console.error('❌ Нет данных команды в ответе');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки команды:', err);
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      loadTeam();
      const interval = setInterval(loadTeam, 3000);
      return () => clearInterval(interval);
    }
  }, [teamId]);

  const isCaptain = user?.role === 'L' || (team && Number(user?.id) === Number(team.captainId));
  const myMember = team?.members?.find(m => m.fullName === user?.fullName && m.fullName !== 'Свободный слот');
  const isReady = myMember?.isReady || false;
  const activeMembers = team?.members?.filter(m => m.fullName !== 'Свободный слот') || [];
  const allReady = activeMembers.length > 0 && activeMembers.every(m => m.isReady === true);
  const canStart = isCaptain && allReady && activeMembers.length >= 2;

  const handleSetReady = async () => {
    try {
      await setReady(teamId, !isReady);
      loadTeam();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBot = async () => {
    try {
      await addBotToTeam(teamId);
      loadTeam();
      alert('🤖 Бот добавлен в команду');
    } catch (err) {
      console.error(err);
      alert('Ошибка при добавлении бота');
    }
  };

  const handleStartGame = () => {
    if (!canStart) return;
    setIsStarting(true);
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const gameMode = localStorage.getItem('gameMode') || 'qualification';
          navigate(`/${gameMode === 'final' ? 'final' : 'qualification'}/${teamId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForceAllReady = async () => {
    if (!activeMembers || activeMembers.length === 0) {
      alert('Нет активных участников');
      return;
    }
    for (const member of activeMembers) {
      if (!member.isReady && member.fullName !== 'Свободный слот') {
        await setReady(teamId, true);
      }
    }
    setTimeout(() => loadTeam(), 500);
    alert('✅ Все участники принудительно готовы');
  };

  const handleResetGame = () => {
    if (confirm('Сбросить весь прогресс команды? Это действие нельзя отменить.')) {
      localStorage.removeItem(`qualification_progress_${teamId}`);
      localStorage.removeItem(`team_${teamId}`);
      alert('Прогресс сброшен');
      loadTeam();
    }
  };

  if (loading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
            </div>
            <p>Загрузка лобби...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Команда не найдена</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-container fade-in">
        {/* Шапка */}
        <div className="lobby-header slide-in-left">
          <div className="lobby-logo">🏢</div>
          <div>
            <h1>{team.name}</h1>
            <p className="lobby-subtitle">Код отдела: <span className="lobby-code">{team.joinCode}</span></p>
          </div>
          <div className="lobby-mode-badge">
            {localStorage.getItem('gameMode') === 'final' ? '🏆 ФИНАЛ' : '📚 ОТБОР'}
          </div>
          <LedLight color={allReady ? 'green' : 'red'} blinking={!allReady} label={allReady ? 'ВСЕ ГОТОВЫ' : 'ОЖИДАНИЕ'} />
        </div>

        {/* Обратный отсчёт */}
        {countdown !== null && (
          <NeonBorder color="yellow" className="lobby-countdown scale-in">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">Игра начинается...</div>
          </NeonBorder>
        )}

        {/* Карточка команды */}
        <div className="lobby-team-card scale-in">
          <div className="team-card-header">
            <h3>👥 СОСТАВ ОТДЕЛА</h3>
            <span className="team-members-count">{activeMembers.length}/5</span>
          </div>

          <div className="team-members-list">
            {team.members?.map((member, idx) => {
              const isActive = member.fullName !== 'Свободный слот';
              const isCurrentUser = member.fullName === user?.fullName && isActive;
              const isCaptainUser = member.id === team.captainId;
              
              return (
                <NeonBorder 
                  key={idx} 
                  color={isCurrentUser ? 'blue' : 'blue'} 
                  className={`team-member ${isActive ? 'active' : 'empty'} ${isCurrentUser ? 'current-user' : ''} slide-in-left`}
                  style={{ borderWidth: isCurrentUser ? '2px' : '1px', animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="member-avatar">
                    {isCaptainUser ? '👑' : (isActive ? '👤' : '🔘')}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.fullName}
                      {isCaptainUser && <span className="member-role-captain">капитан</span>}
                      {isCurrentUser && !isCaptainUser && <span className="member-role-you">вы</span>}
                    </div>
                    {isActive && (
                      <div className={`member-status ${member.isReady ? 'ready' : 'not-ready'}`}>
                        {member.isReady ? '✓ Готов' : '○ Ожидает'}
                      </div>
                    )}
                  </div>
                  {isCurrentUser && !member.isReady && (
                    <button onClick={handleSetReady} className="member-ready-btn pulse-gentle">
                      Готов
                    </button>
                  )}
                  {isCurrentUser && member.isReady && (
                    <div className="member-ready-badge">✓</div>
                  )}
                </NeonBorder>
              );
            })}
          </div>
        </div>

        {/* Условия начала игры */}
        <div className="lobby-info-card fade-in-delay-2">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <div className="info-title">Условия начала игры</div>
            <div className="info-list">
              <div className={`info-item ${activeMembers.length >= 2 ? 'met' : 'unmet'}`}>
                <span>{activeMembers.length >= 2 ? '✓' : '○'}</span>
                Минимум 2 участника в команде
                {activeMembers.length >= 2 && <LedLight color="green" blinking={false} />}
              </div>
              <div className={`info-item ${allReady ? 'met' : 'unmet'}`}>
                <span>{allReady ? '✓' : '○'}</span>
                Все участники должны подтвердить готовность
                {allReady && <LedLight color="green" blinking={false} />}
              </div>
              <div className={`info-item ${isCaptain ? 'met' : 'unmet'}`}>
                <span>{isCaptain ? '✓' : '○'}</span>
                Только капитан может начать игру
                {isCaptain && <LedLight color="green" blinking={false} />}
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка старта */}
        {isCaptain && (
          <button
            onClick={handleStartGame}
            disabled={!canStart || isStarting || countdown !== null}
            className={`lobby-start-btn ${canStart ? 'ready' : 'disabled'} fade-in-delay-3`}
          >
            {countdown !== null ? 'ИГРА НАЧИНАЕТСЯ...' : isStarting ? 'ЗАПУСК...' : '🚀 НАЧАТЬ ИГРУ'}
          </button>
        )}

        {!isCaptain && allReady && activeMembers.length >= 2 && (
          <div className="lobby-waiting fade-in-delay-3">
            ⏳ Капитан скоро начнёт игру...
          </div>
        )}

        <button onClick={() => navigate('/main')} className="lobby-back-btn fade-in-delay-4">
          ← Вернуться на главную
        </button>
      </div>

      <DebugPanel 
        teamId={teamId}
        onForceAllReady={handleForceAllReady}
        onResetGame={handleResetGame}
        onAddBot={handleAddBot}
      />
    </div>
  );
}