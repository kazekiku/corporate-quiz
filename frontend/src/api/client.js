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

// Регистрация (создание отдела)
export const register = async (data) => {
  const response = await api.post('/auth/register', data);
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

// Рейтинг
export const getRating = async () => {
  const response = await api.get('/rating');
  return response;
};

// Завершение квалификации
export const completeQualification = async (teamId) => {
  const response = await api.post(`/qualification/complete/${teamId}`);
  return response;
};

// Статус финалиста для отдела
export const getTeamFinalistStatus = async (teamId) => {
  const response = await api.get(`/team/${teamId}/finalist-status`);
  return response;
};

// Статус финалиста пользователя
export const getMyFinalistStatus = async () => {
  const response = await api.get('/auth/finalist-status');
  return response;
};

// Обновление счёта
export const updateTeamScore = async (teamId, score) => {
  const response = await api.post('/team/update-score', { teamId, score });
  return response;
};

// Стать финалистом (дебаг)
export const becomeFinalist = async () => {
  const response = await api.post('/auth/become-finalist');
  return response;
};

// ==================== ФИНАЛ (НОВАЯ МЕХАНИКА) ====================

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
  const response = await api.get('/final/board');
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

// Следующий ход (переключение на следующую команду)
export const nextTurn = async () => {
  const response = await api.post('/final/next-turn');
  return response;
};

// Принудительный старт (дебаг)
export const forceStartFinal = async () => {
  const response = await api.post('/final/force-start');
  return response;
};

// Завершить игру (дебаг)
export const endFinalGame = async () => {
  const response = await api.post('/final/end-game');
  return response;
};

// Добавить баллы (дебаг)
export const addPointsToTeam = async (points) => {
  const response = await api.post('/final/add-points', { points });
  return response;
};