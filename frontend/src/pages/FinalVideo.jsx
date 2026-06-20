// frontend/src/pages/FinalVideo.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function FinalVideo() {
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

    const watched = localStorage.getItem('final_video_watched');
    if (watched === 'true') {
      console.log('⏭️ Видео уже просмотрено, пропускаем');
      navigate('/final-results');
      return;
    }

    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Автовоспроизведение заблокировано, ждём клика');
      });
    }

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
    localStorage.setItem('final_video_watched', 'true');
    navigate('/final-results');
  };

  const handleClick = () => {
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
        <source src="/videos/final.mp4" type="video/mp4" />
        <p>Ваш браузер не поддерживает видео</p>
      </video>
      
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