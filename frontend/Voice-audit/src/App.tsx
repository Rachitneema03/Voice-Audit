import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import Preloader from './components/Preloader';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff'
      }}>
        Loading...
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/auth" replace />;
};

function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
    // Small delay to ensure smooth transition
    setTimeout(() => setIsReady(true), 100);
  };

  return (
    <AuthProvider>
      {showPreloader && <Preloader onComplete={handlePreloaderComplete} />}
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage isReady={isReady} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
