// backend/src/routes/finalRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const FINAL_LOBBY_ID = 'FINAL';

// ============================================================
// ЕДИНАЯ ФУНКЦИЯ: получить или создать лобби и добавить пользователя
// ============================================================
async function getOrCreateLobbyAndAddUser(userId) {
  console.log('🔍 getOrCreateLobbyAndAddUser START для userId:', userId);
  
  const userCheck = await query('SELECT id FROM users WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    console.error('❌ Пользователь не найден в БД:', userId);
    throw new Error(`Пользователь с ID ${userId} не найден в базе данных`);
  }
  console.log('✅ Пользователь найден в БД:', userId);
  
  const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
  if (!user[0]?.team_id) {
    throw new Error('Вы не состоите в отделе');
  }
  console.log('✅ Команда пользователя ID:', user[0].team_id);
  
  const teamId = user[0].team_id;
  const team = await query('SELECT name, is_finalist FROM teams WHERE id = ?', [teamId]);
  
  if (team.length === 0 || !team[0].is_finalist) {
    throw new Error('Ваш отдел не является финалистом');
  }
  console.log('✅ Команда пользователя:', team[0].name);
  
  let lobby = await query('SELECT * FROM final_lobbies WHERE session_id = ?', ['FINAL']);
  if (lobby.length === 0) {
    const result = await query('INSERT INTO final_lobbies (session_id, game_started, game_finished) VALUES (?, ?, ?)', ['FINAL', false, false]);
    lobby = [{ id: result.insertId, session_id: 'FINAL', game_started: false, game_finished: false }];
    console.log('✅ Создано новое лобби ID:', lobby[0].id);
  } else {
    console.log('✅ Лобби уже существует ID:', lobby[0].id);
  }
  
  const lobbyId = lobby[0].id;
  
  let existingTeam = await query(
    'SELECT id FROM final_teams WHERE lobby_id = ? AND name = ?',
    [lobbyId, team[0].name]
  );
  
  let finalTeamId;
  if (existingTeam.length === 0) {
    const result = await query(
      'INSERT INTO final_teams (lobby_id, name, score) VALUES (?, ?, ?)',
      [lobbyId, team[0].name, 0]
    );
    finalTeamId = result.insertId;
    console.log('✅ Создана команда в лобби:', team[0].name, 'ID:', finalTeamId);
  } else {
    finalTeamId = existingTeam[0].id;
    console.log('✅ Команда уже существует в лобби:', team[0].name, 'ID:', finalTeamId);
  }
  
  const existingParticipant = await query(
    'SELECT id FROM final_participants WHERE lobby_id = ? AND team_id = ? AND user_id = ?',
    [lobbyId, finalTeamId, userId]
  );
  
  if (existingParticipant.length === 0) {
    const userExists = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userExists.length === 0) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: user_id', userId, 'не существует в таблице users!');
      throw new Error(`user_id ${userId} не существует в таблице users`);
    }
    
    console.log('✅ user_id', userId, 'существует в users, добавляем в final_participants');
    
    await query(
      'INSERT INTO final_participants (lobby_id, team_id, user_id, is_ready) VALUES (?, ?, ?, ?)',
      [lobbyId, finalTeamId, userId, false]
    );
    console.log('✅ Пользователь добавлен в final_participants');
  } else {
    console.log('✅ Пользователь уже в final_participants');
  }
  
  return { lobbyId, lobby: lobby[0], finalTeamId, teamName: team[0].name };
}

// ============================================================
// ЕДИНАЯ ФУНКЦИЯ: получить все команды с участниками
// ============================================================
async function getTeamsWithParticipants(lobbyId) {
  const teams = await query(`
    SELECT 
      ft.id, 
      ft.name, 
      ft.score, 
      GROUP_CONCAT(DISTINCT fp.user_id) as participants,
      GROUP_CONCAT(DISTINCT fp.is_ready) as ready_status
    FROM final_teams ft
    LEFT JOIN final_participants fp ON ft.id = fp.team_id AND fp.lobby_id = ?
    WHERE ft.lobby_id = ?
    GROUP BY ft.id
  `, [lobbyId, lobbyId]);
  
  return teams.map(t => {
    const participantIds = t.participants ? t.participants.split(',').map(Number) : [];
    const readyStatuses = t.ready_status ? t.ready_status.split(',').map(s => s === '1') : [];
    const allReady = participantIds.length > 0 && readyStatuses.every(r => r === true);
    
    return {
      id: t.id,
      name: t.name,
      score: t.score || 0,
      isReady: allReady,
      participants: participantIds
    };
  });
}

