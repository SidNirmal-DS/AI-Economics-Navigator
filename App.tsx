
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalculatorTab, TranslationInputs, RagInputs, RoiInputs } from './types';
import { 
  DEFAULT_TRANSLATION_INPUTS, 
  DEFAULT_RAG_INPUTS, 
  DEFAULT_ROI_INPUTS,
  TRANSLATION_MODELS,
  INFERENCE_MODELS
} from './constants';
import { TranslationCalc } from './components/TranslationCalc';
import { RagCalc } from './components/RagCalc';
import { RoiPanel } from './components/RoiPanel';
import { HomePage } from './components/HomePage';
import { getAiAnalysis, getRoiExecutiveInsight } from './services/geminiService';
import { Card } from './components/ui/Card';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>(CalculatorTab.HOME);
  const [transInputs, setTransInputs] = useState<TranslationInputs>(DEFAULT_TRANSLATION_INPUTS);
  const [ragInputs, setRagInputs] = useState<RagInputs>(DEFAULT_RAG_INPUTS);
  const [roiInputs, setRoiInputs] = useState<RoiInputs>(DEFAULT_ROI_INPUTS);
  
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const ASSUMED_QUERIES_PER_USER = 200;

  const currentAiMonthlyCost = useMemo(() => {
    if (activeTab === CalculatorTab.TRANSLATION) {
      return (transInputs.numDocs * transInputs.charsPerDoc * (transInputs.monthlyGrowth/100) / 1000000) * (TRANSLATION_MODELS.find(m => m.id === transInputs.modelId)?.costPerMillionChars || 0);
    }
    return (ragInputs.queriesPerMonth * (ragInputs.avgQueryTokens + (ragInputs.retrievedChunks * (ragInputs.chunkSize))) / 1000000) * (INFERENCE_MODELS.find(m => m.id === ragInputs.inferenceModelId)?.costPerMillionInputTokens || 0);
  }, [activeTab, transInputs, ragInputs]);

  const projectionData = useMemo(() => {
    const totalRequestsMonthly = roiInputs.numUsers * ASSUMED_QUERIES_PER_USER;
    const hoursSavedMonthly = (roiInputs.timeSavedPerQuery / 60) * totalRequestsMonthly;
    const monthlyValue = hoursSavedMonthly * roiInputs.employeeHourlyRate;
    
    return Array.from({ length: 12 }, (_, i) => ({
      month: `Month ${i + 1}`,
      cost: Number((currentAiMonthlyCost * (i + 1)).toFixed(0)),
      value: Number((monthlyValue * (i + 1)).toFixed(0)),
      profit: Number(((monthlyValue - currentAiMonthlyCost) * (i + 1)).toFixed(0)),
    }));
  }, [roiInputs, currentAiMonthlyCost]);

  const triggerAnalysis = useCallback(async () => {
    if (activeTab === CalculatorTab.HOME) return;
    setIsAnalyzing(true);
    let analysis = "";

    if (activeTab === CalculatorTab.ROI) {
      analysis = await getRoiExecutiveInsight(projectionData);
    } else {
      let context = "";
      let data: any = {};
      if (activeTab === CalculatorTab.TRANSLATION) {
        context = "Translation Strategy";
        data = { ...transInputs, estimatedMonthlyCost: currentAiMonthlyCost };
      } else if (activeTab === CalculatorTab.RAG) {
        context = "RAG System Lifecycle and Optimization";
        data = { ...ragInputs };
      }
      analysis = await getAiAnalysis(context, data);
    }
    
    setAiInsight(analysis || "Failed to generate insight.");
    setIsAnalyzing(false);
  }, [activeTab, transInputs, ragInputs, currentAiMonthlyCost, projectionData]);

  const renderInsight = (text: string) => {
    if (!text) return <p className="text-slate-500 italic">No analysis available.</p>;
    const isSingleParagraphTab = activeTab === CalculatorTab.RAG || activeTab === CalculatorTab.ROI;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    
    return lines.map((line, i) => {
      const match = line.match(/^(?:\d+\.\s*)?\*\*(.*?)\*\*[:\s]+(.*)/);
      if (match && !isSingleParagraphTab) {
        return (
          <div key={i} className="mb-6 last:mb-0">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-1">{match[1]}</h4>
            <p className="text-slate-600 text-sm leading-relaxed font-normal">{match[2]}</p>
          </div>
        );
      }
      return (
        <p key={i} className={`text-slate-600 text-sm leading-relaxed mb-4 last:mb-0 ${isSingleParagraphTab ? 'italic' : ''}`}>
          {line.replace(/\*\*/g, '').replace(/^AI Strategic Brief:?\s*/i, '').replace(/^Executive Insight:?\s*/i, '')}
        </p>
      );
    });
  };

  useEffect(() => {
    triggerAnalysis();
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setActiveTab(CalculatorTab.HOME)}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">∑</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Economics Navigator</h1>
          </div>
          <nav className="flex items-center space-x-1">
            <button 
              onClick={() => setActiveTab(CalculatorTab.HOME)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === CalculatorTab.HOME ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveTab(CalculatorTab.TRANSLATION)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === CalculatorTab.TRANSLATION ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Translation
            </button>
            <button 
              onClick={() => setActiveTab(CalculatorTab.RAG)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === CalculatorTab.RAG ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              RAG Systems
            </button>
            <button 
              onClick={() => setActiveTab(CalculatorTab.ROI)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === CalculatorTab.ROI ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              ROI Simulation
            </button>
          </nav>
        </div>
      </header>

      {activeTab === CalculatorTab.HOME ? (
        <HomePage onNavigate={(tab) => setActiveTab(tab)} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {activeTab === CalculatorTab.TRANSLATION && "AI Translation Estimator"}
                {activeTab === CalculatorTab.RAG && "RAG System"}
                {activeTab === CalculatorTab.ROI && "Business ROI Simulator"}
              </h2>
              <p className="text-slate-500 mt-2 max-w-2xl">
                {activeTab === CalculatorTab.TRANSLATION && "Evaluate cost and scalability of AI translation to ensure it delivers real business value."}
                {activeTab === CalculatorTab.RAG && "Model the end-to-end cost of a RAG system across its lifecycle."}
                {activeTab === CalculatorTab.ROI && "Compare infrastructure costs against business value created by efficiency gains."}
              </p>
            </div>
            <button 
              onClick={triggerAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Analysis
            </button>
          </div>

          <div className="space-y-8">
            {activeTab === CalculatorTab.TRANSLATION && <TranslationCalc inputs={transInputs} setInputs={setTransInputs} />}
            {activeTab === CalculatorTab.RAG && <RagCalc inputs={ragInputs} setInputs={setRagInputs} />}
            {activeTab === CalculatorTab.ROI && <RoiPanel inputs={roiInputs} setInputs={setRoiInputs} aiCostMonthly={currentAiMonthlyCost} />}
            
            <Card title={activeTab === CalculatorTab.RAG ? "AI Strategic Brief" : activeTab === CalculatorTab.ROI ? "Executive ROI Summary" : "Consultant Analysis"} className="border-slate-200 shadow-lg bg-white">
              <div className="min-h-[60px]">
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Consulting Gemini...</span>
                  </div>
                ) : (
                  <div className="py-2">
                    {renderInsight(aiInsight)}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      )}

      <footer className="mt-12 text-center text-slate-400 text-xs pb-8">
        <p>© 2024 AI Economics Navigator. All estimates are projections based on current API pricing.</p>
      </footer>
    </div>
  );
};

export default App;
