import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, addDoc, deleteField } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';
import { ObjectRecord, IdentifierRecord, ObjectEventRecord, ObjectImageRecord, OperationType, BluetoothTag } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Camera, MapPin, Bluetooth, Trash2, Save, X, ChevronLeft, Image as ImageIcon, Plus, Edit2, Tag, AlertTriangle, Copy, Check, Pause, Activity, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import WebcamCapture from './WebcamCapture';
import { getImageFormatFromUrl } from '../lib/utils';
import { ImageWithLongPress } from './ImageWithLongPress';
import { useUserSettings } from '../hooks/useUserSettings';
import { buildIdentifierKey, normalizeIdentifierInput } from '../lib/identifiers';
import { buildActiveBindingId, buildActiveBindingRecord, findActiveBindingsForOwner, buildDetachedBindingPatch } from '../lib/identifierBindings';
import { computeIdentifierSummary } from '../lib/objectSummaries';
import { formatDistanceToNow } from 'date-fns';

interface UploadProgressState {
  isOpen: boolean;
  step: string;
  logs: string[];
  error?: string;
}

function UploadProgressDialog({ isOpen, step, logs, error, onClose }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface-container)] rounded-[24px] p-6 w-full max-w-sm border border-[var(--outline)] shadow-xl">
        <h3 className="font-bold text-lg mb-4 text-[var(--on-surface)] flex items-center gap-2">
          {error ? <AlertTriangle className="text-red-500" /> : <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>}
          {error ? 'Upload Error' : 'Uploading...'}
        </h3>
        <p className="text-sm font-bold text-[var(--primary)] mb-4">{step}</p>
        <div className="bg-black/90 rounded-xl p-4 h-32 overflow-y-auto flex flex-col-reverse font-mono text-[10px] leading-tight">
          {logs.map((log: string, i: number) => (
            <div key={i} className={`${log.startsWith('Error') ? 'text-red-400 font-bold' : 'text-green-400'} opacity-90`}>{log}</div>
          ))}
        </div>
        {error && (
          <button onClick={onClose} className="mt-4 w-full bg-[var(--surface-container-highest)] text-[var(--on-surface)] font-bold py-3 rounded-xl">Dismiss</button>
        )}
      </div>
    </div>
  );
}

interface CaptureFormProps {
  objectId: string | null;
  initialIdentifier?: { kind: any, scheme: string, canonicalValue: string };
  onClose: () => void;
}

