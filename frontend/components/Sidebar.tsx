import React from 'react';
import { 
  BarChart3, 
  Settings2, 
  BookOpen,
  LayoutDashboard, 
  PhoneCall, 
  Users2, 
  Plus,
  Binary,
  Activity,
  LogOut,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Settings,
  TrendingUp,
  Building2
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  entities: any[];
  activeEntity: string;
  setActiveEntity: (entity: string) => void;
  onNewEntity: () => void;
  user?: {
    name: string;
    email: string;
    accountType: string;
    role: string;
  } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  entities, 
  activeEntity, 
  setActiveEntity,
  onNewEntity,
  user
}) => {
  
  const menuConfig = [
    { 
      name: 'Insights', 
      icon: BarChart3, 
      desc: 'What is happening?'
    },
    { 
      name: 'Documents', 
      icon: BookOpen, 
      desc: 'What does VED know?'
    },
    { 
      name: 'Operations', 
      icon: Settings2, 
      desc: 'How is VED running?'
    }
  ];

  const handleParentClick = (item: any) => {
    setActiveTab(item.name);
  };

  const isItemActive = (item: any) => {
    if (activeTab === item.name) return true;
    if (activeTab === 'Overview' && item.name === 'Insights') return true;
    if (activeTab === 'Dashboard' && item.name === 'Insights') return true;
    if (activeTab === 'Calls' && item.name === 'Operations') return true;
    return false;
  };

  return (
    <aside className="w-60 border-r border-white/5 h-screen flex flex-col bg-[#070708] shrink-0 font-sans text-white">
      
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center justify-between shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('Insights')}>
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-black text-emerald-400 font-mono">
            V
          </div>
          <span className="font-extrabold text-[15px] tracking-tight text-white font-display">VED</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Voice AI</span>
        </div>
      </div>

      {/* Main Nav Items (Scrollable when overflow) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 scrollbar-hide">
        <nav className="space-y-1.5">
          {menuConfig.map((item) => {
            const active = isItemActive(item);
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => handleParentClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                    active 
                      ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' 
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4.5 h-4.5 ${active ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    <div className="text-left leading-none">
                      <span className="text-xs font-bold tracking-tight block">{item.name}</span>
                      <span className="text-[9px] text-neutral-500 font-medium mt-1 block">{item.desc}</span>
                    </div>
                  </div>
                  {active && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
                </button>
              </div>
            );
          })}
        </nav>

        {/* AI System Status Widget placed inside the scroll area pushed to bottom */}
        <div className="p-4 border border-white/5 rounded-2xl bg-[#0c0c0e]/80 space-y-2.5 mt-8">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest leading-none">AI System Status</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider leading-none">All systems operational</span>
            </div>
          </div>
          <div className="h-6 w-full pt-1">
            <svg viewBox="0 0 100 20" className="w-full h-full text-emerald-500/30" preserveAspectRatio="none">
              <path 
                d="M 0 12 Q 15 5, 30 14 T 60 8 T 90 15 L 100 10" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="1.2" 
              />
            </svg>
          </div>
        </div>

      </div>

    </aside>
  );
};

export default Sidebar;
