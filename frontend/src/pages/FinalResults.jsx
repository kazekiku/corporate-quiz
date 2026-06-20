// frontend/src/pages/FinalResults.jsx

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFinalResults } from '../api/client';

// SVG иконки
const CrownIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f0c564" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4L5 12L12 3L19 12L22 4L19 20H5L2 4Z" />
    <path d="M5 20H19" strokeWidth="1.5" />
  </svg>
);

const MedalIcon = ({ type }) => {
  const colors = {
    gold: { fill: '#f0c564', bg: 'rgba(240,197,100,0.15)' },
    silver: { fill: '#c0c0c0', bg: 'rgba(192,192,192,0.15)' },
    bronze: { fill: '#cd7f32', bg: 'rgba(205,127,50,0.15)' }
  };
  const style = colors[type] || colors.gold;
  
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={style.fill} strokeWidth="2">
      <circle cx="12" cy="12" r="10" fill={style.bg} />
      <text x="12" y="16" textAnchor="middle" fill={style.fill} fontSize="12" fontWeight="bold">
        {type === 'gold' ? '1' : type === 'silver' ? '2' : type === 'bronze' ? '3' : ''}
      </text>
    </svg>
  );
};

export default function FinalResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (location.state?.results) {
          setResults(location.state.results);
          setLoading(false);
          return;
        }

        const savedResults = localStorage.getItem('final_results');
        if (savedResults) {
          setResults(JSON.parse(savedResults));
          setLoading(false);
          return;
        }

        const response = await getFinalResults();
        if (response.data?.data?.length) {
          setResults(response.data.data);
          localStorage.setItem('final_results', JSON.stringify(response.data.data));
        } else {
          setError('Нет данных о результатах');
        }
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить результаты');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [location.state]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 40%), linear-gradient(180deg, #061225, #071a35)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(20, 35, 65, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <div className="loading-spinner">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
          <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)' }}>Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 40%), linear-gradient(180deg, #061225, #071a35)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(20, 35, 65, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <button 
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/main')}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  let teams = [];
  if (Array.isArray(results)) {
    teams = results;
  } else if (results?.teams) {
    teams = results.teams;
  } else if (results?.data) {
    teams = results.data;
  }

  if (!teams.length) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 40%), linear-gradient(180deg, #061225, #071a35)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(20, 35, 65, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#fff' }}>Нет данных для отображения</h2>
          <button 
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/main')}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedTeams[0];

  // ============================================================
  // ИСПРАВЛЕННАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ КОМАНДЫ ПОЛЬЗОВАТЕЛЯ
  // ============================================================
  let myTeam = null;
  
  if (user && user.id) {
    // Сначала проверяем через participants
    for (const team of sortedTeams) {
      let participants = team.participants;
      if (typeof participants === 'string') {
        participants = participants.split(',').map(Number);
      }
      if (Array.isArray(participants) && participants.includes(user.id)) {
        myTeam = team;
        break;
      }
    }
    
    // Если не нашли через participants, проверяем через teamId
    if (!myTeam) {
      for (const team of sortedTeams) {
        if (team.id === user.teamId || team.team_id === user.teamId) {
          myTeam = team;
          break;
        }
      }
    }
  }

  console.log('👤 Моя команда:', myTeam);
  console.log('👤 user.id:', user?.id);
  console.log('👤 user.teamId:', user?.teamId);

  const getMedal = (index) => {
    if (index === 0) return <MedalIcon type="gold" />;
    if (index === 1) return <MedalIcon type="silver" />;
    if (index === 2) return <MedalIcon type="bronze" />;
    return <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', minWidth: '28px', textAlign: 'center' }}>#{index + 1}</span>;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 40%), linear-gradient(180deg, #061225, #071a35)',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        margin: 'auto'
      }}>
        <div style={{
          width: '100%',
          background: 'rgba(20, 35, 65, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '30px 32px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            textAlign: 'center',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '24px'
          }}>
            <h1 style={{
              fontSize: '26px',
              fontWeight: '700',
              color: '#f0c564',
              margin: 0,
              letterSpacing: '1px'
            }}>🏆 ИТОГИ ФИНАЛА</h1>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.4)',
              margin: '4px 0 0'
            }}>Битва умов завершена!</p>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '24px 20px 18px',
            background: 'rgba(240, 197, 100, 0.06)',
            border: '1px solid rgba(240, 197, 100, 0.2)',
            borderRadius: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '4px' }}><CrownIcon /></div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#f0c564'
            }}>{winner.name}</div>
            <div style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '6px 20px',
              borderRadius: '20px',
              background: 'rgba(75, 140, 255, 0.12)',
              fontSize: '18px',
              fontWeight: '600',
              color: '#f0c564'
            }}>{winner.score || 0} баллов</div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.35)',
              fontStyle: 'italic',
              marginTop: '10px'
            }}>«Интеллект и команда — вот формула победы!»</div>
          </div>

          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr 84px',
              padding: '10px 16px',
              background: 'rgba(240, 197, 100, 0.08)',
              borderBottom: '1px solid rgba(240, 197, 100, 0.15)',
              fontSize: '12px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <span>МЕСТО</span>
              <span>КОМАНДА</span>
              <span style={{ textAlign: 'right' }}>БАЛЛЫ</span>
            </div>
            
            {sortedTeams.map((team, index) => {
              const isMyTeam = team.id === myTeam?.id || team.team_id === myTeam?.team_id;
              const isWinnerTeam = index === 0;

              return (
                <div 
                  key={team.id || team.team_id || index} 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr 84px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: index < sortedTeams.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                    transition: 'background 0.2s',
                    minHeight: '48px',
                    background: isMyTeam ? 'rgba(75, 140, 255, 0.08)' : (isWinnerTeam ? 'rgba(240, 197, 100, 0.06)' : 'transparent'),
                    borderLeft: isMyTeam ? '3px solid #4b8cff' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>{getMedal(index)}</div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: isWinnerTeam ? '600' : '500',
                    color: isWinnerTeam ? '#f0c564' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {team.name}
                    {isMyTeam && (
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: 'rgba(75, 140, 255, 0.2)',
                        color: '#4b8cff'
                      }}>ВАША КОМАНДА</span>
                    )}
                    {isWinnerTeam && (
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: 'rgba(240, 197, 100, 0.2)',
                        color: '#f0c564'
                      }}>ПОБЕДИТЕЛЬ</span>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: isWinnerTeam ? '20px' : '18px',
                    fontWeight: '600',
                    color: '#f0c564'
                  }}>{team.score || 0}</div>
                </div>
              );
            })}
          </div>

          <button 
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.06)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.03)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onClick={() => navigate('/main')}
          >
            НА ГЛАВНУЮ
          </button>
        </div>
      </div>
    </div>
  );
}