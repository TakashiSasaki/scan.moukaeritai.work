import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, HardDrive, Smartphone, X, Info } from 'lucide-react';
import { getAppCacheSizes, AppCacheInfo, formatSize } from '../lib/utils';
import { ConnectionStatus } from './ConnectionStatus';

interface AppStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppStatusDialog({ isOpen, onClose }: AppStatusDialogProps) {
  const [cacheStats, setCacheStats] = useState<{ totalSize: number; caches: AppCacheInfo[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAppCacheSizes().then(stats => {
        setCacheStats(stats);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[var(--surface-container)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--outline)]"
        >
          <div className="p-6 border-b border-[var(--outline)] flex justify-between items-center bg-[var(--surface)]">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Info size={24} className="text-[var(--primary)]" />
              App Status
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">Firebase Connections</h3>
              <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl flex justify-center border border-[var(--outline)]">
                <ConnectionStatus />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Smartphone size={16} />
                Local Cache
              </h3>
              
              <div className="bg-[var(--surface-container-highest)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                {loading ? (
                  <div className="p-4 flex justify-center text-[var(--on-surface-variant)]">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Database size={20} />
                    </motion.div>
                  </div>
                ) : cacheStats && cacheStats.caches.length > 0 ? (
                  <div className="divide-y divide-[var(--outline)]">
                    <div className="p-3 bg-[var(--primary)]/10 flex justify-between font-bold text-[var(--primary)]">
                      <span>Total Cache</span>
                      <span>{formatSize(cacheStats.totalSize)}</span>
                    </div>
                    {cacheStats.caches.map(cache => (
                      <div key={cache.name} className="p-3 flex justify-between text-sm items-center">
                        <span className="text-[var(--on-surface-variant)] font-mono text-xs truncate max-w-[65%]">{cache.name}</span>
                        <span className="font-semibold">{formatSize(cache.size)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-[var(--on-surface-variant)]">
                    No active cache found
                  </div>
                )}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
