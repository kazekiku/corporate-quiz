import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Main from './pages/Main';
import Lobby from './pages/Lobby';
import BossNotification from './components/BossNotification';
import SessionIndicator from './components/SessionIndicator';
import Qualification from './pages/Qualification';
import QualificationResults from './pages/QualificationResults';
import Rating from './pages/Rating';
import FinalLobby from './pages/FinalLobby';
import Final from './pages/Final';
import FinalResults from './pages/FinalResults';
import { useAuth } from './hooks/useAuth';

// Компонент для защиты маршрутов
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="auth-layout">
        <div className="container-narrow">
          <div className="card text-center">
            <div className="loading-spinner">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function App() {
  // Генерируем уникальный ID для вкладки
  useEffect(() => {
    const tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
      sessionStorage.setItem('tabId', Math.random().toString(36).substring(2));
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<Register />} />
        
        {/* Защищённые маршруты */}
        <Route path="/main" element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        } />
        
        <Route path="/lobby/:teamId" element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        } />
        
        <Route path="/qualification/:teamId" element={
          <ProtectedRoute>
            <Qualification />
          </ProtectedRoute>
        } />
        
        <Route path="/qualification-results/:teamId" element={
          <ProtectedRoute>
            <QualificationResults />
          </ProtectedRoute>
        } />
        
        <Route path="/rating" element={
          <ProtectedRoute>
            <Rating />
          </ProtectedRoute>
        } />
        
        <Route path="/final-lobby" element={
          <ProtectedRoute>
            <FinalLobby />
          </ProtectedRoute>
        } />
        
        <Route path="/final" element={
          <ProtectedRoute>
            <Final />
          </ProtectedRoute>
        } />
        
        <Route path="/final-results" element={
          <ProtectedRoute>
            <FinalResults />
          </ProtectedRoute>
        } />
      </Routes>
      <BossNotification />
      <SessionIndicator />
    </BrowserRouter>
  );
}

export default App;