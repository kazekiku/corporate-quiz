// frontend/src/pages/QualificationResults.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { completeQualification, getTeamFinalistStatus, updateTeamScore, getTeam } from '../api/client';

const TrophyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default function QualificationResults() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFinalist, setIsFinalist] = useState(false);
  const [isAlreadyFinalist, setIsAlreadyFinalist] = useState(false);
  const [autoCompleted, setAutoCompleted] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      try {
        console.log('📊 Location state:', location.state);
        
        // Если есть данные из location.state
        if (location.state?.teamScore !== undefined) {
          setResults(location.state);
          // Обновляем счёт в БД
          await updateTeamScore(teamId, location.state.teamScore);
          
          // Если пришёл isFinalist из state
          if (location.state.isFinalist) {
            setIsFinalist(true);
          }
        } else {
          // Пытаемся загрузить из localStorage
          const savedResults = localStorage.getItem(`team_${teamId}`);
          if (savedResults) {
            const data = JSON.parse(savedResults);
            setResults({ 
              teamScore: data.score, 
              timeSpent: data.timeSpent, 
              position: data.position || 1 
            });
          }
        }
        
        // Проверяем статус финалиста в БД
        try {
          const teamRes = await getTeam(teamId);
          if (teamRes.data?.data) {
            if (teamRes.data.data.is_finalist) {
              setIsAlreadyFinalist(true);
              setIsFinalist(true);
            }
            // Если есть qualifying_score, используем его
            if (teamRes.data.data.qualifyingScore > 0 && !results) {
              setResults(prev => ({
                ...prev,
                teamScore: teamRes.data.data.qualifyingScore
              }));
            }
          }
        } catch (err) {
          console.error('Ошибка загрузки команды:', err);
        }
        
        const statusRes = await getTeamFinalistStatus(teamId);
        if (statusRes.data?.data?.isFinalist) {
          setIsAlreadyFinalist(true);
          setIsFinalist(true);
        }
        
      } catch (err) {
        console.error(err);
        showToast('Ошибка загрузки результатов', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadResults();
  }, [teamId, location.state]);

  useEffect(() => {
    const autoComplete = async () => {
      if (isAlreadyFinalist || autoCompleted) return;
      
      const myPosition = results?.position || 999;
      const isInTop3 = myPosition <= 3;
      
      if (isInTop3 && results?.teamScore > 0) {
        console.log('🏁 Автоматическое завершение квалификации для команды:', teamId);
        setAutoCompleted(true);
        
        try {
          const response = await completeQualification(teamId);
          console.log('🏁 Ответ сервера:', response.data);
          
          const finalistStatus = response.data.isFinalist;
          setIsFinalist(finalistStatus);
          
          if (finalistStatus) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const userData = JSON.parse(userStr);
              userData.isFinalist = true;
              localStorage.setItem('user', JSON.stringify(userData));
              if (setUser) {
                setUser(userData);
              }
            }
            
            localStorage.setItem(`team_${teamId}_finalist`, 'true');
          }
        } catch (err) {
          console.error('❌ Ошибка при автоматическом завершении квалификации:', err);
          showToast('Ошибка завершения квалификации', 'error');
        }
      }
    };
    
    if (results && !loading && !isAlreadyFinalist) {
      autoComplete();
    }
  }, [results, loading, isAlreadyFinalist, teamId, setUser]);

  const handleGoToMain = () => {
    localStorage.removeItem('teamId');
    localStorage.removeItem('teamName');
    localStorage.removeItem('joinCode');
    localStorage.removeItem('gameMode');
    localStorage.removeItem(`qualification_progress_${teamId}`);
    localStorage.removeItem(`team_${teamId}`);
    localStorage.removeItem(`team_name_${teamId}`);
    
    navigate('/main');
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
            <p>Загрузка результатов...</p>
          </div>
        </div>
      </div>
    );
  }

  const myPosition = results?.position || 1;
  const isInTop3 = myPosition <= 3;
  const isFinalistTeam = isFinalist || isAlreadyFinalist;

  return (
    <div className="rating-page">
      <div className="rating-card fade-in">
        <div className="rating-header slide-in-left">
          <div className="rating-icon" style={{ color: isFinalistTeam ? '#10b981' : '#4b8cff' }}>
            <TrophyIcon />
          </div>
          <div>
            <h1>Результаты отбора</h1>
            <p>Ваш отдел завершил отборочный тур</p>
          </div>
        </div>

        <div className={`card text-center scale-in ${isFinalistTeam ? 'correct' : ''}`} style={{ 
          marginBottom: '24px',
          background: isFinalistTeam ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: isFinalistTeam ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
        }}>
          {isFinalistTeam ? (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px', color: '#10b981' }}>🏆</div>
              <h2 style={{ color: '#10b981', marginBottom: '8px' }}>ПОЗДРАВЛЯЕМ!</h2>
              <p className="text-muted">Ваш отдел прошёл в финал!</p>
              <p className="text-muted mt-2">Место: <strong>{myPosition}</strong> из всех участников</p>
            </>
          ) : isInTop3 ? (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px', color: '#f0c564' }}>🏆</div>
              <h2 style={{ color: '#f0c564', marginBottom: '8px' }}>ВЫ В ТОП-3!</h2>
              <p className="text-muted">Ваш отдел прошёл в финал!</p>
              <p className="text-muted mt-2">Место: <strong>{myPosition}</strong> из всех участников</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px', color: '#ef4444' }}>💔</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>К сожалению...</h2>
              <p className="text-muted">Ваш отдел не прошёл в финал.</p>
              <p className="text-muted mt-2">Место: <strong>{myPosition}</strong> из всех участников</p>
            </>
          )}
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Статистика отдела</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted">Набрано баллов:</span>
            <span className="text-white font-bold">{results?.teamScore || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted">Затрачено времени:</span>
            <span className="text-white font-bold">
              {Math.floor((results?.timeSpent || 0) / 60)} мин {(results?.timeSpent || 0) % 60} сек
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Статус:</span>
            <span className={isFinalistTeam ? 'text-success' : 'text-danger'}>
              {isFinalistTeam ? '✓ Проход в финал' : '✗ Выбывание'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {isFinalistTeam && (
            <div className="text-center" style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '16px' }}>
              <span style={{ color: '#10b981' }}>✅ Ваш отдел прошёл в финал! Статус финалиста присвоен автоматически.</span>
            </div>
          )}

          {!isFinalistTeam && !isInTop3 && (
            <div className="text-center" style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '16px' }}>
              <span style={{ color: '#ef4444' }}>❌ К сожалению, ваш отдел не прошёл в финал.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={handleGoToMain} className="btn btn-primary" style={{ flex: 1 }}>
              НА ГЛАВНУЮ
            </button>
            <button onClick={() => navigate('/rating')} className="btn btn-outline" style={{ flex: 1 }}>
              РЕЙТИНГ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}