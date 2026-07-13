import React from 'react';
import { motion } from 'motion/react';
import { Route as RouteIcon, X, ShieldAlert, CheckCircle } from 'lucide-react';
import { routes } from '../lib/routeCatalog';

export default function SitemapPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24 text-[var(--on-surface)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic">Route Map</h1>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">Internal application structure & status (v2.0.5)</p>
        </div>
        <button onClick={onClose} className="bg-[var(--surface-container-highest)] p-2 rounded-xl text-[var(--on-surface-variant)] cursor-pointer">
          <X size={24} />
        </button>
      </div>

      <div className="grid gap-3">
        {routes.map((route) => (
          <div 
            key={route.path}
            className={`flex flex-col md:flex-row md:items-center gap-4 p-4 bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl transition-all ${
              route.isActive ? 'border-l-4 border-l-[#10b981]' : 'opacity-60 border-l-4 border-l-amber-500'
            }`}
          >
            <div className={`p-3 rounded-xl w-fit ${
              route.access === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--primary)]/10 text-[var(--primary)]'
            }`}>
              {route.access === 'admin' ? <ShieldAlert size={20} /> : <RouteIcon size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[var(--on-surface)]">{route.label}</span>
                {route.access === 'admin' && (
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase font-mono">
                    Admin Only
                  </span>
                )}
                {route.isActive ? (
                  <span className="text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-full uppercase font-mono flex items-center gap-1">
                    <CheckCircle size={8} /> Active
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase font-mono">
                    Contained / Pending Rebuild
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-[var(--on-surface-variant)] mt-1">{route.path}</div>
            </div>
            <div className="text-xs text-[var(--on-surface-variant)] font-medium italic mt-2 md:mt-0">
              {route.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
