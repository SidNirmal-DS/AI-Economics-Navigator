
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

/**
 * Normalizes input values to finite numbers, cleaning strings if necessary.
 */
const safeToNumber = (val: any, fallback: number = 0): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const RagCalc: React.FC<Props> = ({ inputs, setInputs }) => {
  const [activeStep, setActiveStep] = useState<RagStep>(RagStep.BUILD);
  
  // Ensure selected models exist to prevent property access on undefined
  const selectedEmbedding = EMBEDDING_MODELS.find(m => m.id === inputs.ingestionModelId) || EMBEDDING_MODELS[0];
  const selectedInference = INFERENCE_MODELS.find(m => m.id === inputs.inferenceModelId) || INFERENCE_MODELS[0];

  const results = useMemo(() => {
    // 1. Normalize all inputs safely
    const numDocs = safeToNumber(inputs.numDocs);
    const tokensPerDoc = safeToNumber(inputs.tokensPerDoc);
    const parsingCostPerDoc = safeToNumber(inputs.parsingCostPerDoc);
    const chunkSize = safeToNumber(inputs.chunkSize, 500); // chunk size should not be 0
    const overlapPct = safeToNumber(inputs.overlapPct);
    const metadataOverheadPct = safeToNumber(inputs.metadataOverheadPct);
    
    const queriesPerMonth = safeToNumber(inputs.queriesPerMonth);
    const avgQueryTokens = safeToNumber(inputs.avgQueryTokens);
    const retrievedChunks = safeToNumber(inputs.retrievedChunks);
    const avgAnswerTokens = safeToNumber(inputs.avgAnswerTokens);
    const cacheHitRatePct = safeToNumber(inputs.cacheHitRatePct);
    const managedDbCostPer1kVectors = safeToNumber(inputs.managedDbCostPer1kVectors);
    const rerankerCostPer1k = safeToNumber(inputs.rerankerCostPer1k);
    
    const monitoringCostPer1k = safeToNumber(inputs.monitoringCostPer1k);
    const evalRunsPerMonth = safeToNumber(inputs.evalRunsPerMonth);
    const evalTokensPerRun = safeToNumber(inputs.evalTokensPerRun);
    const humanReviewHours = safeToNumber(inputs.humanReviewHours);
    const humanHourlyRate = safeToNumber(inputs.humanHourlyRate);
    const reindexFrequencyPerYear = safeToNumber(inputs.reindexFrequencyPerYear);

    // --- STEP 1: Build & Ingest ---
    const totalTokensBase = numDocs * tokensPerDoc;
    const effectiveTokensAfterOverlap = totalTokensBase * (1 + overlapPct / 100);
    const totalChunks = Math.ceil(effectiveTokensAfterOverlap / chunkSize) || 0;
    
    const oneTimeParsingCost = numDocs * parsingCostPerDoc;
    const embCostRate = safeToNumber(selectedEmbedding.costPerMillionTokens);
    const oneTimeEmbeddingCost = (effectiveTokensAfterOverlap / 1_000_000) * embCostRate;
    const oneTimeSetupTotal = oneTimeParsingCost + oneTimeEmbeddingCost;

    const vectorDataBytes = totalChunks * (safeToNumber(selectedEmbedding.dimension)) * 4;
    const storageSizeGb = (vectorDataBytes * (1 + metadataOverheadPct / 100)) / (1024 * 1024 * 1024);
    
    // --- STEP 2: Run ---
    const queryEmbeddingCostMonthly = (queriesPerMonth * avgQueryTokens / 1_000_000) * embCostRate;
    const dbOpsMonthly = (totalChunks / 1000) * managedDbCostPer1kVectors;
    const rerankMonthly = inputs.rerankerEnabled ? (queriesPerMonth / 1000) * rerankerCostPer1k : 0;
    
    const tokensPerQueryIn = avgQueryTokens + (retrievedChunks * chunkSize);
    const cacheDiscount = cacheHitRatePct / 100;
    const effectiveQueries = queriesPerMonth * (1 - cacheDiscount);
    
    const infInputRate = safeToNumber(selectedInference.costPerMillionInputTokens);
    const infOutputRate = safeToNumber(selectedInference.costPerMillionOutputTokens);
    
    const monthlyInferenceInputCost = (effectiveQueries * tokensPerQueryIn / 1_000_000) * infInputRate;
    const monthlyInferenceOutputCost = (effectiveQueries * avgAnswerTokens / 1_000_000) * infOutputRate;
    
    const monthlyOpsTotal = queryEmbeddingCostMonthly + dbOpsMonthly + rerankMonthly + monthlyInferenceInputCost + monthlyInferenceOutputCost;
    const unitCostPerInteraction = queriesPerMonth > 0 ? (monthlyOpsTotal / queriesPerMonth) : 0;

    // --- STEP 3: Govern & Improve ---
    const monitoringMonthly = (queriesPerMonth / 1000) * monitoringCostPer1k;
    const evalMonthly = (evalRunsPerMonth * evalTokensPerRun / 1_000_000) * infInputRate;
    const humanMonthly = humanReviewHours * humanHourlyRate;
    const reindexMonthly = oneTimeSetupTotal * (reindexFrequencyPerYear / 12);
    
    const monthlyGovernanceTotal = monitoringMonthly + evalMonthly + humanMonthly + reindexMonthly;
    
    // Final Calculation: Setup + (Ops * 12) + (Gov * 12)
    const annualizedTotal = oneTimeSetupTotal + (monthlyOpsTotal * 12) + (monthlyGovernanceTotal * 12);

    return {
      oneTimeSetupTotal,
      monthlyOpsTotal,
      monthlyGovernanceTotal,
      annualizedTotal,
      unitCostPerInteraction,
      totalChunks,
      storageSizeGb,
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
    if (val === undefined || val === null || !Number.isFinite(val)) return "—";
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatUnitValue = (val: number | undefined | null) => {
    if (val === undefined || val === null || !Number.isFinite(val)) return "—";
    return `$${val.toFixed(3)}`;
  };

  return (
    <div className="space-y-8">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-indigo-50 border-indigo-100">
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Setup (One-time)</p>
          <h4 className="text-xl font-bold text-indigo-900">{formatValue(results.oneTimeSetupTotal)}</h4>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Ops (Monthly)</p>
          <h4 className="text-xl font-bold text-emerald-900">{formatValue(results.monthlyOpsTotal)}</h4>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Gov (Monthly)</p>
          <h4 className="text-xl font-bold text-amber-900">{formatValue(results.monthlyGovernanceTotal)}</h4>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Unit Cost</p>
          <h4 className="text-xl font-bold text-slate-900">{formatUnitValue(results.unitCostPerInteraction)}</h4>
        </Card>
        <Card className="bg-indigo-100 border-indigo-300 ring-1 ring-indigo-200 shadow-sm">
          <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Annualized Total</p>
          <h4 className="text-2xl font-black text-indigo-900">{formatValue(results.annualizedTotal)}</h4>
          <p className="text-[9px] text-indigo-700 mt-1 uppercase tracking-tight leading-tight font-bold">
            Total estimated annual cost (setup + 12 months of operation & governance)
          </p>
        </Card>
      </div>

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
                  className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                  {EMBEDDING_MODELS.map(m => (
                    <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>
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
                  className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                >
                  {INFERENCE_MODELS.map(m => (
                    <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>
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

        <div className="lg:col-span-2 space-y-6">
          <Card title={`${activeStep} Lifecycle Breakdown`}>
             <div className="space-y-4 mb-6">
                {activeStep === RagStep.BUILD && (
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-600 uppercase">Total Vectors</p>
                       <p className="text-lg font-bold text-slate-900">{results.totalChunks.toLocaleString()}</p>
                     </div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-600 uppercase">Storage Size</p>
                       <p className="text-lg font-bold text-slate-900">{results.storageSizeGb.toFixed(3)} GB</p>
                     </div>
                  </div>
                )}
                {activeStep === RagStep.RUN && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-600 uppercase">Monthly DB Ops</p>
                       <p className="text-lg font-bold text-slate-900">{formatValue(results.breakout.db)}</p>
                     </div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-600 uppercase">Inference (Monthly)</p>
                       <p className="text-lg font-bold text-slate-900">{formatValue(results.breakout.inference)}</p>
                     </div>
                  </div>
                )}
                {activeStep === RagStep.GOVERN && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-600 uppercase">Governance (Monthly)</p>
                       <p className="text-lg font-bold text-slate-900">{formatValue(results.breakout.gov)}</p>
                     </div>
                  </div>
                )}
             </div>

             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={summaryData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569' }} />
                   <YAxis hide />
                   <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                     labelStyle={{ color: '#1e293b' }}
                     itemStyle={{ color: '#1e293b' }}
                     formatter={(v) => `$${Number(v).toFixed(0)}`} 
                   />
                   <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                     {summaryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};