import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { Users, Database, Server, Activity, ShieldAlert, CloudCog, HardDrive, Cpu, Loader2 } from 'lucide-react';

interface ServerMetrics {
  storageTotalMB: string;
  storageFileCount: number;
  firestoreReadsEstimated: string;
}

export default function AdminPanel() {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-6 pb-24 md:pb-6 space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-500 rounded-xl text-white">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Admin Control Panel</h2>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">System Metrics & Overview</p>
        </div>
      </div>

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

      <div className="bg-[var(--surface-container-high)] rounded-3xl p-6 lg:p-8 mt-6">
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

            <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl opacity-50">
              <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold text-xs">
                <Activity size={14} /> Firestore Limits
              </div>
              <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
              <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Setup Cloud Monitoring API</p>
            </div>

            <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl opacity-50">
              <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-xs">
                <Cpu size={14} /> Gemini Invocations
              </div>
              <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
              <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Setup Cloud Monitoring API</p>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
