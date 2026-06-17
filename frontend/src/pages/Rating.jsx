import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRating } from '../api/client';
import NeonBorder from '../components/NeonBorder';

// SVG иконка для рейтинга
const RatingIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default function Rating() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRating = async () => {
      try {
        console.log('📊 Загрузка рейтинга...');
        const res = await getRating();
        console.log('📊 Ответ сервера:', res.data);
        
        const ratingData = res.data?.data || res.data;
        setTeams(Array.isArray(ratingData) ? ratingData : []);
        setError(null);
      } catch (err) {
        console.error('❌ Ошибка загрузки рейтинга:', err);
        setError('Не удалось загрузить рейтинг');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    loadRating();
  }, []);

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
            <p>Загрузка рейтинга...</p>
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

  return (
    <div className="rating-page">
      <div className="rating-card fade-in">
        <div className="rating-header slide-in-left">
          <div className="rating-icon">
            <RatingIcon />
          </div>
          <div>
            <h1>Рейтинг отделов</h1>
            <p>Только лучшие проходят в финал</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="card text-center" style={{ padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', color: '#f0c564' }}>🏆</div>
            <h3>Пока нет завершивших оценку отделов</h3>
            <p className="text-muted">Станьте первыми, кто пройдёт отборочный тур!</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        ) : (
          <>
            <div className="rating-table">
              <div className="rating-table-head">
                <span>МЕСТО</span>
                <span>ОТДЕЛ</span>
                <span style={{ textAlign: 'right' }}>БАЛЛЫ</span>
              </div>
              {teams.map((team, index) => (
                <div 
                  key={team.id} 
                  className="rating-row slide-in-left" 
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="place" style={{ 
                    color: index === 0 ? '#f0c564' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'white'
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </div>
                  <div className={`team-name ${index < 3 ? 'winner' : ''}`}>
                    {team.name}
                    {team.is_finalist === 1 && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        background: 'rgba(240,197,100,0.2)', 
                        borderRadius: '12px',
                        color: '#f0c564'
                      }}>Финалист</span>
                    )}
                  </div>
                  <div className="score">{team.score || 0}</div>
                </div>
              ))}
            </div>

            <div className="text-center" style={{ marginTop: '24px' }}>
              <NeonBorder color="yellow" style={{ display: 'inline-block', padding: '8px 24px' }}>
                Топ-3 отдела проходят в финал!
              </NeonBorder>
            </div>
          </>
        )}

        <button onClick={() => navigate('/main')} className="rating-home-btn pulse-gentle">
          На главную
        </button>
      </div>
    </div>
  );
}