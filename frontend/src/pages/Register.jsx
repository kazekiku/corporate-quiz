import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, getMe } from '../api/client';
import { useToast } from '../hooks/useToast';

// SVG иконка для регистрации
const BuildingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="18" />
    <line x1="15" y1="22" x2="15" y2="18" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
);

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getMe();
          if (res.data?.data) {
            navigate('/main');
          }
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      showToast('Введите название отдела', 'warning');
      return;
    }
    
    if (teamName.length > 50) {
      showToast('Название отдела не может превышать 50 символов', 'warning');
      return;
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
      
      showToast('Отдел успешно создан!', 'success');
      navigate('/main');
      
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      showToast(err.response?.data?.message || 'Ошибка при создании отдела', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">
            <BuildingIcon />
          </div>
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

          <button type="submit" disabled={loading} className="register-btn">
            {loading ? 'Создание...' : 'СОЗДАТЬ ОТДЕЛ'}
          </button>
        </form>
      </div>
    </div>
  );
}