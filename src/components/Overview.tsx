import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { ObjectRecord, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Database, HardDrive, FileImage, Tag, PieChart, Activity, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { getAppCacheSizes, AppCacheInfo, formatSize } from '../lib/utils';

export default function Overview() {
  const [stats, setStats] = useState({
    totalObjects: 0,
    qrObjects: 0,
    nfcObjects: 0,
    noneObjects: 0,
    totalStorageSize: 0,
    fileCount: 0,
    appCacheTotalSize: 0,
    appCaches: [] as AppCacheInfo[],
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!auth.currentUser) return;
    setStats(prev => ({ ...prev, loading: true }));

    try {
      // 1. Fetch Firestore Stats
      const q = query(
        collection(db, 'objects'),
        where('ownerId', '==', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const objects = snap.docs.map(doc => doc.data() as ObjectRecord);

      const qr = objects.filter(i => i.identifierSummary?.activeKinds.includes('qr')).length;
      const nfc = objects.filter(i => i.identifierSummary?.activeKinds.includes('nfc')).length;
      const none = objects.filter(i => !i.identifierSummary || i.identifierSummary.activeKinds.length === 0).length;

      // 2. Fetch Storage Stats (Optimized)
      let size = 0;
      let count = 0;

      if (objects.length > 0) {
        try {
          const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
          const storageRoot = ref(storage, `users/${auth.currentUser.uid}/objects`);
          
          async function calculateDirSize(dirRef: any) {
            // Add a safety check to listAll
            const res = await Promise.race([
              listAll(dirRef),
              timeout(5000) // 5 second timeout per level
            ]).catch(() => ({ items: [], prefixes: [] })) as any;
            
            const metadataPromises = (res.items || []).map(async (fileRef: any) => {
              try {
                const meta = await Promise.race([
                  getMetadata(fileRef),
                  timeout(2000)
                ]) as any;
                size += meta.size;
                count++;
              } catch (e) { /* skip individual file errors or timeouts */ }
            });
            await Promise.all(metadataPromises);

            if (res.prefixes && res.prefixes.length > 0) {
              const dirPromises = res.prefixes.slice(0, 10).map((subDirRef: any) => calculateDirSize(subDirRef));
              await Promise.all(dirPromises);
            }
          }

          await Promise.race([
            calculateDirSize(storageRoot),
            timeout(10000) // 10 second total budget for storage stats
          ]).catch(e => console.warn('Storage calculation stopped early:', e));
        } catch (storageError) {
          console.warn('Storage stats ignored:', storageError);
        }
      }

      // 3. Fetch App Cache Stats
      const cacheStats = await getAppCacheSizes();

      setStats({
        totalObjects: objects.length,
        qrObjects: qr,
        nfcObjects: nfc,
        noneObjects: none,
        totalStorageSize: size,
        fileCount: count,
        appCacheTotalSize: cacheStats.totalSize,
        appCaches: cacheStats.caches,
        loading: false
      });
    } catch (error) {
      console.error('Stats error:', error);
      setStats(prev => ({ ...prev, loading: false }));
      // Optional: don't re-throw to avoid breaking the UI entirely if stats fail
      // handleFirestoreError(error, OperationType.LIST, 'stats');
    }
  };

  if (stats.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-neutral-400 text-sm font-medium">Analyzing storage...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--on-surface)] to-[var(--on-surface-variant)] bg-clip-text text-transparent">Usage Stats</h2>
        <p className="text-[var(--on-surface-variant)] text-sm">Overview of your objects and cloud storage.</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Database size={20} className="text-[var(--primary)]" />} 
          label="Total Objects"
          value={stats.totalObjects.toString()}
          color="primary"
        />
        <StatCard 
          icon={<HardDrive size={20} className="text-indigo-600" />} 
          label="Storage Used" 
          value={formatSize(stats.totalStorageSize)} 
          color="indigo"
        />
        <StatCard 
          icon={<Smartphone size={20} className="text-amber-600" />} 
          label="App Cache" 
          value={formatSize(stats.appCacheTotalSize)} 
          color="amber"
        />
        <StatCard 
          icon={<FileImage size={20} className="text-rose-600" />} 
          label="Photos" 
          value={stats.fileCount.toString()} 
          color="rose"
        />
      </div>

      {stats.appCaches.length > 0 && (
        <section className="bg-[var(--surface-container)] p-6 rounded-[32px] border border-[var(--outline)] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={18} className="text-[var(--on-surface-variant)]" />
            <h3 className="font-bold text-[var(--on-surface)] tracking-tight">App Cache Details</h3>
          </div>
          <div className="space-y-3">
            {stats.appCaches.map(cache => (
              <div key={cache.name} className="flex justify-between items-center text-sm border-b border-[var(--outline)] pb-2 last:border-0 last:pb-0">
                <span className="text-[var(--on-surface-variant)] font-mono text-xs truncate max-w-[70%]">{cache.name}</span>
                <span className="font-bold">{formatSize(cache.size)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[var(--surface-container)] p-6 rounded-[32px] border border-[var(--outline)] shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <PieChart size={18} className="text-[var(--on-surface-variant)]" />
          <h3 className="font-bold text-[var(--on-surface)] tracking-tight">Tag Distribution</h3>
        </div>
        
        <div className="space-y-4">
          <TagBar label="QR Codes" count={stats.qrObjects} total={stats.totalObjects} color="bg-[var(--primary)]" />
          <TagBar label="NFC Tags" count={stats.nfcObjects} total={stats.totalObjects} color="bg-indigo-500" />
          <TagBar label="Generic (Manual)" count={stats.noneObjects} total={stats.totalObjects} color="bg-[var(--on-surface-variant)]/20" />
        </div>
      </section>

      <div className="bg-[var(--primary)] p-6 rounded-[32px] text-[var(--primary-foreground)] shadow-xl shadow-[var(--primary)]/20 relative overflow-hidden transition-colors">
        <div className="relative z-10">
          <h4 className="font-bold text-lg mb-1">Backup & Security</h4>
          <p className="text-blue-100 text-xs leading-relaxed opacity-90">
            All your data is encrypted and backed up in Google's Firebase infrastructure. 
            Photos are stored in dedicated buckets restricted to your account.
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Database size={100} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  const bgColors: any = {
    primary: 'bg-[var(--primary)]/10',
    indigo: 'bg-indigo-50',
    rose: 'bg-rose-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50'
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white p-4 rounded-[28px] border border-neutral-100 shadow-sm"
    >
      <div className={`${bgColors[color]} w-10 h-10 rounded-2xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold text-neutral-900 tracking-tight">{value}</p>
    </motion.div>
  );
}

function TagBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold px-1">
        <span className="text-neutral-500">{label}</span>
        <span className="text-neutral-900">{count}</span>
      </div>
      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}
