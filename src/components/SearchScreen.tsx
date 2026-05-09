import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Item, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Search, Package, MapPin, Tag, Camera, Sparkles } from 'lucide-react';
import { describeImage, identifyMatches } from '../lib/gemini';
import { getImageFormatFromUrl } from '../lib/utils';

interface SearchScreenProps {
  onSelectItem: (id: string) => void;
}

export default function SearchScreen({ onSelectItem }: SearchScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVisualSearching, setIsVisualSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      if (!isVisualSearching) {
        setResults([]);
      }
    }
  }, [searchTerm]);

  const handleSearch = async (idsToBoost: string[] = []) => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'items'),
        where('ownerId', '==', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const allItems = snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Item[];
      
      allItems.sort((a, b) => {
         const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
         const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
         return bTime - aTime;
      });

      let filtered = allItems;
      
      if (searchTerm.length >= 2) {
        filtered = allItems.filter(item => 
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // If we have AI matched IDs, prioritize them
      if (idsToBoost.length > 0) {
        const boosted = allItems.filter(item => idsToBoost.includes(item.id));
        const others = filtered.filter(item => !idsToBoost.includes(item.id));
        filtered = [...boosted, ...others];
      }
      
      setResults(filtered);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'items');
    } finally {
      setLoading(false);
    }
  };

  const handleVisualSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsVisualSearching(true);
    setLoading(true);
    setSearchTerm('');

    try {
      // 1. Convert to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // 2. Get all user items for matching
      const q = query(collection(db, 'items'), where('ownerId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const allItems = snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Item[];

      // 3. Gemini Visual Match + Description
      const [matchedIds, description] = await Promise.all([
        identifyMatches(base64, allItems),
        describeImage(base64)
      ]);

      if (description) {
        setSearchTerm(description);
      }

      await handleSearch(matchedIds);
    } catch (error) {
      console.error('Visual search error:', error);
      alert('Failed to process image for search.');
    } finally {
      setIsVisualSearching(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] group-focus-within:text-[var(--primary)] transition-colors" size={20} />
        <input 
          type="text" 
          autoFocus
          placeholder="Search with text or photo..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--surface-container)] border border-[var(--outline)] text-[var(--on-surface)] rounded-[24px] py-4 pl-12 pr-16 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all shadow-sm font-medium outline-none"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-all"
            title="Search with photo"
          >
            {isVisualSearching ? (
              <Sparkles className="animate-pulse text-[var(--primary)]" size={20} />
            ) : (
              <Camera size={20} />
            )}
          </button>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          hidden 
          ref={fileInputRef} 
          onChange={handleVisualSearch} 
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            {isVisualSearching && <p className="text-sm font-bold text-[var(--primary)] animate-pulse uppercase tracking-widest">Vision Match</p>}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {results.map((item, index) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`p-3 rounded-[24px] border flex gap-4 items-center text-left transition-all ${
                  isVisualSearching && index === 0 
                  ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10 shadow-md scale-[1.02] bg-[var(--primary)]/5' 
                  : 'bg-[var(--surface-container)] border-[var(--outline)] hover:border-[var(--on-surface-variant)]'
                }`}
              >
                <div className="w-20 h-20 rounded-xl bg-[var(--surface-container-high)] flex-shrink-0 overflow-hidden relative border border-[var(--outline)] shadow-inner">
                  {item.mainImageUrl ? (
                    <div className="relative w-full h-full">
                      <img src={item.mainImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-[8px] font-black tracking-wider text-white uppercase border border-white/10 z-10">
                        {getImageFormatFromUrl(item.mainImageUrl)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--on-surface-variant)] opacity-30">
                      <Package size={28} />
                    </div>
                  )}
                  {isVisualSearching && index === 0 && (
                    <div className="absolute top-1 right-1 bg-[var(--primary)] text-[var(--primary-foreground)] p-1 rounded-full shadow-lg">
                      <Sparkles size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold truncate text-lg text-[var(--on-surface)] tracking-tight">{item.name || 'Untitled'}</h4>
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] line-clamp-1 mb-2 opacity-70">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-mono font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/10">{item.id}</span>
                    {item.location && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--on-surface-variant)] font-bold bg-[var(--surface-container-high)] px-2 py-0.5 rounded-full border border-[var(--outline)]">
                        <MapPin size={10} />
                        PINNED
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : searchTerm.length >= 2 ? (
          <div className="text-center py-12 text-[var(--on-surface-variant)]">
            <p className="font-bold">No results found for "{searchTerm}"</p>
            <p className="text-sm opacity-60">Try searching for a different keyword or ID.</p>
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--on-surface-variant)]">
            <Search size={64} className="mx-auto mb-4 opacity-5" />
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Ready to Search</p>
            <p className="text-xs mt-2 opacity-60">Scan, type, or take a photo to find your gear.</p>
          </div>
        )}
      </div>
    </div>
  );
}
