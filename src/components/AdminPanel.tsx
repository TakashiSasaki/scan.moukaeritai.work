import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Database, Server, Activity, ShieldAlert, CloudCog, HardDrive, Cpu } from 'lucide-react';

export default function AdminPanel() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
          Billing & Infrastructure Metrics (Estimate)
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">
          <strong className="text-[var(--on-surface)] font-bold text-base">Why are these estimates?</strong><br />
          Client-side SDKs (like React frontend) cannot directly query Google Cloud Billing or Cloud Monitoring API to obtain read/write counts or raw storage byte usage due to security restrictions.
          <br /><br />
          To get *exact* metrics (e.g. daily active reads, storage bucket bytes, or Cloud Vision AI requests), we would need to deploy a <strong>Cloud Function</strong> or use a Node.js backend to query the Google Cloud Monitoring API securely using Admin SDKs, and expose those exact stats via a protected API endpoint.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-xs">
              <Server size={14} /> Firestore Reads
            </div>
            <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Requires Cloud Monitoring API</p>
          </div>
          
          <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
            <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-xs">
              <HardDrive size={14} /> Storage Size (Images)
            </div>
            <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Requires Bucket Metadata API</p>
          </div>

          <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
            <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold text-xs">
              <CloudCog size={14} /> Cloud Storage Egress
            </div>
            <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Image download bandwidth</p>
          </div>

          <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
            <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-xs">
              <Cpu size={14} /> Gemini Vision Invocations
            </div>
            <div className="text-2xl font-black text-[var(--on-surface)]">N/A</div>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Number of AI tagging requests</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
