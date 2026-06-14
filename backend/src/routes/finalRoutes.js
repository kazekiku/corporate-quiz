// backend/src/routes/finalRoutes.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Создание финального лобби
router.post('/create', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await query('SELECT is_finalist FROM users WHERE id = ?', [userId]);
        if (!user[0]?.is_finalist) {
            return res.status(403).json({ 
                success: false, 
                message: 'Только финалисты могут создавать лобби финала' 
            });
        }
        
        const sessionId = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        await query(
            'INSERT INTO final_lobbies (session_id, created_by) VALUES (?, ?)', 
            [sessionId, userId]
        );
        
        res.json({ success: true, sessionId });
    } catch (error) {
        console.error('❌ Ошибка создания лобби:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания лобби' });
    }
});

// Создание финальной команды в лобби
router.post('/team/create', verifyToken, async (req, res) => {
    try {
        const { sessionId, teamName } = req.body;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const existingTeam = await query(`
            SELECT ft.id FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE ft.lobby_id = ? AND fp.user_id = ?
        `, [lobby[0].id, userId]);
        
        if (existingTeam.length > 0) {
            return res.status(400).json({ success: false, message: 'Вы уже создали команду в этом лобби' });
        }
        
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const result = await query(
            'INSERT INTO final_teams (lobby_id, name, code, captain_id) VALUES (?, ?, ?, ?)',
            [lobby[0].id, teamName, code, userId]
        );
        const teamId = result.insertId;
        
        await query(
            'INSERT INTO final_participants (team_id, user_id, is_ready) VALUES (?, ?, ?)',
            [teamId, userId, true]
        );
        
        res.json({ success: true, data: { teamId, teamName, code } });
    } catch (error) {
        console.error('❌ Ошибка создания финальной команды:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания команды' });
    }
});

