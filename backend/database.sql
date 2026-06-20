-- =====================================================
-- ПОЛНАЯ СТРУКТУРА БАЗЫ ДАННЫХ ДЛЯ КОРПОРАТИВНОЙ ВИКТОРИНЫ
-- =====================================================

-- Создаём базу данных (если ещё не создана)
CREATE DATABASE IF NOT EXISTS corporate_quiz;
USE corporate_quiz;

-- =====================================================
-- 1. ТАБЛИЦА КОМАНД
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    access_code VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    is_activated BOOLEAN DEFAULT FALSE,
    captain_name VARCHAR(255),
    qualifying_score INT DEFAULT 0,
    is_finalist BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'captain', 'member') NOT NULL DEFAULT 'member',
    is_finalist BOOLEAN DEFAULT FALSE,
    access_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- =====================================================
-- 3. ТАБЛИЦА ВОПРОСОВ (ОБНОВЛЕННАЯ СТРУКТУРА)
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tour_type ENUM('qualification', 'final') NOT NULL,
    category VARCHAR(50),
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    points INT DEFAULT 10,
    time_limit INT DEFAULT 600,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. ТАБЛИЦА КАТЕГОРИЙ ДЛЯ ФИНАЛА
-- =====================================================
CREATE TABLE IF NOT EXISTS final_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. ТАБЛИЦА ВОПРОСОВ ДЛЯ ФИНАЛА
-- =====================================================
CREATE TABLE IF NOT EXISTS final_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    value_points INT NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES final_categories(id) ON DELETE CASCADE
);

-- =====================================================
-- 6. ТАБЛИЦА ОТБОРОЧНЫХ ВОПРОСОВ
-- =====================================================
CREATE TABLE IF NOT EXISTS qualification_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. ТАБЛИЦА ИГРОВЫХ СЕССИЙ
-- =====================================================
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('qualification', 'final') NOT NULL,
    status ENUM('waiting', 'ready', 'active', 'finished') DEFAULT 'waiting',
    started_at DATETIME,
    finished_at DATETIME,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =====================================================
-- 8. ТАБЛИЦА УЧАСТНИКОВ СЕССИЙ
-- =====================================================
CREATE TABLE IF NOT EXISTS session_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    team_id INT NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_team (session_id, team_id)
);

-- =====================================================
-- 9. ТАБЛИЦА ПРОГРЕССА ОТБОРОЧНОГО ТУРА
-- =====================================================
CREATE TABLE IF NOT EXISTS qualification_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    current_index INT DEFAULT 0,
    team_score INT DEFAULT 0,
    players_order JSON,
    current_player_id INT,
    time_left INT DEFAULT 900,
    answers JSON,
    finished BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team (team_id)
);

-- =====================================================
-- 10. ТАБЛИЦА ФИНАЛЬНЫХ ЛОББИ
-- =====================================================
CREATE TABLE IF NOT EXISTS final_lobbies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    game_started BOOLEAN DEFAULT FALSE,
    game_finished BOOLEAN DEFAULT FALSE,
    current_turn_team_id INT,
    current_question_id INT,
    question_started_at DATETIME,
    current_results JSON,
    results_shown BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. ТАБЛИЦА ФИНАЛЬНЫХ КОМАНД
-- =====================================================
CREATE TABLE IF NOT EXISTS final_teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    score INT DEFAULT 0,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE
);

-- =====================================================
-- 12. ТАБЛИЦА УЧАСТНИКОВ ФИНАЛА
-- =====================================================
CREATE TABLE IF NOT EXISTS final_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES final_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lobby_team_user (lobby_id, team_id, user_id)
);

-- =====================================================
-- 13. ТАБЛИЦА ОТВЕТОВ В ФИНАЛЕ
-- =====================================================
CREATE TABLE IF NOT EXISTS final_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    team_id INT NOT NULL,
    question_id INT NOT NULL,
    answer TEXT,
    answered_at DATETIME,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES final_teams(id) ON DELETE CASCADE
);

-- =====================================================
-- 14. ТАБЛИЦА ИСПОЛЬЗОВАННЫХ ВОПРОСОВ В ФИНАЛЕ
-- =====================================================
CREATE TABLE IF NOT EXISTS final_used_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    category_id INT NOT NULL,
    value_points INT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lobby_category_value (lobby_id, category_id, value_points)
);

-- =====================================================
-- 15. ТАБЛИЦА ВИДЕО
-- =====================================================
CREATE TABLE IF NOT EXISTS videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type ENUM('intro', 'between_tours', 'outro') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 16. ТАБЛИЦА ДЛЯ РЕЙТИНГА (VIEW)
-- =====================================================
CREATE OR REPLACE VIEW rating_view AS
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
ORDER BY score DESC;

-- =====================================================
-- 17. ДОБАВЛЯЕМ КАТЕГОРИИ ДЛЯ ФИНАЛА
-- =====================================================
INSERT IGNORE INTO final_categories (id, name, display_order) VALUES
(1, 'Железо внутри', 1),
(2, 'Логика и таблицы истинности', 2),
(3, 'Сетевые технологии', 3),
(4, 'Офисный арсенал', 4),
(5, 'Игровой мир IT', 5);

