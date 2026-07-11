import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Package, Search, Plus, Filter, Clock } from 'lucide-react';

interface DashboardProps {
  onSelectItem: (id: string) => void;
}

export default function Dashboard({ onSelectItem }: DashboardProps) {
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'objects'),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setObjects(docs);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard subscription error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic">Dashboard</h1>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">Recent items and activities</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl text-[var(--on-surface-variant)]">
            <Filter size={20} />
          </div>
        </div>
      </div>

      {objects.length === 0 ? (
        <div className="bg-[var(--surface-container)] rounded-3xl p-12 text-center border border-dashed border-[var(--outline)]">
          <Package className="w-16 h-16 text-[var(--on-surface-variant)] opacity-20 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No objects found</h3>
          <p className="text-[var(--on-surface-variant)] text-sm mb-6">Start by adding your first item or scanning a code.</p>
          <button 
            onClick={() => window.location.href = '/object/new'}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2"
          >
            <Plus size={20} /> Add New Object
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {objects.map((obj) => (
            <motion.button
              key={obj.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectItem(obj.id)}
              className="bg-[var(--surface-container)] rounded-3xl p-4 text-left border border-[var(--outline)] hover:border-[var(--primary)] transition-all group"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-[var(--surface-container-highest)] rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-[var(--outline)]">
                  {obj.primaryImageUrl ? (
                    <img src={obj.primaryImageUrl} alt={obj.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="text-[var(--on-surface-variant)] opacity-40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors">{obj.name || 'Unnamed Object'}</h4>
                  <p className="text-xs text-[var(--on-surface-variant)] line-clamp-2 mt-1">{obj.description || 'No description provided.'}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">
                    <Clock size={10} />
                    {obj.updatedAt ? new Date(obj.updatedAt).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
