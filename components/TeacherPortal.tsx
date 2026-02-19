
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allStudents = await dbService.loadAllUsers();
      setStudents(allStudents || []);

      const live = await dbService.loadLiveBank();
      if (live && Array.isArray(live)) {
        setBankQuestions(live);
      }

      const meta = await dbService.loadLiveMetadata();
      if (meta) {
        setBankVersion(`v${meta.version || '?'}`);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
    setIsLoading(false);
  };

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
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 text-white rounded-md flex items-center justify-center font-serif italic font-bold text-sm">
              e<sup className="text-[8px] not-italic -mt-1">iπ</sup>
            </div>
            <span className="font-semibold text-gray-900 text-sm">eipi</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-sm">admin</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" /> Students
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'bank'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="w-4 h-4" /> Question Bank
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200"></div>

          <button
            onClick={onExit}
            className="text-gray-400 hover:text-red-500 flex items-center gap-2 text-sm transition-colors"
            title="Exit Admin"
          >
            <LogOut className="w-4 h-4" /> Exit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === 'students' ? (
          <div className="h-full flex">
            {/* Student List */}
            <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col border-r border-gray-200 bg-white">
              <div className="p-4 border-b border-gray-200 space-y-3 shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Registered Students
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      {students.length}
                    </span>
                  </h2>
                  <button
                    onClick={loadData}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{searchTerm ? 'No matching students' : 'No students registered yet'}</p>
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.email}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        selectedStudent?.email === student.email ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-blue-600 flex items-center justify-center font-semibold text-sm shrink-0">
                        {student.realName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">{student.realName || 'Unknown'}</span>
                          <span className="text-xs text-gray-400 shrink-0">{student.yearLevel}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Student Detail */}
            <div className="hidden md:flex flex-1 flex-col bg-gray-50">
              {selectedStudent ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-lg mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center font-bold text-2xl shadow-sm">
                        {selectedStudent.realName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedStudent.realName}</h2>
                        <p className="text-sm text-gray-400">@{selectedStudent.username}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile Details</h3>

                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedStudent.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <School className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedStudent.school || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{selectedStudent.yearLevel || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">Joined: {selectedStudent.joinedAt ? formatDate(selectedStudent.joinedAt) : '--'}</span>
                        </div>
                        {selectedStudent.referralSource && (
                          <div className="flex items-center gap-3 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">Referral: {selectedStudent.referralSource}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteStudent(selectedStudent.email)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors mt-4"
                      >
                        <Trash2 className="w-4 h-4" /> Remove Student
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-300">
                  <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-sm text-gray-400">Select a student to view details</p>
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
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Question Bank Overview
                </h2>
                <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 font-mono">
                  {bankVersion}
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: bankStats.total, label: 'Total Questions' },
                  { value: Object.keys(bankStats.topics).length, label: 'Topics' },
                  { value: Object.keys(bankStats.categories).length, label: 'Categories' },
                ].map((card, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{card.value}</div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Topics Breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Questions by Topic</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {Object.entries(bankStats.topics)
                    .sort(([,a], [,b]) => b - a)
                    .map(([topic, count]) => (
                      <div key={topic} className="px-5 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-700">{topic}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${(count / bankStats.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 font-mono w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))
                  }
                  {bankStats.total === 0 && (
                    <div className="px-5 py-8 text-center text-gray-400 text-sm">
                      No questions loaded. Check exam-data.json on GitHub.
                    </div>
                  )}
                </div>
              </div>

              {/* Categories Breakdown */}
              {Object.keys(bankStats.categories).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Questions by Category</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(bankStats.categories)
                      .sort(([,a], [,b]) => b - a)
                      .map(([cat, count]) => (
                        <div key={cat} className="px-5 py-3 flex justify-between items-center">
                          <span className="text-sm text-gray-700">{cat}</span>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2.5 py-1 rounded-full">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center pt-4">
                Question bank is managed via GitHub. Edit <code className="text-blue-600 font-mono">exam-data.json</code> to update content.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2 text-xs text-gray-400 flex justify-between items-center shrink-0">
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
