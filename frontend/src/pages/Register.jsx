import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, getMe } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Проверяем, есть ли уже активная сессия
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getMe();
          if (res.data?.data) {
            // Уже есть активная сессия - перенаправляем на главную
            navigate('/main');
          }
        } catch (err) {
          // Токен невалидный, чистим
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!teamName.trim()) {
      return setError('Введите название отдела');
    }
    
    if (teamName.length > 50) {
      return setError('Название отдела не может превышать 50 символов');
    }
    
    setLoading(true);
    try {
      const res = await register({ teamName });
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      
      if (res.data.data?.teamId) {
        localStorage.setItem('teamId', res.data.data.teamId.toString());
        localStorage.setItem('teamName', res.data.data.teamName);
      }
      
      navigate('/main');
      
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(err.response?.data?.message || 'Ошибка при создании отдела');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">🏢</div>
          <div>
            <h1>Корпоративные бои</h1>
            <p>Создайте свой отдел</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="register-group">
            <label>НАЗВАНИЕ ОТДЕЛА</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Например: IT-отдел, Бухгалтерия, Маркетинг..."
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="register-error">{error}</div>}

          <button type="submit" disabled={loading} className="register-btn">
            {loading ? 'Создание...' : '🚀 СОЗДАТЬ ОТДЕЛ'}
          </button>
        </form>
      </div>
    </div>
  );
}