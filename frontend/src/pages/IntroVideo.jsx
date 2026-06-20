// frontend/src/pages/IntroVideo.jsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function IntroVideo() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate('/');
      return;
    }

    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setShowPlayButton(false);
          })
          .catch(() => {
            setShowPlayButton(true);
            setIsPlaying(false);
          });
      }
    }

    const timeout = setTimeout(() => {
      if (videoRef.current && !videoEnded && !isPlaying) {
        setShowPlayButton(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user, loading]);

  const handleVideoEnd = () => {
    if (videoEnded) return;
    setVideoEnded(true);
    navigate('/main');
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setShowPlayButton(false);
        })
        .catch(() => {});
    }
  };

  const handleClick = () => {
    if (!isPlaying && videoRef.current) {
      handlePlay();
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
        playsInline
        onEnded={handleVideoEnd}
      >
        <source src="/videos/intro.mp4" type="video/mp4" />
        <p>Ваш браузер не поддерживает видео</p>
      </video>
      
      
    </div>
  );
}