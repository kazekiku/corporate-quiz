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
        const { teamName, gameMode } = req.body;
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        if (user.team_id) {
            return res.status(400).json({ success: false, message: 'Вы уже состоите в команде' });
        }
        
        const team = await Team.create(teamName, userId);
        await User.updateTeamId(userId, team.id);
        
        console.log('✅ Команда создана:', { teamId: team.id, teamName: team.name, joinCode: team.code });
        
        res.json({ 
            success: true, 
            data: { 
                teamId: team.id, 
                teamName: team.name, 
                joinCode: team.code, 
                gameMode 
            } 
        });
    } catch (error) {
        console.error('❌ Ошибка создания команды:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания команды' });
    }
});

// Вступление в команду
router.post('/join', verifyToken, async (req, res) => {
    try {
        const { joinCode } = req.body;
        const userId = req.user.id;
        
        const team = await Team.findByCode(joinCode);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        await Team.addMember(team.id, userId);
        await User.updateTeamId(userId, team.id);
        
        res.json({ success: true, data: { teamId: team.id, teamName: team.name } });
    } catch (error) {
        console.error('❌ Ошибка вступления:', error);
        res.status(500).json({ success: false, message: 'Ошибка вступления' });
    }
});

// Получение информации о команде
router.get('/:teamId', verifyToken, async (req, res) => {
    try {
        const team = await Team.getTeamWithMembers(req.params.teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        const members = team.members.map((m, idx) => ({
            id: m.id,
            fullName: m.full_name,
            role: idx === 0 ? 'L' : null,
            isReady: m.is_ready === 1
        }));
        
        while (members.length < 5) {
            members.push({ id: members.length + 1, fullName: 'Свободный слот', role: null, isReady: false });
        }
        
        res.json({ success: true, data: {
            id: team.id,
            name: team.name,
            joinCode: team.code,
            captainId: team.captain_id,
            members,
            maxMembers: 5,
            qualifyingScore: team.qualifying_score || 0
        } });
    } catch (error) {
        console.error('❌ Ошибка загрузки команды:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки' });
    }
});

// Установка готовности
router.post('/ready', verifyToken, async (req, res) => {
    try {
        const { teamId, isReady } = req.body;
        const userId = req.user.id;
        await Team.setReady(teamId, userId, isReady);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка установки готовности:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Покинуть команду
router.post('/leave', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        await User.updateTeamId(userId, null);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Удалить команду (для финалистов)
router.delete('/:teamId/delete', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.id;
        
        console.log(`🗑️ Запрос на удаление команды ${teamId} от пользователя ${userId}`);
        
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Команда не найдена' });
        }
        
        if (team.captain_id !== userId) {
            return res.status(403).json({ success: false, message: 'Только капитан может удалить команду' });
        }
        
        await query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
        await query('UPDATE users SET team_id = NULL WHERE team_id = ?', [teamId]);
        await query('DELETE FROM qualification_progress WHERE team_id = ?', [teamId]);
        await query('DELETE FROM final_participants WHERE team_id = ?', [teamId]);
        await query('DELETE FROM teams WHERE id = ?', [teamId]);
        
        console.log(`✅ Команда ${teamId} удалена из базы данных`);
        
        res.json({ success: true, message: 'Команда успешно удалена' });
    } catch (error) {
        console.error('❌ Ошибка удаления команды:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления команды: ' + error.message });
    }
});

module.exports = router;