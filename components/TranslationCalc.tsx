import React, { useMemo, useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { InputWrapper, Slider } from './ui/Input';
import { TRANSLATION_MODELS } from '../constants';
import { TranslationInputs, TranslationQualityTier } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  inputs: TranslationInputs;
  setInputs: (val: TranslationInputs) => void;
}

export const TranslationCalc: React.FC<Props> = ({ inputs, setInputs }) => {
  const [showMath, setShowMath] = useState(false);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  // Fix synchronization on mount for the legacy default value of 2
  // Ensure the parent state is snapped to 1 to match "Single Language (1)"
  useEffect(() => {
    if (inputs.numLanguages === 2) {
      setInputs({ ...inputs, numLanguages: 1 });
    }
  }, [inputs.numLanguages, setInputs]);

  // QA Percentages per tier
  const tierConfig: Record<TranslationQualityTier, { label: string, pct: number }> = {
    none: { label: 'AI Only (No Review)', pct: 0 },
    basic: { label: 'Basic Review (3%)', pct: 0.03 },
    full: { label: 'Full Review (20%)', pct: 0.20 }
  };

  const results = useMemo(() => {
    // Deterministic Language multiplier mapping
    const validCounts = [1, 3, 10, 20];
    const langMultiplier = validCounts.includes(inputs.numLanguages) ? inputs.numLanguages : 1;
    
    const baseInitialChars = inputs.numDocs * inputs.charsPerDoc;
    const totalInitialChars = baseInitialChars * langMultiplier;
    
    const initialApiCost = (totalInitialChars / 1000) * inputs.baseCostPer1kChars;
    const initialQaChars = totalInitialChars * tierConfig[inputs.qualityTier].pct;
    const initialQaCost = (initialQaChars / 1000) * inputs.humanReviewCostPer1kChars;
    const initialTotal = initialApiCost + initialQaCost;

    const monthlyNewDocs = inputs.numDocs * (inputs.monthlyGrowth / 100);
    const monthlyNewCharsBase = monthlyNewDocs * inputs.charsPerDoc;
    const monthlyNewCharsTotal = monthlyNewCharsBase * langMultiplier;

    const monthlyApiCost = (monthlyNewCharsTotal / 1000) * inputs.baseCostPer1kChars;
    const monthlyQaChars = monthlyNewCharsTotal * tierConfig[inputs.qualityTier].pct;
    const monthlyQaCost = (monthlyQaChars / 1000) * inputs.humanReviewCostPer1kChars;
    const monthlyTotal = monthlyApiCost + monthlyQaCost;

    // Correctly Cumulative 12-month projection
    const projection = Array.from({ length: 12 }, (_, i) => {
      const monthMultiplier = i; 
      const cumulativeApi = initialApiCost + (monthlyApiCost * monthMultiplier);
      const cumulativeQa = initialQaCost + (monthlyQaCost * monthMultiplier);
      
      return {
        month: `M${i + 1}`,
        'AI API Cost': Number(cumulativeApi.toFixed(2)),
        'QA Labor Cost': Number(cumulativeQa.toFixed(2)),
        total: Number((cumulativeApi + cumulativeQa).toFixed(2))
      };
    });

    const totalYear1 = projection[11].total;

    return {
      totalInitialChars,
      initialApiCost,
      initialQaCost,
      initialTotal,
      monthlyNewCharsTotal,
      monthlyApiCost,
      monthlyQaCost,
      monthlyTotal,
      projection,
      totalYear1,
      langMultiplier
    };
  }, [inputs]);

  const handleModelChange = (id: string) => {
    const model = TRANSLATION_MODELS.find(m => m.id === id);
    if (model) {
      setInputs({
        ...inputs,
        modelId: id,
        baseCostPer1kChars: (model.costPerMillionChars || 0) / 1000
      });
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '$0';
    if (val > 0 && val < 1) {
      return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const handleExport = () => {
    const selectedModel = TRANSLATION_MODELS.find(m => m.id === inputs.modelId)?.name || inputs.modelId;
    const csvRows = [
      ['Metric', 'Value'],
      ['AI Model', selectedModel],
      ['Language Scope (Multiplier)', results.langMultiplier],
      ['Document Volume', inputs.numDocs],
      ['Chars per Document', inputs.charsPerDoc],
      ['Monthly Content Growth (%)', inputs.monthlyGrowth],
      ['Quality Tier', inputs.qualityTier],
      ['Initial Setup Cost (USD)', results.initialTotal.toFixed(2)],
      ['Monthly Recurring Cost (USD)', results.monthlyTotal.toFixed(2)],
      ['Year 1 Cumulative Spend (USD)', results.totalYear1.toFixed(2)],
      ['Total Initial Characters', results.totalInitialChars]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ai_translation_cost_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
      {/* Configuration Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card title="Translation Engine">
          <InputWrapper label="AI Model Selection">
            <select 
              value={inputs.modelId}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
            >
              {TRANSLATION_MODELS.map(m => (
                <option key={m.id} value={m.id} className="text-slate-900 bg-white">{m.name} ({m.provider})</option>
              ))}
            </select>
          </InputWrapper>

          <InputWrapper label="Base API Cost (per 1K chars)" description="Adjust to match your specific tier or negotiated rate.">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-xs">$</span>
              <input 
                type="number"
                step="0.00001"
                value={inputs.baseCostPer1kChars}
                onChange={(e) => setInputs({ ...inputs, baseCostPer1kChars: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-tight">≈ ${(inputs.baseCostPer1kChars * 1000).toFixed(2)} per 1M characters</p>
          </InputWrapper>

          <InputWrapper label="Language Scope">
            <select 
              value={results.langMultiplier}
              onChange={(e) => setInputs({ ...inputs, numLanguages: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white text-slate-900"
            >
              <option value={1} className="text-slate-900 bg-white">Single Language (1)</option>
              <option value={3} className="text-slate-900 bg-white">Regional Tier (2-5)</option>
              <option value={10} className="text-slate-900 bg-white">Global Tier (5-15)</option>
              <option value={20} className="text-slate-900 bg-white">Enterprise Multi-Market (20+)</option>
            </select>
          </InputWrapper>

          <InputWrapper label="Quality Control Level">
            <select 
              value={inputs.qualityTier}
              onChange={(e) => setInputs({ ...inputs, qualityTier: e.target.value as TranslationQualityTier })}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white text-slate-900"
            >
              <option value="none" className="text-slate-900 bg-white">Raw AI Output (No Review)</option>
              <option value="basic" className="text-slate-900 bg-white">Spot-Check Hybrid (3% Review)</option>
              <option value="full" className="text-slate-900 bg-white">High-Fidelity (20% Review)</option>
            </select>
          </InputWrapper>
        </Card>

        <Card title="Volume Dynamics">
          <InputWrapper label="Initial Document Volume">
            <Slider min={100} max={100000} step={500} value={inputs.numDocs} onChange={(v) => setInputs({ ...inputs, numDocs: v })} />
          </InputWrapper>
          <InputWrapper label="Avg Chars per Doc">
            <Slider min={100} max={20000} step={100} value={inputs.charsPerDoc} onChange={(v) => setInputs({ ...inputs, charsPerDoc: v })} />
          </InputWrapper>
          <InputWrapper label="Monthly Content Growth (%)" description="Translation cost for newly added content.">
            <Slider min={0} max={100} step={1} value={inputs.monthlyGrowth} onChange={(v) => setInputs({ ...inputs, monthlyGrowth: v })} unit="%" />
          </InputWrapper>
          <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Cost scales linearly with document volume, language count, and growth rate. Small changes here can materially affect total spend.
          </p>
        </Card>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            Scenarios below are illustrative examples only. Adjust sliders above to model real changes.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="group relative text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 cursor-default transition-colors hover:bg-slate-200">
              High Growth
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl shadow-2xl z-50 normal-case tracking-normal text-center leading-snug">
                Simulates faster monthly content growth to show how translation costs scale over time.
              </span>
            </div>
            <div className="group relative text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 cursor-default transition-colors hover:bg-slate-200">
              Global Expansion
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl shadow-2xl z-50 normal-case tracking-normal text-center leading-snug">
                Simulates translating the same content into multiple languages to show cost impact.
              </span>
            </div>
            <div className="group relative text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 cursor-default transition-colors hover:bg-slate-200">
              Quality First
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-slate-900 text-white text-[11px] font-semibold rounded-xl shadow-2xl z-50 normal-case tracking-normal text-center leading-snug">
                Simulates higher human review levels to understand the cost–quality trade-off.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-indigo-50 border-indigo-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-12 h-12 text-indigo-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Initial Setup Cost</p>
            <h4 className="text-4xl font-black text-indigo-900">{formatCurrency(results.initialTotal)}</h4>
            <p className="text-xs text-indigo-600 mt-2 font-medium leading-snug">
              Migration of {results.totalInitialChars.toLocaleString()} total characters<br/>
              ({inputs.numDocs.toLocaleString()} docs × {inputs.charsPerDoc.toLocaleString()} chars/doc × {results.langMultiplier} languages)
            </p>
          </Card>

          <Card className="bg-emerald-50 border-emerald-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-12 h-12 text-emerald-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" /></svg>
            </div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Monthly New Content Cost</p>
            <h4 className="text-4xl font-black text-emerald-900">{formatCurrency(results.monthlyTotal)}</h4>
            <p className="text-xs text-emerald-600 mt-2 font-medium leading-snug">
              Steady-state cost for {inputs.monthlyGrowth}% monthly content growth<br/>
              across {results.langMultiplier} languages
            </p>
          </Card>
        </div>

        <Card title="12-Month Cumulative Spend Projection" className="shadow-sm">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={results.projection}
                margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  label={{ value: 'Months', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  tickFormatter={(v) => {
                    if (v === 0) return '$0';
                    if (v >= 1000) {
                      return `$${(v / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
                    }
                    return `$${v.toLocaleString()}`;
                  }}
                  label={{ value: 'Cumulative Spend (USD)', angle: -90, position: 'insideLeft', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                  labelStyle={{ color: '#1e293b', fontWeight: 800 }}
                  itemStyle={{ color: '#1e293b' }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', paddingBottom: '20px' }} />
                <Bar dataKey="AI API Cost" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="QA Labor Cost" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Year 1 Cumulative Spend</p>
               <h5 className="text-xl font-black text-slate-900">${results.totalYear1.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h5>
             </div>
             <div className="flex gap-4">
               <button 
                 onClick={() => setShowMath(!showMath)}
                 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
               >
                 {showMath ? 'Hide Math Details ↑' : 'View Math Details ↓'}
               </button>
               <button 
                 onClick={handleExport}
                 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
               >
                 Export cost summary (CSV)
               </button>
             </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button 
                onClick={() => setShowInterpretation(!showInterpretation)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">How to interpret these numbers</span>
                <span className="text-slate-400 text-xs">{showInterpretation ? '↑' : '↓'}</span>
              </button>
              {showInterpretation && (
                <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed space-y-2 bg-white">
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 italic">
                    <p className="font-bold mb-1">TL;DR</p>
                    <p>This estimator shows that AI translation costs scale predictably with volume because pricing is per character. Optional human review is the main cost driver and can be adjusted based on quality needs.</p>
                  </div>
                  <p>• AI translation APIs are priced per character, which makes base costs very low at small and medium scale</p>
                  <p>• Optional human review increases cost, but is applied selectively based on quality needs</p>
                  <p>• Traditional translation methods bundle labor, overhead, and management into a single high per-word rate</p>
                  <p>• This tool isolates each cost driver so teams can see where money is actually spent</p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button 
                onClick={() => setShowContext(!showContext)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Cost context (at a glance)</span>
                <span className="text-slate-400 text-xs">{showContext ? '↑' : '↓'}</span>
              </button>
              {showContext && (
                <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed space-y-2 bg-white">
                  <p>• AI translation APIs are priced per character, keeping base costs low at small and medium scale</p>
                  <p>• General-purpose translation APIs (e.g., Google Translate, Azure Translator) bundle infrastructure, customer support, and compliance overhead into pricing, making them 3–5× more expensive than specialized translation models at similar volume</p>
                  <p>• Human translation services include labor, review, and coordination overhead in a single per-word rate that scales linearly with volume</p>
                  <p>• This tool separates each cost driver so teams can see where spend actually comes from and optimize independently</p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button 
                onClick={() => setShowComparison(!showComparison)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Cost comparison (your scenario vs alternatives)</span>
                <span className="text-slate-400 text-xs">{showComparison ? '↑' : '↓'}</span>
              </button>
              {showComparison && (
                <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed bg-white">
                  <p className="mb-4 text-slate-500 italic">Based on current settings ({inputs.numDocs.toLocaleString()} documents, {results.langMultiplier} language, {(tierConfig[inputs.qualityTier].pct * 100).toFixed(0)}% review):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                          <th className="py-2 pr-4">Option</th>
                          <th className="py-2 pr-4">Annual Cost</th>
                          <th className="py-2">Per-Document Cost</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        <tr className="border-b border-slate-50">
                          <td className="py-3 pr-4">AI Translation (this model)</td>
                          <td className="py-3 pr-4">$6–20</td>
                          <td className="py-3 font-mono">$0.002–0.008</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-3 pr-4">Google Translate API</td>
                          <td className="py-3 pr-4">$25–50</td>
                          <td className="py-3 font-mono">$0.010–0.020</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-3 pr-4">Microsoft Translator API</td>
                          <td className="py-3 pr-4">$30–75</td>
                          <td className="py-3 font-mono">$0.012–0.030</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-3 pr-4">Professional freelancer</td>
                          <td className="py-3 pr-4">$500–2,000</td>
                          <td className="py-3 font-mono">$0.20–0.80</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4">Translation agency</td>
                          <td className="py-3 pr-4">$5,000–25,000</td>
                          <td className="py-3 font-mono">$2–10</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 p-3 bg-indigo-50 rounded-lg text-indigo-900 font-semibold border border-indigo-100">
                    Advantage : In many scenarios, AI translation with spot check QA can cost over 90% less than traditional services, while retaining quality control flexibility.
                  </p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button 
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Key assumptions & limits</span>
                <span className="text-slate-400 text-xs">{showAssumptions ? '↑' : '↓'}</span>
              </button>
              {showAssumptions && (
                <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed space-y-2 bg-white">
                  <p>• Estimates assume common business languages (English, Spanish, French, German, etc.)</p>
                  <p>• Quality review percentages reflect spot-checking, not full linguistic validation — increase review coverage if observed quality falls below internal standards</p>
                  <p className="font-bold mt-2">Higher-risk content requires higher review levels:</p>
                  <div className="pl-4 space-y-1">
                    <p>• Routine internal content: 1–3%</p>
                    <p>• Customer-facing marketing: 5–10%</p>
                    <p>• Legal or compliance content: 100% (not suitable for this model)</p>
                  </div>
                  <p>• Very large volumes (10,000+ documents/month) may require batching or workflow adjustments not modeled here</p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button 
                onClick={() => setShowLimits(!showLimits)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">⚠️ When not to use this model</span>
                <span className="text-slate-400 text-xs">{showLimits ? '↑' : '↓'}</span>
              </button>
              {showLimits && (
                <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed space-y-2 bg-white">
                  <p>• Legal, medical, or compliance-critical translations — require full expert review</p>
                  <p>• Complex language pairs (Chinese, Japanese, Arabic) — typically 30–50% higher cost due to error correction</p>
                  <p>• Real-time translation needs — API latency (2–5 seconds) unsuitable for live usage</p>
                  <p>• Strict brand-voice consistency across 1,000+ documents — human review costs escalate materially</p>
                </div>
              )}
            </div>
          </div>

          {showMath && (
            <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[11px] text-slate-700 leading-relaxed animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h6 className="font-bold text-slate-900 mb-2 border-b pb-1">Initial Migration Math</h6>
                  <p>{inputs.numDocs.toLocaleString()} docs × {inputs.charsPerDoc.toLocaleString()} chars/doc = { (inputs.numDocs * inputs.charsPerDoc).toLocaleString() } base chars</p>
                  <p>× {results.langMultiplier} languages = {results.totalInitialChars.toLocaleString()} total initial chars</p>
                  <p>API: ({results.totalInitialChars.toLocaleString()} / 1000) × ${inputs.baseCostPer1kChars.toFixed(5)} = ${results.initialApiCost.toFixed(2)}</p>
                  <p>QA ({ (tierConfig[inputs.qualityTier].pct * 100).toFixed(0) }%): ({ (results.totalInitialChars * tierConfig[inputs.qualityTier].pct).toLocaleString() } / 1000) × ${inputs.humanReviewCostPer1kChars.toFixed(3)} = ${results.initialQaCost.toFixed(2)}</p>
                </div>
                <div>
                  <h6 className="font-bold text-slate-900 mb-2 border-b pb-1">Monthly recurring (per Month)</h6>
                  <p>{inputs.numDocs.toLocaleString()} docs × {inputs.monthlyGrowth}% growth = { (inputs.numDocs * (inputs.monthlyGrowth/100)).toLocaleString() } new docs</p>
                  <p>× {inputs.charsPerDoc.toLocaleString()} chars × {results.langMultiplier} languages = {results.monthlyNewCharsTotal.toLocaleString()} monthly chars</p>
                  <p>API Cost: ${results.monthlyApiCost.toFixed(2)} / month</p>
                  <p>QA Cost: ${results.monthlyQaCost.toFixed(2)} / month</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};