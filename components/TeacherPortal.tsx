
import React, { useState, useEffect, useMemo } from 'react';
import {
  LogOut, Users, BookOpen, Search, XCircle, ChevronDown, ChevronRight,
  User, Mail, School, Calendar, Clock, BarChart3, Database, RefreshCw, Trash2
} from 'lucide-react';
import { Question, UserProfile } from '../types';
import { dbService } from '../services/dbService';

interface TeacherPortalProps {
    onExit: () => void;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'bank'>('students');

  // Student Management
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);

  // Bank Stats
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankVersion, setBankVersion] = useState<string>('--');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all students
      const allStudents = await dbService.loadAllUsers();
      setStudents(allStudents || []);

      // Load bank for stats
      const live = await dbService.loadLiveBank();
      if (live && Array.isArray(live)) {
        setBankQuestions(live);
      }

      // Load metadata
      const meta = await dbService.loadLiveMetadata();
      if (meta) {
        setBankVersion(`v${meta.version || '?'}`);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
    setIsLoading(false);
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const lower = searchTerm.toLowerCase();
    return students.filter(s =>
      s.realName?.toLowerCase().includes(lower) ||
      s.email?.toLowerCase().includes(lower) ||
      s.school?.toLowerCase().includes(lower) ||
      s.username?.toLowerCase().includes(lower)
    );
  }, [students, searchTerm]);

  // Bank stats
  const bankStats = useMemo(() => {
    const topics: Record<string, number> = {};
    const categories: Record<string, number> = {};
    bankQuestions.forEach(q => {
      const t = q.topic || 'Uncategorized';
      topics[t] = (topics[t] || 0) + 1;
      const c = q.category || 'Unknown';
      categories[c] = (categories[c] || 0) + 1;
    });
    return { topics, categories, total: bankQuestions.length };
  }, [bankQuestions]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-AU', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return iso; }
  };

  const handleDeleteStudent = async (email: string) => {
    if (!confirm(`Remove student ${email}? This will delete their profile and history.`)) return;
    try {
      await dbService.deleteUserProfile(email);
      setStudents(prev => prev.filter(s => s.email !== email));
      if (selectedStudent?.email === email) setSelectedStudent(null);
    } catch (e) {
      console.error("Failed to delete student", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-[#e6edf3] font-mono">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#21262d] px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[#58a6ff] font-bold text-lg">
            <span className="text-[#e6edf3]">eipi</span>
            <span className="text-[#484f58]">/</span>
            <span>admin</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#21262d]">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-[#21262d] text-[#58a6ff]'
                  : 'text-[#484f58] hover:text-[#e6edf3]'
              }`}
            >
              <Users className="w-4 h-4" /> Students
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'bank'
                  ? 'bg-[#21262d] text-[#58a6ff]'
                  : 'text-[#484f58] hover:text-[#e6edf3]'
              }`}
            >
              <Database className="w-4 h-4" /> Question Bank
            </button>
          </div>

          <div className="h-6 w-px bg-[#21262d]"></div>

          <button
            onClick={onExit}
            className="text-[#484f58] hover:text-[#f85149] flex items-center gap-2 text-sm transition-colors"
            title="Exit Admin"
          >
            <LogOut className="w-4 h-4" /> exit()
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'students' ? (
          <div className="h-full flex">
            {/* Student List */}
            <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col border-r border-[#21262d]">
              <div className="p-4 border-b border-[#21262d] space-y-3 shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-[#e6edf3] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#58a6ff]" />
                    Registered Students
                    <span className="text-xs bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded-full">
                      {students.length}
                    </span>
                  </h2>
                  <button
                    onClick={loadData}
                    className="text-[#484f58] hover:text-[#58a6ff] transition-colors p-1"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-[#0d1117] border border-[#21262d] rounded-lg text-sm text-[#e6edf3] placeholder-[#484f58] focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] outline-none transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#e6edf3]">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40 text-[#484f58]">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 text-[#484f58]">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{searchTerm ? 'No matching students' : 'No students registered yet'}</p>
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.email}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-4 border-b border-[#21262d]/50 hover:bg-[#161b22] transition-colors flex items-center gap-3 ${
                        selectedStudent?.email === student.email ? 'bg-[#161b22] border-l-2 border-l-[#58a6ff]' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#21262d] text-[#58a6ff] flex items-center justify-center font-bold text-sm shrink-0">
                        {student.realName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#e6edf3] truncate">{student.realName || 'Unknown'}</span>
                          <span className="text-xs text-[#484f58] shrink-0">{student.yearLevel}</span>
                        </div>
                        <p className="text-xs text-[#484f58] truncate">{student.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Student Detail */}
            <div className="hidden md:flex flex-1 flex-col">
              {selectedStudent ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-lg mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 rounded-full bg-[#21262d] text-[#58a6ff] flex items-center justify-center font-bold text-2xl">
                        {selectedStudent.realName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#e6edf3]">{selectedStudent.realName}</h2>
                        <p className="text-sm text-[#484f58]">@{selectedStudent.username}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 space-y-3">
                        <h3 className="text-xs font-bold text-[#484f58] uppercase tracking-wider mb-2">Profile Details</h3>

                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-[#484f58]" />
                          <span className="text-[#e6edf3]">{selectedStudent.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <School className="w-4 h-4 text-[#484f58]" />
                          <span className="text-[#e6edf3]">{selectedStudent.school || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <BookOpen className="w-4 h-4 text-[#484f58]" />
                          <span className="text-[#e6edf3]">{selectedStudent.yearLevel || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-[#484f58]" />
                          <span className="text-[#e6edf3]">Joined: {selectedStudent.joinedAt ? formatDate(selectedStudent.joinedAt) : '--'}</span>
                        </div>
                        {selectedStudent.referralSource && (
                          <div className="flex items-center gap-3 text-sm">
                            <User className="w-4 h-4 text-[#484f58]" />
                            <span className="text-[#e6edf3]">Referral: {selectedStudent.referralSource}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteStudent(selectedStudent.email)}
                        className="flex items-center gap-2 text-sm text-[#484f58] hover:text-[#f85149] transition-colors mt-4"
                      >
                        <Trash2 className="w-4 h-4" /> Remove Student
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#484f58]">
                  <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Select a student to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Question Bank Overview */
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#e6edf3] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#58a6ff]" />
                  Question Bank Overview
                </h2>
                <span className="text-xs text-[#484f58] bg-[#161b22] px-3 py-1 rounded-full border border-[#21262d]">
                  {bankVersion}
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-5">
                  <div className="text-3xl font-black text-[#e6edf3] mb-1">{bankStats.total}</div>
                  <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Total Questions</div>
                </div>
                <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-5">
                  <div className="text-3xl font-black text-[#e6edf3] mb-1">{Object.keys(bankStats.topics).length}</div>
                  <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Topics</div>
                </div>
                <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-5">
                  <div className="text-3xl font-black text-[#e6edf3] mb-1">{Object.keys(bankStats.categories).length}</div>
                  <div className="text-xs text-[#484f58] uppercase tracking-wider font-bold">Categories</div>
                </div>
              </div>

              {/* Topics Breakdown */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[#21262d]">
                  <h3 className="text-xs font-bold text-[#484f58] uppercase tracking-wider">Questions by Topic</h3>
                </div>
                <div className="divide-y divide-[#21262d]/50">
                  {Object.entries(bankStats.topics)
                    .sort(([,a], [,b]) => b - a)
                    .map(([topic, count]) => (
                      <div key={topic} className="px-5 py-3 flex justify-between items-center">
                        <span className="text-sm text-[#e6edf3]">{topic}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-[#0d1117] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#58a6ff] h-full rounded-full transition-all"
                              style={{ width: `${(count / bankStats.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#484f58] font-mono w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))
                  }
                  {bankStats.total === 0 && (
                    <div className="px-5 py-8 text-center text-[#484f58] text-sm">
                      No questions loaded. Check exam-data.json on GitHub.
                    </div>
                  )}
                </div>
              </div>

              {/* Categories Breakdown */}
              {Object.keys(bankStats.categories).length > 0 && (
                <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#21262d]">
                    <h3 className="text-xs font-bold text-[#484f58] uppercase tracking-wider">Questions by Category</h3>
                  </div>
                  <div className="divide-y divide-[#21262d]/50">
                    {Object.entries(bankStats.categories)
                      .sort(([,a], [,b]) => b - a)
                      .map(([cat, count]) => (
                        <div key={cat} className="px-5 py-3 flex justify-between items-center">
                          <span className="text-sm text-[#e6edf3]">{cat}</span>
                          <span className="text-xs text-[#484f58] font-mono bg-[#0d1117] px-2 py-0.5 rounded">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              <p className="text-xs text-[#484f58] text-center pt-4">
                Question bank is managed via GitHub. Edit <code className="text-[#58a6ff]">exam-data.json</code> to update content.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#161b22] border-t border-[#21262d] px-6 py-2 text-xs text-[#484f58] flex justify-between items-center shrink-0">
        <div className="flex gap-4">
          <span>students: {students.length}</span>
          <span>bank: {bankStats.total} questions</span>
        </div>
        <span>eipi admin panel</span>
      </footer>
    </div>
  );
};

export default TeacherPortal;
