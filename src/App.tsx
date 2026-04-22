import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import Sidebar, { Tab } from './components/Sidebar';
import TimeRecord from './components/TimeRecord';
import ResearchPlan from './components/ResearchPlan';
import FitnessRecord from './components/FitnessRecord';
import PaperProgress from './components/PaperProgress';
import Journal from './components/Journal';
import Achievements from './components/Achievements';
import UserProfile from './components/UserProfile';
import { AppProvider } from './store';
import { Home, User, Menu, X, Wifi } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from './lib/AuthContext';

type MainNavTab = 'research' | 'user';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<Tab>('time');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mainNav, setMainNav] = useState<MainNavTab>('research');
  const [mobileTime, setMobileTime] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  );
  const mainRef = useRef<HTMLElement>(null);
  const { user } = useAuth(); // Import useAuth! Wait I need to import it.

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false); // Close menu on mobile after selection
  };

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentTab, mainNav]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMobileTime(
        new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      );
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base font-sans text-text-main selection:bg-sage/20 relative">
      
      {/* 顶部应用栏 */}
      <div className="md:hidden flex-none bg-sage border-b border-sage shadow-[0_10px_18px_rgba(61,84,94,0.18)] z-30 relative transition-colors duration-300">
        <div className="flex items-center justify-between px-8 pt-[calc(env(safe-area-inset-top)+0.55rem)] text-white">
          <div className="text-[13px] font-bold tracking-[0.02em]">{mobileTime}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-[2px]">
              <span className="h-[5px] w-[3px] rounded-full bg-white/80" />
              <span className="h-[7px] w-[3px] rounded-full bg-white/84" />
              <span className="h-[9px] w-[3px] rounded-full bg-white/88" />
              <span className="h-[11px] w-[3px] rounded-full bg-white/92" />
            </div>
            <Wifi size={15} strokeWidth={2.5} className="text-white" />
            <div className="rounded-[10px] bg-[#32c85a] px-[7px] py-[3px] text-[10px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              99%
            </div>
          </div>
        </div>
        <div className="relative flex items-center justify-center px-4 pb-4 pt-5">
          {mainNav === 'research' && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="absolute left-4 top-1/2 flex h-[50px] w-[50px] -translate-y-1/2 items-center justify-center rounded-[18px] border border-white/30 bg-white/14 text-white shadow-[0_10px_20px_rgba(66,84,94,0.15),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[6px] transition-colors hover:bg-white/20"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
          <h1 className="m-0 flex items-center gap-2 font-serif text-[18px] leading-none font-bold text-white">
            科研Daily
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {mainNav === 'research' ? (
          <>
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-sm transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}

            {/* Sidebar Container */}
            <div className={cn(
              "absolute inset-y-0 left-0 z-50 transform md:transform-none md:relative transition-transform duration-300 shadow-2xl md:shadow-none h-full",
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
              <Sidebar currentTab={currentTab} setCurrentTab={handleTabChange} inMobile={true} />
            </div>
            
            {/* Main Content Area */}
            <main ref={mainRef} className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 relative">
              {/* Desktop Top Right User Entry */}
              <div className="hidden md:block absolute top-3 right-10 z-20">
                <button 
                  onClick={() => setMainNav('user')}
                  className="flex items-center gap-2 bg-card border border-line rounded-full pl-2 pr-4 py-1.5 shadow-sm hover:shadow-theme transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-sage/10 text-sage flex items-center justify-center overflow-hidden">
                    {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User size={16} />}
                  </div>
                  <span className="text-[14px] font-bold text-text-main group-hover:text-sage transition-colors">
                    {user?.displayName?.split(' ')[0] || '用户'}
                  </span>
                </button>
              </div>

              <div className="max-w-6xl mx-auto px-4 pt-2 pb-4 sm:p-6 md:p-10 md:pt-16 space-y-6">
                {currentTab === 'time' && <TimeRecord />}
                {currentTab === 'plan' && <ResearchPlan />}
                {currentTab === 'fitness' && <FitnessRecord />}
                {currentTab === 'papers' && <PaperProgress />}
                {currentTab === 'journal' && <Journal />}
                {currentTab === 'achievements' && <Achievements />}
                {currentTab === 'settings' && <UserProfile startWithSettings={true} onBackToMain={() => setCurrentTab('time')} />}
              </div>
            </main>
          </>
        ) : (
          <main ref={mainRef} className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 bg-base relative">
            {/* Desktop Back Button */}
            <div className="hidden md:block absolute top-6 left-10 z-20">
              <button 
                onClick={() => setMainNav('research')}
                className="flex items-center gap-2 text-sage bg-card border border-line rounded-[12px] px-4 py-2 shadow-sm hover:shadow-theme transition-all font-bold"
              >
                ← 返回科研空间
              </button>
            </div>
            <div className="md:pt-16">
              <UserProfile startWithSettings={false} />
            </div>
          </main>
        )}
      </div>

      {/* 小程序专属底部导航栏 */}
      <div className="md:hidden flex-none fixed bottom-0 left-0 right-0 h-[78px] bg-card/90 backdrop-blur-md border-t border-line flex justify-around px-2 z-40 pb-safe shadow-lg">
         <button 
           onClick={() => setMainNav('research')}
           className={cn("flex-1 flex flex-col items-center justify-start pt-3 transition-colors", mainNav === 'research' ? 'text-sage font-bold' : 'text-text-muted hover:text-sage')}
         >
           <Home size={22} className="mb-1" strokeWidth={mainNav === 'research' ? 2.5 : 2} />
           <span className="text-[11px] uppercase tracking-wider">记录</span>
         </button>
         <button 
           onClick={() => setMainNav('user')}
           className={cn("flex-1 flex flex-col items-center justify-start pt-3 transition-colors", mainNav === 'user' ? 'text-sage font-bold' : 'text-text-muted hover:text-sage')}
         >
           <User size={22} className="mb-1" strokeWidth={mainNav === 'user' ? 2.5 : 2} />
           <span className="text-[11px] uppercase tracking-wider">用户</span>
         </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
