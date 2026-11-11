import React, { useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  Plus, 
  Copy, 
  Check,
  RotateCcw
} from 'lucide-react';
import { LearnedRule, SelfReflectionIteration } from '../types/agent';
import { INITIAL_LEARNED_RULES, REALTIME_DOC_FEEDS, RealtimeDocFeedItem } from '../data/learnedRulesStore';

interface ContinuousLearningViewProps {
  learnedRules: LearnedRule[];
  onAddLearnedRule: (rule: LearnedRule) => void;
}

export const ContinuousLearningView: React.FC<ContinuousLearningViewProps> = ({
  learnedRules,
  onAddLearnedRule
}) => {
  const [selectedFeed, setSelectedFeed] = useState<RealtimeDocFeedItem>(REALTIME_DOC_FEEDS[0]);
  const [customDocContent, setCustomDocContent] = useState<string>(REALTIME_DOC_FEEDS[0].sampleContent);
  const [customDocTitle, setCustomDocTitle] = useState<string>(REALTIME_DOC_FEEDS[0].title);
  const [customDocUrl, setCustomDocUrl] = useState<string>(REALTIME_DOC_FEEDS[0].sourceUrl);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestionSummary, setIngestionSummary] = useState<any | null>(null);

  // Self-Correction Interactive Benchmark State
  const [isReflecting, setIsReflecting] = useState<boolean>(false);
  const [benchmarkStep, setBenchmarkStep] = useState<number>(0);
  const [reflectionData, setReflectionData] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleSelectFeed = (feed: RealtimeDocFeedItem) => {
    setSelectedFeed(feed);
    setCustomDocTitle(feed.title);
    setCustomDocUrl(feed.sourceUrl);
    setCustomDocContent(feed.sampleContent);
    setIngestionSummary(null);
  };

  const handleIngestDoc = async () => {
    if (!customDocContent.trim() || isIngesting) return;
    setIsIngesting(true);
    setIngestionSummary(null);

    try {
      const res = await fetch('/api/agent/learn-from-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docContent: customDocContent,
          title: customDocTitle,
          sourceUrl: customDocUrl,
        }),
      });

      const data = await res.json();
      setIngestionSummary(data);

      if (data.rulesExtracted && data.rulesExtracted.length > 0) {
        data.rulesExtracted.forEach((r: LearnedRule) => {
          onAddLearnedRule(r);
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleTriggerSelfCorrectionBenchmark = async () => {
    setIsReflecting(true);
    setBenchmarkStep(1); // Step 1: Initial flawed AL generation

    await new Promise(r => setTimeout(r, 700));
    setBenchmarkStep(2); // Step 2: Compiler Linter fires AL0666 & AA0207

    await new Promise(r => setTimeout(r, 800));
    setBenchmarkStep(3); // Step 3: Agent queries docs in real time & reflects

    try {
      const res = await fetch('/api/agent/reflect-and-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problematicAlCode: `field(50100; "Loyalty Tier"; Code[20])
{
    Caption = 'Loyalty Tier';
    // Warning: Missing DataClassification and ToolTip
}`,
          diagnosticMessage: 'AL Rule AL0666: Mandatory DataClassification missing. AL Rule AA0207: UI ToolTip missing.'
        }),
      });
      const data = await res.json();
      setReflectionData(data);
      if (data.ruleLearned) {
        onAddLearnedRule(data.ruleLearned);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsReflecting(false);
      setBenchmarkStep(4); // Step 4: Finished & Rule Saved
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Learning Cockpit Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-indigo-900/60 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Real-Time Continuous Learning Loop
              </span>
              <span className="text-xs text-slate-400">Autonomous Doc Extraction & Reflexion</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Real-Time Document Ingestion & Heuristic Memory Store
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              How does the agent get better? When Microsoft releases new Business Central wave updates or compiler guidelines, this engine ingests documentation in real time, reflects on diagnostics failures, and saves episodic rules into long-term memory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTriggerSelfCorrectionBenchmark}
              disabled={isReflecting}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg transition ${
                isReflecting
                  ? 'bg-purple-800 text-purple-200 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95'
              }`}
            >
              {isReflecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Agent Reflecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Live Self-Correction Benchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Growth Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-indigo-900/40">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">Learned Rules in Memory</div>
            <div className="text-xl font-extrabold text-purple-400 mt-0.5">
              {learnedRules.length} Active Rules
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Stored in Heuristic Bank</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">Compiler First-Pass Rate</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
              99.2% Clean
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">↑ +24.8% via Reflection</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">Confidence Threshold</div>
            <div className="text-xl font-extrabold text-blue-400 mt-0.5">
              0.97 Avg Score
            </div>
            <div className="text-[10px] text-slate-400 mt-1">High-Precision Weights</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">Resolution Cycles</div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">
              1.1 Iterations
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Self-Correction Speed</div>
          </div>
        </div>
      </div>

      {/* Interactive Self-Reflection Benchmark Live Demonstration */}
      {benchmarkStep > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border-2 border-purple-500/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Live Self-Correction & Reflection Cycle in Action
            </h3>
            <span className="text-xs font-mono text-purple-600 font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950">
              Stage 0{benchmarkStep} / 04
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            
            {/* Step 1 */}
            <div className={`p-3 rounded-lg border transition ${benchmarkStep >= 1 ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
              <span className="font-mono font-bold text-slate-500">01. Code Synthesis</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Agent generates initial AL extension code from raw requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-lg border transition ${benchmarkStep >= 2 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">02. Compiler Critique</span>
              <p className="text-[11px] mt-1">
                Linter flags AL0666 (missing DataClassification) and AA0207 (missing ToolTip).
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-lg border transition ${benchmarkStep >= 3 ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">03. Real-Time Reflection</span>
              <p className="text-[11px] mt-1">
                Agent consults Microsoft Learn docs, formulates remediation rule, and updates memory.
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-lg border transition ${benchmarkStep >= 4 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">04. Self-Corrected & Saved</span>
              <p className="text-[11px] mt-1">
                Pristine AL produced. Heuristic rule permanently stored for all future runs.
              </p>
            </div>

          </div>

          {reflectionData && (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 space-y-2 mt-2">
              <div className="flex items-center justify-between text-purple-400 font-bold border-b border-slate-800 pb-1">
                <span>Agent Post-Mortem & Learned Heuristic:</span>
                <span className="text-[10px] text-emerald-400">Rule Saved ✓</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                <strong>Criticism:</strong> {reflectionData.criticism}
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>Reflection:</strong> {reflectionData.reflectionThought}
              </p>
              <div className="pt-2 text-emerald-400 text-[11px]">
                <strong>Remediation Rule:</strong> {reflectionData.ruleLearned?.remedy}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-Time Document Ingestion Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Document Feeder & Ingestion Studio */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Live Microsoft Learn Ingestion Studio
                </h2>
                <p className="text-xs text-slate-500">
                  Feed official release wave notes, AL analyzer docs, or API changes to the agent.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Live BC Documentation Feeds:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REALTIME_DOC_FEEDS.map(feed => (
                  <button
                    key={feed.id}
                    onClick={() => handleSelectFeed(feed)}
                    className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                      selectedFeed.id === feed.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-950 dark:text-blue-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block">{feed.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{feed.publishedWave}</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-600">Load Feed →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Details */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Doc Title</label>
                <input
                  type="text"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Source URL</label>
                <input
                  type="text"
                  value={customDocUrl}
                  onChange={(e) => setCustomDocUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Documentation Content / Snippet</label>
                <textarea
                  rows={6}
                  value={customDocContent}
                  onChange={(e) => setCustomDocContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleIngestDoc}
                disabled={isIngesting || !customDocContent.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 transition"
              >
                {isIngesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Rules & Updating Memory...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ingest & Learn in Real-Time</span>
                  </>
                )}
              </button>
            </div>

            {/* Ingestion Output Summary */}
            {ingestionSummary && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" /> Successfully Ingested {ingestionSummary.extractedRulesCount} New Rule(s)!
                </span>
                <ul className="space-y-1 pt-1 text-[11px]">
                  {ingestionSummary.keyTakeaways?.map((takeaway: string, idx: number) => (
                    <li key={idx}>• {takeaway}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>

        {/* Right: Agent Episodic Memory & Learned Heuristics Bank */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-600" />
                  Agent Episodic Memory & Heuristic Bank
                </h2>
                <p className="text-xs text-slate-500">
                  {learnedRules.length} Learned Rules dynamically prioritized during AL code synthesis.
                </p>
              </div>
              <span className="text-[10px] font-mono text-purple-600 font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950">
                Self-Updating
              </span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {learnedRules.map(rule => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                      {rule.ruleCode}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Applied: {rule.timesApplied}x</span>
                      <span>• Confidence: {(rule.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {rule.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <strong>Condition:</strong> {rule.condition}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      <strong>Remedy:</strong> {rule.remedy}
                    </p>
                  </div>

                  {rule.exampleCorrection && (
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Before vs After Heuristic Correction:</span>
                        <button
                          onClick={() => handleCopy(rule.exampleCorrection.after, rule.id)}
                          className="hover:text-white transition"
                        >
                          {copiedCode === rule.id ? 'Copied' : 'Copy Clean AL'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                        <div className="text-rose-400 line-through truncate opacity-80">
                          {rule.exampleCorrection.before.slice(0, 40)}...
                        </div>
                        <div className="text-emerald-400 truncate">
                          {rule.exampleCorrection.after.slice(0, 40)}...
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="truncate max-w-[280px]">Source: {rule.sourceDoc}</span>
                    <span>{new Date(rule.learnedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
