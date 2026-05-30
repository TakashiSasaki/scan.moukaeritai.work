import React from 'react';
import { Beaker } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PipesDemo from './PipesDemo';

export default function TestScreen() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-purple-600 rounded-xl text-white shadow-sm">
              <Beaker className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Beta Tests</h2>
              <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">Experimental Sandbox</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/app')}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            🚪 Exit
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto w-full">
        <PipesDemo />
      </div>
    </div>
  );
}
