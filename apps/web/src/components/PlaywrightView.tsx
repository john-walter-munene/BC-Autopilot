import React, { useState } from 'react';
import { 
  PlaySquare, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Laptop,
  Search,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { PlaywrightSuite } from '@bc-agent/shared';

interface PlaywrightViewProps {
  suite: PlaywrightSuite;
  onRunTest: () => void;
  isRunning: boolean;
}

export const PlaywrightView: React.FC<PlaywrightViewProps> = ({
  suite,
  onRunTest,
  isRunning
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(suite.steps.length > 0 ? 0 : 0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewMode, setViewMode] = useState<'simulation' | 'code'>('simulation');

  const currentStep = suite.steps[activeStepIndex] || suite.steps[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(suite.testCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Playwright Suite Control Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Playwright Browser Automation for BC Web Client
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-medium">
              @playwright/test
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Autonomous browser agent validates In-Client Designer customizations, Page Inspector (Ctrl+Alt+F1), and AL extension DOM elements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'simulation'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Browser Viewport
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'code'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Playwright Spec
            </button>
          </div>

          <button
            onClick={onRunTest}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition ${
              isRunning
                ? 'bg-indigo-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Running Playwright...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Playwright Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main View: Browser Simulation vs Code View */}
      {viewMode === 'code' ? (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden space-y-2">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>{suite.filename}</span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Test'}</span>
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre>{suite.testCode}</pre>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Simulated Business Central Web Client Viewport */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden">
              
              {/* Browser Address Bar */}
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 max-w-lg mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span className="truncate">https://businesscentral.dynamics.com/sandbox/CRONUS%20USA%2C%20Inc./</span>
                  <span className="text-[9px] text-emerald-500 font-bold ml-2">SSL SECURE</span>
                </div>
              </div>

              {/* BC Web Client App Shell */}
              <div className="min-h-[480px] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
                
                {/* Business Central Top Nav Ribbon */}
                <div className="h-11 bg-teal-800 text-white px-4 flex items-center justify-between text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tracking-wide flex items-center gap-1.5">
                      <span className="text-teal-300 font-bold">Dynamics 365</span> Business Central
                    </span>
                    <span className="text-teal-200 text-[11px] bg-teal-900/60 px-2 py-0.5 rounded">
                      CRONUS USA, Inc.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded bg-teal-900/80 border text-[11px] ${activeStepIndex === 2 ? 'border-amber-400 bg-amber-950/40 text-amber-300 ring-2 ring-amber-400 animate-pulse' : 'border-teal-700 text-teal-200'}`}>
                      <Search className="w-3 h-3" />
                      <span>Tell Me (Alt+Q)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeStepIndex >= 4 ? 'bg-amber-500 text-slate-950 font-bold animate-pulse' : 'bg-teal-700 text-teal-100'}`}>
                      {activeStepIndex >= 4 ? '● DESIGNER MODE ACTIVE' : 'Settings'}
                    </span>
                  </div>
                </div>

                {/* Sub-header / Breadcrumbs */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white">
                      Customer Card · 10000 · Adatum Corporation
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      Standard Business Central Customer Entity Extended via ALchemy 365
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono">
                      Page 21
                    </span>
                  </div>
                </div>

                {/* Simulated Customer Card Content & Custom Controls */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
                  
                  {/* Left: General FastTab with AL Extension Fields */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">General FastTab</span>
                        <span className="text-[10px] text-slate-400">Standard Fields</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block">No.</label>
                          <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">10000</div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Name</label>
                          <div className="text-slate-800 dark:text-slate-200">Adatum Corporation</div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Balance ($)</label>
                          <div className="font-mono text-slate-800 dark:text-slate-200">$4,850.00</div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Credit Limit ($)</label>
                          <div className="font-mono text-slate-800 dark:text-slate-200">$10,000.00</div>
                        </div>
                      </div>
                    </div>

                    {/* Spotlighted Custom AL Extension FastTab */}
                    <div className={`p-4 rounded-lg transition-all duration-300 border ${
                      activeStepIndex >= 6
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                            Custom Loyalty & Rewards (AL Extension)
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            TableExt 50100
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold">Playwright Verified ✓</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className={`p-2 rounded ${activeStepIndex === 6 ? 'bg-amber-100 dark:bg-amber-950/80 border border-amber-400 animate-pulse' : 'bg-slate-50 dark:bg-slate-900'}`}>
                          <label className="text-[10px] text-slate-500 block">Loyalty Tier</label>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">VIP Platinum</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 dark:bg-slate-900">
                          <label className="text-[10px] text-slate-500 block">Points Balance</label>
                          <span className="font-mono font-bold text-emerald-600">640 pts</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 dark:bg-slate-900">
                          <label className="text-[10px] text-slate-500 block">Discount %</label>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">15.00%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Simulated Page Inspector Drawer (Ctrl+Alt+F1) */}
                  <div className="md:col-span-4 bg-slate-100 dark:bg-slate-950 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-2">
                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Page Inspector (Ctrl+Alt+F1)</span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1 rounded">Active</span>
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-400 text-[10px]">
                      <div>Table: <strong className="text-slate-800 dark:text-slate-200">18 (Customer)</strong></div>
                      <div>Page: <strong className="text-slate-800 dark:text-slate-200">21 (Customer Card)</strong></div>
                      <div>Extension: <strong className="text-blue-600">ALC Customer Extension</strong></div>
                      <div>Target FastTab: <span className="text-slate-800 dark:text-slate-200">General</span></div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-400">
                        Selector: <code className="text-indigo-500">[aria-label*="Loyalty Tier"]</code>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* Right Column: Step-by-Step Playwright Execution Timeline */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Test Execution Steps ({suite.steps.length})
                </span>
                <span className="text-[11px] font-mono text-slate-400">Total: {suite.totalDurationMs}ms</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {suite.steps.map((step, idx) => {
                  const isCurrent = activeStepIndex === idx;
                  const isPassed = step.status === 'passed';

                  return (
                    <div
                      key={step.stepNumber}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-left space-y-1 ${
                        isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-700 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          {isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Step 0{step.stepNumber}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{step.durationMs}ms</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                        {step.title}
                      </p>

                      {step.consoleTrace && (
                        <div className="p-1.5 rounded bg-slate-950 font-mono text-[10px] text-slate-300 truncate mt-1">
                          {step.consoleTrace}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
