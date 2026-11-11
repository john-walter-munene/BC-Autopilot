import React, { useState } from 'react';
import { 
  Code2, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Folder, 
  Terminal,
  RefreshCw
} from 'lucide-react';
import { AlFile } from '../types/agent';

interface AlStudioViewProps {
  files: AlFile[];
  onUpdateFile: (updated: AlFile) => void;
}

export const AlStudioView: React.FC<AlStudioViewProps> = ({
  files,
  onUpdateFile
}) => {
  const [selectedFilename, setSelectedFilename] = useState<string>(files[0]?.filename || 'app.json');
  const [copied, setCopied] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const activeFile = files.find(f => f.filename === selectedFilename) || files[0];

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAiRefactor = async () => {
    if (!activeFile) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/agent/generate-al-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: activeFile.objectType,
          objectName: activeFile.objectName,
          frd: { name: activeFile.objectName }
        })
      });
      const data = await res.json();
      if (data && data.alCode) {
        onUpdateFile({
          ...activeFile,
          content: data.alCode
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              AL Extension Project Studio (Dynamics 365 BC)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-medium">
              {files.length} Project Objects
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Engineered per Microsoft AL Compiler specifications (target = Cloud, runtime = 13.0, Business Central 2024 wave 2).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied AL' : 'Copy File'}</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={handleAiRefactor}
            disabled={isSynthesizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 transition"
          >
            {isSynthesizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>AI Refactor</span>
          </button>
        </div>
      </div>

      {/* Editor Layout: Sidebar File Tree + Code Editor + Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Project File Tree */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Folder className="w-3.5 h-3.5" /> Project File Tree
            </div>

            <div className="space-y-1">
              {files.map(file => {
                const isSelected = activeFile?.filename === file.filename;
                let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                if (file.objectType === 'TableExtension') badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300';
                if (file.objectType === 'PageExtension') badgeColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300';
                if (file.objectType === 'Page') badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300';
                if (file.objectType === 'Codeunit') badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300';

                return (
                  <div
                    key={file.filename}
                    onClick={() => setSelectedFilename(file.filename)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {file.filename}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {file.description}
                      </p>
                    </div>

                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${badgeColor}`}>
                      {file.objectType}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Linter Diagnostics */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active File Code View */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">{activeFile?.filename}</span>
                {activeFile?.objectId && (
                  <span className="text-[10px] text-slate-400">ID: {activeFile.objectId}</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">AL Language • UTF-8</span>
            </div>

            <div className="p-4 overflow-x-auto max-h-[460px] scrollbar-thin scrollbar-thumb-slate-800">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
                {activeFile?.content.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row">
                    <span className="table-cell select-none text-slate-600 text-right pr-4 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="table-cell">
                      {line}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* AL Linter & Compiler Diagnostics Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-600" />
                AL Compiler & Linter Diagnostics ({activeFile?.filename})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Rule Check: AL0666, AA0207, Runtime 13.0
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {activeFile?.diagnostics && activeFile.diagnostics.length > 0 ? (
                activeFile.diagnostics.map((diag, i) => {
                  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
                  let textColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
                  if (diag.severity === 'warning') {
                    icon = <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                    textColor = 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
                  } else if (diag.severity === 'error') {
                    icon = <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                    textColor = 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
                  }

                  return (
                    <div key={i} className={`p-2 rounded border text-xs font-mono flex items-center justify-between gap-2 ${textColor}`}>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{diag.message}</span>
                      </div>
                      <span className="text-[10px] opacity-75">Line {diag.line}</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-2 text-xs font-mono text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> 0 Errors, 0 Warnings. AL file syntax is 100% clean.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
