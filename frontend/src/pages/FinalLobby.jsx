import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinalLobbyInfo, setFinalTeamReady } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import DebugPanel from '../components/DebugPanel';
import NeonBorder from '../components/NeonBorder';
import LedLight from '../components/LedLight';

export default function FinalLobby() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // <-- ДОБАВЛЯЕМ authLoading
  const [teams, setTeams] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState(null);
  const [error, setError] = useState(null);

  const loadLobby = async () => {
    // Ждём, пока загрузится пользователь
    if (authLoading || !user) {
      console.log('⏳ Ожидаем загрузку пользователя...');
      setLoading(true);
      return;
    }
    
    try {
      const res = await getFinalLobbyInfo();
      console.log('📋 Данные лобби:', res.data);
      
      const data = res.data?.data;
      
      if (!data) {
        console.error('❌ Нет данных от сервера');
        setError('Нет данных от сервера');
        setLoading(false);
        return;
      }
      
      console.log('👥 teams:', data.teams);
      console.log('👤 user:', user);
      
      setTeams(data.teams || []);
      setGameStarted(data.gameStarted || false);
      
      // Находим команду пользователя
      let myTeamData = null;
      
      if (data.teams && user) {
        myTeamData = data.teams.find(t => {
          const participants = t.participants || [];
          return participants.includes(user.id);
        });
        
        console.log('🎯 Найдена команда пользователя:', myTeamData);
      }
      
      setMyTeam(myTeamData);
      
      if (data.gameStarted) {
        navigate('/final');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки лобби:', err);
      setError('Ошибка загрузки лобби: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем лобби только когда пользователь загружен
    if (!authLoading && user) {
      loadLobby();
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Периодическое обновление только если пользователь есть
    if (!user) return;
    
    const interval = setInterval(() => {
      loadLobby();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleSetReady = async () => {
    if (!user) {
      alert('❌ Пожалуйста, войдите в систему');
      return;
    }
    
    try {
      await setFinalTeamReady();
      alert('✅ Вы готовы к финалу!');
      await loadLobby();
    } catch (err) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message));
    }
  };

  // ПОКАЗЫВАЕМ ЗАГРУЗКУ, ПОКА ПОЛЬЗОВАТЕЛЬ НЕ ЗАГРУЗИЛСЯ
  if (authLoading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div className="loading-spinner">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p>Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }

  // ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ — РЕДИРЕКТ НА РЕГИСТРАЦИЮ
  if (!user) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div className="loading-spinner">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p>Загрузка...</p>
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

  // Проверяем, все ли участники готовы
  const allReady = teams.length === 3 && teams.every(t => t.isReady === true);
  const myTeamReady = myTeam?.isReady || false;

  return (
    <div className="rating-page">
      <div className="rating-card fade-in" style={{ maxWidth: '900px' }}>
        
        <div className="rating-header slide-in-left" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="rating-icon" style={{ 
              background: 'linear-gradient(135deg, #f0c564, #d4a017)',
              boxShadow: '0 0 20px rgba(240,197,100,0.5)'
            }}>🏆</div>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Финал</h1>
              <p style={{ margin: 0 }}>Ожидание финалистов</p>
            </div>
          </div>
          <div style={{
            background: allReady ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${allReady ? '#10b981' : '#ef4444'}`,
            padding: '8px 16px',
            borderRadius: '30px'
          }}>
            <LedLight color={allReady ? 'green' : 'red'} blinking={!allReady} />
            <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
              {allReady ? 'ВСЕ ГОТОВЫ' : `КОМАНД: ${teams.length}/3`}
            </span>
          </div>
        </div>

        {/* Карточки команд */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', marginTop: '24px' }}>
          {teams.map((team, index) => {
            const isUserInTeam = team.participants?.includes(user?.id);
            
            return (
              <NeonBorder 
                key={team.id} 
                color={team.isReady ? 'green' : 'blue'} 
                style={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '28px', marginRight: '12px' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </span>
                    <strong style={{ fontSize: '20px' }}>{team.name}</strong>
                    {isUserInTeam && (
                      <span style={{ 
                        marginLeft: '12px',
                        background: 'rgba(59,130,246,0.2)', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '10px',
                        color: '#4b8cff'
                      }}>ВЫ</span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: team.isReady ? '#10b981' : '#ef4444'
                  }}>
                    {team.isReady ? '✓ ГОТОВЫ' : '○ ОЖИДАНИЕ'}
                  </div>
                </div>
              </NeonBorder>
            );
          })}
        </div>

        {/* Пустые слоты */}
        {teams.length === 0 && (
          <div className="card text-center" style={{ padding: '40px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)' }}>
            <p style={{ color: '#f0c564', fontSize: '18px' }}>🏆 Вы первый финалист!</p>
            <p className="text-muted">Ожидаем подключения остальных финалистов...</p>
          </div>
        )}

        {teams.length === 1 && (
          <div className="card text-center" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)' }}>
            <p style={{ color: '#f0c564' }}>Ожидание финалистов... (1/3)</p>
          </div>
        )}

        {teams.length === 2 && (
          <div className="card text-center" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)' }}>
            <p style={{ color: '#f0c564' }}>Ожидание финалистов... (2/3)</p>
          </div>
        )}

        {/* Кнопка готовности */}
        {myTeam && !myTeamReady && (
          <button 
            onClick={handleSetReady} 
            className="btn btn-success w-full"
            style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold' }}
          >
            ✅ Я ГОТОВ
          </button>
        )}

        {myTeam && myTeamReady && (
          <div className="text-center" style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '16px' }}>
            <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 'bold' }}>✓ Вы готовы к финалу</span>
          </div>
        )}

        {!myTeam && teams.length > 0 && (
          <div className="text-center" style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '16px' }}>
            <span style={{ color: '#f59e0b' }}>⏳ Вы не в списке финалистов. Проверьте, что ваш отдел прошёл отбор.</span>
          </div>
        )}

        {teams.length === 3 && allReady && (
          <div className="text-center" style={{ padding: '16px', background: 'rgba(16,185,129,0.2)', borderRadius: '16px' }}>
            <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 'bold' }}>🎮 Все отделы готовы! Финал начнётся автоматически...</span>
          </div>
        )}

        <button onClick={() => navigate('/main')} className="btn btn-outline w-full" style={{ marginTop: '16px' }}>
          ← На главную
        </button>
      </div>

      <DebugPanel isFinalLobby={true} onAddTestTeams={true} />
    </div>
  );
}