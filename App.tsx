
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import { UserProfile } from './types';
import { Lock } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTarget, setLoginTarget] = useState<'student' | 'teacher'>('student');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const handleLoginClick = (target: 'student' | 'teacher') => {
    setLoginTarget(target);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (user: UserProfile | null, targetView: 'student' | 'teacher') => {
    setCurrentUser(user);
    setShowLoginModal(false);
    navigate(targetView === 'student' ? '/exam' : '/admin');
  };

  const handleExit = () => {
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans selection:bg-[#1f6feb]/20 overflow-x-hidden relative">
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        target={loginTarget}
        onLoginSuccess={handleLoginSuccess}
      />

      <Routes>
        <Route path="/" element={
          <>
            <LandingPage onLoginClick={handleLoginClick} />
            <button
              onClick={() => handleLoginClick('teacher')}
              className="fixed bottom-6 right-6 z-[100] p-3 bg-[#161b22] text-[#484f58] hover:text-[#58a6ff] border border-[#21262d] hover:border-[#30363d] rounded-full transition-all hover:scale-105 active:scale-95"
              title="Staff Access"
              aria-label="Staff Login"
            >
              <Lock className="w-5 h-5" />
            </button>
          </>
        } />
        <Route path="/exam" element={
          <StudentPortal user={currentUser} onExit={handleExit} />
        } />
        <Route path="/admin" element={
          <TeacherPortal onExit={handleExit} />
        } />
      </Routes>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
