import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Package, ArrowRight } from 'lucide-react';

interface SearchScreenProps {
  onSelectItem: (id: string) => void;
}

export default function SearchScreen({ onSelectItem }: SearchScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // Basic search - in a real app you'd use something like Algolia or a more complex Firestore query
      // For now, we'll just get items for the user and filter locally or do a simple prefix search
      const q = query(
        collection(db, 'objects'),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((obj: any) => 
          obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obj.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obj.objectId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      setResults(filtered);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Search</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Find anything in your inventory</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, ID, or description..."
          className="w-full bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl py-4 pl-12 pr-4 text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-medium"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <AnimatePresence>
            {results.length > 0 ? (
              <div className="grid gap-3">
                {results.map((item) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelectItem(item.id)}
                    className="flex items-center gap-4 p-3 bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl hover:border-[var(--primary)] transition-all group"
                  >
                    <div className="w-12 h-12 bg-[var(--surface-container-highest)] rounded-xl flex-shrink-0 flex items-center justify-center border border-[var(--outline)]">
                      {item.primaryImageUrl ? (
                        <img src={item.primaryImageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className="text-[var(--on-surface-variant)] opacity-40" size={20} />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-bold text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors">{item.name || 'Unnamed Object'}</div>
                      <div className="text-[10px] text-[var(--on-surface-variant)] font-bold uppercase tracking-widest truncate">{item.objectId || item.id}</div>
                    </div>
                    <ArrowRight size={18} className="text-[var(--on-surface-variant)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </motion.button>
                ))}
              </div>
            ) : searchTerm.trim() ? (
              <div className="py-12 text-center text-[var(--on-surface-variant)]">
                <p className="font-bold">No results found for "{searchTerm}"</p>
                <p className="text-sm">Try different keywords or check your spelling.</p>
              </div>
            ) : (
              <div className="py-12 text-center text-[var(--on-surface-variant)] opacity-50">
                <Search size={48} className="mx-auto mb-4" />
                <p className="font-medium">Type to start searching</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
