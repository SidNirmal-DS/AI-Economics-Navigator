
import React, { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { InputWrapper, Slider } from './ui/Input';
import { TRANSLATION_MODELS } from '../constants';
import { TranslationInputs } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  inputs: TranslationInputs;
  setInputs: (val: TranslationInputs) => void;
}

export const TranslationCalc: React.FC<Props> = ({ inputs, setInputs }) => {
  const [showInitialBreakdown, setShowInitialBreakdown] = useState(false);
  const [showRecurringBreakdown, setShowRecurringBreakdown] = useState(false);

  const selectedModel = TRANSLATION_MODELS.find(m => m.id === inputs.modelId)!;
  
  const results = useMemo(() => {
    const totalChars = inputs.charsPerDoc * inputs.numDocs;
    const costPerMillion = selectedModel.costPerMillionChars || 0;
    const oneTimeCost = (totalChars / 1_000_000) * costPerMillion;
    
    // Monthly growth logic: Initial Documents × (Growth % / 100)
    const monthlyDocs = Math.round(inputs.numDocs * (inputs.monthlyGrowth / 100));
    const monthlyChars = monthlyDocs * inputs.charsPerDoc;
    const monthlyRecurringCost = (monthlyChars / 1_000_000) * costPerMillion;

    return { 
      totalChars, 
      oneTimeCost, 
      monthlyRecurringCost, 
      monthlyDocs, 
      monthlyChars,
      costPerMillion
    };
  }, [inputs, selectedModel]);

  const chartData = useMemo(() => [
    { name: 'Initial Migration', value: Math.max(0.01, results.oneTimeCost) },
    { name: 'Monthly Recurring', value: Math.max(0.01, results.monthlyRecurringCost) },
  ], [results.oneTimeCost, results.monthlyRecurringCost]);

  const COLORS = ['#4f46e5', '#10b981'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card title="Translation Configuration" className="lg:col-span-1">
        <InputWrapper label="AI Translation Model">
          <select 
            value={inputs.modelId}
            onChange={(e) => setInputs({ ...inputs, modelId: e.target.value })}
            className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {TRANSLATION_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name} (${m.costPerMillionChars}/M chars)</option>
            ))}
          </select>
        </InputWrapper>

        <InputWrapper label="Characters per Document">
          <Slider 
            min={100} max={10000} step={100}
            value={inputs.charsPerDoc} 
            onChange={(v) => setInputs({ ...inputs, charsPerDoc: v })}
          />
        </InputWrapper>

        <InputWrapper label="Initial Volume (Documents)">
          <Slider 
            min={1} max={50000} step={100}
            value={inputs.numDocs} 
            onChange={(v) => setInputs({ ...inputs, numDocs: v })}
          />
        </InputWrapper>

        <InputWrapper 
          label="Monthly Content Growth (%)" 
          description="Represents the percentage growth of new documents per month relative to the initial document volume."
        >
          <Slider 
            min={0} max={50} step={1}
            value={inputs.monthlyGrowth} 
            onChange={(v) => setInputs({ ...inputs, monthlyGrowth: v })}
          />
        </InputWrapper>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-indigo-50 border-indigo-200">
            <p className="text-sm font-medium text-indigo-600">Initial Project Cost</p>
            <h4 className="text-3xl font-bold text-indigo-900">${results.oneTimeCost.toFixed(2)}</h4>
            <p className="text-xs text-indigo-500 mt-1">Based on {(results.totalChars / 1_000_000).toFixed(2)}M characters</p>
            
            <button 
              onClick={() => setShowInitialBreakdown(!showInitialBreakdown)}
              className="mt-3 text-[10px] font-bold uppercase tracking-wider text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1"
            >
              {showInitialBreakdown ? 'Hide details ↑' : 'View calculation details ↓'}
            </button>

            {showInitialBreakdown && (
              <div className="mt-2 p-2 bg-white/50 rounded text-[10px] leading-relaxed text-indigo-800 font-mono animate-in fade-in slide-in-from-top-1 duration-200">
                {inputs.numDocs.toLocaleString()} documents × {inputs.charsPerDoc.toLocaleString()} characters = {results.totalChars.toLocaleString()} characters<br/>
                {results.totalChars.toLocaleString()} ÷ 1,000,000 × ${results.costPerMillion} = ${results.oneTimeCost.toFixed(2)}
              </div>
            )}
          </Card>

          <Card className="bg-emerald-50 border-emerald-200">
            <p className="text-sm font-medium text-emerald-600">Est. Monthly Recurring</p>
            <h4 className="text-3xl font-bold text-emerald-900">${results.monthlyRecurringCost.toFixed(2)}</h4>
            <p className="text-xs text-emerald-500 mt-1">Maintenance for new content</p>

            <button 
              onClick={() => setShowRecurringBreakdown(!showRecurringBreakdown)}
              className="mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1"
            >
              {showRecurringBreakdown ? 'Hide details ↑' : 'View calculation details ↓'}
            </button>
            
            {showRecurringBreakdown && (
              <div className="mt-2 p-2 bg-white/50 rounded text-[10px] leading-relaxed text-emerald-800 font-mono animate-in fade-in slide-in-from-top-1 duration-200">
                {inputs.numDocs.toLocaleString()} documents × {inputs.monthlyGrowth}% growth = {results.monthlyDocs.toLocaleString()} new docs/mo<br/>
                {results.monthlyDocs.toLocaleString()} × {inputs.charsPerDoc.toLocaleString()} characters = {results.monthlyChars.toLocaleString()} characters<br/>
                {results.monthlyChars.toLocaleString()} ÷ 1,000,000 × ${results.costPerMillion} = ${results.monthlyRecurringCost.toFixed(2)}/mo
              </div>
            )}
          </Card>
        </div>

        <Card title="Cost Comparison">
          <div className="h-[300px] min-h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
