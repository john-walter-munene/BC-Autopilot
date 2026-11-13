import React, { useState } from 'react';
import { X, Save, Settings, Shield, Globe, Terminal, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    bcWebUrl: string;
    environment: string;
    companyName: string;
    tenantId: string;
    idRangeFrom: number;
    idRangeTo: number;
    playwrightHeadless: boolean;
  };
  onSaveConfig: (newConfig: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [formData, setFormData] = useState(config);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Agent & Business Central Environment Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
          
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Business Central Web Client URL
            </label>
            <input
              type="text"
              value={formData.bcWebUrl}
              onChange={(e) => setFormData({ ...formData, bcWebUrl: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://businesscentral.dynamics.com/sandbox"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Environment
              </label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Sandbox">Sandbox</option>
                <option value="Production">Production</option>
                <option value="Dev">Development</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="CRONUS USA, Inc."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Microsoft Entra ID (Azure AD) Tenant ID
            </label>
            <input
              type="text"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
            />
          </div>

          {/* AL Object ID Ranges */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              AL Object ID Allocation Range (Customer Range: 50000..99999)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block">From</label>
                <input
                  type="number"
                  value={formData.idRangeFrom}
                  onChange={(e) => setFormData({ ...formData, idRangeFrom: Number(e.target.value) })}
                  className="w-full p-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">To</label>
                <input
                  type="number"
                  value={formData.idRangeTo}
                  onChange={(e) => setFormData({ ...formData, idRangeTo: Number(e.target.value) })}
                  className="w-full p-2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Playwright Headless */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Playwright Headless Execution
              </p>
              <p className="text-[11px] text-slate-500">
                Run browser tests in background with virtual viewport rendering
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.playwrightHeadless}
              onChange={(e) => setFormData({ ...formData, playwrightHeadless: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved!' : 'Save Configuration'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
