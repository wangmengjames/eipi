
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import { UserProfile } from './types';
import { Lock } from 'lucide-react';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTarget, setLoginTarget] = useState<'student' | 'teacher'>('student');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isTeacherAuth, setIsTeacherAuth] = useState(false);

  // Route protection: redirect to home if not authenticated
  useEffect(() => {
    if (location.pathname === '/exam' && !currentUser) {
      navigate('/');
    }
    if (location.pathname === '/admin' && !isTeacherAuth) {
      navigate('/');
    }
  }, [location.pathname, currentUser, isTeacherAuth, navigate]);

  const handleLoginClick = (target: 'student' | 'teacher') => {
    setLoginTarget(target);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (user: UserProfile | null, targetView: 'student' | 'teacher') => {
    if (targetView === 'teacher') {
      setIsTeacherAuth(true);
    } else {
      setCurrentUser(user);
    }
    setShowLoginModal(false);
    navigate(targetView === 'student' ? '/exam' : '/admin');
  };

  const handleExit = () => {
    setCurrentUser(null);
    setIsTeacherAuth(false);
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
          currentUser ? <StudentPortal user={currentUser} onExit={handleExit} /> : null
        } />
        <Route path="/admin" element={
          isTeacherAuth ? <TeacherPortal onExit={handleExit} /> : null
        } />
        <Route path="*" element={null} />
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
