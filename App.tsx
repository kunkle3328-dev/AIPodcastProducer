
import React, { useState, useEffect, useCallback } from 'react';
import type { User, Episode, Subscription, PlanType } from './types';
import { api } from './services/mockApi';
import { GenerateForm } from './components/GenerateForm';
import { Dashboard } from './components/Dashboard';
import { Billing } from './components/Billing';
import { Settings } from './components/Settings';
import { SplashScreen } from './components/SplashScreen';
import { LayoutDashboard, Clapperboard, CreditCard, Settings as SettingsIcon, LogOut, Menu, X } from 'lucide-react';


type NavItem = 'dashboard' | 'generate' | 'billing' | 'settings';

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 w-full text-left group ${
            isActive ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
    >
        <span className={`transform transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className="font-medium">{label}</span>
    </button>
);

const SidebarContent: React.FC<{
    user: User | null;
    activeNav: NavItem;
    onNavLinkClick: (nav: NavItem) => void;
}> = ({ user, activeNav, onNavLinkClick}) => (
     <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-2 mb-8 mt-2">
            <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-md opacity-40 rounded-full"></div>
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-cyan-400 fill-current relative z-10">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v8h-2v-8zm0-4h2v2h-2v-2z"/>
                </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">AI STUDIO</h1>
        </div>
        <nav className="space-y-2">
            <NavLink icon={<LayoutDashboard size={20} />} label="Dashboard" isActive={activeNav === 'dashboard'} onClick={() => onNavLinkClick('dashboard')} />
            <NavLink icon={<Clapperboard size={20} />} label="Generate" isActive={activeNav === 'generate'} onClick={() => onNavLinkClick('generate')} />
            <NavLink icon={<CreditCard size={20} />} label="Billing" isActive={activeNav === 'billing'} onClick={() => onNavLinkClick('billing')} />
            <NavLink icon={<SettingsIcon size={20} />} label="Settings" isActive={activeNav === 'settings'} onClick={() => onNavLinkClick('settings')} />
        </nav>
        <div className="mt-auto">
             {user && (
                 <div className="text-sm text-gray-400 p-4 border-t border-white/10 bg-white/5 rounded-xl mx-2 mb-2">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-xs opacity-70">{user.email}</p>
                 </div>
             )}
            <NavLink icon={<LogOut size={20} />} label="Logout" isActive={false} onClick={() => alert("Logout functionality not implemented.")} />
        </div>
    </div>
);


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const userEpisodes = await api.getUserEpisodes(currentUser.id);
        setEpisodes(userEpisodes);
        const userSubscription = await api.getSubscription(currentUser.id);
        setSubscription(userSubscription);
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerationComplete = (newEpisode: Episode) => {
    setEpisodes(prev => [newEpisode, ...prev]);
    api.getCurrentUser().then(setUser);
    setActiveNav('dashboard');
    setGenerateTopic(''); // Reset after generation
  };

  const handlePlanChange = async (newPlan: PlanType) => {
      if (user) {
          const updatedSub = await api.updateSubscription(user.id, newPlan);
          setSubscription(updatedSub);
          setUser(prev => prev ? {...prev, plan: newPlan} : null);
      }
  };
  
  const handleNavLinkClick = (nav: NavItem) => {
      setActiveNav(nav);
      setIsSidebarOpen(false);
  }

  const handleUseSpinoff = (topic: string) => {
      setGenerateTopic(topic);
      setActiveNav('generate');
  };

  const renderContent = () => {
    if (isLoading || !user || !subscription) {
      return <div className="flex h-full items-center justify-center text-white/50">Loading studio data...</div>;
    }
    switch (activeNav) {
      case 'dashboard':
        return <Dashboard 
          user={user} 
          episodes={episodes} 
          onCreateEpisode={() => setActiveNav('generate')} 
          onUseSpinoff={handleUseSpinoff}
        />;
      case 'generate':
        return <GenerateForm onGenerationComplete={handleGenerationComplete} initialTopic={generateTopic} />;
      case 'billing':
        return <Billing subscription={subscription} onPlanChange={handlePlanChange} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return null;
    }
  };

  if (showSplash) {
      return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-cyan-500/30">
       <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 rounded-full filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Mobile Sidebar */}
        <div className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
        <aside className={`fixed top-0 left-0 h-full z-40 w-72 bg-gray-900/90 backdrop-blur-2xl p-4 border-r border-white/5 transform transition-transform duration-300 ease-out md:hidden shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <SidebarContent user={user} activeNav={activeNav} onNavLinkClick={handleNavLinkClick}/>
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-72 bg-gray-900/40 backdrop-blur-2xl p-6 border-r border-white/5 flex-shrink-0">
          <SidebarContent user={user} activeNav={activeNav} onNavLinkClick={handleNavLinkClick}/>
        </aside>
        
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
            {/* Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center font-bold text-xs">AI</div>
                    <h1 className="text-lg font-bold">Studio</h1>
                 </div>
                 <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                     <Menu size={24} />
                 </button>
            </header>
            <main className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar scroll-smooth">
                <div className="max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
      </div>
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite;
        }
        .animation-delay-2000 { animation-delay: 5s; }
        .animation-delay-4000 { animation-delay: 10s; }
        
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
