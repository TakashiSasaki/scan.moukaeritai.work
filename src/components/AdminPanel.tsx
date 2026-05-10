import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { Users, Database, Server, Activity, ShieldAlert, CloudCog, HardDrive, Cpu, Loader2, LayoutDashboard, Beaker, Bluetooth, Wifi } from 'lucide-react';
import PipesDemo from './PipesDemo';
import BluetoothDemo from './BluetoothDemo';
import NetworkDemo from './NetworkDemo';

interface ServerMetrics {
  storageTotalMB: string;
  storageFileCount: number;
  firestoreReadsEstimated: string | number;
  geminiInvocations: string | number;
}

export default function AdminPanel({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'test' | 'bluetooth' | 'network'>('overview');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        setUserCount(usersSnapshot.data().count);

        const itemsSnapshot = await getCountFromServer(collection(db, 'items'));
        setItemCount(itemsSnapshot.data().count);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const functions = getFunctions();
        const getAppMetricsFn = httpsCallable(functions, 'getAppMetrics');
        const result = await getAppMetricsFn();
        const data = result.data as any;
        if (data.success && data.metrics) {
          setServerMetrics(data.metrics);
        }
      } catch (error: any) {
        console.error('Failed to fetch server metrics', error);
        setMetricsError(error?.message || 'Failed to authenticate to Google Cloud');
      } finally {
        setMetricsLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="w-full">
      {/* Sticky Top Navigation & Header */}
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-amber-500 rounded-xl text-white shadow-sm">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Admin Control Panel</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">System Settings & Metrics</p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                Exit
              </button>
            )}
          </div>
          
          {/* Horizontal Navigation Tabs */}
          <div className="flex p-1 bg-[var(--surface-container)] rounded-2xl w-full overflow-x-auto no-scrollbar border border-[var(--surface-container-highest)] shadow-inner">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'test'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Beaker size={18} />
              Beta Tests
            </button>
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

      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Metrics from Firestore Counters */}
              <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] mb-4 font-bold">
                  <Users size={18} />
                  <h3>Active Users</h3>
                </div>
                <div className="text-5xl font-black text-[var(--primary)] mb-2">
                  {loading ? <span className="opacity-50">...</span> : userCount ?? '-'}
                </div>
                <p className="text-xs text-[var(--on-surface-variant)] font-medium">Unique authenticated users.</p>
              </div>

              <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] mb-4 font-bold">
                  <Database size={18} />
                  <h3>Total Tagged Items</h3>
                </div>
                <div className="text-5xl font-black text-[var(--primary)] mb-2">
                  {loading ? <span className="opacity-50">...</span> : itemCount ?? '-'}
                </div>
                <p className="text-xs text-[var(--on-surface-variant)] font-medium">Documents in 'items' collection.</p>
              </div>
            </div>

            <div className="bg-[var(--surface-container-high)] rounded-3xl p-6 lg:p-8">
              <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4 flex items-center gap-2">
                <Activity size={20} className="text-rose-500" />
                Infrastructure Metrics (Live)
              </h3>
              <p className="text-sm text-[var(--on-surface-variant)] mb-6">
                These metrics are securely fetched from the backend using Firebase Cloud Functions, 
                calculating exact byte usage for Google Cloud Storage and providing an overview of resource consumption.
              </p>

              {metricsError ? (
                <div className="p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
                  Could not load metrics: {metricsError}
                </div>
              ) : metricsLoading ? (
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] p-4">
                  <Loader2 size={16} className="animate-spin" /> Fetching real-time statistics...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-xs">
                      <Server size={14} /> Total Images Stored
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.storageFileCount || 0}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Files in Storage Bucket</p>
                  </div>
                  
                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-xs">
                      <HardDrive size={14} /> Storage Size (Images)
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.storageTotalMB || '0.00'} MB
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Total physical byte size</p>
                  </div>

                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold text-xs">
                      <Activity size={14} /> Firestore Reads
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.firestoreReadsEstimated ?? 'N/A'}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1 leading-tight">
                      プロジェクト全体 (過去30日間)<br/>
                      <span className="text-amber-600/80">※他アプリと共有時は合算されます</span>
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-xs">
                      <Cpu size={14} /> Gemini Invocations
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.geminiInvocations ?? 'N/A'}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1 leading-tight">
                      プロジェクト全体 (過去30日間)<br/>
                      <span className="text-purple-600/80">※他アプリと共有時は合算されます</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'test' ? (
          <motion.div
            key="test"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
                <Beaker className="text-purple-500" />
                Experimental Sandbox
              </h3>
              <p className="text-sm text-[var(--on-surface-variant)] mt-1">
                A staging area for testing new UI components, animations, and technical validations before they enter production.
              </p>
            </div>
            
            <PipesDemo />

          </motion.div>
        ) : activeTab === 'bluetooth' ? (
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
