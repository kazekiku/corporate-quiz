-- corporate_quiz.sql
-- Создание базы данных
CREATE DATABASE IF NOT EXISTS corporate_quiz;
USE corporate_quiz;

-- =====================================================
-- ТАБЛИЦЫ ДЛЯ 1 ТУРА
-- =====================================================

-- Таблица сложности вопросов
CREATE TABLE IF NOT EXISTS difficulty_levels (
    id INT PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    points INT NOT NULL
);

INSERT INTO difficulty_levels (id, name, points) VALUES
(1, 'Лёгкий', 10),
(2, 'Средний', 20),
(3, 'Сложный', 30)
ON DUPLICATE KEY UPDATE name=VALUES(name), points=VALUES(points);

-- Таблица категорий вопросов 1 тура
CREATE TABLE IF NOT EXISTS qualification_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO qualification_categories (name, description) VALUES
('Python', 'Вопросы по языку программирования Python'),
('Алгоритмы', 'Вопросы по алгоритмам и структурам данных'),
('Базы данных', 'Вопросы по SQL и базам данных'),
('Сетевые технологии', 'Вопросы по компьютерным сетям'),
('Общие знания', 'Общие вопросы по IT')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Таблица вопросов 1 тура
CREATE TABLE IF NOT EXISTS qualification_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    difficulty_id INT,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    explanation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES qualification_categories(id),
    FOREIGN KEY (difficulty_id) REFERENCES difficulty_levels(id)
);

-- Вставка вопросов (первые 10 для примера)
INSERT INTO qualification_questions (category_id, difficulty_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES
(1, 1, 'Что выведет код?\na = 5\nb = 2\nprint(a ** b)', '10', '25', '7', '52', 'B', '5 ** 2 = 25'),
(1, 1, 'Какой оператор в Python используется для проверки равенства двух значений?', '=', '==', '!=', ':=', 'B', 'Оператор == проверяет равенство'),
(1, 1, 'Что делает метод .append(x) при вызове на списке в Python?', 'Удаляет элемент x', 'Вставляет в начало', 'Добавляет в конец', 'Возвращает индекс', 'C', 'append() добавляет элемент в конец списка'),
(1, 1, 'Дан список arr = [3, 1, 4, 1, 5]. Какое значение вернёт функция len(arr)?', '3', '4', '5', '14', 'C', 'В списке 5 элементов'),
(1, 1, 'Что делает оператор // в Python?', 'Обычное деление', 'Целочисленное деление', 'Возведение в степень', 'Остаток от деления', 'B', '// выполняет деление нацело'),
(1, 1, 'Что выведет код?\nx = 10\ny = 3\nprint(x % y)', '1', '3', '3.33', '0', 'A', '10 % 3 = 1'),
(1, 1, 'Какой цикл в Python выполняет блок кода, пока условие истинно?', 'for', 'while', 'if', 'def', 'B', 'while выполняет пока условие истинно'),
(1, 1, 'Что происходит при операторе break внутри цикла?', 'Пропуск итерации', 'Цикл завершается', 'Цикл начинается заново', 'Ошибка', 'B', 'break досрочно завершает цикл'),
(1, 1, 'Что такое рекурсия?', 'Цикл с условием', 'Функция вызывает себя', 'Тип данных', 'Обработка исключений', 'B', 'Рекурсия — вызов функции самой себя'),
(1, 1, 'Как преобразовать строку "123" в целое число?', 'str(123)', 'int("123")', 'float("123")', 'bool("123")', 'B', 'int() преобразует строку в число');

-- =====================================================
-- ТАБЛИЦЫ ДЛЯ 2 ТУРА (Финал)
-- =====================================================

-- Таблица категорий финала
CREATE TABLE IF NOT EXISTS final_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0
);

INSERT INTO final_categories (name, display_order) VALUES
('Железо внутри', 1),
('Логика и таблицы истинности', 2),
('Сетевые технологии', 3),
('Офисный арсенал', 4),
('Игровой мир IT', 5);

-- Таблица вопросов финала
CREATE TABLE IF NOT EXISTS final_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    value_points INT NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer VARCHAR(500) NOT NULL,
    explanation TEXT,
    FOREIGN KEY (category_id) REFERENCES final_categories(id)
);

