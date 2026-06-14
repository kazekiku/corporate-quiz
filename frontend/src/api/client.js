// api/client.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔑 [Request] URL:', config.url, 'Token:', token ? '✅ Есть' : '❌ Нет');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('📦 [Response]', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ [Response Error]', error.config?.url, error.response?.status, error.message);
    return Promise.reject(error);
  }
);

const USE_MOCKS = false;

// ==================== API ФУНКЦИИ ====================

// -------------------- Регистрация --------------------
export const register = async (data) => {
  console.log('📝 Регистрация:', data.email);
  const response = await api.post('/auth/register', data);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    console.log('✅ Токен сохранён');
  }
  return response;
};

// -------------------- Текущий пользователь --------------------
export const getMe = async () => {
  console.log('👤 Запрос текущего пользователя');
  const response = await api.get('/auth/me');
  return response;
};

// -------------------- Создание команды --------------------
export const createTeam = async (teamName, gameMode = 'qualification') => {
  console.log('🏢 Создание команды:', teamName);
  const response = await api.post('/team/create', { teamName, gameMode });
  if (response.data.data) {
    localStorage.setItem('teamId', response.data.data.teamId.toString());
    localStorage.setItem('teamName', response.data.data.teamName);
    localStorage.setItem('gameMode', gameMode);
    localStorage.setItem('joinCode', response.data.data.joinCode);
    console.log('✅ Команда создана, ID:', response.data.data.teamId);
  }
  return response;
};

// -------------------- Вход в команду --------------------
export const joinTeam = async (joinCode) => {
  console.log('🔑 Вход в команду по коду:', joinCode);
  const response = await api.post('/team/join', { joinCode });
  if (response.data.data) {
    localStorage.setItem('teamId', response.data.data.teamId.toString());
    localStorage.setItem('teamName', response.data.data.teamName);
    console.log('✅ Вступление успешно, ID команды:', response.data.data.teamId);
  }
  return response;
};

// -------------------- Получение информации о команде --------------------
export const getTeam = async (teamId) => {
  console.log('📋 Получение информации о команде:', teamId);
  const response = await api.get(`/team/${teamId}`);
  return response;
};

// -------------------- Установка готовности --------------------
export const setReady = async (teamId, isReady) => {
  console.log('✅ Установка готовности:', { teamId, isReady });
  const response = await api.post('/team/ready', { teamId, isReady });
  return response;
};

// -------------------- Покинуть команду --------------------
export const leaveTeam = async () => {
  console.log('🚪 Покидание команды');
  const response = await api.post('/team/leave');
  localStorage.removeItem('teamId');
  localStorage.removeItem('teamName');
  localStorage.removeItem('gameMode');
  localStorage.removeItem('joinCode');
  return response;
};

// -------------------- Вопросы для отборочного тура --------------------
export const getQualificationQuestions = async (gameMode = 'qualification') => {
  console.log('📚 Запрос вопросов, режим:', gameMode);
  const response = await api.get('/qualification/questions', { params: { gameMode } });
  console.log('📚 Получено вопросов:', response.data?.data?.length);
  return response;
};

// -------------------- Прогресс отборочного тура --------------------
export const saveQualificationProgress = async (teamId, progress) => {
  console.log('💾 Сохранение прогресса для команды:', teamId);
  const response = await api.post('/qualification/progress', { teamId, progress });
  return response;
};

export const getQualificationProgress = async (teamId) => {
  console.log('📖 Запрос прогресса для команды:', teamId);
  const response = await api.get(`/qualification/progress/${teamId}`);
  return response;
};

export const resetQualificationProgress = async (teamId) => {
  console.log('🗑️ Сброс прогресса для команды:', teamId);
  const response = await api.delete(`/qualification/progress/${teamId}`);
  return response;
};

// -------------------- Рейтинг --------------------
export const getRating = async () => {
  console.log('📊 Запрос рейтинга');
  const response = await api.get('/rating');
  return response;
};

// -------------------- Debug: Добавление бота --------------------
export const addBotToTeam = async (teamId) => {
  console.log('🤖 Добавление бота в команду:', teamId);
  const response = await api.post(`/team/${teamId}/add-bot`);
  return response;
};

// -------------------- Финал --------------------
export const createFinalLobby = async (teamId) => {
  console.log('🏆 Создание финального лобби для команды:', teamId);
  const response = await api.post('/final/create', { teamId });
  return response;
};

export const getFinalLobby = async (sessionId) => {
  console.log('🏆 Получение финального лобби:', sessionId);
  const response = await api.get(`/final/lobby/${sessionId}`);
  return response;
};

export const setFinalTeamReady = async (sessionId, teamId) => {
  console.log('✅ Готовность команды в финале:', { sessionId, teamId });
  const response = await api.post('/final/ready', { sessionId, teamId });
  return response;
};

export const startFinalGame = async (sessionId) => {
  console.log('🎮 Старт финальной игры:', sessionId);
  const response = await api.post(`/final/start/${sessionId}`);
  return response;
};

export const getFinalBoard = async (sessionId) => {
  console.log('🎮 Получение игрового поля финала:', sessionId);
  const response = await api.get(`/final/board/${sessionId}`);
  return response;
};

export const pickQuestion = async (sessionId, categoryId, value) => {
  console.log('❓ Выбор вопроса:', { sessionId, categoryId, value });
  const response = await api.post('/final/pick', { sessionId, categoryId, value });
  return response;
};

export const submitFinalAnswer = async (sessionId, questionId, answer, bet) => {
  console.log('💬 Отправка ответа в финале:', { sessionId, questionId, bet });
  const response = await api.post('/final/answer', { sessionId, questionId, answer, bet });
  return response;
};

// -------------------- Завершение отборочного тура --------------------
export const completeQualification = async (teamId) => {
  console.log('🏁 Завершение квалификации для команды:', teamId);
  const response = await api.post(`/qualification/complete/${teamId}`);
  return response;
};

// -------------------- Получение статуса финалиста --------------------
export const getFinalistStatus = async (teamId) => {
  console.log('👑 Запрос статуса финалиста для команды:', teamId);
  const response = await api.get(`/team/${teamId}/finalist-status`);
  return response;
};

// -------------------- Обновление счёта команды --------------------
export const updateTeamScore = async (teamId, score) => {
  console.log('📈 Обновление счёта команды:', { teamId, score });
  const response = await api.post('/team/update-score', { teamId, score });
  return response;
};

export const getMyFinalistStatus = async () => {
    console.log('👑 Запрос статуса финалиста для текущего пользователя');
    const response = await api.get('/auth/finalist-status');
    console.log('👑 Ответ сервера:', response.data);
    return response;
};
// Создание финальной команды
export const createFinalTeam = async (sessionId, teamName) => {
  console.log('🏆 Создание финальной команды:', { sessionId, teamName });
  const response = await api.post('/final/team/create', { sessionId, teamName });
  return response;
};

// Вступление в финальную команду
export const joinFinalTeam = async (sessionId, code) => {
  console.log('🔑 Вступление в финальную команду:', { sessionId, code });
  const response = await api.post('/final/team/join', { sessionId, code });
  return response;
};
export const getMyFinalTeam = async (sessionId) => {
    console.log('👥 Получение моей команды в финале:', sessionId);
    const response = await api.get(`/final/my-team/${sessionId}`);
    return response;
};