const { query } = require('../config/database');

class Question {
    static async getRandomQualificationQuestions(limit = 10) {
        const sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer
            FROM qualification_questions
            WHERE is_active = TRUE
            ORDER BY RAND()
            LIMIT ?
        `;
        return await query(sql, [limit]);
    }
    
    static async getFinalQuestions() {
        const sql = `
            SELECT 
                fc.id as category_id,
                fc.name as category_name,
                fq.value_points,
                fq.question_text,
                fq.correct_answer
            FROM final_questions fq
            JOIN final_categories fc ON fq.category_id = fc.id
            ORDER BY fc.display_order, fq.value_points
        `;
        const results = await query(sql);
        
        const categories = {};
        for (const row of results) {
            if (!categories[row.category_id]) {
                categories[row.category_id] = {
                    id: row.category_id,
                    name: row.category_name,
                    questions: []
                };
            }
            categories[row.category_id].questions.push({
                value: row.value_points,
                question: row.question_text,
                answer: row.correct_answer,
                isUsed: false
            });
        }
        
        return Object.values(categories);
    }
    
    static async checkQualificationAnswer(questionId, answer) {
        const sql = `SELECT correct_answer FROM qualification_questions WHERE id = ?`;
        const result = await query(sql, [questionId]);
        if (result.length === 0) return false;
        return result[0].correct_answer === answer;
    }
    
    static async markFinalQuestionUsed(lobbyId, categoryId, valuePoints) {
        const sql = `
            INSERT INTO final_used_questions (lobby_id, category_id, value_points)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE id = id
        `;
        await query(sql, [lobbyId, categoryId, valuePoints]);
    }
    
    static async isFinalQuestionUsed(lobbyId, categoryId, valuePoints) {
        const sql = `
            SELECT id FROM final_used_questions 
            WHERE lobby_id = ? AND category_id = ? AND value_points = ?
        `;
        const result = await query(sql, [lobbyId, categoryId, valuePoints]);
        return result.length > 0;
    }
}

module.exports = Question;