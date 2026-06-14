// pages/FinalLobby.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFinalLobby, setFinalTeamReady, startFinalGame } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import DebugPanel from '../components/DebugPanel';
import NeonBorder from '../components/NeonBorder';
import LedLight from '../components/LedLight';
import Modal from '../components/Modal';

export default function FinalLobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createError, setCreateError] = useState('');

  const loadLobby = async () => {
    try {
      const res = await getFinalLobby(sessionId);
      console.log('📋 Final lobby data:', res.data);
      setLobby(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить лобби финала');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLobby();
    const interval = setInterval(loadLobby, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return setCreateError('Введите название команды');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/final/team/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, teamName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowCreateTeamModal(false);
        setTeamName('');
        await loadLobby();
        alert(`✅ Команда "${teamName}" создана! Код для вступления: ${data.data.code}`);
      } else {
        setCreateError(data.message);
      }
    } catch (err) {
      setCreateError('Ошибка создания команды');
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return setCreateError('Введите код команды');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/final/team/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, code: joinCode.toUpperCase() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowJoinTeamModal(false);
        setJoinCode('');
        await loadLobby();
        alert('✅ Вы вступили в команду!');
      } else {
        setCreateError(data.message);
      }
    } catch (err) {
      setCreateError('Ошибка вступления');
    }
  };

  const handleSetReady = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/final/ready`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      await loadLobby();
      alert('✅ Вы подтвердили готовность!');
    } catch (err) {
      setError('Ошибка при подтверждении готовности');
    }
  };

  const handleForceStartFinal = async () => {
    if (!confirm('⚠️ Принудительный старт финала. Продолжить?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/final/force-start/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate(`/final/${sessionId}`);
    } catch (err) {
      console.error('Ошибка принудительного старта:', err);
      alert('Не удалось принудительно начать финал');
    }
  };

  useEffect(() => {
    const teams = lobby?.data?.teams || [];
    if (lobby && !lobby.data?.gameStarted && teams.length >= 2) {
      const allReady = teams.every(t => t.allReady === true);
      if (allReady) {
        console.log('🎮 Все команды готовы, запускаем финал...');
        startFinalGame(sessionId);
        navigate(`/final/${sessionId}`);
      }
    }
  }, [lobby, sessionId, navigate]);

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
            <p>Загрузка лобби финала...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p className="text-danger">{error}</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  if (lobby?.data?.gameStarted) {
    navigate(`/final/${sessionId}`);
    return null;
  }

  const teams = lobby?.data?.teams || [];
  const myTeam = teams.find(team => 
    team.members?.some(m => m.user_id === user?.id)
  );
  const isMyTeamReady = myTeam?.members?.find(m => m.user_id === user?.id)?.is_ready || false;
  const allTeamsReady = teams.length >= 2 && teams.every(t => t.allReady === true);
  const canStart = lobby?.data?.created_by === user?.id && allTeamsReady;

  return (
    <div className="rating-page">
      <div className="rating-card fade-in" style={{ maxWidth: '900px' }}>
        {/* Шапка */}
        <div className="rating-header slide-in-left" style={{ justifyContent: 'space-between', width: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="rating-icon" style={{ 
              background: 'linear-gradient(135deg, #f0c564, #d4a017)',
              boxShadow: '0 0 20px rgba(240,197,100,0.5)'
            }}>🏆</div>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Финал</h1>
              <p style={{ margin: 0 }}>
                Код лобби: <span className="font-mono text-primary" style={{ 
                  background: 'rgba(59,130,246,0.2)', 
                  padding: '4px 12px', 
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  letterSpacing: '2px'
                }}>{sessionId}</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={`stat-pill ${allTeamsReady ? 'bg-green' : 'bg-red'}`} style={{
              background: allTeamsReady ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              border: `1px solid ${allTeamsReady ? '#10b981' : '#ef4444'}`,
              padding: '8px 16px',
              borderRadius: '30px'
            }}>
              <LedLight color={allTeamsReady ? 'green' : 'red'} blinking={!allTeamsReady} />
              <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                {allTeamsReady ? 'ВСЕ ГОТОВЫ' : 'ОЖИДАНИЕ'}
              </span>
            </div>
          </div>
        </div>

        {/* Карточки команд */}
        {teams.length === 0 && (
          <div className="card text-center" style={{ padding: '60px 20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h3>Пока нет команд</h3>
            <p className="text-muted">Создайте первую команду, чтобы начать финал!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
          {teams.map((team, index) => {
            const readyCount = team.members?.filter(m => m.is_ready === true).length || 0;
            const totalCount = team.members?.length || 0;
            const isMyTeam = team.members?.some(m => m.user_id === user?.id);
            const progressPercent = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;
            
            return (
              <NeonBorder 
                key={team.id} 
                color={team.allReady ? 'green' : 'blue'} 
                className="team-card"
                style={{ 
                  padding: '20px',
                  animationDelay: `${index * 0.1}s`,
                  background: isMyTeam ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '24px' }}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                      <h3 style={{ margin: 0, fontSize: '20px' }}>{team.name}</h3>
                      {isMyTeam && (
                        <span style={{ 
                          background: 'rgba(59,130,246,0.2)', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '10px',
                          color: '#4b8cff'
                        }}>ВАША КОМАНДА</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8b92b0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🔑 Код: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f0c564' }}>{team.code}</span></span>
                      <span>👑 Капитан: {team.members?.find(m => m.user_id === team.captain_id)?.user_name || '—'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold', 
                      color: team.allReady ? '#10b981' : '#ef4444',
                      textShadow: team.allReady ? '0 0 10px rgba(16,185,129,0.5)' : 'none'
                    }}>
                      {team.allReady ? '✓' : '○'}
                    </div>
                    <div style={{ fontSize: '12px', color: team.allReady ? '#10b981' : '#ef4444' }}>
                      {team.allReady ? 'ГОТОВЫ' : 'ОЖИДАНИЕ'}
                    </div>
                  </div>
                </div>

                {/* Прогресс-бар готовности */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Готовность команды</span>
                    <span style={{ color: '#f0c564' }}>{readyCount}/{totalCount} участников</span>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    height: '8px', 
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${progressPercent}%`, 
                      height: '100%', 
                      background: team.allReady ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #f0c564)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Участники */}
                <div>
                  <div style={{ fontSize: '12px', color: '#8b92b0', marginBottom: '12px' }}>
                    👥 УЧАСТНИКИ
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {team.members?.map(member => (
                      <div 
                        key={member.user_id} 
                        className="slide-in-left"
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 14px',
                          background: member.is_ready ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                          borderRadius: '30px',
                          fontSize: '14px',
                          border: `1px solid ${member.is_ready ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{member.user_id === team.captain_id ? '👑' : '👤'}</span>
                        <span style={{ fontWeight: member.user_id === user?.id ? 'bold' : 'normal' }}>
                          {member.user_name}
                          {member.user_id === user?.id && <span style={{ fontSize: '10px', marginLeft: '4px', color: '#4b8cff' }}>(вы)</span>}
                        </span>
                        {member.is_ready && (
                          <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {(!team.members || team.members.length === 0) && (
                    <div style={{ color: '#8b92b0', fontSize: '13px', fontStyle: 'italic' }}>
                      Нет участников. Поделитесь кодом команды с другими!
                    </div>
                  )}
                </div>
              </NeonBorder>
            );
          })}
        </div>

        {/* Панель действий */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)' }}>
          {!myTeam && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowCreateTeamModal(true)} 
                className="btn btn-primary hover-glow"
                style={{ flex: 1, padding: '14px', fontSize: '16px' }}
              >
                📚 СОЗДАТЬ КОМАНДУ
              </button>
              <button 
                onClick={() => setShowJoinTeamModal(true)} 
                className="btn btn-outline hover-glow"
                style={{ flex: 1, padding: '14px', fontSize: '16px' }}
              >
                🔑 ВСТУПИТЬ В КОМАНДУ
              </button>
            </div>
          )}

          {myTeam && !isMyTeamReady && (
            <button 
              onClick={handleSetReady} 
              className="btn btn-success w-full hover-glow"
              style={{ padding: '14px', fontSize: '16px' }}
            >
              ✅ Я ГОТОВ
            </button>
          )}

          {myTeam && isMyTeamReady && (
            <div className="text-center" style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px' }}>
              <span style={{ color: '#10b981' }}>✓ Вы подтвердили готовность. Ожидаем остальных участников вашей команды.</span>
            </div>
          )}

          {!myTeam && teams.length > 0 && (
            <div className="text-center" style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px' }}>
              <span style={{ color: '#f59e0b' }}>ℹ️ Чтобы участвовать в финале, создайте или вступите в команду.</span>
            </div>
          )}
        </div>

        {/* Информация для создателя лобби */}
        {lobby?.data?.created_by === user?.id && teams.length < 2 && teams.length > 0 && (
          <div className="card text-center" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <p style={{ margin: 0 }}>
              ⏳ Ожидание минимум 2-х команд. Сейчас: <strong>{teams.length}/2</strong>
            </p>
            <p style={{ fontSize: '12px', marginTop: '8px', color: '#8b92b0' }}>
              Поделитесь кодом лобби <strong>{sessionId}</strong> с другими финалистами
            </p>
          </div>
        )}

        {/* Старт финала */}
        {canStart && (
          <button 
            onClick={() => {
              if (confirm('Все команды готовы. Начать финал?')) {
                startFinalGame(sessionId);
                navigate(`/final/${sessionId}`);
              }
            }}
            className="btn btn-primary w-full hover-glow"
            style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              padding: '16px', 
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}
          >
            🚀 НАЧАТЬ ФИНАЛ
          </button>
        )}

        <button 
          onClick={() => navigate('/main')} 
          className="btn btn-outline w-full"
          style={{ padding: '12px' }}
        >
          ← Вернуться на главную
        </button>
      </div>

      {/* Модалка создания команды */}
      <Modal isOpen={showCreateTeamModal} onClose={() => { setShowCreateTeamModal(false); setCreateError(''); setTeamName(''); }} title="Создать команду">
        <input 
          type="text" 
          value={teamName} 
          onChange={e => setTeamName(e.target.value)} 
          className="form-input mb-4" 
          placeholder="Название команды" 
          autoFocus 
        />
        {createError && <div className="error-message mb-3">{createError}</div>}
        <button onClick={handleCreateTeam} className="btn btn-primary w-full">Создать команду</button>
      </Modal>

      {/* Модалка вступления */}
      <Modal isOpen={showJoinTeamModal} onClose={() => { setShowJoinTeamModal(false); setCreateError(''); setJoinCode(''); }} title="Вступить в команду">
        <input 
          type="text" 
          value={joinCode} 
          onChange={e => setJoinCode(e.target.value.toUpperCase())} 
          className="form-input mb-4 font-mono text-center text-2xl tracking-widest" 
          placeholder="XXXXXX" 
          maxLength={6} 
          autoFocus 
        />
        {createError && <div className="error-message mb-3">{createError}</div>}
        <button onClick={handleJoinTeam} className="btn btn-primary w-full">Вступить</button>
      </Modal>

      <DebugPanel 
  sessionId={sessionId}
  teamId={sessionId} 
  onForceStartFinal={handleForceStartFinal}
  onAddTestTeams={true}
  isFinalLobby={true}
/>
    </div>
  );
}