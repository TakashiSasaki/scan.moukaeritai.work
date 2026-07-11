import React, { useState, useEffect } from 'react';

// Declarations for Vite-injected global variables
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export default function App() {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#3b82f6]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#10b981]/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div id="main-card" className="w-full max-w-lg bg-[#1e293b]/60 backdrop-blur-xl border border-[#334155]/60 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* App Logo */}
        <div id="logo-badge" className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#10b981] p-[2px] mb-8 shadow-lg shadow-[#3b82f6]/20">
          <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center font-mono text-2xl font-bold tracking-tighter text-[#3b82f6]">
            sw
          </div>
        </div>

        {/* Title */}
        <h1 id="app-title" className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#cbd5e1] to-[#94a3b8] bg-clip-text text-transparent mb-3">
          scan.mw
        </h1>

        {/* Subtitle / Baseline description */}
        <p id="app-baseline" className="text-[#94a3b8] text-base md:text-lg font-medium mb-8">
          Contract-first EFP rebuild baseline
        </p>

        {/* Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#334155] to-transparent mb-8" />

        {/* Metadata Details Grid */}
        <div id="meta-grid" className="w-full grid grid-cols-1 gap-4 text-left font-mono text-xs text-[#94a3b8] mb-8">
          <div className="bg-[#0f172a]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">APPLICATION VERSION:</span>
              <span className="text-[#3b82f6] font-semibold">{version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">BUILD TIME:</span>
              <span className="text-white">{buildTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">DATA MODEL SPEC:</span>
              <span className="text-[#10b981]">EFP v2.0.0</span>
            </div>
          </div>

          <div className="bg-[#0f172a]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">CURRENT TIME (UTC):</span>
              <span className="text-white font-medium">{utcTime || 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div id="status-pill" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs font-semibold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          v2 buildable baseline established
        </div>
      </div>

      {/* Small aesthetic footer */}
      <div className="mt-8 text-center text-xs text-[#475569] font-mono z-10">
        scan.mw &bull; secure &bull; distributed &bull; timeless
      </div>
    </div>
  );
}
