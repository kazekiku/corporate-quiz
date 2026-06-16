// backend/src/models/Team.js
const { query } = require('../config/database');

class Team {
    // Упрощённое создание команды (без кода)
    static async createSimple(teamName, captainId) {
        const sql = `INSERT INTO teams (name, captain_id) VALUES (?, ?)`;
        const result = await query(sql, [teamName, captainId]);
        
        console.log('✅ Команда создана, ID:', result.insertId);
        
        // Добавляем капитана в team_members
        const memberSql = `INSERT INTO team_members (team_id, user_id) VALUES (?, ?)`;
        await query(memberSql, [result.insertId, captainId]);
        
        return { id: result.insertId, name: teamName, captainId };
    }
    
    static async findById(id) {
        const results = await query('SELECT * FROM teams WHERE id = ?', [id]);
        return results[0];
    }
    
    static async getTeamWithMembers(teamId) {
        const team = await query('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team[0]) return null;
        
        const members = await query(`
            SELECT u.id, u.full_name, u.role
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ?
        `, [teamId]);
        
        return { ...team[0], members };
    }
}

module.exports = Team;