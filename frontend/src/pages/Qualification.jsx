import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeam, getQualificationQuestions, getQualificationProgress, saveQualificationProgress, resetQualificationProgress } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import DebugPanel from '../components/DebugPanel';
import NeonBorder from '../components/NeonBorder';

export default function Qualification() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [team, setTeam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [teamScore, setTeamScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);

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
        
        const config = {
          totalQuestions: 25,
          pointsPerQuestion: 10,
          timeLimit: 900,
          name: 'Отборочный тур'
        };
        setGameConfig(config);
        setTimeLeft(config.timeLimit);
        
        console.log('📚 Загружаем вопросы...');
        const questionsRes = await getQualificationQuestions('qualification');
        const questionsData = questionsRes.data?.data || [];
        console.log('📚 Получено вопросов:', questionsData.length);
        setQuestions(questionsData);
        
        const progressRes = await getQualificationProgress(teamId);
        
        if (progressRes.data && !progressRes.data.finished) {
          const p = progressRes.data;
          setCurrentIndex(p.currentIndex || 0);
          setTeamScore(p.teamScore || 0);
          if (p.timeLeft) setTimeLeft(p.timeLeft);
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
          answers: [],
          teamScore,
          playersOrder: [],
          currentPlayerId: user?.id,
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
  }, [currentIndex, teamScore, timeLeft, teamId, loading, isFinished]);

  const handleAnswer = async (answerKey) => {
    if (selectedAnswer !== null || showResult) return;
    if (!questions.length || currentIndex >= questions.length) {
      console.error('Нет вопросов или индекс вне границ');
      return;
    }
    
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) {
      console.error('Текущий вопрос не найден');
      return;
    }
    
    setSelectedAnswer(answerKey);
    const isCorrect = answerKey === currentQuestion.correct;
    const pointsEarned = isCorrect ? 10 : 0;
    
    setLastResult({
      isCorrect,
      pointsEarned,
      correctAnswer: currentQuestion.correct,
      correctText: currentQuestion.options[currentQuestion.correct]
    });
    setShowResult(true);
    setTeamScore(prev => prev + pointsEarned);
    
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowResult(false);
      setLastResult(null);
      
      if (currentIndex + 1 >= questions.length) {
        console.log('🏁 Вопросы закончились! Завершаем игру...');
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 2000);
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
        
        await saveQualificationProgress(teamId, {
          currentIndex,
          answers: [],
          teamScore,
          playersOrder: [],
          currentPlayerId: user?.id,
          timeLeft,
          finished: true
        });
        
        navigate(`/qualification-results/${teamId}`, {
          state: { 
            teamScore, 
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
    <div className="quiz-layout-centered">
      <div className="quiz-container">
        <div className="quiz-card scale-in">
          <div className="quiz-header slide-in-left">
            <div className="quiz-logo">📚</div>
            <div>
              <h1>{gameConfig.name}</h1>
              <p>{gameConfig.pointsPerQuestion} баллов за вопрос</p>
            </div>
          </div>

          <div className="quiz-stats-centered">
            <NeonBorder color="blue" className="stat-pill">
              👥 {team?.name}
            </NeonBorder>
            <NeonBorder color="yellow" className="stat-pill">
              ⭐ {teamScore} баллов
            </NeonBorder>
            <NeonBorder color={timeLeft < 60 ? 'red' : 'green'} className="stat-pill timer">
              ⏱ {minutes}:{String(seconds).padStart(2, '0')}
            </NeonBorder>
            <NeonBorder color="blue" className="stat-pill">
              ❓ {currentIndex + 1}/{gameConfig.totalQuestions}
            </NeonBorder>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '12px', 
              marginBottom: '6px',
              color: '#8b92b0'
            }}>
              <span>Прогресс</span>
              <span>{Math.round((currentIndex / gameConfig.totalQuestions) * 100)}%</span>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '10px', 
              height: '8px', 
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${(currentIndex / gameConfig.totalQuestions) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #4b8cff, #7ab3ff)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div key={currentIndex} className="question-flip">
            <NeonBorder color="blue" className="question-card">
              <div className="question-category">ВОПРОС {currentIndex + 1}</div>
              <h2>{currentQuestion?.text || 'Загрузка вопроса...'}</h2>
              <div className="difficulty-badge">10 баллов</div>
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
                  disabled={selectedAnswer !== null}
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
            </div>
          )}
        </div>
      </div>

      <DebugPanel 
        teamId={teamId}
        onResetProgress={async () => {
          if (confirm('Сбросить прогресс?')) {
            await resetQualificationProgress(teamId);
            navigate(`/lobby/${teamId}`);
          }
        }}
        onSkipQuestion={() => {
          if (selectedAnswer !== null) return;
          if (currentIndex + 1 >= questions.length) {
            setIsFinished(true);
          } else {
            setCurrentIndex(prev => prev + 1);
          }
        }}
        onSpeedUpTimer={() => setTimeLeft(prev => Math.max(prev - 10, 0))}
        onPerfectPass={async () => {
          if (confirm('Пройти тур идеально?')) {
            const maxScore = questions.length * 10;
            setTeamScore(maxScore);
            setIsFinished(true);
            showToast(`Тур пройден идеально! Набрано ${maxScore} баллов`, 'success');
          }
        }}
      />
    </div>
  );
}