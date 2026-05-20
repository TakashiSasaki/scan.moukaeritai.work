import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, PlusCircle, Scan, ArrowRight, Link as LinkIcon, Search } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ObjectRecord } from '../types';
import { buildIdentifierKey } from '../lib/identifiers';

export default function UnassignedIdentifierScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { kind?: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth', scheme?: string, canonicalValue?: string };

  const [mode, setMode] = useState<'options' | 'attach'>('options');
  const [searchTerm, setSearchTerm] = useState('');
  const [objects, setObjects] = useState<ObjectRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    if (mode === 'attach' && auth.currentUser) {
      const fetchObjects = async () => {
        setIsSearching(true);
        try {
          const q = query(collection(db, 'objects'), where('ownerId', '==', auth.currentUser.uid));
          const snapshot = await getDocs(q);
          const objs = snapshot.docs.map(d => ({ ...d.data(), objectId: d.id })) as ObjectRecord[];
          setObjects(objs);
        } catch (error) {
          console.error("Error fetching objects:", error);
        } finally {
          setIsSearching(false);
        }
      };
      fetchObjects();
    }
  }, [mode]);

  const handleCreateNew = () => {
    navigate('/capture', { state: { initialIdentifier: state } });
  };

  const handleAttach = async (obj: ObjectRecord) => {
     if (!auth.currentUser || !state.kind || !state.scheme || !state.canonicalValue) return;
     setIsAttaching(true);
     try {
        const batch = writeBatch(db);
        const objectId = obj.objectId;
        const idKey = buildIdentifierKey(state.kind, state.scheme, state.canonicalValue);

        // 1. Update/Create Identifier
        const idRef = doc(db, 'identifiers', idKey);
        batch.set(idRef, {
           identifierKey: idKey,
           ownerId: auth.currentUser.uid,
           objectId: objectId,
           kind: state.kind,
           scheme: state.scheme,
           canonicalValue: state.canonicalValue,
           status: 'active',
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Create Binding
        const bindingId = `\${objectId}__\${idKey}__active`;
        const bindingRef = doc(db, 'objectIdentifierBindings', bindingId);
        batch.set(bindingRef, {
           bindingId: bindingId,
           ownerId: auth.currentUser.uid,
           objectId: objectId,
           identifierKey: idKey,
           status: 'active',
           attachedAt: serverTimestamp(),
           attachedBy: auth.currentUser.uid,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
        });

        // 3. Create Event
        const eventRef = doc(collection(db, 'objectEvents'));
        batch.set(eventRef, {
           eventId: eventRef.id,
           ownerId: auth.currentUser.uid,
           objectId: objectId,
           identifierKey: idKey,
           type: 'identifier_attached',
           occurredAt: serverTimestamp(),
           actorUid: auth.currentUser.uid,
           source: 'manual'
        });

        // 4. Update Object Summary
        // Use computeIdentifierSummary for clean logic
        // First we'd need to fetch all current identifiers to be perfect, but to avoid extra reads we can just simulate it based on existing summary
        const summary = obj.identifierSummary || { activeKinds: [], activeIdentifierCount: 0, hasQr: false, hasNfc: false };
        if (!summary.activeKinds.includes(state.kind)) {
           summary.activeKinds.push(state.kind);
        }
        summary.activeIdentifierCount += 1;
        if (state.kind === 'qr') summary.hasQr = true;
        if (state.kind === 'nfc') summary.hasNfc = true;
        // In a real app we would do: const allIds = await fetch... ; const summary = computeIdentifierSummary(allIds);

        const objectRef = doc(db, 'objects', objectId);
        batch.update(objectRef, { identifierSummary: summary, updatedAt: serverTimestamp() });

        await batch.commit();
        navigate(`/object/\${objectId}`);
     } catch (error) {
        console.error("Error attaching identifier:", error);
     } finally {
        setIsAttaching(false);
     }
  };

  const filteredObjects = objects.filter(o =>
     (o.name && o.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
     o.objectId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-[var(--surface-container)] rounded-3xl p-8 max-w-md w-full text-center border border-[var(--outline)] shadow-lg">
        {mode === 'options' ? (
          <>
            <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Scan size={32} />
            </div>

            <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-2">Unassigned Tag</h2>
            <p className="text-[var(--on-surface-variant)] mb-8">
              This identifier ({state?.canonicalValue || 'Unknown'}) is not currently assigned to any object in your inventory.
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] py-4 px-6 rounded-2xl font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <PlusCircle size={20} />
                Create New Object
              </button>

              <button
                onClick={() => setMode('attach')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LinkIcon size={20} />
                Attach to Existing Object
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center gap-2 bg-transparent text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:bg-[var(--surface-container-highest)] active:scale-[0.98] transition-all mt-2 border border-[var(--outline)]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-[60vh]">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setMode('options')} className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container-highest)]">
                 <ArrowRight className="rotate-180" size={24} />
              </button>
              <h2 className="text-xl font-bold text-left">Attach to Object</h2>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" size={20} />
              <input
                type="text"
                placeholder="Search existing objects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--surface)] pl-12 pr-4 py-4 rounded-full outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all border border-[var(--outline)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {isSearching ? (
                <div className="text-center py-8 text-[var(--on-surface-variant)]">Searching...</div>
              ) : filteredObjects.length === 0 ? (
                <div className="text-center py-8 text-[var(--on-surface-variant)]">No matching objects found.</div>
              ) : (
                filteredObjects.map(obj => (
                  <button
                    key={obj.objectId}
                    disabled={isAttaching}
                    onClick={() => handleAttach(obj)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--outline)] hover:border-[var(--primary)] text-left transition-colors bg-[var(--surface)] disabled:opacity-50"
                  >
                     <div className="w-12 h-12 bg-[var(--surface-container-highest)] rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {obj.primaryImageUrl ? (
                           <img src={obj.primaryImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                           <Package className="text-[var(--on-surface-variant)]" size={20} />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className="font-bold truncate text-[var(--on-surface)]">{obj.name || 'Unnamed Object'}</h3>
                       <p className="text-xs text-[var(--on-surface-variant)] font-mono mt-1 truncate">{obj.objectId}</p>
                     </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}