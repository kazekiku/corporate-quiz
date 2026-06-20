// backend/src/routes/qualificationRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Получить вопросы для отборочного тура
router.get('/questions', verifyToken, async (req, res) => {
  try {
    const { gameMode } = req.query;
    const limit = 4;
    
    console.log('📚 Запрос вопросов, лимит:', limit);
    
    const questions = await query(`
      SELECT 
        q.id, 
        q.question_text, 
        q.option_a, 
        q.option_b, 
        q.option_c, 
        q.option_d, 
        q.correct_answer,
        10 as points
      FROM qualification_questions q
      WHERE q.is_active = TRUE
      ORDER BY RAND()
      LIMIT ${parseInt(limit)}
    `);
    
    console.log(`📚 Найдено вопросов: ${questions.length}`);
    
    let finalQuestions = [...questions];
    while (finalQuestions.length < limit && finalQuestions.length > 0) {
      finalQuestions = [...finalQuestions, ...questions];
    }
    finalQuestions = finalQuestions.slice(0, limit);
    
    const basePoints = 10;
    
    const result = finalQuestions.map(q => ({
      id: q.id,
      text: q.question_text,
      options: { 
        A: q.option_a || 'Вариант А', 
        B: q.option_b || 'Вариант Б', 
        C: q.option_c || 'Вариант В', 
        D: q.option_d || 'Вариант Г' 
      },
      correct: q.correct_answer,
      points: basePoints
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Ошибка загрузки вопросов:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки вопросов' });
  }
});

// Сохранить прогресс отборочного тура
router.post('/progress', verifyToken, async (req, res) => {
    try {
        const { teamId, progress } = req.body;
        
        const safeCurrentIndex = (progress.currentIndex !== undefined && progress.currentIndex !== null) ? progress.currentIndex : 0;
        const safeTeamScore = (progress.teamScore !== undefined && progress.teamScore !== null) ? progress.teamScore : 0;
        const safePlayersOrder = progress.playersOrder && Array.isArray(progress.playersOrder) ? JSON.stringify(progress.playersOrder) : JSON.stringify([]);
        const safeCurrentPlayerId = (progress.currentPlayerId !== undefined && progress.currentPlayerId !== null) ? progress.currentPlayerId : null;
        const safeTimeLeft = (progress.timeLeft !== undefined && progress.timeLeft !== null) ? progress.timeLeft : 3600;
        const safeAnswers = progress.answers && Array.isArray(progress.answers) ? JSON.stringify(progress.answers) : JSON.stringify([]);
        const safeFinished = progress.finished === true ? 1 : 0;
        
        const existing = await query('SELECT id FROM qualification_progress WHERE team_id = ?', [teamId]);
        
        if (existing.length > 0) {
            await query(`
                UPDATE qualification_progress 
                SET current_index = ?,
                    team_score = ?,
                    players_order = ?,
                    current_player_id = ?,
                    time_left = ?,
                    answers = ?,
                    finished = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE team_id = ?
            `, [
                safeCurrentIndex, 
                safeTeamScore, 
                safePlayersOrder, 
                safeCurrentPlayerId, 
                safeTimeLeft, 
                safeAnswers, 
                safeFinished,
                teamId
            ]);
        } else {
            await query(`
                INSERT INTO qualification_progress 
                (team_id, current_index, team_score, players_order, current_player_id, time_left, answers, finished)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                teamId,
                safeCurrentIndex, 
                safeTeamScore, 
                safePlayersOrder, 
                safeCurrentPlayerId, 
                safeTimeLeft, 
                safeAnswers, 
                safeFinished
            ]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса:', error.message);
        res.status(500).json({ success: false, message: 'Ошибка сохранения прогресса' });
    }
});

// Получить прогресс отборочного тура
router.get('/progress/:teamId', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const result = await query('SELECT * FROM qualification_progress WHERE team_id = ?', [teamId]);
        
        if (!result || result.length === 0) {
            return res.json({ success: true, data: null });
        }
        
        let playersOrder = [];
        let answers = [];
        
        try {
            playersOrder = result[0].players_order ? JSON.parse(result[0].players_order) : [];
        } catch (e) {}
        
        try {
            answers = result[0].answers ? JSON.parse(result[0].answers) : [];
        } catch (e) {}
        
        const responseData = {
            currentIndex: result[0].current_index || 0,
            teamScore: result[0].team_score || 0,
            playersOrder: playersOrder,
            currentPlayerId: result[0].current_player_id,
            timeLeft: result[0].time_left || 3600,
            answers: answers,
            finished: result[0].finished === 1
        };
        
        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error('❌ Ошибка загрузки прогресса:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки прогресса' });
    }
});

// Сбросить прогресс
router.delete('/progress/:teamId', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        await query('DELETE FROM qualification_progress WHERE team_id = ?', [teamId]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сброса прогресса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сброса прогресса' });
    }
});

// Завершить квалификацию
router.post('/complete/:teamId', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        console.log(`🏁 Завершение квалификации для команды: ${teamId}`);
        
        const team = await query('SELECT id, qualifying_score, name FROM teams WHERE id = ?', [teamId]);
        if (team.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        const teamScore = team[0].qualifying_score || 0;
        console.log(`📊 Команда "${team[0].name}" набрала ${teamScore} баллов`);
        
        const allTeams = await query(`
            SELECT id, qualifying_score 
            FROM teams 
            WHERE qualifying_score > 0 
            ORDER BY qualifying_score DESC
        `);
        
        let isFinalist = false;
        if (allTeams.length > 0) {
            const top3Ids = allTeams.slice(0, 3).map(t => t.id);
            isFinalist = top3Ids.includes(parseInt(teamId));
            console.log(`🏆 Топ-3 ID: ${top3Ids}, команда ${teamId} в топ-3? ${isFinalist}`);
        }
        
        if (teamScore === 40) {
            isFinalist = true;
            console.log(`🏆 Команда набрала максимум 40 баллов, автоматически финалист!`);
        }
        
        await query('UPDATE teams SET is_finalist = ? WHERE id = ?', [isFinalist ? 1 : 0, teamId]);
        
        const user = await query('SELECT id, full_name FROM users WHERE team_id = ?', [teamId]);
        if (user.length > 0) {
            await query('UPDATE users SET is_finalist = ? WHERE id = ?', [isFinalist ? 1 : 0, user[0].id]);
            console.log(`✅ Капитан ${user[0].full_name} получил статус финалиста: ${isFinalist}`);
        }
        
        await query('DELETE FROM qualification_progress WHERE team_id = ?', [teamId]);
        
        const session = await query(`
            SELECT gs.id 
            FROM game_sessions gs
            JOIN session_participants sp ON gs.id = sp.session_id
            WHERE sp.team_id = ? AND gs.status IN ('active', 'ready')
        `, [teamId]);
        
        if (session.length > 0) {
            await query(`
                UPDATE game_sessions 
                SET status = 'finished', finished_at = NOW() 
                WHERE id = ?
            `, [session[0].id]);
            
            await query(`
                UPDATE session_participants 
                SET finished = TRUE, team_score = ? 
                WHERE session_id = ? AND team_id = ?
            `, [teamScore, session[0].id, teamId]);
            
            console.log(`✅ Сессия ${session[0].id} завершена для команды ${teamId}`);
            
            const remaining = await query(`
                SELECT COUNT(*) as count 
                FROM session_participants 
                WHERE session_id = ? AND finished = FALSE
            `, [session[0].id]);
            
            if (remaining[0].count === 0) {
                await query('DELETE FROM session_participants WHERE session_id = ?', [session[0].id]);
                await query('DELETE FROM game_sessions WHERE id = ?', [session[0].id]);
                console.log(`🗑️ Сессия ${session[0].id} удалена (все завершили)`);
            }
        }
        
        const updatedTeam = await query('SELECT is_finalist FROM teams WHERE id = ?', [teamId]);
        console.log(`✅ После обновления: is_finalist = ${updatedTeam[0]?.is_finalist}`);
        
        res.json({ 
            success: true, 
            isFinalist,
            teamId: parseInt(teamId),
            teamName: team[0].name,
            teamScore: teamScore,
            message: isFinalist ? 'Поздравляем! Ваш отдел прошёл в финал!' : 'К сожалению, ваш отдел не прошёл в финал.'
        });
        
    } catch (error) {
        console.error('❌ Ошибка завершения квалификации:', error);
        res.status(500).json({ success: false, message: 'Ошибка завершения квалификации: ' + error.message });
    }
});

module.exports = router;