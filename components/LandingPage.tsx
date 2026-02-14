
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ChevronRight, Terminal, ArrowRight, Check, Clock, Shield, BarChart3, Menu, X, Star, Zap, BookOpen, TrendingUp, Crown, ChevronDown } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: (target: 'student' | 'teacher') => void;
}

// --- Typing animation hook (skip on revisit) ---
const useTypingEffect = (text: string, speed: number = 40, startDelay: number = 0) => {
  const hasPlayed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('eipi_hero_played') === '1';
  const [displayed, setDisplayed] = useState(hasPlayed ? text : '');
  const [done, setDone] = useState(hasPlayed);

  useEffect(() => {
    if (hasPlayed) return;
    const delayTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(delayTimer);
  }, []);

  return { displayed, done };
};

// --- Terminal-style code block ---
const CodeBlock: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className, title }) => (
  <div className={`bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden font-mono text-sm ${className || ''}`}>
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#21262d]">
      <div className="w-3 h-3 rounded-full bg-[#f85149]/80"></div>
      <div className="w-3 h-3 rounded-full bg-[#d29922]/80"></div>
      <div className="w-3 h-3 rounded-full bg-[#3fb950]/80"></div>
      <span className="ml-2 text-xs text-[#484f58]">{title || 'eipi'}</span>
    </div>
    <div className="p-5 leading-relaxed">{children}</div>
  </div>
);

// --- Animated counter ---
const Counter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <div ref={ref}>{count}{suffix}</div>;
};

