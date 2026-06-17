import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFinalResults } from '../api/client';

// SVG иконки
const CrownIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f0c564" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={style.fill} strokeWidth="2">
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
          localStorage.setItem(
            'final_results',
            JSON.stringify(response.data.data)
          );
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
      <div className="rating-page">
        <div className="rating-card text-center">
          <h2>Загрузка результатов...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rating-page">
        <div className="rating-card text-center">
          <p>{error}</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/main')}>
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
      <div className="rating-page">
        <div className="rating-card text-center">
          <h2>Нет данных для отображения</h2>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teams].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  const winner = sortedTeams[0];

  const myTeam =
    sortedTeams.find(
      t =>
        t.id === user?.teamId ||
        t.team_id === user?.teamId
    ) || null;

  const getMedal = (index) => {
    if (index === 0) return <MedalIcon type="gold" />;
    if (index === 1) return <MedalIcon type="silver" />;
    if (index === 2) return <MedalIcon type="bronze" />;
    return <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>#{index + 1}</span>;
  };

  return (
    <div className="final-page">
      <div className="final-card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#f0c564', fontSize: '42px', fontWeight: 800 }}>ИТОГИ ФИНАЛА</h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '18px' }}>
            Итоги турнира — битва умов завершена!
          </p>
          <div style={{
            marginTop: '12px',
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: '999px',
            background: 'rgba(75,140,255,.15)',
            color: '#f0c564'
          }}>
            Абсолютный чемпион определён
          </div>
        </div>

        <div style={{
          padding: '60px 24px',
          marginBottom: '40px',
          textAlign: 'center',
          borderRadius: '36px',
          border: '2px solid rgba(240,197,100,.3)',
          background: 'linear-gradient(180deg, rgba(20,35,65,.95), rgba(10,20,50,.95))',
          boxShadow: '0 0 50px rgba(240,197,100,.12)'
        }}>
          <div style={{ marginBottom: '18px' }}>
            <CrownIcon />
          </div>
          <div style={{ color: '#f0c564', fontSize: '48px', fontWeight: 800 }}>{winner.name}</div>
          <div style={{
            display: 'inline-block',
            marginTop: '18px',
            padding: '10px 26px',
            borderRadius: '999px',
            background: 'rgba(75,140,255,.15)',
            fontSize: '24px',
            fontWeight: 700,
            color: '#f0c564'
          }}>
            {winner.score || 0} баллов
          </div>
          <p style={{ marginTop: '20px', color: 'rgba(255,255,255,.55)', fontStyle: 'italic' }}>
            «Интеллект и команда — вот формула победы!»
          </p>
        </div>

        <div style={{
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,.03)'
        }}>
          <div style={{
            padding: '20px 24px',
            fontSize: '28px',
            fontWeight: 700,
            color: '#fff',
            borderBottom: '2px solid rgba(75,140,255,.3)'
          }}>
            ФИНАЛИСТЫ
          </div>

          {sortedTeams.map((team, index) => {
            const isMyTeam = team.id === myTeam?.id || team.team_id === myTeam?.team_id;
            const isWinnerTeam = index === 0;

            return (
              <div
                key={team.id || team.team_id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 120px',
                  alignItems: 'center',
                  minHeight: '80px',
                  padding: '0 24px',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  background: isMyTeam ? 'rgba(75,140,255,.12)' : 'transparent',
                  transition: 'background .2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getMedal(index)}
                </div>

                <div style={{
                  fontSize: '20px',
                  fontWeight: isWinnerTeam ? 700 : 600,
                  color: isWinnerTeam ? '#f0c564' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {team.name}
                  {isMyTeam && (
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'rgba(75,140,255,.2)',
                      color: '#4b8cff'
                    }}>
                      ВАША КОМАНДА
                    </span>
                  )}
                  {isWinnerTeam && (
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'rgba(240,197,100,.2)',
                      color: '#f0c564'
                    }}>
                      ПОБЕДИТЕЛЬ
                    </span>
                  )}
                </div>

                <div style={{
                  textAlign: 'right',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#f0c564'
                }}>
                  {team.score || 0}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="rating-home-btn"
          style={{ marginTop: '32px' }}
          onClick={() => {
            localStorage.removeItem('final_results');
            navigate('/main');
          }}
        >
          ВЕРНУТЬСЯ НА ГЛАВНУЮ
        </button>
      </div>
    </div>
  );
}