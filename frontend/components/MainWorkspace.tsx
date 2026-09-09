import React from 'react';
import { Settings as SettingsIcon, ChevronDown, Sparkles, Search, Bell, PhoneCall } from 'lucide-react';
import VedInsights from './ved/VedInsights';
import VedDocuments from './ved/VedDocuments';
import VedOperations from './ved/VedOperations';
import TabOverview from './TabOverview';
import TabCalls from './TabCalls';
import TabAgents from './TabAgents';
import TabContacts from './TabContacts';
import TabCampaigns from './TabCampaigns';
import TabAnalytics from './TabAnalytics';
import TabAutomations from './TabAutomations';
import TabIntegrations from './TabIntegrations';
import TabWorkspace from './TabWorkspace';
import TabSettings from './TabSettings';
import TabAdminUsers from './TabAdminUsers';
import TabAdminGeneral from './TabAdminGeneral';

interface MainWorkspaceProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeEntity: string;
  transcripts: any[];
  callStatus: string;
  callSid: string | null;
  onCall: (number: string) => void;
  onHangup: () => void;
  onMute: (muted: boolean) => void;
  analyticsData: any[];
  onImpersonate?: (user: any) => void;
  entities: any[];
  user: any;
  liveCalls: any[];
}

const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  activeTab,
  setActiveTab,
  activeEntity,
  transcripts,
  callStatus,
  callSid,
  onCall,
  onHangup,
  onMute,
  analyticsData,
  onImpersonate,
  entities,
  user,
  liveCalls
}) => {
  const adminTabs = ['System Users', 'Global Entities', 'Global Calls', 'Global Analytics', 'Global Leads'];
  const isAdminTab = adminTabs.includes(activeTab);

  // Parse parent active page and inner subpage from Active Tab
  const parts = activeTab.split(' - ');
  const mainPage = parts[0];
  const subpage = parts[1] || '';

  // Derive user display info from real user data
  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const userName = user?.name || 'User';
  const userRole = user?.role || 'user';

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#070708] font-sans text-white">
      {/* Top Header - Hide on Admin Global Tabs */}
      {!isAdminTab && (
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#070708] shrink-0">
          <div className="flex items-center gap-6 flex-1">
            {/* Search anything input */}
            <div className="relative w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-9 pr-4 py-2 bg-[#0c0c0e] border border-white/5 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* AI System Online Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider leading-none">AI System Online</span>
            </div>

            {/* Notification Bell */}
            <div className="relative p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/5">
              <Bell className="w-4 h-4 text-neutral-400" />
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[7.5px] font-black text-white font-mono border border-[#070708]">3</span>
            </div>

            {/* User Profile Avatar block */}
            <div className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 p-1.5 rounded-xl transition-all">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-bold text-neutral-300 text-[10px] border border-white/5 font-display">
                {userInitials}
              </div>
              <div className="text-left leading-none">
                <p className="text-xs font-bold text-white">{userName}</p>
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{userRole}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </div>

            {/* Launch Call Button */}
            <button
              onClick={() => setActiveTab('Operations')}
              className="px-4 py-2 bg-white hover:bg-neutral-100 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm font-display cursor-pointer"
            >
              <span>Operations Desk</span>
              <span className="text-xs">↗</span>
            </button>
          </div>
        </header>
      )}

      {/* Tab Bar - SaaS Style (Only for Global System Admin Panels) */}
      {isAdminTab && (
        <div className="px-8 border-b border-white/10 shrink-0 bg-black">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide">
            {adminTabs.map((tab) => (
              <button
                key={tab}
                className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative shrink-0 cursor-pointer
                  ${activeTab === tab ? 'text-white font-extrabold font-display' : 'text-neutral-500 hover:text-white'}
                `}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Active Views */}
      <div className="flex-1 overflow-y-auto relative bg-[#070708]">
        {/* Core VED Modules */}
        {(mainPage === 'Insights' || mainPage === 'Dashboard' || mainPage === 'Overview') && (
          <VedInsights
            onQuickCall={() => setActiveTab('Operations')}
          />
        )}
        {mainPage === 'Documents' && (
          <VedDocuments />
        )}
        {(mainPage === 'Operations' || mainPage === 'Calls') && (
          <VedOperations
            transcripts={transcripts}
            callStatus={callStatus}
            callSid={callSid}
            onCall={onCall}
            onHangup={onHangup}
            onMute={onMute}
          />
        )}
        {mainPage === 'AI Agents' && (
          <TabAgents
            activeSubpage={subpage}
          />
        )}
        {mainPage === 'Contacts' && <TabContacts />}
        {mainPage === 'Campaigns' && <TabCampaigns />}
        {mainPage === 'Analytics' && (
          <TabAnalytics
            analyticsData={analyticsData}
            activeSubpage={subpage}
          />
        )}
        {mainPage === 'Automations' && <TabAutomations />}
        {mainPage === 'Integrations' && (
          <TabIntegrations
            activeEntity={activeEntity}
            entities={entities}
          />
        )}
        {mainPage === 'Workspace' && <TabWorkspace />}
        {mainPage === 'Settings' && (
          <TabSettings
            activeSubpage={subpage}
          />
        )}

        {/* Global System Admin Panels */}
        {activeTab === 'System Users' && <TabAdminUsers onImpersonate={onImpersonate || (() => {})} />}
        {activeTab === 'Global Entities' && <TabAdminGeneral type="entities" title="Global Entity Explorer" />}
        {activeTab === 'Global Calls' && <TabAdminGeneral type="calls" title="Global Call Logs" />}
        {activeTab === 'Global Analytics' && <TabAnalytics analyticsData={analyticsData} isGlobal />}
        {activeTab === 'Global Leads' && <TabAdminGeneral type="leads" title="Platform Leads" />}
      </div>
    </div>
  );
};

export default MainWorkspace;
