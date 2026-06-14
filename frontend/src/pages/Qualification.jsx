// pages/Qualification.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeam, getQualificationQuestions, getQualificationProgress, saveQualificationProgress, resetQualificationProgress } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import DebugPanel from '../components/DebugPanel';
import LedLight from '../components/LedLight';
import NeonBorder from '../components/NeonBorder';

export default function Qualification() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [playersOrder, setPlayersOrder] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [teamScore, setTeamScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isCaptainOverride, setIsCaptainOverride] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);

  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true' || localStorage.getItem('debugMode') === 'true';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const teamRes = await getTeam(teamId);
        const teamData = teamRes.data?.data;
        
        if (!teamData) {
          console.error('Нет данных команды');
          navigate(`/lobby/${teamId}`);
          return;
        }
        
        setTeam(teamData);
        
        const savedGameMode = localStorage.getItem('gameMode') || 'qualification';
        const config = savedGameMode === 'qualification' 
          ? { totalQuestions: 25, pointsPerQuestion: 10, timeLimit: 900, name: 'Классический тур' }
          : { totalQuestions: 25, pointsPerQuestion: 20, timeLimit: 600, name: 'Экстрим тур' };
        setGameConfig(config);
        setTimeLeft(config.timeLimit);
        
        console.log('📚 Загружаем вопросы...');
        const questionsRes = await getQualificationQuestions(savedGameMode);
        const questionsData = questionsRes.data?.data || [];
        console.log('📚 Получено вопросов:', questionsData.length);
        setQuestions(questionsData);
        
        const progressRes = await getQualificationProgress(teamId);
        
        if (progressRes.data && !progressRes.data.finished) {
          const p = progressRes.data;
          setCurrentIndex(p.currentIndex || 0);
          setAnswers(p.answers || []);
          setTeamScore(p.teamScore || 0);
          setPlayersOrder(p.playersOrder || []);
          setCurrentPlayerId(p.currentPlayerId);
          if (p.timeLeft) setTimeLeft(p.timeLeft);
        } else {
          const realMembers = teamData.members?.filter(m => m.fullName !== 'Свободный слот') || [];
          const order = realMembers.map(m => m.id);
          setPlayersOrder(order);
          setCurrentPlayerId(order[0] || null);
        }
        
      } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        navigate(`/lobby/${teamId}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (teamId) {
      loadData();
    }
  }, [teamId, navigate]);

  useEffect(() => {
    if (loading || isFinished) return;
    
    const timer = setInterval(() => {
      if (!isFinished) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, isFinished]);

  useEffect(() => {
    if (loading || isFinished || !teamId) return;
    
    const saveProgress = async () => {
      try {
        await saveQualificationProgress(teamId, {
          currentIndex,
          answers,
          teamScore,
          playersOrder,
          currentPlayerId,
          timeLeft,
          finished: false
        });
      } catch (err) {
        console.error('Ошибка сохранения прогресса:', err);
      }
    };
    
    const timer = setTimeout(() => {
      saveProgress();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentIndex, answers, teamScore, currentPlayerId, timeLeft, teamId, loading, isFinished]);

  const isMyTurn = currentPlayerId === user?.id;
  const isCaptain = user?.role === 'L' || (team && Number(user?.id) === Number(team.captainId));
  const canAnswer = isMyTurn || isCaptain || isDebugMode;

  const handleAnswer = async (answerKey) => {
    if (!canAnswer || selectedAnswer !== null || showResult) return;
    if (!questions.length || currentIndex >= questions.length) {
      console.error('Нет вопросов или индекс вне границ');
      return;
    }
    
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) {
      console.error('Текущий вопрос не найден');
      return;
    }
    
    if (!isMyTurn && (isCaptain || isDebugMode)) {
      setIsCaptainOverride(true);
    }
    
    setSelectedAnswer(answerKey);
    const isCorrect = answerKey === currentQuestion.correct;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;
    
    setLastResult({
      isCorrect,
      pointsEarned,
      correctAnswer: currentQuestion.correct,
      correctText: currentQuestion.options[currentQuestion.correct]
    });
    setShowResult(true);
    
    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      playerId: currentPlayerId,
      actualAnswererId: isMyTurn ? currentPlayerId : user?.id,
      answer: answerKey,
      isCorrect,
      pointsEarned
    }];
    setAnswers(newAnswers);
    setTeamScore(prev => prev + pointsEarned);
    
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowResult(false);
      setLastResult(null);
      setIsCaptainOverride(false);
      
      if (currentIndex + 1 >= questions.length) {
        console.log('🏁 Вопросы закончились! Завершаем игру...');
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        if (playersOrder.length > 0) {
          const currentPlayerIdx = playersOrder.indexOf(currentPlayerId);
          const nextPlayerIdx = (currentPlayerIdx + 1) % playersOrder.length;
          setCurrentPlayerId(playersOrder[nextPlayerIdx]);
        }
      }
    }, 2000);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      playerName: user?.fullName || 'Игрок',
      message: chatInput,
      time: new Date().toLocaleTimeString()
    }]);
    setChatInput('');
  };

  const handleSkipQuestion = () => {
    if (!canAnswer) {
      alert('Сейчас не ваш ход!');
      return;
    }
    if (!questions.length || currentIndex >= questions.length) return;
    
    const currentQuestion = questions[currentIndex];
    
    setSelectedAnswer('SKIP');
    setLastResult({
      isCorrect: false,
      pointsEarned: 0,
      correctAnswer: currentQuestion.correct,
      correctText: currentQuestion.options[currentQuestion.correct]
    });
    setShowResult(true);
    
    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      playerId: currentPlayerId,
      answer: 'SKIP',
      isCorrect: false,
      pointsEarned: 0
    }];
    setAnswers(newAnswers);
    
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowResult(false);
      setLastResult(null);
      
      if (currentIndex + 1 >= questions.length) {
        console.log('🏁 Вопросы закончились (скип)! Завершаем игру...');
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        if (playersOrder.length > 0) {
          const currentPlayerIdx = playersOrder.indexOf(currentPlayerId);
          const nextPlayerIdx = (currentPlayerIdx + 1) % playersOrder.length;
          setCurrentPlayerId(playersOrder[nextPlayerIdx]);
        }
      }
    }, 1000);
  };

  const handleSpeedUpTimer = () => {
    setTimeLeft(prev => Math.max(prev - 10, 0));
  };

  const handleResetProgress = async () => {
    if (confirm('Сбросить прогресс и начать заново?')) {
      await resetQualificationProgress(teamId);
      navigate(`/lobby/${teamId}`);
    }
  };

  const handlePerfectPass = async () => {
    if (!confirm('Пройти тур идеально?')) return;
    if (!questions.length) return;
    
    try {
      const maxScore = questions.length * (gameConfig?.pointsPerQuestion || 10);
      setTeamScore(maxScore);
      
      const perfectAnswers = questions.map((q, idx) => ({
        questionId: q.id,
        playerId: currentPlayerId,
        answer: q.correct,
        isCorrect: true,
        pointsEarned: q.points
      }));
      setAnswers(perfectAnswers);
      setIsFinished(true);
      
      alert(`✅ Тур пройден идеально! Набрано ${maxScore} баллов`);
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  };

  useEffect(() => {
    if (isFinished && !loading && team && gameConfig && questions.length > 0) {
      const saveResults = async () => {
        console.log('🏁 Игра завершена! Сохраняем результаты...');
        
        const teamData = {
          score: teamScore,
          timeSpent: gameConfig.timeLimit - timeLeft,
          finishedAt: new Date().toISOString()
        };
        localStorage.setItem(`team_${teamId}`, JSON.stringify(teamData));
        localStorage.setItem(`team_name_${teamId}`, team?.name || 'Мой Отдел');
        
        const currentRating = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('team_') && !key.includes('_finalist') && !key.includes('_name') && !key.includes('_results')) {
            const id = key.replace('team_', '');
            const data = JSON.parse(localStorage.getItem(key));
            const name = localStorage.getItem(`team_name_${id}`) || `Команда ${id}`;
            currentRating.push({ id: parseInt(id), name, score: data.score || 0, timeSpent: data.timeSpent || 999 });
          }
        }
        
        if (!currentRating.find(t => t.id === parseInt(teamId))) {
          currentRating.push({ id: parseInt(teamId), name: team?.name, score: teamScore, timeSpent: gameConfig.timeLimit - timeLeft });
        }
        
        currentRating.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score;
          return a.timeSpent - b.timeSpent;
        });
        
        const myPosition = currentRating.findIndex(t => t.id === parseInt(teamId));
        const isFinalist = myPosition !== -1 && myPosition < 3;
        
        localStorage.setItem(`team_${teamId}_finalist`, isFinalist ? 'true' : 'false');
        
        if (isFinalist) {
          await resetQualificationProgress(teamId);
        }
        
        await saveQualificationProgress(teamId, {
          currentIndex,
          answers,
          teamScore,
          playersOrder,
          currentPlayerId,
          timeLeft,
          finished: true
        });
        
        navigate(`/qualification-results/${teamId}`, {
          state: { 
            teamScore, 
            answers, 
            timeSpent: gameConfig.timeLimit - timeLeft, 
            questions,
            position: myPosition + 1,
            isFinalist,
            totalTeams: currentRating.length
          }
        });
      };
      
      saveResults();
    }
  }, [isFinished, loading]);

  if (authLoading || loading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
              <div className="loading-dot" style={{ width: '12px', height: '12px', background: '#4b8cff', borderRadius: '50%', display: 'inline-block' }} />
            </div>
            <p>Загрузка вопросов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team || !gameConfig) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Ошибка загрузки данных</p>
            <button onClick={() => navigate('/main')} className="btn btn-primary mt-4">На главную</button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentPlayer = team.members?.find(m => m.id === currentPlayerId);
  const activeMembers = team.members?.filter(m => m.fullName !== 'Свободный слот') || [];

  if (questions.length === 0) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <p>Вопросы загружаются...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-layout">
      <div className="quiz-sidebar slide-in-left">
        <div className="team-info-card">
          <div className="team-header">
            <div className="team-icon">👥</div>
            <div>
              <div className="team-name">{team?.name}</div>
              <div className="team-score">⭐ {teamScore} баллов</div>
            </div>
          </div>
          
          <div className="team-stats">
            <div className="stat-item">
              <span>⏱ Время</span>
              <span className="stat-value">{minutes}:{String(seconds).padStart(2, '0')}</span>
            </div>
            <div className="stat-item">
              <span>❓ Вопрос</span>
              <span className="stat-value">{currentIndex + 1}/{gameConfig.totalQuestions}</span>
            </div>
          </div>

          <NeonBorder color={isMyTurn ? 'green' : 'blue'} className="current-player-badge glow-pulse">
            <div className="current-label">СЕЙЧАС ОТВЕЧАЕТ</div>
            <div className="current-name">
              {currentPlayer?.fullName || 'Загрузка...'}
              {currentPlayerId === user?.id && <span className="you-badge">(вы)</span>}
            </div>
            {!isMyTurn && (isCaptain || isDebugMode) && (
              <div className="captain-note">👑 Вы капитан — можете отвечать за команду</div>
            )}
            <LedLight color={isMyTurn ? 'green' : 'red'} blinking={isMyTurn} label={isMyTurn ? 'ВАШ ХОД' : 'ОЖИДАНИЕ'} />
          </NeonBorder>

          <div className="players-list">
            <div className="players-title">КОМАНДА</div>
            {activeMembers.map((member, idx) => {
              const isCurrent = member.id === currentPlayerId;
              return (
                <div key={member.id} className={`player-item ${isCurrent ? 'active' : ''} slide-in-left`} style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="player-avatar">
                    {member.id === team.captainId ? '👑' : '👤'}
                  </div>
                  <div className="player-name">
                    {member.fullName}
                    {member.id === user?.id && <span className="you-tag">вы</span>}
                  </div>
                  <div className="player-status">
                    {isCurrent ? '▶' : (member.isReady ? '✓' : '○')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="quiz-main">
        <div className="quiz-question-card scale-in">
          <div className="quiz-header">
            <div className="quiz-logo">📚</div>
            <div>
              <h1>{gameConfig.name}</h1>
              <p>{gameConfig.pointsPerQuestion} баллов за вопрос</p>
            </div>
            <LedLight color={timeLeft < 60 ? 'red' : 'green'} blinking={timeLeft < 60} label={timeLeft < 60 ? 'СРОЧНО!' : 'В РЕЖИМЕ'} />
          </div>

          <div className="quiz-stats">
            <NeonBorder color="blue" className="stat-pill">👥 {team?.name}</NeonBorder>
            <NeonBorder color="yellow" className="stat-pill">⭐ {teamScore}</NeonBorder>
            <NeonBorder color={timeLeft < 60 ? 'red' : 'green'} className="stat-pill timer">
              ⏱ {minutes}:{String(seconds).padStart(2, '0')}
            </NeonBorder>
            <NeonBorder color="blue" className="stat-pill">
              ❓ {currentIndex + 1}/{gameConfig.totalQuestions}
            </NeonBorder>
          </div>

          <div key={currentIndex} className="question-flip">
            <NeonBorder color="blue" className="question-card">
              <div className="question-category">ВОПРОС {currentIndex + 1}</div>
              <h2>{currentQuestion?.text || 'Загрузка вопроса...'}</h2>
              <div className="difficulty-badge">{currentQuestion?.points || gameConfig.pointsPerQuestion} баллов</div>
            </NeonBorder>
          </div>

          <div className="answers">
            {['A', 'B', 'C', 'D'].map((key) => {
              let btnClass = 'answer-btn';
              if (selectedAnswer === key) {
                btnClass += lastResult?.isCorrect ? ' correct correct-flash' : ' wrong wrong-shake';
              }
              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  disabled={!canAnswer || selectedAnswer !== null}
                  className={btnClass}
                >
                  <span>{key})</span>
                  {currentQuestion?.options?.[key] || 'Загрузка...'}
                </button>
              );
            })}
          </div>

          {showResult && lastResult && (
            <div className={`result-card ${lastResult.isCorrect ? 'correct' : 'wrong'} notification-pop`}>
              <div className={`result-title ${lastResult.isCorrect ? 'correct' : 'wrong'}`}>
                {lastResult.isCorrect ? '✓ ПРАВИЛЬНО!' : '✗ НЕПРАВИЛЬНО'}
              </div>
              {!lastResult.isCorrect && (
                <div className="result-points">Правильный ответ: {lastResult.correctText}</div>
              )}
              <div className={`result-points ${lastResult.isCorrect ? 'score-increase' : ''}`}>
                +{lastResult.pointsEarned} баллов
              </div>
              {isCaptainOverride && (
                <div className="captain-note">👑 Ответ дан капитаном</div>
              )}
            </div>
          )}
        </div>
      </div>

      <button className="chat-toggle-btn" onClick={() => setChatOpen(!chatOpen)}>💬</button>

      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <h4>Чат команды</h4>
            <button className="chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                Нет сообщений
              </div>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className="chat-message slide-in-left">
                <strong>{msg.playerName}:</strong> {msg.message}
                <span>{msg.time}</span>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Сообщение..."
            />
            <button className="chat-send-btn" onClick={sendMessage}>→</button>
          </div>
        </div>
      )}

      <DebugPanel 
        teamId={teamId}
        onResetProgress={handleResetProgress}
        onSkipQuestion={handleSkipQuestion}
        onSpeedUpTimer={handleSpeedUpTimer}
        onPerfectPass={handlePerfectPass}
      />
    </div>
  );
}