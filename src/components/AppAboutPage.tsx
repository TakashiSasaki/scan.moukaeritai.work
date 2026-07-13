import React from 'react';
import { Package, Github, Globe, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function AppAboutPage() {
  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-12 pb-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-[var(--primary)] rounded-full blur-3xl opacity-20"></div>
          <div className="relative bg-[var(--surface-container)] p-8 rounded-[40px] border border-[var(--outline)] shadow-xl">
             <Package size={80} className="text-[var(--primary)] mx-auto" />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter mb-2">scan.mw</h1>
          <p className="text-xl text-[var(--on-surface-variant)] font-medium">Smart Asset Tracking Platform</p>
        </div>
      </motion.div>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold italic tracking-tight">Mission</h2>
        <p className="text-lg text-[var(--on-surface-variant)] leading-relaxed">
          Our mission is to simplify physical asset management through intuitive scanning, 
          robust cloud persistence, and AI-driven identification. We believe tracking your 
          belongings should be as fast as snapping a photo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 not-prose">
           <div className="p-6 bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)]">
              <h3 className="font-bold text-lg mb-2">Open Source</h3>
              <p className="text-sm text-[var(--on-surface-variant)]">Built with transparency and community in mind.</p>
           </div>
           <div className="p-6 bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)]">
              <h3 className="font-bold text-lg mb-2">Privacy First</h3>
              <p className="text-sm text-[var(--on-surface-variant)]">Your inventory data is encrypted and owned by you.</p>
           </div>
           <div className="p-6 bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)]">
              <h3 className="font-bold text-lg mb-2">Cross Platform</h3>
              <p className="text-sm text-[var(--on-surface-variant)]">Access your data on any device via our PWA.</p>
           </div>
        </div>
      </div>

      <footer className="pt-12 border-t border-[var(--outline)] flex flex-col items-center gap-6">
         <div className="flex gap-4">
            <button className="p-3 bg-[var(--surface-container)] rounded-2xl hover:bg-[var(--surface-container-highest)] transition-colors"><Github size={20} /></button>
            <button className="p-3 bg-[var(--surface-container)] rounded-2xl hover:bg-[var(--surface-container-highest)] transition-colors"><Globe size={20} /></button>
            <button className="p-3 bg-[var(--surface-container)] rounded-2xl hover:bg-[var(--surface-container-highest)] transition-colors"><Mail size={20} /></button>
         </div>
         <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">© 2024 Takashi Sasaki • Version 1.7.35</p>
      </footer>
    </div>
  );
}
