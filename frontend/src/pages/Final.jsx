// pages/Final.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFinalBoard, pickQuestion, submitFinalAnswer, getMyFinalTeam } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import NeonBorder from '../components/NeonBorder';
import LedLight from '../components/LedLight';

export default function Final() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [answerStatus, setAnswerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isBetRound, setIsBetRound] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [myTeamId, setMyTeamId] = useState(null);

  const loadBoard = async () => {
    try {
      const [boardRes, myTeamRes] = await Promise.all([
        getFinalBoard(sessionId),
        getMyFinalTeam(sessionId)
      ]);
      
      console.log('🎮 Игровое поле:', boardRes.data);
      console.log('👥 Моя команда:', myTeamRes.data);
      
      const boardData = boardRes.data?.data || boardRes.data;
      setBoard(boardData);
      
      if (myTeamRes.data?.data) {
        setMyTeamId(myTeamRes.data.data.id);
        console.log('🎮 Моя команда ID:', myTeamRes.data.data.id);
      }
      
      if (boardData?.isFinished && !gameEnded) {
        setGameEnded(true);
        const results = { teams: boardData.teams, finishedAt: new Date().toISOString() };
        localStorage.setItem(`final_results_${sessionId}`, JSON.stringify(results));
        navigate(`/final-results/${sessionId}`, { state: { results } });
      }
    } catch (err) {
      console.error(err);
      navigate('/main');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!currentQuestion) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('⏰ Время вышло!');
          setCurrentQuestion(null);
          loadBoard();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestion]);

  const handlePickQuestion = async (categoryId, value) => {
    if (!isMyTurn) {
      alert('⏳ Сейчас не ваш ход!');
      return;
    }
    
    try {
      const res = await pickQuestion(sessionId, categoryId, value);
      console.log('❓ Выбран вопрос:', res.data);
      
      const questionData = res.data?.data || res.data;
      console.log('❓ ID вопроса:', questionData?.id);
      
      if (!questionData?.id) {
        console.error('Ошибка: вопрос не содержит ID', questionData);
        alert('Ошибка при выборе вопроса');
        return;
      }
      
      setCurrentQuestion(questionData);
      setTimeLeft(30);
      setAnswerInput('');
      setAnswerStatus(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Не удалось выбрать вопрос');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim()) {
      alert('Введите ответ');
      return;
    }
    if (!currentQuestion) {
      alert('Нет активного вопроса');
      return;
    }
    if (!currentQuestion.id) {
      console.error('Ошибка: currentQuestion не содержит id', currentQuestion);
      alert('Ошибка: ID вопроса не найден');
      return;
    }
    
    try {
      const res = await submitFinalAnswer(sessionId, currentQuestion.id, answerInput);
      console.log('📝 Ответ отправлен:', res.data);
      setAnswerStatus(res.data);
      
      setTimeout(() => {
        setCurrentQuestion(null);
        setAnswerStatus(null);
        loadBoard();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Не удалось отправить ответ');
    }
  };

  const handleSubmitBet = async () => {
    const myTeam = board?.teams?.find(t => t.id === myTeamId);
    if (!myTeam) {
      alert('Ваша команда не найдена');
      return;
    }
    const bet = parseInt(betAmount);
    if (!bet || bet <= 0) return alert('Введите корректную ставку');
    if (bet > myTeam.score) return alert(`Ставка не может превышать ${myTeam.score} баллов`);
    try {
      await submitFinalAnswer(sessionId, null, null, bet);
      setIsBetRound(true);
      loadBoard();
    } catch (err) {
      console.error(err);
      alert('Не удалось сделать ставку');
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
            <p>Загрузка игрового поля...</p>
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
            <p>Ошибка загрузки игрового поля</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  const teams = board?.teams || [];
  const categories = board?.categories || [];
  const isMyTurn = board?.currentTurnTeamId === myTeamId;
  const canPick = isMyTurn && !currentQuestion && !isBetRound;
  const allQuestionsUsed = categories.length > 0 && categories.every(cat => cat.questions?.every(q => q.isUsed === true));

  console.log('🎮 myTeamId:', myTeamId);
  console.log('🎮 currentTurnTeamId:', board?.currentTurnTeamId);
  console.log('🎮 isMyTurn:', isMyTurn);
  console.log('🎮 canPick:', canPick);

  if (teams.length < 2) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header slide-in-left">
              <div className="final-logo">🎮</div>
              <div>
                <h1>Своя игра</h1>
                <p>Финал</p>
              </div>
            </div>
            <div className="card" style={{ marginTop: '40px', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3>Недостаточно команд для начала финала</h3>
              <p className="text-muted">Для начала финала необходимо минимум 2 команды.</p>
              <p className="text-muted">Сейчас в лобби: <strong>{teams.length}/2+</strong> команд</p>
              <button onClick={() => navigate(`/final-lobby/${sessionId}`)} className="btn btn-primary mt-4">
                Вернуться в лобби
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in text-center">
            <div className="final-header slide-in-left">
              <div className="final-logo">🎮</div>
              <div>
                <h1>Своя игра</h1>
                <p>Финал</p>
              </div>
            </div>
            <div className="card" style={{ marginTop: '40px', padding: '40px' }}>
              <p>⏳ Ожидание начала финала...</p>
              <button onClick={() => navigate('/main')} className="btn btn-outline mt-4">На главную</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (allQuestionsUsed && !gameEnded && !isBetRound) {
    return (
      <div className="final-page">
        <div className="final-container">
          <div className="final-card fade-in">
            <div className="final-header slide-in-left">
              <div className="final-logo">🎮</div>
              <div>
                <h1>Своя игра</h1>
                <p>Финал</p>
              </div>
            </div>
            <div className="final-bet-card scale-in">
              <div className="final-bet-title">ФИНАЛЬНЫЙ РАУНД</div>
              <p className="text-muted">Основные вопросы закончились. Начинается финальный раунд!</p>
              <button onClick={() => setIsBetRound(true)} className="btn btn-primary mt-4 pulse-gentle">Начать финальный раунд</button>
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
          <div className="final-header slide-in-left">
            <div className="final-logo">🎮</div>
            <div>
              <h1>Своя игра</h1>
              <p>Финал</p>
            </div>
          </div>

          <div className="final-stats">
            {teams.map(team => (
              <div 
                key={team.id} 
                className={`final-stat-pill ${board?.currentTurnTeamId === team.id ? 'active-turn' : ''} scale-in`}
                style={{
                  background: board?.currentTurnTeamId === team.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)',
                  border: board?.currentTurnTeamId === team.id ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span>{team.name}</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0c564' }}>{team.score || 0}</span>
                {team.id === myTeamId && <span style={{ fontSize: '12px', color: '#4b8cff' }}>⭐</span>}
                {board?.currentTurnTeamId === team.id && <LedLight color="yellow" blinking={true} />}
              </div>
            ))}
          </div>

          {!currentQuestion && !isBetRound && categories.length > 0 && (
            <>
              <div className="final-board">
                <table className="final-table">
                  <thead>
                    <tr>
                      {categories.map(cat => (
                        <th key={cat.id} style={{ fontSize: '14px', padding: '16px 8px' }}>
                          {cat.name}
                        </th>
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
                            <td key={cat.id} style={{ padding: '12px', textAlign: 'center' }}>
                              {isAvailable ? (
                                <button
                                  onClick={() => handlePickQuestion(cat.id, value)}
                                  disabled={!canPick}
                                  className="final-question-btn hover-glow"
                                  style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    background: canPick ? 'linear-gradient(135deg, #2a3a6a, #1a2a4a)' : 'rgba(255,255,255,0.05)',
                                    cursor: canPick ? 'pointer' : 'not-allowed',
                                    opacity: canPick ? 1 : 0.5,
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {value}
                                </button>
                              ) : (
                                <span className="final-question-used" style={{ fontSize: '24px', color: '#10b981' }}>✓</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`final-turn-message ${isMyTurn ? 'your-turn' : 'other-turn'} fade-in-delay-2`}>
                {isMyTurn ? (
                  '🎯 ВАШ ХОД! Выберите вопрос'
                ) : (
                  `⏳ Сейчас ход команды "${teams.find(t => t.id === board?.currentTurnTeamId)?.name || '...'}"`
                )}
              </div>
            </>
          )}

          {!currentQuestion && !isBetRound && categories.length === 0 && (
            <div className="card text-center" style={{ padding: '60px', marginTop: '20px' }}>
              <p>📚 Вопросы загружаются...</p>
              <div className="loading-spinner" style={{ marginTop: '16px' }}>
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          )}

          {currentQuestion && (
            <div className="final-question-card question-flip">
              <div className="final-question-header">
                <span className="final-question-category">
                  📚 {currentQuestion.category}
                </span>
                <span className="final-question-value">
                  💰 {currentQuestion.value} баллов
                </span>
                <span className={`final-question-timer ${timeLeft < 10 ? 'danger timer-warning' : ''}`}>
                  ⏱ {timeLeft} сек
                </span>
              </div>
              <div className="final-question-text">
                {currentQuestion.text || 'Загрузка вопроса...'}
              </div>
              {answerStatus ? (
                <div className={`final-result ${answerStatus.isCorrect ? 'correct' : 'wrong'} notification-pop`}>
                  <div className={`final-result-title ${answerStatus.isCorrect ? 'correct' : 'wrong'}`}>
                    {answerStatus.isCorrect ? '✓ ПРАВИЛЬНО!' : '✗ НЕПРАВИЛЬНО'}
                  </div>
                  {!answerStatus.isCorrect && (
                    <div className="final-result-answer">
                      Правильный ответ: <strong>{answerStatus.correctAnswer}</strong>
                    </div>
                  )}
                  <div className={answerStatus.isCorrect ? 'score-increase' : ''}>
                    {answerStatus.isCorrect ? `+${answerStatus.points} баллов` : '0 баллов'}
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    className="final-answer-input"
                    placeholder="Введите ответ..."
                    onKeyPress={e => e.key === 'Enter' && handleSubmitAnswer()}
                    autoFocus
                  />
                  <button onClick={handleSubmitAnswer} className="final-submit-btn hover-glow">
                    Ответить
                  </button>
                </>
              )}
            </div>
          )}

          {isBetRound && (
            <div className="final-bet-card scale-in">
              <div className="final-bet-title">ФИНАЛЬНЫЙ РАУНД</div>
              <p className="text-muted">Сделайте ставку от 1 до {teams.find(t => t.id === myTeamId)?.score || 0} баллов</p>
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="form-input final-bet-input"
                placeholder="Ставка"
                style={{ textAlign: 'center', fontSize: '24px', width: '200px', margin: '0 auto' }}
              />
              <button onClick={handleSubmitBet} className="btn btn-primary w-full mt-4 hover-glow">
                Подтвердить ставку
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}