
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ChevronRight, Terminal, ArrowRight, Check, Clock, Shield, BarChart3, Menu, X, Star, Zap, BookOpen, TrendingUp, Crown } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: (target: 'student' | 'teacher') => void;
  onPremiumClick?: () => void;
}

// --- Typing animation hook ---
const useTypingEffect = (text: string, speed: number = 40, startDelay: number = 0) => {
  const hasPlayed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('eipi_hero_played') === '1';
  const [displayed, setDisplayed] = useState(hasPlayed ? text : '');
  const [done, setDone] = useState(hasPlayed);

  useEffect(() => {
    if (hasPlayed) return;
    let interval: ReturnType<typeof setInterval>;
    const delayTimer = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(delayTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay, hasPlayed]);

  return { displayed, done };
};

// --- Code block (light theme) ---
const CodeBlock: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className, title }) => (
  <div className={`bg-gray-50 border border-gray-200 rounded-xl overflow-hidden font-mono text-sm ${className || ''}`}>
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
      <div className="w-3 h-3 rounded-full bg-red-400/70"></div>
      <div className="w-3 h-3 rounded-full bg-yellow-400/70"></div>
      <div className="w-3 h-3 rounded-full bg-green-400/70"></div>
      <span className="ml-2 text-xs text-gray-400">{title || 'eipi'}</span>
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

// --- Scroll reveal ---
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


const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onPremiumClick }) => {
  const heroLine1 = useTypingEffect('const exam = new SelectiveEntry();', 35, 300);
  const heroLine2 = useTypingEffect('exam.prepare({ state: "VIC" });', 35, 1800);
  const heroLine3 = useTypingEffect('// → 1150+ questions loaded', 30, 3200);
  const heroLine4 = useTypingEffect('exam.start();', 35, 4200);

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

  useEffect(() => {
    if (mobileMenuOpen && scrollY > 100) setMobileMenuOpen(false);
  }, [scrollY]);

  return (
    <>
      {/* ===== NAVIGATION ===== */}
      <nav className={`fixed w-full z-50 top-0 transition-all duration-300 ${scrollY > 50 ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 cursor-default">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-serif italic font-bold text-base">
               e<sup className="text-[9px] not-italic -mt-1.5">iπ</sup>
            </div>
            <span className="font-semibold text-gray-900 text-sm tracking-tight">eipi</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#stats" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Stats</a>
            <button
              onClick={() => onLoginClick('student')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              Sign in
            </button>
            <button
              onClick={() => onLoginClick('student')}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm"
            >
              Get started
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Pricing</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Stats</a>
            <button
              onClick={() => { onLoginClick('student'); setMobileMenuOpen(false); }}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              Get started free
            </button>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.4]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-50 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                v2026 — now live
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-gray-900 mb-5 leading-[1.1] tracking-tight">
                Selective entry,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">solved systematically.</span>
              </h1>

              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
                1,150+ expert-curated questions across VIC, NSW, QLD &amp; WA. Timed simulations. Instant analytics. No fluff.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => onLoginClick('student')}
                  className="group px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  Start practising
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <a
                  href="#features"
                  className="px-6 py-3.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  Learn more
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-5 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Free to start</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Instant access</span>
              </div>
            </div>

            {/* Right: Code block — desktop */}
            <div className="hidden lg:block">
              <CodeBlock>
                <div className="space-y-1.5 text-[13px]">
                  <div className="text-gray-400">{'// selective-entry-prep.ts'}</div>
                  <div className="h-3"></div>
                  <div>
                    <span className="text-purple-600">const </span>
                    <span className="text-gray-800">exam</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-purple-600">new </span>
                    <span className="text-blue-600">SelectiveEntry</span>
                    <span className="text-gray-800">()</span>
                    <span className="text-gray-500">;</span>
                    {!heroLine1.done && <span className="inline-block w-[2px] h-4 bg-blue-500 ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className={`transition-opacity duration-300 ${heroLine2.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-gray-800">exam</span>
                    <span className="text-gray-500">.</span>
                    <span className="text-blue-600">prepare</span>
                    <span className="text-gray-800">({"{"} </span>
                    <span className="text-teal-600">state</span>
                    <span className="text-gray-500">: </span>
                    <span className="text-green-600">"VIC"</span>
                    <span className="text-gray-800"> {"}"})</span>
                    <span className="text-gray-500">;</span>
                  </div>
                  <div className={`transition-opacity duration-500 ${heroLine3.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-gray-400">{heroLine3.displayed}</span>
                    {heroLine3.displayed && !heroLine3.done && <span className="inline-block w-[2px] h-4 bg-blue-500 ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className={`transition-opacity duration-300 ${heroLine4.displayed ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-gray-800">exam</span>
                    <span className="text-gray-500">.</span>
                    <span className="text-blue-600">start</span>
                    <span className="text-gray-800">()</span>
                    <span className="text-gray-500">;</span>
                    {heroLine4.displayed && !heroLine4.done && <span className="inline-block w-[2px] h-4 bg-blue-500 ml-0.5 animate-pulse align-middle"></span>}
                  </div>
                  <div className="h-2"></div>
                  <div className={`transition-opacity duration-700 delay-300 ${heroLine4.done ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-gray-400">{'>'}</span>
                    <span className="text-gray-500"> Ready. 50 questions. 60 min timer.</span>
                  </div>
                  <div className={`transition-opacity duration-700 delay-500 ${heroLine4.done ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-gray-400">{'>'}</span>
                    <span className="text-green-600"> Exam environment locked ✓</span>
                  </div>
                </div>
              </CodeBlock>

              <div className="flex gap-2 mt-4">
                {['Mathematics', 'Numerical', 'Verbal'].map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 text-[11px] text-gray-500 bg-white border border-gray-200 rounded-md shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile: Mini exam preview */}
            <div className="lg:hidden">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-blue-600 font-semibold text-sm">Practice Exam</span>
                  <span className="text-gray-400 flex items-center gap-1 text-xs"><Clock className="w-3 h-3" /> 60:00</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-gray-700 text-xs leading-relaxed border border-gray-100">
                  Q12: If 3x + 7 = 22, what is the value of x?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['A) 3', 'B) 5', 'C) 7', 'D) 15'].map((opt, i) => (
                    <div key={i} className={`px-3 py-2 rounded-lg text-xs border ${i === 1 ? 'border-blue-400 bg-blue-50 text-blue-600 font-semibold' : 'border-gray-200 text-gray-400'}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* School names */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-gray-400 text-xs">
              <span className="text-gray-300 mr-2">preparing for:</span>
              {['Melbourne High', 'Mac.Robertson', 'Nossal', 'Suzanne Cory', '|', 'James Ruse', 'North Sydney Boys', '|', 'Brisbane State High', 'Perth Modern'].map((name, i) => (
                name === '|'
                  ? <span key={i} className="text-gray-200">·</span>
                  : <span key={i} className="hover:text-gray-600 transition-colors cursor-default">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section id="stats" className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 1150, suffix: '+', label: 'questions' },
              { value: 23, suffix: '', label: 'mock exams' },
              { value: 4, suffix: '', label: 'states covered' },
              { value: 60, suffix: 'min', label: 'timed sessions' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 font-mono tracking-tight mb-1">
                    <Counter end={stat.value} suffix={stat.suffix} duration={1500 + i * 200} />
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                Built for results
              </h2>
              <p className="text-gray-400 text-base max-w-xl">
                Everything you need, nothing you don't.
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
                  <div className="mb-5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex gap-2 mb-3">
                      {['Math', 'Numerical', 'Verbal'].map((c, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm">{c}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[
                        { topic: 'Algebra', w: '78%', color: 'bg-blue-500' },
                        { topic: 'Geometry', w: '65%', color: 'bg-purple-500' },
                        { topic: 'Patterns', w: '52%', color: 'bg-green-500' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="w-14 text-right">{row.topic}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`${row.color} h-full rounded-full`} style={{ width: row.w }}></div>
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
                  <div className="mb-5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-gray-700">Q23 / 50</span>
                      <span className="text-[10px] text-red-500 flex items-center gap-1 font-medium"><Clock className="w-3 h-3" /> 42:17</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-2.5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '46%' }}></div>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`aspect-square rounded text-[7px] flex items-center justify-center font-semibold ${
                          i < 10 ? 'bg-blue-100 text-blue-600' :
                          i === 10 ? 'bg-gray-900 text-white ring-1 ring-gray-900/20' :
                          'bg-gray-100 text-gray-400'
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
                  <div className="mb-5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-end gap-1.5 h-12 mb-2">
                      {[35, 42, 55, 48, 62, 70, 68, 78, 82, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-purple-400" style={{ height: `${h}%`, opacity: 0.3 + (i / 10) * 0.7 }}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>Test 1</span>
                      <span className="text-green-600 font-semibold flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> +24%</span>
                      <span>Test 10</span>
                    </div>
                  </div>
                )
              }
            ].map((feature, idx) => (
              <Reveal key={idx} delay={idx * 150}>
                <div className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-blue-600 transition-all">
                      {feature.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{feature.tag}</span>
                  </div>

                  {feature.visual}

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">{feature.desc}</p>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                        <Check className="w-3 h-3 text-green-500" />
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

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                Students trust eipi
              </h2>
              <p className="text-gray-400 text-sm">What our users say</p>
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
                <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-green-600 font-medium">{t.detail}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="text-gray-400 text-sm">Start for free, upgrade when ready</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Reveal delay={0}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 hover:shadow-sm transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Free</h3>
                    <p className="text-xs text-gray-400">$0 / forever</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Full question bank (1,150+ questions)',
                    'Timed exam simulations',
                    'Score & topic breakdown',
                    'Partial mistake review (first 5)',
                    'Session history'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onLoginClick('student')}
                  className="w-full py-3 border border-gray-300 rounded-xl text-gray-900 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Get started free
                </button>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="bg-gray-900 border border-gray-900 rounded-2xl p-8 relative overflow-hidden h-full flex flex-col">
                <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white text-[10px] font-semibold rounded-bl-xl">
                  BEST VALUE
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Premium</h3>
                    <p className="text-xs text-gray-400">$29.99 AUD / one-time</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Everything in Free',
                    'Unlimited mistake review & explanations',
                    'Full solution walkthroughs',
                    'Performance trends over time',
                    'Priority question bank updates'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onPremiumClick}
                  className="w-full py-3 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
                >
                  Unlock Premium
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                How it works
              </h2>
              <p className="text-gray-400 text-base">
                Three steps to exam-ready.
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
                  <div className="text-6xl font-bold text-gray-100 font-mono absolute -top-2 -left-1 select-none group-hover:text-gray-200 transition-colors">{item.step}</div>
                  <div className="relative pt-12 pl-1">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 mb-4 shadow-sm group-hover:border-blue-200 transition-colors">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <CodeBlock className="mb-10 text-left max-w-md mx-auto" title="your-future.ts">
              <div className="space-y-1.5 text-[13px]">
                <div className="text-gray-400">{'// your-future.ts'}</div>
                <div>
                  <span className="text-purple-600">if </span>
                  <span className="text-gray-800">(</span>
                  <span className="text-teal-600">ready</span>
                  <span className="text-gray-800">) {'{'}</span>
                </div>
                <div className="pl-4">
                  <span className="text-gray-800">eipi</span>
                  <span className="text-gray-500">.</span>
                  <span className="text-blue-600">beginPreparation</span>
                  <span className="text-gray-800">()</span>
                  <span className="text-gray-500">;</span>
                </div>
                <div>
                  <span className="text-gray-800">{'}'}</span>
                </div>
              </div>
            </CodeBlock>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              Ready to start?
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Free access to the full question bank. No payment required.
            </p>
            <button
              onClick={() => onLoginClick('student')}
              className="group px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium text-lg transition-all shadow-sm flex items-center justify-center gap-3 mx-auto"
            >
              <Mail className="w-5 h-5" />
              Get started free
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gray-900 text-white rounded-md flex items-center justify-center font-serif italic font-bold text-sm">
                   e<sup className="text-[8px] not-italic -mt-1">iπ</sup>
                </div>
                <span className="font-semibold text-gray-700 text-sm">eipi</span>
              </div>
              <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
                Selective school exam preparation for Australian students. Built with care.
              </p>
            </div>

            <div className="flex gap-16">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Platform</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="text-gray-400 hover:text-blue-600 transition-colors">Features</a></li>
                  <li><a href="#pricing" className="text-gray-400 hover:text-blue-600 transition-colors">Pricing</a></li>
                  <li><a href="#stats" className="text-gray-400 hover:text-blue-600 transition-colors">Question Bank</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/privacy" className="text-gray-400 hover:text-blue-600 transition-colors">Privacy</a></li>
                  <li><a href="/terms" className="text-gray-400 hover:text-blue-600 transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-gray-400 text-xs">
              © 2026 eipi education. All rights reserved.
            </div>
            <button onClick={() => onLoginClick('teacher')} className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-blue-600 transition-colors">
              <Lock className="w-3 h-3" /> Staff access
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
