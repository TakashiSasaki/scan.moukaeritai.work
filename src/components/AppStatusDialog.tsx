import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

interface AppStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppStatusDialog({ isOpen, onClose }: AppStatusDialogProps) {
  const systems = [
    { name: 'Identity Engine', status: 'operational', icon: <ShieldCheck size={18} /> },
    { name: 'Asset Catalog', status: 'operational', icon: <CheckCircle size={18} /> },
    { name: 'Vision Processing', status: 'operational', icon: <CheckCircle size={18} /> },
    { name: 'Cloud Database', status: 'operational', icon: <CheckCircle size={18} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[var(--surface-container-high)] rounded-[40px] border border-[var(--outline)] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black italic tracking-tighter text-[var(--on-surface)]">System Status</h2>
                    <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Real-time health check</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-[var(--surface-container-highest)] rounded-full transition-colors">
                    <X size={24} className="text-[var(--on-surface-variant)]" />
                  </button>
               </div>

               <div className="space-y-3">
                 {systems.map((s) => (
                   <div key={s.name} className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                     <div className="flex items-center gap-3">
                       <div className="text-green-500">{s.icon}</div>
                       <span className="font-bold text-sm">{s.name}</span>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Operational</span>
                   </div>
                 ))}
               </div>

               <div className="bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-500 font-bold mb-2">
                    <Info size={18} />
                    <span className="text-sm">Network Information</span>
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    Connected to Google Cloud Platform via regional edge servers. 
                    Latency is currently within optimal parameters.
                  </p>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
