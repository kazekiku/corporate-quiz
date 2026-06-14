// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');
const { query } = require('../config/database'); // Добавьте этот импорт

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, code } = req.body;
        
        console.log('📝 Регистрация:', { fullName, email, code });
        
        const codeRegex = /^[1-9]-[0-9]{2}[APDL]$/;
        if (!codeRegex.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный формат кода. Пример: 1-07A'
            });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }
        
        const user = await User.create({ fullName, email, code });
        const token = generateToken(user);
        
        console.log('✅ Пользователь создан:', { id: user.id, fullName: user.full_name, role: user.role });
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                teamId: null,
                isFinalist: user.is_finalist === 1
            }
        });
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ success: false, message: 'Ошибка регистрации' });
    }
});

// Получение текущего пользователя
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        console.log('📖 getMe:', { id: user.id, fullName: user.full_name, role: user.role, isFinalist: user.is_finalist });
        
        res.json({
            success: true,
            data: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                teamId: user.team_id,
                isFinalist: user.is_finalist === 1  // ✅ Преобразуем в boolean
            }
        });
    } catch (error) {
        console.error('❌ Ошибка getMe:', error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

// Получение статуса финалиста текущего пользователя
router.get('/finalist-status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        console.log(`👑 Проверка статуса финалиста для пользователя ${userId}:`, user?.is_finalist);
        
        res.json({
            success: true,
            data: {
                isFinalist: user?.is_finalist === 1,  // ✅ Преобразуем в boolean
                userId: user?.id
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения статуса финалиста:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения статуса' });
    }
});

// Стать финалистом (дебаг режим)
router.post('/become-finalist', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Обновляем статус финалиста в базе данных
        await query('UPDATE users SET is_finalist = TRUE WHERE id = ?', [userId]);
        
        console.log(`👑 Пользователь ${userId} стал финалистом (дебаг)`);
        
        res.json({ 
            success: true, 
            data: {
                isFinalist: true
            },
            message: 'Вы стали финалистом! Теперь вам доступен Тур 2.' 
        });
    } catch (error) {
        console.error('❌ Ошибка при назначении финалиста:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при назначении финалиста' 
        });
    }
});

module.exports = router;