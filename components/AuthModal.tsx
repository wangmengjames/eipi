
import React, { useState, useEffect } from 'react';
import { X, User, School, Mail, ShieldCheck, KeyRound, Clock, AlertCircle, Loader2, ArrowRight, Check, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'student' | 'teacher';
  onLoginSuccess: (user: UserProfile | null, target: 'student' | 'teacher') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, target, onLoginSuccess }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Teacher Auth State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Student Auth State
  const [studentStep, setStudentStep] = useState<'email' | 'password' | 'verify' | 'register'>('email');
  const [studentEmail, setStudentEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);

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
        setVerifyCodeInput('');
        setGeneratedCode(null);
        setStudentStep('email');
        setIsLoggingIn(false);
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

  // --- TEACHER LOGIN ---
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (adminEmailInput.toLowerCase() !== 'wangmengjames@gmail.com') {
        setAuthError('Unauthorized email address.');
        return;
    }

    if (adminPasswordInput === '0115') {
      performLoginSuccess(null, 'teacher');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        const lockoutTime = Date.now() + 60000;
        setLockoutUntil(lockoutTime);
        setTimeRemaining(60);
        setAuthError('Too many failed attempts.');
      } else {
        setAuthError(`Incorrect code. ${3 - newAttempts} attempts remaining.`);
        setAdminPasswordInput('');
      }
    }
  };

  // --- STUDENT LOGIN ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      if (!studentEmail || !studentEmail.includes('@')) {
          setAuthError('Please enter a valid email address.');
          return;
      }
      setIsLoggingIn(true);
      try {
          const existingUser = await dbService.loadUserProfile(studentEmail);
          if (existingUser && existingUser.password) {
              setStudentStep('password');
          } else {
              await sendVerificationCode();
              setStudentStep('verify');
          }
      } catch (e) {
          setAuthError("Network error. Using offline mode?");
          await sendVerificationCode();
          setStudentStep('verify');
      } finally {
          setIsLoggingIn(false);
      }
  };

  const sendVerificationCode = async () => {
      return new Promise<void>(resolve => {
          setTimeout(() => {
              const code = Math.floor(100000 + Math.random() * 900000).toString();
              setGeneratedCode(code);
              alert(`[DEMO EMAIL SERVICE]\n\nYour verification code is: ${code}`);
              resolve();
          }, 800);
      });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setAuthError('');
      try {
          const user = await dbService.loadUserProfile(studentEmail);
          if (user && user.password === passwordInput) {
              performLoginSuccess(user, 'student');
          } else {
              setAuthError("Incorrect password.");
              setIsLoggingIn(false);
          }
      } catch (err) {
          setAuthError("Login failed.");
          setIsLoggingIn(false);
      }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      if (verifyCodeInput !== generatedCode) {
          setAuthError('Invalid code. Please check your email.');
          return;
      }
      setIsLoggingIn(true);
      try {
          const existingUser = await dbService.loadUserProfile(studentEmail);
          if (existingUser) {
              performLoginSuccess(existingUser, 'student');
          } else {
              setStudentStep('register');
              setIsLoggingIn(false);
          }
      } catch (err) {
          setAuthError("Database connection failed.");
          setIsLoggingIn(false);
      }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!regData.realName || !regData.username || !regData.yearLevel || !regData.school || !regData.password) {
          setAuthError("Please fill in all required fields.");
          return;
      }
      setIsLoggingIn(true);
      const newProfile: UserProfile = {
          email: studentEmail,
          ...regData,
          pictureUrl: undefined,
          joinedAt: new Date().toISOString()
      };
      try {
          await dbService.saveUserProfile(newProfile);
          setTimeout(() => {
              performLoginSuccess(newProfile, 'student');
          }, 1000);
      } catch (err) {
          setAuthError("Failed to create account. Please try again.");
          setIsLoggingIn(false);
      }
  };

  const performLoginSuccess = (user: UserProfile | null, targetView: 'student' | 'teacher') => {
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      onLoginSuccess(user, targetView);
      setAdminPasswordInput('');
      setFailedAttempts(0);
      setLockoutUntil(null);
      setAuthError('');
    }, 500);
  };

  if (!isOpen) return null;

  const inputClasses = "w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-3 text-[#e6edf3] placeholder-[#484f58] focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] outline-none transition-all text-sm";
  const inputWithIconClasses = "w-full bg-[#0d1117] border border-[#21262d] rounded-lg pl-10 pr-4 py-3 text-[#e6edf3] placeholder-[#484f58] focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] outline-none transition-all text-sm";
  const labelClasses = "block text-xs font-bold text-[#484f58] uppercase mb-1.5 ml-0.5 tracking-wider";
  const primaryBtnClasses = "w-full bg-[#238636] text-white hover:bg-[#2ea043] font-bold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const ghostBtnClasses = "w-full text-[#484f58] hover:text-[#e6edf3] text-sm font-medium transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0d1117]/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-[#161b22] rounded-xl border border-[#21262d] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-[#484f58] hover:text-[#e6edf3] rounded-lg hover:bg-[#21262d] transition-colors z-10"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="p-8">
                {/* --- STUDENT LOGIN FLOW --- */}
                {target === 'student' && (
                    <>
                    {studentStep === 'email' && (
                        <div className="text-center">
                            <div className="text-[#58a6ff] font-mono text-sm mb-6">student.login()</div>
                            <h2 className="text-xl font-bold text-[#e6edf3] mb-1">Student Login</h2>
                            <p className="text-[#484f58] mb-8 text-sm">Enter your email to get started.</p>

                            <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                                <div>
                                    <label className={labelClasses}>Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
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

                                {authError && (
                                    <div className="text-[#f85149] text-sm flex items-center gap-2 bg-[#f8514920] p-3 rounded-lg border border-[#f8514940]">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn} className={primaryBtnClasses}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </div>
                    )}

                    {studentStep === 'password' && (
                        <div className="text-center animate-in slide-in-from-right-10 duration-300">
                             <div className="w-12 h-12 bg-[#21262d] text-[#58a6ff] rounded-full flex items-center justify-center mx-auto mb-3">
                                <Lock className="w-6 h-6" />
                             </div>
                             <h2 className="text-xl font-bold text-[#e6edf3] mb-1">Welcome back!</h2>
                             <p className="text-[#484f58] mb-6 text-sm font-mono">{studentEmail}</p>

                             <form onSubmit={handlePasswordLogin} className="space-y-4 text-left">
                                <div>
                                    <label className={labelClasses}>Password</label>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        className={inputClasses}
                                        autoFocus
                                    />
                                </div>

                                {authError && (
                                    <div className="text-[#f85149] text-sm flex items-center gap-2 bg-[#f8514920] p-3 rounded-lg border border-[#f8514940]">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn} className={primaryBtnClasses}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsLoggingIn(true);
                                            await sendVerificationCode();
                                            setIsLoggingIn(false);
                                            setStudentStep('verify');
                                        }}
                                        className="text-sm text-[#58a6ff] hover:text-[#79c0ff] font-medium"
                                    >
                                        Forgot password? Use a code instead
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setStudentStep('email'); setAuthError(''); }}
                                    className={ghostBtnClasses}
                                >
                                    Go Back
                                </button>
                            </form>
                        </div>
                    )}

                    {studentStep === 'verify' && (
                        <div className="text-center animate-in slide-in-from-right-10 duration-300">
                             <h2 className="text-xl font-bold text-[#e6edf3] mb-2">Check your Email</h2>
                             <p className="text-[#484f58] mb-8 text-sm">
                                We sent a 6-digit code to <strong className="text-[#e6edf3]">{studentEmail}</strong>.<br/>
                                <span className="text-xs text-[#58a6ff]">(Check browser alert for demo code)</span>
                             </p>

                             <form onSubmit={handleVerifyCode} className="space-y-6 text-left">
                                <div>
                                    <label className={labelClasses}>Verification Code</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
                                        <input
                                            type="text"
                                            value={verifyCodeInput}
                                            onChange={(e) => setVerifyCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            placeholder="123456"
                                            required
                                            maxLength={6}
                                            className={`${inputWithIconClasses} tracking-[0.5em] font-mono text-center text-lg font-bold`}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {authError && (
                                    <div className="text-[#f85149] text-sm flex items-center gap-2 bg-[#f8514920] p-3 rounded-lg border border-[#f8514940]">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {authError}
                                    </div>
                                )}

                                <button type="submit" disabled={isLoggingIn || verifyCodeInput.length !== 6} className={primaryBtnClasses}>
                                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <Check className="w-4 h-4" /></>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStudentStep('email'); setAuthError(''); }}
                                    className={ghostBtnClasses}
                                >
                                    Change Email
                                </button>
                            </form>
                        </div>
                    )}

                    {studentStep === 'register' && (
                        <div className="animate-in slide-in-from-right-10 duration-300">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-[#21262d] text-[#58a6ff] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <User className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-[#e6edf3]">Create your profile</h2>
                                <p className="text-[#484f58] text-sm font-mono">{studentEmail}</p>
                            </div>

                            <form onSubmit={handleRegistrationSubmit} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClasses}>Real Name</label>
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
                                        placeholder="Set a password"
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>School</label>
                                    <div className="relative">
                                        <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
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
                                            className={`${inputClasses} bg-[#0d1117]`}
                                            style={{ colorScheme: 'dark' }}
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
                                            className={`${inputClasses} bg-[#0d1117]`}
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            <option value="">Optional</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Google">Google</option>
                                        </select>
                                    </div>
                                </div>

                                {authError && (
                                    <div className="text-[#f85149] text-sm flex items-center gap-2 bg-[#f8514920] p-3 rounded-lg border border-[#f8514940]">
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
                    <div className="w-16 h-16 bg-[#21262d] text-[#484f58] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#30363d]">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="text-[#58a6ff] font-mono text-sm mb-2">admin.auth()</div>
                    <h2 className="text-xl font-bold text-[#e6edf3] mb-1">Staff Access</h2>
                    <p className="text-[#484f58] mb-8 text-sm">Restricted to authorized faculty.</p>

                    <form onSubmit={handleTeacherLogin} className="space-y-4 text-left">
                        <div>
                            <label className={labelClasses}>Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
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
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
                                <input
                                    type="password"
                                    value={adminPasswordInput}
                                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                                    placeholder="••••"
                                    disabled={isLoggingIn || !!lockoutUntil}
                                    className={`${inputWithIconClasses} tracking-widest font-bold`}
                                />
                            </div>
                        </div>

                        {lockoutUntil && (
                            <div className="p-3 bg-[#f8514920] border border-[#f8514940] rounded-lg flex items-center gap-2 text-[#f85149] text-sm font-medium animate-pulse">
                                <Clock className="w-4 h-4" />
                                <span>Access blocked for {timeRemaining}s</span>
                            </div>
                        )}

                        {authError && !lockoutUntil && (
                            <div className="p-3 bg-[#f8514920] border border-[#f8514940] rounded-lg flex items-center gap-2 text-[#f85149] text-sm font-medium">
                                <AlertCircle className="w-4 h-4" />
                                <span>{authError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn || !!lockoutUntil || !adminPasswordInput}
                            className="w-full bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] font-bold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border border-[#30363d] mt-2"
                        >
                            {isLoggingIn ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Verify Credentials</span>
                            )}
                        </button>
                    </form>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-[#0d1117] px-8 py-4 border-t border-[#21262d] text-center">
                <p className="text-xs text-[#484f58]">
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
