// backend/src/routes/teamRoutes.js

const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');

// Создание команды
router.post('/create', verifyToken, async (req, res) => {
    try {
        const { teamName } = req.body;
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        if (user.team_id) {
            return res.status(400).json({ success: false, message: 'Вы уже создали отдел' });
        }
        
        const team = await Team.createSimple(teamName, userId);
        await User.updateTeamId(userId, team.id);
        
        console.log('✅ Отдел создан:', { teamId: team.id, teamName: team.name });
        
        res.json({ 
            success: true, 
            data: { 
                teamId: team.id, 
                teamName: team.name
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка создания отдела:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания отдела' });
    }
});

// Получение информации о команде (ИСПРАВЛЕНО)
router.get('/:teamId', verifyToken, async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        
        // Проверяем существование команды
        const teamExists = await query('SELECT id FROM teams WHERE id = ?', [teamId]);
        if (teamExists.length === 0) {
            console.log('❌ Команда не найдена:', teamId);
            return res.status(404).json({ 
                success: false, 
                message: 'Команда не найдена' 
            });
        }
        
        const team = await Team.getTeamWithMembers(teamId);
        if (!team) {
            return res.status(404).json({ 
                success: false, 
                message: 'Команда не найдена' 
            });
        }
        
        res.json({ 
            success: true, 
            data: {
                id: team.id,
                name: team.name,
                captainId: team.captain_id,
                qualifyingScore: team.qualifying_score || 0,
                is_finalist: team.is_finalist === 1,
                members: team.members || []
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки команды:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка загрузки команды: ' + error.message 
        });
    }
});

// Получение статуса финалиста для команды
router.get('/:teamId/finalist-status', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.id;
        
        // Проверяем, существует ли команда
        const teamExists = await query('SELECT id FROM teams WHERE id = ?', [teamId]);
        if (teamExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Команда не найдена' 
            });
        }
        
        const userTeam = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
        
        if (userTeam[0]?.team_id !== parseInt(teamId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'У вас нет доступа к информации о этой команде' 
            });
        }
        
        const team = await query('SELECT is_finalist, qualifying_score FROM teams WHERE id = ?', [teamId]);
        
        if (team.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        const isFinalist = team[0]?.is_finalist === 1;
        const qualifyingScore = team[0]?.qualifying_score || 0;
        
        console.log(`📊 Статус команды ${teamId}: isFinalist=${isFinalist}`);
        
        res.json({ 
            success: true, 
            data: { 
                isFinalist, 
                qualifyingScore,
                qualificationCompleted: qualifyingScore > 0
            } 
        });
    } catch (error) {
        console.error('Ошибка получения статуса финалиста:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Обновление счёта команды
router.post('/update-score', verifyToken, async (req, res) => {
    try {
        const { teamId, score } = req.body;
        
        const teamExists = await query('SELECT id FROM teams WHERE id = ?', [teamId]);
        if (teamExists.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        await query('UPDATE teams SET qualifying_score = ? WHERE id = ?', [score, teamId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Удаление команды (для тестов)
router.delete('/:teamId/delete', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.id;
        
        const team = await query('SELECT captain_id FROM teams WHERE id = ?', [teamId]);
        if (team.length === 0) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        if (team[0].captain_id !== userId) {
            return res.status(403).json({ success: false, message: 'Только капитан может удалить команду' });
        }
        
        await query('DELETE FROM teams WHERE id = ?', [teamId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка удаления' });
    }
});

module.exports = router;