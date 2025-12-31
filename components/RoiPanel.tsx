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

    // Sensitivity thresholds logic
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
    <div className="space-y-8">
      {/* Economic Framework Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">Economic Framework</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
          <div>
            <h4 className="text-xl font-bold text-white mb-4 tracking-tight">How AI Creates Value in This Model</h4>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              This simulator models <strong>labor capacity leverage</strong>. AI assists employees by reducing the human time required per workflow unit. The resulting economic value is measured by the capacity freed for higher-value output.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              "AI acts as a Copilot layer that reduces human effort per request.",
              "Saved time is valued using fully loaded labor cost.",
              "This models productivity impact, not financial revenue."
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-center bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <p className="text-xs text-slate-300 font-semibold leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card title="AI Productivity Assumptions" className="border-slate-200 shadow-sm">
            <InputWrapper label="Time Saved per Request (m)">
              <Slider min={1} max={60} step={1} value={inputs.timeSavedPerQuery} onChange={(v) => setInputs({ ...inputs, timeSavedPerQuery: v })} />
            </InputWrapper>
            <InputWrapper label="Requests per User/Mo">
              <Slider min={10} max={2000} step={10} value={inputs.requestsPerUser} onChange={(v) => setInputs({ ...inputs, requestsPerUser: v })} />
            </InputWrapper>
            <InputWrapper label="Employee Cost ($/hr)">
              <Slider min={20} max={500} step={5} value={inputs.employeeHourlyRate} onChange={(v) => setInputs({ ...inputs, employeeHourlyRate: v })} unit="$" />
            </InputWrapper>
            <InputWrapper label="Number of Users">
              <Slider min={1} max={10000} step={10} value={inputs.numUsers} onChange={(v) => setInputs({ ...inputs, numUsers: v })} />
            </InputWrapper>
          </Card>

          <div className="space-y-3">
            <h3 className="px-1 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Operating Costs</h3>
            
            <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${expandedSection === 'inf' ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'inf' ? null : 'inf')}>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">AI Inference</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">API usage</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.inference.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[8px] font-black text-indigo-600 uppercase">{expandedSection === 'inf' ? '↑' : '↓'}</p>
                </div>
              </div>
              {expandedSection === 'inf' && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <InputWrapper label="Avg Tokens/Req">
                    <Slider min={100} max={32000} step={100} value={inputs.avgTokensPerRequest} onChange={(v) => setInputs({ ...inputs, avgTokensPerRequest: v })} />
                  </InputWrapper>
                  <InputWrapper label="Cost/1M Tokens ($)">
                    <Slider min={0.01} max={50} step={0.05} value={inputs.costPerMillionTokens} onChange={(v) => setInputs({ ...inputs, costPerMillionTokens: v })} unit="$" />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${expandedSection === 'orch' ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'orch' ? null : 'orch')}>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Orchestration</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">RAG infra</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.orchestration.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[8px] font-black text-indigo-600 uppercase">{expandedSection === 'orch' ? '↑' : '↓'}</p>
                </div>
              </div>
              {expandedSection === 'orch' && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <InputWrapper label="Vector DB Cluster ($)">
                    <Slider min={50} max={5000} step={50} value={inputs.vectorDbBaseMonthly} onChange={(v) => setInputs({ ...inputs, vectorDbBaseMonthly: v })} unit="$" />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${expandedSection === 'gov' ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'gov' ? null : 'gov')}>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Governance</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Audit labor</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">${results.breakdown.governance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[8px] font-black text-indigo-600 uppercase">{expandedSection === 'gov' ? '↑' : '↓'}</p>
                </div>
              </div>
              {expandedSection === 'gov' && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <InputWrapper label="Audit Rate (%)">
                    <Slider min={1} max={100} step={1} value={inputs.percentOutputsReviewed} onChange={(v) => setInputs({ ...inputs, percentOutputsReviewed: v })} unit="%" />
                  </InputWrapper>
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl mt-4">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Monthly Op Cost</h4>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">${aiCostMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">/ Mo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-emerald-50 border-emerald-200 shadow p-6">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.15em] mb-1">Monthly Productivity Value</p>
              <h4 className="text-4xl font-black text-emerald-950">${results.monthlyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
              <p className="text-[10px] text-emerald-700 mt-2 font-bold uppercase">Labor Capacity Unlocked</p>
              <button onClick={() => setShowValueDetails(!showValueDetails)} className="mt-4 text-[9px] font-black uppercase text-emerald-800 hover:underline">
                {showValueDetails ? 'Hide Calculation' : 'View Calculation'}
              </button>
              {showValueDetails && (
                <div className="mt-3 p-4 bg-white/70 rounded-xl text-[11px] text-emerald-900 border border-emerald-100">
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span>Time saved:</span><span className="font-bold">{inputs.timeSavedPerQuery} min</span></div>
                    <div className="flex justify-between"><span>Reqs/User:</span><span className="font-bold">{inputs.requestsPerUser}</span></div>
                    <div className="flex justify-between"><span>Users:</span><span className="font-bold">{inputs.numUsers}</span></div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="bg-slate-900 border-slate-700 shadow-xl p-6 text-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Net Productivity Gain</p>
              <h4 className="text-4xl font-black">${results.netRoi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Economic Gain Post-Op Costs</p>
              <button onClick={() => setShowRoiDetails(!showRoiDetails)} className="mt-4 text-[9px] font-black uppercase text-slate-300 hover:underline">
                {showRoiDetails ? 'Hide Breakdown' : 'View Breakdown'}
              </button>
              {showRoiDetails && (
                <div className="mt-3 p-4 bg-slate-800 rounded-xl text-[11px] text-slate-100 border border-slate-700">
                  <div className="flex justify-between"><span>Gross:</span><span className="font-bold text-emerald-400">${results.monthlyValue.toLocaleString()}</span></div>
                  <div className="flex justify-between text-red-300"><span>Op Cost:</span><span className="font-bold">-${aiCostMonthly.toLocaleString()}</span></div>
                </div>
              )}
            </Card>
          </div>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Scenario Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((s, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border transition-all ${s.name === 'Base Case' ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.name}</p>
                  <h5 className={`text-xl font-black mb-0.5 ${s.netGain >= 0 ? 'text-slate-900' : 'text-red-600'}`}>${s.netGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h5>
                  <p className="text-[9px] text-slate-500 font-bold leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <Card title="12-Month Projection" className="border-slate-200 shadow-sm overflow-hidden">
            <div className="h-[380px] w-full px-2 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.projection} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 15px 30px -10px rgb(0 0 0 / 0.1)', padding: '16px', color: '#1e293b', fontSize: '11px' }} 
                    formatter={(value: number) => `$${value.toLocaleString()}`} 
                  />
                  <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }} />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={4} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} name="Value" />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Costs" />
                  <Line type="monotone" dataKey="netGain" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4 }} name="Net Gain" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Strategic Implications & Sensitivity Callouts Section */}
          <section className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* Left Column: Strategic Implications */}
               <div>
                 <h3 className="text-lg font-bold mb-8 tracking-tight">Strategic Implications</h3>
                 <div className="space-y-8">
                   <div className="flex gap-4">
                     <div className="flex-shrink-0 w-7 h-7 rounded bg-indigo-900/50 flex items-center justify-center text-indigo-400 font-bold text-[10px]">01</div>
                     <div>
                       <h4 className="text-sm font-bold text-slate-100 mb-0.5">Sustainable Scaling</h4>
                       <p className="text-[11px] text-slate-400 leading-relaxed font-medium">System architecture ensures linear cost growth while value scales at an accelerated rate as user adoption deepens.</p>
                     </div>
                   </div>
                   <div className="flex gap-4">
                     <div className="flex-shrink-0 w-7 h-7 rounded bg-emerald-900/50 flex items-center justify-center text-emerald-400 font-bold text-[10px]">02</div>
                     <div>
                       <h4 className="text-sm font-bold text-slate-100 mb-0.5">Capital Efficiency</h4>
                       <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Labor capacity unlocked by AI assistance provides a reusable capital buffer that can be reinvested into higher-value automation or strategic growth.</p>
                     </div>
                   </div>
                   <div className="flex gap-4">
                     <div className="flex-shrink-0 w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-[10px]">03</div>
                     <div>
                       <h4 className="text-sm font-bold text-slate-100 mb-0.5">Downside Protection</h4>
                       <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Even under the Conservative Scenario, the model maintains positive economic yield, providing high confidence in baseline viability.</p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Right Column: Sensitivity Callouts */}
               <div>
                 <h3 className="text-lg font-bold mb-8 tracking-tight text-[#ff7e67]">Sensitivity Callouts</h3>
                 <div className="space-y-4">
                   <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                     <h4 className="text-[9px] font-black text-[#ff7e67] uppercase tracking-[0.15em] mb-1.5">Efficiency Threshold</h4>
                     <p className="text-xs text-slate-200 leading-relaxed font-medium">If actual time saved falls below ~{results.sensitivity.breakEvenTime.toFixed(1)} min/request, net gain approaches break-even.</p>
                   </div>
                   <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                     <h4 className="text-[9px] font-black text-[#ff7e67] uppercase tracking-[0.15em] mb-1.5">Governance Sprawl</h4>
                     <p className="text-xs text-slate-200 leading-relaxed font-medium">If review rate increases to {results.sensitivity.targetReviewRate}% (from {inputs.percentOutputsReviewed}%), monthly AI cost rises to ~${results.sensitivity.totalCostTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}.</p>
                   </div>
                   <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                     <h4 className="text-[9px] font-black text-[#ff7e67] uppercase tracking-[0.15em] mb-1.5">Adoption Risk</h4>
                     <p className="text-xs text-slate-200 leading-relaxed font-medium">If only ~60% of users adopt (≈{results.sensitivity.users60} users), net gain drops to ~${results.sensitivity.netGain60.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo.</p>
                   </div>
                 </div>
               </div>
             </div>

             <div className="mt-10 pt-6 border-t border-white/5">
               <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
                 <strong>Primary Risk:</strong> The simulation relies on the {inputs.timeSavedPerQuery}m time-saved baseline. Before scaling, we recommend running A/B testing or a measured pilot with a subset of the {inputs.numUsers} users to confirm both minutes saved and actual adoption rates.
               </p>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};
