// frontend/src/pages/IntroVideo.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function IntroVideo() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate('/');
      return;
    }

    // Проверяем, не смотрел ли уже видео
    const watched = localStorage.getItem('intro_video_watched');
    if (watched === 'true') {
      console.log('⏭️ Видео уже просмотрено, пропускаем');
      navigate('/main');
      return;
    }

    // Пробуем запустить видео автоматически
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Автовоспроизведение заблокировано, ждём клика');
      });
    }

    // Если видео не запустилось через 5 секунд - пробуем ещё раз
    const timeout = setTimeout(() => {
      if (videoRef.current && !videoEnded) {
        videoRef.current.play().catch(() => {});
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [user, loading]);

  const handleVideoEnd = () => {
    if (videoEnded) return;
    setVideoEnded(true);
    localStorage.setItem('intro_video_watched', 'true');
    navigate('/main');
  };

  const handleClick = () => {
    // Если видео на паузе - запускаем
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="loading-spinner">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="fullscreen-video" onClick={handleClick}>
      <video
        ref={videoRef}
        className="fullscreen-video-element"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
      >
        <source src="/videos/intro.mp4" type="video/mp4" />
        <p>Ваш браузер не поддерживает видео</p>
      </video>
      
      {/* Индикатор загрузки, пока видео не началось */}
      {!videoEnded && (
        <div className="video-loading-indicator">
          <div className="loading-spinner">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        </div>
      )}
    </div>
  );
}