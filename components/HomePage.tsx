
import React from 'react';
import { CalculatorTab } from '../types';

interface Props {
  onNavigate: (tab: CalculatorTab) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="relative bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Hero Section: Deep Executive Aesthetic */}
      <section className="relative bg-slate-950 pt-24 pb-44 overflow-hidden">
        {/* Background Depth Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-[0.03] pointer-events-none" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left">
          <div className="max-w-4xl lg:max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Decision Support Intelligence</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-8">
              Navigate the <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-300">Economics</span> <br className="hidden md:block"/> of Intelligence.
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-medium mb-10 max-w-2xl mx-auto lg:mx-0">
              Operational realism for enterprise AI deployment. Measure impact, model hidden costs, and govern lifecycle value with financial precision.
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => onNavigate(CalculatorTab.ROI)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 group"
              >
                Simulate ROI
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button 
                onClick={() => onNavigate(CalculatorTab.RAG)}
                className="px-8 py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 font-bold rounded-xl transition-all backdrop-blur-sm"
              >
                Model RAG Costs
              </button>
            </div>
          </div>
        </div>

        {/* Sophisticated Transition Curve */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden">
           <svg className="absolute bottom-[-1px] w-full h-full fill-[#f8fafc]" viewBox="0 0 1440 120" preserveAspectRatio="none">
             <path d="M0,120 L1440,120 L1440,20 C1000,100 440,0 0,60 Z" />
           </svg>
        </div>
      </section>

      {/* Problem & Approach: High Contrast Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
          <div className="lg:col-span-3 bg-white p-10 md:p-12 rounded-3xl border border-slate-200 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] flex flex-col justify-center">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-6">The Economic Problem</h3>
            <p className="text-xl md:text-2xl text-slate-800 leading-snug font-semibold">
              "Most AI initiatives stall not at technical capability, but at the bridge of <span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-4">economic accountability</span>."
            </p>
            <p className="mt-6 text-slate-600 leading-relaxed font-medium">
              When intelligence becomes a commodity, the primary competitive advantage shifts from model selection to capital efficiency and the measurement of productivity gains.
            </p>
          </div>
          
          <div className="lg:col-span-2 bg-slate-50/80 backdrop-blur-sm p-10 rounded-3xl border border-slate-200 flex flex-col justify-center">
            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-6">Our Approach</h3>
            <h4 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">Intelligence as a Variable Cost.</h4>
            <p className="text-slate-700 leading-relaxed font-medium">
              We move beyond the hype cycle to focus on intelligence as a measurable operational expense. Our approach treats every token and character as a financial unit, ensuring AI systems deliver verifiable economic impact.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Tool Lenses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Tactical Toolsets</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">Three lenses for AI strategy.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <LensCard 
            title="Translation Economics"
            description="Balance latency, throughput, and cost across global scales. Understand financial tradeoffs before committing to production."
            onClick={() => onNavigate(CalculatorTab.TRANSLATION)}
            icon={<path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />}
          />
          <LensCard 
            title="RAG Economics"
            description="Lifecycle accountability for the modern stack. Model true ownership costs from data ingestion through to final inference."
            onClick={() => onNavigate(CalculatorTab.RAG)}
            icon={<path d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />}
          />
          <LensCard 
            title="ROI Simulation"
            description="Converting productivity into economic impact. Model true break-even points through verified labor efficiency gains."
            onClick={() => onNavigate(CalculatorTab.ROI)}
            icon={<path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />}
          />
        </div>
      </section>

      {/* Perspective / Roles Section */}
      <section className="bg-slate-50 py-32 border-y border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-white to-transparent opacity-60 rounded-full blur-[100px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Stakeholders</h3>
              <h4 className="text-4xl font-extrabold text-slate-900 tracking-tight">Who this is for.</h4>
              <p className="text-slate-600 mt-4 font-medium leading-relaxed">
                We bring clarity to every level of the organization, translating model performance into boardroom strategy.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard 
              label="PL"
              title="Product Leaders"
              accent="indigo"
              description="Architect systems that are economically viable at production scale, avoiding invisible infrastructure sprawl and debt."
            />
            <RoleCard 
              label="FE"
              title="Finance Executives"
              accent="emerald"
              description="Audit AI spend against measurable productivity outputs and verifiable efficiency compounding across the enterprise."
            />
            <RoleCard 
              label="AS"
              title="AI Strategy Teams"
              accent="slate"
              description="Provide the board with operational realism and capital efficiency reports over theoretical model potential."
            />
          </div>
        </div>
      </section>

      {/* Closing Statement */}
      <section className="max-w-4xl mx-auto px-4 py-32 text-center">
        <div className="w-16 h-1 bg-indigo-100 mx-auto mb-10 rounded-full" />
        <p className="text-2xl md:text-3xl text-slate-700 leading-relaxed font-semibold italic text-balance">
          "AI Economics Navigator is the decision-first platform for organizations that demand <span className="text-slate-950 not-italic font-extrabold">clarity before deployment</span>."
        </p>
        <p className="mt-8 text-slate-500 font-medium uppercase tracking-[0.2em] text-xs">A decision support tool for the intelligence age.</p>
      </section>

      {/* Refined Footer Gradient Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
    </div>
  );
};

// Subcomponents for cleaner organization
const LensCard: React.FC<{ title: string; description: string; onClick: () => void; icon: React.ReactNode }> = ({ title, description, onClick, icon }) => (
  <div 
    onClick={onClick}
    className="group bg-white p-10 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-[0_30px_60px_-15px_rgba(79,70,229,0.15)] transition-all duration-500 cursor-pointer flex flex-col h-full hover:-translate-y-2"
  >
    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
      <svg className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        {icon}
      </svg>
    </div>
    <h4 className="text-xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-indigo-600 transition-colors">{title}</h4>
    <p className="text-slate-600 leading-relaxed font-medium mb-10 flex-grow">{description}</p>
    <div className="inline-flex items-center gap-2 text-indigo-600 text-sm font-black uppercase tracking-[0.1em] group-hover:gap-3 transition-all">
      Launch Analysis <span>→</span>
    </div>
  </div>
);

const RoleCard: React.FC<{ label: string, title: string, description: string, accent: 'indigo' | 'emerald' | 'slate' }> = ({ label, title, description, accent }) => {
  const accentClasses = {
    indigo: 'from-indigo-500 to-indigo-300 text-indigo-600 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
    emerald: 'from-emerald-500 to-emerald-300 text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
    slate: 'from-slate-600 to-slate-400 text-slate-600 bg-slate-50 border-slate-100 group-hover:bg-slate-800 group-hover:text-white'
  };

  return (
    <div className="group relative bg-white p-10 rounded-3xl border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1">
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r rounded-t-3xl ${accentClasses[accent].split(' ')[0]} ${accentClasses[accent].split(' ')[1]}`}></div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border transition-all duration-300 font-black tracking-tighter text-sm ${accentClasses[accent].split(' ').slice(2).join(' ')}`}>
        {label}
      </div>
      <h5 className="font-extrabold text-slate-900 text-xl mb-4 tracking-tight">{title}</h5>
      <p className="text-slate-700 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
};
