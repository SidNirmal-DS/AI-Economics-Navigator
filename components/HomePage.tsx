
import React from 'react';
import { CalculatorTab } from '../types';

interface Props {
  onNavigate: (tab: CalculatorTab) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section with Visual Curve */}
      <section className="relative bg-slate-900 pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          {/* Abstract Cityscape-like SVG pattern */}
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <rect x="50" y="200" width="40" height="200" fill="white" />
            <rect x="100" y="150" width="30" height="250" fill="white" />
            <rect x="150" y="250" width="50" height="150" fill="white" />
            <rect x="220" y="100" width="20" height="300" fill="white" />
            <rect x="260" y="180" width="40" height="220" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Navigate the <span className="text-indigo-400">Economics</span> of Intelligence.
            </h1>
            <p className="mt-6 text-xl text-slate-400 leading-relaxed font-light">
              Operational realism for enterprise AI deployment. Measure impact, model costs, and govern value with precision.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button 
                onClick={() => onNavigate(CalculatorTab.ROI)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                Simulate ROI
              </button>
              <button 
                onClick={() => onNavigate(CalculatorTab.RAG)}
                className="px-8 py-4 bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold rounded-lg transition-all"
              >
                Model RAG Costs
              </button>
            </div>
          </div>
        </div>

        {/* The Curve Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
           <svg className="absolute bottom-0 w-full h-full fill-[#f8fafc]" viewBox="0 0 1440 100" preserveAspectRatio="none">
             <path d="M0,100 C480,0 960,0 1440,100 L1440,100 L0,100 Z" />
           </svg>
        </div>
      </section>

      {/* Problem & Approach */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xl">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">The Economic Problem</h3>
            <p className="text-lg text-slate-700 leading-relaxed">
              Most AI initiatives stall not at the point of technical capability, but at the bridge of <strong>economic accountability</strong>. When intelligence becomes a commodity, the primary competitive advantage shifts from model selection to capital efficiency and the measurement of productivity gains.
            </p>
          </div>
          <div className="pt-8">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Our Approach</h3>
            <h4 className="text-2xl font-bold text-slate-900 mb-4">Intelligence as a Variable Cost.</h4>
            <p className="text-slate-600 leading-relaxed">
              We move beyond the "revenue hype" cycle to focus on intelligence as a measurable operational expense. Our approach treats every token and character as a financial unit, ensuring that AI systems are evaluated based on their ability to deliver verifiable economic impact.
            </p>
          </div>
        </div>
      </section>

      {/* Three Lenses Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <LensCard 
            title="Translation Economics"
            description="Balance latency, throughput, and cost across global scales. Understand tradeoffs before committing to production."
            onClick={() => onNavigate(CalculatorTab.TRANSLATION)}
            icon="🌐"
          />
          <LensCard 
            title="RAG Economics"
            description="Lifecycle accountability for the modern stack. Model ownership costs from ingestion to inference."
            onClick={() => onNavigate(CalculatorTab.RAG)}
            icon="🧠"
          />
          <LensCard 
            title="ROI Simulation"
            description="Converting productivity into economic impact. Model true break-even points through labor efficiency gains."
            onClick={() => onNavigate(CalculatorTab.ROI)}
            icon="📊"
          />
        </div>
      </section>

      {/* Roles Section */}
      <section className="bg-slate-50 py-24 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Who this is for</h3>
          <div className="flex flex-wrap justify-center gap-12">
            <div className="text-left max-w-xs">
              <h5 className="font-bold text-slate-900 mb-2">Product Leaders</h5>
              <p className="text-sm text-slate-500">Architect systems that are economically viable at production scale, avoiding infrastructure sprawl.</p>
            </div>
            <div className="text-left max-w-xs">
              <h5 className="font-bold text-slate-900 mb-2">Finance Executives</h5>
              <p className="text-sm text-slate-500">Audit AI spend against measurable productivity outputs and verifiable efficiency compounding.</p>
            </div>
            <div className="text-left max-w-xs">
              <h5 className="font-bold text-slate-900 mb-2">AI strategy Teams</h5>
              <p className="text-sm text-slate-500">Provide the board with operational realism and capital efficiency reports over theoretical model potential.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Statement */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-xl text-slate-600 leading-relaxed italic">
          AI Economics Navigator is the decision-first platform for organizations that demand clarity before deployment. We provide the tools to navigate the invisible costs of the intelligence age.
        </p>
      </section>
    </div>
  );
};

const LensCard: React.FC<{ title: string; description: string; onClick: () => void; icon: string }> = ({ title, description, onClick, icon }) => (
  <div 
    onClick={onClick}
    className="group bg-white p-8 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
  >
    <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all">{icon}</div>
    <h4 className="text-lg font-bold text-slate-900 mb-3">{title}</h4>
    <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
    <div className="text-indigo-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
      Open Tool <span>→</span>
    </div>
  </div>
);
