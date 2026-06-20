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

// Регистрация по коду (без пароля)
export const registerTeam = async (data) => {
  const response = await api.post('/auth/register', data);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

// Вход по коду (без пароля)
export const loginByCode = async (accessCode) => {
  const response = await api.post('/auth/login', { accessCode });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

// Админ-вход (без пароля, по email)
export const adminLogin = async (email) => {
  const response = await api.post('/auth/admin-login', { email });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

// Получение текущего пользователя
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response;
};

// Стать финалистом (дебаг)
export const becomeFinalist = async () => {
  const response = await api.post('/auth/become-finalist');
  return response;
};

// Статус финалиста пользователя
export const getMyFinalistStatus = async () => {
  const response = await api.get('/auth/finalist-status');
  return response;
};

// ========== КОМАНДЫ ==========

// Создание команды (отдела)
export const createTeam = async (teamName) => {
  const response = await api.post('/team/create', { teamName });
  if (response.data.data) {
    localStorage.setItem('teamId', response.data.data.teamId.toString());
    localStorage.setItem('teamName', response.data.data.teamName);
  }
  return response;
};

// Получение информации о команде
export const getTeam = async (teamId) => {
  const response = await api.get(`/team/${teamId}`);
  return response;
};

// Статус финалиста для отдела
export const getTeamFinalistStatus = async (teamId) => {
  const response = await api.get(`/team/${teamId}/finalist-status`);
  return response;
};

// Обновление счёта
export const updateTeamScore = async (teamId, score) => {
  const response = await api.post('/team/update-score', { teamId, score });
  return response;
};

// ========== КВАЛИФИКАЦИЯ ==========

// Вопросы для отборочного тура
export const getQualificationQuestions = async () => {
  const response = await api.get('/qualification/questions');
  return response;
};

// Сохранение прогресса
export const saveQualificationProgress = async (teamId, progress) => {
  const response = await api.post('/qualification/progress', { teamId, progress });
  return response;
};

// Получение прогресса
export const getQualificationProgress = async (teamId) => {
  const response = await api.get(`/qualification/progress/${teamId}`);
  return response;
};

// Сброс прогресса
export const resetQualificationProgress = async (teamId) => {
  const response = await api.delete(`/qualification/progress/${teamId}`);
  return response;
};

// Завершение квалификации
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

// Получение информации о лобби
export const getFinalLobbyInfo = async () => {
  const response = await api.get('/final/lobby-info');
  return response;
};

// Установка готовности
export const setFinalTeamReady = async () => {
  const response = await api.post('/final/ready');
  return response;
};

// Получение игрового поля
export const getFinalBoard = async () => {
  console.log('🎮 Получение игрового поля финала');
  const response = await api.get('/final/board');
  console.log('🎮 Ответ сервера:', response.data);
  return response;
};

// Выбор вопроса
export const pickQuestion = async (categoryId, value) => {
  const response = await api.post('/final/pick', { categoryId, value });
  return response;
};

// Ответ на вопрос
export const submitFinalAnswer = async (questionId, answer) => {
  const response = await api.post('/final/answer', { questionId, answer });
  return response;
};

// Получение состояния игры
export const getFinalGameState = async () => {
  const response = await api.get('/final/state');
  return response;
};

// Следующий ход
export const nextTurn = async () => {
  const response = await api.post('/final/next-turn');
  return response;
};

// Добавить баллы (дебаг)
export const addPointsToTeam = async (points) => {
  const response = await api.post('/final/add-points', { points });
  return response;
};

// Получение финальных результатов
export const getFinalResults = async () => {
  const response = await api.get('/final/results');
  return response;
};

// ============ АДМИН-ПАНЕЛЬ ============

// Получение всех команд
export const getTeams = async () => {
  const response = await api.get('/admin/teams');
  return response;
};

// Генерация кодов для команд
export const generateTeamCodes = async (teamNames) => {
  const response = await api.post('/admin/teams/generate-codes', { teamNames });
  return response;
};

// Удаление команды
export const deleteTeam = async (teamId) => {
  const response = await api.delete(`/admin/teams/${teamId}`);
  return response;
};

// Загрузка вопросов
export const uploadQuestions = async (questions, tourType) => {
  const response = await api.post('/admin/questions/upload', { questions, tourType });
  return response;
};

// Получение вопросов
export const getAdminQuestions = async (tourType) => {
  const response = await api.get(`/admin/questions${tourType ? `?tourType=${tourType}` : ''}`);
  return response;
};

// Получение игр
export const getGames = async () => {
  const response = await api.get('/admin/games');
  return response;
};

// Создание отборочной игры
export const createQualificationGame = async (gameId, teamIds) => {
  const response = await api.post('/admin/games/qualification', { gameId, teamIds });
  return response;
};

// Создание финальной игры
export const createFinalGame = async (gameId, teamIds) => {
  const response = await api.post('/admin/games/final', { gameId, teamIds });
  return response;
};

// Запуск игры
export const startGame = async (type, id) => {
  const response = await api.post(`/admin/games/${type}/${id}/start`);
  return response;
};

// Завершение игры
export const finishGame = async (type, id) => {
  const response = await api.post(`/admin/games/${type}/${id}/finish`);
  return response;
};

// Получение результатов игры
export const getGameResults = async (type, id) => {
  const response = await api.get(`/admin/games/${type}/${id}/results`);
  return response;
};

// Добавление видео
export const addVideo = async (data) => {
  const response = await api.post('/admin/videos', data);
  return response;
};

// ============ ИГРОВЫЕ СЕССИИ ============

// Создание игровой сессии
export const createGameSession = async (type) => {
  const response = await api.post('/game/create', { type });
  return response;
};

// Установка готовности
export const setGameReady = async (sessionId) => {
  const response = await api.post('/game/ready', { sessionId });
  return response;
};

// Получение статуса сессии
export const getSessionStatus = async (sessionId) => {
  const response = await api.get(`/game/status/${sessionId}`);
  return response;
};

// Админ: старт игры
export const adminStartGame = async (sessionId) => {
  const response = await api.post('/game/admin/start', { sessionId });
  return response;
};

// Админ: все сессии
export const getAdminSessions = async () => {
  const response = await api.get('/game/admin/sessions');
  return response;
};

// Админ: старт для всех команд одновременно
export const adminStartAllGame = async (sessionId) => {
  const response = await api.post('/game/admin/start-all', { sessionId });
  return response;
};

// Админ: статус готовности всех команд
export const getAdminSessionStatus = async (sessionId) => {
  const response = await api.get(`/game/admin/session-status/${sessionId}`);
  return response;
};

// ============ ДЕБАГ-ФУНКЦИИ ДЛЯ АДМИНА ============

// Добавление тестовых команд в финал
export const addTestTeams = async () => {
  const response = await api.post('/admin/debug/add-test-teams');
  return response;
};

// Принудительный запуск финала
export const forceStartFinalAdmin = async () => {
  const response = await api.post('/admin/debug/force-start-final');
  return response;
};

// Принудительное завершение финала
export const forceEndFinalAdmin = async () => {
  const response = await api.post('/admin/debug/force-end-final');
  return response;
};

// Стать финалистом (дебаг для админа)
export const becomeFinalistAdmin = async () => {
  const response = await api.post('/admin/debug/become-finalist');
  return response;
};

// Сброс прогресса квалификации для команды
export const resetQualificationAdmin = async (teamId) => {
  const response = await api.post(`/admin/debug/reset-qualification/${teamId}`);
  return response;
};

// Полная очистка базы данных
export const clearDatabaseAdmin = async () => {
  const response = await api.post('/admin/debug/clear-database');
  return response;
};

// ============ СТАРЫЕ ДЕБАГ-ФУНКЦИИ (ДЛЯ СОВМЕСТИМОСТИ) ============

// Принудительный старт финала (старый метод)
export const forceStartFinalOld = async () => {
  const response = await api.post('/final/force-start');
  return response;
};

// Завершить игру (старый метод)
export const endFinalGameOld = async () => {
  const response = await api.post('/final/end-game');
  return response;
};
export const uploadQuestionsTxt = async (text, tourType) => {
  const response = await api.post('/admin/questions/upload-txt', { text, tourType });
  return response;
};
// frontend/src/api/client.js - добавить в конец файла

// ============ ФИНАЛЬНЫЕ ВОПРОСЫ (АДМИН) ============

// Получить все категории финала
export const getFinalCategories = async () => {
  const response = await api.get('/admin/final-categories');
  return response;
};


export const checkFinalReady = async () => {
  const response = await api.get('/admin/final-ready');
  return response;
};

export const VIDEOS = [
  {
    id: 1,
    title: 'Вступление к игре',
    url: '/videos/intro.mp4',
    type: 'intro'
  },
  {
    id: 2,
    title: 'Переход между турами',
    url: '/videos/between_tours.mp4',
    type: 'between_tours'
  },
  {
    id: 3,
    title: 'Финальное видео',
    url: '/videos/final.mp4',
    type: 'outro'
  }
];

// Вместо запроса к серверу, просто возвращаем конфиг
export const getVideos = async () => {
  return { data: { data: VIDEOS } };
};
export default api;