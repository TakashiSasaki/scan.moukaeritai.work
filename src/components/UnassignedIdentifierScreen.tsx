import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, PlusCircle, Scan, ArrowRight, Link as LinkIcon, Search } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { ObjectRecord, IdentifierRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { buildIdentifierKey, buildStage1IdentifierMetadata } from '../lib/identifiers';
import { buildActiveBindingId, buildActiveBindingRecord, validateIdentifierCanAttach, findCanonicalBindingsForOwner, loadObjectIdentifiersForSummary, mergeIdentifierForSummary } from '../lib/identifierBindings';
import { computeIdentifierSummary } from '../lib/objectSummaries';
import { createUserIdentifierObservation, UserObservationSource, CreateUserObservationResult } from '../lib/identifierObservations';
import { Timestamp } from 'firebase/firestore';

export default function UnassignedIdentifierScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    kind?: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth',
    scheme?: string,
    canonicalValue?: string,
    source?: string,
    rawValue?: string
  };

  const getValidSource = (src?: string): UserObservationSource => {
    const validSources: UserObservationSource[] = ['nfc', 'qr', 'manual', 'barcode', 'camera'];
    if (src && validSources.includes(src as UserObservationSource)) {
      return src as UserObservationSource;
    }
    // Fallback to manual for legacy/manual-entry navigation paths that do not yet pass an explicit source.
    return 'manual';
  };

  const [mode, setMode] = useState<'options' | 'attach' | 'observe' | 'observe_success' | 'invalid_state'>(() => {
    if (!state || !state.kind || !state.scheme || !state.canonicalValue) {
      return 'invalid_state';
    }
    return 'options';
  });
  const [placeLabel, setPlaceLabel] = useState('');
  const [note, setNote] = useState('');
  const [isObserving, setIsObserving] = useState(false);
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
    navigate('/object/new', { state: { identifier: state } });
  };

  const handleAttach = async (obj: ObjectRecord) => {
     if (!auth.currentUser || !state.kind || !state.scheme || !state.canonicalValue) return;
     setIsAttaching(true);
     try {
        const objectId = obj.objectId;
        const idKey = buildIdentifierKey(state.kind, state.scheme, state.canonicalValue);
        const idRef = doc(db, 'identifiers', idKey);

        const validation = await validateIdentifierCanAttach(db, idKey, objectId, auth.currentUser.uid);
        if (!validation.canAttach) {
            toast.error(validation.error || 'Cannot attach identifier.');
            setIsAttaching(false);
            return;
        }

        const batch = writeBatch(db);

        // 1. Update/Create Identifier
        if (validation.existingId) {
            batch.update(idRef, {
                objectId: objectId,
                status: 'active',
                updatedAt: serverTimestamp()
            });
        } else {
            batch.set(idRef, {
               identifierKey: idKey,
               ownerId: auth.currentUser.uid,
               objectId: objectId,
               kind: state.kind,
               scheme: state.scheme,
               canonicalValue: state.canonicalValue,
               status: 'active',
               createdAt: serverTimestamp(),
               updatedAt: serverTimestamp(),
               ...buildStage1IdentifierMetadata()
            });
        }

        // 2. Create/Update Binding
        // Use deterministic binding ID to avoid duplicating active records
        const bindingId = buildActiveBindingId(objectId, idKey);
        const bindingRef = doc(db, 'objectIdentifierBindings', bindingId);

        const canonicalBindings = await findCanonicalBindingsForOwner(db, auth.currentUser.uid, objectId, idKey);
        const hasCanonicalBinding = canonicalBindings.some(d => d.id === bindingId);

        if (hasCanonicalBinding) {
            batch.update(bindingRef, {
                status: 'active',
                updatedAt: serverTimestamp(),
                detachedAt: deleteField(),
                detachedBy: deleteField()
            });
        } else {
            batch.set(
                bindingRef,
                buildActiveBindingRecord(bindingId, auth.currentUser.uid, objectId, idKey, auth.currentUser.uid)
            );
        }

        // Handle legacy duplicate bindings (detaching them to keep history clean)
        canonicalBindings.forEach(bindDoc => {
            if (bindDoc.id !== bindingId && bindDoc.data().status === 'active') {
                batch.update(bindDoc.ref, {
                    status: 'detached',
                    detachedAt: serverTimestamp(),
                    detachedBy: auth.currentUser.uid,
                    updatedAt: serverTimestamp()
                });
            }
        });

        // 3. Create Event (only if it wasn't already actively bound to this object)
        if (!validation.isIdempotent) {
            const eventId = uuidv4();
            const eventRef = doc(db, 'objectEvents', eventId);
            batch.set(eventRef, {
               eventId,
               ownerId: auth.currentUser.uid,
               objectId: objectId,
               identifierKey: idKey,
               type: 'identifier_attached',
               occurredAt: serverTimestamp(),
               actorUid: auth.currentUser.uid,
               source: 'manual'
            });
        }

        // 4. Update Object Summary
        const allIdentifiers = await loadObjectIdentifiersForSummary(
            db,
            auth.currentUser.uid,
            objectId
        );

        const newIdentifier: IdentifierRecord = validation.existingId
           ? {
               ...validation.existingId,
               objectId: objectId,
               status: 'active',
               updatedAt: serverTimestamp() as any
             }
           : {
               identifierKey: idKey,
               ownerId: auth.currentUser.uid,
               objectId: objectId,
               kind: state.kind,
               scheme: state.scheme,
               canonicalValue: state.canonicalValue,
               status: 'active',
               createdAt: serverTimestamp() as any,
               updatedAt: serverTimestamp() as any,
               ...buildStage1IdentifierMetadata()
             };

        const mergedIdentifiers = mergeIdentifierForSummary(allIdentifiers, newIdentifier);
        const summary = computeIdentifierSummary(mergedIdentifiers);

        const objectRef = doc(db, 'objects', objectId);
        batch.update(objectRef, { identifierSummary: summary, updatedAt: serverTimestamp() });

        await batch.commit();
        if (validation.isIdempotent) {
            toast.success('Identifier is already attached to this object.');
        } else {
            toast.success('Identifier attached.');
        }
        navigate(`/object/${objectId}`);
     } catch (error: any) {
        console.error("Error attaching identifier:", error);
        toast.error(error?.message || "Failed to attach identifier");
     } finally {
        setIsAttaching(false);
     }
  };

  const handleObserve = async () => {
    if (!auth.currentUser) {
      toast.error('観測を記録するにはログインが必要です。');
      return;
    }

    if (!state.kind || !state.scheme || !state.canonicalValue) {
      toast.error('Invalid identifier state.');
      return;
    }

    setIsObserving(true);
    try {
      const idKey = buildIdentifierKey(state.kind, state.scheme, state.canonicalValue);

      const result: CreateUserObservationResult = await createUserIdentifierObservation({
        db,
        identifierInput: {
          identifierKey: idKey,
          kind: state.kind,
          scheme: state.scheme,
          canonicalValue: state.canonicalValue,
          rawValue: state.rawValue
        },
        observationInput: {
          observedAt: Timestamp.now(),
          source: getValidSource(state.source),
          observationType: 'scan',
          placeLabel: placeLabel.trim() || undefined,
          note: note.trim() || undefined
        },
        userContext: {
          uid: auth.currentUser.uid,
          isAnonymous: auth.currentUser.isAnonymous
        }
      });

      if (!result.success) {
        const errorResult = result as Extract<CreateUserObservationResult, { success: false }>;
        if (errorResult.errorMessage) {
          console.error('Observation write failed:', errorResult.errorMessage);
        }

        switch (errorResult.errorCode) {
          case 'identifier-owned-by-other-user':
            toast.error('この識別子は他のユーザーのデータとして登録されているため、観測を記録できません。');
            break;
          case 'not-signed-in':
            toast.error('観測を記録するにはログインが必要です。');
            break;
          case 'invalid-identifier':
            toast.error('識別子情報が不足しているため、観測を記録できません。もう一度スキャンしてください。');
            break;
          case 'transaction-failed':
          default:
            toast.error('観測の記録に失敗しました。時間をおいてもう一度お試しください。');
            break;
        }
        return;
      }

      setMode('observe_success');
    } catch (err: any) {
      console.error('Error recording observation:', err);
      toast.error('観測の記録に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsObserving(false);
    }
  };

  const filteredObjects = objects.filter(o =>
     (o.name && o.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
     o.objectId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-[var(--surface-container)] rounded-3xl p-8 max-w-md w-full text-center border border-[var(--outline)] shadow-lg">
        {mode === 'invalid_state' ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scan size={32} />
            </div>

            <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-2">エラー</h2>
            <p className="text-[var(--on-surface-variant)] mb-8">
              識別子情報が不足しているため、観測を記録できません。もう一度スキャンしてください。
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate('/scanner')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] py-4 px-6 rounded-2xl font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Scan size={20} />
                スキャナーに戻る
              </button>

              <button
                onClick={() => navigate('/app')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ホームに戻る
              </button>
            </div>
          </>
        ) : mode === 'options' ? (
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
                onClick={() => setMode('observe')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Scan size={20} />
                観測だけ記録
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center gap-2 bg-transparent text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:bg-[var(--surface-container-highest)] active:scale-[0.98] transition-all mt-2 border border-[var(--outline)]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : mode === 'observe' ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setMode('options')} className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container-highest)]">
                 <ArrowRight className="rotate-180" size={24} />
              </button>
              <h2 className="text-xl font-bold text-left">観測だけ記録</h2>
            </div>

            <p className="text-[var(--on-surface-variant)] mb-6 text-sm text-left">
              物品を作成せず、この識別子を見つけた記録だけを保存します。
            </p>

            <div className="flex flex-col gap-4 text-left">
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-1">場所メモ (任意)</label>
                <input
                  type="text"
                  value={placeLabel}
                  onChange={(e) => setPlaceLabel(e.target.value)}
                  maxLength={100}
                  placeholder="例: リビングの棚"
                  className="w-full bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-1">メモ (任意)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder="何か気づいたことなど"
                  rows={3}
                  className="w-full bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface)] rounded-xl p-3 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                />
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={handleObserve}
                  disabled={isObserving}
                  className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isObserving ? '保存中...' : '観測を保存'}
                </button>
                <button
                  onClick={() => setMode('options')}
                  disabled={isObserving}
                  className="w-full bg-transparent text-[var(--on-surface)] font-bold py-4 rounded-2xl border border-[var(--outline)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  戻る
                </button>
              </div>
            </div>
          </>
        ) : mode === 'observe_success' ? (
          <>
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scan size={32} />
            </div>

            <h2 className="text-2xl font-bold text-[var(--on-surface)] mb-2">観測を記録しました。</h2>
            <p className="text-[var(--on-surface-variant)] mb-8">
              物品はまだ作成されていません。必要であれば後で物品を作成または関連付けできます。
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate('/scanner')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] py-4 px-6 rounded-2xl font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Scan size={20} />
                スキャナーに戻る
              </button>

              <button
                onClick={() => navigate('/app')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] py-4 px-6 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ホームに戻る
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
