import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'motion/react';
import { X, Camera, Upload, Save, Trash2, Package, Tag, MapPin, AlignLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sanitizeItemId } from '../lib/utils';

interface CaptureFormProps {
  objectId: string | null;
  initialIdentifier?: any;
  onClose: () => void;
}

export default function CaptureForm({ objectId, initialIdentifier, onClose }: CaptureFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState('');

  useEffect(() => {
    if (objectId) {
      loadObject();
    }
  }, [objectId]);

  const loadObject = async () => {
    if (!objectId) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'objects', objectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || '');
        setDescription(data.description || '');
        setPrimaryImageUrl(data.primaryImageUrl || '');
      }
    } catch (error) {
      console.error("Error loading object:", error);
      toast.error("Failed to load object details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    const id = objectId || sanitizeItemId(name || 'OBJ-' + Date.now());
    
    try {
      const objectData = {
        objectId: id,
        name,
        description,
        ownerId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
        primaryImageUrl: primaryImageUrl,
        status: 'active'
      };

      if (!objectId) {
        // @ts-ignore
        objectData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'objects', id), objectData);
        toast.success("Object created successfully");
      } else {
        await updateDoc(doc(db, 'objects', id), objectData);
        toast.success("Object updated successfully");
      }

      // Legacy identifier binding is intentionally disabled. Legacy collections are
      // retained read-only; Marker/Object Association attach is handled by the
      // EFP-native vertical slice instead of writing identifiers or bindings.
      if (initialIdentifier) {
        toast.error("Legacy identifier binding is read-only. Use the EFP Marker association workflow.");
      }

      onClose();
    } catch (error) {
      console.error("Error saving object:", error);
      toast.error("Failed to save object");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    try {
      const storagePath = `objects/${objectId || 'temp'}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage)
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      setPrimaryImageUrl(url);
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic">
            {objectId ? 'Edit Object' : 'New Object'}
          </h1>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">
            {objectId ? `ID: ${objectId}` : 'Define a new item in your inventory'}
          </p>
        </div>
        <button onClick={onClose} className="bg-[var(--surface-container-highest)] p-2 rounded-xl text-[var(--on-surface-variant)]">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-[var(--surface-container)] rounded-[32px] p-6 border border-[var(--outline)] space-y-6">
          {/* Image Upload Area */}
          <div className="relative aspect-video bg-[var(--surface-container-highest)] rounded-2xl overflow-hidden border border-[var(--outline)] group">
            {primaryImageUrl ? (
              <img src={primaryImageUrl} alt="Object" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--on-surface-variant)] opacity-40">
                <Package size={64} />
                <p className="font-bold mt-2">No Image</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <label className="bg-white text-black p-3 rounded-full cursor-pointer hover:scale-110 transition-transform">
                <Upload size={24} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </label>
              <button type="button" className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform">
                <Camera size={24} />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">
                <AlignLeft size={14} /> Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter item name..."
                required
                className="w-full bg-[var(--surface)] border border-[var(--outline)] rounded-xl py-3 px-4 text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest ml-1">
                <AlignLeft size={14} /> Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this object..."
                rows={4}
                className="w-full bg-[var(--surface)] border border-[var(--outline)] rounded-xl py-3 px-4 text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {initialIdentifier && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-amber-500 p-2 rounded-lg text-white">
              <Tag size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">New Tag Detected</div>
              <div className="text-sm font-bold text-[var(--on-surface)]">{initialIdentifier.identifierKey}</div>
              <div className="text-[10px] text-[var(--on-surface-variant)] font-medium">This tag will be bound to the new object.</div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 bg-[var(--primary)] text-[var(--primary-foreground)] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Save size={20} />
                {objectId ? 'Update Object' : 'Create Object'}
              </>
            )}
          </button>
          
          {objectId && (
            <button
              type="button"
              className="bg-red-500/10 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              <Trash2 size={24} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
