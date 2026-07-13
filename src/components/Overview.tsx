import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { BarChart3, Package, Tag, Clock, ShieldCheck, Database } from 'lucide-react';

export default function Overview() {
  const [stats, setStats] = useState({
    objects: 0,
    identifiers: 0,
    unassigned: 0,
    events: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      const [objs, idents, unassignedIdents] = await Promise.all([
        getDocs(query(collection(db, 'objects'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'identifiers'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'identifiers'), where('ownerId', '==', uid), where('status', '==', 'unassigned')))
      ]);

      setStats({
        objects: objs.size,
        identifiers: idents.size,
        unassigned: unassignedIdents.size,
        events: 0 // We'd need another query for events
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <div className="bg-[var(--surface-container)] p-6 rounded-[32px] border border-[var(--outline)]">
      <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg shadow-black/5`}>
        {icon}
      </div>
      <div className="text-3xl font-black text-[var(--on-surface)] tracking-tighter">{value}</div>
      <div className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mt-1">{label}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Inventory Overview</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Real-time statistics for your assets</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[var(--surface-container)] h-32 rounded-[32px] animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={<Package size={24} />} label="Total Objects" value={stats.objects} color="bg-[var(--primary)]" />
          <StatCard icon={<Tag size={24} />} label="Linked Tags" value={stats.identifiers - stats.unassigned} color="bg-blue-500" />
          <StatCard icon={<ShieldCheck size={24} />} label="Unassigned" value={stats.unassigned} color="bg-amber-500" />
          <StatCard icon={<Clock size={24} />} label="Recent Active" value={stats.objects > 0 ? 'Live' : 'Idle'} color="bg-green-500" />
        </div>
      )}

      <div className="bg-[var(--surface-container)] rounded-[32px] p-8 border border-[var(--outline)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Database size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold italic mb-2">Cloud Infrastructure</h3>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-6">
            All your data is synchronized across devices using Firebase Cloud Firestore and Cloud Storage.
            Images are automatically compressed for mobile performance while retaining critical details.
          </p>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               Service Online
             </div>
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div>
               SSL Encrypted
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
