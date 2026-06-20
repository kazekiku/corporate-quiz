// backend/src/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Проверка прав админа
const isAdmin = async (userId) => {
  const user = await query('SELECT role FROM users WHERE id = ?', [userId]);
  return user[0]?.role === 'admin';
};

// Вспомогательная функция для проверки количества категорий
async function isMaxCategoriesReached() {
  const count = await query('SELECT COUNT(*) as count FROM final_categories');
  return count[0].count >= 3;
}

// ============================================================
// УПРАВЛЕНИЕ КОМАНДАМИ
// ============================================================

// Получение всех команд
router.get('/teams', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const teams = await query('SELECT * FROM teams ORDER BY created_at DESC');
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Генерация кодов доступа для команд (из списка)
router.post('/teams/generate-codes', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { teamNames } = req.body;
    
    const results = [];
    for (const name of teamNames) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = await query(
        'INSERT INTO teams (name, access_code) VALUES (?, ?)',
        [name, code]
      );
      results.push({ id: result.insertId, name, code });
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удаление команды
router.delete('/teams/:id', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { id } = req.params;
    
    const team = await query('SELECT * FROM teams WHERE id = ?', [id]);
    if (team.length === 0) {
      return res.status(404).json({ success: false, message: 'Команда не найдена' });
    }
    
    await query('DELETE FROM teams WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Команда удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления команды:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// УПРАВЛЕНИЕ ВОПРОСАМИ
// ============================================================

// Загрузка вопросов из TXT файла (для отбора и финала)
router.post('/questions/upload-txt', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { text, tourType } = req.body;
    
    if (!text || !tourType) {
      return res.status(400).json({ success: false, message: 'Не указан текст или тип тура' });
    }
    
    let inserted = 0;
    
    if (tourType === 'qualification') {
      // Парсинг для отборочного тура
      const lines = text.split('\n').filter(line => line.trim());
      let currentQuestion = null;
      let options = {};
      let correctAnswer = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^\d+\./)) {
          if (currentQuestion) {
            await query(`
              INSERT INTO qualification_questions 
              (question_text, option_a, option_b, option_c, option_d, correct_answer)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              currentQuestion,
              options.A || '',
              options.B || '',
              options.C || '',
              options.D || '',
              correctAnswer
            ]);
            inserted++;
          }
          currentQuestion = trimmed.replace(/^\d+\.\s*/, '');
          options = {};
          correctAnswer = '';
        } else if (trimmed.match(/^[A-Da-d]\)/)) {
          const key = trimmed.charAt(0).toUpperCase();
          const value = trimmed.replace(/^[A-Da-d]\)\s*/, '');
          options[key] = value;
        } else if (trimmed.toLowerCase().includes('ответ:')) {
          const match = trimmed.match(/ответ:\s*([A-Da-d])/i);
          if (match) {
            correctAnswer = match[1].toUpperCase();
          }
        }
      }
      
      if (currentQuestion) {
        await query(`
          INSERT INTO qualification_questions 
          (question_text, option_a, option_b, option_c, option_d, correct_answer)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          currentQuestion,
          options.A || '',
          options.B || '',
          options.C || '',
          options.D || '',
          correctAnswer
        ]);
        inserted++;
      }
      
    } else if (tourType === 'final') {
      // Парсинг для финала - 3 категории по 5 вопросов
      const lines = text.split('\n').filter(line => line.trim());
      let currentCategory = null;
      let currentCategoryName = '';
      let currentQuestion = null;
      let currentAnswer = '';
      let questionsInCategory = 0;
      
      // Очищаем старые категории и вопросы
      await query('DELETE FROM final_questions');
      await query('DELETE FROM final_categories');
      await query('ALTER TABLE final_categories AUTO_INCREMENT = 1');
      await query('ALTER TABLE final_questions AUTO_INCREMENT = 1');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Проверяем, не заголовок ли это категории
        if (!trimmed.match(/^\d+\./) && 
            !trimmed.toLowerCase().includes('ответ:') && 
            trimmed.length > 0 &&
            trimmed !== '---' &&
            trimmed !== '___' &&
            !trimmed.match(/^[A-Da-d]\)/)) {
          
          // Сохраняем предыдущий вопрос, если он был
          if (currentQuestion && currentCategory) {
            if (questionsInCategory < 5) {
              const points = [100, 200, 300, 400, 500][questionsInCategory];
              await query(`
                INSERT INTO final_questions 
                (category_id, value_points, question_text, correct_answer)
                VALUES (?, ?, ?, ?)
              `, [
                currentCategory,
                points,
                currentQuestion,
                currentAnswer
              ]);
              inserted++;
              questionsInCategory++;
            } else {
              console.warn(`⚠️ В категории "${currentCategoryName}" уже 5 вопросов, пропускаем: ${currentQuestion}`);
            }
          }
          
          // Проверяем, не достигнут ли лимит в 3 категории
          if (await isMaxCategoriesReached()) {
            console.warn('⚠️ Уже 3 категории, пропускаем: ' + trimmed);
            currentCategory = null;
            currentQuestion = null;
            currentAnswer = '';
            questionsInCategory = 0;
            continue;
          }
          
          // Начинаем новую категорию
          const categoryName = trimmed.replace(/^[\d\s\.\-]+/, '').trim();
          currentCategoryName = categoryName;
          
          const existingCategory = await query('SELECT id FROM final_categories WHERE name = ?', [categoryName]);
          if (existingCategory.length > 0) {
            currentCategory = existingCategory[0].id;
          } else {
            const result = await query(
              'INSERT INTO final_categories (name, display_order) VALUES (?, ?)',
              [categoryName, 0]
            );
            currentCategory = result.insertId;
            console.log(`📂 Создана категория: ${categoryName} (ID: ${currentCategory})`);
          }
          
          currentQuestion = null;
          currentAnswer = '';
          questionsInCategory = 0;
          continue;
        }
        
        // Вопрос с номером
        if (trimmed.match(/^\d+\./)) {
          // Сохраняем предыдущий вопрос, если есть
          if (currentQuestion && currentCategory) {
            if (questionsInCategory < 5) {
              const points = [100, 200, 300, 400, 500][questionsInCategory];
              await query(`
                INSERT INTO final_questions 
                (category_id, value_points, question_text, correct_answer)
                VALUES (?, ?, ?, ?)
              `, [
                currentCategory,
                points,
                currentQuestion,
                currentAnswer
              ]);
              inserted++;
              questionsInCategory++;
            } else {
              console.warn(`⚠️ В категории "${currentCategoryName}" уже 5 вопросов, пропускаем: ${currentQuestion}`);
            }
          }
          // Начинаем новый вопрос
          currentQuestion = trimmed.replace(/^\d+\.\s*/, '');
          currentAnswer = '';
        } else if (trimmed.toLowerCase().includes('ответ:')) {
          // Правильный ответ
          const match = trimmed.match(/ответ:\s*(.+)/i);
          if (match) {
            currentAnswer = match[1].trim();
          }
        }
      }
      
      // Сохраняем последний вопрос
      if (currentQuestion && currentCategory) {
        if (questionsInCategory < 5) {
          const points = [100, 200, 300, 400, 500][questionsInCategory];
          await query(`
            INSERT INTO final_questions 
            (category_id, value_points, question_text, correct_answer)
            VALUES (?, ?, ?, ?)
          `, [
            currentCategory,
            points,
            currentQuestion,
            currentAnswer
          ]);
          inserted++;
          questionsInCategory++;
        } else {
          console.warn(`⚠️ В категории "${currentCategoryName}" уже 5 вопросов, пропускаем: ${currentQuestion}`);
        }
      }
      
      // Обновляем display_order для категорий (максимум 3)
      const categories = await query('SELECT id FROM final_categories ORDER BY id LIMIT 3');
      for (let i = 0; i < categories.length; i++) {
        await query('UPDATE final_categories SET display_order = ? WHERE id = ?', [i + 1, categories[i].id]);
      }
    }
    
    res.json({ success: true, message: `Загружено ${inserted} вопросов` });
  } catch (error) {
    console.error('❌ Ошибка загрузки вопросов из TXT:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Загрузка вопросов из JSON/CSV (старый метод)
router.post('/questions/upload', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { questions, tourType } = req.body;
    
    let inserted = 0;
    if (tourType === 'qualification') {
      for (const q of questions) {
        await query(`
          INSERT INTO qualification_questions 
          (question_text, option_a, option_b, option_c, option_d, correct_answer)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_answer
        ]);
        inserted++;
      }
    } else if (tourType === 'final') {
      for (const q of questions) {
        const categoryResult = await query(
          'SELECT id FROM final_categories WHERE name = ?',
          [q.category || 'Общие']
        );
        let categoryId = categoryResult[0]?.id;
        if (!categoryId) {
          const newCategory = await query(
            'INSERT INTO final_categories (name) VALUES (?)',
            [q.category || 'Общие']
          );
          categoryId = newCategory.insertId;
        }
        
        await query(`
          INSERT INTO final_questions 
          (category_id, value_points, question_text, correct_answer)
          VALUES (?, ?, ?, ?)
        `, [
          categoryId,
          q.points || 100,
          q.question_text,
          q.correct_answer
        ]);
        inserted++;
      }
    }
    
    res.json({ success: true, message: `Загружено ${inserted} вопросов` });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получение всех вопросов
router.get('/questions', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { tourType } = req.query;
    
    let questions = [];
    if (tourType === 'qualification') {
      questions = await query('SELECT * FROM qualification_questions ORDER BY id');
    } else if (tourType === 'final') {
      questions = await query(`
        SELECT fq.*, fc.name as category_name 
        FROM final_questions fq
        JOIN final_categories fc ON fq.category_id = fc.id
        ORDER BY fq.id
      `);
    } else {
      const qual = await query('SELECT *, "qualification" as tour_type FROM qualification_questions');
      const fin = await query(`
        SELECT fq.*, fc.name as category_name, "final" as tour_type 
        FROM final_questions fq
        JOIN final_categories fc ON fq.category_id = fc.id
      `);
      questions = [...qual, ...fin];
    }
    
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновление вопроса
router.put('/questions/:id', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { id } = req.params;
    const { tourType, question_text, option_a, option_b, option_c, option_d, correct_answer, points, is_active } = req.body;
    
    if (tourType === 'qualification') {
      await query(`
        UPDATE qualification_questions 
        SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, 
            correct_answer = ?, is_active = ?
        WHERE id = ?
      `, [question_text, option_a, option_b, option_c, option_d, correct_answer, is_active, id]);
    } else if (tourType === 'final') {
      await query(`
        UPDATE final_questions 
        SET question_text = ?, correct_answer = ?, value_points = ?, is_active = ?
        WHERE id = ?
      `, [question_text, correct_answer, points, is_active, id]);
    }
    
    res.json({ success: true, message: 'Вопрос обновлён' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удаление вопроса
router.delete('/questions/:id', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { id } = req.params;
    const { tourType } = req.query;
    
    if (tourType === 'qualification') {
      await query('DELETE FROM qualification_questions WHERE id = ?', [id]);
    } else if (tourType === 'final') {
      await query('DELETE FROM final_questions WHERE id = ?', [id]);
    }
    
    res.json({ success: true, message: 'Вопрос удалён' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Проверить готовность финала
router.get('/final-ready', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const categories = await query('SELECT id FROM final_categories');
    const categoriesCount = categories.length;
    
    let questionsCount = 0;
    let categoriesWith5Questions = 0;
    
    for (const cat of categories) {
      const count = await query('SELECT COUNT(*) as count FROM final_questions WHERE category_id = ?', [cat.id]);
      if (count[0].count >= 5) {
        categoriesWith5Questions++;
      }
      questionsCount += count[0].count;
    }
    
    const isReady = categoriesCount >= 3 && categoriesWith5Questions >= 3 && questionsCount >= 15;
    
    res.json({ 
      success: true, 
      data: {
        categoriesCount,
        questionsCount,
        categoriesWith5Questions,
        isReady,
        message: isReady ? '✅ Финал готов к запуску!' : `❌ Не хватает категорий или вопросов (нужно 3 категории по 5 вопросов)`
      }
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// УПРАВЛЕНИЕ ИГРАМИ
// ============================================================

router.get('/games', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const qualGames = await query(`
      SELECT * FROM game_sessions 
      WHERE type = 'qualification' 
      ORDER BY created_at DESC
    `);
    const finalGames = await query(`
      SELECT * FROM game_sessions 
      WHERE type = 'final' 
      ORDER BY created_at DESC
    `);
    
    const finalLobbies = await query(`
      SELECT 
        fl.*,
        COUNT(fp.id) as total_teams,
        SUM(fp.is_ready) as ready_teams,
        GROUP_CONCAT(DISTINCT ft.name SEPARATOR ', ') as team_names
      FROM final_lobbies fl
      LEFT JOIN final_teams ft ON fl.id = ft.lobby_id
      LEFT JOIN final_participants fp ON ft.id = fp.team_id
      GROUP BY fl.id
      ORDER BY fl.created_at DESC
    `);
    
    res.json({ 
      success: true, 
      data: { 
        qualification: qualGames, 
        final: finalGames,
        finalLobbies: finalLobbies
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/games/qualification', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { gameId, teamIds } = req.body;
    
    const result = await query(
      'INSERT INTO game_sessions (session_id, type, status, created_by) VALUES (?, ?, ?, ?)',
      [gameId, 'qualification', 'waiting', req.user.id]
    );
    
    const gameIdDb = result.insertId;
    
    for (const teamId of teamIds) {
      await query(
        'INSERT INTO session_participants (session_id, team_id) VALUES (?, ?)',
        [gameIdDb, teamId]
      );
    }
    
    res.json({ success: true, data: { id: gameIdDb, gameId } });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/games/final', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { gameId, teamIds } = req.body;
    
    const result = await query(
      'INSERT INTO game_sessions (session_id, type, status, created_by) VALUES (?, ?, ?, ?)',
      [gameId, 'final', 'waiting', req.user.id]
    );
    
    const gameIdDb = result.insertId;
    
    for (const teamId of teamIds) {
      await query(
        'INSERT INTO session_participants (session_id, team_id) VALUES (?, ?)',
        [gameIdDb, teamId]
      );
    }
    
    res.json({ success: true, data: { id: gameIdDb, gameId } });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/games/:type/:id/start', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { id } = req.params;
    
    await query(
      'UPDATE game_sessions SET status = ?, started_at = NOW() WHERE id = ?',
      ['active', id]
    );
    
    res.json({ success: true, message: 'Игра запущена' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/games/:type/:id/finish', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { id } = req.params;
    
    await query(
      'UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?',
      ['finished', id]
    );
    
    res.json({ success: true, message: 'Игра завершена' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/games/:type/:id/results', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { type, id } = req.params;
    
    let results;
    if (type === 'qualification') {
      results = await query(`
        SELECT t.name, sp.team_score as score, sp.finished
        FROM session_participants sp
        JOIN teams t ON sp.team_id = t.id
        WHERE sp.session_id = ?
        ORDER BY sp.team_score DESC
      `, [id]);
    } else {
      results = await query(`
        SELECT ft.name, ft.score
        FROM final_teams ft
        WHERE ft.lobby_id = ?
        ORDER BY ft.score DESC
      `, [id]);
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// УПРАВЛЕНИЕ ВИДЕО
// ============================================================

router.get('/videos', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const videos = await query('SELECT * FROM videos ORDER BY type');
    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/videos', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { title, url, type } = req.body;
    const result = await query(
      'INSERT INTO videos (title, url, type) VALUES (?, ?, ?)',
      [title, url, type]
    );
    
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ДЕБАГ-ФУНКЦИИ
// ============================================================

// Добавление тестовых команд в финал
router.post('/debug/add-test-teams', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    console.log('🧪 /debug/add-test-teams START');
    
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
    console.error('❌ Ошибка в /debug/add-test-teams:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Принудительный старт финала
router.post('/debug/force-start-final', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    console.log('🚀 /debug/force-start-final START');
    
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
    
    res.json({ success: true, message: 'Финал принудительно запущен' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Принудительное завершение финала
router.post('/debug/force-end-final', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    console.log('🏁 /debug/force-end-final START');
    
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
    
    console.log('🏁 Игра завершена');
    
    res.json({ 
      success: true, 
      results: finalTeams,
      message: 'Финал принудительно завершён'
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Стать финалистом
router.post('/debug/become-finalist', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const userId = req.user.id;
    await query('UPDATE users SET is_finalist = TRUE WHERE id = ?', [userId]);
    
    const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
    if (user[0]?.team_id) {
      await query('UPDATE teams SET is_finalist = TRUE WHERE id = ?', [user[0].team_id]);
    }
    
    res.json({ success: true, message: 'Пользователь стал финалистом' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Сброс прогресса квалификации
router.post('/debug/reset-qualification/:teamId', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const { teamId } = req.params;
    await query('DELETE FROM qualification_progress WHERE team_id = ?', [teamId]);
    
    res.json({ success: true, message: 'Прогресс сброшен' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Очистка базы данных
router.post('/debug/clear-database', verifyToken, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    console.log('🗑️ ОЧИСТКА БАЗЫ ДАННЫХ...');
    
    const admin = await query("SELECT * FROM users WHERE email = 'admin@quiz.local'");
    console.log('👤 Админ сохранён:', admin.length > 0 ? 'ДА' : 'НЕТ');
    
    await query('SET FOREIGN_KEY_CHECKS = 0');
    
    await query('DELETE FROM final_answers');
    await query('DELETE FROM final_participants');
    await query('DELETE FROM final_teams');
    await query('DELETE FROM final_used_questions');
    await query('DELETE FROM final_lobbies');
    await query('DELETE FROM session_participants');
    await query('DELETE FROM qualification_progress');
    await query('DELETE FROM team_members');
    await query('DELETE FROM game_sessions');
    await query('DELETE FROM final_questions');
    await query('DELETE FROM final_categories');
    await query('DELETE FROM qualification_questions');
    await query('DELETE FROM videos');
    await query('DELETE FROM users');
    await query('DELETE FROM teams');
    
    await query('ALTER TABLE final_answers AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_participants AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_teams AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_used_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_lobbies AUTO_INCREMENT = 1');
    await query('ALTER TABLE session_participants AUTO_INCREMENT = 1');
    await query('ALTER TABLE qualification_progress AUTO_INCREMENT = 1');
    await query('ALTER TABLE team_members AUTO_INCREMENT = 1');
    await query('ALTER TABLE game_sessions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_categories AUTO_INCREMENT = 1');
    await query('ALTER TABLE qualification_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE videos AUTO_INCREMENT = 1');
    await query('ALTER TABLE users AUTO_INCREMENT = 1');
    await query('ALTER TABLE teams AUTO_INCREMENT = 1');
    
    await query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Восстанавливаем админа
    if (admin.length > 0) {
      await query(`
        INSERT INTO users (id, full_name, email, role, team_id, is_finalist, access_code, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        admin[0].id,
        admin[0].full_name,
        admin[0].email,
        admin[0].role || 'admin',
        admin[0].team_id || null,
        admin[0].is_finalist || 0,
        admin[0].access_code || null,
        admin[0].created_at || new Date()
      ]);
      console.log(`✅ Админ восстановлен (ID: ${admin[0].id})`);
    } else {
      const result = await query(`
        INSERT INTO users (full_name, email, role) 
        VALUES ('Администратор', 'admin@quiz.local', 'admin')
      `);
      console.log(`✅ Создан новый админ (ID: ${result.insertId})`);
    }
    
    // Создаём финальное лобби
    await query(
      'INSERT INTO final_lobbies (session_id, game_started, game_finished) VALUES (?, ?, ?)',
      ['FINAL', false, false]
    );
    
    const checkSessions = await query('SELECT * FROM game_sessions');
    console.log(`🎮 Сессий в БД: ${checkSessions.length}`);
    
    res.json({ 
      success: true, 
      message: 'База данных полностью очищена и восстановлена!'
    });
  } catch (error) {
    console.error('❌ Ошибка очистки БД:', error);
    try {
      await query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {}
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка очистки БД: ' + error.message 
    });
  }
});

module.exports = router;