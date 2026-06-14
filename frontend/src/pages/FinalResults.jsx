// pages/FinalResults.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function FinalResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем результаты из location state или из localStorage
    if (location.state?.results) {
      setResults(location.state.results);
      setLoading(false);
    } else {
      // Пытаемся загрузить из localStorage
      const savedResults = localStorage.getItem(`final_results_${sessionId}`);
      if (savedResults) {
        setResults(JSON.parse(savedResults));
      }
      setLoading(false);
    }
  }, [sessionId, location.state]);

  if (loading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">Загрузка результатов...</div>
        </div>
      </div>
    );
  }

  const myTeam = results?.teams?.find(t => t.id === user?.teamId);
  const winner = results?.teams?.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current, results?.teams?.[0]
  );
  const isWinner = myTeam?.id === winner?.id;
  const isSecond = results?.teams?.sort((a, b) => b.score - a.score)[1]?.id === myTeam?.id;
  const isThird = results?.teams?.sort((a, b) => b.score - a.score)[2]?.id === myTeam?.id;

  return (
    <div className="rating-page">
      <div className="rating-card" style={{ maxWidth: '700px', textAlign: 'center' }}>
        {/* Иконка и заголовок */}
        <div className="rating-header" style={{ justifyContent: 'center' }}>
          <div className="rating-icon">
            {isWinner ? '🏆' : isSecond ? '🥈' : isThird ? '🥉' : '📋'}
          </div>
          <div>
            <h1>ФИНАЛ</h1>
            <p>Результаты игры</p>
          </div>
        </div>

        {/* Сообщение о победе/поражении */}
        <div className="card" style={{ 
          marginBottom: '24px',
          background: isWinner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: isWinner ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {isWinner ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆🏆🏆</div>
              <h2 style={{ color: '#10b981', marginBottom: '8px' }}>ПОБЕДА!</h2>
              <p className="text-muted">Ваша команда показала лучший результат в финале!</p>
              <p className="text-muted mt-2">Вы — чемпионы корпоративных боёв!</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💔</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>ПОРАЖЕНИЕ</h2>
              <p className="text-muted">К сожалению, ваша команда не смогла победить в финале.</p>
              <p className="text-muted mt-2">В следующий раз обязательно получится!</p>
            </>
          )}
        </div>

        {/* Итоговая таблица */}
        <h3 style={{ marginBottom: '16px', textAlign: 'left' }}>📊 ИТОГОВАЯ ТАБЛИЦА</h3>
        <div className="rating-table" style={{ marginBottom: '24px' }}>
          <div className="rating-table-head">
            <span>МЕСТО</span>
            <span>КОМАНДА</span>
            <span style={{ textAlign: 'right' }}>БАЛЛЫ</span>
          </div>
          {results?.teams
            ?.sort((a, b) => b.score - a.score)
            .map((team, index) => (
              <div key={team.id} className="rating-row" style={{
                background: team.id === myTeam?.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
              }}>
                <div className="place" style={{ 
                  color: index === 0 ? '#f0c564' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'white'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </div>
                <div className="team-name" style={{ 
                  color: index === 0 ? '#f0c564' : 'white',
                  fontWeight: index === 0 ? 'bold' : 'normal'
                }}>
                  {team.name}
                  {team.id === myTeam?.id && <span style={{ fontSize: '11px', marginLeft: '8px', color: '#4b8cff' }}>(вы)</span>}
                </div>
                <div className="score">{team.score}</div>
              </div>
            ))}
        </div>

        {/* Статистика команды */}
        {myTeam && (
          <div className="card" style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h4 style={{ marginBottom: '12px', color: '#4b8cff' }}>📈 СТАТИСТИКА ВАШЕЙ КОМАНДЫ</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-muted">Итоговый счёт:</span>
              <span className="text-white font-bold">{myTeam.score} баллов</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-muted">Место:</span>
              <span className="text-white font-bold">
                {results?.teams?.sort((a, b) => b.score - a.score).findIndex(t => t.id === myTeam.id) + 1}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Отставание от победителя:</span>
              <span className="text-white font-bold">
                {winner.score - myTeam.score} баллов
              </span>
            </div>
          </div>
        )}

        {/* Кнопки навигации */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/main')} className="btn btn-primary" style={{ flex: 1 }}>
            🏠 На главную
          </button>
          <button onClick={() => navigate('/rating')} className="btn btn-outline" style={{ flex: 1 }}>
            📊 Рейтинг
          </button>
        </div>
      </div>
    </div>
  );
}