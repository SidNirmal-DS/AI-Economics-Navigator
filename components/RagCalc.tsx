
import React, { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { InputWrapper, Slider } from './ui/Input';
import { INFERENCE_MODELS, EMBEDDING_MODELS } from '../constants';
import { RagInputs } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  inputs: RagInputs;
  setInputs: (val: RagInputs) => void;
}

enum RagStep {
  BUILD = 'BUILD',
  RUN = 'RUN',
  GOVERN = 'GOVERN'
}

export const RagCalc: React.FC<Props> = ({ inputs, setInputs }) => {
  const [activeStep, setActiveStep] = useState<RagStep>(RagStep.BUILD);
  
  const selectedEmbedding = EMBEDDING_MODELS.find(m => m.id === inputs.ingestionModelId)!;
  const selectedInference = INFERENCE_MODELS.find(m => m.id === inputs.inferenceModelId)!;

  const results = useMemo(() => {
    // --- STEP 1: Build & Ingest ---
    const totalTokensBase = inputs.numDocs * inputs.tokensPerDoc;
    const effectiveTokensAfterOverlap = totalTokensBase * (1 + inputs.overlapPct / 100);
    const totalChunks = Math.ceil(effectiveTokensAfterOverlap / inputs.chunkSize);
    
    const oneTimeParsingCost = inputs.numDocs * inputs.parsingCostPerDoc;
    const oneTimeEmbeddingCost = (effectiveTokensAfterOverlap / 1_000_000) * selectedEmbedding.costPerMillionTokens;
    
    const oneTimeSetupTotal = oneTimeParsingCost + oneTimeEmbeddingCost;

    // Storage size estimation: vectors * dimension * 4 bytes/float + overhead
    const vectorDataBytes = totalChunks * selectedEmbedding.dimension * 4;
    const storageSizeGb = (vectorDataBytes * (1 + inputs.metadataOverheadPct / 100)) / (1024 * 1024 * 1024);
    
    // --- STEP 2: Run ---
    const queryEmbeddingCostMonthly = (inputs.queriesPerMonth * inputs.avgQueryTokens / 1_000_000) * selectedEmbedding.costPerMillionTokens;
    const dbOpsMonthly = (totalChunks / 1000) * inputs.managedDbCostPer1kVectors;
    const rerankMonthly = inputs.rerankerEnabled ? (inputs.queriesPerMonth / 1000) * inputs.rerankerCostPer1k : 0;
    
    // Inference calculation
    const tokensPerQueryIn = inputs.avgQueryTokens + (inputs.retrievedChunks * (inputs.chunkSize));
    const tokensPerQueryOut = inputs.avgAnswerTokens;
    
    const cacheDiscount = inputs.cacheHitRatePct / 100;
    const effectiveQueries = inputs.queriesPerMonth * (1 - cacheDiscount);
    
    const monthlyInferenceInputCost = (effectiveQueries * tokensPerQueryIn / 1_000_000) * (selectedInference.costPerMillionInputTokens || 0);
    const monthlyInferenceOutputCost = (effectiveQueries * tokensPerQueryOut / 1_000_000) * (selectedInference.costPerMillionOutputTokens || 0);
    
    const monthlyOpsTotal = queryEmbeddingCostMonthly + dbOpsMonthly + rerankMonthly + monthlyInferenceInputCost + monthlyInferenceOutputCost;
    const unitCostPerInteraction = monthlyOpsTotal / inputs.queriesPerMonth;

    // --- STEP 3: Govern & Improve ---
    const monitoringMonthly = (inputs.queriesPerMonth / 1000) * inputs.monitoringCostPer1k;
    const evalMonthly = (inputs.evalRunsPerMonth * inputs.evalTokensPerRun / 1_000_000) * (selectedInference.costPerMillionInputTokens || 0); // Assuming model-based eval
    const humanMonthly = inputs.humanReviewHours * inputs.humanHourlyRate;
    const reindexMonthly = (oneTimeSetupTotal * (inputs.reindexFrequencyPerYear / 12));
    
    const monthlyGovernanceTotal = monitoringMonthly + evalMonthly + humanMonthly + reindexMonthly;
    
    // Annualized calculation as requested: Setup + (Ops * 12) + (Gov * 12)
    const annualizedTotal = oneTimeSetupTotal + (monthlyOpsTotal * 12) + (monthlyGovernanceTotal * 12);

    return {
      totalTokensBase,
      effectiveTokensAfterOverlap,
      totalChunks,
      oneTimeParsingCost,
      oneTimeEmbeddingCost,
      storageSizeGb,
      oneTimeSetupTotal,
      monthlyOpsTotal,
      unitCostPerInteraction,
      monthlyGovernanceTotal,
      annualizedTotal,
      // specific breakouts for charts
      breakout: {
        parsing: oneTimeParsingCost,
        embedding: oneTimeEmbeddingCost,
        inference: monthlyInferenceInputCost + monthlyInferenceOutputCost,
        db: dbOpsMonthly,
        rerank: rerankMonthly,
        gov: monthlyGovernanceTotal
      }
    };
  }, [inputs, selectedEmbedding, selectedInference]);

  const summaryData = [
    { name: 'Setup', value: results.oneTimeSetupTotal, color: '#4f46e5' },
    { name: 'Monthly Ops', value: results.monthlyOpsTotal, color: '#10b981' },
    { name: 'Monthly Gov', value: results.monthlyGovernanceTotal, color: '#f59e0b' },
  ];

  const formatValue = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatUnitValue = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return `$${val.toFixed(3)}`;
  };

  return (
    <div className="space-y-8">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-indigo-50 border-indigo-100">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Setup (One-time)</p>
          <h4 className="text-xl font-bold text-indigo-900">{formatValue(results.oneTimeSetupTotal)}</h4>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ops (Monthly)</p>
          <h4 className="text-xl font-bold text-emerald-900">{formatValue(results.monthlyOpsTotal)}</h4>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Gov (Monthly)</p>
          <h4 className="text-xl font-bold text-amber-900">{formatValue(results.monthlyGovernanceTotal)}</h4>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Unit Cost</p>
          <h4 className="text-xl font-bold text-slate-900">{formatUnitValue(results.unitCostPerInteraction)}</h4>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annualized Total</p>
          <h4 className="text-xl font-bold text-white">{formatValue(results.annualizedTotal)}</h4>
          <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-tight leading-tight">
            Total estimated annual cost (setup + 12 months of operation & governance)
          </p>
        </Card>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="flex border-b border-slate-200">
        {[
          { id: RagStep.BUILD, label: '1. Build & Ingest' },
          { id: RagStep.RUN, label: '2. Run (Ops)' },
          { id: RagStep.GOVERN, label: '3. Govern & Improve' }
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeStep === step.id 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {activeStep === RagStep.BUILD && (
            <Card title="Step 1: Build & Ingest Settings">
              <InputWrapper label="Total Documents">
                <Slider min={100} max={50000} step={100} value={inputs.numDocs} onChange={(v) => setInputs({ ...inputs, numDocs: v })} />
              </InputWrapper>
              <InputWrapper label="Avg Tokens per Doc">
                <Slider min={100} max={10000} step={100} value={inputs.tokensPerDoc} onChange={(v) => setInputs({ ...inputs, tokensPerDoc: v })} />
              </InputWrapper>
              <InputWrapper label="Parsing Cost per Doc ($)">
                <Slider min={0} max={1} step={0.01} value={inputs.parsingCostPerDoc} onChange={(v) => setInputs({ ...inputs, parsingCostPerDoc: v })} unit="$" />
              </InputWrapper>
              <InputWrapper label="Embedding Model">
                <select 
                  value={inputs.ingestionModelId}
                  onChange={(e) => setInputs({ ...inputs, ingestionModelId: e.target.value })}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {EMBEDDING_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.dimension}d)</option>
                  ))}
                </select>
              </InputWrapper>
              <InputWrapper label="Chunk Size (Tokens)">
                <Slider min={100} max={2000} step={50} value={inputs.chunkSize} onChange={(v) => setInputs({ ...inputs, chunkSize: v })} />
              </InputWrapper>
              <InputWrapper label="Overlap %">
                <Slider min={0} max={50} step={5} value={inputs.overlapPct} onChange={(v) => setInputs({ ...inputs, overlapPct: v })} unit="%" />
              </InputWrapper>
            </Card>
          )}

          {activeStep === RagStep.RUN && (
            <Card title="Step 2: Monthly Run Settings">
              <InputWrapper label="Monthly Query Volume">
                <Slider min={100} max={100000} step={100} value={inputs.queriesPerMonth} onChange={(v) => setInputs({ ...inputs, queriesPerMonth: v })} />
              </InputWrapper>
              <InputWrapper label="Inference LLM">
                <select 
                  value={inputs.inferenceModelId}
                  onChange={(e) => setInputs({ ...inputs, inferenceModelId: e.target.value })}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {INFERENCE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </InputWrapper>
              <InputWrapper label="Retrieved Chunks per Query">
                <Slider min={1} max={20} step={1} value={inputs.retrievedChunks} onChange={(v) => setInputs({ ...inputs, retrievedChunks: v })} />
              </InputWrapper>
              <InputWrapper label="Managed DB Rate ($/1K Vectors/Mo)">
                <Slider min={0} max={2} step={0.05} value={inputs.managedDbCostPer1kVectors} onChange={(v) => setInputs({ ...inputs, managedDbCostPer1kVectors: v })} unit="$" />
              </InputWrapper>
              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  checked={inputs.rerankerEnabled} 
                  onChange={(e) => setInputs({ ...inputs, rerankerEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-slate-700">Enable Reranker</label>
              </div>
              <InputWrapper label="Cache Hit Rate %">
                <Slider min={0} max={90} step={5} value={inputs.cacheHitRatePct} onChange={(v) => setInputs({ ...inputs, cacheHitRatePct: v })} unit="%" />
              </InputWrapper>
            </Card>
          )}

          {activeStep === RagStep.GOVERN && (
            <Card title="Step 3: Governance Settings">
              <InputWrapper label="Eval Runs per Month">
                <Slider min={0} max={20} step={1} value={inputs.evalRunsPerMonth} onChange={(v) => setInputs({ ...inputs, evalRunsPerMonth: v })} />
              </InputWrapper>
              <InputWrapper label="Human Review Hours/Mo">
                <Slider min={0} max={160} step={1} value={inputs.humanReviewHours} onChange={(v) => setInputs({ ...inputs, humanReviewHours: v })} />
              </InputWrapper>
              <InputWrapper label="Human Review Rate ($/hr)">
                <Slider min={20} max={250} step={10} value={inputs.humanHourlyRate} onChange={(v) => setInputs({ ...inputs, humanHourlyRate: v })} unit="$" />
              </InputWrapper>
              <InputWrapper label="Re-indexing Frequency (per yr)">
                <Slider min={0} max={12} step={1} value={inputs.reindexFrequencyPerYear} onChange={(v) => setInputs({ ...inputs, reindexFrequencyPerYear: v })} />
              </InputWrapper>
            </Card>
          )}
        </div>

        {/* Cost Breakdowns & Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card title={`${activeStep} Lifecycle Breakdown`}>
             <div className="space-y-4 mb-6">
               {activeStep === RagStep.BUILD && (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Effective Tokens</p>
                      <p className="text-lg font-bold text-slate-900">{(results.effectiveTokensAfterOverlap / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vectors</p>
                      <p className="text-lg font-bold text-slate-900">{results.totalChunks.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Embedding Cost</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(results.oneTimeEmbeddingCost)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Storage Size</p>
                      <p className="text-lg font-bold text-slate-900">{results.storageSizeGb.toFixed(3)} GB</p>
                    </div>
                 </div>
               )}

               {activeStep === RagStep.RUN && (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Context/Query</p>
                      <p className="text-lg font-bold text-slate-900">{(inputs.retrievedChunks * inputs.chunkSize).toLocaleString()} tokens</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Monthly DB Ops</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(results.breakout.db)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Unit Cost</p>
                      <p className="text-lg font-bold text-slate-900">{formatUnitValue(results.unitCostPerInteraction)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Cache Savings</p>
                      <p className="text-lg font-bold text-slate-900">{inputs.cacheHitRatePct}%</p>
                    </div>
                 </div>
               )}

               {activeStep === RagStep.GOVERN && (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Human Review</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(inputs.humanReviewHours * inputs.humanHourlyRate)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Monitoring</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(inputs.queriesPerMonth / 1000 * inputs.monitoringCostPer1k)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Evaluation</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(results.breakout.gov - (inputs.humanReviewHours * inputs.humanHourlyRate) - (inputs.queriesPerMonth / 1000 * inputs.monitoringCostPer1k))}</p>
                    </div>
                 </div>
               )}
             </div>

             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={summaryData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} />
                   <YAxis hide />
                   <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                   <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                     {summaryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </Card>

          <Card title="Strategic Decision Levers">
            <div className="space-y-4">
              {activeStep === RagStep.BUILD && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Build Optimization</p>
                  <ul className="text-xs text-blue-700 space-y-2 list-disc pl-4">
                    <li>Reducing <strong>overlap</strong> directly lowers one-time embedding costs.</li>
                    <li>Smaller <strong>chunk sizes</strong> increase retrieval precision but raise vector DB storage counts.</li>
                    <li>Indexing only critical metadata saves storage bytes and retrieval latency.</li>
                  </ul>
                </div>
              )}
              {activeStep === RagStep.RUN && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <p className="text-sm font-semibold text-emerald-800 mb-2">Ops Optimization</p>
                  <ul className="text-xs text-emerald-700 space-y-2 list-disc pl-4">
                    <li>Focus on <strong>Cache Hit Rate</strong>. Every 10% improvement drastically lowers inference OPEX.</li>
                    <li>Limit <strong>Retrieved Chunks</strong> to the minimum required for accuracy to save input token costs.</li>
                    <li>Consider using a 'Flash' model for simple queries and routing complex ones to 'Pro'.</li>
                  </ul>
                </div>
              )}
              {activeStep === RagStep.GOVERN && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Governance Levers</p>
                  <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4">
                    <li>Use <strong>Model-based Eval</strong> to reduce expensive human review hours.</li>
                    <li>Optimize re-indexing frequency; full re-indexes are costly setup events.</li>
                    <li>Retention policies on vector metadata can control storage creep over time.</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Current Lifecycle Assumptions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800 mb-1">Build Assumption</p>
            <p>Effective tokens are calculated as <strong>Base Tokens × (1 + Overlap %)</strong>. Each float32 vector element consumes 4 bytes of storage.</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-1">Run Assumption</p>
            <p>Inference cost reflects the volume after <strong>Cache Hit Rate</strong> reduction. Reranking is estimated at a per-1,000 query rate.</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-1">Govern Assumption</p>
            <p>Annualized re-indexing assumes a fraction of the initial setup cost recurring monthly based on frequency.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
