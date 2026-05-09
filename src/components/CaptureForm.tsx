import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';
import { Item, BluetoothTag, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { Camera, MapPin, Bluetooth, Trash2, Save, X, ChevronLeft, Image as ImageIcon, Plus, Edit2, Tag, AlertTriangle, Copy, Check, Pause } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import WebcamCapture from './WebcamCapture';
import { getImageFormatFromUrl } from '../lib/utils';
import { ImageWithLongPress } from './ImageWithLongPress';

const UploadProgressDialog = ({ 
  isOpen, 
  step, 
  logs, 
  onClose,
  error
}: { 
  isOpen: boolean; 
  step: 'idle' | 'compressing' | 'uploading' | 'getting_url' | 'done' | 'error';
  logs: string[];
  onClose: () => void;
  error?: string | null;
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLogs = async () => {
    try {
      const logText = logs.join('\n');
      await navigator.clipboard.writeText(`Upload Logs:\n${logText}\n\nError: ${error || 'None'}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col gap-4"
        >
          <div className="flex items-center gap-3 border-b border-[var(--outline)] pb-3">
            <div className="w-10 h-10 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center">
              {step === 'error' ? <AlertTriangle size={24} className="text-red-500" /> : <ImageIcon size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-[var(--on-surface)] leading-tight">Image Upload</h3>
              <p className="text-xs text-[var(--on-surface-variant)]">
                {step === 'compressing' && 'Compressing image...'}
                {step === 'uploading' && 'Uploading to cloud...'}
                {step === 'getting_url' && 'Finalizing...'}
                {step === 'done' && 'Upload complete'}
                {step === 'error' && 'Upload failed'}
              </p>
            </div>
            {step !== 'error' && step !== 'done' && (
              <div className="ml-auto">
                <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {(step === 'error' || step === 'done') && (
              <button 
                onClick={onClose}
                className="ml-auto p-2 bg-[var(--surface)] text-[var(--on-surface)] rounded-full border border-[var(--outline)] hover:bg-[var(--surface-container-highest)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="relative">
            <div className="bg-[var(--surface)] p-3 rounded-2xl border border-[var(--outline)] max-h-40 overflow-y-auto font-mono text-[10px] text-[var(--on-surface-variant)] flex flex-col gap-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="opacity-50 text-[var(--primary)]">{'>'}</span>
                  <span>{log}</span>
                </div>
              ))}
              {step !== 'error' && step !== 'done' && (
                <div className="flex gap-2 animate-pulse">
                  <span className="opacity-50 text-[var(--primary)]">{'>'}</span>
                  <span>_</span>
                </div>
              )}
            </div>
            <button 
              onClick={handleCopyLogs}
              className="absolute top-2 right-2 p-1.5 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] rounded-lg border border-[var(--outline)] hover:text-[var(--primary)] transition-colors active:scale-95"
              title="Copy details"
            >
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </div>

          {error && (
             <div className="bg-red-500/10 text-red-500 p-3 rounded-2xl text-xs whitespace-pre-wrap overflow-hidden max-h-40 overflow-y-auto">
                {error}
             </div>
          )}

          {(step === 'error' || step === 'done') && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--surface)] text-[var(--on-surface)] font-bold rounded-2xl hover:bg-[var(--surface-container-highest)] transition-colors border border-[var(--outline)] active:scale-[0.98]"
            >
              Close
            </button>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface CaptureFormProps {
  itemId: string | null;
  onClose: () => void;
}

export default function CaptureForm({ itemId, onClose }: CaptureFormProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Partial<Item>>({
    id: itemId || `ITEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    name: '',
    description: '',
    contextImageUrls: [],
    bluetoothTags: [],
    tagType: itemId ? 'qr' : 'none',
  });
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [uploadProgressState, setUploadProgressState] = useState<{
    isOpen: boolean;
    step: 'idle' | 'compressing' | 'uploading' | 'getting_url' | 'done' | 'error';
    error?: string;
    logs: string[];
  }>({ isOpen: false, step: 'idle', logs: [] });
  const mainImageUploadRef = useRef<HTMLInputElement>(null);
  const mainImageCameraRef = useRef<HTMLInputElement>(null);
  const contextImageUploadRef = useRef<HTMLInputElement>(null);
  const contextImageCameraRef = useRef<HTMLInputElement>(null);
  const [activeImageMenu, setActiveImageMenu] = useState<'main' | 'context' | null>(null);
  const [showWebcam, setShowWebcam] = useState<'main' | 'context' | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [dragTarget, setDragTarget] = useState<'main' | 'context' | null>(null);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);

  const toggleImageMenu = (slot: 'main' | 'context', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageMenu(prev => prev === slot ? null : slot);
  };

  const handleTakePhotoClick = (slot: 'main' | 'context', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageMenu(null);
    
    // Check if device is likely mobile
    // Mobile browsers usually have better native support for capture="environment"
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      if (slot === 'main') mainImageCameraRef.current?.click();
      else contextImageCameraRef.current?.click();
    } else {
      setShowWebcam(slot);
    }
  };

  const handleDragOver = (e: React.DragEvent, target: 'main' | 'context') => {
    e.preventDefault();
    setDragTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, isContext: boolean) => {
    e.preventDefault();
    setDragTarget(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleImageUpload(file, isContext);
    } else if (file) {
      toast.error('Please drop an image file.');
    }
  };

  const handleAddManualTag = () => {
    if (!newTagName.trim()) return;
    const newTag: BluetoothTag = {
      name: newTagName.trim(),
      id: `MANUAL-${uuidv4().split('-')[0].toUpperCase()}`,
    };
    setData(prev => ({
      ...prev,
      bluetoothTags: [...(prev.bluetoothTags || []), newTag]
    }));
    setNewTagName('');
  };

  const handleRemoveTag = (index: number) => {
    setData(prev => ({
      ...prev,
      bluetoothTags: prev.bluetoothTags?.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTag = (index: number, name: string) => {
    setData(prev => ({
      ...prev,
      bluetoothTags: prev.bluetoothTags?.map((tag, i) => i === index ? { ...tag, name } : tag)
    }));
    setEditingTagIndex(null);
  };


  useEffect(() => {
    if (itemId) {
      loadItem(itemId);
    }
  }, [itemId]);

  const loadItem = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'items', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setData(snap.data() as Item);
      } else {
        // If it doesn't exist, it might be a new ID from a scan
        setData(prev => ({ ...prev, id }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `items/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported in this browser.');
      return;
    }

    toast.promise(
      new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            let address: string | undefined = undefined;

            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'Accept-Language': 'ja,en',
                    'User-Agent': 'InventoryManagerApp/1.0'
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                  address = data.display_name;
                }
              }
            } catch (err) {
              console.error("Reverse geocoding failed", err);
            }

            setData(prev => ({
              ...prev,
              location: {
                latitude,
                longitude,
                address,
              }
            }));
            resolve();
          },
          (error) => {
            console.error('Location error:', error);
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }),
      {
        loading: 'Getting location & address...',
        success: 'Location captured!',
        error: 'Failed to get location.',
      }
    );
  };

  const handleImageUpload = async (file: File | undefined, isContext: boolean = false) => {
    if (!file || !auth.currentUser) return;

    const slot = isContext ? 'context' : 'main';
    setUploadingImage(slot);
    setUploadProgressState({
      isOpen: true,
      step: 'compressing',
      logs: [`Started upload process for ${slot} image`],
    });

    const addLog = (log: string) => {
      console.log(`[Upload] ${log}`);
      setUploadProgressState(prev => ({ ...prev, logs: [...prev.logs, log] }));
    };

    const handleError = (error: any) => {
      console.error('Upload error:', error);
      let errorDetails = String(error);
      
      try {
        if (error instanceof Error) errorDetails = error.message;
        else if (error?.message) errorDetails = error.message;
        else if (typeof error === 'object' && error !== null) {
          const props: Record<string, any> = {};
          for (const key in error) props[key] = (error as any)[key];
          if (error instanceof Event) {
            props.type = error.type;
            props.eventPhase = error.eventPhase;
          }
          if ((error as any).code) props.code = (error as any).code;
          if ((error as any).name) props.name = (error as any).name;
          const str = JSON.stringify(props, null, 2);
          if (str !== '{}') errorDetails = str;
        }
      } catch (e) {
        errorDetails = String(error);
      }

      setUploadProgressState(prev => ({ ...prev, step: 'error', error: errorDetails }));
    };

    try {
      addLog('Processing image for upload...');
      
      const compressImage = async (inputFile: File, maxSize: number): Promise<Blob> => {
        let fileOrBlob: File | Blob = inputFile;
        let isConvertAttempted = false;

        const attemptImgLoad = (blob: Blob): Promise<Blob> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(blob);
            
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxSize) {
                  height *= maxSize / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width *= maxSize / height;
                  height = maxSize;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              addLog('Image resized successfully.');
              
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Canvas toBlob failed'));
              }, 'image/jpeg', 0.6);
            };
            
            img.onerror = async (e) => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error(`Failed to load image. Type: ${inputFile.type}`));
            };
            
            img.src = objectUrl;
          });
        };

        const isHeic = inputFile.type === 'image/heic' || inputFile.type === 'image/heif' || inputFile.name.toLowerCase().endsWith('.heic') || inputFile.name.toLowerCase().endsWith('.heif');
        
        if (isHeic) {
          addLog('HEIC format detected, converting to JPEG...');
          try {
            const converted = await heic2any({ blob: inputFile, toType: 'image/jpeg', quality: 0.6 });
            fileOrBlob = Array.isArray(converted) ? converted[0] : converted;
            isConvertAttempted = true;
            addLog('HEIC conversion successful.');
          } catch (heicErr) {
            addLog('HEIC conversion failed, proceeding with original...');
          }
        }

        try {
          return await attemptImgLoad(fileOrBlob);
        } catch (err) {
          if (!isConvertAttempted) {
             addLog('Browser failed to load image. Attempting HEIC fallback just in case...');
             try {
                const converted = await heic2any({ blob: inputFile, toType: 'image/jpeg', quality: 0.6 });
                fileOrBlob = Array.isArray(converted) ? converted[0] : converted;
                addLog('HEIC fallback successful.');
                return await attemptImgLoad(fileOrBlob);
             } catch (fallbackErr) {
                addLog('HEIC fallback failed.');
                throw err;
             }
          }
          throw err;
        }
      };

      setUploadProgressState(prev => ({ ...prev, step: 'compressing' }));
      let finalBlobUpload: Blob;
      try {
        finalBlobUpload = await compressImage(file, 1024); // max 1024px
        addLog(`Image compressed. Size: ${(finalBlobUpload.size / 1024).toFixed(2)} KB`);
      } catch (e) {
         addLog(`Compression failed: ${e instanceof Error ? e.message : String(e)}. Proceeding with raw file...`);
         finalBlobUpload = file; // fallback
         addLog(`Fallback size: ${(finalBlobUpload.size / 1024).toFixed(2)} KB`);
      }

      setUploadProgressState(prev => ({ ...prev, step: 'uploading' }));
      addLog('Initiating Firebase Storage upload...');

      const fileId = uuidv4();
      const storageRef = ref(storage, `users/${auth.currentUser.uid}/items/${data.id}/${slot}/${fileId}.jpg`);

      const snapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, finalBlobUpload, { contentType: 'image/jpeg' });
        
        const timeoutId = setTimeout(() => {
          // If no progress at all, or just overall slow upload, cancel it.
          uploadTask.cancel();
          reject(new Error('Upload timed out. Is Firebase Storage enabled? Please go to the Firebase Console -> Storage -> "Get Started" and ensure your rules allow uploads.'));
        }, 15000);

        let lastProgressLog = 0;
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress - lastProgressLog >= 25 || progress === 100) {
              addLog(`Upload progress: ${Math.round(progress)}%`);
              lastProgressLog = progress;
            }
          }, 
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }, 
          () => {
            clearTimeout(timeoutId);
            resolve(uploadTask.snapshot);
          }
        );
      });

      addLog(`File uploaded to storage: ${snapshot.metadata.fullPath}`);

      setUploadProgressState(prev => ({ ...prev, step: 'getting_url' }));
      addLog('Retrieving download URL...');
      const url = await getDownloadURL(snapshot.ref);
      addLog('URL retrieved successfully.');

      // Update appropriate field in the form state
      if (isContext) {
        setData(prev => ({
          ...prev,
          contextImageUrls: [...(prev.contextImageUrls || []), url]
        }));
      } else {
        setData(prev => ({ ...prev, mainImageUrl: url }));
      }

      setUploadProgressState(prev => ({ ...prev, step: 'done' }));
      setTimeout(() => {
        setUploadProgressState(prev => ({ ...prev, isOpen: false }));
      }, 2000); // auto-close after 2s on success

    } catch (error) {
      handleError(error);
    } finally {
      if (mainImageUploadRef.current) mainImageUploadRef.current.value = '';
      if (mainImageCameraRef.current) mainImageCameraRef.current.value = '';
      if (contextImageUploadRef.current) contextImageUploadRef.current.value = '';
      if (contextImageCameraRef.current) contextImageCameraRef.current.value = '';
      setUploadingImage(null);
    }
  };

  const handleBluetoothScan = async () => {
    // Web Bluetooth API is limited. Most browsers only support requestDevice which is 1-by-1.
    // For a real "nearby tags" app, we'd ideally use a native bridge, but here we'll mock or try availability.
    if ('bluetooth' in navigator) {
      try {
        // @ts-ignore - experimental API
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service']
        });
        
        const newTag: BluetoothTag = {
          name: device.name || 'Unknown Device',
          id: device.id,
        };
        
        setData(prev => ({
          ...prev,
          bluetoothTags: [...(prev.bluetoothTags || []), newTag]
        }));
        } catch (error) {
          console.error('Bluetooth error:', error);
          toast.error('Failed to connect to Bluetooth device.');
        }
      } else {
        toast.error('Bluetooth is not supported in this browser.');
      }
    };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'items', data.id!);
      const payload = {
        ...data,
        ownerId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (!itemId) {
        // New item
        await setDoc(docRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        // Update
        await updateDoc(docRef, payload);
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `items/${data.id}`);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    // Simple delete logic
  };

  return (
    <div 
      className="bg-[var(--surface-container)] min-h-screen rounded-t-[32px] shadow-2xl overflow-hidden pb-32"
      onClick={() => activeImageMenu && setActiveImageMenu(null)}
    >
      <AnimatePresence>
        {showWebcam && (
          <WebcamCapture 
            onCapture={(file) => {
              setShowWebcam(null);
              handleImageUpload(file, showWebcam === 'context');
            }}
            onCancel={() => setShowWebcam(null)}
          />
        )}
      </AnimatePresence>

      <div className="p-4 flex items-center justify-between border-b border-[var(--outline)] sticky top-0 bg-[var(--surface-container)]/90 backdrop-blur-md z-10">
        <button onClick={onClose} className="p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] rounded-full transition-colors"><ChevronLeft size={24} /></button>
        <h2 className="font-bold text-lg tracking-tight text-[var(--on-surface)]">{itemId ? 'Edit Item' : 'Add New Item'}</h2>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-full font-bold shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* ID Section */}
        <div className="bg-[var(--surface)] p-4 rounded-[24px] space-y-2 border border-[var(--outline)]">
          <label className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest px-1">Identification ID</label>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-[var(--primary)]">{data.id}</span>
            <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] font-bold px-2 py-1 rounded-full uppercase border border-[var(--primary)]/10">{data.tagType}</span>
          </div>
        </div>

        {/* Name & Description */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--on-surface-variant)] ml-1">Name</label>
            <input 
              type="text" 
              placeholder="What is this?" 
              value={data.name} 
              onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full text-2xl font-bold border-none focus:ring-0 placeholder:text-[var(--on-surface-variant)]/30 p-0 bg-transparent text-[var(--on-surface)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--on-surface-variant)] ml-1">Description</label>
            <textarea 
              placeholder="Add details, features, or context..." 
              value={data.description} 
              onChange={e => setData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border-2 border-[var(--outline)] rounded-2xl p-3 focus:border-[var(--primary)] transition-colors outline-none bg-[var(--surface)] text-[var(--on-surface)]"
            />
          </div>
        </div>

        {/* Photos Section */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest">Photos</label>
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`relative aspect-square bg-[var(--surface-container-high)] rounded-[28px] border-2 border-dashed overflow-hidden group transition-all cursor-pointer ${
                dragTarget === 'main' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--outline)] hover:border-[var(--primary)]/50'
              }`}
              onClick={(e) => toggleImageMenu('main', e)}
              onDragOver={(e) => handleDragOver(e, 'main')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, false)}
            >
              {data.mainImageUrl ? (
                <>
                  <ImageWithLongPress 
                    url={data.mainImageUrl} 
                    className="w-full h-full object-cover" 
                    wrapperClassName="w-full h-full absolute inset-0"
                  >
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] font-black tracking-wider text-white uppercase border border-white/10 z-10 pointer-events-none">
                      {getImageFormatFromUrl(data.mainImageUrl)}
                    </div>
                  </ImageWithLongPress>
                  <div className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-3 ${activeImageMenu === 'main' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); mainImageUploadRef.current?.click(); setActiveImageMenu(null); }} 
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold backdrop-blur-md flex items-center gap-2 transition-colors border border-white/20"
                    >
                       <ImageIcon size={14} /> Upload New
                    </button>
                    <button 
                      onClick={(e) => handleTakePhotoClick('main', e)} 
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-xs font-bold backdrop-blur-md flex items-center gap-2 transition-colors border border-white/20"
                    >
                       <Camera size={14} /> Take Photo
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className={`text-[var(--on-surface-variant)] opacity-30 mb-2 transition-all ${activeImageMenu === 'main' ? 'hidden' : 'group-hover:hidden'}`} size={32} />
                  <span className={`text-[10px] font-bold text-[var(--on-surface-variant)] uppercase opacity-60 mb-4 block ${activeImageMenu === 'main' ? 'hidden' : 'group-hover:hidden'}`}>Main Photo</span>
                  <div className={`flex-col gap-2 w-full px-2 ${activeImageMenu === 'main' ? 'flex' : 'hidden group-hover:flex'} transition-opacity`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); mainImageUploadRef.current?.click(); setActiveImageMenu(null); }} 
                      className="w-full bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-full px-3 py-2 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors border border-[var(--outline)]"
                    >
                      <ImageIcon size={12} className="text-[var(--primary)]" /> Upload
                    </button>
                    <button 
                      onClick={(e) => handleTakePhotoClick('main', e)} 
                      className="w-full bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-full px-3 py-2 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors border border-[var(--outline)]"
                    >
                      <Camera size={12} className="text-[var(--primary)]" /> Camera
                    </button>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" hidden ref={mainImageUploadRef} onChange={e => handleImageUpload(e.target.files?.[0], false)} />
              <input type="file" accept="image/*" capture="environment" hidden ref={mainImageCameraRef} onChange={e => handleImageUpload(e.target.files?.[0], false)} />
              {uploadingImage === 'main' && <div className="absolute inset-0 bg-[var(--surface-container)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2"><div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div><span className="text-[10px] font-bold text-[var(--primary)]">Uploading...</span></div>}
            </div>

            <div 
              className={`relative aspect-square bg-[var(--surface-container-high)] rounded-[28px] border-2 border-dashed overflow-hidden group transition-all cursor-pointer ${
                dragTarget === 'context' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--outline)] hover:border-[var(--primary)]/50'
              }`}
              onClick={(e) => toggleImageMenu('context', e)}
              onDragOver={(e) => handleDragOver(e, 'context')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, true)}
            >
              <div className="absolute inset-0 flex flex-wrap gap-1 p-2 w-full h-full justify-center content-center pointer-events-none">
                {data.contextImageUrls && data.contextImageUrls.length > 0 ? (
                  data.contextImageUrls.map((url, i) => (
                    <ImageWithLongPress 
                      key={i}
                      url={url} 
                      className="w-full h-full object-cover rounded-[12px] shadow-sm border border-white/50" 
                      wrapperClassName="relative w-1/3 aspect-square pointer-events-auto"
                    >
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-[6px] font-black tracking-wider text-white uppercase border border-white/10 z-10 pointer-events-none">
                        {getImageFormatFromUrl(url)}
                      </div>
                    </ImageWithLongPress>
                  ))
                ) : (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-all ${activeImageMenu === 'context' ? 'hidden' : 'group-hover:hidden'}`}>
                    <ImageIcon className="text-[var(--on-surface-variant)] opacity-30 mb-2" size={32} />
                    <span className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase opacity-60 mb-4 block">Surroundings</span>
                  </div>
                )}
              </div>
              <div className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-2 overflow-hidden px-2 z-10 ${activeImageMenu === 'context' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); contextImageUploadRef.current?.click(); setActiveImageMenu(null); }} 
                  className="w-[80%] max-w-[120px] bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-2 text-[10px] font-bold backdrop-blur-md flex items-center justify-center gap-1.5 transition-colors border border-white/20"
                >
                   <ImageIcon size={12} /> Upload
                </button>
                <button 
                  onClick={(e) => handleTakePhotoClick('context', e)} 
                  className="w-[80%] max-w-[120px] bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-2 text-[10px] font-bold backdrop-blur-md flex items-center justify-center gap-1.5 transition-colors border border-white/20"
                >
                   <Camera size={12} /> Camera
                </button>
              </div>
              
              <input type="file" accept="image/*" hidden ref={contextImageUploadRef} onChange={e => handleImageUpload(e.target.files?.[0], true)} />
              <input type="file" accept="image/*" capture="environment" hidden ref={contextImageCameraRef} onChange={e => handleImageUpload(e.target.files?.[0], true)} />
              {uploadingImage === 'context' && <div className="absolute inset-0 bg-[var(--surface-container)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2"><div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div><span className="text-[10px] font-bold text-[var(--primary)]">Uploading...</span></div>}
            </div>
          </div>
        </div>

        {/* Location & Sensors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button 
            onClick={handleCaptureLocation}
            className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all active:scale-[0.98] ${
              data.location ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--surface)] border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface-variant)]'
            }`}
          >
            <div className={`p-2 rounded-2xl ${data.location ? 'bg-[var(--primary)]/10' : 'bg-[var(--surface)]'}`}>
              <MapPin size={24} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span className="block text-sm font-bold tracking-tight">Geo Location</span>
              <div className="text-xs opacity-70 flex flex-col gap-0.5 mt-0.5 w-full min-w-0">
                {data.location ? (
                  <>
                    {data.location.address && <span className="block truncate w-full">{data.location.address}</span>}
                    <span className="block font-mono text-[10px] tracking-wider opacity-60 truncate w-full">
                      {data.location.latitude.toFixed(6)}, {data.location.longitude.toFixed(6)}
                    </span>
                  </>
                ) : (
                  <span className="block truncate w-full">Capture current spot</span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Bluetooth Tags Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-500 ml-1 uppercase tracking-widest px-1">Connection Tags</label>
            <button 
              onClick={handleBluetoothScan}
              className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/10 px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
            >
              <Bluetooth size={12} />
              Pair BLE
            </button>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Tag name (e.g. Tile, AirTag...)" 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)}
              className="flex-1 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddManualTag()}
            />
            <button 
              onClick={handleAddManualTag}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] p-3 rounded-2xl active:scale-95 disabled:opacity-50 shadow-lg shadow-[var(--primary)]/10 transition-all"
              disabled={!newTagName.trim()}
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {data.bluetoothTags?.map((tag, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--outline)] p-4 rounded-[20px] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0 pr-4">
                  {editingTagIndex === i ? (
                    <input 
                      autoFocus
                      className="w-full text-base font-bold border-b-2 border-[var(--primary)] focus:outline-none bg-transparent"
                      value={tag.name}
                      onChange={e => handleUpdateTag(i, e.target.value)}
                      onBlur={() => setEditingTagIndex(null)}
                      onKeyDown={e => e.key === 'Enter' && setEditingTagIndex(null)}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                          <Tag size={10} />
                        </div>
                        <span className="font-bold text-sm truncate">{tag.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 pl-8">{tag.id}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setEditingTagIndex(i)}
                    className="p-2 text-neutral-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleRemoveTag(i)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Add Error Dialog for upload errors */}
        <UploadProgressDialog 
          isOpen={uploadProgressState.isOpen}
          step={uploadProgressState.step}
          logs={uploadProgressState.logs}
          error={uploadProgressState.error}
          onClose={() => setUploadProgressState(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}
