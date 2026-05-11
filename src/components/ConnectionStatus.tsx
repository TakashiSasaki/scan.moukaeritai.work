import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { ref, list } from 'firebase/storage';
import { Database, HardDrive, AlertCircle, Clock, UserCheck, UserX } from 'lucide-react';

export function ConnectionStatus() {
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [firestorePing, setFirestorePing] = useState<number | null>(null);

  const [storageStatus, setStorageStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [storagePing, setStoragePing] = useState<number | null>(null);

  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>('checking');

  useEffect(() => {
    let mounted = true;

    async function checkFirestore() {
      const start = performance.now();
      try {
        await getDocFromServer(doc(db, 'system', 'connection-check'));
        if (mounted) {
          setFirestoreStatus('connected');
          setFirestorePing(Math.round(performance.now() - start));
        }
      } catch (error: any) {
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
          if (mounted) {
            setFirestoreStatus('connected');
            setFirestorePing(Math.round(performance.now() - start));
          }
        } else if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
          if (mounted) setFirestoreStatus('error');
        } else {
          if (mounted) {
            setFirestoreStatus('connected');
            setFirestorePing(Math.round(performance.now() - start));
          }
        }
      }
    }

    async function checkStorage() {
      const start = performance.now();
      try {
        await list(ref(storage, 'system'), { maxResults: 1 });
        if (mounted) {
          setStorageStatus('connected');
          setStoragePing(Math.round(performance.now() - start));
        }
      } catch (error: any) {
        if (error.code === 'storage/unauthorized') {
          if (mounted) {
            setStorageStatus('connected');
            setStoragePing(Math.round(performance.now() - start));
          }
        } else if (error.code === 'storage/retry-limit-exceeded' || error.code === 'core/network-error') {
          if (mounted) setStorageStatus('error');
        } else {
          if (mounted) {
            setStorageStatus('connected');
            setStoragePing(Math.round(performance.now() - start));
          }
        }
      }
    }

    if (mounted) {
      if (auth.currentUser) {
        setAuthStatus('signed-in');
      } else {
        setAuthStatus('signed-out');
      }
    }

    checkFirestore();
    checkStorage();

    return () => { mounted = false; };
  }, []);

  const StatusItem = ({ status, ping, icon: Icon, label }: { status: string, ping?: number | null, icon: any, label: string }) => {
    let colorClass = 'text-neutral-400';
    let bgClass = 'bg-neutral-500/10';
    let ringClass = 'ring-neutral-500/20';

    if (status === 'connected' || status === 'signed-in') {
      colorClass = 'text-emerald-500';
      bgClass = 'bg-emerald-500/10';
      ringClass = 'ring-emerald-500/20';
    } else if (status === 'error') {
      colorClass = 'text-red-500';
      bgClass = 'bg-red-500/10';
      ringClass = 'ring-red-500/20';
    } else if (status === 'signed-out') {
      colorClass = 'text-amber-500';
      bgClass = 'bg-amber-500/10';
      ringClass = 'ring-amber-500/20';
    } else if (status === 'checking') {
      colorClass = 'text-blue-500 animate-pulse';
      bgClass = 'bg-blue-500/10';
      ringClass = 'ring-blue-500/20';
    }

    return (
      <div className={`flex flex-col items-center justify-center p-3 rounded-xl ring-1 ${ringClass} ${bgClass} transition-all`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 ${status === 'checking' ? '' : 'bg-[var(--surface)] shadow-sm'}`}>
          <Icon size={16} className={colorClass} />
        </div>
        <span className="text-xs font-semibold text-[var(--on-surface)] mb-1">{label}</span>
        
        {status === 'checking' ? (
          <span className="text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">Checking...</span>
        ) : status === 'error' ? (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Offline</span>
        ) : status === 'signed-out' ? (
          <span className="text-[10px] text-amber-600 uppercase tracking-wider">Logged Out</span>
        ) : status === 'signed-in' ? (
           <span className="text-[10px] text-emerald-600 uppercase tracking-wider">Logged In</span>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-[var(--on-surface-variant)] font-mono">
            <Clock size={10} />
            {ping !== null ? `${ping}ms` : '--'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      <StatusItem status={authStatus} icon={authStatus === 'signed-in' ? UserCheck : UserX} label="Auth" />
      <StatusItem status={firestoreStatus} ping={firestorePing} icon={Database} label="Firestore" />
      <StatusItem status={storageStatus} ping={storagePing} icon={HardDrive} label="Storage" />
    </div>
  );
}
