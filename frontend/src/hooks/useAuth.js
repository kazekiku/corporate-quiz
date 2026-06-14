// frontend/src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { getMe } from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    const loadUser = async () => {
      try {
        const res = await getMe();
        // ВАЖНО: данные пользователя находятся в res.data.data
        const userData = res.data.data;
        console.log('👤 Загружен пользователь:', userData);
        setUser(userData);
      } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // ✅ Убираем router, его здесь не должно быть
  return { user, setUser, loading, logout };
}