import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getFinalResults } from '../api/client';

export default function FinalResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (location.state?.results) {
          console.log('📊 Результаты из location.state:', location.state.results);
          setResults(location.state.results);
          setLoading(false);
          return;
        }

        const savedResults = localStorage.getItem('final_results');
        if (savedResults) {
          try {
            const parsed = JSON.parse(savedResults);
            console.log('📊 Результаты из localStorage:', parsed);
            setResults(parsed);
            setLoading(false);
            return;
          } catch (e) {
            console.error('❌ Ошибка парсинга localStorage:', e);
          }
        }

        console.log('📊 Загружаем результаты с сервера...');
        const response = await getFinalResults();
        console.log('📊 Ответ сервера:', response.data);
        
        if (response.data?.data && response.data.data.length > 0) {
          setResults(response.data.data);
          localStorage.setItem('final_results', JSON.stringify(response.data.data));
        } else {
          setError('Нет данных о результатах');
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки результатов:', err);
        setError('Не удалось загрузить результаты');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [location.state]);

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
            <p>Загрузка результатов...</p>
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

  let teamsArray = [];
  
  if (Array.isArray(results)) {
    teamsArray = results;
  } else if (results?.teams && Array.isArray(results.teams)) {
    teamsArray = results.teams;
  } else if (results?.data && Array.isArray(results.data)) {
    teamsArray = results.data;
  }
  
  console.log('📊 teamsArray:', teamsArray);

  if (teamsArray.length === 0) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Нет данных для отображения</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teamsArray].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedTeams[0];
  const myTeam = sortedTeams.find(t => t.id === user?.teamId) || sortedTeams.find(t => t.team_id === user?.teamId);
  const isWinner = myTeam?.id === winner?.id || myTeam?.team_id === winner?.id;
  
  console.log('🏆 Победитель:', winner);
  console.log('👤 Моя команда:', myTeam);
  console.log('🏆 isWinner:', isWinner);

  return (
    <div className="rating-page">
      <div className="rating-card" style={{ maxWidth: '700px', textAlign: 'center' }}>
        
        <div className="rating-header" style={{ justifyContent: 'center' }}>
          <div className="rating-icon" style={{ 
            background: isWinner ? 'linear-gradient(135deg, #f0c564, #d4a017)' : 'linear-gradient(135deg, #4b8cff, #2456d8)',
            boxShadow: isWinner ? '0 0 30px rgba(240,197,100,0.5)' : '0 0 20px rgba(59,130,246,0.3)'
          }}>
            {isWinner ? '🏆' : '📋'}
          </div>
          <div>
            <h1 style={{ color: isWinner ? '#f0c564' : 'white' }}>ФИНАЛ</h1>
            <p style={{ color: isWinner ? '#f0c564' : 'rgba(255,255,255,0.6)' }}>
              {isWinner ? '🏆 ПОБЕДА!' : 'Результаты игры'}
            </p>
          </div>
        </div>

        <div className="card" style={{ 
          marginBottom: '24px',
          background: isWinner ? 'rgba(240,197,100,0.15)' : 'rgba(239,68,68,0.1)',
          border: isWinner ? '2px solid rgba(240,197,100,0.4)' : '2px solid rgba(239,68,68,0.3)',
          padding: '24px'
        }}>
          {isWinner ? (
            <>
              <div style={{ fontSize: '64px', marginBottom: '8px' }}>🏆🏆🏆</div>
              <h2 style={{ color: '#f0c564', fontSize: '28px', marginBottom: '8px' }}>ПОБЕДА!</h2>
              <p className="text-muted">Ваша команда показала лучший результат в финале!</p>
              <p className="text-muted mt-2" style={{ color: '#f0c564', fontWeight: 'bold' }}>
                {winner.score} баллов
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>💪</div>
              <h2 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '8px' }}>ДОСТОЙНОЕ ВЫСТУПЛЕНИЕ</h2>
              <p className="text-muted">К сожалению, ваша команда не смогла победить в финале.</p>
              <p className="text-muted mt-2">В следующий раз обязательно получится!</p>
            </>
          )}
        </div>

        <h3 style={{ marginBottom: '16px', textAlign: 'left' }}>📊 ИТОГОВАЯ ТАБЛИЦА</h3>
        <div className="rating-table" style={{ marginBottom: '24px' }}>
          <div className="rating-table-head" style={{
            gridTemplateColumns: '60px 1fr 100px',
            padding: '12px 16px',
            background: 'rgba(240,197,100,0.1)',
            borderRadius: '12px 12px 0 0',
            borderBottom: '2px solid rgba(240,197,100,0.3)'
          }}>
            <span style={{ textAlign: 'center' }}>МЕСТО</span>
            <span>КОМАНДА</span>
            <span style={{ textAlign: 'right' }}>БАЛЛЫ</span>
          </div>
          
          {sortedTeams.map((team, index) => {
            const isMyTeam = team.id === myTeam?.id || team.team_id === myTeam?.id;
            const isWinnerTeam = index === 0;
            
            return (
              <div 
                key={team.id || team.team_id || index} 
                className="rating-row" 
                style={{
                  gridTemplateColumns: '60px 1fr 100px',
                  padding: '14px 16px',
                  background: isMyTeam ? 'rgba(59,130,246,0.15)' : 'transparent',
                  borderLeft: isMyTeam ? '4px solid #4b8cff' : '4px solid transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="place" style={{ 
                  textAlign: 'center',
                  fontSize: '24px',
                  color: index === 0 ? '#f0c564' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'rgba(255,255,255,0.6)'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </div>
                <div className="team-name" style={{ 
                  color: isWinnerTeam ? '#f0c564' : 'white',
                  fontWeight: isWinnerTeam ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {team.name}
                  {isMyTeam && (
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'rgba(59,130,246,0.2)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: '#4b8cff'
                    }}>ВЫ</span>
                  )}
                  {isWinnerTeam && (
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'rgba(240,197,100,0.2)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: '#f0c564'
                    }}>🏆 ПОБЕДИТЕЛЬ</span>
                  )}
                </div>
                <div className="score" style={{ 
                  textAlign: 'right',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: isWinnerTeam ? '#f0c564' : 'white'
                }}>
                  {team.score || 0}
                </div>
              </div>
            );
          })}
        </div>

        {myTeam && (
          <div className="card" style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h4 style={{ marginBottom: '12px', color: '#4b8cff' }}>📈 СТАТИСТИКА ВАШЕЙ КОМАНДЫ</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-muted">Итоговый счёт:</span>
              <span className="text-white font-bold">{myTeam.score || 0} баллов</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-muted">Место:</span>
              <span className="text-white font-bold">
                #{sortedTeams.findIndex(t => t.id === myTeam.id || t.team_id === myTeam.id) + 1}
              </span>
            </div>
            {!isWinner && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Отставание от победителя:</span>
                <span className="text-white font-bold">
                  {(winner.score || 0) - (myTeam.score || 0)} баллов
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => {
              localStorage.removeItem('final_results');
              navigate('/main');
            }} 
            className="btn btn-primary" 
            style={{ flex: 1 }}
          >
            🏠 На главную
          </button>
          <button 
            onClick={() => navigate('/rating')} 
            className="btn btn-outline" 
            style={{ flex: 1 }}
          >
            📊 Рейтинг
          </button>
        </div>
      </div>
    </div>
  );
}