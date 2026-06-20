// frontend/src/api/client.js

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data?.message || error.message);
    return Promise.reject(error);
  }
);

// ==================== АПИ ФУНКЦИИ ====================

// ========== АУТЕНТИФИКАЦИЯ ==========

export const registerTeam = async (data) => {
  const response = await api.post('/auth/register', data);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const loginByCode = async (accessCode) => {
  const response = await api.post('/auth/login', { accessCode });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const adminLogin = async (email) => {
  const response = await api.post('/auth/admin-login', { email });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response;
};

export const becomeFinalist = async () => {
  const response = await api.post('/auth/become-finalist');
  return response;
};

export const getMyFinalistStatus = async () => {
  const response = await api.get('/auth/finalist-status');
  return response;
};

// ========== КОМАНДЫ ==========

export const createTeam = async (teamName) => {
  const response = await api.post('/team/create', { teamName });
  if (response.data.data) {
    localStorage.setItem('teamId', response.data.data.teamId.toString());
    localStorage.setItem('teamName', response.data.data.teamName);
  }
  return response;
};

export const getTeam = async (teamId) => {
  const response = await api.get(`/team/${teamId}`);
  return response;
};

export const getTeamFinalistStatus = async (teamId) => {
  const response = await api.get(`/team/${teamId}/finalist-status`);
  return response;
};

export const updateTeamScore = async (teamId, score) => {
  const response = await api.post('/team/update-score', { teamId, score });
  return response;
};

// ========== КВАЛИФИКАЦИЯ ==========

export const getQualificationQuestions = async () => {
  const response = await api.get('/qualification/questions');
  return response;
};

export const saveQualificationProgress = async (teamId, progress) => {
  const response = await api.post('/qualification/progress', { teamId, progress });
  return response;
};

export const getQualificationProgress = async (teamId) => {
  const response = await api.get(`/qualification/progress/${teamId}`);
  return response;
};

export const resetQualificationProgress = async (teamId) => {
  const response = await api.delete(`/qualification/progress/${teamId}`);
  return response;
};

export const completeQualification = async (teamId) => {
  const response = await api.post(`/qualification/complete/${teamId}`);
  return response;
};

// ========== РЕЙТИНГ ==========

export const getRating = async () => {
  const response = await api.get('/rating');
  return response;
};

// ========== ФИНАЛ ==========

export const getFinalLobbyInfo = async () => {
  const response = await api.get('/final/lobby-info');
  return response;
};

export const setFinalTeamReady = async () => {
  const response = await api.post('/final/ready');
  return response;
};

export const getFinalBoard = async () => {
  console.log('🎮 Получение игрового поля финала');
  const response = await api.get('/final/board');
  console.log('🎮 Ответ сервера:', response.data);
  return response;
};

export const pickQuestion = async (categoryId, value) => {
  const response = await api.post('/final/pick', { categoryId, value });
  return response;
};

export const submitFinalAnswer = async (questionId, answer) => {
  const response = await api.post('/final/answer', { questionId, answer });
  return response;
};

export const getFinalGameState = async () => {
  const response = await api.get('/final/state');
  return response;
};

export const nextTurn = async () => {
  const response = await api.post('/final/next-turn');
  return response;
};

export const addPointsToTeam = async (points) => {
  const response = await api.post('/final/add-points', { points });
  return response;
};

export const getFinalResults = async () => {
  const response = await api.get('/final/results');
  return response;
};

// ============ АДМИН-ПАНЕЛЬ ============

export const getTeams = async () => {
  const response = await api.get('/admin/teams');
  return response;
};

export const generateTeamCodes = async (teamNames) => {
  const response = await api.post('/admin/teams/generate-codes', { teamNames });
  return response;
};

export const deleteTeam = async (teamId) => {
  const response = await api.delete(`/admin/teams/${teamId}`);
  return response;
};

export const uploadQuestions = async (questions, tourType) => {
  const response = await api.post('/admin/questions/upload', { questions, tourType });
  return response;
};

export const getAdminQuestions = async (tourType) => {
  const response = await api.get(`/admin/questions${tourType ? `?tourType=${tourType}` : ''}`);
  return response;
};

export const getGames = async () => {
  const response = await api.get('/admin/games');
  return response;
};

export const createQualificationGame = async (gameId, teamIds) => {
  const response = await api.post('/admin/games/qualification', { gameId, teamIds });
  return response;
};

export const createFinalGame = async (gameId, teamIds) => {
  const response = await api.post('/admin/games/final', { gameId, teamIds });
  return response;
};

export const startGame = async (type, id) => {
  const response = await api.post(`/admin/games/${type}/${id}/start`);
  return response;
};

export const finishGame = async (type, id) => {
  const response = await api.post(`/admin/games/${type}/${id}/finish`);
  return response;
};

export const getGameResults = async (type, id) => {
  const response = await api.get(`/admin/games/${type}/${id}/results`);
  return response;
};

// ============ ИГРОВЫЕ СЕССИИ ============

export const createGameSession = async (type) => {
  const response = await api.post('/game/create', { type });
  return response;
};

export const setGameReady = async (sessionId) => {
  const response = await api.post('/game/ready', { sessionId });
  return response;
};

export const getSessionStatus = async (sessionId) => {
  const response = await api.get(`/game/status/${sessionId}`);
  return response;
};

export const adminStartGame = async (sessionId) => {
  const response = await api.post('/game/admin/start', { sessionId });
  return response;
};

export const getAdminSessions = async () => {
  const response = await api.get('/game/admin/sessions');
  return response;
};

export const adminStartAllGame = async (sessionId) => {
  const response = await api.post('/game/admin/start-all', { sessionId });
  return response;
};

export const getAdminSessionStatus = async (sessionId) => {
  const response = await api.get(`/game/admin/session-status/${sessionId}`);
  return response;
};

// ============ УПРАВЛЕНИЕ ВОПРОСАМИ ============

export const getQualificationQuestionsAdmin = async () => {
  const response = await api.get('/admin/qualification-questions');
  return response;
};

export const deleteQualificationQuestion = async (id) => {
  const response = await api.delete(`/admin/qualification-questions/${id}`);
  return response;
};

export const clearAllQualificationQuestions = async () => {
  const response = await api.delete('/admin/qualification-questions');
  return response;
};

export const getFinalQuestionsAll = async () => {
  const response = await api.get('/admin/final-questions-all');
  return response;
};

export const clearAllFinalQuestions = async () => {
  const response = await api.delete('/admin/final-questions');
  return response;
};

// ============ ФИНАЛЬНЫЕ ВОПРОСЫ (АДМИН) ============
// ЭТА СЕКЦИЯ НУЖНА ДЛЯ AdminPanel

export const getFinalCategories = async () => {
  const response = await api.get('/admin/final-categories');
  return response;
};

export const addFinalCategory = async (name) => {
  const response = await api.post('/admin/final-categories', { name });
  return response;
};

export const deleteFinalCategory = async (id) => {
  const response = await api.delete(`/admin/final-categories/${id}`);
  return response;
};

export const getFinalQuestionsByCategory = async (categoryId) => {
  const response = await api.get(`/admin/final-questions/${categoryId}`);
  return response;
};

export const addFinalQuestion = async (data) => {
  const response = await api.post('/admin/final-questions', data);
  return response;
};


export const deleteFinalQuestion = async (id) => {
  const response = await api.delete(`/admin/final-questions/${id}`);
  return response;
};

export const checkFinalReady = async () => {
  const response = await api.get('/admin/final-ready');
  return response;
};

// ============ ДЕБАГ-ФУНКЦИИ ============

export const addTestTeams = async () => {
  const response = await api.post('/admin/debug/add-test-teams');
  return response;
};

export const forceStartFinalAdmin = async () => {
  const response = await api.post('/admin/debug/force-start-final');
  return response;
};

export const forceEndFinalAdmin = async () => {
  const response = await api.post('/admin/debug/force-end-final');
  return response;
};

export const becomeFinalistAdmin = async () => {
  const response = await api.post('/admin/debug/become-finalist');
  return response;
};

export const resetQualificationAdmin = async (teamId) => {
  const response = await api.post(`/admin/debug/reset-qualification/${teamId}`);
  return response;
};

export const clearDatabaseAdmin = async () => {
  const response = await api.post('/admin/debug/clear-database');
  return response;
};

// ============ СТАРЫЕ ФУНКЦИИ ============

export const forceStartFinalOld = async () => {
  const response = await api.post('/final/force-start');
  return response;
};

export const endFinalGameOld = async () => {
  const response = await api.post('/final/end-game');
  return response;
};

export default api;