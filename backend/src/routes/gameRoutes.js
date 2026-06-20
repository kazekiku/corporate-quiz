// backend/src/routes/gameRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// СОЗДАНИЕ СЕССИИ
// ============================================================
router.post('/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;
    
    console.log('🎮 СОЗДАНИЕ СЕССИИ:', { userId, type });
    
    const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
    console.log('👤 Пользователь:', user);
    
    if (!user[0]?.team_id) {
      return res.status(400).json({ success: false, message: 'Вы не состоите в команде' });
    }
    
    const teamId = user[0].team_id;
    console.log('🏷️ Команда ID:', teamId);
    
    const existing = await query(`
      SELECT sp.*, gs.status, gs.id as session_id 
      FROM session_participants sp
      JOIN game_sessions gs ON sp.session_id = gs.id
      WHERE sp.team_id = ? AND gs.status IN ('waiting', 'ready', 'active')
    `, [teamId]);
    
    if (existing.length > 0) {
      console.log('📌 Существующая сессия найдена:', existing[0].session_id);
      return res.json({ 
        success: true, 
        sessionId: existing[0].session_id,
        exists: true
      });
    }
    
    const gameId = `${type}_${Date.now()}`;
    const result = await query(
      'INSERT INTO game_sessions (session_id, type, status, created_by) VALUES (?, ?, ?, ?)',
      [gameId, type, 'waiting', userId]
    );
    
    const sessionId = result.insertId;
    console.log('✅ Сессия создана, ID:', sessionId);
    
    const insertResult = await query(
      'INSERT INTO session_participants (session_id, team_id, is_ready) VALUES (?, ?, ?)',
      [sessionId, teamId, false]
    );
    console.log('✅ Команда добавлена в участники, ID:', insertResult.insertId);
    
    const check = await query(
      'SELECT * FROM session_participants WHERE session_id = ?',
      [sessionId]
    );
    console.log('📊 Участники после добавления:', check);
    
    res.json({
      success: true,
      sessionId: sessionId,
      gameId: gameId,
      exists: false
    });
  } catch (error) {
    console.error('❌ Ошибка создания сессии:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// СТАТУС ГОТОВНОСТИ
// ============================================================
router.post('/ready', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    
    console.log('✅ ГОТОВНОСТЬ:', { userId, sessionId });
    
    const session = await query('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Сессия не найдена' });
    }
    console.log('📌 Сессия найдена, статус:', session[0].status);
    
    if (session[0].status === 'active') {
      return res.status(400).json({ success: false, message: 'Игра уже началась' });
    }
    
    const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
    if (!user[0]?.team_id) {
      return res.status(400).json({ success: false, message: 'Вы не состоите в команде' });
    }
    
    const teamId = user[0].team_id;
    console.log('🏷️ Команда ID:', teamId);
    
    const participant = await query(
      'SELECT * FROM session_participants WHERE session_id = ? AND team_id = ?',
      [sessionId, teamId]
    );
    console.log('📊 Участник найден?', participant.length > 0);
    
    if (participant.length === 0) {
      await query(
        'INSERT INTO session_participants (session_id, team_id, is_ready) VALUES (?, ?, ?)',
        [sessionId, teamId, true]
      );
      console.log('✅ Команда добавлена в участники (готов)');
    } else {
      await query(
        'UPDATE session_participants SET is_ready = TRUE WHERE session_id = ? AND team_id = ?',
        [sessionId, teamId]
      );
      console.log('✅ Команда отмечена как готовая');
    }
    
    const participants = await query(
      'SELECT * FROM session_participants WHERE session_id = ?',
      [sessionId]
    );
    console.log('📊 Все участники:', participants);
    
    const total = participants.length;
    const ready = participants.filter(p => p.is_ready === 1).length;
    const allReady = total > 0 && ready === total;
    
    console.log(`📊 Всего: ${total}, Готовы: ${ready}, Все готовы: ${allReady}`);
    
    if (allReady) {
      await query(
        'UPDATE game_sessions SET status = ? WHERE id = ?',
        ['ready', sessionId]
      );
      console.log('🎮 Все готовы! Сессия готова к старту.');
    }
    
    res.json({
      success: true,
      allReady: allReady,
      total: total,
      ready: ready
    });
  } catch (error) {
    console.error('❌ Ошибка готовности:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ПОЛУЧЕНИЕ СТАТУСА СЕССИИ
// ============================================================
router.get('/status/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    console.log('📊 ПОЛУЧЕНИЕ СТАТУСА:', { sessionId, userId });
    
    const session = await query(`
      SELECT gs.*, 
             COUNT(sp.id) as total_teams,
             SUM(sp.is_ready) as ready_teams
      FROM game_sessions gs
      LEFT JOIN session_participants sp ON gs.id = sp.session_id
      WHERE gs.id = ?
      GROUP BY gs.id
    `, [sessionId]);
    
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Сессия не найдена' });
    }
    
    console.log('📌 Сессия найдена:', {
      id: session[0].id,
      status: session[0].status,
      total_teams: session[0].total_teams || 0,
      ready_teams: session[0].ready_teams || 0
    });
    
    const teams = await query(`
      SELECT t.id, t.name, sp.is_ready
      FROM session_participants sp
      JOIN teams t ON sp.team_id = t.id
      WHERE sp.session_id = ?
    `, [sessionId]);
    
    console.log('📊 Команды в сессии:', teams);
    
    const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
    const myTeam = teams.find(t => t.id === user[0]?.team_id);
    
    const totalTeams = session[0].total_teams || 0;
    const readyTeams = session[0].ready_teams || 0;
    const allReady = totalTeams > 0 && readyTeams === totalTeams;
    
    res.json({
      success: true,
      data: {
        session: session[0],
        teams: teams,
        myTeam: myTeam || null,
        isReady: myTeam?.is_ready || false,
        totalTeams: totalTeams,
        readyTeams: readyTeams,
        allReady: allReady
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// АДМИН: СТАРТ ИГРЫ ДЛЯ ВСЕХ КОМАНД ОДНОВРЕМЕННО
// ============================================================
router.post('/admin/start-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    
    console.log('🚀 АДМИН: СТАРТ ДЛЯ ВСЕХ КОМАНД', { userId, sessionId });
    
    const user = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Только администратор может начать игру' });
    }
    
    const session = await query('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Сессия не найдена' });
    }
    
    if (session[0].status !== 'ready') {
      return res.status(400).json({ 
        success: false, 
        message: `Некорректный статус сессии: ${session[0].status}. Ожидается 'ready'` 
      });
    }
    
    const participants = await query(
      'SELECT is_ready FROM session_participants WHERE session_id = ?',
      [sessionId]
    );
    
    const total = participants.length;
    const ready = participants.filter(p => p.is_ready === 1).length;
    
    if (total === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Нет участников в сессии' 
      });
    }
    
    if (ready < total) {
      return res.status(400).json({ 
        success: false, 
        message: `Не все команды готовы: ${ready}/${total}` 
      });
    }
    
    await query(
      'UPDATE game_sessions SET status = ?, started_at = NOW() WHERE id = ?',
      ['active', sessionId]
    );
    
    // ИСПРАВЛЕНО: убрана колонка t.team_id
    const teams = await query(`
      SELECT t.id, t.name
      FROM session_participants sp
      JOIN teams t ON sp.team_id = t.id
      WHERE sp.session_id = ?
      ORDER BY t.name
    `, [sessionId]);
    
    console.log(`🚀 Игра ${sessionId} запущена для ${teams.length} команд:`, teams.map(t => t.name).join(', '));
    
    res.json({ 
      success: true, 
      message: `Игра запущена для ${teams.length} команд!`,
      sessionId: sessionId,
      teams: teams.map(t => ({ id: t.id, name: t.name }))
    });
  } catch (error) {
    console.error('❌ Ошибка старта игры для всех:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// АДМИН: СТАТУС ГОТОВНОСТИ ВСЕХ КОМАНД
// ============================================================
router.get('/admin/session-status/:sessionId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    
    console.log('📊 АДМИН: СТАТУС СЕССИИ', { userId, sessionId });
    
    const user = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const session = await query('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Сессия не найдена' });
    }
    
    const participants = await query(`
      SELECT t.id, t.name, sp.is_ready
      FROM session_participants sp
      JOIN teams t ON sp.team_id = t.id
      WHERE sp.session_id = ?
      ORDER BY t.name
    `, [sessionId]);
    
    const total = participants.length;
    const ready = participants.filter(p => p.is_ready === 1).length;
    const allReady = total > 0 && ready === total;
    
    console.log(`📊 Статус сессии ${sessionId}: ${ready}/${total} готовы, allReady: ${allReady}`);
    
    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        status: session[0].status,
        startedAt: session[0].started_at,
        teams: participants,
        total: total,
        ready: ready,
        allReady: allReady,
        isActive: session[0].status === 'active'
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения статуса сессии:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// АДМИН: ПОЛУЧЕНИЕ ВСЕХ СЕССИЙ
// ============================================================
router.get('/admin/sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const sessions = await query(`
      SELECT gs.*, 
             COUNT(sp.id) as total_teams,
             SUM(sp.is_ready) as ready_teams,
             GROUP_CONCAT(t.name SEPARATOR ', ') as team_names
      FROM game_sessions gs
      LEFT JOIN session_participants sp ON gs.id = sp.session_id
      LEFT JOIN teams t ON sp.team_id = t.id
      GROUP BY gs.id
      ORDER BY gs.created_at DESC
    `);
    
    console.log(`📊 Найдено сессий: ${sessions.length}`);
    
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('❌ Ошибка получения сессий:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// АДМИН: ПРИНУДИТЕЛЬНОЕ ЗАВЕРШЕНИЕ СЕССИИ
// ============================================================
router.post('/admin/end-session', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    
    const user = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user[0]?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет доступа' });
    }
    
    const session = await query('SELECT * FROM game_sessions WHERE id = ?', [sessionId]);
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Сессия не найдена' });
    }
    
    await query(
      'UPDATE game_sessions SET status = ?, finished_at = NOW() WHERE id = ?',
      ['finished', sessionId]
    );
    
    await query(
      'UPDATE session_participants SET finished = TRUE WHERE session_id = ?',
      [sessionId]
    );
    
    console.log(`🏁 Сессия ${sessionId} принудительно завершена`);
    
    res.json({ 
      success: true, 
      message: 'Сессия завершена' 
    });
  } catch (error) {
    console.error('❌ Ошибка завершения сессии:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;