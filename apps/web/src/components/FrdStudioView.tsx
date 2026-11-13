import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Database, 
  Table as TableIcon, 
  Zap, 
  Globe, 
  Layout, 
  Check, 
  RefreshCw,
  Code
} from 'lucide-react';
import { FunctionalRequirementDoc } from '@bc-agent/shared';
import { SAMPLE_FRDS } from '../data/sample-frds.ts';

interface FrdStudioViewProps {
  currentFrd: FunctionalRequirementDoc;
  onUpdateFrd: (frd: FunctionalRequirementDoc) => void;
  onSelectFrd: (frd: FunctionalRequirementDoc) => void;
}

export const FrdStudioView: React.FC<FrdStudioViewProps> = ({
  currentFrd,
  onUpdateFrd,
  onSelectFrd
}) => {
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customFrdText, setCustomFrdText] = useState(
`Title: Subcontractor Lot Quality Certificate Tracker
Module: Manufacturing & Purchasing
Overview: Extend Purchase Order and Item to mandate lot inspection certificates before receipt lines can be invoiced. Expose a custom API page for subcontractors to upload inspection records.
Base Tables:
- Purchase Header (Table 38): add field "QC Inspection Status" (Option: Pending, Approved, Rejected)
- Item (Table 27): add field "Requires QC Certificate" (Boolean)
Custom Tables:
- QC Lot Certificate (Table 50110): Lot No. (Code[20]), Certificate URL (Text[250]), Inspection Date (Date)
Business Rules:
- Block posting Purchase Receipt if Requires QC Certificate is true and Certificate is not approved.
API Exposure:
- Entity: lotCertificate, EntitySet: lotCertificates (GET, POST)`
  );
  const [isParsing, setIsParsing] = useState(false);

  const handleParseCustomFrd = async () => {
    setIsParsing(true);
    try {
      const res = await fetch('/api/agent/parse-frd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frdText: customFrdText }),
      });
      const data = await res.json();
      if (data && data.title) {
        const newFrd: FunctionalRequirementDoc = {
          id: `custom-${Date.now()}`,
          title: data.title || 'Custom Requirement Spec',
          version: '1.0.0',
          module: data.module || 'Custom Operations',
          overview: data.overview || customFrdText.slice(0, 150),
          userStories: data.userStories || ['As an ERP user, I need custom fields and validation.'],
          baseTablesToExtend: (data.baseTablesToExtend || []).map((bt: any, i: number) => ({
            id: bt.id || (18 + i),
            name: bt.name || 'Base Table',
            extensionFields: (bt.fields || []).map((f: any) => ({
              name: f.name || 'Custom Field',
              dataType: f.dataType || 'Text[50]',
              description: f.description || 'Custom attribute',
              isCustom: true
            }))
          })),
          customTablesToCreate: (data.customTablesToCreate || []).map((ct: any) => ({
            id: ct.id || 50120,
            name: ct.name || 'Custom Table',
            primaryKeys: ct.primaryKeys || ['Code'],
            fields: (ct.fields || []).map((f: any) => ({
              name: f.name || 'Field',
              dataType: f.dataType || 'Code[20]',
              description: f.description || '',
              isCustom: true
            }))
          })),
          businessRules: data.businessRules || [
            {
              id: 'BR-CUSTOM',
              triggerEvent: 'OnAfterInsert in Base Table',
              description: 'Validate custom requirements',
              targetObject: 'Codeunit',
              expectedBehavior: 'Enforce rule'
            }
          ],
          apiExposureNeeds: data.apiExposureNeeds || {
            entityName: 'customEntity',
            entitySetName: 'customEntities',
            exposedFields: ['id', 'name', 'status'],
            allowedMethods: ['GET', 'POST', 'PATCH']
          },
          uiCustomizations: data.uiCustomizations || [
            {
              targetPageId: 21,
              targetPageName: 'Target Card',
              placement: 'addlast(General)',
              elementsToAdd: ['Custom controls group']
            }
          ]
        };
        onUpdateFrd(newFrd);
        setIsEditingCustom(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* FRD Preset Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
            Requirement Engineering Workspace
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Functional Requirement Document (FRD) Specification
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_FRDS.map(frd => (
            <button
              key={frd.id}
              onClick={() => {
                setIsEditingCustom(false);
                onSelectFrd(frd);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentFrd.id === frd.id && !isEditingCustom
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {frd.title.split(' ')[0]} {frd.title.split(' ')[1]}
            </button>
          ))}

          <button
            onClick={() => setIsEditingCustom(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isEditingCustom
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom FRD Prompt</span>
          </button>
        </div>
      </div>

      {/* Custom FRD AI Parser Form */}
      {isEditingCustom && (
        <div className="bg-indigo-50/50 dark:bg-slate-900 rounded-xl p-6 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Autonomous FRD Analysis Engine
            </h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              Input any unstructured requirement, user story, or acceptance criteria
            </span>
          </div>

          <textarea
            rows={8}
            value={customFrdText}
            onChange={(e) => setCustomFrdText(e.target.value)}
            className="w-full p-4 rounded-lg bg-white dark:bg-slate-950 border border-indigo-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Paste your Functional Requirement Document text here..."
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsEditingCustom(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleParseCustomFrd}
              disabled={isParsing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 transition"
            >
              {isParsing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parse FRD & Scaffold Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main FRD Summary & Structural Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Overview & User Stories */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase">Document Scope</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {currentFrd.title}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {currentFrd.module} • v{currentFrd.version}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentFrd.overview}
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                User Stories & Acceptance Criteria
              </h4>
              <ul className="space-y-2">
                {currentFrd.userStories.map((story, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 font-bold">›</span>
                    <span>{story}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* API Exposure Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-500" /> API Page Contract (OData V4)
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Entity Name:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{currentFrd.apiExposureNeeds.entityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entity Set Name:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{currentFrd.apiExposureNeeds.entitySetName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Allowed Methods:</span>
                <span className="font-mono text-emerald-600 font-semibold">{currentFrd.apiExposureNeeds.allowedMethods.join(', ')}</span>
              </div>
              <div className="pt-2 text-slate-500 text-[11px]">
                Exposed Fields: <span className="font-mono text-slate-700 dark:text-slate-300">{currentFrd.apiExposureNeeds.exposedFields.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Schema Entities, Business Logic & UI Placement */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Base Tables to Extend */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Base Tables to Extend (TableExtensions)
            </h3>

            <div className="space-y-3">
              {currentFrd.baseTablesToExtend.map(bt => (
                <div key={bt.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Table {bt.id}: {bt.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      TableExtension 50100
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-mono text-[10px]">
                          <th className="pb-1">FIELD NAME</th>
                          <th className="pb-1">AL DATA TYPE</th>
                          <th className="pb-1">DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {bt.extensionFields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/30">
                            <td className="py-1.5 font-mono font-medium text-slate-800 dark:text-slate-200">{f.name}</td>
                            <td className="py-1.5 font-mono text-purple-600 dark:text-purple-400">{f.dataType}</td>
                            <td className="py-1.5 text-slate-600 dark:text-slate-400">{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Storage Tables to Create */}
          {currentFrd.customTablesToCreate.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                Custom Tables to Create (AL Table Objects)
              </h3>

              <div className="space-y-3">
                {currentFrd.customTablesToCreate.map(ct => (
                  <div key={ct.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Table {ct.id}: {ct.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Primary Key: [{ct.primaryKeys.join(', ')}]
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-mono text-[10px]">
                            <th className="pb-1">FIELD NAME</th>
                            <th className="pb-1">AL DATA TYPE</th>
                            <th className="pb-1">PURPOSE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                          {ct.fields.map((f, i) => (
                            <tr key={i}>
                              <td className="py-1.5 font-mono font-medium text-slate-800 dark:text-slate-200">{f.name}</td>
                              <td className="py-1.5 font-mono text-indigo-600 dark:text-indigo-400">{f.dataType}</td>
                              <td className="py-1.5 text-slate-600 dark:text-slate-400">{f.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Rules & Event Subscribers */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Business Rules & Event Subscribers (Codeunit 50100)
            </h3>

            <div className="space-y-3">
              {currentFrd.businessRules.map(rule => (
                <div key={rule.id} className="p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">{rule.id} • {rule.triggerEvent}</span>
                    <span className="text-[10px] text-slate-500">{rule.targetObject}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{rule.description}</p>
                  <p className="text-slate-500 font-mono text-[11px]">→ {rule.expectedBehavior}</p>
                </div>
              ))}
            </div>
          </div>

          {/* UI Customizations */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-cyan-600" />
              UI Customizations & FastTab Placements (PageExtension 50100)
            </h3>

            {currentFrd.uiCustomizations.map((ui, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Page {ui.targetPageId}: {ui.targetPageName}</span>
                  <span className="font-mono text-blue-600">{ui.placement}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {ui.elementsToAdd.map((el, idx) => (
                    <div key={idx}>• {el}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
