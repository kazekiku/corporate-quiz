import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getTeam, getTeamFinalistStatus } from '../api/client';
import Modal from '../components/Modal';
import DebugPanel from '../components/DebugPanel';

const TrophyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f0c564" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#f0c564" stroke="#f0c564" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

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
  const [teamDeleted, setTeamDeleted] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Если есть teamId, пробуем загрузить команду
        if (user.teamId) {
          try {
            const teamRes = await getTeam(user.teamId);
            console.log('📋 Загружен отдел:', teamRes.data);
            
            if (teamRes.data?.data) {
              setTeam(teamRes.data.data);
              setTeamDeleted(false);
              
              if (teamRes.data.data.is_finalist) {
                setIsFinalist(true);
              }
            } else {
              // Команда не найдена → удаляем данные
              console.warn('⚠️ Команда не найдена, очищаем данные');
              setTeamDeleted(true);
              setTeam(null);
              // Очищаем localStorage
              localStorage.removeItem('teamId');
              localStorage.removeItem('teamName');
              // Обновляем пользователя в localStorage
              const userData = { ...user, teamId: null, teamName: null };
              localStorage.setItem('user', JSON.stringify(userData));
              if (setUser) setUser(userData);
              
              showToast('Ваш отдел был удалён администратором. Пожалуйста, зарегистрируйтесь заново.', 'warning');
              // Перенаправляем на регистрацию через 3 секунды
              setTimeout(() => {
                navigate('/');
              }, 3000);
              return;
            }
          } catch (err) {
            if (err.response?.status === 404) {
              // Команда не найдена
              console.warn('⚠️ Команда не найдена (404)');
              setTeamDeleted(true);
              setTeam(null);
              localStorage.removeItem('teamId');
              localStorage.removeItem('teamName');
              const userData = { ...user, teamId: null, teamName: null };
              localStorage.setItem('user', JSON.stringify(userData));
              if (setUser) setUser(userData);
              
              showToast('Ваш отдел был удалён. Перенаправление на регистрацию...', 'warning');
              setTimeout(() => {
                navigate('/');
              }, 3000);
              return;
            }
            throw err;
          }
        }
        
        // Проверяем статус финалиста (если есть teamId)
        if (user.teamId) {
          try {
            const statusRes = await getTeamFinalistStatus(user.teamId);
            if (statusRes.data?.data?.isFinalist) {
              setIsFinalist(true);
            }
          } catch (err) {
            console.warn('⚠️ Ошибка получения статуса финалиста:', err);
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

  // Если команда удалена — показываем сообщение
  if (teamDeleted) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center" style={{ padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2>Отдел удалён</h2>
            <p className="text-muted" style={{ marginTop: '8px' }}>
              Ваш отдел был удалён администратором.
              <br />
              Перенаправление на страницу регистрации...
            </p>
            <div className="loading-spinner" style={{ marginTop: '24px' }}>
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <button 
              onClick={() => {
                localStorage.clear();
                navigate('/');
              }} 
              className="btn btn-primary mt-4"
            >
              Перейти на регистрацию сейчас
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <button onClick={() => {
              localStorage.clear();
              navigate('/');
            }} className="btn btn-primary mt-4">
              На регистрацию
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusText = (isFinalist || team.is_finalist) 
    ? 'ФИНАЛИСТЫ' 
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
          <div className="battle-trophy">
            <TrophyIcon />
          </div>
          <h1>КОРПОРАТИВНЫЕ БОИ</h1>
          <p>Оценка квалификации сотрудников</p>
          <div className="battle-badge">IT-квиз | Проверь свои знания</div>
        </div>

        <div className="battle-divider" />

        <div className="battle-content">
          <div className="battle-main">
            <button onClick={handleStartGame} className="battle-start-btn">
              ВОЙТИ В ИГРУ <span className="arrow">→</span> К ВЫБОРУ ТУРОВ
            </button>

            <div className="team-status-card">
              <div className="battle-status-pill" style={{ color: statusColor }}>
                {statusText}
                {(isFinalist || team.is_finalist) && <StarIcon />}
              </div>
              <div className="team-name">{team.name}</div>
            </div>

            <div className="battle-hint">
              Нажми «Войти», чтобы попасть на арену. Первый тур уже ждёт!
              <br />
              После победы в первом туре откроется финал.
            </div>

            <div className="battle-actions">
              <button onClick={() => navigate('/rating')} className="battle-secondary-btn">
                Рейтинг
              </button>
              <button onClick={logout} className="battle-secondary-btn">
                Выйти
              </button>
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')} 
                  className="battle-secondary-btn"
                  style={{ borderColor: '#f0c564', color: '#f0c564' }}
                >
                  ⚙️ АДМИН-ПАНЕЛЬ
                </button>
              )}
            </div>
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
              <h4>ПРАВИЛА</h4>
              <ul>
                <li>5 вопросов</li>
                <li>10 баллов за ответ</li>
                <li>10 минут на вопрос</li>
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
              <h4>ПРАВИЛА</h4>
              <ul>
                <li>5 вопросов (5×5)</li>
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
            {selectedMode === 'final' ? 'НАЧАТЬ ФИНАЛ' : 'НАЧАТЬ ОТБОР'}
          </button>
        </div>
      </Modal>

      <DebugPanel teamId={team?.id} />
    </div>
  );
}