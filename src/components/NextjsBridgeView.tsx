import React, { useState } from 'react';
import { 
  Layers, 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Globe, 
  RefreshCw, 
  Plus, 
  Filter, 
  Sparkles,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { EndpointArtifact } from '../types/agent';

interface NextjsBridgeViewProps {
  artifact: EndpointArtifact;
}

export const NextjsBridgeView: React.FC<NextjsBridgeViewProps> = ({ artifact }) => {
  const [activeSubTab, setActiveSubTab] = useState<'live_demo' | 'route_handler' | 'types' | 'hook'>('live_demo');
  const [copied, setCopied] = useState<string | null>(null);

  // Live Consumer Interactive State
  const [filterTier, setFilterTier] = useState<string>('All');
  const [records, setRecords] = useState<any[]>([
    {
      id: 'f9a88c21-7294-4b53-b0e1-0c58a1291844',
      number: '10000',
      displayName: 'Adatum Corporation',
      email: 'purchasing@adatum.com',
      loyaltyTier: 'VIP',
      loyaltyPoints: 640,
      discountPercentage: 15.0,
      systemCreatedAt: '2026-03-12T14:22:10Z'
    },
    {
      id: '81bc92a0-4381-42e5-a389-13824f923019',
      number: '20000',
      displayName: 'Trey Research',
      email: 'accounts@treyresearch.net',
      loyaltyTier: 'Gold',
      loyaltyPoints: 310,
      discountPercentage: 10.0,
      systemCreatedAt: '2026-04-05T09:15:30Z'
    },
    {
      id: '34e101ab-1904-4df1-8a90-349814ea9810',
      number: '30000',
      displayName: 'Coho Winery',
      email: 'orders@cohowinery.com',
      loyaltyTier: 'Silver',
      loyaltyPoints: 120,
      discountPercentage: 5.0,
      systemCreatedAt: '2026-05-18T11:40:00Z'
    }
  ]);

  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustTier, setNewCustTier] = useState('Bronze');

  const filteredRecords = filterTier === 'All' 
    ? records 
    : records.filter(r => r.loyaltyTier === filterTier);

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newRecord = {
      id: `guid-${Date.now()}`,
      number: `${(records.length + 1) * 10000}`,
      displayName: newCustName,
      email: newCustEmail || 'customer@example.com',
      loyaltyTier: newCustTier,
      loyaltyPoints: newCustTier === 'VIP' ? 500 : (newCustTier === 'Gold' ? 250 : 50),
      discountPercentage: newCustTier === 'VIP' ? 15 : (newCustTier === 'Gold' ? 10 : 5),
      systemCreatedAt: new Date().toISOString()
    };

    setRecords([newRecord, ...records]);
    setNewCustName('');
    setNewCustEmail('');
  };

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              React & Next.js API Bridge for Business Central
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
              OData V4 • REST API
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Engineered endpoints, TypeScript SDK, and live consumption portal connected to AL API Page <code className="text-blue-600 font-mono">alc/loyalty/v2.0/{artifact.entityName}</code>.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
          {[
            { id: 'live_demo', label: 'Live Client Testbench' },
            { id: 'route_handler', label: 'Next.js Route Handler' },
            { id: 'hook', label: 'React Hook' },
            { id: 'types', label: 'TypeScript Types' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab 1: Live Interactive Testbench Consumer */}
      {activeSubTab === 'live_demo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Consumer UI Component */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
              
              {/* App Bar inside Consumer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Customer Loyalty & Rewards Portal (React Client)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Consuming Business Central API endpoint: <span className="font-mono text-emerald-600">{artifact.restRoute}</span>
                  </p>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">OData Filter:</span>
                  <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="All">All Tiers (No Filter)</option>
                    <option value="VIP">$filter=loyaltyTier eq 'VIP'</option>
                    <option value="Gold">$filter=loyaltyTier eq 'Gold'</option>
                    <option value="Silver">$filter=loyaltyTier eq 'Silver'</option>
                  </select>
                </div>
              </div>

              {/* Add Customer / Record Form */}
              <form onSubmit={handleCreateRecord} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Register Customer / POST to BC API Page
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">DelayedInsert = true</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Customer Name..."
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Contact Email..."
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newCustTier}
                      onChange={(e) => setNewCustTier(e.target.value)}
                      className="flex-1 p-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="VIP">VIP</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition"
                    >
                      POST
                    </button>
                  </div>
                </div>
              </form>

              {/* Records Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRecords.map(item => (
                  <div key={item.id} className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {item.displayName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.loyaltyTier === 'VIP' 
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                          : item.loyaltyTier === 'Gold'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.loyaltyTier}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      No: {item.number} • {item.email}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Points: </span>
                        <strong className="text-emerald-600 font-mono">{item.loyaltyPoints}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Discount: </span>
                        <strong className="text-blue-600 font-mono">{item.discountPercentage}%</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right: Live OData JSON Payload Inspector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-md flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" /> OData V4 JSON Stream
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">HTTP 200 OK</span>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-200 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                <pre>{JSON.stringify({
                  '@odata.context': `${artifact.odataUrl}/$metadata#${artifact.entityName}`,
                  value: filteredRecords
                }, null, 2)}</pre>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Sub-tab 2: Next.js Route Handler */}
      {activeSubTab === 'route_handler' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden space-y-2">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>app/api/bc/{artifact.entityName}/route.ts (App Router)</span>
            <button
              onClick={() => handleCopy(artifact.nextjsRouteCode, 'route')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              {copied === 'route' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'route' ? 'Copied' : 'Copy Route Handler'}</span>
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre>{artifact.nextjsRouteCode}</pre>
          </div>
        </div>
      )}

      {/* Sub-tab 3: React Hook */}
      {activeSubTab === 'hook' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden space-y-2">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>hooks/useBusinessCentral{artifact.entityName}.ts</span>
            <button
              onClick={() => handleCopy(artifact.reactHookCode, 'hook')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              {copied === 'hook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'hook' ? 'Copied' : 'Copy Hook'}</span>
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre>{artifact.reactHookCode}</pre>
          </div>
        </div>
      )}

      {/* Sub-tab 4: TypeScript Types */}
      {activeSubTab === 'types' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden space-y-2">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>types/businessCentral.ts</span>
            <button
              onClick={() => handleCopy(artifact.typeScriptTypes, 'types')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              {copied === 'types' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'types' ? 'Copied' : 'Copy Types'}</span>
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre>{artifact.typeScriptTypes}</pre>
          </div>
        </div>
      )}

    </div>
  );
};
