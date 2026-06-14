import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Main from './pages/Main';
import Lobby from './pages/Lobby';
import BossNotification from './components/BossNotification';
import Qualification from './pages/Qualification';
import QualificationResults from './pages/QualificationResults';
import Rating from './pages/Rating';
import FinalLobby from './pages/FinalLobby';
import Final from './pages/Final';
import FinalResults from './pages/FinalResults';
import LoadingSpinner from './components/LoadingSpinner';
import LedLight from './components/LedLight';
import NeonBorder from './components/NeonBorder';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/main" element={<Main />} />
        <Route path="/lobby/:teamId" element={<Lobby />} />
        <Route path="/qualification/:teamId" element={<Qualification />} />
        <Route path="/qualification-results/:teamId" element={<QualificationResults />} />
        <Route path="/rating" element={<Rating />} />
        <Route path="/final-lobby/:sessionId" element={<FinalLobby />} />
        <Route path="/final/:sessionId" element={<Final />} />
        <Route path="/final-results/:sessionId" element={<FinalResults />} />
      </Routes>
      <BossNotification />
    </BrowserRouter>
  );
}

export default App;