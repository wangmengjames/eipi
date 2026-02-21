import React, { Component, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import { UserProfile } from './types';
import { auth } from './services/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { dbService } from './services/dbService';
import { Lock, AlertTriangle, Loader2 } from 'lucide-react';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTarget, setLoginTarget] = useState<'student' | 'teacher'>('student');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [isTeacherAuth, setIsTeacherAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Firebase auth state listener — restores session on refresh
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        setFirebaseUid(uid);
        try {
          const profile = await dbService.loadUserProfile(uid);
          if (profile) {
            setCurrentUser(profile);
          } else {
            // User exists in Firebase Auth but no profile in Firestore
            // This is the teacher case (or a profile that wasn't saved)
            setIsTeacherAuth(true);
          }
        } catch (e) {
          console.error('[Auth] Failed to load profile on restore', e);
        }
      } else {
        setCurrentUser(null);
        setFirebaseUid(null);
        setIsTeacherAuth(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Route protection: redirect to home if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (location.pathname === '/exam' && !currentUser) {
      navigate('/');
    }
    if (location.pathname === '/admin' && !isTeacherAuth) {
      navigate('/');
    }
  }, [location.pathname, currentUser, isTeacherAuth, navigate, authLoading]);

  const handleLoginClick = (target: 'student' | 'teacher') => {
    setLoginTarget(target);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (user: UserProfile | null, targetView: 'student' | 'teacher', uid?: string) => {
    if (targetView === 'teacher') {
      setIsTeacherAuth(true);
    } else {
      setCurrentUser(user);
      if (uid) setFirebaseUid(uid);
    }
    setShowLoginModal(false);
    navigate(targetView === 'student' ? '/exam' : '/admin');
  };

  const handleExit = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('[Auth] Sign out failed', e);
      }
    }
    setCurrentUser(null);
    setFirebaseUid(null);
    setIsTeacherAuth(false);
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

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
          currentUser && firebaseUid ? <StudentPortal user={currentUser} uid={firebaseUid} onExit={handleExit} /> : null
        } />
        <Route path="/admin" element={
          isTeacherAuth ? <TeacherPortal onExit={handleExit} /> : null
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
