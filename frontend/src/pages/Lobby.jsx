// frontend/src/pages/Lobby.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeam } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import DebugPanel from '../components/DebugPanel';
import { createGameSession, setGameReady, getSessionStatus } from '../api/client';

export default function Lobby() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [totalTeams, setTotalTeams] = useState(0);
  const [readyTeams, setReadyTeams] = useState(0);

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

  const createSession = async () => {
    setIsCreating(true);
    try {
      const res = await createGameSession('qualification');
      console.log('📊 Ответ создания сессии:', res.data);
      
      setSessionId(res.data.sessionId);
      
      const statusRes = await getSessionStatus(res.data.sessionId);
      console.log('📊 Статус сессии после создания:', statusRes.data);
      
      const data = statusRes.data.data;
      setSession(data.session);
      setIsReady(data.isReady);
      setAllReady(data.allReady);
      setTotalTeams(data.totalTeams || 0);
      setReadyTeams(data.readyTeams || 0);
      
      // Если сессия уже активна - переходим в игру
      if (data.session.status === 'active') {
        navigate(`/qualification/${teamId}`);
        return;
      }
      
      showToast('Вы вошли в лобби! Нажмите "Приготовиться"', 'info');
    } catch (err) {
      console.error('❌ Ошибка создания сессии:', err);
      showToast('Ошибка создания сессии', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetReady = async () => {
    if (!sessionId) return;
    
    try {
      const res = await setGameReady(sessionId);
      console.log('📊 Ответ готовности:', res.data);
      
      setIsReady(true);
      setAllReady(res.data.allReady);
      setTotalTeams(res.data.total || 0);
      setReadyTeams(res.data.ready || 0);
      
      if (res.data.allReady) {
        showToast('Все команды готовы! Ожидайте старта от администратора.', 'success');
      } else {
        showToast(`Вы готовы! Ожидаем остальные команды (${res.data.ready}/${res.data.total})`, 'info');
      }
    } catch (err) {
      console.error('❌ Ошибка установки готовности:', err);
      showToast('Ошибка установки готовности', 'error');
    }
  };

  const checkStatus = async () => {
    if (!sessionId) return;
    
    try {
      const res = await getSessionStatus(sessionId);
      console.log('📊 Проверка статуса:', res.data);
      
      const data = res.data.data;
      setSession(data.session);
      setIsReady(data.isReady);
      setAllReady(data.allReady);
      setTotalTeams(data.totalTeams || 0);
      setReadyTeams(data.readyTeams || 0);
      
      if (data.session.status === 'active') {
        navigate(`/qualification/${teamId}`);
      }
    } catch (err) {
      console.error('❌ Ошибка проверки статуса:', err);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  useEffect(() => {
    if (!sessionId) return;
    
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Логируем состояние для отладки
  useEffect(() => {
    console.log('📊 Состояние лобби:', { totalTeams, readyTeams, allReady, isReady, sessionId });
  }, [totalTeams, readyTeams, allReady, isReady, sessionId]);

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

  // Ещё нет сессии — кнопка "Войти в лобби"
  if (!sessionId) {
    return (
      <div className="lobby-page">
        <div className="lobby-container">
          <div className="lobby-header">
            <div className="lobby-logo">🏢</div>
            <div>
              <h1>{team.name}</h1>
              <p className="lobby-subtitle">Отборочный тур</p>
            </div>
          </div>

          <div className="lobby-rules-card">
            <div className="rules-header">
              <div className="rules-icon">📜</div>
              <h3>ПРАВИЛА ОТБОРОЧНОГО ТУРА</h3>
            </div>
            
            <div className="rules-grid">
              <div className="rule-item">
                <div className="rule-icon">❓</div>
                <div className="rule-content">
                  <div className="rule-title">4 вопроса</div>
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
                  <div className="rule-title">60 минут</div>
                  <div className="rule-desc">На весь тур</div>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-icon">🏆</div>
                <div className="rule-content">
                  <div className="rule-title">40 баллов</div>
                  <div className="rule-desc">Максимальный результат</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={createSession}
            disabled={isCreating}
            className="lobby-start-btn ready"
          >
            {isCreating ? 'Загрузка...' : '🚪 ВОЙТИ В ЛОББИ'}
          </button>

          <button onClick={() => navigate('/main')} className="lobby-back-btn">
            ← ВЕРНУТЬСЯ НА ГЛАВНУЮ
          </button>
        </div>

        <DebugPanel teamId={teamId} />
      </div>
    );
  }

  // В лобби — кнопка "Приготовиться"
  return (
    <div className="lobby-page">
      <div className="lobby-container">
        <div className="lobby-header">
          <div className="lobby-logo">🏢</div>
          <div>
            <h1>{team.name}</h1>
            <p className="lobby-subtitle">
              {isReady ? 'Вы готовы!' : 'Подготовка к игре'}
            </p>
          </div>
        </div>

        <div className="lobby-rules-card">
          <div className="rules-header">
            <div className="rules-icon">⏳</div>
            <h3>
              {isReady 
                ? 'Ожидание остальных участников...' 
                : 'Нажмите "Приготовиться"'}
            </h3>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '48px',
            padding: '24px 0'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f0c564' }}>
                {totalTeams || 0}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Всего команд
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981' }}>
                {readyTeams || 0}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Готовы
              </div>
            </div>
          </div>
          
          <div style={{ 
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              width: `${totalTeams > 0 ? (readyTeams / totalTeams) * 100 : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4b8cff, #10b981)',
              transition: 'width 0.5s ease'
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            {isReady ? (
              <div style={{ 
                color: '#10b981', 
                fontSize: '18px', 
                fontWeight: 'bold',
                padding: '16px',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '12px'
              }}>
                ✅ Вы готовы! Ожидаем остальных...
              </div>
            ) : (
              <button
                onClick={handleSetReady}
                className="btn btn-success"
                style={{ 
                  padding: '16px 48px', 
                  fontSize: '20px',
                  fontWeight: 'bold',
                  borderRadius: '40px',
                  boxShadow: '0 10px 30px rgba(16,185,129,0.3)'
                }}
              >
                ⚔️ ПРИГОТОВИТЬСЯ
              </button>
            )}
            
            {allReady && !isReady && (
              <div style={{ marginTop: '16px', color: '#f0c564', fontSize: '16px' }}>
                🎮 Все команды готовы! Администратор скоро начнёт игру.
              </div>
            )}
            
            {allReady && isReady && (
              <div style={{ marginTop: '16px', color: '#f0c564', fontSize: '18px', fontWeight: 'bold' }}>
                🎮 Все команды готовы! Ожидайте начала игры...
              </div>
            )}
          </div>
        </div>

        <button onClick={() => navigate('/main')} className="lobby-back-btn">
          ← ВЕРНУТЬСЯ НА ГЛАВНУЮ
        </button>
      </div>

      <DebugPanel teamId={teamId} />
    </div>
  );
}