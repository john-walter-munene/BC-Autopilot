import React, { useState } from 'react';
import { 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  BookOpen, 
  Code, 
  CheckCircle, 
  AlertOctagon, 
  Sparkles,
  Send
} from 'lucide-react';
import { BC_DOCS_KNOWLEDGE_BASE } from '../data/bcDocsKnowledgeBase';
import { BcDocTopic } from '../types/agent';

export const BcDocsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<BcDocTopic>(BC_DOCS_KNOWLEDGE_BASE[0]);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // AI Doc Query
  const [aiDocQuery, setAiDocQuery] = useState('');
  const [aiDocResponse, setAiDocResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const filteredTopics = BC_DOCS_KNOWLEDGE_BASE.filter(topic => {
    const matchesSearch = 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleAskDocsAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDocQuery.trim() || isLoadingAi) return;

    setIsLoadingAi(true);
    setAiDocResponse(null);

    try {
      const res = await fetch('/api/agent/explore-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiDocQuery }),
      });
      const data = await res.json();
      setAiDocResponse(data.text || data.reply || 'No response generated.');
    } catch (err: any) {
      setAiDocResponse(`Error exploring documentation: ${err.message}`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & AI Knowledge Query */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Microsoft Dynamics 365 Business Central Documentation Brain
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Curated official Microsoft Learn guidelines for modern AL development, Cloud runtime, OData API Pages, and Playwright automation.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search AL keywords, triggers, API rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* AI Knowledge Assistant Input */}
        <form onSubmit={handleAskDocsAi} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input
              type="text"
              placeholder="Ask the Agent to search & synthesize any BC doc: e.g. 'How do I handle OnBeforePostSalesDoc in AL?'"
              value={aiDocQuery}
              onChange={(e) => setAiDocQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-indigo-50/50 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-900/50 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingAi || !aiDocQuery.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
          >
            {isLoadingAi ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Synthesize</span>
          </button>
        </form>

        {aiDocResponse && (
          <div className="p-4 rounded-lg bg-indigo-950 text-indigo-100 border border-indigo-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Agent Knowledge Synthesis:
            </div>
            {aiDocResponse}
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'al_language', label: 'AL Language Syntax' },
            { id: 'api_pages', label: 'API Pages & OData' },
            { id: 'event_subscribers', label: 'Event Subscribers' },
            { id: 'playwright_automation', label: 'Playwright Web Client' },
            { id: 'bc_architecture', label: 'Cloud Architecture & app.json' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Topic Master List & Detail Article */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Topic Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          {filteredTopics.map(topic => {
            const isSelected = selectedTopic.id === topic.id;
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span className="uppercase text-[10px] font-bold text-blue-600 dark:text-blue-400">{topic.category.replace('_', ' ')}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {topic.summary}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Topic Article */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Topic Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {selectedTopic.category.replace('_', ' ')}
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedTopic.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {selectedTopic.summary}
                </p>
              </div>

              <a
                href={selectedTopic.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <span>Microsoft Learn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Syntax Snippets */}
            {selectedTopic.alSyntaxSnippets.map((snippet, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-blue-600" /> {snippet.label}
                  </span>
                  <button
                    onClick={() => handleCopy(snippet.code, snippet.label)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    {copiedSnippet === snippet.label ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800">
                  <pre>{snippet.code}</pre>
                </div>
              </div>
            ))}

            {/* Best Practices & Pitfalls Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Best Practices
                </h4>
                <ul className="space-y-2">
                  {selectedTopic.bestPractices.map((bp, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" /> Common Pitfalls To Avoid
                </h4>
                <ul className="space-y-2">
                  {selectedTopic.commonPitfalls.map((cp, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{cp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
