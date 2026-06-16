const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const { generateToken, verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');

// Регистрация - сразу создаём отдел
router.post('/register', async (req, res) => {
    try {
        const { teamName } = req.body;
        
        console.log('🏢 Создание отдела:', teamName);
        
        if (!teamName || !teamName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Введите название отдела'
            });
        }
        
        // Создаём пользователя-капитана (без ФИО)
        const captainEmail = `captain_${Date.now()}@quiz.local`;
        const user = await User.createSimple('Капитан отдела', captainEmail);
        
        // Создаём команду (отдел)
        const team = await Team.createSimple(teamName.trim(), user.id);
        
        // Обновляем пользователя
        await User.updateTeamId(user.id, team.id);
        
        // Генерируем токен
        const token = generateToken(user);
        
        console.log('✅ Отдел создан:', { teamId: team.id, teamName: team.name });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                teamId: team.id,
                isFinalist: false
            },
            data: {
                teamId: team.id,
                teamName: team.name
            }
        });
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания отдела' });
    }
});

// Получение текущего пользователя
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                teamId: user.team_id,
                isFinalist: user.is_finalist === 1
            }
        });
    } catch (error) {
        console.error('❌ Ошибка getMe:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Получение статуса финалиста
router.get('/finalist-status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        res.json({
            success: true,
            data: {
                isFinalist: user?.is_finalist === 1,
                userId: user?.id
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения статуса финалиста:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения статуса' });
    }
});

// Стать финалистом (дебаг)
router.post('/become-finalist', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`👑 Пользователь ${userId} становится финалистом (дебаг)`);
        
        await query('UPDATE users SET is_finalist = TRUE WHERE id = ?', [userId]);
        
        const updated = await query('SELECT is_finalist FROM users WHERE id = ?', [userId]);
        console.log(`👑 После обновления: is_finalist = ${updated[0]?.is_finalist}`);
        
        res.json({ 
            success: true, 
            data: {
                isFinalist: true
            },
            message: 'Отдел прошёл в финал!' 
        });
    } catch (error) {
        console.error('❌ Ошибка при назначении финалиста:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при назначении финалиста: ' + error.message
        });
    }
});

module.exports = router;