// Вступление в финальную команду по коду
router.post('/team/join', verifyToken, async (req, res) => {
    try {
        const { sessionId, code } = req.body;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const team = await query(
            'SELECT id, captain_id FROM final_teams WHERE code = ? AND lobby_id = ?',
            [code, lobby[0].id]
        );
        if (team.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        const existing = await query(
            'SELECT id FROM final_participants WHERE team_id = ? AND user_id = ?',
            [team[0].id, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Вы уже в этой команде' });
        }
        
        await query(
            'INSERT INTO final_participants (team_id, user_id, is_ready) VALUES (?, ?, ?)',
            [team[0].id, userId, false]
        );
        
        res.json({ success: true, data: { teamId: team[0].id } });
    } catch (error) {
        console.error('❌ Ошибка вступления в команду:', error);
        res.status(500).json({ success: false, message: 'Ошибка вступления' });
    }
});

// Получение информации о лобби
router.get('/lobby/:sessionId', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT * FROM final_lobbies WHERE session_id = ?', [req.params.sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const lobbyId = lobby[0].id;
        
        const teams = await query(`
            SELECT 
                ft.id, 
                ft.name, 
                ft.code, 
                ft.captain_id,
                ft.score
            FROM final_teams ft
            WHERE ft.lobby_id = ?
        `, [lobbyId]);
        
        for (const team of teams) {
            const members = await query(`
                SELECT 
                    fp.user_id,
                    fp.is_ready,
                    u.full_name as user_name
                FROM final_participants fp
                JOIN users u ON fp.user_id = u.id
                WHERE fp.team_id = ?
            `, [team.id]);
            
            team.members = members || [];
            team.allReady = members.length > 0 && members.every(m => m.is_ready === true);
        }
        
        res.json({ 
            success: true, 
            data: { 
                teams: teams || [],
                gameStarted: lobby[0].game_started === 1,
                created_by: lobby[0].created_by,
                sessionId: lobby[0].session_id
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки лобби:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки лобби' });
    }
});

// Установка готовности игрока
router.post('/ready', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        await query(`
            UPDATE final_participants 
            SET is_ready = TRUE 
            WHERE user_id = ? AND team_id IN (
                SELECT id FROM final_teams WHERE lobby_id = ?
            )
        `, [userId, lobby[0].id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка установки готовности:', error);
        res.status(500).json({ success: false, message: 'Ошибка установки готовности' });
    }
});

// Старт игры
router.post('/start/:sessionId', verifyToken, async (req, res) => {
    try {
        await query('UPDATE final_lobbies SET game_started = TRUE WHERE session_id = ?', [req.params.sessionId]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка старта игры:', error);
        res.status(500).json({ success: false, message: 'Ошибка старта' });
    }
});

// Принудительный старт
router.post('/force-start/:sessionId', verifyToken, async (req, res) => {
    try {
        await query('UPDATE final_lobbies SET game_started = TRUE WHERE session_id = ?', [req.params.sessionId]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка принудительного старта:', error);
        res.status(500).json({ success: false, message: 'Ошибка принудительного старта' });
    }
});

// Получение команды текущего пользователя
router.get('/my-team/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const userTeam = await query(`
            SELECT ft.id, ft.name, ft.score, ft.captain_id
            FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE ft.lobby_id = ? AND fp.user_id = ?
        `, [lobby[0].id, userId]);
        
        if (userTeam.length === 0) {
            return res.json({ success: true, data: null });
        }
        
        res.json({ success: true, data: userTeam[0] });
    } catch (error) {
        console.error('❌ Ошибка получения команды пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Получение игрового поля
router.get('/board/:sessionId', verifyToken, async (req, res) => {
    try {
        const categories = [
            { id: 1, name: "Железо внутри", questions: [] },
            { id: 2, name: "Логика и таблицы истинности", questions: [] },
            { id: 3, name: "Сетевые технологии", questions: [] },
            { id: 4, name: "Офисный арсенал", questions: [] },
            { id: 5, name: "Игровой мир IT", questions: [] }
        ];
        
        const lobby = await query('SELECT id, current_turn_team_id FROM final_lobbies WHERE session_id = ?', [req.params.sessionId]);
        const lobbyId = lobby[0]?.id;
        
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
        
        const teams = await query(`
            SELECT ft.id, ft.name, ft.score, ft.captain_id
            FROM final_teams ft
            WHERE ft.lobby_id = ?
        `, [lobbyId]);
        
        for (const team of teams) {
            const members = await query(`
                SELECT 
                    fp.user_id,
                    fp.is_ready,
                    u.full_name as user_name
                FROM final_participants fp
                JOIN users u ON fp.user_id = u.id
                WHERE fp.team_id = ?
            `, [team.id]);
            team.members = members || [];
        }
        
        let currentTurnTeamId = lobby[0]?.current_turn_team_id;
        if (!currentTurnTeamId && teams.length > 0) {
            currentTurnTeamId = teams[0].id;
            await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [currentTurnTeamId, lobbyId]);
        }
        
        console.log('🎮 Текущий ход (ID):', currentTurnTeamId);
        console.log('🎮 Команды:', teams.map(t => ({ id: t.id, name: t.name })));
        
        res.json({ 
            success: true, 
            data: { 
                categories, 
                teams,
                currentTurnTeamId: currentTurnTeamId,
                isFinished: false 
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки игрового поля:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки игрового поля' });
    }
});

// Выбор вопроса
router.post('/pick', verifyToken, async (req, res) => {
    try {
        const { sessionId, categoryId, value } = req.body;
        const userId = req.user.id;
        
        console.log('📖 Выбор вопроса:', { sessionId, categoryId, value, userId });
        
        const lobby = await query('SELECT id, current_turn_team_id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const userTeam = await query(`
            SELECT ft.id FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE ft.lobby_id = ? AND fp.user_id = ?
        `, [lobby[0].id, userId]);
        
        if (userTeam.length === 0) {
            return res.status(403).json({ success: false, message: 'Вы не в команде' });
        }
        
        if (lobby[0].current_turn_team_id !== userTeam[0].id) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }
        
        const question = await query(`
            SELECT id, question_text, correct_answer 
            FROM final_questions 
            WHERE category_id = ? AND value_points = ?
        `, [categoryId, value]);
        
        console.log('📖 Найден вопрос:', question);
        
        if (question.length === 0) {
            return res.status(404).json({ success: false, message: 'Вопрос не найден' });
        }
        
        const usedCheck = await query(`
            SELECT id FROM final_used_questions 
            WHERE lobby_id = ? AND category_id = ? AND value_points = ?
        `, [lobby[0].id, categoryId, value]);
        
        if (usedCheck.length > 0) {
            return res.status(400).json({ success: false, message: 'Этот вопрос уже был использован' });
        }
        
        await query(
            'INSERT INTO final_used_questions (lobby_id, category_id, value_points) VALUES (?, ?, ?)',
            [lobby[0].id, categoryId, value]
        );
        
        const categories = ['Железо внутри', 'Логика и таблицы истинности', 'Сетевые технологии', 'Офисный арсенал', 'Игровой мир IT'];
        
        const responseData = {
            id: question[0].id,
            categoryId: categoryId,
            category: categories[categoryId - 1],
            value: value,
            text: question[0].question_text,
            correctAnswer: question[0].correct_answer
        };
        
        console.log('✅ Возвращаем вопрос:', responseData);
        
        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error('❌ Ошибка выбора вопроса:', error);
        res.status(500).json({ success: false, message: 'Ошибка выбора вопроса: ' + error.message });
    }
});

// Ответ на вопрос
router.post('/answer', verifyToken, async (req, res) => {
    try {
        const { sessionId, questionId, answer } = req.body;
        const userId = req.user.id;
        
        console.log('📝 Ответ на вопрос:', { sessionId, questionId, answer });
        
        if (!questionId) {
            return res.status(400).json({ success: false, message: 'ID вопроса обязателен' });
        }
        
        const question = await query('SELECT correct_answer, value_points FROM final_questions WHERE id = ?', [questionId]);
        if (question.length === 0) {
            return res.status(404).json({ success: false, message: 'Вопрос не найден' });
        }
        
        const isCorrect = question[0].correct_answer.toLowerCase().trim() === answer.toLowerCase().trim();
        const points = isCorrect ? question[0].value_points : 0;
        
        console.log('✅ Ответ:', isCorrect ? 'Правильный' : 'Неправильный', 'Баллы:', points);
        
        const lobby = await query('SELECT id, current_turn_team_id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        const userTeam = await query(`
            SELECT ft.id FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE ft.lobby_id = ? AND fp.user_id = ?
        `, [lobby[0].id, userId]);
        
        if (userTeam.length > 0) {
            await query('UPDATE final_teams SET score = score + ? WHERE id = ?', [points, userTeam[0].id]);
            console.log('💰 Обновлён счёт команды', userTeam[0].id, '+', points);
            
            const teams = await query('SELECT id FROM final_teams WHERE lobby_id = ?', [lobby[0].id]);
            const currentIndex = teams.findIndex(t => t.id === lobby[0].current_turn_team_id);
            const nextIndex = (currentIndex + 1) % teams.length;
            const nextTeamId = teams[nextIndex].id;
            
            await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [nextTeamId, lobby[0].id]);
            console.log('🔄 Ход переключён на команду', nextTeamId);
        }
        
        res.json({ success: true, data: { 
            isCorrect, 
            points: points, 
            correctAnswer: question[0].correct_answer 
        } });
    } catch (error) {
        console.error('❌ Ошибка проверки ответа:', error);
        res.status(500).json({ success: false, message: 'Ошибка проверки ответа: ' + error.message });
    }
});

// Добавление тестовых команд до 3-х
router.post('/add-test-teams/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [sessionId]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const lobbyId = lobby[0].id;
        
        const existingTeams = await query('SELECT id, name FROM final_teams WHERE lobby_id = ?', [lobbyId]);
        const currentCount = existingTeams.length;
        
        const neededCount = Math.max(0, 3 - currentCount);
        
        if (neededCount === 0) {
            return res.json({ success: true, message: 'Уже есть 3 команды', addedCount: 0, totalCount: currentCount });
        }
        
        let addedCount = 0;
        
        for (let i = 1; i <= neededCount; i++) {
            const teamName = `Тестовая команда ${currentCount + i}`;
            const code = `TEST${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            const result = await query(
                'INSERT INTO final_teams (lobby_id, name, code, captain_id, score) VALUES (?, ?, ?, ?, ?)',
                [lobbyId, teamName, code, 1, 0]
            );
            const teamId = result.insertId;
            
            await query(
                'INSERT INTO final_participants (team_id, user_id, is_ready) VALUES (?, ?, ?)',
                [teamId, 1, true]
            );
            
            addedCount++;
        }
        
        const newTotal = await query('SELECT COUNT(*) as count FROM final_teams WHERE lobby_id = ?', [lobbyId]);
        
        res.json({ 
            success: true, 
            message: `Добавлено ${addedCount} тестовых команд`,
            addedCount: addedCount,
            totalCount: newTotal[0].count
        });
    } catch (error) {
        console.error('❌ Ошибка добавления тестовых команд:', error);
        res.status(500).json({ success: false, message: 'Ошибка добавления тестовых команд' });
    }
});

module.exports = router;