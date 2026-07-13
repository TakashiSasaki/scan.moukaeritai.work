import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function EfpWorkflowPending() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--surface-container-low)] text-[var(--on-surface)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-[var(--surface-container)] border border-[var(--outline)] rounded-3xl p-8 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
          <ShieldAlert size={36} />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Workflow Under Rebuild</h1>
        <p className="text-[var(--on-surface-variant)] text-sm mb-6 leading-relaxed">
          The Object and Marker workflows are currently being rebuilt on the EFP (Entity-Fact-Projection) 3.0.0 model. Direct writes and legacy capture forms have been safely contained.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} /> Return to Home
        </button>
      </div>
    </div>
  );
}
