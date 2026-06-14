// backend/src/models/Team.js
const { query } = require('../config/database');

class Team {
    static async create(teamName, captainId) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log('📝 Создаём команду:', { teamName, code, captainId });
        
        const sql = `INSERT INTO teams (name, code, captain_id) VALUES (?, ?, ?)`;
        const result = await query(sql, [teamName, code, captainId]);
        
        console.log('✅ Команда создана, ID:', result.insertId);
        
        // Добавляем капитана в team_members
        const memberSql = `INSERT INTO team_members (team_id, user_id, is_ready) VALUES (?, ?, ?)`;
        await query(memberSql, [result.insertId, captainId, false]);
        console.log('✅ Капитан добавлен в team_members');
        
        return { id: result.insertId, name: teamName, code, captainId };
    }
    
    static async findByCode(code) {
        const results = await query('SELECT * FROM teams WHERE code = ?', [code]);
        return results[0];
    }
    
    static async findById(id) {
        const results = await query('SELECT * FROM teams WHERE id = ?', [id]);
        return results[0];
    }
    
    static async getTeamWithMembers(teamId) {
        const team = await query('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team[0]) return null;
        
        const members = await query(`
            SELECT u.id, u.full_name, u.role, tm.is_ready
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ?
        `, [teamId]);
        
        console.log('📋 Найдено участников:', members.length);
        
        return { ...team[0], members };
    }
    
    static async addMember(teamId, userId) {
        await query('INSERT INTO team_members (team_id, user_id, is_ready) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id', 
            [teamId, userId, false]);
    }
    
    static async setReady(teamId, userId, isReady) {
        await query('UPDATE team_members SET is_ready = ? WHERE team_id = ? AND user_id = ?', 
            [isReady, teamId, userId]);
    }
}

module.exports = Team;