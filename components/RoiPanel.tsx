
import React, { useMemo, useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { InputWrapper, Slider } from './ui/Input';
import { RoiInputs } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getRoiGraphInsight } from '../services/geminiService';

interface Props {
  inputs: RoiInputs;
  setInputs: (val: RoiInputs) => void;
  aiCostMonthly: number;
}

export const RoiPanel: React.FC<Props> = ({ inputs, setInputs, aiCostMonthly }) => {
  const [expandedSection, setExpandedSection] = useState<'inf' | 'orch' | 'gov' | null>(null);
  const [showValueDetails, setShowValueDetails] = useState(false);
  const [showRoiDetails, setShowRoiDetails] = useState(false);
  const [showTotalAssumptions, setShowTotalAssumptions] = useState(false);
  const [graphInsight, setGraphInsight] = useState<string>("");
  const [isNarrating, setIsNarrating] = useState<boolean>(false);

  const results = useMemo(() => {
    const totalRequestsMonthly = inputs.numUsers * inputs.requestsPerUser;
    const totalMinutesMonthly = inputs.timeSavedPerQuery * totalRequestsMonthly;
    const hoursSavedMonthly = totalMinutesMonthly / 60;
    const monthlyValue = hoursSavedMonthly * inputs.employeeHourlyRate;
    
    // Pillar breakdowns
    const inferenceCost = (totalRequestsMonthly * inputs.avgTokensPerRequest / 1_000_000) * inputs.costPerMillionTokens;
    const reindexCost = (inputs.numIndexedDocs * 800 / 1_000_000) * inputs.embeddingCostPerMillion * (inputs.reindexingFrequency / 12);
    const orchestrationCost = inputs.vectorDbBaseMonthly + reindexCost;
    const reviewedRequests = totalRequestsMonthly * (inputs.percentOutputsReviewed / 100);
    const governanceCost = (reviewedRequests * (inputs.reviewTimePerOutput / 60)) * inputs.reviewerHourlyRate;

    const netRoi = monthlyValue - aiCostMonthly;

    const projection = Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      cost: Number((aiCostMonthly * (i + 1)).toFixed(0)),
      value: Number((monthlyValue * (i + 1)).toFixed(0)),
      netGain: Number(((monthlyValue - aiCostMonthly) * (i + 1)).toFixed(0)),
    }));

    // Sensitivity thresholds logic (kept for potential future use or state consistency, though removed from specific UI section)
    const valuePerMin = inputs.timeSavedPerQuery > 0 ? monthlyValue / inputs.timeSavedPerQuery : 0;
    const breakEvenTime = valuePerMin > 0 ? aiCostMonthly / valuePerMin : 0;

    const targetReviewRate = inputs.percentOutputsReviewed >= 15 ? Math.round(inputs.percentOutputsReviewed * 1.5) : 15;
    const govCostTarget = (totalRequestsMonthly * (targetReviewRate / 100) * (inputs.reviewTimePerOutput / 60)) * inputs.reviewerHourlyRate;
    const totalCostTarget = inferenceCost + orchestrationCost + govCostTarget;

    const users60 = Math.floor(inputs.numUsers * 0.6);
    const val60 = monthlyValue * 0.6;
    const inf60 = inferenceCost * 0.6;
    const gov60 = governanceCost * 0.6;
    const cost60 = inf60 + orchestrationCost + gov60;
    const netGain60 = val60 - cost60;

    const roiRatio = aiCostMonthly > 0 ? (monthlyValue / aiCostMonthly).toFixed(2) : "—";

    return { 
      monthlyValue, 
      netRoi, 
      projection,
      totalRequestsMonthly,
      totalMinutesMonthly,
      hoursSavedMonthly,
      breakdown: {
        inference: inferenceCost,
        orchestration: orchestrationCost,
        governance: governanceCost
      },
      sensitivity: {
        breakEvenTime,
        targetReviewRate,
        totalCostTarget,
        users60,
        netGain60,
        roiRatio
      }
    };
  }, [inputs, aiCostMonthly]);

  const scenarios = useMemo(() => {
    const calc = (timeSaved: number, adoption: number) => {
      const vol = (inputs.numUsers * adoption) * inputs.requestsPerUser;
      const hrs = (timeSaved * vol) / 60;
      const value = hrs * inputs.employeeHourlyRate;
      const inf = (vol * inputs.avgTokensPerRequest / 1_000_000) * inputs.costPerMillionTokens;
      const gov = (vol * (inputs.percentOutputsReviewed / 100) * (inputs.reviewTimePerOutput / 60)) * inputs.reviewerHourlyRate;
      const totalCost = inf + results.breakdown.orchestration + gov;
      return value - totalCost;
    };

    return [
      { name: 'Conservative', netGain: calc(inputs.timeSavedPerQuery * 0.6, 0.7), desc: 'Reduced adoption / lower time savings' },
      { name: 'Base Case', netGain: results.netRoi, desc: 'Current model assumptions' },
      { name: 'Optimistic', netGain: calc(inputs.timeSavedPerQuery * 1.3, 1.0), desc: 'High adoption / higher efficiency' },
    ];
  }, [inputs, results.breakdown, results.netRoi]);

  useEffect(() => {
    let active = true;
    const fetchInsight = async () => {
      setIsNarrating(true);
      const text = await getRoiGraphInsight(results.projection);
      if (active) {
        const cleaned = text?.replace(/^Graph Insight:?\s*/i, '').trim();
        setGraphInsight(cleaned || "");
        setIsNarrating(false);
      }
    };
    
    const timeout = setTimeout(fetchInsight, 1500); 
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [results.projection]);

  return (
    <div className="space-y-12">
      {/* Economic Framework Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8">Economic Framework</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          <div>
            <h4 className="text-2xl font-bold text-white mb-5 tracking-tight">How AI Creates Value in This Model</h4>
            <p className="text-base text-slate-300 leading-relaxed font-medium">
              This simulator models <strong>labor capacity leverage</strong>. AI assists employees by reducing the human time required per workflow unit. The resulting economic value is measured by the capacity freed for higher-value output.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              "AI acts as a Copilot / automation layer that reduces human effort per request.",
              "Saved time is converted into economic capacity and valued using fully loaded labor cost.",
              "This models productivity impact (capacity unlocked), not revenue, profit, or headcount reduction."
            ].map((text, i) => (
              <div key={i} className="flex gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <p className="text-sm text-slate-300 font-semibold leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-8">
          <Card title="AI Productivity Assumptions" className="border-slate-200 shadow-sm">
            <InputWrapper label="Time Saved per Request (AI Assisted)">
              <Slider min={1} max={60} step={1} value={inputs.timeSavedPerQuery} onChange={(v) => setInputs({ ...inputs, timeSavedPerQuery: v })} unit="m" />
            </InputWrapper>
            <InputWrapper label="Requests per User per Month">
              <Slider min={10} max={2000} step={10} value={inputs.requestsPerUser} onChange={(v) => setInputs({ ...inputs, requestsPerUser: v })} />
            </InputWrapper>
            <InputWrapper label="Fully Loaded Employee Cost ($/hr)">
              <Slider min={20} max={500} step={5} value={inputs.employeeHourlyRate} onChange={(v) => setInputs({ ...inputs, employeeHourlyRate: v })} unit="$" />
            </InputWrapper>
            <InputWrapper label="Number of AI-Enabled Users">
              <Slider min={1} max={10000} step={10} value={inputs.numUsers} onChange={(v) => setInputs({ ...inputs, numUsers: v })} />
            </InputWrapper>
          </Card>

          <div className="space-y-4">
            <h3 className="px-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">AI Operating Costs (Monthly)</h3>
            
            <div className={`bg-white border rounded-[1.5rem] overflow-hidden transition-all ${expandedSection === 'inf' ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'inf' ? null : 'inf')}>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">AI Inference / API Usage</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Model access costs</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.inference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">{expandedSection === 'inf' ? 'Close detail ↑' : 'View detail ↓'}</p>
                </div>
              </div>
              {expandedSection === 'inf' && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                  <InputWrapper label="Avg Tokens per Request">
                    <Slider min={100} max={32000} step={100} value={inputs.avgTokensPerRequest} onChange={(v) => setInputs({ ...inputs, avgTokensPerRequest: v })} />
                  </InputWrapper>
                  <InputWrapper label="Effective Cost per 1M Tokens ($)">
                    <Slider min={0.01} max={50} step={0.05} value={inputs.costPerMillionTokens} onChange={(v) => setInputs({ ...inputs, costPerMillionTokens: v })} unit="$" />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className={`bg-white border rounded-[1.5rem] overflow-hidden transition-all ${expandedSection === 'orch' ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'orch' ? null : 'orch')}>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Orchestration & Data</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">RAG infra & retrieval</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.orchestration.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">{expandedSection === 'orch' ? 'Close detail ↑' : 'View detail ↓'}</p>
                </div>
              </div>
              {expandedSection === 'orch' && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                  <InputWrapper label="Vector DB Monthly Cluster ($)">
                    <Slider min={50} max={5000} step={50} value={inputs.vectorDbBaseMonthly} onChange={(v) => setInputs({ ...inputs, vectorDbBaseMonthly: v })} unit="$" />
                  </InputWrapper>
                  <InputWrapper label="Total Documents">
                    <Slider min={100} max={1000000} step={1000} value={inputs.numIndexedDocs} onChange={(v) => setInputs({ ...inputs, numIndexedDocs: v })} />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className={`bg-white border rounded-[1.5rem] overflow-hidden transition-all ${expandedSection === 'gov' ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'gov' ? null : 'gov')}>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Governance & Evaluation</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Audit & quality labor</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.governance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[9px] font-black text-indigo-600 uppercase mt-0.5">{expandedSection === 'gov' ? 'Close detail ↑' : 'View detail ↓'}</p>
                </div>
              </div>
              {expandedSection === 'gov' && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                  <InputWrapper label="Audit Sample Rate (%)">
                    <Slider min={1} max={100} step={1} value={inputs.percentOutputsReviewed} onChange={(v) => setInputs({ ...inputs, percentOutputsReviewed: v })} unit="%" />
                  </InputWrapper>
                  <InputWrapper label="Auditor Cost ($/hr)">
                    <Slider min={30} max={300} step={5} value={inputs.reviewerHourlyRate} onChange={(v) => setInputs({ ...inputs, reviewerHourlyRate: v })} unit="$" />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 shadow-2xl mt-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total Monthly AI Operating Cost</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">${aiCostMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">/ Month</span>
              </div>
              <button onClick={() => setShowTotalAssumptions(!showTotalAssumptions)} className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                {showTotalAssumptions ? 'Hide Operating Explanation ↑' : 'Explain Operating Costs ↓'}
              </button>
              {showTotalAssumptions && (
                <p className="mt-4 text-[11px] text-slate-400 font-medium italic leading-relaxed">
                  This represents the total monthly recurring cost to operate, monitor, and audit the AI system. It excludes one-time CapEx.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-emerald-50 border-emerald-200 shadow-lg p-8">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-2">Monthly Productivity Value</p>
              <h4 className="text-5xl font-black text-emerald-950">${results.monthlyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
              <p className="text-[11px] text-emerald-700 mt-3 font-bold uppercase tracking-widest">Labor Capacity Unlocked</p>
              <button onClick={() => setShowValueDetails(!showValueDetails)} className="mt-8 text-[10px] font-black uppercase text-emerald-800">
                {showValueDetails ? 'Hide Calculation ↑' : 'View Calculation ↓'}
              </button>
              {showValueDetails && (
                <div className="mt-5 space-y-4 p-6 bg-white/70 rounded-[1.5rem] text-[12px] text-emerald-900 border border-emerald-100">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Time saved per request:</span><span className="font-bold">{inputs.timeSavedPerQuery} min</span></div>
                    <div className="flex justify-between"><span>Requests per user/mo:</span><span className="font-bold">{inputs.requestsPerUser}</span></div>
                    <div className="flex justify-between"><span>Enabled users:</span><span className="font-bold">{inputs.numUsers}</span></div>
                    <div className="pt-3 border-t border-emerald-200/50">
                      <div className="flex justify-between font-bold text-[13px]"><span>→ Total Monthly Value:</span><span>${results.monthlyValue.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="bg-slate-900 border-slate-700 shadow-2xl p-8 text-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Productivity ROI</p>
              <h4 className="text-5xl font-black">${results.netRoi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
              <p className="text-[11px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Economic Gain Post-Op Costs</p>
              <button onClick={() => setShowRoiDetails(!showRoiDetails)} className="mt-8 text-[10px] font-black uppercase text-slate-300">
                {showRoiDetails ? 'Hide Gain Breakdown ↑' : 'View Gain Breakdown ↓'}
              </button>
              {showRoiDetails && (
                <div className="mt-5 space-y-4 p-6 bg-slate-800 rounded-[1.5rem] text-[12px] text-slate-100 border border-slate-700">
                  <div className="flex justify-between"><span>Gross Value:</span><span className="font-bold text-emerald-400">${results.monthlyValue.toLocaleString()}</span></div>
                  <div className="flex justify-between text-red-300"><span>Total AI Op Cost:</span><span className="font-bold">-${aiCostMonthly.toLocaleString()}</span></div>
                  <div className="flex justify-between font-black pt-4 text-white border-t border-slate-700 mt-2"><span>NET ECONOMIC GAIN:</span><span>${results.netRoi.toLocaleString()}</span></div>
                </div>
              )}
            </Card>
          </div>

          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Scenario Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {scenarios.map((s, idx) => (
                <div key={idx} className={`p-6 rounded-3xl border transition-all ${s.name === 'Base Case' ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-50 shadow-md' : 'bg-slate-50/50 border-slate-200'}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.name}</p>
                  <h5 className={`text-2xl font-black mb-1 ${s.netGain >= 0 ? 'text-slate-900' : 'text-red-600'}`}>${s.netGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h5>
                  <p className="text-[10px] text-slate-500 font-bold leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <Card title="12-Month Net Productivity Gain Projection" className="border-slate-200 shadow-sm overflow-hidden">
            <div className="h-[450px] w-full px-4 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.projection} margin={{ top: 30, right: 40, bottom: 60, left: 100 }}>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '24px', color: '#1e293b' }} 
                    labelStyle={{ color: '#1e293b' }}
                    itemStyle={{ color: '#1e293b' }}
                    formatter={(value: number) => `$${value.toLocaleString()}`} 
                  />
                  <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, paddingBottom: '40px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }} />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={6} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} name="Productivity Value" />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} strokeDasharray="8 8" dot={false} name="AI Op Costs" />
                  <Line type="monotone" dataKey="netGain" stroke="#4f46e5" strokeWidth={6} dot={{ r: 7 }} name="Net Gain" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="px-8 pb-8 text-xs text-slate-500 font-medium italic text-center">
              Productivity value scales faster than operating costs, widening net economic gain over time.
            </p>
          </Card>

          {/* Refined Executive ROI Interpretation Section */}
          <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
             <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-10">Executive ROI Interpretation</h3>
             
             <div className="space-y-10">
               <div>
                 <p className="text-lg text-slate-200 leading-relaxed font-medium text-balance">
                   The 12-month projection shows a stable efficiency multiplier and margin, indicating a structural productivity impact across the targeted workflow. The model identifies a <strong>{results.sensitivity.roiRatio}x ratio</strong> defined as productivity value per $1 of operational AI spend.
                 </p>
               </div>

               <div>
                 <h4 className="text-xl font-bold mb-6 tracking-tight">Strategic Implications</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-indigo-400 font-black text-[10px] uppercase mb-2">01. Sustainable Scaling</p>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">System architecture supports linear cost growth while value scales as user adoption deepens.</p>
                   </div>
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-emerald-400 font-black text-[10px] uppercase mb-2">02. Capital Efficiency</p>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">Capacity unlocked can be reinvested into higher-value automation or strategic workflow improvement.</p>
                   </div>
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                     <p className="text-slate-300 font-black text-[10px] uppercase mb-2">03. Downside Protection</p>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">Conservative scenario remains positive, providing high confidence in the baseline viability of the initiative.</p>
                   </div>
                 </div>
               </div>

               <div className="pt-8 border-t border-white/5">
                 <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                   <strong>Primary Risk:</strong> The baseline time-saved assumption must be validated through rigorous testing. We recommend running an A/B testing pilot with a subset of the {inputs.numUsers} users to confirm both actual minutes saved and real-world adoption rates.
                 </p>
               </div>
             </div>
             <p className="mt-12 text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] text-center italic">
               Decision Support Intelligence · Boardroom Strategic Framework
             </p>
          </section>
        </div>
      </div>
    </div>
  );
};