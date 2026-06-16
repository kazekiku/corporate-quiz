import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinalBoard, pickQuestion, submitFinalAnswer, nextTurn } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import LedLight from '../components/LedLight';
import DebugPanel from '../components/DebugPanel';

export default function Final() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [questionLocked, setQuestionLocked] = useState(false);
  const [allTeamsAnswered, setAllTeamsAnswered] = useState(false);
  const [timeEnded, setTimeEnded] = useState(false);

  const loadBoard = async () => {
    try {
      const res = await getFinalBoard();
      console.log('🎮 ПОЛНЫЙ ОТВЕТ:', res.data);
      
      const data = res.data?.data;
      console.log('📊 currentTurnTeamId:', data?.currentTurnTeamId);
      console.log('📊 teams:', data?.teams);
      console.log('📊 gameStarted:', data?.gameStarted);
      
      setBoard(data);
      setAllTeamsAnswered(data?.allTeamsAnswered || false);
      setTimeEnded(data?.timeEnded || false);
      
      // ПРИНУДИТЕЛЬНАЯ УСТАНОВКА myTeamId
      if (data?.currentTurnTeamId === 1 && !myTeamId) {
        setMyTeamId(1);
        console.log('🔥 ПРИНУДИТЕЛЬНО установлен myTeamId = 1');
      }
      
      if (data?.teams && user) {
        console.log('👥 Все команды:', data.teams.map(t => ({ id: t.id, name: t.name, captain_id: t.captain_id })));
        console.log('👤 user.id:', user.id);
        console.log('👤 user.teamId:', user.teamId);
        
        let myTeam = data.teams.find(t => t.captain_id === user.id);
        
        if (!myTeam && user.teamId) {
          myTeam = data.teams.find(t => t.id === user.teamId);
          console.log('🔍 Поиск по teamId:', myTeam);
        }
        
        if (!myTeam && data.teams.length > 0) {
          myTeam = data.teams[0];
          console.log('⚠️ ВРЕМЕННО: берём первую команду', myTeam);
        }
        
        if (myTeam) {
          setMyTeamId(myTeam.id);
          console.log('✅ Установлен myTeamId:', myTeam.id);
        }
      }
      
      if (data?.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        setTimeLeft(Math.max(0, 30 - (data.currentQuestion.timePassed || 0)));
        setHasAnswered(!!data.userAnswers?.[user?.id]);
      } else {
        setCurrentQuestion(null);
        setHasAnswered(false);
      }
      
      if (data?.showResults && data?.results) {
        setShowResults(true);
        setResults(data.results);
        setTimeout(() => {
          handleNextTurn();
        }, 5000);
      } else {
        setShowResults(false);
      }
      
    } catch (err) {
      console.error(err);
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    try {
      await nextTurn();
      setShowResults(false);
      setResults(null);
      setAnswerInput('');
      setHasAnswered(false);
      setCurrentQuestion(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickQuestion = async (categoryId, value) => {
    if (questionLocked) {
      alert('Вопрос уже выбран, подождите...');
      return;
    }
    if (!isMyTurn) {
      alert('⏳ Сейчас не ваш ход выбирать вопрос!');
      return;
    }
    if (currentQuestion) {
      alert('Сначала завершите текущий вопрос');
      return;
    }
    
    setQuestionLocked(true);
    
    try {
      const res = await pickQuestion(categoryId, value);
      console.log('❓ Выбран вопрос:', res.data);
      
      const questionData = res.data?.data;
      
      if (!questionData?.id) {
        alert('Ошибка при выборе вопроса');
        setQuestionLocked(false);
        return;
      }
      
      setCurrentQuestion(questionData);
      setTimeLeft(30);
      setAnswerInput('');
      setHasAnswered(false);
      setQuestionLocked(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Не удалось выбрать вопрос');
      setQuestionLocked(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim()) {
      alert('Введите ответ');
      return;
    }
    if (hasAnswered) {
      alert('Вы уже ответили на этот вопрос');
      return;
    }
    if (timeLeft <= 0) {
      alert('Время вышло!');
      return;
    }
    if (!currentQuestion) {
      alert('Нет активного вопроса');
      return;
    }
    
    try {
      const res = await submitFinalAnswer(currentQuestion.id, answerInput);
      console.log('📝 Ответ отправлен:', res.data);
      setHasAnswered(true);
      alert('✅ Ваш ответ принят!');
      
      setTimeout(() => {
        loadBoard();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Не удалось отправить ответ');
    }
  };

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentQuestion || hasAnswered) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentQuestion, hasAnswered]);

  // Принудительная установка myTeamId после загрузки board
  useEffect(() => {
    if (board?.currentTurnTeamId === 1 && !myTeamId) {
      setMyTeamId(1);
      console.log('🎯 useEffect: ПРИНУДИТЕЛЬНО установлен myTeamId = 1');
    }
  }, [board]);

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

  const teams = board?.teams || [];
  const categories = board?.categories || [];
  const isMyTurn = board?.currentTurnTeamId === myTeamId;

  console.log('🔴 ОТЛАДКА КНОПОК:', {
    myTeamId,
    currentTurnTeamId: board?.currentTurnTeamId,
    isMyTurn,
    questionLocked,
    currentQuestion: !!currentQuestion,
    teamsCount: teams.length
  });

  if (teams.length < 3) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header">
              <div className="final-logo">🏆</div>
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

  if (showResults && results) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in">
            <div className="final-header">
              <div className="final-logo">📊</div>
              <h1>Результаты раунда</h1>
            </div>
            
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3>{results.question?.category}</h3>
              <p style={{ fontSize: '20px', marginTop: '12px' }}>{results.question?.text}</p>
              <p style={{ color: '#f0c564' }}>💰 {results.question?.value} баллов</p>
            </div>
            
            <div className="rating-table">
              <div className="rating-table-head">
                <span>КОМАНДА</span>
                <span>ОТВЕТ</span>
                <span>ВРЕМЯ</span>
                <span>БАЛЛЫ</span>
              </div>
              {results.teams?.map((team, idx) => (
                <div key={team.team_id || idx} className="rating-row" style={{
                  background: team.team_id === user?.teamId ? 'rgba(59,130,246,0.1)' : 'transparent'
                }}>
                  <div className="team-name">{team.team_name}</div>
                  <div>{team.answer || '—'}</div>
                  <div>{team.timeSpent?.toFixed(1)} сек</div>
                  <div className="score" style={{ color: team.points > 0 ? '#10b981' : '#ef4444' }}>
                    {team.points > 0 ? `+${team.points}` : '0'}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center" style={{ marginTop: '24px', color: '#f0c564' }}>
              Следующий ход через несколько секунд...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((allTeamsAnswered || timeEnded) && currentQuestion && !showResults) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header">
              <div className="final-logo">⏳</div>
              <h1>Ожидание результатов</h1>
            </div>
            <div className="card" style={{ marginTop: '40px', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {allTeamsAnswered ? '✅ Все команды ответили!' : '⏰ Время вышло!'}
              </div>
              <p className="text-muted">Подсчитываем результаты...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="final-page">
      <div className="final-container">
        <div className="final-card fade-in">
          <div className="final-header">
            <div className="final-logo">🎮</div>
            <h1>Своя игра</h1>
            <p>Финал</p>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '10px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <div>myTeamId: {myTeamId}</div>
            <div>currentTurnTeamId: {board?.currentTurnTeamId}</div>
            <div>isMyTurn: {String(isMyTurn)}</div>
            <div>questionLocked: {String(questionLocked)}</div>
            <div>user.id: {user?.id}</div>
            <div>user.teamId: {user?.teamId}</div>
          </div>

          <div className="final-stats">
            {teams.map(team => (
              <div 
                key={team.id} 
                className={`final-stat-pill ${board?.currentTurnTeamId === team.id ? 'active-turn' : ''}`}
              >
                <span>{team.name}</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0c564' }}>{team.score || 0}</span>
                {team.id === myTeamId && <span style={{ fontSize: '12px', color: '#4b8cff' }}>⭐</span>}
                {board?.currentTurnTeamId === team.id && <LedLight color="yellow" blinking={true} />}
              </div>
            ))}
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
                  '🎯 ВАШ ХОД! Выберите вопрос'
                ) : (
                  `⏳ Сейчас ход команды "${teams.find(t => t.id === board?.currentTurnTeamId)?.name}"`
                )}
              </div>
            </>
          )}

          {currentQuestion && (
            <div className="final-question-card">
              <div className="final-question-header">
                <span className="final-question-category">{currentQuestion.category}</span>
                <span className="final-question-value">💰 {currentQuestion.value} баллов</span>
                <span className={`final-question-timer ${timeLeft < 10 ? 'danger' : ''}`}>
                  ⏱ {Math.floor(timeLeft)} сек
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
                  {hasAnswered ? '✓ ОТВЕТ ОТПРАВЛЕН' : '📨 ОТВЕТИТЬ'}
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
      
      <DebugPanel />
    </div>
  );
}