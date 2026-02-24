
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag, Award, BookOpen, LogOut, Lock, Trophy, BarChart3, EyeOff, XCircle, X, ArrowLeft, Loader2, Crown, Star, User } from 'lucide-react';
import { Question, UserProfile } from '../types';
import LatexRenderer from './LatexRenderer';
import { dbService } from '../services/dbService';
import { createCheckout } from '../services/stripe';
import { parseMarkdownQuestions, computeContentHash } from '../services/questionParser';

interface StudentPortalProps {
  onExit: () => void;
  user: UserProfile | null;
  uid: string;
  isPremium?: boolean;
}

type ExamState = 'intro' | 'active' | 'result';

interface ExamResult {
  email: string;
  date: string;
  score: number;
  total: number;
  percentage: number;
  topicStats: Record<string, { total: number, correct: number }>;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ onExit, user, uid, isPremium = false }) => {
  const [examState, setExamState] = useState<ExamState>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankSize, setBankSize] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [reviewMode, setReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');

  const [history, setHistory] = useState<ExamResult[]>([]);

  // Refs to keep latest values accessible in timer callback
  const historyRef = useRef(history);
  historyRef.current = history;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    const initData = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/questions/bank.md');
            if (response.ok) {
                const markdown = await response.text();
                const contentHash = await computeContentHash(markdown);
                const localMeta = await dbService.loadLiveMetadata();
                if (!localMeta || localMeta.version !== contentHash) {
                    const parsed = parseMarkdownQuestions(markdown);
                    await dbService.saveLiveBank(parsed);
                    await dbService.saveLiveMetadata({
                        version: contentHash,
                        lastUpdated: new Date().toISOString(),
                        description: 'Parsed from bank.md'
                    });
                }
            }
        } catch (e) {
            console.warn("Offline or failed to fetch question bank, using local cache.", e);
        }

        try {
            const live = await dbService.loadLiveBank();
            if (live && Array.isArray(live)) {
                setBankSize(live.length);
            }
        } catch (e) {
            console.error("Error loading bank", e);
        }

        try {
            const savedHistory = await dbService.loadHistory(uid);
            if (savedHistory && Array.isArray(savedHistory)) {
                setHistory(savedHistory);
            }
        } catch (e) { console.error("Error loading history", e); }

        setIsSyncing(false);
    };
    initData();
  }, []);

  // Disable right-click and text selection only during active exam
  useEffect(() => {
    if (examState !== 'active') return;
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
    };
  }, [examState]);

  useEffect(() => {
    if (examState !== 'active') return;
    const handleBlur = () => {
      if (showSubmitModal || isSubmitting) return;
      setCheatingAttempts(prev => prev + 1);
      setShowCheatingWarning(true);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [examState, showSubmitModal, isSubmitting]);

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (examState !== 'active' || isSubmitting) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, isSubmitting]);

  // Auto-submit when timer reaches zero (separate from state updater)
  useEffect(() => {
    if (timedOut) {
      setTimedOut(false);
      performSubmit(true);
    }
  }, [timedOut]);

  const startExam = async () => {
    try {
      const allQuestions = await dbService.loadLiveBank() as Question[];
      if (!allQuestions || allQuestions.length === 0) {
         alert("The question bank is empty. Please ask your teacher to upload questions.");
         return;
      }
      // Fisher-Yates shuffle for uniform distribution
      const shuffled = [...allQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selected = shuffled.slice(0, 50);
      setQuestions(selected);
      setAnswers({});
      setFlagged(new Set());
      setCurrentQuestionIndex(0);
      setCheatingAttempts(0);
      setTimeLeft(60 * 60);
      setReviewMode(false);
      setIsSubmitting(false);
      setShowSubmitModal(false);
      setExamState('active');
    } catch (err) {
      alert("Failed to start exam. Data corruption detected.");
    }
  };

  const calculateResults = useCallback((): ExamResult => {
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;
    let correct = 0;
    const topicStats: Record<string, { total: number, correct: number }> = {};
    currentQuestions.forEach(q => {
      const isCorrect = currentAnswers[q.id] === q.correctAnswerIndex;
      if (isCorrect) correct++;
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
      topicStats[topic].total++;
      if (isCorrect) topicStats[topic].correct++;
    });
    return {
      email: user?.email || 'anonymous',
      date: new Date().toISOString(),
      score: correct,
      total: currentQuestions.length,
      percentage: currentQuestions.length > 0 ? Math.round((correct / currentQuestions.length) * 100) : 0,
      topicStats
    };
  }, [user?.email]);

  const handleRequestSubmit = () => { setShowSubmitModal(true); };

  const performSubmit = useCallback(async (auto = false) => {
    setIsSubmitting(true);
    setShowSubmitModal(false);
    try {
        await new Promise(r => setTimeout(r, 500));
        const result = calculateResults();
        setHistory(prev => [result, ...prev]);
        try { await dbService.saveHistory(uid, result); } catch (dbError) { console.error("Failed to save history", dbError); }
        setExamState('result');
        setReviewMode(false);
    } catch (error) {
        console.error("Submission error:", error);
        alert("An error occurred during submission.");
        setIsSubmitting(false);
    }
  }, [calculateResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStats = () => {
     if (history.length === 0) return { last: '--', avg: '0%', bestTopic: 'N/A' };
     const last = `${history[0].percentage}%`;
     const avgNum = history.reduce((acc, curr) => acc + curr.percentage, 0) / history.length;
     const avg = `${Math.round(avgNum)}%`;
     const topicTotals: Record<string, { total: number, correct: number }> = {};
     history.forEach(h => {
        Object.entries(h.topicStats).forEach(([topic, stats]) => {
           const s = stats as { total: number, correct: number };
           if (!topicTotals[topic]) topicTotals[topic] = { total: 0, correct: 0 };
           topicTotals[topic].total += s.total;
           topicTotals[topic].correct += s.correct;
        });
     });
     let bestTopic = 'N/A';
     let bestPerc = -1;
     Object.entries(topicTotals).forEach(([topic, stats]) => {
         const p = stats.total > 0 ? stats.correct / stats.total : 0;
         if (p > bestPerc) { bestPerc = p; bestTopic = topic.split(' ')[1] || topic; }
     });
     return { last, avg, bestTopic };
  };

  const stats = getStats();

  const freemiumConfig = useMemo(() => {
      if (examState !== 'result') return { allowedIds: new Set<string>(), totalMistakes: 0, limit: 0 };
      const incorrectQuestions = questions.filter(q => answers[q.id] !== q.correctAnswerIndex);
      const totalMistakes = incorrectQuestions.length;

      // Premium users get unlimited access
      if (isPremium) {
        const allIds = new Set(questions.map(q => q.id));
        return { allowedIds: allIds, totalMistakes, limit: totalMistakes };
      }

      const limit = Math.min(5, Math.ceil(totalMistakes / 2));
      const allowedMistakeIds = new Set(incorrectQuestions.slice(0, limit).map(q => q.id));
      const allowedIds = new Set([
          ...questions.filter(q => answers[q.id] === q.correctAnswerIndex).map(q => q.id),
          ...allowedMistakeIds
      ]);
      return { allowedIds, totalMistakes, limit };
  }, [examState, questions, answers, isPremium]);

  // --- INTRO ---
  const renderIntro = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-10 flex justify-between items-start">
         <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 text-white rounded-md flex items-center justify-center font-serif italic font-bold text-sm">
              e<sup className="text-[8px] not-italic -mt-1">iπ</sup>
            </div>
            <span className="font-semibold text-gray-900 text-sm">eipi</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-sm">exam</span>
         </div>
         <div className="flex items-center gap-3">
            {user?.pictureUrl ? (
                <img src={user.pictureUrl} alt="Profile" className="w-9 h-9 rounded-full border border-gray-200" />
            ) : (
               <div className="w-9 h-9 bg-gray-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                   {user?.realName?.[0] || <User className="w-4 h-4" />}
               </div>
            )}
            <span className="text-sm text-gray-700 font-medium">{user?.realName || 'Student'}</span>
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {[
           { icon: <Trophy className="w-5 h-5 text-blue-600" />, label: 'Last Score', value: stats.last },
           { icon: <BarChart3 className="w-5 h-5 text-purple-500" />, label: 'Average', value: stats.avg },
           { icon: <Star className="w-5 h-5 text-green-500" />, label: 'Best Topic', value: stats.bestTopic, small: true },
         ].map((card, i) => (
           <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-2 mb-2">
               {card.icon}
               <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
             </div>
             <div className={`font-bold text-gray-900 ${card.small ? 'text-lg' : 'text-2xl'} truncate`} title={card.value}>{card.value}</div>
           </div>
         ))}
      </div>

      {/* Start Exam CTA */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-10 relative overflow-hidden shadow-sm">
         <div className="absolute top-0 right-0 p-8 opacity-[0.04]">
            <Award className="w-48 h-48 text-gray-900" />
         </div>

         <div className="relative z-10 max-w-lg">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ready for your practice exam?</h2>
            <p className="text-gray-500 mb-6 text-sm">A timed simulation designed to match real selective school conditions.</p>
            <div className="space-y-2.5 mb-8">
               {[
                 { icon: <Clock className="w-4 h-4 text-gray-400" />, text: '60 Minutes Time Limit' },
                 { icon: <BookOpen className="w-4 h-4 text-gray-400" />, text: '50 Questions — Randomized' },
                 { icon: <EyeOff className="w-4 h-4 text-gray-400" />, text: 'Secure Browser Environment' },
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                   {item.icon} <span>{item.text}</span>
                 </div>
               ))}
            </div>

            <button
               onClick={startExam}
               disabled={isSyncing || bankSize === 0}
               className="bg-gray-900 text-white hover:bg-gray-800 font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
            >
               {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
               {isSyncing ? "Syncing content..." : (bankSize > 0 ? "Start Practice Exam" : "No Content Available")}
            </button>
         </div>
      </div>

      <div className="mt-8 flex justify-center">
         <button onClick={onExit} className="text-gray-400 hover:text-red-500 flex items-center gap-2 text-sm font-medium transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
         </button>
      </div>
    </div>
  );

  // --- ACTIVE EXAM ---
  const renderActiveExam = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return <div>Error loading question</div>;
    const isFlagged = flagged.has(currentQ.id);
    const selectedAnswer = answers[currentQ.id];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const handleNext = () => {
        if (isLastQuestion) { handleRequestSubmit(); }
        else { setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1)); }
    };

    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Exam Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex justify-between items-center z-20 shadow-sm">
           <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                 <span className="font-semibold text-gray-900 text-base">{currentQuestionIndex + 1}</span>
                 <span className="text-gray-400">/ {questions.length}</span>
              </div>
              <div className="h-5 w-px bg-gray-200"></div>
              <div className={`flex items-center gap-2 font-mono font-medium text-base ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                 <Clock className="w-4 h-4" />
                 {formatTime(timeLeft)}
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button
                onClick={() => {
                   const newFlagged = new Set(flagged);
                   if (isFlagged) newFlagged.delete(currentQ.id);
                   else newFlagged.add(currentQ.id);
                   setFlagged(newFlagged);
                }}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border ${
                  isFlagged
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-white text-gray-500 hover:text-gray-700 border-gray-200'
                }`}
              >
                 <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
                 {isFlagged ? 'Flagged' : 'Flag'}
              </button>
              <button
                 onClick={handleRequestSubmit}
                 className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                 Finish Exam
              </button>
           </div>
        </header>

        {/* Main Exam Area */}
        <div className="flex-1 overflow-hidden flex relative">
           {/* Sidebar */}
           <div className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
              <div className="p-4 border-b border-gray-100 font-semibold text-gray-500 text-xs uppercase tracking-wider">Navigator</div>
              <div className="flex-1 overflow-y-auto p-4">
                 <div className="grid grid-cols-5 gap-1.5">
                    {questions.map((q, idx) => {
                       const isAns = answers[q.id] !== undefined;
                       const isCurr = idx === currentQuestionIndex;
                       const isFlg = flagged.has(q.id);

                       let cls = "bg-gray-100 border-gray-200 text-gray-500";
                       if (isCurr) cls = "bg-gray-900 text-white border-gray-900 ring-2 ring-gray-900/20";
                       else if (isFlg) cls = "bg-amber-50 border-amber-200 text-amber-600";
                       else if (isAns) cls = "bg-blue-50 border-blue-200 text-blue-600";

                       return (
                          <button
                             key={q.id}
                             onClick={() => setCurrentQuestionIndex(idx)}
                             className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-semibold border transition-all ${cls}`}
                          >
                             {idx + 1}
                             {isFlg && !isCurr && <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></div>}
                          </button>
                       );
                    })}
                 </div>
              </div>
              <div className="p-4 border-t border-gray-100 text-xs text-gray-400 flex flex-col gap-2">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-900 rounded"></div> Current</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div> Answered</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded"></div> Flagged</div>
              </div>
           </div>

           {/* Question Content */}
           <div className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="max-w-3xl mx-auto pb-24">
                 <div className="mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-4 border border-blue-100">
                       {currentQ.topic || currentQ.category}
                    </span>
                    <LatexRenderer text={currentQ.text} className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed" />
                    {currentQ.imageUrl && (
                       <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                          <img src={currentQ.imageUrl} alt="Diagram" className="w-full max-h-[400px] object-contain bg-gray-50" />
                       </div>
                    )}
                 </div>

                 <div className="space-y-3">
                    {currentQ.options.map((option, idx) => (
                       <button
                          key={idx}
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: idx }))}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 group ${
                             selectedAnswer === idx
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white shadow-sm'
                          }`}
                       >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors mt-0.5 ${
                             selectedAnswer === idx
                               ? 'border-blue-500 bg-blue-500 text-white'
                               : 'border-gray-300 text-gray-400 group-hover:border-gray-400'
                          }`}>
                             {String.fromCharCode(65 + idx)}
                          </div>
                          <div className="flex-1 pt-0.5">
                             <LatexRenderer text={option} className={`text-base ${selectedAnswer === idx ? 'text-gray-900 font-medium' : 'text-gray-600'}`} />
                             {currentQ.optionImages?.[idx] && (
                                <img src={currentQ.optionImages[idx] || ''} alt="Option Visual" className="mt-2 max-h-32 rounded-lg border border-gray-200" />
                             )}
                          </div>
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Navigation Footer */}
           <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center md:pl-[272px] z-10 shadow-sm">
              <button
                 onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                 disabled={currentQuestionIndex === 0}
                 className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center gap-2 text-sm transition-colors"
              >
                 <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                 onClick={handleNext}
                 className={`px-7 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm ${
                     isLastQuestion
                     ? 'bg-green-600 text-white hover:bg-green-700'
                     : 'bg-gray-900 text-white hover:bg-gray-800'
                 }`}
              >
                 {isLastQuestion ? (
                     <>Finish & Submit <CheckCircle className="w-4 h-4" /></>
                 ) : (
                     <>Next <ChevronRight className="w-4 h-4" /></>
                 )}
              </button>
           </div>
        </div>

        {/* Warning Overlay */}
        {showCheatingWarning && (
           <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-8 max-w-md text-center border border-gray-200 shadow-xl">
                 <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7" />
                 </div>
                 <h2 className="text-xl font-semibold text-gray-900 mb-2">Focus Check</h2>
                 <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                    Please keep the exam window active. Navigating away is recorded.
                 </p>
                 <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-xs font-mono text-red-500">
                    focus_lost: {cheatingAttempts} time{cheatingAttempts !== 1 ? 's' : ''}
                 </div>
                 <button
                    onClick={() => setShowCheatingWarning(false)}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                 >
                    Resume Exam
                 </button>
              </div>
           </div>
        )}

        {/* Submit Modal */}
        {showSubmitModal && (
            <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-gray-200 shadow-xl">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Submit Exam?</h3>
                    <p className="text-gray-500 mb-6 text-sm">
                        You have answered <span className="font-semibold text-gray-900">{Object.keys(answers).length}</span> out of <span className="font-semibold text-gray-900">{questions.length}</span> questions.
                        {questions.length - Object.keys(answers).length > 0 && (
                            <span className="flex items-center gap-1.5 mt-3 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 text-xs">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {questions.length - Object.keys(answers).length} questions unanswered.
                            </span>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowSubmitModal(false)}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => performSubmit()}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-gray-900 rounded-xl text-white font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  // --- RESULTS ---
  const renderResult = () => {
    if (!reviewMode) {
        const result = calculateResults();
        const incorrectCount = questions.length - result.score;
        const visibleIncorrect = freemiumConfig.limit;

        return (
          <div className="max-w-4xl mx-auto py-12 px-6">
             <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 text-gray-700 mb-4">
                   <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">Exam Complete</h2>
                <p className="text-gray-400 text-sm">Here's how you did</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                   <div className="text-4xl font-bold text-gray-900 mb-1">{result.score} <span className="text-lg text-gray-400 font-normal">/ {result.total}</span></div>
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                   <div className="text-4xl font-bold text-gray-900 mb-1">{result.percentage}%</div>
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accuracy</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm cursor-pointer hover:border-gray-300 transition-colors" onClick={() => { setReviewMode(true); setReviewFilter('incorrect'); }}>
                   {incorrectCount > 0 ? (
                      <>
                         <div className="text-4xl font-bold text-red-500 mb-1">{incorrectCount}</div>
                         <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mistakes</div>
                         {isPremium ? (
                            <div className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full inline-flex items-center gap-1.5 border border-green-200">
                               <CheckCircle className="w-3 h-3" />
                               All unlocked
                            </div>
                         ) : (
                            <div className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                               <EyeOff className="w-3 h-3" />
                               Review: {visibleIncorrect} of {incorrectCount}
                            </div>
                         )}
                      </>
                   ) : (
                      <>
                         <div className="text-4xl font-bold text-green-600 mb-1">0</div>
                         <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Perfect Score!</div>
                      </>
                   )}
                </div>
             </div>

             <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setExamState('intro'); setQuestions([]); }}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                   <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
                <button
                  onClick={() => { setReviewMode(true); setReviewFilter('all'); }}
                  className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                   Review Answers <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        );
    } else {
        // Review View
        const currentQ = questions[currentQuestionIndex];
        const isLocked = !freemiumConfig.allowedIds.has(currentQ.id);

        return (
            <div className="flex flex-col h-screen bg-gray-50">
               <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex justify-between items-center z-20 shadow-sm">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setReviewMode(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                     </button>
                     <h1 className="font-semibold text-gray-900">Review Answers</h1>
                  </div>

                  <div className="flex bg-gray-100 p-1 rounded-lg">
                      {['all', 'incorrect', 'flagged'].map((f) => (
                          <button
                             key={f}
                             onClick={() => setReviewFilter(f as any)}
                             className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                               reviewFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                             }`}
                          >
                             {f}
                          </button>
                      ))}
                  </div>
               </header>

               <div className="flex-1 overflow-hidden flex">
                  {/* Sidebar */}
                  <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden hidden md:flex">
                     <div className="p-4 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Questions
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        {questions.map((q, idx) => {
                           const isCorrect = answers[q.id] === q.correctAnswerIndex;
                           const isFlg = flagged.has(q.id);
                           const isVisible = reviewFilter === 'all' ||
                                           (reviewFilter === 'incorrect' && !isCorrect) ||
                                           (reviewFilter === 'flagged' && isFlg);
                           if (!isVisible) return null;
                           const isCurr = currentQuestionIndex === idx;
                           const isRestricted = !freemiumConfig.allowedIds.has(q.id);

                           return (
                              <button
                                 key={q.id}
                                 onClick={() => setCurrentQuestionIndex(idx)}
                                 className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                                   isCurr ? 'bg-gray-50 border-l-2 border-l-gray-900' : 'border-l-2 border-l-transparent'
                                 }`}
                              >
                                 <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                   isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                                 }`}>
                                    {isCorrect ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                       <span className={`text-sm font-semibold ${isCurr ? 'text-gray-900' : 'text-gray-700'}`}>Q{idx + 1}</span>
                                       {isRestricted && <Lock className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{q.text.substring(0, 40)}...</p>
                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-10">
                     <div className="max-w-3xl mx-auto pb-20">
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                           <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                              {currentQ.topic || 'General'}
                           </span>
                           {answers[currentQ.id] === currentQ.correctAnswerIndex ? (
                               <span className="flex items-center gap-1.5 text-green-600 font-semibold text-sm bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                  <CheckCircle className="w-4 h-4" /> Correct
                               </span>
                           ) : (
                               <span className="flex items-center gap-1.5 text-red-500 font-semibold text-sm bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                  <XCircle className="w-4 h-4" /> Incorrect
                               </span>
                           )}
                           {isLocked && (
                               <span className="ml-auto flex items-center gap-1.5 text-amber-600 font-semibold text-xs bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                  <Lock className="w-3 h-3" /> Premium Locked
                               </span>
                           )}
                        </div>

                        <div className="mb-8">
                           <LatexRenderer text={currentQ.text} className="text-xl text-gray-900 leading-relaxed" />
                           {currentQ.imageUrl && (
                              <img src={currentQ.imageUrl} alt="Context" className="mt-6 max-h-[300px] rounded-xl border border-gray-200" />
                           )}
                        </div>

                        <div className="space-y-3 mb-8">
                           {currentQ.options.map((opt, idx) => {
                              const isSelected = answers[currentQ.id] === idx;
                              const isCorrect = currentQ.correctAnswerIndex === idx;

                              let style = "border-gray-200 bg-white";
                              if (isCorrect) style = "border-green-400 bg-green-50 ring-1 ring-green-400/20";
                              else if (isSelected && !isCorrect) style = "border-red-400 bg-red-50";

                              return (
                                 <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${style} relative overflow-hidden shadow-sm`}>
                                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                       isCorrect ? 'border-green-500 bg-green-500 text-white' : (isSelected ? 'border-red-400 text-red-400' : 'border-gray-300 text-gray-400')
                                     }`}>
                                        {String.fromCharCode(65 + idx)}
                                     </div>
                                     <div className="flex-1">
                                         <LatexRenderer text={opt} className="text-gray-800" />
                                         {currentQ.optionImages?.[idx] && (
                                            <img src={currentQ.optionImages[idx] || ''} className="mt-2 h-16 rounded-lg border border-gray-200" />
                                         )}
                                     </div>
                                     {isCorrect && <CheckCircle className="w-5 h-5 text-green-500 absolute top-4 right-4" />}
                                     {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 absolute top-4 right-4" />}
                                 </div>
                              );
                           })}
                        </div>

                        {/* Explanation */}
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                            <div className={`bg-white p-6 ${isLocked ? 'filter blur-md select-none opacity-50' : ''}`}>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-600" /> Explanation
                                </h3>
                                <LatexRenderer text={currentQ.explanation || "No explanation provided."} className="text-gray-600 leading-relaxed" />
                                {currentQ.explanationImageUrl && (
                                    <img src={currentQ.explanationImageUrl} className="mt-4 rounded-xl border border-gray-200" />
                                )}
                            </div>

                            {isLocked && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm p-6 text-center">
                                    <div className="bg-gray-100 text-gray-500 p-4 rounded-2xl mb-4">
                                        <Lock className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analysis Locked</h3>
                                    <p className="text-gray-500 mb-6 max-w-md text-sm">
                                        You've reached the free preview limit. Unlock all explanations for a one-time payment of $29.99 AUD.
                                    </p>
                                    <button
                                        onClick={() => createCheckout().catch(err => {
                                            console.error('Checkout failed:', err);
                                            alert('Failed to start checkout. Please try again.');
                                        })}
                                        className="bg-gray-900 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center gap-2 text-sm hover:bg-gray-800"
                                    >
                                        <Crown className="w-5 h-5" /> Unlock Premium
                                    </button>
                                </div>
                            )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
        );
    }
  };

  if (examState === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {renderIntro()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
        {examState === 'active' && renderActiveExam()}
        {examState === 'result' && renderResult()}
    </div>
  );
};

export default StudentPortal;
