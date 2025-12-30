
import React from 'react';

interface InputWrapperProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const InputWrapper: React.FC<InputWrapperProps> = ({ label, description, children }) => (
  <div className="mb-6">
    <label className="block text-sm font-bold text-slate-800 mb-1">{label}</label>
    {children}
    {description && <p className="mt-1 text-xs text-slate-600 font-medium">{description}</p>}
  </div>
);

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
}

export const Slider: React.FC<SliderProps> = ({ value, min, max, step = 1, onChange, unit = "" }) => (
  <div className="flex items-center gap-4">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
    <div className="min-w-[80px] text-right font-mono text-sm font-bold text-slate-900">
      {value.toLocaleString()}{unit}
    </div>
  </div>
);
