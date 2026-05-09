import React, { useState, useEffect } from 'react';
import { db, storage } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { ref, list } from 'firebase/storage';
import { Database, HardDrive, AlertCircle } from 'lucide-react';

export function ConnectionStatus() {
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [storageStatus, setStorageStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    let mounted = true;

    async function checkFirestore() {
      try {
        // Attempt to connect to Firestore
        await getDocFromServer(doc(db, 'system', 'connection-check'));
        if (mounted) setFirestoreStatus('connected');
      } catch (error: any) {
        // Even if permission denied, it means we connected to the server successfully
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
          if (mounted) setFirestoreStatus('connected');
        } else if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
          if (mounted) setFirestoreStatus('error');
        } else {
          if (mounted) setFirestoreStatus('connected');
        }
      }
    }

    async function checkStorage() {
      try {
        // Trying to list to check bucket connectivity
        await list(ref(storage, 'system'), { maxResults: 1 });
        if (mounted) setStorageStatus('connected');
      } catch (error: any) {
        // If unauthorized, it means we reached the server and bucket exists
        if (error.code === 'storage/unauthorized') {
          if (mounted) setStorageStatus('connected');
        } else if (error.code === 'storage/retry-limit-exceeded' || error.code === 'core/network-error') {
          if (mounted) setStorageStatus('error');
        } else {
          if (mounted) setStorageStatus('connected');
        }
      }
    }

    checkFirestore();
    checkStorage();

    return () => { mounted = false; };
  }, []);

  const StatusIcon = ({ status, icon: Icon, label }: { status: string, icon: any, label: string }) => {
    let colorClass = 'text-neutral-400';
    if (status === 'connected') colorClass = 'text-emerald-500';
    if (status === 'error') colorClass = 'text-red-500';
    if (status === 'checking') colorClass = 'text-amber-500 animate-pulse';

    return (
      <div className={`flex items-center gap-1 ${colorClass}`} title={`${label}: ${status}`}>
        <Icon size={14} />
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 bg-[var(--surface-container-high)] border border-[var(--outline)] px-2 py-1 rounded-full shadow-sm">
      <StatusIcon status={firestoreStatus} icon={Database} label="Firestore" />
      <div className="w-px h-3 bg-neutral-300"></div>
      <StatusIcon status={storageStatus} icon={HardDrive} label="Storage" />
    </div>
  );
}