// ============================================================
// ФУНКЦИЯ: вычисление результатов с логикой "Своей игры"
// ============================================================
async function calculateResults(lobbyId, questionId) {
  console.log('📊 НАЧАЛО calculateResults для вопроса:', questionId);
  
  const question = await query('SELECT value_points, correct_answer FROM final_questions WHERE id = ?', [questionId]);
  const questionValue = question[0]?.value_points || 0;
  const correctAnswer = question[0]?.correct_answer || '';
  console.log('💰 Стоимость вопроса:', questionValue);
  console.log('✅ Правильный ответ:', correctAnswer);
  
  const lobby = await query('SELECT question_started_at, current_turn_team_id FROM final_lobbies WHERE id = ?', [lobbyId]);
  const startTime = new Date(lobby[0].question_started_at);
  const currentTeamId = lobby[0].current_turn_team_id;
  console.log('🕐 Время начала:', startTime);
  console.log('🏷️ Текущая команда (чей ход был):', currentTeamId);
  
  const answers = await query(`
    SELECT ft.id as team_id, ft.name as team_name, fa.answer, fa.answered_at, fa.is_correct
    FROM final_answers fa
    JOIN final_teams ft ON fa.team_id = ft.id
    WHERE fa.lobby_id = ? AND fa.question_id = ?
  `, [lobbyId, questionId]);
  
  console.log('📝 Найдено ответов:', answers.length);
  
  if (answers.length === 0) {
    console.log('⚠️ Нет ответов!');
    const emptyResults = {
      teams: [],
      nextTurnTeamId: currentTeamId,
      turnReason: 'Никто не ответил → ход остаётся у текущей команды',
      hasCorrectAnswer: false,
      currentTeamId: currentTeamId,
      gameFinished: false,
      gameResults: null,
      correctAnswer: correctAnswer
    };
    await query('UPDATE final_lobbies SET current_results = ?, results_shown = 0 WHERE id = ?', 
      [JSON.stringify(emptyResults), lobbyId]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobbyId]);
    return;
  }
  
  const results = [];
  let correctTeamIds = [];
  
  for (const answer of answers) {
    const timeSpent = (new Date(answer.answered_at) - startTime) / 1000;
    let points = 0;
    
    if (answer.is_correct) {
      points = questionValue;
      if (timeSpent < 30) {
        const speedBonus = Math.floor(questionValue * (1 - timeSpent / 30) * 0.5);
        points += speedBonus;
        console.log(`⚡ Бонус за скорость для ${answer.team_name}: ${speedBonus}`);
      }
      correctTeamIds.push(answer.team_id);
    }
    
    results.push({
      team_id: answer.team_id,
      team_name: answer.team_name,
      answer: answer.answer || '—',
      is_correct: answer.is_correct,
      timeSpent: Math.round(timeSpent * 10) / 10,
      points: points
    });
    
    if (points > 0) {
      await query('UPDATE final_teams SET score = score + ? WHERE id = ?', [points, answer.team_id]);
      console.log(`✅ Команда ${answer.team_name} получила +${points} баллов`);
    }
  }
  
  results.sort((a, b) => b.points - a.points);
  
  let nextTurnTeamId = null;
  let turnReason = '';
  
  if (correctTeamIds.length > 0) {
    const correctResults = results.filter(r => r.is_correct);
    const winner = correctResults.reduce((a, b) => a.points > b.points ? a : b);
    nextTurnTeamId = winner.team_id;
    turnReason = `✅ ${winner.team_name} ответил правильно и продолжает`;
    console.log(`🏆 Продолжает: ${winner.team_name} с ${winner.points} очками`);
  } else {
    nextTurnTeamId = currentTeamId;
    turnReason = `❌ Никто не ответил правильно → ход остаётся у команды ${currentTeamId}`;
    console.log(`🔄 Никто не ответил, ход остаётся у команды ${currentTeamId}`);
  }
  
  const usedQuestions = await query('SELECT COUNT(*) as count FROM final_used_questions WHERE lobby_id = ?', [lobbyId]);
  const totalQuestions = await query('SELECT COUNT(*) as count FROM final_questions');
  const allQuestionsUsed = usedQuestions[0].count >= totalQuestions[0].count;
  
  console.log(`📊 Использовано вопросов: ${usedQuestions[0].count} из ${totalQuestions[0].count}`);
  console.log(`🏁 Все вопросы использованы: ${allQuestionsUsed}`);
  
  let gameFinished = false;
  let gameResults = null;
  
  if (allQuestionsUsed) {
    gameFinished = true;
    console.log('🏁 ВСЕ ВОПРОСЫ ИСПОЛЬЗОВАНЫ! ИГРА ЗАВЕРШЕНА!');
    
    const finalTeams = await query(`
      SELECT id, name, score FROM final_teams 
      WHERE lobby_id = ? 
      ORDER BY score DESC
    `, [lobbyId]);
    
    gameResults = finalTeams;
    console.log('📊 Финальные результаты:', gameResults);
    
    await query('UPDATE final_lobbies SET game_started = 0, game_finished = 1 WHERE id = ?', [lobbyId]);
  }
  
  console.log('📊 Итоговые результаты раунда:', JSON.stringify(results, null, 2));
  
  const resultsData = {
    question: {
      category: 'Вопрос',
      value: questionValue,
      text: 'Вопрос'
    },
    teams: results,
    nextTurnTeamId: nextTurnTeamId,
    turnReason: turnReason,
    hasCorrectAnswer: correctTeamIds.length > 0,
    currentTeamId: currentTeamId,
    gameFinished: gameFinished,
    gameResults: gameResults,
    correctAnswer: correctAnswer
  };
  
  await query('UPDATE final_lobbies SET current_results = ?, results_shown = 0 WHERE id = ?', 
    [JSON.stringify(resultsData), lobbyId]);
  console.log('💾 Результаты сохранены в current_results');
  
  await query('UPDATE final_lobbies SET current_question_id = NULL WHERE id = ?', [lobbyId]);
  console.log('🧹 Текущий вопрос очищен');
  console.log('🏷️ current_turn_team_id сохранён:', currentTeamId);
}

