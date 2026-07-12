import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--surface-container-low)] text-[var(--on-surface)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-[var(--surface-container)] border border-[var(--outline)] rounded-3xl p-8 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
          <ShieldAlert size={36} />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Access Denied</h1>
        <p className="text-[var(--on-surface-variant)] text-sm mb-6 leading-relaxed">
          You do not have administrative privileges required to access this resource. This incident has been logged.
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
