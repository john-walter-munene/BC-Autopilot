import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Terminal, 
  Cpu, 
  Sparkles, 
  ArrowRight, 
  Play, 
  RotateCcw,
  BookOpen,
  Code2,
  PlaySquare,
  Layers,
  FileText
} from 'lucide-react';
import { AgentLogEntry, AgentPhase, AutonomousAgentPlan, FunctionalRequirementDoc } from '@bc-agent/shared';

interface AutonomousWorkflowViewProps {
  plan: AutonomousAgentPlan;
  agentPhase: AgentPhase;
  logs: AgentLogEntry[];
  currentFrd: FunctionalRequirementDoc;
  onRunAutonomous: () => void;
  onResetPlan: () => void;
  onJumpToTab: (tab: string) => void;
}

export const AutonomousWorkflowView: React.FC<AutonomousWorkflowViewProps> = ({
  plan,
  agentPhase,
  logs,
  currentFrd,
  onRunAutonomous,
  onResetPlan,
  onJumpToTab
}) => {
  const isExecuting = agentPhase !== 'idle' && agentPhase !== 'completed' && agentPhase !== 'error';

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />;
      case 'in_progress':
        return <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />;
    }
  };

  const getPhaseNavTab = (phase: AgentPhase): string => {
    switch (phase) {
      case 'exploring_docs': return 'docs';
      case 'parsing_frd': return 'frd';
      case 'synthesizing_al':
      case 'validating_al': return 'al_code';
      case 'generating_playwright':
      case 'executing_browser': return 'playwright';
      case 'crafting_endpoints': return 'nextjs';
      default: return 'orchestrator';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Agent Dashboard Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/50">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Autonomous AL & TypeScript Engine
              </span>
              <span className="text-xs text-slate-400">BC 2024 Wave 2 Compatible</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Autonomous D365 Business Central Engineering Loop
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Target FRD: <strong className="text-white font-semibold">{currentFrd.title}</strong> ({currentFrd.module}).
              The agent explores official documentation, engineers AL language code extensions, synthesizes automated Playwright browser test scripts, and compiles client-ready React / Next.js API bridges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRunAutonomous}
              disabled={isExecuting}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg transition ${
                isExecuting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-95'
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Agent Working...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Full Autonomous Cycle</span>
                </>
              )}
            </button>

            <button
              onClick={onResetPlan}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition"
              title="Reset plan state"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 pt-6 border-t border-indigo-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Autonomous Execution Progress</span>
            <span className="font-mono text-blue-300">
              {Math.round((plan.steps.filter(s => s.status === 'completed').length / plan.steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500"
              style={{
                width: `${(plan.steps.filter(s => s.status === 'completed').length / plan.steps.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Plan Steps Timeline & Live Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: 6-Stage Autonomous Plan Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" /> Autonomous Execution Pipeline
              </h2>
              <span className="text-xs text-slate-500">6 Pipeline Stages</span>
            </div>

            <div className="space-y-3">
              {plan.steps.map((step, idx) => {
                const isCurrent = step.status === 'in_progress';
                const isDone = step.status === 'completed';
                const tabTarget = getPhaseNavTab(step.phase);

                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCurrent
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20'
                        : isDone
                        ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5">{getStepIcon(step.status)}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-slate-400">0{idx + 1}.</span>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {step.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                          {step.description}
                        </p>
                        {step.summary && (
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ {step.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onJumpToTab(tabTarget)}
                      className="self-end sm:self-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Agent Thoughts & Execution Logs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-md flex flex-col h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                  Agent Telemetry & Thought Stream
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-mono">Live</span>
              </div>
            </div>

            {/* Scrollable Log Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <div className="text-center py-16 text-slate-600 space-y-2">
                  <Cpu className="w-8 h-8 mx-auto opacity-40" />
                  <p>Agent idle. Click "Execute Full Autonomous Cycle" to begin.</p>
                </div>
              ) : (
                logs.map((log) => {
                  let badgeColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
                  if (log.level === 'thought') badgeColor = 'text-purple-400 bg-purple-950/60 border-purple-800';
                  if (log.level === 'success') badgeColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
                  if (log.level === 'warning') badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-800';
                  if (log.level === 'error') badgeColor = 'text-rose-400 bg-rose-950/60 border-rose-800';

                  return (
                    <div key={log.id} className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border uppercase font-bold text-[9px] ${badgeColor}`}>
                          {log.level}
                        </span>
                        <span className="text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="font-semibold text-slate-200 text-xs">{log.title}</p>
                      {log.details && (
                        <p className="text-slate-400 text-[11px] whitespace-pre-wrap leading-relaxed">
                          {log.details}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
