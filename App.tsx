
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
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 overflow-x-hidden relative">
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
              className="fixed bottom-6 right-6 z-[100] p-3 bg-white text-gray-300 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm"
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
