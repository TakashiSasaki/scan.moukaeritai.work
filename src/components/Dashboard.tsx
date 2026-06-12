import React, { useState, useEffect } from 'react';
import { db, auth, deleteDoc, doc } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ObjectRecord, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Clock, MapPin, Tag, Package, Trash2, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getImageFormatFromUrl } from '../lib/utils';
import { ImageWithLongPress } from './ImageWithLongPress';

interface DashboardProps {
  onSelectItem: (id: string) => void;
}

export default function Dashboard({ onSelectItem }: DashboardProps) {
  const [objects, setObjects] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'name'>('updatedAt');
  const [filterTag, setFilterTag] = useState<'all' | 'qr' | 'nfc' | 'none'>('all');

  useEffect(() => {
    if (!auth.currentUser) return;

    let q = query(
      collection(db, 'objects'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let newObjects = snapshot.docs.map(doc => ({
        ...doc.data(),
        objectId: doc.id
      })) as ObjectRecord[];

      if (filterTag !== 'all') {
        // TODO(entity-fact-projection): migrate from identifierSummary to objectSummaries projection
        if (filterTag === 'none') {
          newObjects = newObjects.filter(obj => !obj.identifierSummary || obj.identifierSummary.activeKinds.length === 0);
        } else {
          newObjects = newObjects.filter(obj => obj.identifierSummary?.activeKinds.includes(filterTag));
        }
      }

      newObjects.sort((a, b) => {
        if (sortBy === 'name') {
           return (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'updatedAt') {
           const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
           const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
           return bTime - aTime;
        } else {
           const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
           const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
           return bTime - aTime;
        }
      });

      setObjects(newObjects.slice(0, 20));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'objects');
    });

    return unsubscribe;
  }, [sortBy, filterTag]);

  const handleDeleteItem = async (e: React.MouseEvent, objectId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this object? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'objects', objectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `objects/${objectId}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-neutral-200 animate-pulse rounded-xl"></div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-neutral-100 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[var(--surface-container)] p-3 rounded-3xl border border-[var(--outline)] shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <Filter size={16} className="text-[var(--on-surface-variant)] ml-1 flex-shrink-0" />
          {(['all', 'qr', 'nfc', 'none'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                filterTag === tag 
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' 
                : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border-[var(--outline)] hover:border-[var(--on-surface-variant)] border'
              }`}
            >
              {tag.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-[var(--outline)] pt-3 sm:pt-0 sm:pl-4">
          <ArrowUpDown size={16} className="text-[var(--on-surface-variant)] flex-shrink-0" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold text-[var(--on-surface-variant)] bg-transparent focus:outline-none appearance-none cursor-pointer pr-4"
            style={{ backgroundImage: 'none' }}
          >
            <option value="updatedAt">RECENTLY UPDATED</option>
            <option value="createdAt">DATE ADDED</option>
            <option value="name">ALPHABETICAL</option>
          </select>
          <ChevronDown size={14} className="text-[var(--on-surface-variant)] -ml-4 pointer-events-none" />
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">
            {filterTag === 'all' ? 'All Objects' : `${filterTag.toUpperCase()} Objects`}
          </h2>
          <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] font-bold px-2 py-0.5 rounded-full">
            {objects.length} TOTAL
          </span>
        </div>
        
        {objects.length === 0 ? (
          <div className="bg-[var(--surface-container)] border-2 border-dashed border-[var(--outline)] rounded-[32px] p-8 text-center text-[var(--on-surface-variant)]">
            <div className="bg-[var(--surface-container-high)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock size={24} />
            </div>
            <p className="font-bold">No objects yet</p>
            <p className="text-xs opacity-60">Start by scanning a QR code or adding a new object.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {objects.map((obj) => (
              <div
                key={obj.objectId}
                onClick={() => onSelectItem(obj.objectId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(obj.objectId);
                  }
                }}
                role="button"
                tabIndex={0}
                className="m3-card p-3 flex gap-4 text-left active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
              >
                {obj.primaryImageUrl ? (
                  <img
                    src={obj.primaryImageUrl}
                    alt={obj.name || 'Object'}
                    className="w-24 h-24 object-cover rounded-2xl bg-[var(--surface-container-high)] flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-24 h-24 bg-[var(--surface-container-high)] rounded-2xl flex items-center justify-center text-[var(--on-surface-variant)] flex-shrink-0">
                    <Package size={32} opacity={0.3} />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-lg text-[var(--on-surface)] truncate tracking-tight">{obj.name || 'Untitled Object'}</h3>
                      <p className="text-[var(--on-surface-variant)] text-xs line-clamp-1 opacity-70">{obj.description}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteItem(e, obj.objectId)}
                      className="p-2 text-[var(--on-surface-variant)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all flex-shrink-0"
                      title="Delete object"
                      aria-label="Delete object"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[var(--on-surface-variant)] mt-2 uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(obj.updatedAt.toDate())} ago
                    </span>
                    {obj.currentLocation && (
                      <span className="flex items-center gap-1 text-[var(--primary)]">
                        <MapPin size={12} />
                        Nearby
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-[var(--primary)]">
                      <Tag size={12} />
                      {obj.identifierSummary?.activeKinds.join(', ') || 'UNTAGGED'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
