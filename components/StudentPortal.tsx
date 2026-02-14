
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Flag, Award, BookOpen, LogOut, Lock, Trophy, BarChart3, EyeOff, XCircle, X, ArrowLeft, Loader2, Crown, Star, User } from 'lucide-react';
import { Question, UserProfile } from '../types';
import LatexRenderer from './LatexRenderer';
import { dbService } from '../services/dbService';

interface StudentPortalProps {
  onExit: () => void;
  user: UserProfile | null;
}

type ExamState = 'intro' | 'active' | 'result';

interface ExamResult {
  date: string;
  score: number;
  total: number;
  percentage: number;
  topicStats: Record<string, { total: number, correct: number }>;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ onExit, user }) => {
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

  useEffect(() => {
    const initData = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/exam-data.json');
            if (response.ok) {
                const remoteData = await response.json();
                const localMeta = await dbService.loadLiveMetadata();
                if (!localMeta || localMeta.version < remoteData.version) {
                    await dbService.saveLiveBank(remoteData.questions);
                    await dbService.saveLiveMetadata({
                        version: remoteData.version,
                        lastUpdated: remoteData.lastUpdated,
                        description: remoteData.description
                    });
                }
            }
        } catch (e) {
            console.warn("Offline or failed to fetch exam-data.json, using local cache.", e);
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
            const savedHistory = await dbService.loadHistory();
            if (savedHistory && Array.isArray(savedHistory)) {
                setHistory(savedHistory);
            }
        } catch (e) { console.error("Error loading history", e); }

        setIsSyncing(false);
    };
    initData();

    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
    };
  }, []);

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

  useEffect(() => {
    if (examState !== 'active' || isSubmitting) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          performSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, isSubmitting]);

  const startExam = async () => {
    try {
      const allQuestions = await dbService.loadLiveBank() as Question[];
      if (!allQuestions || allQuestions.length === 0) {
         alert("The question bank is empty. Please ask your teacher to upload questions.");
         return;
      }
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
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

  const calculateResults = (): ExamResult => {
    let correct = 0;
    const topicStats: Record<string, { total: number, correct: number }> = {};
    questions.forEach(q => {
      const isCorrect = answers[q.id] === q.correctAnswerIndex;
      if (isCorrect) correct++;
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
      topicStats[topic].total++;
      if (isCorrect) topicStats[topic].correct++;
    });
    return {
      date: new Date().toISOString(),
      score: correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
      topicStats
    };
  };

  const handleRequestSubmit = () => { setShowSubmitModal(true); };

  const performSubmit = async (auto = false) => {
    setIsSubmitting(true);
    setShowSubmitModal(false);
    try {
        await new Promise(r => setTimeout(r, 500));
        const result = calculateResults();
        const newHistory = [result, ...history];
        setHistory(newHistory);
        try { await dbService.saveHistory(newHistory); } catch (dbError) { console.error("Failed to save history", dbError); }
        setExamState('result');
        setReviewMode(false);
    } catch (error) {
        console.error("Submission error:", error);
        alert("An error occurred during submission.");
        setIsSubmitting(false);
    }
  };

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
      const limit = Math.min(5, Math.ceil(totalMistakes / 2));
      const allowedMistakeIds = new Set(incorrectQuestions.slice(0, limit).map(q => q.id));
      const allowedIds = new Set([
          ...questions.filter(q => answers[q.id] === q.correctAnswerIndex).map(q => q.id),
          ...allowedMistakeIds
      ]);
      return { allowedIds, totalMistakes, limit };
  }, [examState, questions, answers]);

  // --- INTRO ---
  const renderIntro = () => (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12 flex justify-between items-start">
         <div className="flex items-center gap-3 mb-2">
            <div className="text-[#58a6ff] font-mono text-lg font-bold">
                <span className="text-[#e6edf3]">eipi</span>
                <span className="text-[#484f58]">/</span>
                <span>exam</span>
            </div>
         </div>
         <div className="flex items-center gap-3">
            {user?.pictureUrl ? (
                <img src={user.pictureUrl} alt="Profile" className="w-9 h-9 rounded-full border border-[#21262d]" />
            ) : (
               <div className="w-9 h-9 bg-[#21262d] text-[#58a6ff] rounded-full flex items-center justify-center font-bold text-sm">
                   {user?.realName?.[0] || <User className="w-4 h-4" />}
               </div>
            )}
            <span className="text-sm text-[#e6edf3]">{user?.realName || 'Student'}</span>
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
         <div className="bg-[#161b22] p-5 rounded-lg border border-[#21262d]">
            <div className="flex items-center gap-3 mb-1">
               <Trophy className="w-5 h-5 text-[#58a6ff]" />
               <span className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Last Score</span>
            </div>
            <div className="text-2xl font-black text-[#e6edf3] font-mono">{stats.last}</div>
         </div>
         <div className="bg-[#161b22] p-5 rounded-lg border border-[#21262d]">
            <div className="flex items-center gap-3 mb-1">
               <BarChart3 className="w-5 h-5 text-[#d2a8ff]" />
               <span className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Average</span>
            </div>
            <div className="text-2xl font-black text-[#e6edf3] font-mono">{stats.avg}</div>
         </div>
         <div className="bg-[#161b22] p-5 rounded-lg border border-[#21262d]">
            <div className="flex items-center gap-3 mb-1">
               <Star className="w-5 h-5 text-[#3fb950]" />
               <span className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Best Topic</span>
            </div>
            <div className="text-lg font-bold text-[#e6edf3] truncate" title={stats.bestTopic}>{stats.bestTopic}</div>
         </div>
      </div>

      {/* Start Exam CTA */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-8 md:p-10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="w-48 h-48 text-[#58a6ff]" />
         </div>

         <div className="relative z-10 max-w-lg">
            <div className="font-mono text-[#58a6ff] text-sm mb-4">exam.start()</div>
            <h2 className="text-2xl font-bold mb-6 text-[#e6edf3]">Ready for your practice exam?</h2>
            <div className="space-y-3 mb-8 text-sm text-[#8b949e]">
               <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#484f58]" /> <span>60 Minutes Time Limit</span>
               </div>
               <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-[#484f58]" /> <span>50 Questions (Randomized)</span>
               </div>
               <div className="flex items-center gap-3">
                  <EyeOff className="w-4 h-4 text-[#484f58]" /> <span>Secure Browser Environment</span>
               </div>
            </div>

            <button
               onClick={startExam}
               disabled={isSyncing || bankSize === 0}
               className="bg-[#238636] text-white hover:bg-[#2ea043] font-bold px-8 py-3 rounded-lg transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
               {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
               {isSyncing ? "Syncing Content..." : (bankSize > 0 ? "Start Practice Exam" : "No Content Available")}
            </button>
         </div>
      </div>

      <div className="mt-10 flex justify-center">
         <button onClick={onExit} className="text-[#484f58] hover:text-[#f85149] flex items-center gap-2 text-sm font-medium transition-colors">
            <LogOut className="w-4 h-4" /> sign_out()
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
      <div className="flex flex-col h-screen bg-[#0d1117]">
        {/* Exam Header */}
        <header className="bg-[#161b22] border-b border-[#21262d] px-6 py-4 flex justify-between items-center z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <span className="font-bold text-[#e6edf3] text-lg font-mono">{currentQuestionIndex + 1}</span>
                 <span className="text-[#484f58] font-mono">/ {questions.length}</span>
              </div>
              <div className="h-6 w-px bg-[#21262d]"></div>
              <div className={`flex items-center gap-2 font-mono font-medium text-lg ${timeLeft < 300 ? 'text-[#f85149] animate-pulse' : 'text-[#8b949e]'}`}>
                 <Clock className="w-5 h-5" />
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
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                  isFlagged
                    ? 'bg-[#da3633]/20 text-[#f85149] border border-[#f8514940]'
                    : 'bg-[#21262d] text-[#484f58] hover:text-[#8b949e] border border-[#30363d]'
                }`}
              >
                 <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
                 {isFlagged ? 'Flagged' : 'Flag'}
              </button>
              <button
                 onClick={handleRequestSubmit}
                 className="bg-[#238636] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#2ea043] transition-colors"
              >
                 Finish Exam
              </button>
           </div>
        </header>

        {/* Main Exam Area */}
        <div className="flex-1 overflow-hidden flex relative">
           {/* Sidebar */}
           <div className="w-72 bg-[#161b22] border-r border-[#21262d] flex flex-col hidden md:flex">
              <div className="p-4 border-b border-[#21262d] font-medium text-[#484f58] text-xs uppercase tracking-wider">Navigator</div>
              <div className="flex-1 overflow-y-auto p-4">
                 <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                       const isAns = answers[q.id] !== undefined;
                       const isCurr = idx === currentQuestionIndex;
                       const isFlg = flagged.has(q.id);

                       let bgClass = "bg-[#0d1117] border-[#21262d] text-[#484f58]";
                       if (isCurr) bgClass = "bg-[#58a6ff] text-white border-[#58a6ff] ring-2 ring-[#58a6ff]/30";
                       else if (isFlg) bgClass = "bg-[#da3633]/10 border-[#f8514950] text-[#f85149]";
                       else if (isAns) bgClass = "bg-[#388bfd]/10 border-[#388bfd50] text-[#58a6ff]";

                       return (
                          <button
                             key={q.id}
                             onClick={() => setCurrentQuestionIndex(idx)}
                             className={`aspect-square rounded flex flex-col items-center justify-center text-xs font-bold border transition-all ${bgClass}`}
                          >
                             {idx + 1}
                             {isFlg && !isCurr && <div className="w-1.5 h-1.5 rounded-full bg-[#f85149] mt-0.5"></div>}
                          </button>
                       );
                    })}
                 </div>
              </div>
              <div className="p-4 border-t border-[#21262d] text-xs text-[#484f58] flex flex-col gap-2">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#58a6ff] rounded"></div> Current</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#388bfd]/20 border border-[#388bfd50] rounded"></div> Answered</div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#da3633]/10 border border-[#f8514950] rounded"></div> Flagged</div>
              </div>
           </div>

           {/* Question Content */}
           <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
              <div className="max-w-3xl mx-auto pb-24">
                 <div className="mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#388bfd]/10 text-[#58a6ff] text-xs font-bold mb-4 border border-[#388bfd30]">
                       {currentQ.topic || currentQ.category}
                    </span>
                    <LatexRenderer text={currentQ.text} className="text-xl md:text-2xl font-medium text-[#e6edf3] leading-relaxed" />
                    {currentQ.imageUrl && (
                       <div className="mt-6 border border-[#21262d] rounded-lg overflow-hidden">
                          <img src={currentQ.imageUrl} alt="Diagram" className="w-full max-h-[400px] object-contain bg-[#161b22]" />
                       </div>
                    )}
                 </div>

                 <div className="space-y-3">
                    {currentQ.options.map((option, idx) => (
                       <button
                          key={idx}
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: idx }))}
                          className={`w-full text-left p-4 rounded-lg border transition-all flex items-start gap-4 group ${
                             selectedAnswer === idx
                                ? 'border-[#58a6ff] bg-[#388bfd]/10 ring-1 ring-[#58a6ff]/30'
                                : 'border-[#21262d] hover:border-[#30363d] bg-[#161b22]'
                          }`}
                       >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors mt-0.5 ${
                             selectedAnswer === idx
                               ? 'border-[#58a6ff] bg-[#58a6ff] text-white'
                               : 'border-[#30363d] text-[#484f58] group-hover:border-[#58a6ff] group-hover:text-[#58a6ff]'
                          }`}>
                             {String.fromCharCode(65 + idx)}
                          </div>
                          <div className="flex-1 pt-0.5">
                             <LatexRenderer text={option} className={`text-base ${selectedAnswer === idx ? 'text-[#e6edf3] font-medium' : 'text-[#8b949e]'}`} />
                             {currentQ.optionImages?.[idx] && (
                                <img src={currentQ.optionImages[idx] || ''} alt="Option Visual" className="mt-2 max-h-32 rounded border border-[#21262d]" />
                             )}
                          </div>
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Navigation Footer */}
           <div className="absolute bottom-0 left-0 right-0 bg-[#161b22] border-t border-[#21262d] p-4 flex justify-between items-center md:pl-80 z-10">
              <button
                 onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                 disabled={currentQuestionIndex === 0}
                 className="px-6 py-2.5 rounded-lg border border-[#30363d] text-[#8b949e] font-medium hover:bg-[#21262d] disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                 <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <button
                 onClick={handleNext}
                 className={`px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all text-sm ${
                     isLastQuestion
                     ? 'bg-[#238636] text-white hover:bg-[#2ea043]'
                     : 'bg-[#58a6ff] text-white hover:bg-[#79c0ff]'
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
           <div className="fixed inset-0 z-50 bg-[#0d1117]/80 flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-[#161b22] rounded-xl p-8 max-w-md text-center border border-[#21262d]">
                 <div className="w-16 h-16 bg-[#da3633]/20 text-[#f85149] rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-bold text-[#e6edf3] mb-2">Focus Check</h2>
                 <p className="text-[#8b949e] mb-6 text-sm leading-relaxed">
                    Please keep the exam window active. Navigating away is recorded.
                 </p>
                 <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 mb-6 text-xs font-mono text-[#f85149]">
                    focus_lost_count: {cheatingAttempts}
                 </div>
                 <button
                    onClick={() => setShowCheatingWarning(false)}
                    className="w-full bg-[#21262d] text-[#e6edf3] py-3 rounded-lg font-bold hover:bg-[#30363d] transition-colors border border-[#30363d]"
                 >
                    Resume Exam
                 </button>
              </div>
           </div>
        )}

        {/* Submit Modal */}
        {showSubmitModal && (
            <div className="fixed inset-0 z-50 bg-[#0d1117]/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-[#161b22] rounded-xl p-8 max-w-sm w-full border border-[#21262d]">
                    <h3 className="text-xl font-bold text-[#e6edf3] mb-2">Submit Exam?</h3>
                    <p className="text-[#8b949e] mb-6 text-sm">
                        You have answered <span className="font-bold text-[#58a6ff]">{Object.keys(answers).length}</span> out of <span className="font-bold text-[#58a6ff]">{questions.length}</span> questions.
                        {questions.length - Object.keys(answers).length > 0 && (
                            <span className="block mt-2 text-[#f85149] bg-[#f8514920] p-2 rounded border border-[#f8514940] text-xs">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                {questions.length - Object.keys(answers).length} questions unanswered.
                            </span>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowSubmitModal(false)}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 border border-[#30363d] rounded-lg text-[#8b949e] font-medium hover:bg-[#21262d] transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => performSubmit()}
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-[#238636] rounded-lg text-white font-bold hover:bg-[#2ea043] transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Submit'}
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
          <div className="max-w-5xl mx-auto py-12 px-6">
             <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#21262d] text-[#58a6ff] mb-4 border border-[#30363d]">
                   <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#e6edf3] mb-2">Exam Completed</h2>
                <p className="text-[#484f58] font-mono text-sm">result.summary()</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-[#161b22] p-6 rounded-lg border border-[#21262d] text-center">
                   <div className="text-4xl font-black text-[#e6edf3] mb-1 font-mono">{result.score} <span className="text-lg text-[#484f58]">/ {result.total}</span></div>
                   <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Score</div>
                </div>

                <div className="bg-[#161b22] p-6 rounded-lg border border-[#21262d] text-center">
                   <div className="text-4xl font-black text-[#e6edf3] mb-1 font-mono">{result.percentage}%</div>
                   <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Accuracy</div>
                </div>

                <div className="bg-[#161b22] p-6 rounded-lg border border-[#21262d] text-center cursor-pointer hover:border-[#30363d] transition-colors" onClick={() => { setReviewMode(true); setReviewFilter('incorrect'); }}>
                   {incorrectCount > 0 ? (
                      <>
                         <div className="text-4xl font-black text-[#f85149] mb-1 font-mono">{incorrectCount}</div>
                         <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold mb-2">Mistakes</div>
                         <div className="text-xs bg-[#da3633]/10 text-[#f85149] px-3 py-1 rounded-full border border-[#f8514940] inline-flex items-center gap-1.5">
                            <EyeOff className="w-3 h-3" />
                            Review Limit: {visibleIncorrect} of {incorrectCount}
                         </div>
                      </>
                   ) : (
                      <>
                         <div className="text-4xl font-black text-[#3fb950] mb-1 font-mono">0</div>
                         <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Perfect Score</div>
                      </>
                   )}
                </div>
             </div>

             <div className="flex gap-4 justify-center">
                <button
                  onClick={() => { setExamState('intro'); setQuestions([]); }}
                  className="px-6 py-3 bg-[#161b22] border border-[#21262d] text-[#8b949e] font-bold rounded-lg hover:bg-[#21262d] transition-colors flex items-center gap-2 text-sm"
                >
                   <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
                <button
                  onClick={() => { setReviewMode(true); setReviewFilter('all'); }}
                  className="px-8 py-3 bg-[#58a6ff] text-white font-bold rounded-lg hover:bg-[#79c0ff] transition-colors flex items-center gap-2 text-sm"
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
            <div className="flex flex-col h-screen bg-[#0d1117]">
               <header className="bg-[#161b22] border-b border-[#21262d] px-6 py-4 flex justify-between items-center z-20 shrink-0">
                  <div className="flex items-center gap-4">
                     <button onClick={() => setReviewMode(false)} className="p-2 hover:bg-[#21262d] rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#8b949e]" />
                     </button>
                     <h1 className="font-bold text-[#e6edf3] text-lg font-mono">review</h1>
                  </div>

                  <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#21262d]">
                      {['all', 'incorrect', 'flagged'].map((f) => (
                          <button
                             key={f}
                             onClick={() => setReviewFilter(f as any)}
                             className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                               reviewFilter === f ? 'bg-[#21262d] text-[#58a6ff]' : 'text-[#484f58] hover:text-[#8b949e]'
                             }`}
                          >
                             {f}
                          </button>
                      ))}
                  </div>
               </header>

               <div className="flex-1 overflow-hidden flex">
                  {/* Sidebar */}
                  <div className="w-80 bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-hidden hidden md:flex">
                     <div className="p-4 border-b border-[#21262d] text-xs font-bold text-[#484f58] uppercase tracking-wider">
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
                                 className={`w-full text-left p-4 border-b border-[#21262d]/50 hover:bg-[#0d1117] transition-colors flex items-start gap-3 ${
                                   isCurr ? 'bg-[#0d1117] border-l-2 border-l-[#58a6ff]' : 'border-l-2 border-l-transparent'
                                 }`}
                              >
                                 <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                   isCorrect ? 'bg-[#238636]/20 text-[#3fb950]' : 'bg-[#da3633]/20 text-[#f85149]'
                                 }`}>
                                    {isCorrect ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                       <span className={`text-sm font-bold ${isCurr ? 'text-[#58a6ff]' : 'text-[#e6edf3]'}`}>Q{idx + 1}</span>
                                       {isRestricted && <Lock className="w-3 h-3 text-[#484f58]" />}
                                    </div>
                                    <p className="text-xs text-[#484f58] truncate">{q.text.substring(0, 40)}...</p>
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
                           <span className="bg-[#21262d] text-[#8b949e] px-3 py-1 rounded-full text-xs font-bold border border-[#30363d]">
                              {currentQ.topic || 'General'}
                           </span>
                           {answers[currentQ.id] === currentQ.correctAnswerIndex ? (
                               <span className="flex items-center gap-1.5 text-[#3fb950] font-bold text-sm bg-[#238636]/10 px-3 py-1 rounded-full border border-[#238636]/30">
                                  <CheckCircle className="w-4 h-4" /> Correct
                               </span>
                           ) : (
                               <span className="flex items-center gap-1.5 text-[#f85149] font-bold text-sm bg-[#da3633]/10 px-3 py-1 rounded-full border border-[#da3633]/30">
                                  <XCircle className="w-4 h-4" /> Incorrect
                               </span>
                           )}
                           {isLocked && (
                               <span className="ml-auto flex items-center gap-1.5 text-[#d29922] font-bold text-xs bg-[#bb8009]/10 px-3 py-1 rounded-full border border-[#bb8009]/30">
                                  <Lock className="w-3 h-3" /> Premium Locked
                               </span>
                           )}
                        </div>

                        <div className="mb-8">
                           <LatexRenderer text={currentQ.text} className="text-xl text-[#e6edf3] leading-relaxed" />
                           {currentQ.imageUrl && (
                              <img src={currentQ.imageUrl} alt="Context" className="mt-6 max-h-[300px] rounded-lg border border-[#21262d]" />
                           )}
                        </div>

                        <div className="space-y-3 mb-8">
                           {currentQ.options.map((opt, idx) => {
                              const isSelected = answers[currentQ.id] === idx;
                              const isCorrect = currentQ.correctAnswerIndex === idx;

                              let style = "border-[#21262d] bg-[#161b22]";
                              if (isCorrect) style = "border-[#238636] bg-[#238636]/10 ring-1 ring-[#238636]/30";
                              else if (isSelected && !isCorrect) style = "border-[#da3633] bg-[#da3633]/10";

                              return (
                                 <div key={idx} className={`p-4 rounded-lg border flex items-start gap-4 ${style} relative overflow-hidden`}>
                                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                       isCorrect ? 'border-[#3fb950] bg-[#238636] text-white' : (isSelected ? 'border-[#f85149] text-[#f85149]' : 'border-[#30363d] text-[#484f58]')
                                     }`}>
                                        {String.fromCharCode(65 + idx)}
                                     </div>
                                     <div className="flex-1">
                                         <LatexRenderer text={opt} className="text-[#e6edf3]" />
                                         {currentQ.optionImages?.[idx] && (
                                            <img src={currentQ.optionImages[idx] || ''} className="mt-2 h-16 rounded border border-[#21262d]" />
                                         )}
                                     </div>
                                     {isCorrect && <CheckCircle className="w-5 h-5 text-[#3fb950] absolute top-4 right-4" />}
                                     {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-[#f85149] absolute top-4 right-4" />}
                                 </div>
                              );
                           })}
                        </div>

                        {/* Explanation */}
                        <div className="relative rounded-lg overflow-hidden border border-[#21262d]">
                            <div className={`bg-[#161b22] p-6 ${isLocked ? 'filter blur-md select-none opacity-50' : ''}`}>
                                <h3 className="font-bold text-[#e6edf3] mb-3 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-[#58a6ff]" /> Explanation
                                </h3>
                                <LatexRenderer text={currentQ.explanation || "No explanation provided."} className="text-[#8b949e] leading-relaxed" />
                                {currentQ.explanationImageUrl && (
                                    <img src={currentQ.explanationImageUrl} className="mt-4 rounded border border-[#21262d]" />
                                )}
                            </div>

                            {isLocked && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d1117]/60 backdrop-blur-sm p-6 text-center">
                                    <div className="bg-[#21262d] text-[#d29922] p-4 rounded-full mb-4 border border-[#30363d]">
                                        <Lock className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#e6edf3] mb-2">Detailed Analysis Locked</h3>
                                    <p className="text-[#8b949e] mb-6 max-w-md text-sm">
                                        You have exceeded the free preview limit for this session.
                                        Upgrade to Premium for full explanations.
                                    </p>
                                    <button className="bg-gradient-to-r from-[#58a6ff] to-[#d2a8ff] text-white font-bold py-3 px-8 rounded-lg transition-all flex items-center gap-2 text-sm">
                                        <Crown className="w-5 h-5" /> Unlock Premium Access
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
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono">
        {renderIntro()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono">
        {examState === 'active' && renderActiveExam()}
        {examState === 'result' && renderResult()}
    </div>
  );
};

export default StudentPortal;
