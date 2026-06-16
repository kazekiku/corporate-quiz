const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Очистка базы данных (только для дебага)
router.post('/clear-database', verifyToken, async (req, res) => {
    try {
        // Проверяем, что пользователь - админ (опционально)
        // Для безопасности можно добавить проверку на специальный ключ
        
        console.log('🗑️ Очистка базы данных...');
        
        // Отключаем проверку внешних ключей
        await query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Очищаем все таблицы
        await query('TRUNCATE TABLE final_used_questions');
        await query('TRUNCATE TABLE final_participants');
        await query('TRUNCATE TABLE final_teams');
        await query('TRUNCATE TABLE final_lobbies');
        await query('TRUNCATE TABLE qualification_progress');
        await query('TRUNCATE TABLE team_members');
        await query('TRUNCATE TABLE users');
        await query('TRUNCATE TABLE teams');
        
        // Включаем проверку внешних ключей
        await query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('✅ База данных полностью очищена');
        
        res.json({ 
            success: true, 
            message: 'База данных полностью очищена' 
        });
    } catch (error) {
        console.error('❌ Ошибка очистки БД:', error);
        await query('SET FOREIGN_KEY_CHECKS = 1');
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка очистки БД: ' + error.message 
        });
    }
});

module.exports = router;