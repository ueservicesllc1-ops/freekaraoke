import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateKaraoke from './pages/CreateKaraoke';
import MyKaraokes from './pages/MyKaraokes';
import KaraokePlayer from './pages/KaraokePlayer';
import Login from './pages/Login';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateKaraoke />} />
        <Route path="/my-karaokes" element={<MyKaraokes />} />
        <Route path="/player/:id" element={<KaraokePlayer />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Layout>
  );
}

export default App;
