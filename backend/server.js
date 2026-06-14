const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, query } = require('./src/config/database');
const { verifyToken } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/authRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const qualificationRoutes = require('./src/routes/qualificationRoutes');
const finalRoutes = require('./src/routes/finalRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/qualification', qualificationRoutes);
app.use('/api/final', finalRoutes);

// Дополнительные маршруты
app.get('/api/rating', verifyToken, async (req, res) => {
    try {
        const teams = await query('SELECT * FROM rating_view');
        res.json({ success: true, data: teams });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка загрузки рейтинга' });
    }
});

app.get('/api/team/:teamId/finalist-status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const teamId = req.params.teamId;
        
        // Проверяем, что пользователь состоит в этой команде
        const userTeam = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
        
        if (userTeam[0]?.team_id !== parseInt(teamId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'У вас нет доступа к информации о этой команде' 
            });
        }
        
        const team = await query('SELECT is_finalist FROM teams WHERE id = ?', [teamId]);
        const isFinalist = team[0]?.is_finalist === 1;
        
        const progress = await query('SELECT finished FROM qualification_progress WHERE team_id = ?', [teamId]);
        const qualificationCompleted = progress[0]?.finished === 1;
        
        res.json({ 
            success: true, 
            data: { 
                isFinalist, 
                qualificationCompleted: qualificationCompleted || false 
            } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

app.post('/api/team/update-score', verifyToken, async (req, res) => {
    try {
        const { teamId, score } = req.body;
        await query('UPDATE teams SET qualifying_score = ? WHERE id = ?', [score, teamId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка' });
    }
});

app.post('/api/team/:teamId/add-bot', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const members = await query('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?', [teamId]);
        
        if (members[0].count < 5) {
            const botName = `Бот ${members[0].count + 1}`;
            const botResult = await query(
                'INSERT INTO users (full_name, email, role) VALUES (?, ?, ?)',
                [botName, `bot_${Date.now()}@quiz.local`, 'E']
            );
            await query('INSERT INTO team_members (team_id, user_id, is_ready) VALUES (?, ?, ?)', 
                [teamId, botResult.insertId, true]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка добавления бота' });
    }
});

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
        console.log(`📍 API URL: http://localhost:3001/api`);
    });
};

startServer();