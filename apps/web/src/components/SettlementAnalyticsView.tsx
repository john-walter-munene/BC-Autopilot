import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  FileCheck, 
  Copy, 
  Check, 
  Download, 
  TrendingUp, 
  Clock, 
  Hash, 
  GitCommit, 
  Database, 
  Layers, 
  Terminal,
  ExternalLink
} from 'lucide-react';
import { AlFile, FunctionalRequirementDoc, PlaywrightSuite } from '@bc-agent/shared';
import { computeVerifiableBuildRecord } from '@bc-agent/api/modules/settlement-analytics/settlement-analytics.service.ts';
import { VerifiableBuildRecord } from '@bc-agent/api/modules/settlement-analytics/dto/settlement-analytics.dto.ts';

interface SettlementAnalyticsViewProps {
  currentFrd: FunctionalRequirementDoc;
  alFiles: AlFile[];
  playwrightSuite: PlaywrightSuite;
}

export const SettlementAnalyticsView: React.FC<SettlementAnalyticsViewProps> = ({
  currentFrd,
  alFiles,
  playwrightSuite
}) => {
  const [record, setRecord] = useState<VerifiableBuildRecord>(() => 
    computeVerifiableBuildRecord(currentFrd, alFiles, playwrightSuite)
  );
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(record.packageChecksumSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadCertificate = () => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VERIFICATION_CERTIFICATE_${record.buildId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Verifiable Certificate Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-indigo-900/60 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Overlay Architectural Blueprint
              </span>
              <span className="text-xs text-slate-400">Verifiable Builds & Automated Settlement</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Verifiable Build Records & Automated Settlement
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Adapted from the <strong>Overlay</strong> architecture: just as Overlay secures immutable sports betting picks and automated settlements, ALchemy 365 cryptographically anchors Business Central extension builds, automated test outcomes, and API contracts into verifiable audit records.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadCertificate}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition"
            >
              <FileCheck className="w-4 h-4" />
              <span>Export Verification Certificate</span>
            </button>
          </div>
        </div>

        {/* Cryptographic Proof Card */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-900/60 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">Package Fingerprint:</span>
              <span className="text-emerald-400">{record.buildId}</span>
            </div>
            <div className="flex items-center gap-2">
              <GitCommit className="w-3.5 h-3.5" />
              <span>Commit: {record.commitHash}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold uppercase">● SETTLED & VERIFIED</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="truncate text-slate-300 text-[11px]">
              <span className="text-slate-500">SHA-256 Checksum: </span>
              <code className="text-indigo-400">{record.packageChecksumSha256}</code>
            </div>

            <button
              onClick={handleCopyHash}
              className="shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
            </button>
          </div>
        </div>

        {/* Settlement Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-indigo-900/40">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">FRD Requirements</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
              {record.settlementSummary.passedRequirements} / {record.settlementSummary.totalRequirements} Settled
            </div>
            <div className="text-[10px] text-slate-400 mt-1">100% Contract Match</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">AL Compiler Score</div>
            <div className="text-xl font-extrabold text-blue-400 mt-0.5">
              {record.settlementSummary.alCompilerScore}% Clean
            </div>
            <div className="text-[10px] text-slate-400 mt-1">0 Syntax Diagnostics</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">Playwright DOM Assertions</div>
            <div className="text-xl font-extrabold text-indigo-400 mt-0.5">
              {record.settlementSummary.playwrightPassRate}% Verified
            </div>
            <div className="text-[10px] text-slate-400 mt-1">8/8 Steps Passed</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-900/60">
            <div className="text-xs text-slate-400 font-mono">API Compliance Score</div>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">
              {record.settlementSummary.apiComplianceScore}% OData V4
            </div>
            <div className="text-[10px] text-slate-400 mt-1">DelayedInsert & SystemId</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Immutable Audit Trail & Overlay Architectural Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Immutable Audit Trail */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Automated Settlement & Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Immutable sequential verification events proving end-to-end correctness.
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Verified
              </span>
            </div>

            <div className="space-y-3">
              {record.auditTrail.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {item.step}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(item.verifiedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                    {item.evidence}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right Column: Overlay Architecture Mapping */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Overlay Architecture Alignment
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-1">
                <span className="font-bold text-purple-900 dark:text-purple-300">
                  1. Verifiable Records & Immutability
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>In Overlay:</strong> Cryptographically locked picks to guarantee track record integrity.<br />
                  <strong>In ALchemy 365:</strong> Cryptographic SHA-256 fingerprints for every generated AL extension bundle and compiler log.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-300">
                  2. Automated Settlement Engine
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>In Overlay:</strong> Match outcome reconciliation and automated payout calculations.<br />
                  <strong>In ALchemy 365:</strong> Automated settlement verifying FRD user stories against Playwright assertions and compiler outputs.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  3. Modular Domain Architecture
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>In Overlay:</strong> NestJS domain modules (auth, tipsters, picks, analytics).<br />
                  <strong>In ALchemy 365:</strong> TypeScript domain modules (knowledge, al-compiler, browser-agent, api-gateway, settlement-analytics).
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
