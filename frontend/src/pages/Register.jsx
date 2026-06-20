import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { registerTeam, loginByCode, adminLogin } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mode, setMode] = useState('register');
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/main');
      }
    }
  }, [navigate]);

  // ========== РЕГИСТРАЦИЯ ПО КОДУ ==========
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      showToast('Введите код доступа', 'warning');
      return;
    }
    if (!captainName.trim()) {
      showToast('Введите имя капитана', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const res = await registerTeam({
        accessCode: accessCode.toUpperCase().trim(),
        captainName: captainName.trim()
      });
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        showToast('Регистрация успешна!', 'success');
        navigate('/intro-video');
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      showToast(err.response?.data?.message || 'Ошибка регистрации', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== ВХОД ПО КОДУ ==========
  const handleLoginByCode = async (e) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      showToast('Введите код доступа', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const res = await loginByCode(accessCode.toUpperCase().trim());
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        showToast('Добро пожаловать!', 'success');
        navigate('/main');
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      showToast(err.response?.data?.message || 'Неверный код доступа', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== АДМИН-ВХОД ==========
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    if (!adminEmail.trim()) {
      showToast('Введите email администратора', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const res = await adminLogin(adminEmail.trim());
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        showToast('Добро пожаловать в админ-панель!', 'success');
        navigate('/admin');
      }
    } catch (err) {
      console.error('Ошибка админ-входа:', err);
      showToast(err.response?.data?.message || 'Ошибка входа', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">🔑</div>
          <div>
            <h1>
              {mode === 'register' ? 'Регистрация' : 
               mode === 'login' ? 'Вход по коду' : 
               'Админ-панель'}
            </h1>
            <p>
              {mode === 'register' && 'Введите код доступа и имя капитана'}
              {mode === 'login' && 'Введите код доступа'}
              {mode === 'admin' && 'Вход для администратора'}
            </p>
          </div>
        </div>

        {/* ===== РЕГИСТРАЦИЯ ===== */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ 
              background: 'rgba(240,197,100,0.1)', 
              border: '1px solid rgba(240,197,100,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              💡 Код доступа вы получили при регистрации команды
            </div>

            <div className="register-group">
              <label>КОД ДОСТУПА</label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Например: ABC123"
                disabled={loading}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
              />
            </div>

            <div className="register-group">
              <label>ИМЯ КАПИТАНА</label>
              <input
                type="text"
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="Введите ваше имя"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="register-btn">
              {loading ? 'Регистрация...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Уже есть аккаунт? Войти
              </button>
              <button
                type="button"
                onClick={() => setMode('admin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f0c564',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Админ-вход
              </button>
            </div>
          </form>
        )}

        {/* ===== ВХОД ПО КОДУ ===== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginByCode}>
            <div className="register-group">
              <label>КОД ДОСТУПА</label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Введите код доступа"
                disabled={loading}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
              />
            </div>

            <button type="submit" disabled={loading} className="register-btn">
              {loading ? 'Вход...' : 'ВОЙТИ ПО КОДУ'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Нет аккаунта? Регистрация
              </button>
              <button
                type="button"
                onClick={() => setMode('admin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f0c564',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Админ-вход
              </button>
            </div>
          </form>
        )}

        {/* ===== АДМИН-ВХОД ===== */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div style={{ 
              background: 'rgba(240,197,100,0.1)', 
              border: '1px solid rgba(240,197,100,0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#f0c564'
            }}>
              🔐 Вход для администратора
            </div>

            <div className="register-group">
              <label>EMAIL АДМИНИСТРАТОРА</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@quiz.local"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="register-btn" style={{ background: 'linear-gradient(180deg, #2f67d8 0%, #2357c6 100%)' }}>
              {loading ? 'Вход...' : '🔑 ВОЙТИ КАК АДМИН'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Регистрация
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Вход по коду
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}