INSERT INTO final_questions (category_id, value_points, question_text, correct_answer, explanation) VALUES
(1, 100, 'Как называется основная печатная плата, к которой подключаются все компоненты компьютера?', 'материнская плата', 'Системная плата'),
(1, 200, 'Как называется запоминающее устройство на магнитных дисках с движущимися головками?', 'жёсткий диск', 'HDD'),
(1, 300, 'Как называется система охлаждения, использующая жидкость для отвода тепла от процессора?', 'система жидкостного охлаждения', 'СЖО'),
(1, 400, 'Какой тип разъёма для накопителей пришёл на смену устаревшему IDE?', 'sata', 'Serial ATA'),
(1, 500, 'Какое устройство ввода преобразует бумажные документы и фотографии в цифровой вид?', 'сканер', 'Оптическое устройство'),
(2, 100, 'Сколько значений может принимать одна логическая переменная?', '2', 'Истина или ложь'),
(2, 200, 'Какая логическая операция даёт истину, только когда значения операндов различны?', 'исключающее или', 'XOR'),
(2, 300, 'Какой логический элемент реализует операцию отрицания?', 'инвертор', 'NOT'),
(2, 400, 'Утверждение: «Все процессоры работают». Какое высказывание будет его отрицанием?', 'хотя бы один процессор не работает', 'Отрицание всеобщего утверждения'),
(2, 500, 'Как называется логическое выражение, которое всегда истинно при любых значениях переменных?', 'тавтология', 'Всегда истинное выражение'),
(3, 100, 'Как называется уникальный числовой адрес устройства в сети, например 192.168.1.1?', 'ip-адрес', 'Internet Protocol address'),
(3, 200, 'Какой протокол по умолчанию используется для передачи веб-страниц?', 'http', 'HyperText Transfer Protocol'),
(3, 300, 'Как называется домашнее устройство, совмещающее функции модема, маршрутизатора и точки доступа Wi-Fi?', 'роутер', 'Маршрутизатор'),
(3, 400, 'Какая топология сети предполагает подключение всех узлов к одному центральному устройству?', 'звезда', 'Топология звезда'),
(3, 500, 'Квантовый компьютер использует кубиты. Как называется квантовое явление, благодаря которому кубит может находиться в состоянии суперпозиции 0 и 1 одновременно?', 'квантовая суперпозиция', 'Суперпозиция'),
(4, 100, 'Какое действие в Microsoft Word выполняет сочетание Ctrl+S?', 'сохранение документа', 'Сохранение'),
(4, 200, 'Как в PowerPoint называется визуальный эффект при смене одного слайда другим?', 'переход', 'Анимация перехода'),
(4, 300, 'Какое расширение по умолчанию имеет файл книги Excel?', '.xlsx', 'Excel файл'),
(4, 400, 'Как называется ссылка вида $A$1, которая не изменяется при копировании формулы в Excel?', 'абсолютная ссылка', 'Фиксированная ссылка'),
(4, 500, 'Что подсчитывает функция СЧЁТ в Excel?', 'количество ячеек с числами', 'Только числовые значения'),
(5, 100, 'Какой старый шутер запускают на всем подряд?', 'doom', 'Культовая игра'),
(5, 200, 'Какая технология рендеринга симулирует поведение света для получения фотореалистичного изображения?', 'трассировка лучей', 'Ray Tracing'),
(5, 300, 'Как называется популярный игровой движок от Epic Games, используемый во многих AAA-проектах?', 'unreal engine', 'Игровой движок'),
(5, 400, 'Как аббревиатурой называют технологию полного погружения в цифровое окружение?', 'vr', 'Virtual Reality'),
(5, 500, 'В какой игре 1981 года состоялся дебют персонажа Марио?', 'donkey kong', 'Аркадная игра');

-- =====================================================
-- ТАБЛИЦЫ ДЛЯ ИГРОВОЙ ЛОГИКИ
-- =====================================================

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('L', 'E') NOT NULL DEFAULT 'E',
    team_id INT,
    is_finalist BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_team_id (team_id)
);

-- Таблица команд
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    captain_id INT,
    qualifying_score INT DEFAULT 0,
    is_finalist BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (captain_id) REFERENCES users(id),
    INDEX idx_code (code)
);

-- Связь пользователей с командами
CREATE TABLE IF NOT EXISTS team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_team_user (team_id, user_id)
);

-- Таблица прогресса отборочного тура
CREATE TABLE IF NOT EXISTS qualification_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    current_index INT DEFAULT 0,
    team_score INT DEFAULT 0,
    players_order TEXT,
    current_player_id INT,
    time_left INT DEFAULT 600,
    answers TEXT,
    finished BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    INDEX idx_team_id (team_id)
);

-- =====================================================
-- ТАБЛИЦЫ ДЛЯ ФИНАЛА (ИСПРАВЛЕННЫЕ)
-- =====================================================

-- Таблица финальных лобби
CREATE TABLE IF NOT EXISTS final_lobbies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(20) UNIQUE NOT NULL,
    game_started BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id)
);

-- Таблица участников финала
CREATE TABLE IF NOT EXISTS final_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    user_id INT,
    team_id INT,
    score INT DEFAULT 0,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lobby_user (lobby_id, user_id),
    INDEX idx_lobby_id (lobby_id)
);

-- Таблица использованных вопросов финала
CREATE TABLE IF NOT EXISTS final_used_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lobby_id INT NOT NULL,
    category_id INT NOT NULL,
    value_points INT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lobby_id) REFERENCES final_lobbies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lobby_question (lobby_id, category_id, value_points)
);

-- =====================================================
-- ВЬЮ ДЛЯ РЕЙТИНГА
-- =====================================================

-- Вью для рейтинга
CREATE OR REPLACE VIEW rating_view AS
SELECT 
    t.id,
    t.name,
    t.qualifying_score as score,
    t.is_finalist,
    (SELECT COUNT(*) + 1 FROM teams t2 WHERE t2.qualifying_score > t.qualifying_score) as position
FROM teams t
WHERE t.qualifying_score > 0
ORDER BY t.qualifying_score DESC;