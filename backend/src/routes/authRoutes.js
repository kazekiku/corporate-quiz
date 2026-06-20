// backend/src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// РЕГИСТРАЦИЯ ПО КОДУ (только код + имя капитана)
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { accessCode, captainName } = req.body;
    console.log('📝 Регистрация:', { accessCode, captainName });
    
    if (!accessCode || !captainName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Код доступа и имя капитана обязательны' 
      });
    }
    
    const code = accessCode.toUpperCase().trim();
    
    // 1. Проверяем код в таблице команд
    const team = await query('SELECT * FROM teams WHERE access_code = ?', [code]);
    console.log('📊 Найдена команда:', team.length > 0 ? 'ДА' : 'НЕТ');
    
    if (team.length === 0) {
      return res.status(400).json({ success: false, message: 'Неверный код доступа' });
    }
    
    // 2. Проверяем, не активирована ли уже команда
    if (team[0].is_activated) {
      return res.status(400).json({ success: false, message: 'Команда уже зарегистрирована' });
    }
    
    // 3. Проверяем, нет ли уже пользователя с таким кодом (на случай, если кто-то пытался)
    const existingUser = await query('SELECT * FROM users WHERE access_code = ? AND role = ?', [code, 'captain']);
    if (existingUser.length > 0) {
      // Если есть пользователь, но команда не активирована - удаляем старого
      await query('DELETE FROM users WHERE access_code = ? AND role = ?', [code, 'captain']);
      console.log('🗑️ Удалён старый пользователь с кодом:', code);
    }
    
    // 4. Создаём пользователя (капитана)
    const userEmail = `team_${team[0].id}_${Date.now()}@quiz.local`;
    
    const userResult = await query(
      'INSERT INTO users (team_id, full_name, email, role, access_code) VALUES (?, ?, ?, ?, ?)',
      [team[0].id, captainName.trim(), userEmail, 'captain', code]
    );
    
    // 5. Активируем команду
    await query('UPDATE teams SET is_activated = TRUE, captain_name = ? WHERE id = ?', 
      [captainName.trim(), team[0].id]);
    
    console.log('✅ Команда активирована:', team[0].name);
    console.log('✅ Капитан зарегистрирован:', captainName);
    
    // 6. Генерируем JWT токен
    const token = jwt.sign(
      { 
        id: userResult.insertId, 
        teamId: team[0].id, 
        role: 'captain',
        accessCode: code
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: userResult.insertId,
        fullName: captainName.trim(),
        teamId: team[0].id,
        teamName: team[0].name,
        role: 'captain',
        accessCode: code
      }
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ВХОД ПО КОДУ (для уже зарегистрированных)
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { accessCode } = req.body;
    console.log('🔑 ВХОД ПО КОДУ:', { accessCode });
    
    if (!accessCode) {
      return res.status(400).json({ success: false, message: 'Код доступа обязателен' });
    }
    
    const code = accessCode.toUpperCase().trim();
    
    // Ищем пользователя с таким кодом
    const user = await query('SELECT * FROM users WHERE access_code = ? AND role = ?', [code, 'captain']);
    console.log('📊 Найдено пользователей:', user.length);
    
    if (user.length === 0) {
      console.log('❌ Пользователь не найден');
      return res.status(401).json({ success: false, message: 'Неверный код доступа' });
    }
    
    // Получаем команду
    let teamName = 'Без команды';
    if (user[0].team_id) {
      const team = await query('SELECT * FROM teams WHERE id = ?', [user[0].team_id]);
      if (team.length > 0) {
        teamName = team[0].name;
      }
    }
    
    const token = jwt.sign(
      { 
        id: user[0].id, 
        teamId: user[0].team_id, 
        role: user[0].role,
        accessCode: code
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Вход выполнен для:', user[0].full_name);
    
    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        fullName: user[0].full_name,
        teamId: user[0].team_id,
        teamName: teamName,
        role: user[0].role,
        accessCode: code
      }
    });
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// АДМИН-ВХОД (без пароля)
// ============================================================
router.post('/admin-login', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔑 АДМИН-ВХОД:', { email });
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email обязателен' });
    }
    
    const user = await query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    console.log('📊 Найдено админов:', user.length);
    
    if (user.length === 0) {
      console.log('❌ Админ не найден');
      return res.status(401).json({ success: false, message: 'Администратор не найден' });
    }
    
    const token = jwt.sign(
      { id: user[0].id, teamId: user[0].team_id, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user[0].id,
        fullName: user[0].full_name,
        teamId: user[0].team_id,
        teamName: 'Администратор',
        role: user[0].role
      }
    });
  } catch (error) {
    console.error('❌ Ошибка админ-входа:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    let teamName = 'Без команды';
    if (user[0].team_id) {
      const team = await query('SELECT * FROM teams WHERE id = ?', [user[0].team_id]);
      if (team.length > 0) {
        teamName = team[0].name;
      }
    }
    
    res.json({
      success: true,
      data: {
        id: user[0].id,
        fullName: user[0].full_name,
        teamId: user[0].team_id,
        teamName: teamName,
        role: user[0].role,
        accessCode: user[0].access_code,
        isFinalist: user[0].is_finalist === 1
      }
    });
  } catch (error) {
    console.error('❌ Ошибка /me:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// СТАТЬ ФИНАЛИСТОМ (ДЕБАГ)
// ============================================================
router.post('/become-finalist', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await query('UPDATE users SET is_finalist = TRUE WHERE id = ?', [userId]);
    
    const user = await query('SELECT team_id FROM users WHERE id = ?', [userId]);
    if (user[0]?.team_id) {
      await query('UPDATE teams SET is_finalist = TRUE WHERE id = ?', [user[0].team_id]);
    }
    
    res.json({ success: true, data: { isFinalist: true }, message: 'Отдел прошёл в финал!' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// СТАТУС ФИНАЛИСТА
// ============================================================
router.get('/finalist-status', verifyToken, async (req, res) => {
  try {
    const user = await query('SELECT is_finalist FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: { isFinalist: user[0]?.is_finalist === 1 } });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ТЕСТ
// ============================================================
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes работают!' });
});

module.exports = router;