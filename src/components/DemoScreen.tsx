import React, { useState } from 'react';
import { PlaySquare, Smartphone, Zap, Wifi, Battery, MapPin, Radio, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DemoScreen() {
  const [activeTab, setActiveTab] = useState('hardware');

  const demos = [
    { id: 'hardware', label: 'Hardware APIs', icon: <Smartphone size={18} /> },
    { id: 'network', label: 'Network', icon: <Wifi size={18} /> },
    { id: 'sensors', label: 'Sensors', icon: <Radio size={18} /> },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">API Demos</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Browser capability demonstrations</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {demos.map((demo) => (
          <button
            key={demo.id}
            onClick={() => setActiveTab(demo.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${activeTab === demo.id ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)]'}`}
          >
            {demo.icon}
            {demo.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface-container)] rounded-[32px] p-8 border border-[var(--outline)] min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="p-6 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl flex items-center gap-4">
                   <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Battery size={24} /></div>
                   <div>
                     <div className="font-bold">Battery Status</div>
                     <div className="text-xs text-[var(--on-surface-variant)]">Read battery level and state</div>
                   </div>
                 </div>
                 <div className="p-6 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl flex items-center gap-4">
                   <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><MapPin size={24} /></div>
                   <div>
                     <div className="font-bold">Geolocation</div>
                     <div className="text-xs text-[var(--on-surface-variant)]">Access current coordinates</div>
                   </div>
                 </div>
              </div>
              <div className="p-8 border border-dashed border-[var(--outline)] rounded-2xl text-center">
                 <p className="text-sm text-[var(--on-surface-variant)] italic">More hardware demos coming soon...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
