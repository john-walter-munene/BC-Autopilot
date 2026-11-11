import React from 'react';
import { 
  Bot, 
  BookOpen, 
  FileText, 
  Code2, 
  PlaySquare, 
  Layers, 
  Sparkles, 
  Settings, 
  MessageSquare,
  Download,
  Play,
  RotateCw,
  ShieldCheck,
  Brain
} from 'lucide-react';
import { AgentPhase, FunctionalRequirementDoc } from '../types/agent';
import { SAMPLE_FRDS } from '../data/sampleFrds';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  agentPhase: AgentPhase;
  currentFrd: FunctionalRequirementDoc;
  onSelectFrd: (frd: FunctionalRequirementDoc) => void;
  onRunAutonomous: () => void;
  onOpenSettings: () => void;
  onToggleChat: () => void;
  onExportProject: () => void;
  isChatOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  agentPhase,
  currentFrd,
  onSelectFrd,
  onRunAutonomous,
  onOpenSettings,
  onToggleChat,
  onExportProject,
  isChatOpen
}) => {
  const isRunning = agentPhase !== 'idle' && agentPhase !== 'completed' && agentPhase !== 'error';

  const getPhaseBadge = () => {
    switch (agentPhase) {
      case 'idle':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">● Idle Ready</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">✓ Complete</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">✗ Diagnostics Alert</span>;
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            Autonomous: {agentPhase.replace('_', ' ')}
          </span>
        );
    }
  };

  const navItems = [
    { id: 'orchestrator', label: 'Agent Cockpit', icon: Bot },
    { id: 'docs', label: 'BC Docs Brain', icon: BookOpen },
    { id: 'frd', label: 'FRD Studio', icon: FileText },
    { id: 'al_code', label: 'AL Extension Code', icon: Code2 },
    { id: 'playwright', label: 'Playwright Automation', icon: PlaySquare },
    { id: 'nextjs', label: 'React / Next.js Bridge', icon: Layers },
    { id: 'learning', label: 'Continuous Learning & Memory', icon: Brain },
    { id: 'research', label: 'Research Evaluation', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Agent Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
                  ALchemy <span className="text-blue-600 dark:text-blue-400">365</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  BC Agent
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Autonomous Dynamics 365 Business Central Engineer
              </p>
            </div>
          </div>

          {/* Active FRD Selector & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
              <span>Target FRD:</span>
              <select
                value={currentFrd.id}
                onChange={(e) => {
                  const found = SAMPLE_FRDS.find(f => f.id === e.target.value);
                  if (found) onSelectFrd(found);
                }}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none max-w-[200px] truncate"
              >
                {SAMPLE_FRDS.map(frd => (
                  <option key={frd.id} value={frd.id}>
                    {frd.title}
                  </option>
                ))}
              </select>
            </div>

            {getPhaseBadge()}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRunAutonomous}
              disabled={isRunning}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                isRunning
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-95'
              }`}
              title="Runs all 5 stages autonomously: doc check, FRD parsing, AL coding, Playwright verification, Next.js endpoint scaffolding"
            >
              {isRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Executing Agent...' : 'Run Autonomous Pipeline'}</span>
            </button>

            <button
              onClick={onExportProject}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
              title="Download Generated AL Project & Next.js Endpoints"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleChat}
              className={`p-2 rounded-lg text-xs font-medium border transition ${
                isChatOpen
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
              title="Ask ALchemy 365 Copilot"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
              title="Configure BC Tenant & Agent Parameters"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto border-t border-slate-200 dark:border-slate-800 py-1 scrollbar-none">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
