import React from 'react';
import { motion } from 'motion/react';
import { Book, Shield, Zap, Globe, Cpu } from 'lucide-react';

export default function DeveloperDocsOverview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="space-y-4">
        <h2 className="text-4xl font-black italic tracking-tighter">System Overview</h2>
        <p className="text-lg text-[var(--on-surface-variant)] leading-relaxed">
          Welcome to the technical documentation for <span className="font-bold text-[var(--on-surface)]">scan.mw</span>. 
          This application is built as a high-performance inventory management system leveraging modern web technologies.
        </p>
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
