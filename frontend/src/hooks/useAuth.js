import { useEffect, useState } from 'react';
import { getMe } from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Загрузка пользователя
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await getMe();
      const userData = res.data.data;
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.teamId) {
          localStorage.setItem('teamId', userData.teamId.toString());
        }
      } else {
        // Токен невалидный - чистим
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teamId');
        setUser(null);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки пользователя:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teamId');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    
    // Слушаем изменения localStorage в других вкладках
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        // Токен изменился в другой вкладке
        console.log('🔄 Токен изменился в другой вкладке, перезагружаем пользователя');
        if (e.newValue) {
          loadUser();
        } else {
          setUser(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('teamId');
    localStorage.removeItem('teamName');
    setUser(null);
  };

  return { user, setUser, loading, logout, reloadUser: loadUser };
}