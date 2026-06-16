import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        <Route path="/" element={<Register />} />
        <Route path="/main" element={<Main />} />
        <Route path="/lobby/:teamId" element={<Lobby />} />
        <Route path="/qualification/:teamId" element={<Qualification />} />
        <Route path="/qualification-results/:teamId" element={<QualificationResults />} />
        <Route path="/rating" element={<Rating />} />
        <Route path="/final-lobby" element={<FinalLobby />} />
        <Route path="/final" element={<Final />} />
        <Route path="/final-results" element={<FinalResults />} />
      </Routes>
      <BossNotification />
      <SessionIndicator />
    </BrowserRouter>
  );
}

export default App;