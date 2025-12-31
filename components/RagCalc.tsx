import React, { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { InputWrapper, Slider } from './ui/Input';
import { INFERENCE_MODELS, EMBEDDING_MODELS, DEFAULT_RAG_INPUTS } from '../constants';
import { RagInputs } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  inputs: RagInputs;
  setInputs: (val: RagInputs) => void;
}

enum RagStep {
  BUILD = 'BUILD',
  RUN = 'RUN',
  GOVERN = 'GOVERN'
}

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
  const [showContext, setShowContext] = useState(false);
  
  const selectedEmbedding = EMBEDDING_MODELS.find(m => m.id === inputs.ingestionModelId) || EMBEDDING_MODELS[0];
  const selectedInference = INFERENCE_MODELS.find(m => m.id === inputs.inferenceModelId) || INFERENCE_MODELS[0];

  const results = useMemo(() => {
    const numDocs = safeToNumber(inputs.numDocs);
    const tokensPerDoc = safeToNumber(inputs.tokensPerDoc);
    const parsingCostPerDoc = safeToNumber(inputs.parsingCostPerDoc);
    const chunkSize = safeToNumber(inputs.chunkSize, 500);
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

    const totalTokensBase = numDocs * tokensPerDoc;
    const effectiveTokensAfterOverlap = totalTokensBase * (1 + overlapPct / 100);
    const totalChunks = Math.ceil(effectiveTokensAfterOverlap / chunkSize) || 0;
    
    const oneTimeParsingCost = numDocs * parsingCostPerDoc;
    const embCostRate = safeToNumber(selectedEmbedding.costPerMillionTokens);
    const oneTimeEmbeddingCost = (effectiveTokensAfterOverlap / 1_000_000) * embCostRate;
    const oneTimeSetupTotal = oneTimeParsingCost + oneTimeEmbeddingCost;

    const vectorDataBytes = totalChunks * (safeToNumber(selectedEmbedding.dimension)) * 4;
    // Real-world storage includes metadata overhead and indices
    const storageSizeGb = (vectorDataBytes * (1 + metadataOverheadPct / 100) * 10) / (1024 * 1024 * 1024);
    
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

    const monitoringMonthly = (queriesPerMonth / 1000) * monitoringCostPer1k;
    const evalMonthly = (evalRunsPerMonth * evalTokensPerRun / 1_000_000) * infInputRate;
    const humanMonthly = humanReviewHours * humanHourlyRate;
    const reindexMonthly = oneTimeSetupTotal * (reindexFrequencyPerYear / 12);
    
    const monthlyGovernanceTotal = monitoringMonthly + evalMonthly + humanMonthly + reindexMonthly;
    
    const annualizedTotal = oneTimeSetupTotal + (monthlyOpsTotal * 12) + (monthlyGovernanceTotal * 12);

    const projection = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        name: `M${month}`,
        Setup: Number(oneTimeSetupTotal.toFixed(2)),
        Operations: Number((monthlyOpsTotal * month).toFixed(2)),
        Governance: Number((monthlyGovernanceTotal * month).toFixed(2)),
      };
    });

    return {
      oneTimeSetupTotal,
      monthlyOpsTotal,
      monthlyGovernanceTotal,
      annualizedTotal,
      unitCostPerInteraction,
      totalChunks,
      storageSizeGb,
      projection,
      breakout: {
        parsing: oneTimeParsingCost,
        embedding: oneTimeEmbeddingCost,
        inference: monthlyInferenceInputCost + monthlyInferenceOutputCost,
        db: dbOpsMonthly,
        rerank: rerankMonthly,
        gov: monthlyGovernanceTotal,
        queryEmbedding: queryEmbeddingCostMonthly
      }
    };
  }, [inputs, selectedEmbedding, selectedInference]);

  const applyPreset = (preset: string) => {
    switch(preset) {
      case 'small':
        setInputs({ ...DEFAULT_RAG_INPUTS, numDocs: 100, queriesPerMonth: 500, humanReviewHours: 1 });
        break;
      case 'enterprise':
        setInputs({ ...DEFAULT_RAG_INPUTS, numDocs: 100000, queriesPerMonth: 50000, managedDbCostPer1kVectors: 0.15, humanReviewHours: 20 });
        break;
      case 'high-quality':
        setInputs({ ...DEFAULT_RAG_INPUTS, humanReviewHours: 40, evalRunsPerMonth: 10, retrievedChunks: 10 });
        break;
      case 'high-volume':
        setInputs({ ...DEFAULT_RAG_INPUTS, queriesPerMonth: 200000, cacheHitRatePct: 40 });
        break;
    }
  };

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
      {/* Scenario Presets */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => applyPreset('small')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 transition-colors">Small Scale</button>
        <button onClick={() => applyPreset('enterprise')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 transition-colors">Enterprise Scale</button>
        <button onClick={() => applyPreset('high-quality')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 transition-colors">High Quality</button>
        <button onClick={() => applyPreset('high-volume')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 transition-colors">High Query Volume</button>
      </div>

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
          <p className="text-[9px] text-indigo-700 mt-1 uppercase tracking-tight leading-tight font-bold">Total Year 1 Spend</p>
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
                <Slider min={100} max={500000} step={100} value={inputs.numDocs} onChange={(v) => setInputs({ ...inputs, numDocs: v })} />
              </InputWrapper>
              <InputWrapper label="Avg Tokens per Doc">
                <Slider min={100} max={10000} step={100} value={inputs.tokensPerDoc} onChange={(v) => setInputs({ ...inputs, tokensPerDoc: v })} />
              </InputWrapper>
              <InputWrapper label="Parsing Cost per Doc ($)" description="Cost to extract text from complex file types. Affects setup budget.">
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
              <InputWrapper label="Chunk Size (Tokens)" description="Smaller chunks improve context precision but increase vector count.">
                <Slider min={100} max={2000} step={50} value={inputs.chunkSize} onChange={(v) => setInputs({ ...inputs, chunkSize: v })} />
              </InputWrapper>
              <InputWrapper label="Overlap %" description="Maintains knowledge continuity between adjacent chunks.">
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
              <InputWrapper label="Managed DB Rate ($/1K Vectors/Mo)">
                <Slider min={0} max={2} step={0.05} value={inputs.managedDbCostPer1kVectors} onChange={(v) => setInputs({ ...inputs, managedDbCostPer1kVectors: v })} unit="$" />
              </InputWrapper>
              <InputWrapper label="Cache Hit Rate %">
                <Slider min={0} max={90} step={5} value={inputs.cacheHitRatePct} onChange={(v) => setInputs({ ...inputs, cacheHitRatePct: v })} unit="%" />
              </InputWrapper>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ops Cost Breakdown</h5>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between"><span>Vector database hosting</span><span className="font-bold">{formatValue(results.breakout.db)}</span></div>
                  <div className="flex justify-between"><span>Query processing (LLM)</span><span className="font-bold">{formatValue(results.breakout.inference)}</span></div>
                  <div className="flex justify-between"><span>Embedding refresh</span><span className="font-bold">{formatValue(results.breakout.queryEmbedding)}</span></div>
                  <div className="flex justify-between"><span>Storage footprint</span><span className="font-bold">{formatValue(results.storageSizeGb < 0.1 ? 0.01 : results.storageSizeGb * 0.1)}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900">
                    <span>Total Monthly Ops Cost:</span>
                    <span>~{formatValue(results.monthlyOpsTotal)}/mo</span>
                  </div>
                </div>
              </div>
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
              
              <div className="mt-4 p-5 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 leading-relaxed font-medium">
                <p className="font-bold mb-2 uppercase tracking-tight">What this includes</p>
                <ul className="list-disc pl-4 space-y-1 mb-4">
                  <li>Human review of a subset of queries</li>
                  <li>Quality evaluation & monitoring</li>
                  <li>Prompt / retrieval tuning</li>
                  <li>Incident handling & documentation</li>
                </ul>
                <p className="font-bold border-t border-amber-200 pt-2 italic">
                  Lower accuracy requirements reduce governance cost; higher reliability standards increase it.
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="12-Month Cumulative Cost Projection">
             <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={results.projection}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                     formatter={(v) => `$${Number(v).toLocaleString()}`} 
                   />
                   <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                   <Bar dataKey="Setup" stackId="a" fill="#4f46e5" />
                   <Bar dataKey="Operations" stackId="a" fill="#10b981" />
                   <Bar dataKey="Governance" stackId="a" fill="#f59e0b" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
               <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div> Setup (Initial)</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Operations (Cumulative)</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Governance (Cumulative)</div>
             </div>
          </Card>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button 
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Cost context: RAG vs alternatives</span>
              <span className="text-slate-400 text-xs">{showContext ? '↑' : '↓'}</span>
            </button>
            {showContext && (
              <div className="p-5 text-xs text-slate-700 font-medium leading-relaxed space-y-2 bg-white">
                <p>• <strong>Building your own RAG system (this model):</strong> ~{formatValue(results.annualizedTotal)}/year. Provides full control and data privacy.</p>
                <p>• <strong>Fine-tuning a model:</strong> $500–2,000 one-time. Limited flexibility and no real-time document security.</p>
                <p>• <strong>Third-party RAG platforms:</strong> $200–500/month. Lower maintenance but recurring subscription and external dependency.</p>
                <p>• <strong>Manual search and curation:</strong> $10,000–50,000/year in lost labor productivity.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Estimated Storage Footprint</p>
              <p className="text-sm font-bold text-slate-900">{results.storageSizeGb.toFixed(3)} GB (incl. metadata)</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase text-right">Total Vector Chunks</p>
              <p className="text-sm font-bold text-slate-900 text-right">{results.totalChunks.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};