-- =====================================================
-- 18. ДОБАВЛЯЕМ ПРИМЕРНЫЕ ВОПРОСЫ ДЛЯ ОТБОРОЧНОГО ТУРА
-- =====================================================
INSERT IGNORE INTO qualification_questions (question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES
('Какое устройство является основным вычислительным элементом компьютера?', 'Процессор', 'Память', 'Жесткий диск', 'Видеокарта', 'A'),
('Что такое операционная система?', 'Программа для работы с файлами', 'Набор программ для управления ресурсами компьютера', 'Антивирусное ПО', 'Драйвер для принтера', 'B'),
('Какой язык программирования используется для создания веб-страниц?', 'Python', 'Java', 'HTML', 'C++', 'C'),
('Что такое IP-адрес?', 'Уникальный идентификатор устройства в сети', 'Адрес электронной почты', 'Название сайта', 'Пароль для входа', 'A'),
('Какая компания создала операционную систему Windows?', 'Apple', 'Google', 'Microsoft', 'IBM', 'C');

-- =====================================================
-- 19. ДОБАВЛЯЕМ ПРИМЕРНЫЕ ВОПРОСЫ ДЛЯ ФИНАЛА
-- =====================================================
INSERT IGNORE INTO final_questions (category_id, value_points, question_text, correct_answer) VALUES
-- Железо внутри (категория 1)
(1, 100, 'Какой процессорный сокет используется для процессоров Intel Core 13-го поколения?', 'LGA1700'),
(1, 200, 'Что такое кэш-память процессора?', 'Быстрая память для хранения часто используемых данных'),
(1, 300, 'Какой тип памяти используется в современных видеокартах?', 'GDDR6'),
(1, 400, 'Что такое PCI Express?', 'Шина для подключения устройств расширения'),
(1, 500, 'Какая материнская плата поддерживает процессоры AMD AM5?', 'X670'),

-- Логика и таблицы истинности (категория 2)
(2, 100, 'Что такое логический элемент И (AND)?', 'Выход 1 только если все входы 1'),
(2, 200, 'Какая операция логического сложения?', 'ИЛИ (OR)'),
(2, 300, 'Что такое таблица истинности?', 'Таблица всех возможных значений логической функции'),
(2, 400, 'Сколько комбинаций для 4 переменных в таблице истинности?', '16'),
(2, 500, 'Что такое де-Моргана законы?', 'Правила преобразования логических выражений'),

-- Сетевые технологии (категория 3)
(3, 100, 'Что такое протокол TCP/IP?', 'Набор правил для передачи данных в сети'),
(3, 200, 'Какая модель OSI имеет 7 уровней?', 'Эталонная модель взаимодействия открытых систем'),
(3, 300, 'Что такое маршрутизация?', 'Процесс определения пути передачи данных в сети'),
(3, 400, 'Какой протокол используется для защиты данных в сети?', 'SSL/TLS'),
(3, 500, 'Что такое VLAN?', 'Виртуальная локальная сеть'),

-- Офисный арсенал (категория 4)
(4, 100, 'Какая функция в Excel вычисляет сумму?', 'SUM'),
(4, 200, 'Что такое VBA?', 'Visual Basic for Applications'),
(4, 300, 'Какой формат файлов используется для макросов Excel?', 'XLSM'),
(4, 400, 'Что такое сводная таблица в Excel?', 'Инструмент для анализа и агрегации данных'),
(4, 500, 'Какая функция в Excel ищет значение по вертикали?', 'ВПР (VLOOKUP)'),

-- Игровой мир IT (категория 5)
(5, 100, 'Какая компания создала игру Minecraft?', 'Mojang'),
(5, 200, 'Что такое FPS в играх?', 'Кадров в секунду'),
(5, 300, 'Какая игра считается первой в жанре MMO?', 'Ultima Online'),
(5, 400, 'Что такое Ray Tracing?', 'Технология трассировки лучей'),
(5, 500, 'Какая игровая консоль вышла первой?', 'Magnavox Odyssey');

-- =====================================================
-- 20. ДОБАВЛЯЕМ АДМИНИСТРАТОРА
-- =====================================================
INSERT IGNORE INTO users (full_name, email, role) 
VALUES ('Администратор', 'admin@quiz.local', 'admin');

-- =====================================================
-- 21. ДОБАВЛЯЕМ ПРИМЕРНЫЕ ВИДЕО
-- =====================================================
INSERT IGNORE INTO videos (title, url, type) VALUES
('Вступление к игре', '/videos/intro.mp4', 'intro'),
('Переход между турами', '/videos/between_tours.mp4', 'between_tours'),
('Финальное видео', '/videos/final.mp4', 'outro');

-- =====================================================
-- ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ
-- =====================================================
SHOW TABLES;