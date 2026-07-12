import React from 'react';
import { motion } from 'motion/react';
import { Book, Shield, Zap, Globe, Cpu, Package, ExternalLink, Github, Cloud } from 'lucide-react';

export default function DeveloperDocsOverview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="space-y-4 flex flex-col md:flex-row md:items-center gap-6">
        <div className="bg-[var(--primary)]/10 p-5 rounded-[24px] text-[var(--primary)] border border-[var(--primary)]/20 shadow-inner">
           <Package size={48} />
        </div>
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter">System Overview</h2>
          <p className="text-lg text-[var(--on-surface-variant)] leading-relaxed">
            Welcome to the technical documentation for <span className="font-bold text-[var(--on-surface)]">scan.mw</span>. 
            This application is built as a high-performance inventory management system leveraging modern web technologies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-container)] p-8 rounded-[32px] border border-[var(--outline)] space-y-4">
           <Zap className="text-amber-500" size={32} />
           <h3 className="text-xl font-bold italic">Tech Stack</h3>
           <ul className="text-sm text-[var(--on-surface-variant)] space-y-2 font-medium">
             <li>• React 19 (Vite)</li>
             <li>• TypeScript</li>
             <li>• Tailwind CSS v4</li>
             <li>• Firebase (Auth, Firestore, Storage)</li>
           </ul>
        </div>
        <div className="bg-[var(--surface-container)] p-8 rounded-[32px] border border-[var(--outline)] space-y-4">
           <Shield className="text-blue-500" size={32} />
           <h3 className="text-xl font-bold italic">Architecture</h3>
           <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
             Moving towards an Entity-Fact-Projection model to ensure reliable historical tracking and efficient read-projections.
           </p>
        </div>
      </div>

      {/* Developer Consoles & Links Section */}
      <div className="bg-[var(--surface-container)] p-8 rounded-[32px] border border-[var(--outline)] space-y-6">
        <div className="flex items-center gap-3">
          <Cpu className="text-[var(--primary)]" size={28} />
          <h3 className="text-xl font-bold italic">Developer Environments</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="https://github.com/TakashiSasaki/scan.moukaeritai.work" 
            target="_blank" 
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            className="p-4 bg-[var(--surface-container-low)] border border-[var(--outline)] rounded-2xl flex flex-col justify-between hover:border-[var(--primary)] transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#24292e]/10 text-[#24292e] dark:text-white rounded-xl">
                <Github size={20} />
              </div>
              <ExternalLink size={14} className="text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--on-surface)]">GitHub Project</div>
              <div className="text-[10px] font-mono text-[var(--on-surface-variant)] mt-1">Source Code & CI/CD</div>
            </div>
          </a>

          <a 
            href="https://jules.google.com/repo/github/TakashiSasaki/scan.moukaeritai.work/overview" 
            target="_blank" 
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            className="p-4 bg-[var(--surface-container-low)] border border-[var(--outline)] rounded-2xl flex flex-col justify-between hover:border-[var(--primary)] transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <Globe size={20} />
              </div>
              <ExternalLink size={14} className="text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--on-surface)]">Jules Platform</div>
              <div className="text-[10px] font-mono text-[var(--on-surface-variant)] mt-1">Repo Management</div>
            </div>
          </a>

          <a 
            href="https://console.cloud.google.com/welcome?project=moukaeritaid" 
            target="_blank" 
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            className="p-4 bg-[var(--surface-container-low)] border border-[var(--outline)] rounded-2xl flex flex-col justify-between hover:border-[var(--primary)] transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <Cloud size={20} />
              </div>
              <ExternalLink size={14} className="text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--on-surface)]">GCP Console</div>
              <div className="text-[10px] font-mono text-[var(--on-surface-variant)] mt-1">moukaeritaid Project</div>
            </div>
          </a>
        </div>
      </div>

      <div className="bg-emerald-500/10 p-8 rounded-[40px] border border-emerald-500/20 flex gap-6 items-start">
         <Globe className="text-emerald-500 shrink-0" size={32} />
         <div className="space-y-2">
            <h3 className="text-xl font-bold italic text-emerald-500">PWA Ready</h3>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed font-medium">
               The application is configured as a Progressive Web App (PWA) with offline support and a customizable manifest via Vite.
            </p>
         </div>
      </div>
    </motion.div>
  );
}
