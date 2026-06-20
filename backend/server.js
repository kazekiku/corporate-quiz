// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, query } = require('./src/config/database');
const { verifyToken } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/authRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const qualificationRoutes = require('./src/routes/qualificationRoutes');
const finalRoutes = require('./src/routes/finalRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const gameRoutes = require('./src/routes/gameRoutes');
const debugRoutes = require('./src/routes/debugRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/qualification', qualificationRoutes);
app.use('/api/final', finalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/debug', debugRoutes);

// ============================================================
// РЕЙТИНГ
// ============================================================
app.get('/api/rating', verifyToken, async (req, res) => {
    try {
        // Проверяем, существует ли VIEW
        const viewExists = await query(`
            SELECT COUNT(*) as count 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = 'corporate_quiz' 
            AND TABLE_NAME = 'rating_view'
        `);
        
        let teams;
        if (viewExists[0].count > 0) {
            teams = await query('SELECT * FROM rating_view');
        } else {
            // Если VIEW нет - делаем прямой запрос
            teams = await query(`
                SELECT 
                    t.id,
                    t.name,
                    COALESCE(qp.team_score, 0) as score,
                    t.is_finalist,
                    CASE 
                        WHEN t.is_finalist = 1 THEN 'Финалист'
                        WHEN qp.team_score > 0 THEN 'Участник'
                        ELSE 'Новый'
                    END as status
                FROM teams t
                LEFT JOIN qualification_progress qp ON t.id = qp.team_id AND qp.finished = 1
                WHERE t.is_activated = 1
                ORDER BY score DESC
            `);
        }
        
        res.json({ success: true, data: teams });
    } catch (error) {
        console.error('❌ Ошибка загрузки рейтинга:', error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки рейтинга' });
    }
});

// ============================================================
// ДОПОЛНИТЕЛЬНЫЕ МАРШРУТЫ (убираем дубли)
// ============================================================

// Проверка здоровья
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Запуск сервера
const startServer = async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
        console.error('❌ Cannot start server without database connection');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 API URL: http://localhost:${PORT}/api`);
    });
};

// Вывод всех зарегистрированных маршрутов для отладки
console.log('\n📋 ЗАРЕГИСТРИРОВАННЫЕ МАРШРУТЫ:');
const listRoutes = (stack, basePath = '') => {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.log(`  ${methods.padEnd(6)} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            let path = '';
            if (layer.regexp) {
                const pattern = layer.regexp.source
                    .replace(/\\\//g, '/')
                    .replace(/\^/g, '')
                    .replace(/\?/g, '')
                    .replace(/\(\?:\(\[\^\\\]\+\?\)\)/g, ':param')
                    .replace(/\/$/g, '');
                path = pattern;
            }
            listRoutes(layer.handle.stack, basePath + path);
        }
    });
};
listRoutes(app._router.stack);
console.log('');

startServer();