// pages/QualificationResults.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { completeQualification, getFinalistStatus, updateTeamScore, getTeam } from '../api/client';
import NeonBorder from '../components/NeonBorder';
import LedLight from '../components/LedLight';

export default function QualificationResults() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFinalist, setIsFinalist] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (location.state?.teamScore !== undefined) {
          setResults(location.state);
          await updateTeamScore(teamId, location.state.teamScore);
        } else {
          const savedResults = localStorage.getItem(`team_${teamId}`);
          if (savedResults) {
            const data = JSON.parse(savedResults);
            setResults({ teamScore: data.score, timeSpent: data.timeSpent, position: data.position });
          }
        }
        
        try {
          const teamRes = await getTeam(teamId);
          if (teamRes.data?.data) {
            const members = teamRes.data.data.members?.filter(m => m.fullName !== 'Свободный слот') || [];
            setTeamMembers(members);
          }
        } catch (err) {
          console.error('Ошибка загрузки команды:', err);
        }
        
        const statusRes = await getFinalistStatus(teamId);
        setIsFinalist(statusRes.data.isFinalist);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadResults();
  }, [teamId, location.state]);

  const handleProceedToFinal = async () => {
    setIsCompleting(true);
    try {
      console.log('🏁 Начинаем процесс выхода в финал...');
      
      // 1. Сохраняем статус финалиста для всех участников
      for (const member of teamMembers) {
        localStorage.setItem(`player_${member.id}_finalist`, 'true');
        console.log(`✅ Игрок ${member.fullName} (${member.id}) получил статус финалиста`);
      }
      
      // 2. Завершаем отборочный тур на бэкенде
      await completeQualification(teamId);
      
      // 3. Удаляем команду из базы данных через API
      console.log('🗑️ Удаляем команду из базы данных...');
      const token = localStorage.getItem('token');
      const deleteResponse = await fetch(`http://localhost:3001/api/team/${teamId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Ошибка при удалении команды:', errorText);
        throw new Error(`Ошибка удаления: ${errorText}`);
      }
      
      const deleteResult = await deleteResponse.json();
      console.log('✅ Результат удаления:', deleteResult);
      
      // 4. Полностью очищаем localStorage
      console.log('🗑️ Очищаем localStorage...');
      
      const keysToRemove = [
        'teamId',
        'teamName', 
        'teamMembers',
        'joinCode',
        'gameMode',
        `qualification_progress_${teamId}`,
        `team_${teamId}`,
        `team_name_${teamId}`,
        `team_${teamId}_finalist`,
        `final_lobby_${teamId}`,
        `team_results_${teamId}`
      ];
      
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Удалён ключ: ${key}`);
        }
      });
      
      // 5. Обновляем данные пользователя в localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        userData.teamId = null;
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ Обновлён user в localStorage, teamId = null');
      }
      
      // 6. Сохраняем результаты команды для истории
      const teamResults = {
        score: results?.teamScore || 0,
        timeSpent: results?.timeSpent || 0,
        finishedAt: new Date().toISOString()
      };
      localStorage.setItem(`team_results_${teamId}`, JSON.stringify(teamResults));
      
      setIsFinalist(true);
      
      // 7. Перенаправляем на главную с принудительной перезагрузкой
      setTimeout(() => {
        alert('✅ Ваша команда прошла в финал! Теперь вы можете создать новую команду для финала.');
        window.location.href = '/main';
      }, 500);
      
    } catch (err) {
      console.error('❌ Ошибка при переходе к финалу:', err);
      alert('Ошибка при переходе к финалу: ' + err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  // Функция для возврата на главную с очисткой
  const handleGoToMain = () => {
    window.location.href = '/main';
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
            <p>Загрузка результатов...</p>
          </div>
        </div>
      </div>
    );
  }

  const isCaptain = user?.role === 'L';
  const myPosition = results?.position || 1;
  const isInTop3 = myPosition <= 3;
  const canProceedToFinal = !isFinalist && isCaptain && isInTop3 && teamMembers.length > 0;

  return (
    <div className="rating-page">
      <div className="rating-card fade-in">
        <div className="rating-header slide-in-left">
          <div className="rating-icon">📊</div>
          <div>
            <h1>Результаты отбора</h1>
            <p>Ваша команда завершила оценку квалификации</p>
          </div>
        </div>

        <div className={`card text-center scale-in ${isInTop3 ? 'correct' : ''}`} style={{ 
          marginBottom: '24px',
          background: isInTop3 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: isInTop3 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
        }}>
          {isInTop3 ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆🏆🏆</div>
              <h2 style={{ color: '#10b981', marginBottom: '8px' }}>ПОЗДРАВЛЯЕМ!</h2>
              <p className="text-muted">Ваша команда прошла в финал!</p>
              <p className="text-muted mt-2">Место: <strong>{myPosition}</strong> из всех участников</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💔</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>К сожалению...</h2>
              <p className="text-muted">Ваша команда не прошла в финал.</p>
              <p className="text-muted mt-2">Место: <strong>{myPosition}</strong> из всех участников</p>
            </>
          )}
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>📈 Статистика команды</h3>
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
            <span className={isInTop3 ? 'text-success' : 'text-danger'}>
              {isInTop3 ? '✓ Проход в финал' : '✗ Выбывание'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {canProceedToFinal && isInTop3 && (
            <button 
              onClick={handleProceedToFinal} 
              className="btn btn-success w-full py-3 hover-glow"
              disabled={isCompleting}
            >
              {isCompleting ? 'Обработка...' : '🏆 Подтвердить выход в финал'}
            </button>
          )}

          {isFinalist && (
            <NeonBorder color="green" className="text-center" style={{ padding: '16px' }}>
              <LedLight color="green" blinking={false} label="ФИНАЛИСТЫ" />
              <p className="mt-2">Ваша команда прошла в финал!</p>
              <p className="text-muted text-sm">Теперь вы можете создать новую команду для финала</p>
            </NeonBorder>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={handleGoToMain} className="btn btn-primary" style={{ flex: 1 }}>
              🏠 На главную
            </button>
            <button onClick={() => navigate('/rating')} className="btn btn-outline" style={{ flex: 1 }}>
              📊 Рейтинг
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}