// frontend/src/pages/Final.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinalBoard, pickQuestion, submitFinalAnswer, nextTurn, getFinalResults } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import LedLight from '../components/LedLight';
import DebugPanel from '../components/DebugPanel';

// SVG иконка для логотипа
const TrophyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f0c564" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

// Функция форматирования времени MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function Final() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [board, setBoard] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(360);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [questionLocked, setQuestionLocked] = useState(false);
  const [allTeamsAnswered, setAllTeamsAnswered] = useState(false);
  const [timeEnded, setTimeEnded] = useState(false);

  const loadBoard = async () => {
    if (authLoading || !user) {
      console.log('⏳ Ожидаем загрузку пользователя...');
      setLoading(true);
      return;
    }

    try {
      const res = await getFinalBoard();
      console.log('🎮 ПОЛНЫЙ ОТВЕТ:', res.data);
      
      const data = res.data?.data;
      setBoard(data);
      setAllTeamsAnswered(data?.allTeamsAnswered || false);
      setTimeEnded(data?.timeEnded || false);
      
      if (data?.gameFinished) {
        console.log('🏁 ИГРА ЗАВЕРШЕНА! Переходим на страницу результатов...');
        
        try {
          const resultsRes = await getFinalResults();
          console.log('📊 Финальные результаты:', resultsRes.data);
          
          navigate('/final-results', { 
            state: { 
              results: resultsRes.data.data,
              teams: data.teams
            } 
          });
        } catch (err) {
          console.error('❌ Ошибка получения результатов:', err);
          navigate('/main');
        }
        return;
      }
      
      if (data?.teams && user) {
        console.log('👥 Все команды:', data.teams);
        console.log('👤 Мой user.id:', user.id);
        
        let foundTeamId = null;
        
        for (const team of data.teams) {
          let participants = team.participants;
          if (typeof participants === 'string') {
            participants = participants.split(',').map(Number);
          }
          if (!Array.isArray(participants)) {
            participants = [];
          }
          
          console.log(`🔍 Команда "${team.name}" (ID: ${team.id}) участники:`, participants);
          
          if (participants.includes(user.id)) {
            foundTeamId = team.id;
            console.log(`✅ НАШЁЛ! Моя команда: ${team.name} (ID: ${team.id})`);
            break;
          }
        }
        
        setMyTeamId(foundTeamId);
        
        if (!foundTeamId) {
          console.error('❌ Команда не найдена для пользователя:', user.id);
        }
      }
      
      if (data?.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        const passed = data.currentQuestion.timePassed || 0;
        setTimeLeft(Math.max(0, 360 - passed));
        setHasAnswered(!!data.userAnswers?.[user?.id]);
        setShowResults(false);
        setResults(null);
      } else {
        setCurrentQuestion(null);
        setHasAnswered(false);
      }
      
      if (data?.showResults && data?.results) {
        console.log('📊 ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ:', data.results);
        setShowResults(true);
        setResults(data.results);
      }
      
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      showToast('Ошибка загрузки', 'error');
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    try {
      const res = await nextTurn();
      console.log('🔄 Ответ /next-turn:', res.data);
      
      if (res.data?.gameFinished) {
        console.log('🏁 Игра завершена! (из /next-turn)');
        navigate('/final-results', { 
          state: { 
            results: res.data.results,
            teams: board?.teams || []
          } 
        });
        return;
      }
      
      setShowResults(false);
      setResults(null);
      setAnswerInput('');
      setHasAnswered(false);
      setCurrentQuestion(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
      showToast('Ошибка при переходе хода', 'error');
    }
  };

  const handlePickQuestion = async (categoryId, value) => {
    if (questionLocked) {
      showToast('Вопрос уже выбран, подождите...', 'warning');
      return;
    }
    if (!isMyTurn) {
      showToast('Сейчас не ваш ход выбирать вопрос!', 'warning');
      return;
    }
    if (currentQuestion) {
      showToast('Сначала завершите текущий вопрос', 'warning');
      return;
    }
    
    setQuestionLocked(true);
    
    try {
      const res = await pickQuestion(categoryId, value);
      console.log('❓ Выбран вопрос:', res.data);
      
      const questionData = res.data?.data;
      
      if (!questionData?.id) {
        showToast('Ошибка при выборе вопроса', 'error');
        setQuestionLocked(false);
        return;
      }
      
      setCurrentQuestion(questionData);
      setTimeLeft(360);
      setAnswerInput('');
      setHasAnswered(false);
      setShowResults(false);
      setResults(null);
      setQuestionLocked(false);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Не удалось выбрать вопрос', 'error');
      setQuestionLocked(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim()) {
      showToast('Введите ответ', 'warning');
      return;
    }
    if (hasAnswered) {
      showToast('Вы уже ответили на этот вопрос', 'warning');
      return;
    }
    if (timeLeft <= 0) {
      showToast('Время вышло!', 'error');
      return;
    }
    if (!currentQuestion) {
      showToast('Нет активного вопроса', 'error');
      return;
    }
    
    try {
      const res = await submitFinalAnswer(currentQuestion.id, answerInput);
      console.log('📝 Ответ отправлен:', res.data);
      setHasAnswered(true);
      showToast('Ваш ответ принят!', 'success');
      
      setTimeout(() => {
        loadBoard();
      }, 500);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Не удалось отправить ответ', 'error');
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadBoard();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      loadBoard();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!currentQuestion || hasAnswered || showResults) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeEnded(true);
          setTimeout(() => loadBoard(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentQuestion, hasAnswered, showResults]);

  const teams = board?.teams || [];
  const categories = board?.categories || [];
  const isMyTurn = board?.currentTurnTeamId === myTeamId;
  
  console.log('🎮 myTeamId:', myTeamId);
  console.log('🎮 currentTurnTeamId:', board?.currentTurnTeamId);
  console.log('🎮 isMyTurn:', isMyTurn);

  if (authLoading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div className="loading-spinner">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p>Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

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
            <p>Загрузка финала...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Ошибка загрузки</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  if (teams.length < 3) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header">
              <div className="final-logo"><TrophyIcon /></div>
              <h1>Своя игра</h1>
              <p>Финал</p>
            </div>
            <div className="card" style={{ marginTop: '40px', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3>Ожидание начала финала</h3>
              <p className="text-muted">Не все команды готовы... ({teams.length}/3)</p>
              <button onClick={() => navigate('/main')} className="btn btn-outline mt-4">На главную</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ПОКАЗ РЕЗУЛЬТАТОВ
  // ============================================================
  
  if (showResults && results) {
    const leader = results.teams?.[0];
    const isMyTeamWinner = leader?.team_id === myTeamId;
    const hasCorrectAnswer = results.hasCorrectAnswer || results.teams?.some(r => r.is_correct);
    const nextTeamInfo = results.nextTurnTeamId 
      ? teams.find(t => t.id === results.nextTurnTeamId)
      : null;
    const turnReason = results.turnReason || '';
    const gameFinished = results.gameFinished || false;
    
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            
            <div className="final-header" style={{ textAlign: 'center', borderBottom: '2px solid rgba(240,197,100,0.3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <h1 style={{ color: '#f0c564', fontSize: '32px' }}>Результаты раунда</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                {results.question?.category} • {results.question?.value} баллов
              </p>
            </div>

            <div className="card" style={{ 
              marginTop: '24px', 
              marginBottom: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(240,197,100,0.2)',
              textAlign: 'center',
              padding: '24px'
            }}>
              <p style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>
                {results.question?.text}
              </p>
              {/* ← ДОБАВЛЯЕМ ПРАВИЛЬНЫЙ ОТВЕТ */}
              {results.correctAnswer && (
                <p style={{ 
                  marginTop: '12px', 
                  fontSize: '16px', 
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  ✅ Правильный ответ: {results.correctAnswer}
                </p>
              )}
            </div>

            <div className="rating-table" style={{ marginBottom: '24px' }}>
              <div className="rating-table-head" style={{
                gridTemplateColumns: '50px 1fr 1fr 80px 100px',
                padding: '12px 16px',
                background: 'rgba(240,197,100,0.1)',
                borderRadius: '12px 12px 0 0',
                borderBottom: '2px solid rgba(240,197,100,0.3)'
              }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>КОМАНДА</span>
                <span>ОТВЕТ</span>
                <span style={{ textAlign: 'center' }}>⏱</span>
                <span style={{ textAlign: 'right' }}>БАЛЛЫ</span>
              </div>
              
              {results.teams?.map((team, index) => {
                const isMyTeam = team.team_id === myTeamId;
                const isLeader = index === 0;
                const isCorrect = team.is_correct;
                const isNextTurn = results.nextTurnTeamId === team.team_id;
                
                let statusColor = '#ef4444';
                let statusIcon = '❌';
                let statusText = 'Неправильно';
                
                if (isCorrect) {
                  statusColor = '#10b981';
                  statusIcon = '✅';
                  statusText = 'Верно!';
                } else if (team.answer === '—') {
                  statusColor = '#6b7280';
                  statusIcon = '⏰';
                  statusText = 'Не ответили';
                }
                
                return (
                  <div 
                    key={team.team_id || index} 
                    className="rating-row" 
                    style={{
                      gridTemplateColumns: '50px 1fr 1fr 80px 100px',
                      padding: '14px 16px',
                      background: isMyTeam ? 'rgba(59,130,246,0.15)' : 'transparent',
                      borderLeft: isMyTeam ? '4px solid #4b8cff' : '4px solid transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.3s ease',
                      animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div style={{ 
                      textAlign: 'center', 
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: isLeader ? '#f0c564' : 'rgba(255,255,255,0.6)'
                    }}>
                      #{index + 1}
                    </div>
                    
                    <div style={{ 
                      fontWeight: isMyTeam ? '700' : '500',
                      color: isLeader ? '#f0c564' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {team.team_name}
                      {isMyTeam && (
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'rgba(59,130,246,0.2)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          color: '#4b8cff'
                        }}>ВЫ</span>
                      )}
                      {isNextTurn && isCorrect && (
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'rgba(16,185,129,0.2)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          color: '#10b981'
                        }}>▶ ПРОДОЛЖАЕТ</span>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: isCorrect ? '#10b981' : '#ef4444'
                    }}>
                      <span>{statusIcon}</span>
                      <span style={{ fontSize: '14px' }}>{team.answer || '—'}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: statusColor,
                        background: `${statusColor}20`,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {statusText}
                      </span>
                    </div>
                    
                    <div style={{ 
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px'
                    }}>
                      {Math.floor(team.timeSpent || 0)}с
                    </div>
                    
                    <div style={{ 
                      textAlign: 'right',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: team.points > 0 ? '#10b981' : '#6b7280'
                    }}>
                      {team.points > 0 ? `+${team.points}` : '0'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card text-center" style={{ 
              marginBottom: '24px',
              background: hasCorrectAnswer 
                ? 'rgba(16,185,129,0.1)' 
                : 'rgba(245,158,11,0.1)',
              border: `2px solid ${hasCorrectAnswer ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
              padding: '16px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {hasCorrectAnswer ? '✅' : '🔄'}
              </div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                {turnReason || (hasCorrectAnswer 
                  ? `Правильно ответила команда "${leader?.team_name}" и продолжает!` 
                  : 'Никто не ответил правильно → ход остаётся у текущей команды')}
              </p>
              {nextTeamInfo && (
                <p style={{ color: '#f0c564', fontSize: '14px', marginTop: '4px' }}>
                  Следующий ход: {nextTeamInfo.name}
                </p>
              )}
            </div>

            <div className="text-center">
              <button 
                onClick={handleNextTurn} 
                className="btn btn-primary"
                style={{ 
                  padding: '14px 40px', 
                  fontSize: '18px',
                  fontWeight: 'bold',
                  borderRadius: '40px'
                }}
              >
                {hasCorrectAnswer ? 'Продолжить →' : 'Следующий ход →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ОЖИДАНИЕ ОТВЕТОВ
  // ============================================================
  
  if ((allTeamsAnswered || timeEnded) && currentQuestion && !showResults) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header">
              <div className="final-logo" style={{ fontSize: '48px' }}>
                {allTeamsAnswered ? '✅' : '⏰'}
              </div>
              <h1 style={{ color: allTeamsAnswered ? '#10b981' : '#f59e0b' }}>
                {allTeamsAnswered ? 'Все команды ответили!' : 'Время вышло!'}
              </h1>
              <p className="text-muted">Подсчитываем результаты...</p>
            </div>
            <div className="card" style={{ marginTop: '24px', padding: '40px' }}>
              <div className="loading-spinner" style={{ marginTop: '16px' }}>
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
              <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.5)' }}>
                {allTeamsAnswered ? 'Анализ ответов...' : 'Ожидание результатов...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ОСНОВНАЯ ИГРА
  // ============================================================
  
  return (
    <div className="final-page">
      <div className="final-container">
        <div className="final-card fade-in">
          <div className="final-header">
            <div className="final-logo"><TrophyIcon /></div>
            <h1>Своя игра</h1>
            <p>Финал</p>
          </div>

          <div className="final-stats">
            {teams.map(team => {
              let participants = team.participants;
              if (typeof participants === 'string') {
                participants = participants.split(',').map(Number);
              }
              if (!Array.isArray(participants)) {
                participants = [];
              }
              
              const isMyTeam = participants.includes(user?.id);
              
              return (
                <div 
                  key={team.id} 
                  className={`final-stat-pill ${board?.currentTurnTeamId === team.id ? 'active-turn' : ''}`}
                >
                  <span>{team.name}</span>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0c564' }}>{team.score || 0}</span>
                  {isMyTeam && <span style={{ fontSize: '12px', color: '#4b8cff' }}>★</span>}
                  {board?.currentTurnTeamId === team.id && <LedLight color="yellow" blinking={true} />}
                </div>
              );
            })}
          </div>

          {!currentQuestion && categories.length > 0 && (
            <>
              <div className="final-board">
                <table className="final-table">
                  <thead>
                    <tr>
                      {categories.map(cat => (
                        <th key={cat.id}>{cat.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[100, 200, 300, 400, 500].map(value => (
                      <tr key={value}>
                        {categories.map(cat => {
                          const q = cat.questions?.find(q => q.value === value);
                          const isAvailable = q && !q.isUsed;
                          return (
                            <td key={cat.id}>
                              {isAvailable ? (
                                <button
                                  onClick={() => handlePickQuestion(cat.id, value)}
                                  disabled={!isMyTurn || questionLocked}
                                  className="final-question-btn"
                                >
                                  {value}
                                </button>
                              ) : (
                                <span className="final-question-used">✓</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`final-turn-message ${isMyTurn ? 'your-turn' : 'other-turn'}`}>
                {isMyTurn ? (
                  'ВАШ ХОД! Выберите вопрос'
                ) : (
                  `⏳ Сейчас ход команды "${teams.find(t => t.id === board?.currentTurnTeamId)?.name || '...'}"`
                )}
              </div>
            </>
          )}

          {currentQuestion && !showResults && (
            <div className="final-question-card">
              <div className="final-question-header">
                <span className="final-question-category">{currentQuestion.category}</span>
                <span className="final-question-value">{currentQuestion.value} баллов</span>
                <span className={`final-question-timer ${timeLeft < 60 ? 'danger' : ''}`}>
                  ⏱ {formatTime(timeLeft)}
                </span>
              </div>
              <div className="final-question-text">
                {currentQuestion.text}
              </div>
              
              <div className="final-answer-area">
                <input
                  type="text"
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  className="final-answer-input"
                  placeholder="Введите ответ..."
                  onKeyPress={e => e.key === 'Enter' && handleSubmitAnswer()}
                  autoFocus
                  disabled={hasAnswered}
                />
                <button 
                  onClick={handleSubmitAnswer} 
                  className="final-submit-btn"
                  disabled={hasAnswered}
                >
                  {hasAnswered ? '✓ ОТВЕТ ОТПРАВЛЕН' : 'ОТВЕТИТЬ'}
                </button>
              </div>
              
              {hasAnswered && (
                <div className="text-center" style={{ marginTop: '16px', color: '#10b981' }}>
                  ✓ Ваш ответ принят! Ожидаем остальные команды...
                </div>
              )}
            </div>
          )}

          <button onClick={() => navigate('/main')} className="btn btn-outline w-full" style={{ marginTop: '24px' }}>
            ← На главную
          </button>
        </div>
      </div>
      
      <DebugPanel isFinalGame={true} />
    </div>
  );
}