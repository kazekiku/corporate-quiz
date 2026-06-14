// pages/Main.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createTeam, joinTeam, getTeam, createFinalLobby, getMyFinalistStatus } from '../api/client';
import Modal from '../components/Modal';
import DebugPanel from '../components/DebugPanel';
import NeonBorder from '../components/NeonBorder';
import LedLight from '../components/LedLight';

export default function Main() {
  const navigate = useNavigate();
  const { user, loading, logout, setUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [selectedMode, setSelectedMode] = useState('qualification');
  const [isFinalist, setIsFinalist] = useState(false);
  const [qualificationCompleted, setQualificationCompleted] = useState(false);
  const [isBecomingFinalist, setIsBecomingFinalist] = useState(false);

  useEffect(() => {
    const loadTeamAndStatus = async () => {
      if (user?.teamId) {
        try {
          const teamRes = await getTeam(user.teamId);
          setTeam(teamRes.data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setTeam(null);
      }
      
      // Проверяем статус финалиста через API
      try {
        const statusRes = await getMyFinalistStatus();
        console.log('👑 Полный ответ от сервера:', statusRes.data);
        console.log('👑 Статус финалиста (raw):', statusRes.data?.data?.isFinalist);
        
        const finalistStatus = statusRes.data?.data?.isFinalist === true;
        setIsFinalist(finalistStatus);
        console.log('👑 Финальный статус:', finalistStatus);
        
        // Обновляем пользователя в состоянии
        if (setUser && user) {
          setUser({ ...user, isFinalist: finalistStatus });
        }
        
        // Сохраняем в localStorage для быстрого доступа
        if (finalistStatus) {
          localStorage.setItem(`player_${user?.id}_finalist`, 'true');
        }
      } catch (err) {
        console.error('Ошибка получения статуса финалиста:', err);
        const finalistStatus = localStorage.getItem(`player_${user?.id}_finalist`) === 'true';
        setIsFinalist(finalistStatus);
      }
      setQualificationCompleted(false);
    };
    
    if (user) {
      loadTeamAndStatus();
    }
  }, [user, setUser]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return setError('Введите название');
    if (teamName.length > 50) return setError('Максимум 50 символов');
    
    try {
      if (selectedMode === 'final') {
        // Проверяем статус финалиста перед созданием лобби финала
        const statusRes = await getMyFinalistStatus();
        if (!statusRes.data?.data?.isFinalist) {
          setError('Тур 2 доступен только финалистам! Сначала пройдите отборочный тур или используйте Debug кнопку.');
          return;
        }
        
        console.log('🏆 Создаём лобби финала...');
        const res = await createFinalLobby();
        console.log('🏆 Ответ сервера:', res.data);
        
        if (!res.data.sessionId) {
          setError('Ошибка: не получен sessionId');
          return;
        }
        
        navigate(`/final-lobby/${res.data.sessionId}`);
      } else {
        const res = await createTeam(teamName, selectedMode);
        const teamId = res.data.data?.teamId;
        if (!teamId) {
          setError(`Ошибка: teamId не получен`);
          return;
        }
        navigate(`/lobby/${teamId}`);
      }
    } catch (err) {
      console.error('Ошибка создания:', err);
      setError(err.response?.data?.message || 'Ошибка создания');
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return setError('Введите код');
    try {
      const res = await joinTeam(joinCode.toUpperCase());
      navigate(`/lobby/${res.data.teamId}`);
    } catch (err) {
      setError('Неверный код отдела');
    }
  };

  const handleForceFinalist = async () => {
    if (!user) {
      alert('❌ Сначала зарегистрируйтесь!');
      return;
    }
    
    setIsBecomingFinalist(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/auth/become-finalist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsFinalist(true);
        if (setUser) {
          setUser({ ...user, isFinalist: true });
        }
        localStorage.setItem(`player_${user.id}_finalist`, 'true');
        alert(`✅ Игрок ${user.fullName} теперь финалист! Теперь вам доступен Тур 2.`);
        window.location.reload();
      } else {
        alert('❌ Ошибка: ' + data.message);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('❌ Ошибка соединения с сервером');
    } finally {
      setIsBecomingFinalist(false);
    }
  };

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

  return (
    <div className="rating-page">
      <div className="rating-card fade-in">
        <div className="rating-header slide-in-left">
          <div className="rating-icon">🏠</div>
          <div>
            <h1>Корпоративные бои</h1>
            <p>Добро пожаловать, {user.fullName}</p>
          </div>
        </div>

        <div className="text-center fade-in-delay-1">
          <div className="avatar" style={{ margin: '0 auto 12px' }}>
            {user.role === 'L' ? '👑' : '👤'}
          </div>
          <div className="team-name" style={{ fontSize: '18px' }}>
            {user.role === 'L' ? 'Капитан команды' : 'Сотрудник'}
          </div>
          
          {/* ОТОБРАЖЕНИЕ СТАТУСА ФИНАЛИСТА */}
          {isFinalist && (
            <div style={{ 
              marginTop: '8px', 
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(240,197,100,0.2), rgba(240,197,100,0.05))',
              border: '1px solid rgba(240,197,100,0.5)',
              borderRadius: '20px',
              padding: '4px 16px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#f0c564'
            }}>
              🏆 ФИНАЛИСТ 🏆
            </div>
          )}
          
          <button onClick={logout} className="btn btn-outline hover-glow" style={{ marginTop: '12px', width: '100%' }}>Выйти</button>
        </div>

        <NeonBorder color="red" className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
          <div className="text-center">
            <div className="logo-badge" style={{ display: 'inline-block', marginBottom: '8px' }}>КРИТИЧЕСКАЯ ЗАДАЧА</div>
            <h2>Пройти оценку квалификации</h2>
            <p className="text-muted">Выживет только один отдел</p>
          </div>
        </NeonBorder>

        {team ? (
          <div className="card text-center scale-in" style={{ marginBottom: '16px' }}>
            <div className="logo-badge" style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', color: '#10b981', marginBottom: '8px' }}>
              АКТИВНЫЙ ОТДЕЛ
            </div>
            <h2 className="text-gradient">{team.name}</h2>
            <p className="text-muted mt-2">
              Код: <span className="font-mono text-primary">{team.joinCode}</span>
            </p>
            <button onClick={() => navigate(`/lobby/${team.id}`)} className="btn btn-primary mt-4 w-full hover-glow">
              Войти в отдел
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 fade-in-delay-2">
            {user.role === 'L' && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary w-full py-3 hover-glow">
                📚 Создать отдел
              </button>
            )}
            <button onClick={() => setShowJoinModal(true)} className="btn btn-outline w-full py-3 hover-glow">
              🔑 Войти в отдел
            </button>
          </div>
        )}

        {/* УВЕДОМЛЕНИЕ ДЛЯ ФИНАЛИСТОВ БЕЗ КОМАНДЫ - ТОЛЬКО ИНФОРМАЦИЯ, БЕЗ КНОПКИ */}
        {!team && isFinalist && (
          <NeonBorder color="green" className="text-center fade-in-delay-3" style={{ marginTop: '20px', padding: '16px' }}>
            <LedLight color="green" blinking={false} label="ФИНАЛИСТЫ" />
            <p className="mt-2 text-sm">Вы прошли отбор! Для участия в финале нажмите "Создать отдел" и выберите Тур 2.</p>
          </NeonBorder>
        )}
      </div>

      {/* Модалка создания отдела */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => { 
          setShowCreateModal(false); 
          setError(''); 
          setTeamName(''); 
          setSelectedMode('qualification'); 
        }} 
        title="Выбор тура"
        className="tour-modal-content"
      >
        <div className="tour-selector-card">
          <div
            className={`tour-block ${selectedMode === 'qualification' ? 'tour-block-active' : ''}`}
            onClick={() => setSelectedMode('qualification')}
          >
            <div className="tour-block-title">
              <div>🟡 ТУР 1 — КЛАССИЧЕСКИЙ</div>
              <div className="tour-badge available">🔥 ДОСТУПЕН</div>
            </div>
            <div className="tour-rules">
              <h4>📜 ПРАВИЛА ПЕРВОГО ТУРА</h4>
              <ul>
                <li>10 вопросов для всей команды</li>
                <li>Каждый вопрос стоит 10 баллов</li>
                <li>Всего 3 попытки на игру</li>
                <li>Ошибка = минус попытка</li>
              </ul>
            </div>
          </div>

          <div
            className={`tour-block ${selectedMode === 'final' ? 'tour-block-active' : ''} ${!isFinalist ? 'tour-block-locked' : ''}`}
            onClick={() => isFinalist && setSelectedMode('final')}
          >
            <div className="tour-block-title">
              <div>⚡ ТУР 2 — ЭКСТРИМ / ФИНАЛ</div>
              <div className={`tour-badge ${isFinalist ? 'available' : 'locked'}`}>
                {isFinalist ? '🔥 ДОСТУПЕН' : '🔒 ЗАБЛОКИРОВАН'}
              </div>
            </div>
            <div className="tour-rules">
              <h4>📜 ПРАВИЛА ВТОРОГО ТУРА</h4>
              <ul>
                <li>30 секунд на вопрос</li>
                <li>20 баллов за правильный ответ</li>
                <li>Только 2 попытки</li>
                <li>Повышенная сложность</li>
                <li>Финальный этап соревнования</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="tour-input-wrapper">
          <input 
            type="text" 
            value={teamName} 
            onChange={e => setTeamName(e.target.value)} 
            className="form-input" 
            placeholder={selectedMode === 'final' ? "Название лобби финала" : "Название команды"} 
          />
        </div>

        {error && <div className="register-error">{error}</div>}

        <button onClick={handleCreateTeam} className="register-btn hover-glow">
          {selectedMode === 'final' ? '🏆 СОЗДАТЬ ЛОББИ ФИНАЛА' : '📚 СОЗДАТЬ ОТДЕЛ'}
        </button>
        
        {selectedMode === 'final' && isFinalist && (
          <p className="text-muted text-center mt-3" style={{ fontSize: '12px' }}>
            ⚡ Вы создаёте лобби для финала. Другие финалисты смогут присоединиться по коду.
          </p>
        )}
      </Modal>

      {/* Модалка входа */}
      <Modal isOpen={showJoinModal} onClose={() => { setShowJoinModal(false); setError(''); setJoinCode(''); }} title="Войти в отдел">
        <input 
          type="text" 
          value={joinCode} 
          onChange={e => setJoinCode(e.target.value.toUpperCase())} 
          className="form-input mb-4 font-mono text-center text-2xl tracking-widest" 
          placeholder="XXXXXX" 
          maxLength={6} 
          autoFocus 
        />
        {error && <div className="error-message mb-3">{error}</div>}
        <button onClick={handleJoinTeam} className="btn btn-primary w-full hover-glow">Присоединиться</button>
      </Modal>

      <DebugPanel 
        teamId={team?.id} 
        onForceFinalist={handleForceFinalist}
      />
    </div>
  );
}