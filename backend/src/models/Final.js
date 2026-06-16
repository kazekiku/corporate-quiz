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
             fp.team_id, fp.user_id, fp.is_ready,
             ft.name as team_name, ft.score
      FROM final_lobbies fl
      LEFT JOIN final_participants fp ON fl.id = fp.lobby_id
      LEFT JOIN final_teams ft ON fp.team_id = ft.id
      WHERE fl.session_id = ?
    `;
    const results = await query(sql, [sessionId]);
    
    if (results.length === 0) return null;
    
    const teamsMap = {};
    for (const row of results) {
      if (row.team_id) {
        if (!teamsMap[row.team_id]) {
          teamsMap[row.team_id] = {
            id: row.team_id,
            name: row.team_name,
            score: row.score || 0,
            participants: [],
            isReady: false
          };
        }
        if (row.user_id) {
          teamsMap[row.team_id].participants.push(row.user_id);
        }
        if (row.is_ready) {
          teamsMap[row.team_id].isReady = true;
        }
      }
    }
    
    return {
      id: results[0].id,
      sessionId: results[0].session_id,
      gameStarted: results[0].game_started === 1,
      teams: Object.values(teamsMap),
      createdAt: results[0].created_at
    };
  }
  
  static async addTeam(sessionId, teamId, userId) {
    const lobbySql = `SELECT id FROM final_lobbies WHERE session_id = ?`;
    const lobby = await query(lobbySql, [sessionId]);
    
    if (lobby.length === 0) return null;
    
    const teamSql = `SELECT name FROM teams WHERE id = ?`;
    const team = await query(teamSql, [teamId]);
    if (team.length === 0) return null;
    
    // Проверяем, есть ли уже команда
    const existing = await query(
      'SELECT id FROM final_teams WHERE lobby_id = ? AND name = ?',
      [lobby[0].id, team[0].name]
    );
    
    let finalTeamId;
    if (existing.length === 0) {
      const result = await query(
        'INSERT INTO final_teams (lobby_id, name, score) VALUES (?, ?, ?)',
        [lobby[0].id, team[0].name, 0]
      );
      finalTeamId = result.insertId;
    } else {
      finalTeamId = existing[0].id;
    }
    
    // Добавляем участника
    await query(
      'INSERT INTO final_participants (lobby_id, team_id, user_id, is_ready) VALUES (?, ?, ?, ?)',
      [lobby[0].id, finalTeamId, userId, false]
    );
    
    return true;
  }
  
  static async setUserReady(sessionId, userId, isReady) {
    const lobbySql = `SELECT id FROM final_lobbies WHERE session_id = ?`;
    const lobby = await query(lobbySql, [sessionId]);
    
    if (lobby.length === 0) return false;
    
    const sql = `
      UPDATE final_participants 
      SET is_ready = ? 
      WHERE lobby_id = ? AND user_id = ?
    `;
    await query(sql, [isReady, lobby[0].id, userId]);
    
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
      UPDATE final_teams 
      SET score = ? 
      WHERE id = ? AND lobby_id = ?
    `;
    await query(sql, [score, teamId, lobby[0].id]);
  }
  
  static async getUserTeam(sessionId, userId) {
    const sql = `
      SELECT ft.id, ft.name, ft.score
      FROM final_participants fp
      JOIN final_teams ft ON fp.team_id = ft.id
      JOIN final_lobbies fl ON fp.lobby_id = fl.id
      WHERE fl.session_id = ? AND fp.user_id = ?
    `;
    const results = await query(sql, [sessionId, userId]);
    return results[0] || null;
  }
}

module.exports = Final;