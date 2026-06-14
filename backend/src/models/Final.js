const { query } = require('../config/database');

class Final {
    static async createLobby(sessionId) {
        const sql = `INSERT INTO final_lobbies (session_id) VALUES (?)`;
        const result = await query(sql, [sessionId]);
        return result.insertId;
    }
    
    static async getLobby(sessionId) {
        const sql = `
            SELECT fl.*, 
                   fp.team_id, fp.score, fp.is_ready,
                   t.name as team_name
            FROM final_lobbies fl
            LEFT JOIN final_participants fp ON fl.id = fp.lobby_id
            LEFT JOIN teams t ON fp.team_id = t.id
            WHERE fl.session_id = ?
        `;
        const results = await query(sql, [sessionId]);
        
        if (results.length === 0) return null;
        
        const teams = [];
        for (const row of results) {
            if (row.team_id) {
                teams.push({
                    id: row.team_id,
                    name: row.team_name,
                    score: row.score || 0,
                    isReady: row.is_ready || false
                });
            }
        }
        
        return {
            id: results[0].id,
            sessionId: results[0].session_id,
            gameStarted: results[0].game_started === 1,
            teams,
            createdAt: results[0].created_at
        };
    }
    
    static async addTeam(sessionId, teamId) {
        // Сначала получаем lobby_id
        const lobbySql = `SELECT id FROM final_lobbies WHERE session_id = ?`;
        const lobby = await query(lobbySql, [sessionId]);
        
        if (lobby.length === 0) return null;
        
        const sql = `
            INSERT INTO final_participants (lobby_id, team_id, score, is_ready)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE id = id
        `;
        await query(sql, [lobby[0].id, teamId, 0, false]);
        
        return true;
    }
    
    static async setTeamReady(sessionId, teamId, isReady) {
        const lobbySql = `SELECT id FROM final_lobbies WHERE session_id = ?`;
        const lobby = await query(lobbySql, [sessionId]);
        
        if (lobby.length === 0) return false;
        
        const sql = `
            UPDATE final_participants 
            SET is_ready = ? 
            WHERE lobby_id = ? AND team_id = ?
        `;
        await query(sql, [isReady, lobby[0].id, teamId]);
        
        return true;
    }
    
    static async startGame(sessionId) {
        const sql = `UPDATE final_lobbies SET game_started = TRUE WHERE session_id = ?`;
        await query(sql, [sessionId]);
    }
    
    static async updateTeamScore(sessionId, teamId, score) {
        const lobbySql = `SELECT id FROM final_lobbies WHERE session_id = ?`;
        const lobby = await query(lobbySql, [sessionId]);
        
        if (lobby.length === 0) return;
        
        const sql = `
            UPDATE final_participants 
            SET score = ? 
            WHERE lobby_id = ? AND team_id = ?
        `;
        await query(sql, [score, lobby[0].id, teamId]);
    }
}

module.exports = Final;