// --- Scroll reveal wrapper ---
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setVisible(true), delay);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className || ''}`}
    >
      {children}
    </div>
  );
};


const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const heroLine1 = useTypingEffect('const exam = new SelectiveEntry();', 35, 300);
  const heroLine2 = useTypingEffect('exam.prepare({ state: "VIC" });', 35, 1800);
  const heroLine3 = useTypingEffect('// → 1150+ questions loaded', 30, 3200);
  const heroLine4 = useTypingEffect('exam.start();', 35, 4200);

  // Mark hero animation as played
  useEffect(() => {
    if (heroLine4.done) {
      try { sessionStorage.setItem('eipi_hero_played', '1'); } catch {}
    }
  }, [heroLine4.done]);

  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    if (mobileMenuOpen && scrollY > 100) setMobileMenuOpen(false);
  }, [scrollY]);

  return (
    <>
      {/* ===== NAVIGATION ===== */}
      <nav className={`fixed w-full z-50 top-0 transition-all duration-300 ${scrollY > 50 ? 'bg-[#0d1117]/95 backdrop-blur-md border-b border-[#21262d]' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-9 h-9 bg-[#161b22] border border-[#30363d] text-[#e6edf3] rounded-md flex items-center justify-center font-serif italic font-bold text-lg transition-all group-hover:border-[#58a6ff] group-hover:shadow-[0_0_12px_rgba(88,166,255,0.15)]">
               e<sup className="text-[9px] not-italic -mt-1.5 text-[#58a6ff]">iπ</sup>
            </div>
            <span className="font-mono font-semibold text-[#e6edf3] text-sm tracking-tight">eipi<span className="text-[#484f58]">.edu</span></span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors font-mono">features</a>
            <a href="#pricing" className="text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors font-mono">pricing</a>
            <a href="#stats" className="text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors font-mono">stats</a>
            <button
              onClick={() => onLoginClick('student')}
              className="px-4 py-2 text-sm font-mono font-medium text-[#e6edf3] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#8b949e] transition-all"
            >
              sign_in()
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#161b22] border-t border-[#21262d] px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#8b949e] hover:text-[#e6edf3] font-mono py-2">features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#8b949e] hover:text-[#e6edf3] font-mono py-2">pricing</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#8b949e] hover:text-[#e6edf3] font-mono py-2">stats</a>
            <button
              onClick={() => { onLoginClick('student'); setMobileMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-sm font-mono font-medium text-white bg-[#1f6feb] rounded-md"
            >
              sign_in()
            </button>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#0d1117]">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(rgba(88,166,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#1f6feb]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#8b5cf6]/8 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1f6feb]/10 border border-[#1f6feb]/20 text-[#58a6ff] text-xs font-mono mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse"></span>
                v2026 — now live
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-[#e6edf3] mb-5 leading-[1.12] tracking-tight">
                Selective entry,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] to-[#bc8cff]">solved systematically.</span>
              </h1>

              <p className="text-[#8b949e] text-lg leading-relaxed mb-8 max-w-lg">
                1,150+ expert-curated questions across VIC, NSW, QLD &amp; WA. Timed simulations. Instant analytics. No fluff.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => onLoginClick('student')}
                  className="group px-6 py-3.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1f6feb]/20 hover:shadow-[#1f6feb]/30"
                >
                  <Mail className="w-4 h-4" />
                  Start practicing
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <a
                  href="#features"
                  className="px-6 py-3.5 text-[#8b949e] hover:text-[#e6edf3] border border-[#21262d] hover:border-[#30363d] rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  Learn more
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Quick trust signals */}
              <div className="flex items-center gap-4 text-xs text-[#484f58] font-mono">
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[#3fb950]" /> Free to start</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[#3fb950]" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[#3fb950]" /> Instant access</span>
              </div>
            </div>

            {/* Right: Code block — desktop */}
            <div className="hidden lg:block">
              <CodeBlock>
                <div className="space-y-1.5 text-[13px]">
                  <div className="text-[#484f58]">{'// selective-entry-prep.ts'}</div>
                  <div className="h-3"></div>
                  <div>
                    <span className="text-[#ff7b72]">const </span>
                    <span className="text-[#e6edf3]">exam</span>
                    <span className="text-[#8b949e]"> = </span>
                    <span className="text-[#ff7b72]">new </span>
                    <span className="text-[#d2a8ff]">SelectiveEntry</span>
                    <span className="text-[#e6edf3]">()</span>
                    <span className="text-[#8b949e]">;</span>
                    {!heroLine1.done && <span className="inline-block w-[2px] h-4 bg-[#58a6ff] ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className={`transition-opacity duration-300 ${heroLine2.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#e6edf3]">exam</span>
                    <span className="text-[#8b949e]">.</span>
                    <span className="text-[#d2a8ff]">prepare</span>
                    <span className="text-[#e6edf3]">({"{"} </span>
                    <span className="text-[#79c0ff]">state</span>
                    <span className="text-[#8b949e]">: </span>
                    <span className="text-[#a5d6ff]">"VIC"</span>
                    <span className="text-[#e6edf3]"> {"}"})</span>
                    <span className="text-[#8b949e]">;</span>
                  </div>
                  <div className={`transition-opacity duration-500 ${heroLine3.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#3fb950]">{heroLine3.displayed}</span>
                    {heroLine3.displayed && !heroLine3.done && <span className="inline-block w-[2px] h-4 bg-[#58a6ff] ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className={`transition-opacity duration-300 ${heroLine4.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#e6edf3]">exam</span>
                    <span className="text-[#8b949e]">.</span>
                    <span className="text-[#d2a8ff]">start</span>
                    <span className="text-[#e6edf3]">()</span>
                    <span className="text-[#8b949e]">;</span>
                    {heroLine4.displayed && !heroLine4.done && <span className="inline-block w-[2px] h-4 bg-[#58a6ff] ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className="h-2"></div>
                  <div className={`transition-opacity duration-700 delay-300 ${heroLine4.done ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#484f58]">{'>'}</span>
                    <span className="text-[#8b949e]"> Ready. 50 questions. 60 min timer.</span>
                  </div>
                  <div className={`transition-opacity duration-700 delay-500 ${heroLine4.done ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#484f58]">{'>'}</span>
                    <span className="text-[#3fb950]"> Exam environment locked ✓</span>
                  </div>
                </div>
              </CodeBlock>

              <div className="flex gap-3 mt-4">
                {['Mathematics', 'Numerical', 'Verbal'].map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 text-[11px] font-mono text-[#8b949e] bg-[#161b22] border border-[#21262d] rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile: Mini exam preview card */}
            <div className="lg:hidden">
              <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 font-mono text-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#58a6ff] font-bold">Practice Exam</span>
                  <span className="text-[#8b949e] flex items-center gap-1"><Clock className="w-3 h-3" /> 60:00</span>
                </div>
                <div className="bg-[#0d1117] rounded p-3 mb-3 text-[#e6edf3] text-[11px] leading-relaxed">
                  Q12: If 3x + 7 = 22, what is the value of x?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['A) 3', 'B) 5', 'C) 7', 'D) 15'].map((opt, i) => (
                    <div key={i} className={`px-3 py-2 rounded text-[11px] border ${i === 1 ? 'border-[#58a6ff] bg-[#388bfd]/10 text-[#58a6ff]' : 'border-[#21262d] text-[#484f58]'}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* School names */}
          <div className="mt-12 pt-6 border-t border-[#21262d]">
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-[#484f58] text-xs font-mono">
              <span className="text-[#30363d] mr-2">targets:</span>
              {['Melbourne High', 'Mac.Robertson', 'Nossal', 'Suzanne Cory', '|', 'James Ruse', 'North Sydney Boys', '|', 'Brisbane State High', 'Perth Modern'].map((name, i) => (
                name === '|'
                  ? <span key={i} className="text-[#21262d]">·</span>
                  : <span key={i} className="hover:text-[#8b949e] transition-colors cursor-default">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section id="stats" className="py-16 bg-[#0d1117] border-t border-[#21262d]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 1150, suffix: '+', label: 'questions' },
              { value: 23, suffix: '', label: 'mock exams' },
              { value: 4, suffix: '', label: 'states covered' },
              { value: 60, suffix: 'min', label: 'timed sessions' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center group">
                  <div className="text-3xl md:text-4xl font-bold text-[#e6edf3] font-mono tracking-tight mb-1">
                    <Counter end={stat.value} suffix={stat.suffix} duration={1500 + i * 200} />
                  </div>
                  <div className="text-sm text-[#484f58] font-mono">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-24 bg-[#010409] border-t border-[#21262d]">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-[#e6edf3] mb-3 tracking-tight">
                Built for results
              </h2>
              <p className="text-[#484f58] text-base font-mono max-w-xl">
                // everything you need, nothing you don't
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Terminal className="w-5 h-5" />,
                title: 'Question Bank',
                desc: '1,150+ questions from real past papers, categorised by topic and difficulty.',
                tag: 'core',
                items: ['Expert-curated content', 'Covers all exam categories', 'Detailed solutions'],
                visual: (
                  <div className="mb-4 bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                    <div className="flex gap-2 mb-2">
                      {['Math', 'Numerical', 'Verbal'].map((c, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] font-mono">{c}</span>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { topic: 'Algebra', w: '78%', color: 'bg-[#58a6ff]' },
                        { topic: 'Geometry', w: '65%', color: 'bg-[#d2a8ff]' },
                        { topic: 'Patterns', w: '52%', color: 'bg-[#3fb950]' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-[#484f58]">
                          <span className="w-14 text-right">{row.topic}</span>
                          <div className="flex-1 bg-[#0d1117] rounded-full h-1.5 overflow-hidden">
                            <div className={`${row.color} h-full rounded-full transition-all duration-1000`} style={{ width: row.w }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: 'Exam Simulation',
                desc: 'Full lockdown environment: 50 questions, 60-minute timer, no tab-switching.',
                tag: 'runtime',
                items: ['Secure browser mode', 'Auto-submit on timeout', 'Question flagging'],
                visual: (
                  <div className="mb-4 bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-[#e6edf3] font-bold">Q23 / 50</span>
                      <span className="text-[10px] font-mono text-[#f85149] flex items-center gap-1"><Clock className="w-3 h-3" /> 42:17</span>
                    </div>
                    <div className="w-full bg-[#0d1117] rounded-full h-1 mb-2 overflow-hidden">
                      <div className="bg-[#58a6ff] h-full rounded-full" style={{ width: '46%' }}></div>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`aspect-square rounded text-[7px] flex items-center justify-center font-mono ${
                          i < 10 ? 'bg-[#388bfd]/15 text-[#58a6ff]' :
                          i === 10 ? 'bg-[#58a6ff] text-white ring-1 ring-[#58a6ff]/40' :
                          'bg-[#0d1117] text-[#30363d]'
                        }`}>{i + 1}</div>
                      ))}
                    </div>
                  </div>
                )
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                title: 'Analytics',
                desc: 'See exactly where you stand. Track scores, identify weak topics, measure improvement.',
                tag: 'output',
                items: ['Score breakdown', 'Topic-level insights', 'Historical trends'],
                visual: (
                  <div className="mb-4 bg-[#161b22] rounded-lg p-3 border border-[#21262d]">
                    <div className="flex items-end gap-1.5 h-12 mb-2">
                      {[35, 42, 55, 48, 62, 70, 68, 78, 82, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[#58a6ff] to-[#d2a8ff]" style={{ height: `${h}%`, opacity: 0.3 + (i / 10) * 0.7 }}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-[#484f58]">
                      <span>Test 1</span>
                      <span className="text-[#3fb950] font-bold flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> +24%</span>
                      <span>Test 10</span>
                    </div>
                  </div>
                )
              }
            ].map((feature, idx) => (
              <Reveal key={idx} delay={idx * 150}>
                <div className="group p-6 rounded-xl bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-md bg-[#161b22] border border-[#21262d] flex items-center justify-center text-[#58a6ff] group-hover:border-[#58a6ff]/30 group-hover:shadow-[0_0_8px_rgba(88,166,255,0.1)] transition-all">
                      {feature.icon}
                    </div>
                    <span className="text-[10px] font-mono text-[#484f58] bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">{feature.tag}</span>
                  </div>

                  {feature.visual}

                  <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">{feature.title}</h3>
                  <p className="text-[#8b949e] text-sm leading-relaxed mb-5">{feature.desc}</p>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[#484f58] font-mono">
                        <Check className="w-3 h-3 text-[#3fb950]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF / TESTIMONIALS ===== */}
      <section className="py-20 bg-[#0d1117] border-t border-[#21262d]">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#e6edf3] mb-3 tracking-tight">
                Students trust eipi
              </h2>
              <p className="text-[#484f58] text-sm font-mono">// what our users say</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "The exam simulation is incredibly realistic. The lockdown browser and timer gave me the exact pressure I needed to practise under real conditions.",
                name: 'Alex T.',
                detail: 'Year 9 → Melbourne High',
                stars: 5
              },
              {
                quote: "I improved from 58% to 84% in two months. The topic analytics showed me exactly where I was weak, and I focused my study there.",
                name: 'Sophie W.',
                detail: 'Year 9 → Mac.Robertson',
                stars: 5
              },
              {
                quote: "Finally a prep resource that doesn't feel like a dodgy tutoring website. Clean, fast, and the questions are actually from real papers.",
                name: 'James L.',
                detail: 'Year 8 → Nossal',
                stars: 5
              }
            ].map((t, idx) => (
              <Reveal key={idx} delay={idx * 150}>
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 hover:border-[#30363d] transition-all group">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-[#d29922] fill-[#d29922]" />
                    ))}
                  </div>
                  <p className="text-[#8b949e] text-sm leading-relaxed mb-6 italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#21262d] text-[#58a6ff] flex items-center justify-center font-bold text-xs">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#e6edf3]">{t.name}</div>
                      <div className="text-xs text-[#3fb950] font-mono">{t.detail}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING / FREEMIUM TRANSPARENCY ===== */}
      <section id="pricing" className="py-24 bg-[#010409] border-t border-[#21262d]">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-[#e6edf3] mb-3 tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="text-[#484f58] text-sm font-mono">// start for free, upgrade when ready</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Reveal delay={0}>
              <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-8 hover:border-[#30363d] transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#161b22] border border-[#21262d] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#8b949e]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#e6edf3]">Free</h3>
                    <p className="text-xs text-[#484f58] font-mono">$0 / forever</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    'Full question bank (1,150+ questions)',
                    'Timed exam simulations',
                    'Score & topic breakdown',
                    'Partial mistake review (first 5)',
                    'Session history'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#8b949e]">
                      <Check className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onLoginClick('student')}
                  className="w-full py-3 border border-[#30363d] rounded-lg text-[#e6edf3] font-medium hover:bg-[#161b22] transition-colors text-sm"
                >
                  Get started free
                </button>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="bg-[#0d1117] border-2 border-[#58a6ff]/40 rounded-xl p-8 relative overflow-hidden hover:border-[#58a6ff]/60 transition-all">
                <div className="absolute top-0 right-0 px-3 py-1 bg-[#58a6ff] text-[#0d1117] text-[10px] font-mono font-bold rounded-bl-lg">
                  COMING SOON
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-[#1f6feb]/10 border border-[#1f6feb]/30 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#58a6ff]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#e6edf3]">Premium</h3>
                    <p className="text-xs text-[#484f58] font-mono">pricing TBA</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    'Everything in Free',
                    'Unlimited mistake review & explanations',
                    'Full solution walkthroughs',
                    'Performance trends over time',
                    'Priority question bank updates'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#8b949e]">
                      <Check className="w-4 h-4 text-[#58a6ff] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  className="w-full py-3 bg-[#21262d] border border-[#30363d] rounded-lg text-[#484f58] font-medium text-sm cursor-not-allowed"
                >
                  Notify me
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 bg-[#0d1117] border-t border-[#21262d]">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-[#e6edf3] mb-3 tracking-tight">
                How it works
              </h2>
              <p className="text-[#484f58] text-base font-mono">
                // three steps to exam-ready
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Sign up',
                desc: 'Create your account with just an email. No credit card, no commitment. Takes under 30 seconds.',
                icon: <Mail className="w-5 h-5" />,
              },
              {
                step: '02',
                title: 'Practice',
                desc: 'Take timed mock exams with 50 randomly selected questions. Secure browser — just like the real test day.',
                icon: <BookOpen className="w-5 h-5" />,
              },
              {
                step: '03',
                title: 'Improve',
                desc: 'Review every mistake with detailed solutions. Track your progress by topic and watch your scores climb.',
                icon: <TrendingUp className="w-5 h-5" />,
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="relative group">
                  <div className="text-6xl font-bold text-[#161b22] font-mono absolute -top-2 -left-1 select-none group-hover:text-[#1c2128] transition-colors">{item.step}</div>
                  <div className="relative pt-12 pl-1">
                    <div className="w-9 h-9 rounded-md bg-[#161b22] border border-[#21262d] flex items-center justify-center text-[#58a6ff] mb-4 group-hover:border-[#58a6ff]/30 transition-colors">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">{item.title}</h3>
                    <p className="text-[#8b949e] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 bg-[#010409] border-t border-[#21262d]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <CodeBlock className="mb-10 text-left max-w-md mx-auto" title="your-future.ts">
              <div className="space-y-1.5 text-[13px]">
                <div className="text-[#484f58]">{'// your-future.ts'}</div>
                <div>
                  <span className="text-[#ff7b72]">if </span>
                  <span className="text-[#e6edf3]">(</span>
                  <span className="text-[#79c0ff]">ready</span>
                  <span className="text-[#e6edf3]">) {'{'}</span>
                </div>
                <div className="pl-4">
                  <span className="text-[#e6edf3]">eipi</span>
                  <span className="text-[#8b949e]">.</span>
                  <span className="text-[#d2a8ff]">beginPreparation</span>
                  <span className="text-[#e6edf3]">()</span>
                  <span className="text-[#8b949e]">;</span>
                </div>
                <div>
                  <span className="text-[#e6edf3]">{'}'}</span>
                </div>
              </div>
            </CodeBlock>

            <h2 className="text-2xl md:text-3xl font-bold text-[#e6edf3] mb-4 tracking-tight">
              Ready to start?
            </h2>
            <p className="text-[#8b949e] mb-8 max-w-md mx-auto">
              Free access to the full question bank. No payment required.
            </p>
            <button
              onClick={() => onLoginClick('student')}
              className="group px-8 py-4 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded-lg font-medium text-lg transition-all shadow-lg shadow-[#1f6feb]/20 hover:shadow-[#1f6feb]/30 flex items-center justify-center gap-3 mx-auto"
            >
              <Mail className="w-5 h-5" />
              Get started
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#010409] border-t border-[#21262d] py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#161b22] border border-[#30363d] text-[#e6edf3] rounded flex items-center justify-center font-serif italic font-bold text-sm">
                   e<sup className="text-[8px] not-italic -mt-1 text-[#58a6ff]">iπ</sup>
                </div>
                <span className="font-mono text-sm text-[#8b949e]">eipi</span>
              </div>
              <p className="text-[#484f58] text-xs font-mono max-w-xs leading-relaxed">
                Selective school exam preparation for Australian students. Built with care.
              </p>
            </div>

            <div className="flex gap-16">
              <div>
                <h4 className="text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-3">Platform</h4>
                <ul className="space-y-2 text-sm font-mono">
                  <li><a href="#features" className="text-[#484f58] hover:text-[#58a6ff] transition-colors">Features</a></li>
                  <li><a href="#pricing" className="text-[#484f58] hover:text-[#58a6ff] transition-colors">Pricing</a></li>
                  <li><a href="#stats" className="text-[#484f58] hover:text-[#58a6ff] transition-colors">Question Bank</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-3">Legal</h4>
                <ul className="space-y-2 text-sm font-mono">
                  <li><a href="#" className="text-[#484f58] hover:text-[#58a6ff] transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-[#484f58] hover:text-[#58a6ff] transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-[#21262d] pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[#30363d] text-xs font-mono">
              © 2026 eipi education. all rights reserved.
            </div>
            <button onClick={() => onLoginClick('teacher')} className="flex items-center gap-1.5 text-xs font-mono text-[#30363d] hover:text-[#58a6ff] transition-colors">
              <Lock className="w-3 h-3" /> staff_access
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