// ============================================================
// МАРШРУТЫ
// ============================================================

// Получение информации о лобби
router.get('/lobby-info', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 /lobby-info START для userId:', userId);
    
    const { lobbyId, lobby } = await getOrCreateLobbyAndAddUser(userId);
    const formattedTeams = await getTeamsWithParticipants(lobbyId);
    
    const myTeam = formattedTeams.find(t => t.participants?.includes(userId)) || null;
    console.log('👤 Моя команда найдена?', !!myTeam);
    if (myTeam) {
      console.log('👤 Моя команда:', myTeam.name, 'участники:', myTeam.participants);
    }
    
    const allReady = formattedTeams.length === 3 && formattedTeams.every(t => t.isReady === true);
    console.log('🎮 Все готовы?', allReady, 'Команд:', formattedTeams.length);
    
    if (allReady && !lobby.game_started) {
      await query('UPDATE final_lobbies SET game_started = TRUE WHERE id = ?', [lobbyId]);
      const teamIds = formattedTeams.map(t => t.id);
      const randomIndex = Math.floor(Math.random() * teamIds.length);
      await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teamIds[randomIndex], lobbyId]);
      console.log('🎮 Финал начат! Первый ход у команды', teamIds[randomIndex]);
    }
    
    const updatedLobby = await query('SELECT game_started FROM final_lobbies WHERE id = ?', [lobbyId]);
    
    res.json({ 
      success: true, 
      data: { 
        teams: formattedTeams,
        gameStarted: updatedLobby[0]?.game_started === 1,
        myTeam: myTeam
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка в /lobby-info:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Установка готовности
router.post('/ready', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 /ready START для userId:', userId);
    
    const { lobbyId, finalTeamId } = await getOrCreateLobbyAndAddUser(userId);
    
    await query(`
      UPDATE final_participants SET is_ready = TRUE 
      WHERE lobby_id = ? AND team_id = ? AND user_id = ?
    `, [lobbyId, finalTeamId, userId]);
    
    console.log('✅ Пользователь', userId, 'готов');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка в /ready:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Добавление тестовых команд (для дебага)
router.post('/add-test-teams', verifyToken, async (req, res) => {
  try {
    console.log('🧪 /add-test-teams START');
    
    const user = await query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (user[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Только администратор может добавлять тестовые команды' });
    }
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Лобби не найдено' });
    }
    
    const lobbyId = lobby[0].id;
    const existingTeams = await query('SELECT COUNT(*) as count FROM final_teams WHERE lobby_id = ?', [lobbyId]);
    const currentCount = existingTeams[0].count;
    const neededCount = Math.max(0, 3 - currentCount);
    
    console.log('🧪 Нужно добавить команд:', neededCount);
    
    if (neededCount === 0) {
      return res.json({ 
        success: true, 
        message: 'Уже есть 3 команды', 
        addedCount: 0,
        totalCount: currentCount 
      });
    }
    
    let addedCount = 0;
    const testTeamNames = ['Тестовая команда A', 'Тестовая команда B', 'Тестовая команда C'];
    
    for (let i = 0; i < neededCount; i++) {
      const teamName = testTeamNames[currentCount + i] || `Тестовая команда ${currentCount + i + 1}`;
      
      const testAccessCode = `TEST${String(Math.random().toString(36).substring(2, 5).toUpperCase())}`;
      let teamId;
      
      const existingTeam = await query('SELECT id FROM teams WHERE name = ?', [teamName]);
      if (existingTeam.length > 0) {
        teamId = existingTeam[0].id;
      } else {
        const teamResult = await query(
          'INSERT INTO teams (name, access_code, is_activated) VALUES (?, ?, ?)',
          [teamName, testAccessCode, true]
        );
        teamId = teamResult.insertId;
        console.log(`✅ Создана тестовая команда: ${teamName} (ID: ${teamId})`);
      }
      
      const result = await query(
        'INSERT INTO final_teams (lobby_id, name, score) VALUES (?, ?, ?)',
        [lobbyId, teamName, 0]
      );
      const finalTeamId = result.insertId;
      console.log(`✅ Команда добавлена в финал: ${teamName} (final_team_id: ${finalTeamId})`);
      
      const testEmail = `test_${teamName.replace(/\s/g, '_')}_${Date.now()}@quiz.local`;
      const testUserName = `Тестовый игрок ${teamName}`;
      
      let userId;
      const existingUser = await query('SELECT id FROM users WHERE email = ?', [testEmail]);
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
      } else {
        const userResult = await query(
          'INSERT INTO users (team_id, full_name, email, role, is_finalist) VALUES (?, ?, ?, ?, ?)',
          [teamId, testUserName, testEmail, 'member', true]
        );
        userId = userResult.insertId;
        console.log(`✅ Создан тестовый пользователь: ${testUserName} (ID: ${userId})`);
      }
      
      await query(
        'INSERT INTO final_participants (lobby_id, team_id, user_id, is_ready) VALUES (?, ?, ?, ?)',
        [lobbyId, finalTeamId, userId, true]
      );
      console.log(`✅ Участник добавлен в финал (готов): ${testUserName}`);
      
      addedCount++;
    }
    
    const allTeams = await query(`
      SELECT ft.id, ft.name, 
             GROUP_CONCAT(fp.is_ready) as ready_status
      FROM final_teams ft
      LEFT JOIN final_participants fp ON ft.id = fp.team_id
      WHERE ft.lobby_id = ?
      GROUP BY ft.id
    `, [lobbyId]);
    
    const allReady = allTeams.length === 3 && allTeams.every(t => {
      const statuses = t.ready_status ? t.ready_status.split(',').map(s => s === '1') : [];
      return statuses.every(r => r === true);
    });
    
    console.log(`🧪 Всего команд в финале: ${allTeams.length}, все готовы: ${allReady}`);
    
    if (allReady && allTeams.length === 3) {
      await query('UPDATE final_lobbies SET game_started = TRUE WHERE id = ?', [lobbyId]);
      
      const teamIds = allTeams.map(t => t.id);
      const randomIndex = Math.floor(Math.random() * teamIds.length);
      await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teamIds[randomIndex], lobbyId]);
      
      console.log(`🎮 Финал автоматически запущен!`);
    }
    
    res.json({ 
      success: true, 
      addedCount, 
      totalCount: currentCount + addedCount,
      allReady: allReady,
      message: allReady ? '✅ Все команды готовы! Финал запущен!' : `Добавлено ${addedCount} команд (${currentCount + addedCount}/3)`
    });
  } catch (error) {
    console.error('❌ Ошибка в /add-test-teams:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получение игрового поля
router.get('/board', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🎮 /board START для userId:', userId);
    
    const { lobbyId, lobby } = await getOrCreateLobbyAndAddUser(userId);
    const gameStarted = lobby.game_started === 1;
    const gameFinished = lobby.game_finished === 1;
    
    console.log('📊 Текущий вопрос ID:', lobby.current_question_id);
    console.log('📊 results_shown:', lobby.results_shown);
    console.log('📊 current_results:', lobby.current_results ? 'ЕСТЬ' : 'НЕТ');
    console.log('🏷️ current_turn_team_id:', lobby.current_turn_team_id);
    console.log('🏁 game_finished:', gameFinished);
    
    const formattedTeams = await getTeamsWithParticipants(lobbyId);
    
    const categories = [
      { id: 1, name: "Кодировка Фано", questions: [] },
      { id: 2, name: "Количество информации", questions: [] },
      { id: 3, name: "Комбинаторика", questions: [] }
    ];
    
    const questions = await query('SELECT * FROM final_questions');
    const usedQuestions = await query('SELECT category_id, value_points FROM final_used_questions WHERE lobby_id = ?', [lobbyId]);
    const usedSet = new Set(usedQuestions.map(q => `${q.category_id}_${q.value_points}`));
    
    for (const q of questions) {
      const cat = categories.find(c => c.id === q.category_id);
      if (cat) {
        cat.questions.push({
          id: q.id,
          value: q.value_points,
          question: q.question_text,
          answer: q.correct_answer,
          isUsed: usedSet.has(`${q.category_id}_${q.value_points}`)
        });
      }
    }
    
    let currentQuestion = null;
    let allTeamsAnswered = false;
    let timeEnded = false;
    let userAnswers = {};
    
    if (lobby.current_question_id) {
      const question = await query(`
        SELECT fq.id, fq.category_id, fq.value_points, fq.question_text, fc.name as category_name
        FROM final_questions fq
        JOIN final_categories fc ON fq.category_id = fc.id
        WHERE fq.id = ?
      `, [lobby.current_question_id]);
      
      if (question.length > 0) {
        const timePassed = (Date.now() - new Date(lobby.question_started_at).getTime()) / 1000;
        currentQuestion = {
          id: question[0].id,
          categoryId: question[0].category_id,
          category: question[0].category_name,
          value: question[0].value_points,
          text: question[0].question_text,
          timePassed: timePassed
        };
        
        const answers = await query('SELECT team_id, is_correct FROM final_answers WHERE lobby_id = ? AND question_id = ?', 
          [lobbyId, lobby.current_question_id]);
        
        const answeredTeamIds = answers.map(a => a.team_id);
        
        const realAnswers = await query(`
          SELECT team_id FROM final_answers 
          WHERE lobby_id = ? AND question_id = ? AND answer != '—'
        `, [lobbyId, lobby.current_question_id]);
        
        const realAnsweredTeamIds = realAnswers.map(a => a.team_id);
        const allRealAnswered = formattedTeams.every(t => realAnsweredTeamIds.includes(t.id));
        
        // ИСПРАВЛЕНО: время 360 секунд (6 минут)
        const FINAL_TIME_LIMIT = 360;
        timeEnded = timePassed >= FINAL_TIME_LIMIT;
        allTeamsAnswered = allRealAnswered || timeEnded;
        
        console.log('⏱ Время прошло:', Math.round(timePassed), 'сек, timeEnded:', timeEnded);
        console.log('👥 Реально ответили:', realAnsweredTeamIds.length, 'из', formattedTeams.length);
        console.log('👥 Все реально ответили:', allRealAnswered);
        console.log('👥 allTeamsAnswered (для отображения):', allTeamsAnswered);
        
        const userTeam = formattedTeams.find(t => t.participants?.includes(userId));
        if (userTeam) {
          userAnswers[userId] = realAnsweredTeamIds.includes(userTeam.id);
        }
        
        if (timeEnded) {
          const allTeamIds = formattedTeams.map(t => t.id);
          const notAnsweredTeamIds = allTeamIds.filter(id => !realAnsweredTeamIds.includes(id));
          
          if (notAnsweredTeamIds.length > 0) {
            console.log('⏰ Время вышло, добавляем пустые ответы для:', notAnsweredTeamIds);
            
            for (const teamId of notAnsweredTeamIds) {
              const existing = await query(
                'SELECT id FROM final_answers WHERE lobby_id = ? AND team_id = ? AND question_id = ?',
                [lobbyId, teamId, lobby.current_question_id]
              );
              
              if (existing.length === 0) {
                await query(`
                  INSERT INTO final_answers (lobby_id, team_id, question_id, answer, answered_at, is_correct)
                  VALUES (?, ?, ?, ?, NOW(), ?)
                `, [lobbyId, teamId, lobby.current_question_id, '—', false]);
                console.log(`➕ Добавлен пустой ответ для команды ${teamId}`);
              }
            }
            
            console.log('📊 ЗАПУСКАЕМ calculateResults');
            await calculateResults(lobbyId, lobby.current_question_id);
            console.log('✅ calculateResults ЗАВЕРШЁН');
          } else if (!lobby.current_results) {
            console.log('📊 Все ответили реально, запускаем calculateResults');
            await calculateResults(lobbyId, lobby.current_question_id);
            console.log('✅ calculateResults ЗАВЕРШЁН');
          }
        } else if (allRealAnswered && !lobby.current_results) {
          console.log('📊 Все ответили реально, запускаем calculateResults');
          await calculateResults(lobbyId, lobby.current_question_id);
          console.log('✅ calculateResults ЗАВЕРШЁН');
        }
      }
    }
    
    let showResults = false;
    let results = null;
    
    if (lobby.current_results) {
      try {
        if (typeof lobby.current_results === 'string') {
          results = JSON.parse(lobby.current_results);
          showResults = lobby.results_shown === 0;
          console.log('📊 ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ:', results);
        } else if (typeof lobby.current_results === 'object') {
          results = lobby.current_results;
          showResults = lobby.results_shown === 0;
          console.log('📊 ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ (объект):', results);
        } else {
          console.warn('⚠️ current_results имеет неподдерживаемый тип:', typeof lobby.current_results);
          await query('UPDATE final_lobbies SET current_results = NULL WHERE id = ?', [lobbyId]);
        }
      } catch (e) {
        console.error('❌ Ошибка парсинга результатов:', e);
        console.log('📄 current_results значение:', lobby.current_results);
        await query('UPDATE final_lobbies SET current_results = NULL, results_shown = 0 WHERE id = ?', [lobbyId]);
        showResults = false;
        results = null;
      }
    }
    
    res.json({ 
      success: true, 
      data: { 
        categories, 
        teams: formattedTeams,
        currentTurnTeamId: lobby.current_turn_team_id,
        gameStarted,
        gameFinished: gameFinished,
        currentQuestion,
        allTeamsAnswered,
        timeEnded,
        showResults,
        results,
        userAnswers
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка в /board:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Выбор вопроса
router.post('/pick', verifyToken, async (req, res) => {
  try {
    const { categoryId, value } = req.body;
    const userId = req.user.id;
    
    console.log('📖 Выбор вопроса:', { categoryId, value, userId });
    
    const lobby = await query('SELECT id, current_turn_team_id, game_started, game_finished FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0 || !lobby[0].game_started) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    if (lobby[0].game_finished === 1) {
      return res.status(400).json({ success: false, message: 'Игра уже завершена!' });
    }
    
    const lobbyId = lobby[0].id;
    const currentTurnTeamId = lobby[0].current_turn_team_id;
    
    const userTeam = await query(`
      SELECT ft.id FROM final_teams ft
      JOIN final_participants fp ON ft.id = fp.team_id
      WHERE ft.lobby_id = ? AND fp.user_id = ?
    `, [lobbyId, userId]);
    
    if (userTeam.length === 0) {
      return res.status(403).json({ success: false, message: 'Вы не в игре' });
    }
    
    if (currentTurnTeamId !== userTeam[0].id) {
      return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
    }
    
    const question = await query('SELECT * FROM final_questions WHERE category_id = ? AND value_points = ?', [categoryId, value]);
    if (question.length === 0) {
      return res.status(404).json({ success: false, message: 'Вопрос не найден' });
    }
    
    const used = await query('SELECT id FROM final_used_questions WHERE lobby_id = ? AND category_id = ? AND value_points = ?', 
      [lobbyId, categoryId, value]);
    if (used.length > 0) {
      return res.status(400).json({ success: false, message: 'Вопрос уже использован' });
    }
    
    await query('INSERT INTO final_used_questions (lobby_id, category_id, value_points) VALUES (?, ?, ?)', 
      [lobbyId, categoryId, value]);
    
    await query('DELETE FROM final_answers WHERE lobby_id = ?', [lobbyId]);
    console.log('🧹 Очищены старые ответы для лобби', lobbyId);
    
    const categories = ['Кодировка Фано', 'Количество информации', 'Комбинаторика'];
    
    await query(`
      UPDATE final_lobbies 
      SET current_question_id = ?, question_started_at = NOW(), results_shown = 0, current_results = NULL
      WHERE id = ?
    `, [question[0].id, lobbyId]);
    
    console.log('✅ Вопрос выбран:', question[0].id);
    console.log('🏷️ current_turn_team_id сохранён:', currentTurnTeamId);
    
    res.json({ 
      success: true, 
      data: {
        id: question[0].id,
        categoryId: categoryId,
        category: categories[categoryId - 1],
        value: value,
        text: question[0].question_text,
        correctAnswer: question[0].correct_answer,
        points: question[0].value_points,
        timePassed: 0
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка в /pick:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ответ на вопрос
router.post('/answer', verifyToken, async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    const userId = req.user.id;
    
    console.log('📝 Ответ на вопрос:', { questionId, answer, userId });
    
    const lobby = await query('SELECT id, current_question_id, question_started_at, game_finished FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    if (lobby[0].game_finished === 1) {
      return res.status(400).json({ success: false, message: 'Игра уже завершена!' });
    }
    
    const lobbyId = lobby[0].id;
    const currentQuestionId = lobby[0].current_question_id;
    
    if (!currentQuestionId || currentQuestionId !== questionId) {
      return res.status(400).json({ success: false, message: 'Нет активного вопроса' });
    }
    
    const timePassed = (Date.now() - new Date(lobby[0].question_started_at).getTime()) / 1000;
    // ИСПРАВЛЕНО: время 360 секунд (6 минут)
    const FINAL_TIME_LIMIT = 360;
    if (timePassed > FINAL_TIME_LIMIT) {
      return res.status(400).json({ success: false, message: 'Время вышло!' });
    }
    
    const userTeam = await query(`
      SELECT ft.id FROM final_teams ft
      JOIN final_participants fp ON ft.id = fp.team_id
      WHERE ft.lobby_id = ? AND fp.user_id = ?
    `, [lobbyId, userId]);
    
    if (userTeam.length === 0) {
      return res.status(403).json({ success: false, message: 'Вы не в игре' });
    }
    
    const existingAnswer = await query(
      'SELECT id FROM final_answers WHERE lobby_id = ? AND team_id = ? AND question_id = ?',
      [lobbyId, userTeam[0].id, questionId]
    );
    
    if (existingAnswer.length > 0) {
      return res.status(400).json({ success: false, message: 'Ваша команда уже ответила' });
    }
    
    const question = await query('SELECT correct_answer, value_points FROM final_questions WHERE id = ?', [questionId]);
    const isCorrect = question[0]?.correct_answer?.toLowerCase().trim() === answer.toLowerCase().trim();
    
    await query(`
      INSERT INTO final_answers (lobby_id, team_id, question_id, answer, answered_at, is_correct)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `, [lobbyId, userTeam[0].id, questionId, answer, isCorrect]);
    
    console.log('✅ Ответ сохранён, isCorrect:', isCorrect);
    
    const realAnswers = await query(`
      SELECT team_id FROM final_answers 
      WHERE lobby_id = ? AND question_id = ? AND answer != '—'
    `, [lobbyId, questionId]);
    
    const realAnsweredTeamIds = realAnswers.map(a => a.team_id);
    const allTeams = await query('SELECT id FROM final_teams WHERE lobby_id = ?', [lobbyId]);
    const allRealAnswered = allTeams.every(t => realAnsweredTeamIds.includes(t.id));
    
    const timeEnded = timePassed >= FINAL_TIME_LIMIT;
    
    console.log(`👥 Реально ответили: ${realAnsweredTeamIds.length} из ${allTeams.length}`);
    console.log(`✅ Все реально ответили: ${allRealAnswered}, ⏰ Время вышло: ${timeEnded}`);
    
    if (timeEnded || allRealAnswered) {
      if (timeEnded && !allRealAnswered) {
        console.log('⏰ Время вышло, добавляем пустые ответы...');
        const notAnswered = allTeams.filter(t => !realAnsweredTeamIds.includes(t.id));
        
        for (const team of notAnswered) {
          const existing = await query(
            'SELECT id FROM final_answers WHERE lobby_id = ? AND team_id = ? AND question_id = ?',
            [lobbyId, team.id, questionId]
          );
          
          if (existing.length === 0) {
            await query(`
              INSERT INTO final_answers (lobby_id, team_id, question_id, answer, answered_at, is_correct)
              VALUES (?, ?, ?, ?, NOW(), ?)
            `, [lobbyId, team.id, questionId, '—', false]);
            console.log(`➕ Добавлен пустой ответ для команды ${team.id}`);
          }
        }
      }
      
      console.log('📊 ЗАПУСКАЕМ calculateResults');
      await calculateResults(lobbyId, questionId);
      console.log('✅ calculateResults ЗАВЕРШЁН');
    } else {
      console.log('⏳ Ждём остальные команды...');
    }
    
    res.json({ success: true, isCorrect });
  } catch (error) {
    console.error('❌ Ошибка в /answer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Следующий ход
router.post('/next-turn', verifyToken, async (req, res) => {
  try {
    console.log('🔄 /next-turn START');
    
    const lobby = await query('SELECT id, current_results, current_turn_team_id, game_finished FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    if (lobby[0].game_finished === 1) {
      console.log('🏁 Игра уже завершена!');
      
      const finalTeams = await query(`
        SELECT id, name, score FROM final_teams 
        WHERE lobby_id = ? 
        ORDER BY score DESC
      `, [lobby[0].id]);
      
      return res.json({ 
        success: true, 
        gameFinished: true,
        results: finalTeams,
        message: 'Игра завершена'
      });
    }
    
    let nextTeamId = null;
    let turnReason = '';
    let currentTeamId = lobby[0].current_turn_team_id;
    
    console.log('🏷️ Текущий ход до переключения:', currentTeamId);
    
    if (lobby[0].current_results) {
      try {
        let resultsData;
        if (typeof lobby[0].current_results === 'string') {
          resultsData = JSON.parse(lobby[0].current_results);
        } else {
          resultsData = lobby[0].current_results;
        }
        
        if (resultsData.nextTurnTeamId) {
          nextTeamId = resultsData.nextTurnTeamId;
          turnReason = resultsData.turnReason || '';
          console.log(`📊 Использую nextTurnTeamId из результатов: ${nextTeamId}`);
          console.log(`📊 Причина: ${turnReason}`);
          
          if (resultsData.gameFinished) {
            console.log('🏁 Игра завершена! (из результатов)');
            await query('UPDATE final_lobbies SET game_started = 0, game_finished = 1 WHERE id = ?', [lobby[0].id]);
            
            const finalTeams = await query(`
              SELECT id, name, score FROM final_teams 
              WHERE lobby_id = ? 
              ORDER BY score DESC
            `, [lobby[0].id]);
            
            return res.json({ 
              success: true, 
              gameFinished: true,
              results: finalTeams,
              message: 'Игра завершена'
            });
          }
        }
      } catch (e) {
        console.error('❌ Ошибка парсинга результатов:', e);
        await query('UPDATE final_lobbies SET current_results = NULL WHERE id = ?', [lobby[0].id]);
      }
    }
    
    if (!nextTeamId) {
      nextTeamId = currentTeamId;
      turnReason = `🔄 Ход остаётся у команды ${currentTeamId}`;
      console.log(`🔄 Ход остаётся у команды ${currentTeamId}`);
    }
    
    await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [nextTeamId, lobby[0].id]);
    await query('UPDATE final_lobbies SET results_shown = 1 WHERE id = ?', [lobby[0].id]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobby[0].id]);
    await query('UPDATE final_lobbies SET current_results = NULL WHERE id = ?', [lobby[0].id]);
    
    console.log(`🔄 Ход применён для команды ${nextTeamId}`);
    console.log(`📝 Причина: ${turnReason}`);
    
    const check = await query('SELECT current_turn_team_id FROM final_lobbies WHERE id = ?', [lobby[0].id]);
    console.log(`✅ Проверка: current_turn_team_id = ${check[0].current_turn_team_id}`);
    
    res.json({ success: true, nextTeamId, turnReason });
  } catch (error) {
    console.error('❌ Ошибка в /next-turn:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Принудительный старт (дебаг)
router.post('/force-start', verifyToken, async (req, res) => {
  try {
    console.log('🚀 /force-start START');
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Лобби не найдено' });
    }
    
    await query('UPDATE final_lobbies SET game_started = 1 WHERE id = ?', [lobby[0].id]);
    
    const teams = await query('SELECT id FROM final_teams WHERE lobby_id = ?', [lobby[0].id]);
    if (teams.length > 0) {
      const randomIndex = Math.floor(Math.random() * teams.length);
      await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teams[randomIndex].id, lobby[0].id]);
      console.log('🚀 Первый ход у команды:', teams[randomIndex].id);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка в /force-start:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Завершить игру (дебаг)
router.post('/end-game', verifyToken, async (req, res) => {
  try {
    console.log('🏁 /end-game START');
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    const lobbyId = lobby[0].id;
    
    const finalTeams = await query(`
      SELECT id, name, score FROM final_teams 
      WHERE lobby_id = ? 
      ORDER BY score DESC
    `, [lobbyId]);
    
    await query('DELETE FROM final_answers WHERE lobby_id = ?', [lobbyId]);
    await query('DELETE FROM final_used_questions WHERE lobby_id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET game_started = 0, game_finished = 1 WHERE id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET current_results = NULL, results_shown = 0 WHERE id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobbyId]);
    
    console.log('🏁 Игра завершена, все данные очищены');
    
    res.json({ 
      success: true, 
      results: finalTeams
    });
  } catch (error) {
    console.error('❌ Ошибка в /end-game:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Добавление баллов (дебаг)
router.post('/add-points', verifyToken, async (req, res) => {
  try {
    const { points } = req.body;
    const userId = req.user.id;
    console.log('💰 /add-points:', { points, userId });
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    const userTeam = await query(`
      SELECT ft.id FROM final_teams ft
      JOIN final_participants fp ON ft.id = fp.team_id
      WHERE ft.lobby_id = ? AND fp.user_id = ?
    `, [lobby[0].id, userId]);
    
    if (userTeam.length === 0) {
      return res.status(404).json({ success: false, message: 'Команда не найдена' });
    }
    
    await query('UPDATE final_teams SET score = score + ? WHERE id = ?', [points, userTeam[0].id]);
    console.log('💰 Добавлено', points, 'баллов команде', userTeam[0].id);
    
    res.json({ success: true, addedPoints: points });
  } catch (error) {
    console.error('❌ Ошибка в /add-points:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получение результатов для рейтинга
router.get('/results', verifyToken, async (req, res) => {
  try {
    console.log('📊 /results START');
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    const teams = await query(`
      SELECT ft.id, ft.name, ft.score
      FROM final_teams ft
      WHERE ft.lobby_id = ?
      ORDER BY ft.score DESC
    `, [lobby[0].id]);
    
    console.log('📊 Найдено команд для рейтинга:', teams.length);
    
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('❌ Ошибка в /results:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Сброс состояния игры (дебаг)
router.post('/reset-game', verifyToken, async (req, res) => {
  try {
    console.log('🔄 /reset-game START');
    
    const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    const lobbyId = lobby[0].id;
    
    await query('DELETE FROM final_answers WHERE lobby_id = ?', [lobbyId]);
    await query('DELETE FROM final_used_questions WHERE lobby_id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET current_results = NULL, results_shown = 0 WHERE id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET game_finished = 0 WHERE id = ?', [lobbyId]);
    
    const firstTeam = await query('SELECT id FROM final_teams WHERE lobby_id = ? LIMIT 1', [lobbyId]);
    if (firstTeam.length > 0) {
      await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [firstTeam[0].id, lobbyId]);
      console.log('🔄 Ход сброшен на команду:', firstTeam[0].id);
    }
    
    console.log('🧹 Все данные очищены');
    
    res.json({ success: true, message: 'Игра сброшена' });
  } catch (error) {
    console.error('❌ Ошибка в /reset-game:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ПРИНУДИТЕЛЬНОЕ ДОБАВЛЕНИЕ В ЛОББИ (дебаг)
router.post('/join', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔧 /join START для userId:', userId);
    
    const result = await getOrCreateLobbyAndAddUser(userId);
    console.log('🔧 /join УСПЕШНО завершён');
    
    res.json({ success: true, teamId: result.finalTeamId, userId: userId });
  } catch (error) {
    console.error('❌ Ошибка в /join:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ПРИНУДИТЕЛЬНО ПОКАЗАТЬ РЕЗУЛЬТАТЫ (дебаг)
router.post('/show-results', verifyToken, async (req, res) => {
  try {
    console.log('📊 /show-results START');
    
    const lobby = await query('SELECT id, current_results FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    if (!lobby[0].current_results) {
      return res.status(400).json({ success: false, message: 'Нет результатов для показа' });
    }
    
    await query('UPDATE final_lobbies SET results_shown = 0 WHERE id = ?', [lobby[0].id]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobby[0].id]);
    
    console.log('📊 Результаты принудительно показаны');
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка в /show-results:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ В БД (дебаг)
router.get('/debug-user/:userId', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log('🔍 /debug-user для userId:', userId);
    
    const user = await query('SELECT id, full_name, email, team_id, is_finalist FROM users WHERE id = ?', [userId]);
    const inFinalParticipants = await query('SELECT * FROM final_participants WHERE user_id = ?', [userId]);
    
    res.json({
      success: true,
      user: user[0] || null,
      inFinalParticipants: inFinalParticipants
    });
  } catch (error) {
    console.error('❌ Ошибка в /debug-user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ПРИНУДИТЕЛЬНО ПЕРЕКЛЮЧИТЬ ХОД (дебаг)
router.post('/debug-next-turn', verifyToken, async (req, res) => {
  try {
    console.log('🔄 /debug-next-turn START');
    
    const lobby = await query('SELECT id, current_turn_team_id FROM final_lobbies WHERE session_id = ?', ['FINAL']);
    if (lobby.length === 0) {
      return res.status(404).json({ success: false, message: 'Игра не найдена' });
    }
    
    const lobbyId = lobby[0].id;
    const currentTeamId = lobby[0].current_turn_team_id;
    
    const teams = await query('SELECT id FROM final_teams WHERE lobby_id = ? ORDER BY id', [lobbyId]);
    if (teams.length === 0) {
      return res.status(404).json({ success: false, message: 'Нет команд' });
    }
    
    let currentIndex = teams.findIndex(t => t.id === currentTeamId);
    if (currentIndex === -1) currentIndex = 0;
    
    const nextIndex = (currentIndex + 1) % teams.length;
    const nextTeamId = teams[nextIndex].id;
    
    console.log(`🔄 Принудительное переключение: ${currentTeamId} → ${nextTeamId}`);
    
    await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [nextTeamId, lobbyId]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobbyId]);
    await query('UPDATE final_lobbies SET current_results = NULL, results_shown = 1 WHERE id = ?', [lobbyId]);
    
    const check = await query('SELECT current_turn_team_id FROM final_lobbies WHERE id = ?', [lobbyId]);
    console.log(`✅ Ход переключён на команду ${check[0].current_turn_team_id}`);
    
    res.json({ 
      success: true, 
      nextTeamId: nextTeamId,
      previousTeamId: currentTeamId
    });
  } catch (error) {
    console.error('❌ Ошибка в /debug-next-turn:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;