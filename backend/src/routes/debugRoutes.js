// backend/src/routes/debugRoutes.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Очистка базы данных с сохранением админа
router.post('/clear-database', verifyToken, async (req, res) => {
  try {
    console.log('🗑️ ОЧИСТКА БАЗЫ ДАННЫХ С СОХРАНЕНИЕМ АДМИНА...');
    
    // Сохраняем админа
    const admin = await query("SELECT * FROM users WHERE email = 'admin@quiz.local'");
    console.log('👤 Админ сохранён:', admin.length > 0 ? 'ДА' : 'НЕТ');
    if (admin.length > 0) {
      console.log(`👤 ID админа: ${admin[0].id}, имя: ${admin[0].full_name}`);
    }
    
    // Сохраняем данные которые нужно восстановить
    const categories = await query('SELECT * FROM final_categories');
    const qualQuestions = await query('SELECT * FROM qualification_questions');
    const finalQuestions = await query('SELECT * FROM final_questions');
    const videosData = await query('SELECT * FROM videos');
    
    console.log(`📊 Сохранено: ${categories.length} категорий, ${qualQuestions.length} вопросов отбора, ${finalQuestions.length} вопросов финала, ${videosData.length} видео`);
    
    // =====================================================
    // 1. УДАЛЯЕМ ВСЕ ДАННЫЕ (В ПРАВИЛЬНОМ ПОРЯДКЕ)
    // =====================================================
    
    console.log('🗑️ Удаление данных...');
    
    // Отключаем проверку внешних ключей
    await query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Сначала удаляем все записи из таблиц с внешними ключами
    await query('DELETE FROM final_answers');
    console.log('  ✅ final_answers очищена');
    
    await query('DELETE FROM final_participants');
    console.log('  ✅ final_participants очищена');
    
    await query('DELETE FROM final_teams');
    console.log('  ✅ final_teams очищена');
    
    await query('DELETE FROM final_used_questions');
    console.log('  ✅ final_used_questions очищена');
    
    await query('DELETE FROM final_lobbies');
    console.log('  ✅ final_lobbies очищена');
    
    await query('DELETE FROM session_participants');
    console.log('  ✅ session_participants очищена');
    
    await query('DELETE FROM qualification_progress');
    console.log('  ✅ qualification_progress очищена');
    
    await query('DELETE FROM team_members');
    console.log('  ✅ team_members очищена');
    
    // Удаляем сессии
    await query('DELETE FROM game_sessions');
    console.log('  ✅ game_sessions очищена');
    
    // Удаляем вопросы и категории
    await query('DELETE FROM final_questions');
    console.log('  ✅ final_questions очищена');
    
    await query('DELETE FROM final_categories');
    console.log('  ✅ final_categories очищена');
    
    await query('DELETE FROM qualification_questions');
    console.log('  ✅ qualification_questions очищена');
    
    // Удаляем видео
    await query('DELETE FROM videos');
    console.log('  ✅ videos очищена');
    
    // Удаляем пользователей и команды
    await query('DELETE FROM users');
    console.log('  ✅ users очищена');
    
    await query('DELETE FROM teams');
    console.log('  ✅ teams очищена');
    
    // Сбрасываем автоинкремент для всех таблиц
    await query('ALTER TABLE final_answers AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_participants AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_teams AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_used_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_lobbies AUTO_INCREMENT = 1');
    await query('ALTER TABLE session_participants AUTO_INCREMENT = 1');
    await query('ALTER TABLE qualification_progress AUTO_INCREMENT = 1');
    await query('ALTER TABLE team_members AUTO_INCREMENT = 1');
    await query('ALTER TABLE game_sessions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE final_categories AUTO_INCREMENT = 1');
    await query('ALTER TABLE qualification_questions AUTO_INCREMENT = 1');
    await query('ALTER TABLE videos AUTO_INCREMENT = 1');
    await query('ALTER TABLE users AUTO_INCREMENT = 1');
    await query('ALTER TABLE teams AUTO_INCREMENT = 1');
    console.log('  ✅ Автоинкремент сброшен');
    
    // Включаем проверку внешних ключей
    await query('SET FOREIGN_KEY_CHECKS = 1');
    
    // =====================================================
    // 2. ВОССТАНАВЛИВАЕМ ДАННЫЕ
    // =====================================================
    
    console.log('♻️ Восстановление данных...');
    
    // Восстанавливаем админа
    if (admin.length > 0) {
      await query(`
        INSERT INTO users (id, full_name, email, role, team_id, is_finalist, access_code, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        admin[0].id,
        admin[0].full_name,
        admin[0].email,
        admin[0].role || 'admin',
        admin[0].team_id || null,
        admin[0].is_finalist || 0,
        admin[0].access_code || null,
        admin[0].created_at || new Date()
      ]);
      console.log(`✅ Админ восстановлен (ID: ${admin[0].id})`);
    } else {
      const result = await query(`
        INSERT INTO users (full_name, email, role) 
        VALUES ('Администратор', 'admin@quiz.local', 'admin')
      `);
      console.log(`✅ Создан новый админ (ID: ${result.insertId})`);
    }
    
    // Восстанавливаем категории
    if (categories.length > 0) {
      for (const cat of categories) {
        await query(`
          INSERT INTO final_categories (id, name, display_order, is_active, created_at) 
          VALUES (?, ?, ?, ?, ?)
        `, [cat.id, cat.name, cat.display_order || 0, cat.is_active || 1, cat.created_at || new Date()]);
      }
      console.log(`✅ Категории восстановлены (${categories.length} шт)`);
    } else {
      await query(`
        INSERT INTO final_categories (id, name, display_order) VALUES
        (1, 'Железо внутри', 1),
        (2, 'Логика и таблицы истинности', 2),
        (3, 'Сетевые технологии', 3),
        (4, 'Офисный арсенал', 4),
        (5, 'Игровой мир IT', 5)
      `);
      console.log('✅ Категории созданы заново');
    }
    
    // Восстанавливаем вопросы для отбора
    if (qualQuestions.length > 0) {
      for (const q of qualQuestions) {
        await query(`
          INSERT INTO qualification_questions (id, question_text, option_a, option_b, option_c, option_d, correct_answer, is_active, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.is_active || 1, q.created_at || new Date()]);
      }
      console.log(`✅ Вопросы отбора восстановлены (${qualQuestions.length} шт)`);
    } else {
      await query(`
        INSERT INTO qualification_questions (question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES
        ('Какое устройство является основным вычислительным элементом компьютера?', 'Процессор', 'Память', 'Жесткий диск', 'Видеокарта', 'A'),
        ('Что такое операционная система?', 'Программа для работы с файлами', 'Набор программ для управления ресурсами компьютера', 'Антивирусное ПО', 'Драйвер для принтера', 'B'),
        ('Какой язык программирования используется для создания веб-страниц?', 'Python', 'Java', 'HTML', 'C++', 'C'),
        ('Что такое IP-адрес?', 'Уникальный идентификатор устройства в сети', 'Адрес электронной почты', 'Название сайта', 'Пароль для входа', 'A'),
        ('Какая компания создала операционную систему Windows?', 'Apple', 'Google', 'Microsoft', 'IBM', 'C')
      `);
      console.log('✅ Вопросы отбора созданы заново');
    }
    
    // Восстанавливаем вопросы для финала
    if (finalQuestions.length > 0) {
      for (const q of finalQuestions) {
        await query(`
          INSERT INTO final_questions (id, category_id, value_points, question_text, correct_answer, is_active, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [q.id, q.category_id, q.value_points, q.question_text, q.correct_answer, q.is_active || 1, q.created_at || new Date()]);
      }
      console.log(`✅ Вопросы финала восстановлены (${finalQuestions.length} шт)`);
    } else {
      await query(`
        INSERT INTO final_questions (category_id, value_points, question_text, correct_answer) VALUES
        (1, 100, 'Какой процессорный сокет используется для процессоров Intel Core 13-го поколения?', 'LGA1700'),
        (1, 200, 'Что такое кэш-память процессора?', 'Быстрая память для хранения часто используемых данных'),
        (1, 300, 'Какой тип памяти используется в современных видеокартах?', 'GDDR6'),
        (1, 400, 'Что такое PCI Express?', 'Шина для подключения устройств расширения'),
        (1, 500, 'Какая материнская плата поддерживает процессоры AMD AM5?', 'X670'),
        (2, 100, 'Что такое логический элемент И (AND)?', 'Выход 1 только если все входы 1'),
        (2, 200, 'Какая операция логического сложения?', 'ИЛИ (OR)'),
        (2, 300, 'Что такое таблица истинности?', 'Таблица всех возможных значений логической функции'),
        (2, 400, 'Сколько комбинаций для 4 переменных в таблице истинности?', '16'),
        (2, 500, 'Что такое де-Моргана законы?', 'Правила преобразования логических выражений'),
        (3, 100, 'Что такое протокол TCP/IP?', 'Набор правил для передачи данных в сети'),
        (3, 200, 'Какая модель OSI имеет 7 уровней?', 'Эталонная модель взаимодействия открытых систем'),
        (3, 300, 'Что такое маршрутизация?', 'Процесс определения пути передачи данных в сети'),
        (3, 400, 'Какой протокол используется для защиты данных в сети?', 'SSL/TLS'),
        (3, 500, 'Что такое VLAN?', 'Виртуальная локальная сеть'),
        (4, 100, 'Какая функция в Excel вычисляет сумму?', 'SUM'),
        (4, 200, 'Что такое VBA?', 'Visual Basic for Applications'),
        (4, 300, 'Какой формат файлов используется для макросов Excel?', 'XLSM'),
        (4, 400, 'Что такое сводная таблица в Excel?', 'Инструмент для анализа и агрегации данных'),
        (4, 500, 'Какая функция в Excel ищет значение по вертикали?', 'ВПР (VLOOKUP)'),
        (5, 100, 'Какая компания создала игру Minecraft?', 'Mojang'),
        (5, 200, 'Что такое FPS в играх?', 'Кадров в секунду'),
        (5, 300, 'Какая игра считается первой в жанре MMO?', 'Ultima Online'),
        (5, 400, 'Что такое Ray Tracing?', 'Технология трассировки лучей'),
        (5, 500, 'Какая игровая консоль вышла первой?', 'Magnavox Odyssey')
      `);
      console.log('✅ Вопросы финала созданы заново');
    }
    
    // Восстанавливаем видео
    if (videosData.length > 0) {
      for (const v of videosData) {
        await query(`
          INSERT INTO videos (id, title, url, type, is_active, created_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [v.id, v.title, v.url, v.type, v.is_active || 1, v.created_at || new Date()]);
      }
      console.log(`✅ Видео восстановлены (${videosData.length} шт)`);
    } else {
      await query(`
        INSERT INTO videos (title, url, type) VALUES
        ('Вступление к игре', '/videos/intro.mp4', 'intro'),
        ('Переход между турами', '/videos/between_tours.mp4', 'between_tours'),
        ('Финальное видео', '/videos/final.mp4', 'outro')
      `);
      console.log('✅ Видео созданы заново');
    }
    
    // Создаём финальное лобби
    await query(
      'INSERT INTO final_lobbies (session_id, game_started, game_finished) VALUES (?, ?, ?)',
      ['FINAL', false, false]
    );
    console.log('✅ Финальное лобби создано');
    
    // =====================================================
    // 3. ПРОВЕРЯЕМ
    // =====================================================
    
    const checkUsers = await query('SELECT id, full_name, email, role FROM users');
    console.log(`👤 Пользователей в БД: ${checkUsers.length}`);
    
    const checkSessions = await query('SELECT * FROM game_sessions');
    console.log(`🎮 Сессий в БД: ${checkSessions.length}`);
    if (checkSessions.length > 0) {
      console.warn('⚠️ ВНИМАНИЕ! Сессии не удалились!', checkSessions);
    }
    
    const checkLobby = await query('SELECT * FROM final_lobbies');
    console.log(`🏆 Финальных лобби: ${checkLobby.length}`);
    
    console.log('✅ БАЗА ДАННЫХ ПОЛНОСТЬЮ ОЧИЩЕНА И ВОССТАНОВЛЕНА!');
    
    res.json({ 
      success: true, 
      message: 'База данных полностью очищена, все данные восстановлены! Сессий нет.',
      sessionsRemoved: checkSessions.length === 0,
      usersCount: checkUsers.length
    });
  } catch (error) {
    console.error('❌ ОШИБКА ОЧИСТКИ БД:', error);
    // Включаем проверку внешних ключей в случае ошибки
    try {
      await query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      console.error('Ошибка включения FOREIGN_KEY_CHECKS:', e);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка очистки БД: ' + error.message 
    });
  }
});

module.exports = router;