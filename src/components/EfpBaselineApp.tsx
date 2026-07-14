import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { ShieldCheck, BookOpen, Database, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MyObjectsSection from '../features/objects/MyObjectsSection';

declare const __APP_VERSION__: string;

export default function EfpBaselineApp() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';

  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="bg-gradient-to-tr from-[#1e293b] to-[#0f172a] border border-[var(--outline)] rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[#3b82f6]/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
              Containment Baseline Mode
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.displayName || 'User'}
            </h2>
            <p className="text-sm text-[#94a3b8] max-w-xl">
              Object creation and detail views are now active under the EFP model. Marker and Association workflows are currently pending. Direct legacy item writes remain blocked to ensure schema isolation.
            </p>
          </div>
          
          <div className="bg-[#0f172a]/80 border border-[#334155]/60 rounded-2xl p-4 font-mono text-xs text-[#94a3b8] w-full md:w-auto min-w-[200px]">
            <div className="flex justify-between py-1 border-b border-[#334155]/30">
              <span className="text-[#64748b]">APP VERSION:</span>
              <span className="text-white font-bold">{version}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748b]">DATA MODEL:</span>
              <span className="text-[#10b981] font-bold">EFP 3.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Baseline Status & Guidance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Backend Core Baseline</h3>
              <p className="text-xs text-[var(--on-surface-variant)]">Fail-closed status reporting</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-[var(--surface-container-high)] px-3 py-2 rounded-xl">
              <span className="text-xs font-mono text-[var(--on-surface-variant)]">AUTHENTICATED AS:</span>
              <span className="text-xs font-bold font-mono truncate max-w-[200px]">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center bg-[var(--surface-container-high)] px-3 py-2 rounded-xl">
              <span className="text-xs font-mono text-[var(--on-surface-variant)]">ROLE STATUS:</span>
              <span className="text-xs font-bold text-emerald-500">{isAdmin ? 'ADMINISTRATOR' : 'STANDARD USER'}</span>
            </div>
            <div className="flex justify-between items-center bg-[var(--surface-container-high)] px-3 py-2 rounded-xl">
              <span className="text-xs font-mono text-[var(--on-surface-variant)]">BACKEND HARNESS:</span>
              <span className="text-xs font-bold text-[#3b82f6]">ACTIVE (v{version})</span>
            </div>
          </div>
        </div>

        {/* Action / Next Steps Card */}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl">
                <Database size={20} />
              </div>
              <h3 className="font-bold text-lg">Milestone Roadmap</h3>
            </div>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              Object baseline is available and remains under verification. physical Marker binding (QR, NFC) and Association mapping are scheduled for upcoming vertical iterations.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/dev')}
                className="w-full py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen size={16} /> Read Developer Docs
              </button>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-3 bg-[var(--surface-container-highest)] border border-[var(--outline)] text-[var(--on-surface)] rounded-xl font-bold text-sm hover:bg-[var(--surface-container-high)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Settings size={16} /> Configure Settings
            </button>
          </div>
        </div>
      </div>

      {/* User's Object List Section */}
      <div className="pt-4 border-t border-[var(--outline)]/30">
        <MyObjectsSection />
      </div>
    </div>
  );
}