export default function CaptureForm({ objectId, initialIdentifier, onClose }: CaptureFormProps) {
  const { settings } = useUserSettings();
  const navigate = useNavigate();

  const [data, setData] = useState<Partial<ObjectRecord>>({
    objectId: objectId || `OBJ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    name: '',
    description: '',
    status: 'active',
  });

  // State for associated data
  const [identifiers, setIdentifiers] = useState<IdentifierRecord[]>([]);
  const [events, setEvents] = useState<ObjectEventRecord[]>([]);
  const [images, setImages] = useState<ObjectImageRecord[]>([]);

  // Legacy support for bluetooth
  const [bluetoothTags, setBluetoothTags] = useState<BluetoothTag[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!objectId);
  const [showWebcam, setShowWebcam] = useState<'main' | 'context' | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'main' | 'context' | null>(null);

  const [uploadProgressState, setUploadProgressState] = useState<UploadProgressState>({
    isOpen: false,
    step: '',
    logs: [],
  });

  const [newTagName, setNewTagName] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);

  const [activeImageMenu, setActiveImageMenu] = useState<'main' | 'context' | null>(null);

  const mainImageUploadRef = useRef<HTMLInputElement>(null);
  const mainImageCameraRef = useRef<HTMLInputElement>(null);
  const contextImageUploadRef = useRef<HTMLInputElement>(null);
  const contextImageCameraRef = useRef<HTMLInputElement>(null);

  // Identifier Add UI state
  const [showAddIdentifier, setShowAddIdentifier] = useState(false);
  const [newIdentifierKind, setNewIdentifierKind] = useState<'manual' | 'qr'>('manual');
  const [newIdentifierValue, setNewIdentifierValue] = useState('');

  const addLog = (msg: string) => setUploadProgressState(prev => ({ ...prev, logs: [msg, ...prev.logs] }));

  useEffect(() => {
    if (objectId) {
      loadObjectData(objectId);
    }
  }, [objectId]);

  const loadObjectData = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      // 1. Load Object
      const docRef = doc(db, 'objects', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setData(snap.data() as ObjectRecord);
      } else {
        // Migration fallback: check if it's in items
        const oldRef = doc(db, 'items', id);
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists()) {
          toast('Migrating item data to view...', { icon: '🔄' });
          // In a real app we'd redirect to migration or handle on the fly.
          // For now, let's just show an alert that this needs migration first.
          toast.error('This is a legacy item. Please run the migration in the admin panel.');
          onClose();
          return;
        }
      }

      // 2. Load Identifiers
      const idQ = query(
        collection(db, 'identifiers'),
        where('ownerId', '==', auth.currentUser.uid),
        where('objectId', '==', id)
      );
      const idSnap = await getDocs(idQ);
      setIdentifiers(idSnap.docs.map(d => d.data() as IdentifierRecord));

      // 3. Load Images
      const imgQ = query(
        collection(db, 'objectImages'),
        where('ownerId', '==', auth.currentUser.uid),
        where('objectId', '==', id)
      );
      const imgSnap = await getDocs(imgQ);
      setImages(imgSnap.docs.map(d => d.data() as ObjectImageRecord));

      // 4. Load Events (recent)
      const evQ = query(
        collection(db, 'objectEvents'),
        where('ownerId', '==', auth.currentUser.uid),
        where('objectId', '==', id)
      );
      const evSnap = await getDocs(evQ);
      let evs = evSnap.docs.map(d => d.data() as ObjectEventRecord);
      evs.sort((a,b) => {
        const timeA = a.occurredAt?.toMillis ? a.occurredAt.toMillis() : Date.now();
        const timeB = b.occurredAt?.toMillis ? b.occurredAt.toMillis() : Date.now();
        return timeB - timeA;
      });
      setEvents(evs.slice(0, 5));

    } catch (error) {
      console.error("Error loading object:", error);
      handleFirestoreError(error, OperationType.GET, `objects/${id}`);
    } finally {
      setFetching(false);
    }
  };

  const recordEvent = async (type: ObjectEventRecord['type'], metadata?: Record<string, unknown>) => {
    if (!auth.currentUser) return;
    try {
      const eventId = uuidv4();
      const payload: ObjectEventRecord = {
        eventId,
        ownerId: auth.currentUser.uid,
        objectId: data.objectId,
        type,
        occurredAt: serverTimestamp() as any,
        actorUid: auth.currentUser.uid,
        source: 'system',
        metadata
      };
      await setDoc(doc(db, 'objectEvents', eventId), payload);
    } catch (e) {
      console.error("Failed to record event:", e);
    }
  };

  const handleCaptureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          let address = undefined;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'en' }
            });
            if (response.ok) {
              const geoData = await response.json();
              if (geoData && geoData.display_name) {
                address = geoData.display_name;
              }
            }
          } catch (e) {
            console.warn("Reverse geocoding failed", e);
          }

          setData(prev => ({
            ...prev,
            currentLocation: {
              latitude: lat,
              longitude: lng,
              address,
              updatedAt: serverTimestamp() as any
            }
          }));
          toast.success('Location updated');
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get location. Check permissions.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const uploadToStorage = async (file: File, slot: 'main' | 'context') => {
    if (!auth.currentUser || !data.objectId) return;

    setUploadProgressState({ isOpen: true, step: 'Preparing...', logs: [`Started upload process for ${slot} image`] });
    setUploadingImage(slot);

    try {
      let finalFile = file;
      let finalFileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const targetFormat = settings?.imageFormat || 'webp';
      const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');

      addLog(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB, type: ${file.type})`);

      if (isHeic) {
        setUploadProgressState(prev => ({ ...prev, step: 'Converting HEIC to JPEG...' }));
        addLog('HEIC format detected. Starting conversion...');
        try {
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 }) as Blob;
          finalFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpeg'), { type: 'image/jpeg' });
          finalFileExtension = 'jpeg';
          addLog(`Conversion successful. New size: ${(finalFile.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (convErr) {
          addLog(`Warning: HEIC conversion failed: ${convErr}. Proceeding with original file.`);
        }
      }

      setUploadProgressState(prev => ({ ...prev, step: 'Compressing image...' }));
      const maxRes = settings?.maxResolution || 1024;
      const compQual = settings?.compressionQuality || 0.8;

      const compressedFile = await new Promise<File>((resolve) => {
         const reader = new FileReader();
         reader.onload = (e) => {
           const img = new Image();
           img.onload = () => {
             const canvas = document.createElement('canvas');
             let width = img.width;
             let height = img.height;

             if (width > height) {
               if (width > maxRes) { height *= maxRes / width; width = maxRes; }
             } else {
               if (height > maxRes) { width *= maxRes / height; height = maxRes; }
             }

             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(img, 0, 0, width, height);

             canvas.toBlob((blob) => {
               if (blob) resolve(new File([blob], `image.${targetFormat}`, { type: `image/${targetFormat}` }));
               else resolve(finalFile);
             }, `image/${targetFormat}`, compQual);
           };
           img.src = e.target?.result as string;
         };
         reader.readAsDataURL(finalFile);
      });

      finalFile = compressedFile;
      finalFileExtension = targetFormat;
      addLog(`Compression complete. Final size: ${(finalFile.size / 1024 / 1024).toFixed(2)} MB`);

      setUploadProgressState(prev => ({ ...prev, step: 'Uploading to cloud...' }));
      const fileId = uuidv4();
      const storageRef = ref(storage, `users/${auth.currentUser.uid}/objects/${data.objectId}/images/${fileId}.${finalFileExtension}`);

      const uploadTask = uploadBytesResumable(storageRef, finalFile);

      return new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress === 100) addLog('Upload 100% complete. Waiting for download URL...');
          },
          (error) => {
            addLog(`Error during upload: ${error.message}`);
            setUploadProgressState(prev => ({ ...prev, error: error.message, step: 'Failed' }));
            setUploadingImage(null);
            reject(error);
          },
          async () => {
            addLog(`File uploaded to storage: ${uploadTask.snapshot.metadata.fullPath}`);
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            addLog('Download URL generated successfully.');

            // Create ObjectImageRecord
            const imageId = fileId;
            const imgRecord: ObjectImageRecord = {
              imageId,
              ownerId: auth.currentUser!.uid,
              objectId: data.objectId!,
              role: slot === 'main' ? 'primary' : 'context',
              storagePath: uploadTask.snapshot.metadata.fullPath,
              downloadUrl,
              contentType: `image/${finalFileExtension}`,
              sizeBytes: finalFile.size,
              createdAt: serverTimestamp() as any,
              createdBy: auth.currentUser!.uid
            };

            await setDoc(doc(db, 'objectImages', imageId), imgRecord);

            if (slot === 'main') {
              setData(prev => ({ ...prev, primaryImageId: imageId, primaryImageUrl: downloadUrl }));
            }

            // Refetch images
            const imgQ = query(
              collection(db, 'objectImages'),
              where('ownerId', '==', auth.currentUser!.uid),
              where('objectId', '==', data.objectId)
            );
            const imgSnap = await getDocs(imgQ);
            setImages(imgSnap.docs.map(d => d.data() as ObjectImageRecord));

            await recordEvent('image_added', { role: slot, imageId });
            setUploadingImage(null);
            setUploadProgressState(prev => ({ ...prev, isOpen: false }));
            resolve();
          }
        );
      });

    } catch (err: any) {
      setUploadProgressState(prev => ({ ...prev, error: err.message || 'Unknown error', step: 'Failed' }));
      setUploadingImage(null);
    }
  };

  const handleImageUpload = (file: File | undefined, isContext: boolean) => {
    if (file) {
      setActiveImageMenu(null);
      uploadToStorage(file, isContext ? 'context' : 'main');
    }
  };

  const handleAddIdentifier = async () => {
    if (!newIdentifierValue.trim() || !auth.currentUser || !data.objectId) return;

    setLoading(true);
    try {
      const { kind, scheme, canonicalValue } = normalizeIdentifierInput(newIdentifierValue, newIdentifierKind, newIdentifierKind === 'qr' ? 'qr-plain-token' : 'manual-code');
      const idKey = buildIdentifierKey(kind, scheme, canonicalValue);

      // Check if identifier already exists and is active
      const idRef = doc(db, 'identifiers', idKey);
      const idSnap = await getDoc(idRef);

      let isNewIdentifier = true;
      let existingId: IdentifierRecord | null = null;

      if (idSnap.exists()) {
        isNewIdentifier = false;
        existingId = idSnap.data() as IdentifierRecord;

        if (existingId.status === 'active') {
          if (existingId.objectId === data.objectId) {
            toast.success('Identifier is already attached to this object.');
            setShowAddIdentifier(false);
            setNewIdentifierValue('');
            return;
          } else {
            toast.error('Identifier is already active on another object.');
            return;
          }
        }
      }

      // Add to local state
      const newIdRecord: IdentifierRecord = {
        identifierKey: idKey,
        ownerId: auth.currentUser.uid,
        objectId: data.objectId,
        kind,
        scheme,
        canonicalValue,
        status: 'active',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };

      setIdentifiers(prev => {
        const filtered = prev.filter(i => i.identifierKey !== idKey);
        return [...filtered, newIdRecord];
      });

      // We don't save to firestore right away, we let handleSave do it,
      // EXCEPT if the object already exists, then we save it directly to keep it simple and consistent with detach
      if (objectId) {
        // Save directly if we are editing an existing object
        const bindId = buildActiveBindingId(objectId, idKey);

        if (isNewIdentifier) {
           await setDoc(idRef, newIdRecord);
        } else {
           await updateDoc(idRef, {
             objectId: objectId,
             status: 'active',
             updatedAt: serverTimestamp()
           });
        }

        const bindRef = doc(db, 'objectIdentifierBindings', bindId);
        const activeBindings = await findActiveBindingsForOwner(db, auth.currentUser.uid, objectId, idKey);
        const hasCanonicalBinding = activeBindings.some(doc => doc.id === bindId);

        if (hasCanonicalBinding) {
           await updateDoc(bindRef, {
             status: 'active',
             updatedAt: serverTimestamp(),
             detachedAt: deleteField(),
             detachedBy: deleteField()
           });
        } else {
           await setDoc(
             bindRef,
             buildActiveBindingRecord(bindId, auth.currentUser.uid, objectId, idKey, auth.currentUser.uid)
           );
        }

        await recordEvent('identifier_attached', { identifierKey: idKey });

        // Recompute summary and update object
        const newIdentifiers = [...identifiers.filter(i => i.identifierKey !== idKey), newIdRecord];
        const summary = computeIdentifierSummary(newIdentifiers);

        await updateDoc(doc(db, 'objects', objectId), {
          identifierSummary: summary,
          updatedAt: serverTimestamp()
        });

        toast.success('Identifier added.');
      }

      setShowAddIdentifier(false);
      setNewIdentifierValue('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add identifier');
    } finally {
      setLoading(false);
    }
  };

  const handleDetachIdentifier = async (idr: IdentifierRecord) => {
    if (!auth.currentUser || !data.objectId) return;

    // Only allow detach if object is saved already to keep simple
    if (!objectId) {
      // Just remove from local state
      setIdentifiers(prev => prev.filter(i => i.identifierKey !== idr.identifierKey));
      return;
    }

    if (!confirm('Are you sure you want to detach this identifier?')) return;

    setLoading(true);
    try {
      const idRef = doc(db, 'identifiers', idr.identifierKey);

      // We search for the current active binding because previous bindings might have used uuidv4
      const activeBindings = await findActiveBindingsForOwner(db, auth.currentUser.uid, objectId, idr.identifierKey);

      // Update identifier status to unassigned, remove objectId
      await updateDoc(idRef, {
        status: 'unassigned',
        objectId: deleteField(),
        updatedAt: serverTimestamp()
      });

      // Update binding status to detached
      if (activeBindings.length > 0) {
        // Detach all active bindings found (including legacy duplicates)
        for (const bindDoc of activeBindings) {
          await updateDoc(bindDoc.ref, buildDetachedBindingPatch(auth.currentUser.uid));
        }
      } else {
        // If we didn't find an active one, it means there wasn't one recorded or it was lost in migration.
        // We can just log an event to keep history consistent.
        console.warn(`No active binding found to detach for ${idr.identifierKey}`);
      }

      await recordEvent('identifier_detached', { identifierKey: idr.identifierKey });

      // Recompute summary and update object
      const newIdentifiers = identifiers.filter(i => i.identifierKey !== idr.identifierKey);
      setIdentifiers(newIdentifiers);

      const summary = computeIdentifierSummary(newIdentifiers);
      await updateDoc(doc(db, 'objects', objectId), {
        identifierSummary: summary,
        updatedAt: serverTimestamp()
      });

      toast.success('Identifier detached.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to detach identifier');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'objects', data.objectId!);

      // Compute summary
      const activeIdentifiers = identifiers.filter(i => i.status === 'active');

      // If we're creating a new object and have an initial identifier, make sure it's included in the summary
      // unless it's already in the identifiers list
      if (initialIdentifier && !objectId) {
        const idKey = buildIdentifierKey(initialIdentifier.kind, initialIdentifier.scheme, initialIdentifier.canonicalValue);
        const alreadyExists = activeIdentifiers.some(i => i.identifierKey === idKey);
        if (!alreadyExists) {
          activeIdentifiers.push({
            identifierKey: idKey,
            ownerId: auth.currentUser.uid,
            kind: initialIdentifier.kind,
            scheme: initialIdentifier.scheme,
            canonicalValue: initialIdentifier.canonicalValue,
            status: 'active',
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
          });
        }
      }

      const identifierSummary = computeIdentifierSummary(activeIdentifiers);

      const payload = {
        ...data,
        ownerId: auth.currentUser.uid,
        identifierSummary,
        updatedAt: serverTimestamp(),
      };

      if (!objectId) {
        // New object
        await setDoc(docRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await recordEvent('created');

        // Bind any identifiers that were added while in "New Object" mode
        // including the initialIdentifier (which is already added to activeIdentifiers list above)
        for (const idr of activeIdentifiers) {
           const idRef = doc(db, 'identifiers', idr.identifierKey);

           const idSnap = await getDoc(idRef);
           if (idSnap.exists()) {
             await updateDoc(idRef, {
               objectId: data.objectId,
               status: 'active',
               updatedAt: serverTimestamp()
             });
           } else {
             await setDoc(idRef, {
               identifierKey: idr.identifierKey,
               ownerId: auth.currentUser.uid,
               objectId: data.objectId,
               kind: idr.kind,
               scheme: idr.scheme,
               canonicalValue: idr.canonicalValue,
               status: 'active',
               createdAt: serverTimestamp(),
               updatedAt: serverTimestamp()
             });
           }

           const bindId = buildActiveBindingId(data.objectId!, idr.identifierKey);
           const bindRef = doc(db, 'objectIdentifierBindings', bindId);
           const activeBindings = await findActiveBindingsForOwner(db, auth.currentUser.uid, data.objectId!, idr.identifierKey);
           const hasCanonicalBinding = activeBindings.some(doc => doc.id === bindId);

           if (hasCanonicalBinding) {
             await updateDoc(bindRef, {
               status: 'active',
               updatedAt: serverTimestamp(),
               detachedAt: deleteField(),
               detachedBy: deleteField()
             });
           } else {
             await setDoc(
               bindRef,
               buildActiveBindingRecord(bindId, auth.currentUser.uid, data.objectId!, idr.identifierKey, auth.currentUser.uid)
             );
           }
           await recordEvent('identifier_attached', { identifierKey: idr.identifierKey });
        }
      } else {
        // Update
        await updateDoc(docRef, payload);
        await recordEvent('updated');
      }

      toast.success('Saved successfully');
      onClose();
    } catch (error) {
      console.error("Error saving object:", error);
      handleFirestoreError(error, OperationType.WRITE, `objects/${data.objectId}`);
    } finally {
      setLoading(false);
    }
  };

  const primaryImage = images.find(img => img.imageId === data.primaryImageId) || images.find(img => img.role === 'primary');
  const contextImages = images.filter(img => img.role === 'context');

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
         <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
         <p className="font-bold text-[var(--on-surface-variant)] uppercase tracking-widest text-xs">Loading Object...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 relative bg-[var(--surface)] min-h-screen">
      <div className="p-4 flex items-center justify-between border-b border-[var(--outline)] sticky top-0 bg-[var(--surface-container)]/90 backdrop-blur-md z-10">
        <h2 className="font-bold text-lg tracking-tight text-[var(--on-surface)]">{objectId ? 'Edit Object' : 'New Object'}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Name</label>
            <input 
              className="w-full bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface)] rounded-2xl p-4 text-lg font-bold focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all outline-none mt-1"
              value={data.name || ''}
              onChange={e => setData({...data, name: e.target.value})}
              placeholder="What is this?" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Description</label>
            <textarea 
              className="w-full bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface)] rounded-2xl p-4 min-h-[100px] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all outline-none mt-1 resize-none"
              value={data.description || ''}
              onChange={e => setData({...data, description: e.target.value})}
              placeholder="Add details, condition, contents..."
            />
          </div>
        </div>

        {/* Identifiers View */}
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Identifiers</label>
            <button
              onClick={() => setShowAddIdentifier(!showAddIdentifier)}
              className="text-xs font-bold text-[var(--primary)] flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add Identifier
            </button>
          </div>

          {showAddIdentifier && (
            <div className="bg-[var(--surface-container)] p-4 rounded-xl border border-[var(--outline)] space-y-4 mb-2">
              <div className="flex gap-2 p-1 bg-[var(--surface-container-highest)] rounded-lg">
                <button
                  onClick={() => setNewIdentifierKind('manual')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newIdentifierKind === 'manual' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm' : 'text-[var(--on-surface-variant)]'}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setNewIdentifierKind('qr')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newIdentifierKind === 'qr' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm' : 'text-[var(--on-surface-variant)]'}`}
                >
                  QR Code
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={newIdentifierValue}
                  onChange={e => setNewIdentifierValue(e.target.value)}
                  placeholder={newIdentifierKind === 'qr' ? 'Scan or enter QR token...' : 'Enter manual code...'}
                  className="w-full bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                 <button
                   onClick={() => setShowAddIdentifier(false)}
                   className="text-xs font-bold text-[var(--on-surface-variant)] px-3 py-2"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleAddIdentifier}
                   disabled={!newIdentifierValue.trim() || loading}
                   className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                 >
                   {loading ? 'Adding...' : 'Attach'}
                 </button>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--outline)] text-xs text-[var(--on-surface-variant)]">
                <p className="flex flex-col gap-2">
                  <span className="font-bold flex items-center gap-1"><Bluetooth size={14} /> NFC Identifiers</span>
                  <span>NFC identifiers are added from the scanner. Use Scan → Scan NFC, then attach the detected tag to this object.</span>
                </p>
                <button
                  onClick={() => navigate('/scanner')}
                  className="mt-2 text-[var(--primary)] font-bold flex items-center gap-1 hover:underline"
                >
                  <QrCode size={12} /> Open Scanner
                </button>
              </div>
            </div>
          )}

          {identifiers.length > 0 ? (
             <div className="grid grid-cols-1 gap-2">
               {identifiers.filter(i => i.status === 'active').map(idr => (
                 <div key={idr.identifierKey} className="flex items-center gap-3 bg-[var(--surface-container)] p-3 rounded-xl border border-[var(--outline)]">
                   <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                     <Tag size={16} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-bold uppercase flex items-center gap-2">
                       {idr.kind}
                       <span className="text-[10px] text-neutral-500 lowercase bg-[var(--surface-container-highest)] px-1.5 py-0.5 rounded-full">
                         {idr.scheme}
                       </span>
                     </div>
                     <div className="text-xs font-mono text-neutral-500 truncate mt-0.5" title={idr.canonicalValue}>
                       {idr.canonicalValue}
                     </div>
                   </div>
                   <button
                     onClick={() => handleDetachIdentifier(idr)}
                     disabled={loading}
                     className="p-2 text-[var(--on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                     title="Detach Identifier"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
             </div>
          ) : (
            <div className="bg-[var(--surface-container)] p-4 rounded-xl border border-[var(--outline)] text-center text-sm text-neutral-500">
               {initialIdentifier ? (
                 <p>Will be linked to {initialIdentifier.kind.toUpperCase()} on save.</p>
               ) : (
                 <p>No identifiers linked.</p>
               )}
            </div>
          )}
        </div>

        {/* Photos Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Photos</label>
          <div className="grid grid-cols-3 gap-3">
            {/* Main Photo */}
            <div className={`col-span-2 relative group bg-[var(--surface-container)] rounded-[24px] aspect-square overflow-hidden cursor-pointer transition-all border-2 ${activeImageMenu === 'main' ? 'border-[var(--primary)] ring-4 ring-[var(--primary)]/10' : 'border-[var(--outline)] hover:border-[var(--primary)]/50'}`} onClick={() => setActiveImageMenu(activeImageMenu === 'main' ? null : 'main')}>
              {primaryImage ? (
                <img src={primaryImage.downloadUrl} className="w-full h-full object-cover" alt="Main" />
              ) : (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-all ${activeImageMenu === 'main' ? 'hidden' : 'group-hover:hidden'}`}>
                  <ImageIcon className="text-[var(--on-surface-variant)] opacity-30 mb-2" size={48} />
                  <span className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase opacity-60 mb-1 block">Main Photo</span>
                </div>
              )}
              {/* Upload Overlay */}
              <div className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-3 z-10 ${activeImageMenu === 'main' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button onClick={(e) => { e.stopPropagation(); mainImageUploadRef.current?.click(); setActiveImageMenu(null); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold backdrop-blur-md flex items-center gap-2">
                    <ImageIcon size={16} /> Upload
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowWebcam('main'); setActiveImageMenu(null); }} className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold backdrop-blur-md flex items-center gap-2">
                    <Camera size={16} /> Camera
                  </button>
              </div>
              <input type="file" accept="image/*" hidden ref={mainImageUploadRef} onChange={e => handleImageUpload(e.target.files?.[0], false)} />
            </div>

            {/* Context Photos */}
            <div className="col-span-1 flex flex-col gap-3">
               {contextImages.slice(0, 2).map(img => (
                  <div key={img.imageId} className="relative aspect-square rounded-[20px] overflow-hidden bg-[var(--surface-container)] border border-[var(--outline)]">
                    <img src={img.downloadUrl} className="w-full h-full object-cover" />
                  </div>
               ))}
               <div className="relative aspect-square rounded-[20px] overflow-hidden bg-[var(--surface-container)] border border-[var(--outline)] hover:border-[var(--primary)] flex items-center justify-center cursor-pointer" onClick={() => contextImageUploadRef.current?.click()}>
                 <Plus className="text-neutral-400" />
               </div>
               <input type="file" accept="image/*" hidden ref={contextImageUploadRef} onChange={e => handleImageUpload(e.target.files?.[0], true)} />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <button onClick={handleCaptureLocation} className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all ${data.currentLocation ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--outline)] text-[var(--on-surface-variant)]'}`}>
            <MapPin size={24} />
            <div className="text-left flex-1 min-w-0">
              <span className="block text-sm font-bold">Geo Location</span>
              <span className="block text-xs opacity-70 truncate">{data.currentLocation?.address || 'Capture current spot'}</span>
            </div>
          </button>
        </div>

        {/* Events History View */}
        {events.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Recent Activity</label>
            <div className="bg-[var(--surface-container)] rounded-2xl p-4 border border-[var(--outline)] space-y-3">
               {events.map(ev => (
                 <div key={ev.eventId} className="flex items-start gap-3 text-sm">
                   <div className="mt-0.5 opacity-50"><Activity size={14} /></div>
                   <div>
                     <span className="font-bold text-[var(--on-surface)] capitalize">{ev.type.replace('_', ' ')}</span>
                     <span className="text-xs text-neutral-500 block">{formatDistanceToNow(ev.occurredAt.toDate())} ago</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-[var(--outline)]">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] font-bold py-4 rounded-2xl shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Save Object</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showWebcam && (
          <WebcamCapture onCapture={(file) => { setShowWebcam(null); uploadToStorage(file, showWebcam); }} onCancel={() => setShowWebcam(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
