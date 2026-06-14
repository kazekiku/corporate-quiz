import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('Введите ФИО');
    if (!form.email.includes('@')) return setError('Введите корректный email');
    if (!/^[1-9]-[0-9]{2}[APDL]$/.test(form.code.toUpperCase()))
      return setError('Неверный формат кода (пример: 1-07A)');
    setLoading(true);
    try {
      await register({ ...form, code: form.code.toUpperCase() });
      navigate('/main');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="register-page">
    <div className="register-card">
      <div className="register-header">
        <div className="register-icon">
          <span>📚</span>
        </div>

        <div>
          <h1>Регистрация</h1>
          <p>Своя игра • Информатика</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="register-group">
          <label>ФИО</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) =>
              setForm({ ...form, fullName: e.target.value })
            }
            placeholder="Иванов Иван Иванович"
            disabled={loading}
          />
        </div>

        <div className="register-group">
          <label>ПОЧТА</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            placeholder="example@mail.ru"
            disabled={loading}
          />
        </div>

        <div className="register-group">
          <label>КОД УЧАСТНИКА</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) =>
              setForm({
                ...form,
                code: e.target.value.toUpperCase(),
              })
            }
            placeholder="1-07A"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="register-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="register-btn"
        >
          {loading
            ? 'Регистрация...'
            : '✓ Зарегистрироваться'}
        </button>
      </form>
    </div>
  </div>
);
}