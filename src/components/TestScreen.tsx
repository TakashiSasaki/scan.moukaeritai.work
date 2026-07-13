import React from 'react';
import { Beaker, AlertCircle, Info } from 'lucide-react';

export default function TestScreen() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Beta Tests</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Experimental features and sandboxes</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-[32px] p-8 text-center">
        <Beaker className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold italic mb-2">Sandbox Environment</h2>
        <p className="text-sm text-[var(--on-surface-variant)] max-w-md mx-auto">
          This area is used for testing new UI components and interaction patterns. 
          Features found here may be unstable or subject to change.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface-container)] p-6 rounded-3xl border border-[var(--outline)]">
           <div className="flex items-center gap-2 font-bold mb-3">
             <AlertCircle size={18} className="text-[var(--primary)]" />
             UI Stress Test
           </div>
           <p className="text-xs text-[var(--on-surface-variant)] mb-6">Verify responsiveness and animation performance under load.</p>
           <button className="w-full bg-[var(--surface-container-highest)] py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Launch Test</button>
        </div>

        <div className="bg-[var(--surface-container)] p-6 rounded-3xl border border-[var(--outline)]">
           <div className="flex items-center gap-2 font-bold mb-3">
             <Info size={18} className="text-blue-500" />
             Schema Validator
           </div>
           <p className="text-xs text-[var(--on-surface-variant)] mb-6">Manually validate local data against the blueprint schema.</p>
           <button className="w-full bg-[var(--surface-container-highest)] py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Run Validator</button>
        </div>
      </div>
    </div>
  );
}
