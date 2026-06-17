import { useState, useCallback } from 'react';
import Toast from '../components/Toast';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    if (toasts.length === 0) return null;
    
    return toasts.map(toast => 
      Toast({
        key: toast.id,
        message: toast.message,
        type: toast.type,
        duration: toast.duration,
        onClose: () => removeToast(toast.id)
      })
    );
  }, [toasts, removeToast]);

  return { showToast, ToastContainer };
}