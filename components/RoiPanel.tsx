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
  const [showValueDetails, setShowValueDetails] = useState(false);
  const [showRoiDetails, setShowRoiDetails] = useState(false);
  const [graphInsight, setGraphInsight] = useState<string>("");
  const [isNarrating, setIsNarrating] = useState<boolean>(false);

  // Baseline assumption for calculation logic
  const ASSUMED_QUERIES_PER_USER = 200; // Queries per user per month baseline

  const results = useMemo(() => {
    // Total monthly requests across all users
    const totalRequestsMonthly = inputs.numUsers * ASSUMED_QUERIES_PER_USER;
    
    // Total hours saved = (Mins saved per query / 60) * total requests
    const hoursSavedMonthly = (inputs.timeSavedPerQuery / 60) * totalRequestsMonthly;
    
    // Value = hours saved * employee hourly rate
    const monthlyValue = hoursSavedMonthly * inputs.employeeHourlyRate;
    
    const netRoi = monthlyValue - aiCostMonthly;
    const breakEvenMonths = aiCostMonthly > 0 ? (aiCostMonthly / monthlyValue) : 0;

    const projection = Array.from({ length: 12 }, (_, i) => ({
      month: `Month ${i + 1}`,
      cost: Number((aiCostMonthly * (i + 1)).toFixed(0)),
      value: Number((monthlyValue * (i + 1)).toFixed(0)),
      profit: Number(((monthlyValue - aiCostMonthly) * (i + 1)).toFixed(0)),
    }));

    return { 
      monthlyValue, 
      netRoi, 
      breakEvenMonths, 
      projection,
      totalRequestsMonthly,
      hoursSavedMonthly
    };
  }, [inputs, aiCostMonthly]);

  useEffect(() => {
    const fetchInsight = async () => {
      setIsNarrating(true);
      const text = await getRoiGraphInsight(results.projection);
      // Remove any unwanted title prefix if the model includes it
      const cleaned = text?.replace(/^Graph Insight:?\s*/i, '').trim();
      setGraphInsight(cleaned || "");
      setIsNarrating(false);
    };
    
    const timeout = setTimeout(fetchInsight, 1000);
    return () => clearTimeout(timeout);
  }, [results.projection]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card title="ROI Assumptions">
        <InputWrapper label="Time Saved per Request (Mins)" description="Estimate how long this task takes a human today.">
          <Slider min={1} max={60} step={1} value={inputs.timeSavedPerQuery} onChange={(v) => setInputs({ ...inputs, timeSavedPerQuery: v })} />
        </InputWrapper>
        <InputWrapper label="Employee Hourly Rate ($)" description="Blended fully-loaded cost of employees.">
          <Slider min={15} max={250} step={5} value={inputs.employeeHourlyRate} onChange={(v) => setInputs({ ...inputs, employeeHourlyRate: v })} />
        </InputWrapper>
        <InputWrapper label="Total System Users">
          <Slider min={1} max={1000} step={1} value={inputs.numUsers} onChange={(v) => setInputs({ ...inputs, numUsers: v })} />
        </InputWrapper>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <p className="text-sm font-semibold text-emerald-600">Projected Monthly Value</p>
            <h4 className="text-3xl font-bold text-emerald-900">${results.monthlyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
            <p className="text-xs text-emerald-500 mt-1">Based on productivity gains</p>
            
            <button 
              onClick={() => setShowValueDetails(!showValueDetails)}
              className="mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1"
            >
              {showValueDetails ? 'Hide details ↑' : 'View details ↓'}
            </button>

            {showValueDetails && (
              <div className="mt-3 space-y-2 p-3 bg-white/60 rounded text-[11px] text-emerald-800 leading-relaxed border border-emerald-100 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Time saved per request:</span>
                  <span className="font-semibold">{inputs.timeSavedPerQuery} mins</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Total requests per month:</span>
                  <span className="font-semibold">{results.totalRequestsMonthly.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Total users:</span>
                  <span className="font-semibold">{inputs.numUsers}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Total hours saved per month:</span>
                  <span className="font-semibold">{results.hoursSavedMonthly.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Employee hourly cost:</span>
                  <span className="font-semibold">${inputs.employeeHourlyRate}/hr</span>
                </div>
                <div className="flex justify-between font-bold pt-1">
                  <span>Gross productivity value:</span>
                  <span>${results.monthlyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="mt-2 text-[10px] italic text-emerald-600 font-medium">
                  This represents operational productivity gains and efficiency value, not realized revenue.
                </p>
              </div>
            )}
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <p className="text-sm font-semibold text-slate-400">Net Productivity ROI</p>
            <h4 className="text-3xl font-bold text-white">${results.netRoi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h4>
            <p className="text-xs text-slate-500 mt-1">After deducting AI API costs</p>

            <button 
              onClick={() => setShowRoiDetails(!showRoiDetails)}
              className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {showRoiDetails ? 'Hide details ↑' : 'View details ↓'}
            </button>

            {showRoiDetails && (
              <div className="mt-3 space-y-2 p-3 bg-slate-800 rounded text-[11px] text-slate-300 leading-relaxed border border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between border-b border-slate-700 pb-1">
                  <span>Monthly productivity value:</span>
                  <span className="font-semibold text-white">${results.monthlyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 pb-1">
                  <span>Monthly AI infrastructure cost:</span>
                  <span className="font-semibold text-red-400">-${aiCostMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 text-emerald-400">
                  <span>Final net economic gain:</span>
                  <span>${results.netRoi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="mt-2 text-[10px] italic text-slate-400 font-medium">
                  Net ROI reflects productivity impact after AI operating costs, not direct financial profit.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex justify-center -mt-2">
          <p className="text-[10px] text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Modeled productivity value. Not financial revenue.
          </p>
        </div>

        <Card title="12-Month Net Productivity Gain Projection">
          <div className="h-[480px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={results.projection} 
                margin={{ top: 10, right: 30, bottom: 60, left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dy={10}
                  label={{ 
                    value: 'Month of Operation', 
                    position: 'insideBottom', 
                    offset: -40, 
                    fill: '#475569', 
                    fontSize: 12, 
                    fontWeight: 600,
                    style: { textAnchor: 'middle' }
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  label={{ 
                    value: 'Cumulative Economic Impact (USD)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: -85, 
                    fill: '#475569', 
                    fontSize: 12, 
                    fontWeight: 600,
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend 
                  verticalAlign="top" 
                  align="center" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '30px' }} 
                />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Business Value (Productivity)" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Accumulated AI Cost" />
                <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} name="Net Economic Gain" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-end mb-3">
              {isNarrating && (
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              {isNarrating ? (
                <p className="text-slate-400 text-sm italic">Analyzing projection data...</p>
              ) : graphInsight ? (
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                  {graphInsight}
                </p>
              ) : (
                <p className="text-slate-400 text-sm italic">Analysis unavailable.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};