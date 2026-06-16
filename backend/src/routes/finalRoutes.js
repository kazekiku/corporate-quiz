const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const FINAL_LOBBY_ID = 'FINAL';

// ==================== ЛОББИ ФИНАЛА ====================

// Получение информации о лобби
router.get('/lobby-info', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
        if (!user[0]?.team_id) {
            return res.json({ success: true, data: { teams: [], gameStarted: false, myTeam: null } });
        }
        
        const teamId = user[0].team_id;
        const team = await query('SELECT name, is_finalist FROM teams WHERE id = ?', [teamId]);
        
        if (team.length === 0 || !team[0].is_finalist) {
            return res.json({ success: true, data: { teams: [], gameStarted: false, myTeam: null } });
        }
        
        let lobby = await query('SELECT * FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        
        if (lobby.length === 0) {
            const result = await query('INSERT INTO final_lobbies (session_id, game_started) VALUES (?, ?)', [FINAL_LOBBY_ID, false]);
            lobby = [{ id: result.insertId, session_id: FINAL_LOBBY_ID, game_started: false }];
        }
        
        const lobbyId = lobby[0].id;
        
        const existingTeam = await query(`
            SELECT ft.id FROM final_teams ft
            WHERE ft.lobby_id = ? AND ft.captain_id = ?
        `, [lobbyId, userId]);
        
        if (existingTeam.length === 0) {
            const teamsCount = await query('SELECT COUNT(*) as count FROM final_teams WHERE lobby_id = ?', [lobbyId]);
            
            if (teamsCount[0].count < 3) {
                const teamResult = await query(
                    'INSERT INTO final_teams (lobby_id, name, captain_id, score) VALUES (?, ?, ?, ?)',
                    [lobbyId, team[0].name, userId, 0]
                );
                await query(
                    'INSERT INTO final_participants (lobby_id, team_id, is_ready) VALUES (?, ?, ?)',
                    [lobbyId, teamResult.insertId, false]
                );
                console.log(`✅ Отдел ${team[0].name} добавлен в лобби`);
            }
        }
        
        const teams = await query(`
            SELECT ft.id, ft.name, ft.score, ft.captain_id, fp.is_ready
            FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE fp.lobby_id = ?
        `, [lobbyId]);
        
        const formattedTeams = teams.map(t => ({
            id: t.id,
            name: t.name,
            score: t.score || 0,
            isReady: t.is_ready === 1,
            captainId: t.captain_id
        }));
        
        const myTeam = formattedTeams.find(t => t.captainId === userId) || null;
        const allReady = formattedTeams.length === 3 && formattedTeams.every(t => t.isReady === true);
        
        if (allReady && !lobby[0].game_started) {
            await query('UPDATE final_lobbies SET game_started = TRUE WHERE id = ?', [lobbyId]);
            const teamIds = formattedTeams.map(t => t.id);
            const randomIndex = Math.floor(Math.random() * teamIds.length);
            await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teamIds[randomIndex], lobbyId]);
            console.log(`🎮 Финал начат! Первый ход у команды ${teamIds[randomIndex]}`);
        }
        
        res.json({ 
            success: true, 
            data: { 
                teams: formattedTeams,
                gameStarted: lobby[0].game_started === 1,
                myTeam: myTeam
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Установка готовности
router.post('/ready', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const lobbyId = lobby[0].id;
        const userTeam = await query(`
            SELECT ft.id FROM final_teams ft
            WHERE ft.lobby_id = ? AND ft.captain_id = ?
        `, [lobbyId, userId]);
        
        if (userTeam.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        await query(`
            UPDATE final_participants SET is_ready = TRUE 
            WHERE lobby_id = ? AND team_id = ?
        `, [lobbyId, userTeam[0].id]);
        
        console.log(`✅ Команда ${userTeam[0].id} подтвердила готовность`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Добавление тестовых команд (для дебага)
router.post('/add-test-teams', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const lobbyId = lobby[0].id;
        const existingTeams = await query('SELECT COUNT(*) as count FROM final_teams WHERE lobby_id = ?', [lobbyId]);
        const currentCount = existingTeams[0].count;
        const neededCount = Math.max(0, 3 - currentCount);
        
        let addedCount = 0;
        for (let i = 1; i <= neededCount; i++) {
            const teamName = `Тестовая команда ${currentCount + i}`;
            const result = await query(
                'INSERT INTO final_teams (lobby_id, name, captain_id, score) VALUES (?, ?, ?, ?)',
                [lobbyId, teamName, 999999 + i, 0]
            );
            await query(
                'INSERT INTO final_participants (lobby_id, team_id, is_ready) VALUES (?, ?, ?)',
                [lobbyId, result.insertId, true]
            );
            addedCount++;
        }
        
        res.json({ success: true, addedCount, totalCount: currentCount + addedCount });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== ОСНОВНАЯ ИГРА ====================

// Получение игрового поля
router.get('/board', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT * FROM final_lobbies WHERE session_id = ?', ['FINAL']);
        
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        const lobbyId = lobby[0].id;
        const gameStarted = lobby[0].game_started === 1;
        
        const teams = await query(`
            SELECT ft.id, ft.name, ft.score, ft.captain_id
            FROM final_teams ft
            JOIN final_participants fp ON ft.id = fp.team_id
            WHERE fp.lobby_id = ?
        `, [lobbyId]);
        
        const categories = [
            { id: 1, name: "Железо внутри", questions: [] },
            { id: 2, name: "Логика и таблицы истинности", questions: [] },
            { id: 3, name: "Сетевые технологии", questions: [] },
            { id: 4, name: "Офисный арсенал", questions: [] },
            { id: 5, name: "Игровой мир IT", questions: [] }
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
        
        if (lobby[0].current_question_id) {
            const question = await query(`
                SELECT fq.id, fq.category_id, fq.value_points, fq.question_text, fc.name as category_name
                FROM final_questions fq
                JOIN final_categories fc ON fq.category_id = fc.id
                WHERE fq.id = ?
            `, [lobby[0].current_question_id]);
            
            if (question.length > 0) {
                const timePassed = (Date.now() - new Date(lobby[0].question_started_at).getTime()) / 1000;
                currentQuestion = {
                    id: question[0].id,
                    categoryId: question[0].category_id,
                    category: question[0].category_name,
                    value: question[0].value_points,
                    text: question[0].question_text,
                    timePassed: timePassed
                };
                
                const teamsCount = teams.length;
                const answersCount = await query('SELECT COUNT(*) as count FROM final_answers WHERE lobby_id = ? AND question_id = ?', [lobbyId, lobby[0].current_question_id]);
                allTeamsAnswered = teamsCount === answersCount[0].count;
                timeEnded = timePassed >= 30;
            }
        }
        
        let showResults = false;
        let results = null;
        
        if (lobby[0].current_results && lobby[0].results_shown === 0) {
            showResults = true;
            results = JSON.parse(lobby[0].current_results);
        }
        
        res.json({ 
            success: true, 
            data: { 
                categories, 
                teams,
                currentTurnTeamId: lobby[0].current_turn_team_id,
                gameStarted,
                currentQuestion,
                allTeamsAnswered,
                timeEnded,
                showResults,
                results
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Выбор вопроса
router.post('/pick', verifyToken, async (req, res) => {
    try {
        const { categoryId, value } = req.body;
        const userId = req.user.id;
        
        console.log('📖 Выбор вопроса:', { categoryId, value, userId });
        
        const lobby = await query('SELECT id, current_turn_team_id, game_started FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0 || !lobby[0].game_started) {
            return res.status(404).json({ success: false, message: 'Игра не найдена' });
        }
        
        const lobbyId = lobby[0].id;
        const userTeam = await query(`
            SELECT ft.id FROM final_teams ft
            WHERE ft.lobby_id = ? AND ft.captain_id = ?
        `, [lobbyId, userId]);
        
        if (userTeam.length === 0) {
            return res.status(403).json({ success: false, message: 'Вы не в команде' });
        }
        
        if (lobby[0].current_turn_team_id !== userTeam[0].id) {
            return res.status(403).json({ success: false, message: 'Сейчас не ваш ход' });
        }
        
        const question = await query('SELECT * FROM final_questions WHERE category_id = ? AND value_points = ?', [categoryId, value]);
        if (question.length === 0) {
            return res.status(404).json({ success: false, message: 'Вопрос не найден' });
        }
        
        const used = await query('SELECT id FROM final_used_questions WHERE lobby_id = ? AND category_id = ? AND value_points = ?', [lobbyId, categoryId, value]);
        if (used.length > 0) {
            return res.status(400).json({ success: false, message: 'Вопрос уже использован' });
        }
        
        await query('INSERT INTO final_used_questions (lobby_id, category_id, value_points) VALUES (?, ?, ?)', [lobbyId, categoryId, value]);
        
        const categories = ['Железо внутри', 'Логика и таблицы истинности', 'Сетевые технологии', 'Офисный арсенал', 'Игровой мир IT'];
        
        await query(`
            UPDATE final_lobbies 
            SET current_question_id = ?, question_started_at = NOW(), results_shown = 0, current_results = NULL
            WHERE id = ?
        `, [question[0].id, lobbyId]);
        
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
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ответ на вопрос
router.post('/answer', verifyToken, async (req, res) => {
    try {
        const { questionId, answer } = req.body;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id, current_question_id, question_started_at FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Игра не найдена' });
        }
        
        const lobbyId = lobby[0].id;
        const currentQuestionId = lobby[0].current_question_id;
        
        if (!currentQuestionId || currentQuestionId !== questionId) {
            return res.status(400).json({ success: false, message: 'Нет активного вопроса' });
        }
        
        const timePassed = (Date.now() - new Date(lobby[0].question_started_at).getTime()) / 1000;
        if (timePassed > 30) {
            return res.status(400).json({ success: false, message: 'Время вышло!' });
        }
        
        // ИСПРАВЛЕНО: убрали ft.team_id, оставили только ft.id
        const userTeam = await query(`
            SELECT ft.id
            FROM final_teams ft
            JOIN users u ON ft.captain_id = u.id
            WHERE ft.lobby_id = ? AND u.id = ?
        `, [lobbyId, userId]);
        
        if (userTeam.length === 0) {
            return res.status(403).json({ success: false, message: 'Вы не в игре' });
        }
        
        const existingAnswer = await query(
            'SELECT id FROM final_answers WHERE lobby_id = ? AND team_id = ? AND question_id = ?',
            [lobbyId, userTeam[0].id, questionId]
        );
        
        if (existingAnswer.length > 0) {
            return res.status(400).json({ success: false, message: 'Вы уже ответили' });
        }
        
        const question = await query('SELECT correct_answer, value_points FROM final_questions WHERE id = ?', [questionId]);
        const isCorrect = question[0]?.correct_answer?.toLowerCase().trim() === answer.toLowerCase().trim();
        
        await query(`
            INSERT INTO final_answers (lobby_id, team_id, question_id, answer, answered_at, is_correct)
            VALUES (?, ?, ?, ?, NOW(), ?)
        `, [lobbyId, userTeam[0].id, questionId, answer, isCorrect]);
        
        const teamsCount = await query('SELECT COUNT(*) as count FROM final_teams WHERE lobby_id = ?', [lobbyId]);
        const answersCount = await query('SELECT COUNT(*) as count FROM final_answers WHERE lobby_id = ? AND question_id = ?', [lobbyId, questionId]);
        
        const allAnswered = teamsCount[0].count === answersCount[0].count;
        const timeEnded = timePassed >= 30;
        
        if (allAnswered || timeEnded) {
            await calculateResults(lobbyId, questionId);
        }
        
        res.json({ success: true, isCorrect });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Вычисление результатов
async function calculateResults(lobbyId, questionId) {
    const question = await query('SELECT value_points FROM final_questions WHERE id = ?', [questionId]);
    const questionValue = question[0]?.value_points || 0;
    
    const lobby = await query('SELECT question_started_at FROM final_lobbies WHERE id = ?', [lobbyId]);
    const startTime = new Date(lobby[0].question_started_at);
    
    const answers = await query(`
        SELECT ft.id as team_id, ft.name as team_name, fa.answer, fa.answered_at, fa.is_correct
        FROM final_answers fa
        JOIN final_teams ft ON fa.team_id = ft.id
        WHERE fa.lobby_id = ? AND fa.question_id = ?
    `, [lobbyId, questionId]);
    
    const results = [];
    for (const answer of answers) {
        const timeSpent = (new Date(answer.answered_at) - startTime) / 1000;
        let points = 0;
        
        if (answer.is_correct) {
            points = questionValue;
            if (timeSpent < 30) {
                const speedBonus = Math.floor(questionValue * (1 - timeSpent / 30) * 0.5);
                points += speedBonus;
            }
        }
        
        results.push({
            team_id: answer.team_id,
            team_name: answer.team_name,
            answer: answer.answer,
            is_correct: answer.is_correct,
            timeSpent: timeSpent,
            points: points
        });
        
        if (points > 0) {
            await query('UPDATE final_teams SET score = score + ? WHERE id = ?', [points, answer.team_id]);
        }
    }
    
    results.sort((a, b) => b.points - a.points);
    
    await query('UPDATE final_lobbies SET current_results = ?, results_shown = 0 WHERE id = ?', [JSON.stringify(results), lobbyId]);
    await query('UPDATE final_lobbies SET current_question_id = NULL, question_started_at = NULL WHERE id = ?', [lobbyId]);
}

// Следующий ход
router.post('/next-turn', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT id, current_turn_team_id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Игра не найдена' });
        }
        
        const teams = await query('SELECT id FROM final_teams WHERE lobby_id = ?', [lobby[0].id]);
        const currentIndex = teams.findIndex(t => t.id === lobby[0].current_turn_team_id);
        const nextIndex = (currentIndex + 1) % teams.length;
        
        await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teams[nextIndex].id, lobby[0].id]);
        await query('UPDATE final_lobbies SET results_shown = 1 WHERE id = ?', [lobby[0].id]);
        
        res.json({ success: true, nextTeamId: teams[nextIndex].id });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Принудительный старт (дебаг)
router.post('/force-start', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Лобби не найдено' });
        }
        
        await query('UPDATE final_lobbies SET game_started = 1 WHERE id = ?', [lobby[0].id]);
        
        const teams = await query('SELECT id FROM final_teams WHERE lobby_id = ?', [lobby[0].id]);
        if (teams.length > 0) {
            const randomIndex = Math.floor(Math.random() * teams.length);
            await query('UPDATE final_lobbies SET current_turn_team_id = ? WHERE id = ?', [teams[randomIndex].id, lobby[0].id]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Завершить игру (дебаг)
router.post('/end-game', verifyToken, async (req, res) => {
    try {
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Игра не найдена' });
        }
        
        await query('UPDATE final_lobbies SET game_started = 0 WHERE id = ?', [lobby[0].id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Добавление баллов (дебаг)
router.post('/add-points', verifyToken, async (req, res) => {
    try {
        const { points } = req.body;
        const userId = req.user.id;
        
        const lobby = await query('SELECT id FROM final_lobbies WHERE session_id = ?', [FINAL_LOBBY_ID]);
        if (lobby.length === 0) {
            return res.status(404).json({ success: false, message: 'Игра не найдена' });
        }
        
        const userTeam = await query(`
            SELECT ft.id FROM final_teams ft
            WHERE ft.lobby_id = ? AND ft.captain_id = ?
        `, [lobby[0].id, userId]);
        
        if (userTeam.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        await query('UPDATE final_teams SET score = score + ? WHERE id = ?', [points, userTeam[0].id]);
        
        res.json({ success: true, addedPoints: points });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;