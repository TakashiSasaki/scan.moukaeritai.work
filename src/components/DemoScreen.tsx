import React, { useState } from 'react';
import { PlaySquare, Bluetooth, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BluetoothDemo from './BluetoothDemo';
import NetworkDemo from './NetworkDemo';
import { AnimatePresence, motion } from 'motion/react';

export default function DemoScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'network'>('bluetooth');

  return (
    <div className="w-full">
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-600 rounded-xl text-white shadow-sm">
                <PlaySquare className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">API Demos</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">Device Features</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              🚪 Exit
            </button>
          </div>

          <div className="flex p-1 bg-[var(--surface-container)] rounded-2xl w-full overflow-x-auto no-scrollbar border border-[var(--surface-container-highest)] shadow-inner">
            <button
              onClick={() => setActiveTab('bluetooth')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'bluetooth'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Bluetooth size={18} />
              Bluetooth API
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'network'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Wifi size={18} />
              Network API
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'bluetooth' ? (
            <motion.div
              key="bluetooth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <BluetoothDemo />
            </motion.div>
          ) : (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <NetworkDemo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
