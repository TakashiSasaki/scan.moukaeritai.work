import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, HardDrive, Smartphone, X, Info, Globe, Tag } from 'lucide-react';
import { getAppCacheSizes, AppCacheInfo, formatSize } from '../lib/utils';
import { ConnectionStatus } from './ConnectionStatus';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface AppStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppStatusDialog({ isOpen, onClose }: AppStatusDialogProps) {
  const navigate = useNavigate();
  const [cacheStats, setCacheStats] = useState<{ totalSize: number; caches: AppCacheInfo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipInfo, setIpInfo] = useState<{ ip: string; reverseDns: string[] } | null>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [ipError, setIpError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getAppCacheSizes().then(stats => {
        setCacheStats(stats);
        setLoading(false);
      });

      setIpLoading(true);
      setIpError(null);
      const functions = getFunctions(app);
      const getClientIp = httpsCallable(functions, 'getClientIp');
      getClientIp()
        .then((result: any) => {
          setIpInfo({
            ip: result.data.ip,
            reverseDns: result.data.reverseDns || [],
          });
          setIpLoading(false);
        })
        .catch((error) => {
          console.error('Failed to get IP:', error);
          setIpError('Failed to load IP data');
          setIpLoading(false);
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
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag size={16} />
                App Version
              </h3>
              <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl border border-[var(--outline)] text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--on-surface-variant)]">Build Date</span>
                  <span className="font-mono font-medium">
                    {typeof __APP_VERSION__ !== 'undefined'
                      ? new Date(__APP_VERSION__).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Database size={16} />
                Database Structure
              </h3>
              <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl border border-[var(--outline)] text-sm flex justify-between items-center">
                <div className="text-[var(--on-surface-variant)] flex-1 pr-4">
                  View documentation for Firestore collections and schema relationships.
                </div>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/database-structure');
                  }}
                  className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold whitespace-nowrap"
                >
                  View structure
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">Firebase Connections</h3>
              <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl flex justify-center border border-[var(--outline)] w-full">
                <ConnectionStatus />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe size={16} />
                Network Identity
              </h3>
              <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl border border-[var(--outline)] text-sm">
                {ipLoading ? (
                  <div className="flex items-center gap-2 text-[var(--on-surface-variant)]">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Globe size={16} />
                    </motion.div>
                    <span>Detecting IP address...</span>
                  </div>
                ) : ipError ? (
                  <div className="text-red-500">{ipError}</div>
                ) : ipInfo ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                      <span className="text-[var(--on-surface-variant)]">IP Address</span>
                      <span className="font-mono font-medium">{ipInfo.ip}</span>
                    </div>
                    {ipInfo.reverseDns.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[var(--on-surface-variant)] text-xs block mb-1">Reverse DNS</span>
                        <div className="space-y-1">
                          {ipInfo.reverseDns.map((rdns, idx) => (
                            <span key={idx} className="block font-mono text-xs text-[var(--primary)] truncate" title={rdns}>
                              {rdns}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
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
