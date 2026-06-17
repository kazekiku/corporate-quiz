import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { 
  getTeam, 
  getTeamFinalistStatus
} from '../api/client';
import Modal from '../components/Modal';
import DebugPanel from '../components/DebugPanel';

export default function Main() {
  const navigate = useNavigate();
  const { user, loading, logout, setUser } = useAuth();
  const { showToast } = useToast();
  const [team, setTeam] = useState(null);
  const [isFinalist, setIsFinalist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState('qualification');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        if (user.teamId) {
          const teamRes = await getTeam(user.teamId);
          console.log('📋 Загружен отдел:', teamRes.data);
          
          if (teamRes.data?.data) {
            setTeam(teamRes.data.data);
            
            if (teamRes.data.data.is_finalist) {
              setIsFinalist(true);
            }
          }
        }
        
        if (user.teamId) {
          const statusRes = await getTeamFinalistStatus(user.teamId);
          if (statusRes.data?.data?.isFinalist) {
            setIsFinalist(true);
          }
        }
        
      } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        showToast('Ошибка загрузки данных', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const handleStartGame = () => {
    if (!team) {
      setError('Отдел не найден');
      return;
    }
    setShowTourModal(true);
  };

  const handleCreateGame = async () => {
    setError('');
    
    try {
      if (selectedMode === 'final') {
        if (!isFinalist && !team?.is_finalist) {
          showToast('Тур 2 доступен только отделам-финалистам!', 'warning');
          return;
        }
        
        setShowTourModal(false);
        navigate('/final-lobby');
      } else {
        if (isFinalist || team?.is_finalist) {
          showToast('Ваш отдел уже финалист! Участвовать в отборочном туре снова нельзя.', 'warning');
          return;
        }
        setShowTourModal(false);
        navigate(`/lobby/${team.id}`);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      showToast(err.response?.data?.message || 'Ошибка создания игры', 'error');
    }
  };

  if (loading || isLoading) {
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

  if (!user) {
    navigate('/');
    return null;
  }

  if (!team) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>❌ Отдел не найден</p>
            <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
              На регистрацию
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusText = (isFinalist || team.is_finalist) 
    ? 'ФИНАЛИСТЫ 🏆' 
    : (team.qualifying_score > 0 
      ? 'ПРОШЛИ ОТБОР' 
      : 'ГОТОВЫ К ОТБОРУ');
  
  const statusColor = (isFinalist || team.is_finalist) 
    ? '#f0c564' 
    : (team.qualifying_score > 0 
      ? '#10b981' 
      : '#4b8cff');

  return (
    <div className="battle-page">
      <div className="battle-card">
        <div className="battle-header">
          <div className="battle-trophy">🏢</div>
          <h1>КОРПОРАТИВНЫЕ БОИ</h1>
          <p>Оценка квалификации сотрудников</p>
          <div className="battle-badge">IT-квиз | Проверь свои знания</div>
        </div>

        <div className="battle-divider" />

        <div className="battle-content">
          <button onClick={handleStartGame} className="battle-start-btn">
            🚀 ВЫБРАТЬ ТУР
          </button>

          <div className="battle-team-card">
            <div className="battle-status-pill" style={{ color: statusColor }}>
              {statusText}
            </div>
            <h2>{team.name}</h2>
            <p>Ваш отдел</p>

            <div className="battle-stats">
              <div className="battle-stat">
                <strong>{team.qualifying_score || 0}</strong>
                <span>баллов</span>
              </div>
              <div className="battle-stat">
                <strong>{team.members?.length || 1}</strong>
                <span>сотрудников</span>
              </div>
            </div>
          </div>

          <div className="battle-actions">
            <button onClick={() => navigate('/rating')} className="battle-secondary-btn">
              📊 РЕЙТИНГ
            </button>
            <button onClick={logout} className="battle-secondary-btn">
              🚪 ВЫЙТИ
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showTourModal}
        onClose={() => {
          setShowTourModal(false);
          setError('');
          setSelectedMode('qualification');
        }}
        title="ВЫБОР ТУРА"
        className="tour-modal-content"
      >
        <div className="tour-selector-card">
          <div
            className={`tour-block ${selectedMode === 'qualification' ? 'tour-block-active' : ''}`}
            onClick={() => setSelectedMode('qualification')}
          >
            <div className="tour-block-title">
              <div>📚 ТУР 1 — ОТБОРОЧНЫЙ</div>
              <div className="tour-badge available">ДОСТУПЕН</div>
            </div>
            <div className="tour-rules">
              <h4>📜 ПРАВИЛА</h4>
              <ul>
                <li>25 вопросов</li>
                <li>10 баллов за ответ</li>
                <li>30 секунд на вопрос</li>
                <li>Топ-3 в финал</li>
              </ul>
            </div>
          </div>

          <div
            className={`tour-block ${selectedMode === 'final' ? 'tour-block-active' : ''} ${(!isFinalist && !team?.is_finalist) ? 'tour-block-locked' : ''}`}
            onClick={() => (isFinalist || team?.is_finalist) && setSelectedMode('final')}
          >
            <div className="tour-block-title">
              <div>🏆 ТУР 2 — ФИНАЛ</div>
              <div className={`tour-badge ${(isFinalist || team?.is_finalist) ? 'available' : 'locked'}`}>
                {(isFinalist || team?.is_finalist) ? 'ДОСТУПЕН' : 'ЗАБЛОКИРОВАН'}
              </div>
            </div>
            <div className="tour-rules">
              <h4>📜 ПРАВИЛА</h4>
              <ul>
                <li>25 вопросов (5×5)</li>
                <li>100-500 баллов</li>
                <li>Ходы по очереди</li>
                <li>Финальный раунд</li>
              </ul>
            </div>
          </div>
        </div>

        {error && <div className="error-message" style={{ margin: '16px 28px 0' }}>{error}</div>}

        <div style={{ padding: '20px 28px' }}>
          <button onClick={handleCreateGame} className="register-btn" style={{ width: '100%' }}>
            {selectedMode === 'final' ? '🏆 НАЧАТЬ ФИНАЛ' : '📚 НАЧАТЬ ОТБОР'}
          </button>
        </div>
      </Modal>

      <DebugPanel teamId={team?.id} />
    </div>
  );
}