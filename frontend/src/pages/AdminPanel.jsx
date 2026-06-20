// frontend/src/pages/AdminPanel.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { 
  getTeams, 
  generateTeamCodes, 
  deleteTeam, 
  getAdminSessions, 
  adminStartAllGame,
  getAdminSessionStatus,
  getAdminQuestions,
  uploadQuestions,
  getGames,
  getQualificationQuestionsAdmin,
  deleteQualificationQuestion,
  clearAllQualificationQuestions,
  getFinalQuestionsAll,
  clearAllFinalQuestions,
  deleteFinalQuestion
} from '../api/client';
import FinalQuestionsManager from '../components/FinalQuestionsManager';
import QuestionsList from '../components/QuestionsList';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [finalLobbies, setFinalLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamNamesInput, setTeamNamesInput] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [startingSessionId, setStartingSessionId] = useState(null);
  const [sessionStatuses, setSessionStatuses] = useState({});
  
  const [questions, setQuestions] = useState([]);
  const [questionTourType, setQuestionTourType] = useState('qualification');
  const [questionText, setQuestionText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Дебаг состояния
  const [debugLoading, setDebugLoading] = useState(false);

  // Списки вопросов
  const [qualificationQuestionsList, setQualificationQuestionsList] = useState([]);
  const [finalQuestionsList, setFinalQuestionsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (activeTab === 'games') {
        refreshStatuses();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsRes, sessionsRes, gamesRes, questionsRes] = await Promise.all([
        getTeams(),
        getAdminSessions(),
        getGames(),
        getAdminQuestions(),
      ]);
      
      setTeams(teamsRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
      setFinalLobbies(gamesRes.data.data?.finalLobbies || []);
      setQuestions(questionsRes.data.data || []);
      
      await refreshStatuses(sessionsRes.data.data || []);
      
      // Загружаем списки вопросов
      await Promise.all([
        loadQualificationQuestionsList(),
        loadFinalQuestionsList()
      ]);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatuses = async (sessionsList = sessions) => {
    if (sessionsList.length === 0) return;
    
    const statuses = {};
    for (const session of sessionsList) {
      try {
        const res = await getAdminSessionStatus(session.id);
        statuses[session.id] = res.data.data;
      } catch (err) {
        console.error(`Ошибка загрузки статуса сессии ${session.id}:`, err);
      }
    }
    setSessionStatuses(statuses);
  };

  // Загрузка списков вопросов
  const loadQualificationQuestionsList = async () => {
    setListLoading(true);
    try {
      const res = await getQualificationQuestionsAdmin();
      setQualificationQuestionsList(res.data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки вопросов:', err);
      showToast('Ошибка загрузки вопросов', 'error');
    } finally {
      setListLoading(false);
    }
  };

  const loadFinalQuestionsList = async () => {
    setListLoading(true);
    try {
      const res = await getFinalQuestionsAll();
      setFinalQuestionsList(res.data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки финальных вопросов:', err);
      showToast('Ошибка загрузки финальных вопросов', 'error');
    } finally {
      setListLoading(false);
    }
  };

  // ========== УПРАВЛЕНИЕ КОМАНДАМИ ==========
  
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      showToast('Введите название команды', 'warning');
      return;
    }
    
    try {
      const res = await generateTeamCodes([newTeamName.trim()]);
      showToast(`Команда "${newTeamName}" создана! Код: ${res.data.data[0].code}`, 'success');
      setNewTeamName('');
      loadData();
    } catch (err) {
      showToast('Ошибка создания команды', 'error');
    }
  };

  const handleBulkAdd = async () => {
    const names = teamNamesInput.split('\n').filter(n => n.trim());
    if (names.length === 0) {
      showToast('Введите хотя бы одно название', 'warning');
      return;
    }
    
    try {
      const res = await generateTeamCodes(names);
      showToast(`Создано ${res.data.data.length} команд!`, 'success');
      setTeamNamesInput('');
      loadData();
    } catch (err) {
      showToast('Ошибка создания команд', 'error');
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!confirm(`⚠️ Удалить команду "${teamName}"?\nЭто действие нельзя отменить!`)) return;
    
    setDeletingId(teamId);
    try {
      await deleteTeam(teamId);
      showToast(`Команда "${teamName}" удалена`, 'success');
      loadData();
    } catch (err) {
      showToast('Ошибка удаления команды', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ========== УПРАВЛЕНИЕ ИГРАМИ ==========
  
  const handleStartAllGame = async (sessionId) => {
    setStartingSessionId(sessionId);
    try {
      const res = await adminStartAllGame(sessionId);
      showToast(`✅ Игра запущена для ${res.data.teams.length} команд!`, 'success');
      await loadData();
    } catch (err) {
      showToast('❌ Ошибка запуска: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setStartingSessionId(null);
    }
  };

  // ========== УПРАВЛЕНИЕ ВОПРОСАМИ ==========
  
  const handleTxtUpload = async () => {
    if (!questionText.trim()) {
      showToast('Введите текст с вопросами', 'warning');
      return;
    }
    
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/questions/upload-txt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: questionText, 
          tourType: questionTourType 
        })
      });
      const data = await response.json();
      
      if (data.success) {
        showToast(data.message, 'success');
        setQuestionText('');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка загрузки: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const text = await file.text();
      let questionsData;
      
      if (file.name.endsWith('.json')) {
        questionsData = JSON.parse(text);
      } else {
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        questionsData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = values[i] || ''; });
          return obj;
        });
      }
      
      await uploadQuestions(questionsData, questionTourType);
      showToast(`Загружено ${questionsData.length} вопросов!`, 'success');
      await loadData();
    } catch (err) {
      showToast('Ошибка загрузки: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // ========== ДЕБАГ ФУНКЦИИ ==========
  
  const handleAddTestTeams = async () => {
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/debug/add-test-teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.allReady) {
          showToast('✅ Все команды готовы! Финал запущен!', 'success');
        } else {
          showToast(`✅ Добавлено ${data.addedCount} команд (${data.totalCount}/3)`, 'success');
        }
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleForceStartFinal = async () => {
    if (!confirm('⚠️ Принудительно запустить финал?')) return;
    
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/debug/force-start-final', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ Финал принудительно запущен!', 'success');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleForceEndFinal = async () => {
    if (!confirm('⚠️ Принудительно завершить финал?')) return;
    
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/debug/force-end-final', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ Финал принудительно завершён!', 'success');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleBecomeFinalist = async () => {
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/debug/become-finalist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ Вы стали финалистом!', 'success');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleResetQualification = async (teamId) => {
    if (!confirm(`⚠️ Сбросить прогресс квалификации для команды ID ${teamId}?`)) return;
    
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/admin/debug/reset-qualification/${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ Прогресс сброшен!', 'success');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ ПОЛНОСТЬЮ ОЧИСТИТЬ БАЗУ ДАННЫХ?\nАдмин будет сохранён!')) return;
    
    setDebugLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/admin/debug/clear-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ База данных очищена и восстановлена!', 'success');
        await loadData();
      } else {
        showToast('Ошибка: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
    } finally {
      setDebugLoading(false);
    }
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
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <h1>⚙️ Админ-панель</h1>
          <p>Управление командами и вопросами</p>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          paddingBottom: '12px',
          flexWrap: 'wrap',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('teams')}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'teams' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === 'teams' ? '#4b8cff' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'teams' ? '600' : '400',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            📋 Команды
          </button>
          <button
            onClick={() => setActiveTab('games')}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'games' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === 'games' ? '#4b8cff' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'games' ? '600' : '400',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🎮 Игры
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'questions' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === 'questions' ? '#4b8cff' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'questions' ? '600' : '400',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            ❓ Вопросы
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            style={{
              padding: '8px 20px',
              borderRadius: '30px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'debug' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: activeTab === 'debug' ? '#ef4444' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'debug' ? '600' : '400',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🐛 Дебаг
          </button>
        </div>

        {/* ===== ВКЛАДКА: КОМАНДЫ ===== */}
        {activeTab === 'teams' && (
          <>
            <div className="admin-section">
              <h2>📋 Создание команд</h2>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Название команды"
                  className="admin-input"
                  style={{ flex: 1, minWidth: '200px' }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
                />
                <button onClick={handleAddTeam} className="btn btn-primary">
                  Добавить
                </button>
              </div>

              <details style={{ marginBottom: '8px' }}>
                <summary style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px' }}>
                  📤 Массовое добавление
                </summary>
                <div style={{ marginTop: '12px' }}>
                  <textarea
                    value={teamNamesInput}
                    onChange={(e) => setTeamNamesInput(e.target.value)}
                    placeholder="Название команды 1&#10;Название команды 2&#10;Название команды 3"
                    className="admin-input"
                    rows={5}
                    style={{ width: '100%' }}
                  />
                  <button onClick={handleBulkAdd} className="btn btn-primary" style={{ marginTop: '8px' }}>
                    Создать все команды
                  </button>
                </div>
              </details>
            </div>

            <div className="admin-section">
              <h2>📊 Список команд ({teams.length})</h2>
              
              {teams.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
                  Пока нет зарегистрированных команд
                </p>
              ) : (
                <div className="admin-table">
                  <div className="admin-table-head">
                    <span>#</span>
                    <span>Команда</span>
                    <span>Код доступа</span>
                    <span>Статус</span>
                    <span style={{ textAlign: 'center' }}>Действия</span>
                  </div>
                  
                  {teams.map((team, index) => (
                    <div key={team.id} className="admin-table-row">
                      <span>{index + 1}</span>
                      <span style={{ fontWeight: '600' }}>{team.name}</span>
                      <span className="team-code" style={{ 
                        fontFamily: 'monospace', 
                        letterSpacing: '2px',
                        color: team.is_activated ? 'rgba(255,255,255,0.3)' : '#f0c564'
                      }}>
                        {team.access_code || '—'}
                      </span>
                      <span style={{ 
                        color: team.is_activated ? '#10b981' : '#f59e0b',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {team.is_activated ? '✅ Активирована' : '⏳ Ожидает'}
                      </span>
                      <span style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          disabled={deletingId === team.id}
                          className="delete-btn"
                          style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            padding: '4px 10px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: '0.2s',
                            opacity: deletingId === team.id ? 0.5 : 1
                          }}
                        >
                          {deletingId === team.id ? '🔄' : '✕'}
                        </button>
                        <button
                          onClick={() => handleResetQualification(team.id)}
                          style={{
                            background: 'rgba(245,158,11,0.15)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: '6px',
                            color: '#f59e0b',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginLeft: '4px'
                          }}
                        >
                          🔄
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ВКЛАДКА: ИГРЫ ===== */}
        {activeTab === 'games' && (
          <div className="admin-section">
            <h2>🎮 Активные сессии</h2>
            
            {sessions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
                Нет активных сессий
              </p>
            ) : (
              <div>
                {sessions.map((session) => {
                  const status = sessionStatuses[session.id];
                  const isReady = session.status === 'ready';
                  const isActive = session.status === 'active';
                  const totalTeams = status?.total || session.total_teams || 0;
                  const readyTeams = status?.ready || session.ready_teams || 0;
                  const allReady = status?.allReady || (totalTeams > 0 && readyTeams === totalTeams);
                  const teams = status?.teams || [];
                  
                  return (
                    <div key={session.id} className="admin-session-card" style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '16px',
                      border: isActive ? '1px solid rgba(16,185,129,0.3)' : 
                              isReady ? '1px solid rgba(240,197,100,0.3)' : 
                              '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{ 
                              color: session.type === 'qualification' ? '#4b8cff' : '#f0c564',
                              fontWeight: '600',
                              fontSize: '16px'
                            }}>
                              {session.type === 'qualification' ? '📚 Отбор' : '🏆 Финал'}
                            </span>
                            <span style={{ 
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: isActive ? 'rgba(16,185,129,0.2)' : 
                                        isReady ? 'rgba(240,197,100,0.2)' : 
                                        'rgba(255,255,255,0.05)',
                              color: isActive ? '#10b981' : 
                                     isReady ? '#f0c564' : 
                                     'rgba(255,255,255,0.4)'
                            }}>
                              {isActive ? '▶ ИГРАЕТ' : 
                               isReady ? '✅ ГОТОВЫ' : 
                               '⏳ ОЖИДАНИЕ'}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: 'rgba(255,255,255,0.3)',
                              fontFamily: 'monospace'
                            }}>
                              ID: {session.id}
                            </span>
                          </div>
                          
                          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                              👥 {totalTeams} команд
                            </span>
                            <span style={{ 
                              fontSize: '13px', 
                              color: readyTeams === totalTeams ? '#10b981' : 'rgba(255,255,255,0.6)'
                            }}>
                              ✅ {readyTeams}/{totalTeams} готовы
                            </span>
                            {session.started_at && (
                              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                                ⏱ {new Date(session.started_at).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isReady && !isActive && allReady ? (
                          <button
                            onClick={() => handleStartAllGame(session.id)}
                            disabled={startingSessionId === session.id}
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              border: 'none',
                              borderRadius: '12px',
                              color: 'white',
                              padding: '12px 24px',
                              fontSize: '16px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
                              opacity: startingSessionId === session.id ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: '180px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            {startingSessionId === session.id ? (
                              '🔄 Запуск...'
                            ) : (
                              '🚀 СТАРТ ДЛЯ ВСЕХ'
                            )}
                          </button>
                        ) : isReady && !isActive && !allReady ? (
                          <div style={{ 
                            padding: '12px 20px', 
                            background: 'rgba(245,158,11,0.15)',
                            borderRadius: '12px',
                            color: '#f59e0b',
                            fontSize: '14px',
                            fontWeight: '500',
                            minWidth: '180px',
                            textAlign: 'center'
                          }}>
                            ⏳ Ожидание готовности
                            <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px' }}>
                              ({readyTeams}/{totalTeams} готовы)
                            </div>
                          </div>
                        ) : isActive ? (
                          <div style={{ 
                            padding: '12px 20px', 
                            background: 'rgba(16,185,129,0.15)',
                            borderRadius: '12px',
                            color: '#10b981',
                            fontSize: '14px',
                            fontWeight: '500',
                            minWidth: '180px',
                            textAlign: 'center'
                          }}>
                            ▶ Игра в процессе...
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '12px 20px', 
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: '14px',
                            minWidth: '180px',
                            textAlign: 'center'
                          }}>
                            ⏳ Ожидание игроков
                          </div>
                        )}
                      </div>
                      
                      {teams.length > 0 && (
                        <div style={{ 
                          marginTop: '16px', 
                          paddingTop: '16px', 
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          {teams.map(team => (
                            <div key={team.id} style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              background: team.is_ready ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                              color: team.is_ready ? '#10b981' : 'rgba(255,255,255,0.4)',
                              fontSize: '13px',
                              fontWeight: team.is_ready ? '600' : '400',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {team.is_ready ? '✅' : '⏳'} {team.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* ФИНАЛЬНЫЕ ЛОББИ */}
            {finalLobbies.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ color: '#f0c564', fontSize: '18px', marginBottom: '16px' }}>🏆 Финальные лобби</h3>
                {finalLobbies.map(lobby => (
                  <div key={lobby.id} className="admin-session-card" style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    border: lobby.game_started ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(240,197,100,0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span style={{ color: '#f0c564', fontWeight: '600' }}>🏆 Финал</span>
                        <span style={{ marginLeft: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                          🆔 #{lobby.id}
                        </span>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                            👥 {lobby.total_teams || 0} команд
                          </span>
                          <span style={{ 
                            fontSize: '13px', 
                            color: lobby.game_started ? '#10b981' : 'rgba(255,255,255,0.6)'
                          }}>
                            {lobby.game_started ? '▶ ИГРАЕТ' : '⏳ ОЖИДАНИЕ'}
                          </span>
                          {lobby.game_finished && (
                            <span style={{ fontSize: '13px', color: '#ef4444' }}>🏁 ЗАВЕРШЕН</span>
                          )}
                        </div>
                        {lobby.team_names && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            Команды: {lobby.team_names}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button 
                onClick={() => loadData()} 
                className="btn btn-outline"
              >
                🔄 Обновить статусы
              </button>
            </div>
          </div>
        )}

        {/* ===== ВКЛАДКА: ВОПРОСЫ ===== */}
        {activeTab === 'questions' && (
          <div className="admin-section">
            <h2>❓ Управление вопросами</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                Тип тура
              </label>
              <select
                value={questionTourType}
                onChange={(e) => setQuestionTourType(e.target.value)}
                className="admin-input"
                style={{ width: '100%', maxWidth: '300px' }}
              >
                <option value="qualification">Отборочный</option>
                <option value="final">Финальный</option>
              </select>
            </div>

            {/* Для отборочного тура - загрузка вопросов */}
            {questionTourType === 'qualification' && (
              <>
                {/* Загрузка из TXT */}
                <div style={{ 
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                    📄 Загрузка из текстового файла
                  </h3>
                  
                  <div style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    marginBottom: '12px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Формат для отборочного тура:</strong>
                    <pre style={{ 
                      margin: '8px 0 0 0', 
                      padding: '8px', 
                      background: 'rgba(0,0,0,0.3)', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.6)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}>
{`1. Текст вопроса
A) Вариант A
B) Вариант B
C) Вариант C
D) Вариант D
Ответ: A

2. Следующий вопрос...`}
                    </pre>
                  </div>
                  
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Вставьте вопросы в формате выше..."
                    className="admin-input"
                    rows={10}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  
                  <button 
                    onClick={handleTxtUpload} 
                    className="btn btn-primary" 
                    style={{ marginTop: '12px' }}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : '📤 Загрузить вопросы'}
                  </button>
                </div>
                
                {/* Загрузка из файла */}
                <div style={{ 
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  padding: '30px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                    id="questionFileInput"
                  />
                  <label htmlFor="questionFileInput" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>
                      {uploading ? 'Загрузка...' : 'Нажмите для загрузки вопросов из файла'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                      Поддерживаются JSON и CSV форматы
                    </div>
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => loadData()} 
                    className="btn btn-outline"
                  >
                    🔄 Обновить список
                  </button>
                </div>

                {/* Список вопросов отборочного тура */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                    📋 Текущие вопросы отборочного тура
                  </h3>
                  <QuestionsList
                    questions={qualificationQuestionsList}
                    type="qualification"
                    onDelete={deleteQualificationQuestion}
                    onClearAll={clearAllQualificationQuestions}
                    onRefresh={loadQualificationQuestionsList}
                    loading={listLoading}
                  />
                </div>
              </>
            )}

            {/* Для финального тура - менеджер категорий и вопросов */}
            {questionTourType === 'final' && (
              <>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                  Добавьте 3 категории и по 5 вопросов в каждую для запуска финала
                </p>
                <FinalQuestionsManager />

                {/* Список вопросов финала */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                    📋 Текущие вопросы финала
                  </h3>
                  <QuestionsList
                    questions={finalQuestionsList}
                    type="final"
                    onDelete={deleteFinalQuestion}
                    onClearAll={clearAllFinalQuestions}
                    onRefresh={loadFinalQuestionsList}
                    loading={listLoading}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== ВКЛАДКА: ДЕБАГ ===== */}
        {activeTab === 'debug' && (
          <div className="admin-section">
            <h2 style={{ color: '#ef4444' }}>🐛 Дебаг-инструменты</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '16px' }}>
              Внимание! Используйте только для тестирования и разработки.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleAddTestTeams}
                disabled={debugLoading}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: debugLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => !debugLoading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
              >
                {debugLoading ? '🔄 Обработка...' : '🤖 ДОБАВИТЬ ТЕСТОВЫЕ КОМАНДЫ'}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  (в финал)
                </span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={handleForceStartFinal}
                  disabled={debugLoading}
                  style={{
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: debugLoading ? 0.6 : 1
                  }}
                >
                  🚀 ЗАПУСТИТЬ ФИНАЛ
                </button>

                <button
                  onClick={handleForceEndFinal}
                  disabled={debugLoading}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: debugLoading ? 0.6 : 1
                  }}
                >
                  🏁 ЗАВЕРШИТЬ ФИНАЛ
                </button>
              </div>

              <button
                onClick={handleBecomeFinalist}
                disabled={debugLoading}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: debugLoading ? 0.6 : 1
                }}
              >
                👑 СТАТЬ ФИНАЛИСТОМ
              </button>

              <button
                onClick={handleClearDatabase}
                disabled={debugLoading}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: '2px solid #ef4444',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: debugLoading ? 0.6 : 1,
                  marginTop: '8px'
                }}
                onMouseEnter={e => !debugLoading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
              >
                {debugLoading ? '🔄 Очистка...' : '💣 ПОЛНОСТЬЮ ОЧИСТИТЬ БД'}
              </button>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.2)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                ⚠️ Все дебаг-функции доступны только администраторам.
              </p>
            </div>
          </div>
        )}

        <button 
          onClick={() => navigate('/main')} 
          className="btn btn-outline" 
          style={{ width: '100%', marginTop: '16px' }}
        >
          ← На главную
        </button>
      </div>
    </div>
  );
}