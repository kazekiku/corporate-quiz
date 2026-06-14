// backend/src/models/User.js
const { query } = require('../config/database');

class User {
    static async create(userData) {
        const { fullName, email, code } = userData;
        
        // Определяем роль по коду: L - капитан, остальные - сотрудник
        const userRole = code.slice(-1) === 'L' ? 'L' : 'E';
        
        const sql = `
            INSERT INTO users (full_name, email, role)
            VALUES (?, ?, ?)
        `;
        const result = await query(sql, [fullName, email, userRole]);
        
        console.log('📝 User created:', { id: result.insertId, fullName, role: userRole });
        
        return {
            id: result.insertId,
            full_name: fullName,
            email: email,
            role: userRole
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