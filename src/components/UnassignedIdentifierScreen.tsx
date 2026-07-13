import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, ArrowRight, Package, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnassignedIdentifierScreen() {
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUnassigned();
  }, []);

  const loadUnassigned = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'identifiers'),
        where('ownerId', '==', auth.currentUser.uid),
        where('status', '==', 'unassigned'),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      setUnassigned(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading unassigned:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Unassigned Tags</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Scanned items waiting to be cataloged</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      ) : unassigned.length === 0 ? (
        <div className="bg-[var(--surface-container)] rounded-3xl p-12 text-center border border-dashed border-[var(--outline)]">
          <Tag className="w-16 h-16 text-[var(--on-surface-variant)] opacity-20 mx-auto mb-4" />
          <h3 className="text-lg font-bold">All clear!</h3>
          <p className="text-[var(--on-surface-variant)] text-sm">No unassigned tags found. Scanned items appear here if they are not yet bound to an object.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {unassigned.map((tag) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--surface-container)] rounded-[32px] p-6 border border-[var(--outline)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="bg-[var(--primary)]/10 p-4 rounded-2xl text-[var(--primary)]">
                    <Tag size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest mb-1">{tag.kind || 'Tag'}</div>
                    <h3 className="text-xl font-bold text-[var(--on-surface)] break-all">{tag.identifierKey}</h3>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-1">First seen: {new Date(tag.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => navigate('/object/new', { state: { identifier: tag } })}
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[var(--primary)]/10"
                >
                  <Plus size={18} /> New Object
                </button>
                <button
                  onClick={() => navigate('/search', { state: { identifier: tag } })}
                  className="bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <ArrowRight size={18} /> Bind Existing
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
