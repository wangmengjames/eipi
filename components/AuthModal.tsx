import React, { useState, useEffect, useRef } from 'react';
import { X, User, School, Mail, ShieldCheck, KeyRound, Clock, AlertCircle, Loader2, ArrowRight, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { auth, googleProvider } from '../services/firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'student' | 'teacher';
  onLoginSuccess: (user: UserProfile | null, target: 'student' | 'teacher', uid?: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, target, onLoginSuccess }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Teacher Auth State
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Student Auth State
  const [studentStep, setStudentStep] = useState<'login' | 'register' | 'google-register'>('login');
  const [studentEmail, setStudentEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [googleUid, setGoogleUid] = useState<string | null>(null);
  const googleUserRef = useRef<any>(null);

  // Registration Data
  const [regData, setRegData] = useState({
    realName: '',
    username: '',
    yearLevel: '',
    school: '',
    referralSource: '',
    password: ''
  });

  useEffect(() => {
    if (isOpen) {
        setAuthError('');
        setAdminPasswordInput('');
        setAdminEmailInput('');
        setStudentEmail('');
        setPasswordInput('');
        setStudentStep('login');
        setIsLoggingIn(false);
        setGoogleUid(null);
        googleUserRef.current = null;
        setRegData({ realName: '', username: '', yearLevel: '', school: '', referralSource: '', password: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (lockoutUntil) {
      interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutUntil(null);
          setFailedAttempts(0);
          setAuthError('');
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // --- TEACHER LOGIN (Firebase Auth + Firestore admin check) ---
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (!auth) {
      setAuthError('Authentication service not configured.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, adminEmailInput.toLowerCase(), adminPasswordInput);
      const uid = credential.user.uid;
      const isAdmin = await dbService.checkIsAdmin(uid);
      if (isAdmin) {
        performLoginSuccess(null, 'teacher', uid);
      } else {
        await signOut(auth);
        setAuthError('This account is not authorized for staff access.');
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        const lockoutTime = Date.now() + 60000;
        setLockoutUntil(lockoutTime);
        setTimeRemaining(60);
        setAuthError('Too many failed attempts.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError(`Invalid credentials. ${3 - newAttempts} attempts remaining.`);
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please try again later.');
      } else {
        setAuthError('Login failed. Please try again.');
      }
      setAdminPasswordInput('');
      setIsLoggingIn(false);
    }
  };

  // --- STUDENT LOGIN (Firebase Auth) ---
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!studentEmail || !studentEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!passwordInput) {
      setAuthError('Please enter your password.');
      return;
    }
    if (!auth) {
      setAuthError('Authentication service not configured.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, studentEmail, passwordInput);
      const uid = credential.user.uid;
      const profile = await dbService.loadUserProfile(uid);
      performLoginSuccess(profile, 'student', uid);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please try again later.');
      } else {
        setAuthError('Login failed. Please try again.');
      }
      setIsLoggingIn(false);
    }
  };

  // --- STUDENT REGISTRATION (Firebase Auth + Firestore) ---
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.realName || !regData.username || !regData.yearLevel || !regData.school || !regData.password) {
      setAuthError("Please fill in all required fields.");
      return;
    }
    if (!auth) {
      setAuthError('Authentication service not configured.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, studentEmail, regData.password);
      const uid = credential.user.uid;

      const newProfile: UserProfile = {
        email: studentEmail,
        realName: regData.realName,
        username: regData.username,
        school: regData.school,
        yearLevel: regData.yearLevel,
        referralSource: regData.referralSource,
        joinedAt: new Date().toISOString(),
        authProvider: 'password',
      };
      await dbService.saveUserProfile(uid, newProfile);

      // Send email verification (fire-and-forget)
      sendEmailVerification(credential.user).catch(() => {});

      setTimeout(() => {
        performLoginSuccess(newProfile, 'student', uid);
      }, 500);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Please sign in instead.');
        setStudentStep('login');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters.');
      } else {
        setAuthError('Failed to create account. Please try again.');
      }
      setIsLoggingIn(false);
    }
  };

  // --- GOOGLE SIGN-IN (Student) ---
  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      setAuthError('Authentication service not configured.');
      return;
    }
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const uid = result.user.uid;
      googleUserRef.current = result.user;
      const profile = await dbService.loadUserProfile(uid);
      if (profile) {
        performLoginSuccess(profile, 'student', uid);
      } else {
        // New Google user — collect remaining fields
        setGoogleUid(uid);
        setStudentEmail(result.user.email || '');
        const displayName = result.user.displayName || '';
        setRegData(prev => ({
          ...prev,
          realName: displayName,
          username: displayName.split(' ')[0] + Math.floor(Math.random() * 1000),
          yearLevel: 'Year 9',
        }));
        setStudentStep('google-register');
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User cancelled, do nothing
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setAuthError('An account already exists with this email. Please sign in with your password.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized for Google sign-in. Please contact the administrator.');
      } else {
        console.error('Google sign-in error:', err.code, err.message);
        setAuthError(`Google sign-in failed: ${err.code || err.message}`);
      }
      setIsLoggingIn(false);
    }
  };

  // --- GOOGLE REGISTRATION SUBMIT (Student — profile completion) ---
  const handleGoogleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUid) {
      setAuthError('No Google UID found. Please sign in with Google again.');
      return;
    }
    if (!regData.yearLevel || !regData.school) {
      setAuthError("Please fill in all required fields.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const savedUser = googleUserRef.current;
      const newProfile: UserProfile = {
        email: studentEmail,
        realName: regData.realName || savedUser?.displayName || '',
        username: regData.username,
        school: regData.school,
        yearLevel: regData.yearLevel,
        referralSource: regData.referralSource,
        joinedAt: new Date().toISOString(),
        pictureUrl: savedUser?.photoURL || undefined,
        authProvider: 'google',
      };
      await dbService.saveUserProfile(googleUid, newProfile);
      setTimeout(() => {
        performLoginSuccess(newProfile, 'student', googleUid);
      }, 500);
    } catch (err: any) {
      console.error('Google registration error:', err.code, err.message, err);
      setAuthError(`Failed to create account: ${err.code || err.message}`);
      setIsLoggingIn(false);
    }
  };

  // --- GOOGLE SIGN-IN (Teacher) ---
  const handleTeacherGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setAuthError('Authentication service not configured.');
      return;
    }
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const uid = result.user.uid;
      const isAdmin = await dbService.checkIsAdmin(uid);
      if (isAdmin) {
        performLoginSuccess(null, 'teacher', uid);
      } else {
        await signOut(auth);
        setAuthError('This Google account is not authorized for staff access.');
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User cancelled
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized for Google sign-in.');
      } else {
        console.error('Teacher Google sign-in error:', err.code, err.message);
        setAuthError(`Google sign-in failed: ${err.code || err.message}`);
      }
      setIsLoggingIn(false);
    }
  };

  const performLoginSuccess = (user: UserProfile | null, targetView: 'student' | 'teacher', uid?: string) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      onLoginSuccess(user, targetView, uid);
      setAdminPasswordInput('');
      setFailedAttempts(0);
      setLockoutUntil(null);
      setAuthError('');
    }, 500);
  };

  if (!isOpen) return null;

  const inputClasses = "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm";
  const inputWithIconClasses = "w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm";
  const labelClasses = "block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5";
  const primaryBtnClasses = "w-full bg-gray-900 text-white hover:bg-gray-800 font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const ghostBtnClasses = "w-full text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors z-10"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="p-8">
                {/* --- STUDENT LOGIN FLOW --- */}
                {target === 'student' && (
                    <>
                    {studentStep === 'login' && (
                        <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                              <Lock className="w-6 h-6 text-gray-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
                            <p className="text-gray-500 mb-8 text-sm">Enter your email and password.</p>

                            <form onSubmit={handleStudentLogin} className="space-y-4 text-left">
                                <div>
                                    <label className={labelClasses}>Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={studentEmail}
                                            onChange={(e) => setStudentEmail(e.target.value)}
                                            placeholder="student@example.com"
                                            required
                                            className={inputWithIconClasses}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClasses}>Password</label>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        className={inputClasses}
                                    />
                                </div>

                                {authError && (
                                    <div className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn} className={primaryBtnClasses}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                                </button>

                                <div className="flex items-center gap-3 py-1">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-xs text-gray-400 font-medium">or</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoggingIn}
                                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Continue with Google
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setStudentStep('register'); setAuthError(''); }}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Don't have an account? Register
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {studentStep === 'register' && (
                        <div className="animate-in slide-in-from-right-10 duration-300">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <User className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
                                <p className="text-gray-500 text-sm">{studentEmail || 'Fill in your details below'}</p>
                            </div>

                            <form onSubmit={handleRegistrationSubmit} className="space-y-3">
                                {!studentEmail && (
                                    <div>
                                        <label className={labelClasses}>Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="email"
                                                required
                                                value={studentEmail}
                                                onChange={(e) => setStudentEmail(e.target.value)}
                                                className={inputWithIconClasses}
                                                placeholder="student@example.com"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClasses}>Full Name</label>
                                        <input
                                            required
                                            value={regData.realName}
                                            onChange={e => setRegData({...regData, realName: e.target.value})}
                                            className={inputClasses}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Username</label>
                                        <input
                                            required
                                            value={regData.username}
                                            onChange={e => setRegData({...regData, username: e.target.value})}
                                            className={inputClasses}
                                            placeholder="Display name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClasses}>Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={regData.password}
                                        onChange={e => setRegData({...regData, password: e.target.value})}
                                        className={inputClasses}
                                        placeholder="At least 6 characters"
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>School</label>
                                    <div className="relative">
                                        <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            value={regData.school}
                                            onChange={e => setRegData({...regData, school: e.target.value})}
                                            className={inputWithIconClasses}
                                            placeholder="Current school"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClasses}>Year Level</label>
                                        <select
                                            required
                                            value={regData.yearLevel}
                                            onChange={e => setRegData({...regData, yearLevel: e.target.value})}
                                            className={inputClasses}
                                        >
                                            <option value="">Select</option>
                                            <option value="Year 7">Year 7</option>
                                            <option value="Year 8">Year 8</option>
                                            <option value="Year 9">Year 9</option>
                                            <option value="Year 10">Year 10</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Referral</label>
                                        <select
                                            value={regData.referralSource}
                                            onChange={e => setRegData({...regData, referralSource: e.target.value})}
                                            className={inputClasses}
                                        >
                                            <option value="">Optional</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Google">Google</option>
                                        </select>
                                    </div>
                                </div>

                                {authError && (
                                    <div className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn} className={`${primaryBtnClasses} mt-2`}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                                </button>

                                <div className="flex items-center gap-3 py-1">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-xs text-gray-400 font-medium">or</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoggingIn}
                                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Sign up with Google
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStudentStep('login'); setAuthError(''); }}
                                    className={ghostBtnClasses}
                                >
                                    Already have an account? Sign in
                                </button>
                            </form>
                        </div>
                    )}

                    {studentStep === 'google-register' && (
                        <div className="animate-in slide-in-from-right-10 duration-300">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <User className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Complete your profile</h2>
                                <p className="text-gray-500 text-sm">{studentEmail}</p>
                            </div>

                            <form onSubmit={handleGoogleRegistrationSubmit} className="space-y-3">
                                <div>
                                    <label className={labelClasses}>School</label>
                                    <select
                                        required
                                        value={regData.school}
                                        onChange={e => setRegData({...regData, school: e.target.value})}
                                        className={inputClasses}
                                    >
                                        <option value="">Select your school</option>
                                        <option value="Melbourne High School">Melbourne High School</option>
                                        <option value="Mac.Robertson Girls' High School">Mac.Robertson Girls' High School</option>
                                        <option value="Nossal High School">Nossal High School</option>
                                        <option value="Suzanne Cory High School">Suzanne Cory High School</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {regData.school === 'Other' && (
                                    <div>
                                        <label className={labelClasses}>School Name</label>
                                        <input
                                            required
                                            value={regData.referralSource}
                                            onChange={e => setRegData({...regData, referralSource: e.target.value})}
                                            className={inputClasses}
                                            placeholder="Enter your school name"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClasses}>Year Level</label>
                                        <select
                                            required
                                            value={regData.yearLevel}
                                            onChange={e => setRegData({...regData, yearLevel: e.target.value})}
                                            className={inputClasses}
                                        >
                                            <option value="Year 7">Year 7</option>
                                            <option value="Year 8">Year 8</option>
                                            <option value="Year 9">Year 9</option>
                                            <option value="Year 10">Year 10</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Username</label>
                                        <input
                                            value={regData.username}
                                            onChange={e => setRegData({...regData, username: e.target.value})}
                                            className={inputClasses}
                                            placeholder="Display name"
                                        />
                                    </div>
                                </div>

                                {authError && (
                                    <div className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn} className={`${primaryBtnClasses} mt-2`}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
                                </button>
                            </form>
                        </div>
                    )}
                    </>
                )}

                {/* --- TEACHER LOGIN --- */}
                {target === 'teacher' && (
                    <div className="text-center">
                    <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Staff Access</h2>
                    <p className="text-gray-500 mb-8 text-sm">Restricted to authorized faculty.</p>

                    <form onSubmit={handleTeacherLogin} className="space-y-4 text-left">
                        <div>
                            <label className={labelClasses}>Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={adminEmailInput}
                                    onChange={(e) => setAdminEmailInput(e.target.value)}
                                    placeholder="Enter authorized email"
                                    disabled={isLoggingIn || !!lockoutUntil}
                                    className={inputWithIconClasses}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Access Code</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    value={adminPasswordInput}
                                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                                    placeholder="Enter password"
                                    disabled={isLoggingIn || !!lockoutUntil}
                                    className={`${inputWithIconClasses} tracking-widest font-bold`}
                                />
                            </div>
                        </div>

                        {lockoutUntil && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium animate-pulse">
                                <Clock className="w-4 h-4" />
                                <span>Access blocked for {timeRemaining}s</span>
                            </div>
                        )}

                        {authError && !lockoutUntil && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium">
                                <AlertCircle className="w-4 h-4" />
                                <span>{authError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn || !!lockoutUntil || !adminPasswordInput}
                            className="w-full bg-gray-900 text-white hover:bg-gray-800 font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {isLoggingIn ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Verify Credentials</span>
                            )}
                        </button>

                        <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium">or</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <button
                            type="button"
                            onClick={handleTeacherGoogleLogin}
                            disabled={isLoggingIn || !!lockoutUntil}
                            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Sign in with Google
                        </button>
                    </form>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                    {target === 'student'
                        ? 'By continuing, you agree to our Terms and Privacy Policy.'
                        : 'Unauthorized access attempts are logged.'}
                </p>
            </div>
        </div>
    </div>
  );
};

export default AuthModal;
