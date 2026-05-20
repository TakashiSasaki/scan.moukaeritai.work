import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, PlusCircle, Scan, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function UnassignedIdentifierScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { kind?: string, scheme?: string, canonicalValue?: string };

  const handleCreateNew = () => {
    navigate('/object/new', { state: { identifier: state } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-[var(--surface-container)] rounded-3xl p-8 max-w-md w-full text-center border border-[var(--outline)] shadow-lg">
        <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Scan size={32} />
        </div>

        <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-2">Unassigned Tag</h2>
        <p className="text-[var(--on-surface-variant)] mb-8">
          This identifier ({state?.canonicalValue || 'Unknown'}) is not currently assigned to any object in your inventory.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] py-4 px-6 rounded-2xl font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <PlusCircle size={20} />
            Create New Object
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ArrowRight size={20} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
