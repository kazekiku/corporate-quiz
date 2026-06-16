// backend/src/models/User.js
const { query } = require('../config/database');

class User {
    static async createSimple(fullName, email) {
        const sql = `
            INSERT INTO users (full_name, email, role)
            VALUES (?, ?, 'L')
        `;
        const result = await query(sql, [fullName, email]);
        
        console.log('📝 Пользователь создан:', { id: result.insertId, fullName, role: 'L' });
        
        return {
            id: result.insertId,
            full_name: fullName,
            email: email,
            role: 'L'
        };
    }
    
    static async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const results = await query(sql, [email]);
        return results[0];
    }
    
    static async findById(id) {
        const sql = `SELECT * FROM users WHERE id = ?`;
        const results = await query(sql, [id]);
        return results[0];
    }
    
    static async updateTeamId(userId, teamId) {
        const sql = `UPDATE users SET team_id = ? WHERE id = ?`;
        await query(sql, [teamId, userId]);
    }
    
    static async setFinalist(userId, isFinalist) {
        const sql = `UPDATE users SET is_finalist = ? WHERE id = ?`;
        await query(sql, [isFinalist, userId]);
    }
}

module.exports = User;