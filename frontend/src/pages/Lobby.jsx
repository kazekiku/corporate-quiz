import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeam } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import DebugPanel from '../components/DebugPanel';

// SVG иконка для лобби
const BuildingIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="18" />
    <line x1="15" y1="22" x2="15" y2="18" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
);

export default function Lobby() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);

  const loadTeam = async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await getTeam(teamId);
      const teamData = res.data?.data;
      if (teamData) {
        setTeam(teamData);
      }
    } catch (err) {
      console.error(err);
      showToast('Ошибка загрузки команды', 'error');
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  const handleStartGame = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/qualification/${teamId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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

  if (!team) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Отдел не найден</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-container">
        <div className="lobby-header">
          <div className="lobby-logo">
            <BuildingIcon />
          </div>
          <div>
            <h1>{team.name}</h1>
            <p className="lobby-subtitle">Отборочный тур</p>
          </div>
        </div>

        {countdown !== null && (
          <div className="lobby-countdown">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">Игра начинается...</div>
          </div>
        )}

        <div className="lobby-rules-card">
          <div className="rules-header">
            <div className="rules-icon">📜</div>
            <h3>ПРАВИЛА ОТБОРОЧНОГО ТУРА</h3>
          </div>
          
          <div className="rules-grid">
            <div className="rule-item">
              <div className="rule-icon">❓</div>
              <div className="rule-content">
                <div className="rule-title">25 вопросов</div>
                <div className="rule-desc">Проверьте свои знания</div>
              </div>
            </div>
            
            <div className="rule-item">
              <div className="rule-icon">⭐</div>
              <div className="rule-content">
                <div className="rule-title">10 баллов</div>
                <div className="rule-desc">За каждый правильный ответ</div>
              </div>
            </div>
            
            <div className="rule-item">
              <div className="rule-icon">⏱</div>
              <div className="rule-content">
                <div className="rule-title">30 секунд</div>
                <div className="rule-desc">На один вопрос</div>
              </div>
            </div>
            
            <div className="rule-item">
              <div className="rule-icon">🏆</div>
              <div className="rule-content">
                <div className="rule-title">250 баллов</div>
                <div className="rule-desc">Максимальный результат</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          disabled={countdown !== null}
          className={`lobby-start-btn ${countdown !== null ? 'disabled' : 'ready'}`}
        >
          {countdown !== null ? 'ИГРА НАЧИНАЕТСЯ...' : 'НАЧАТЬ ОТБОР'}
        </button>

        <button onClick={() => navigate('/main')} className="lobby-back-btn">
          ← ВЕРНУТЬСЯ НА ГЛАВНУЮ
        </button>
      </div>

      <DebugPanel teamId={teamId} />
    </div>
  );
}