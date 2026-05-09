import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, HardDrive, FileType, Calendar, Cloud, MapPin } from 'lucide-react';
import { ref, getMetadata } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { format } from 'date-fns';

let showMetadataDialog: (url: string) => void = () => {};

export const triggerImageMetadata = (url: string) => {
  showMetadataDialog(url);
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function ImageMetadataDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showMetadataDialog = (newUrl: string) => {
      setUrl(newUrl);
      setIsOpen(true);
      setLoading(true);
      setError(null);
      setMetadata(null);
      
      try {
        const fileRef = ref(storage, newUrl);
        getMetadata(fileRef).then((meta) => {
          setMetadata(meta);
          setLoading(false);
        }).catch((err) => {
          console.error(err);
          setError('Failed to fetch metadata. Could be an external URL or permission issue.');
          setLoading(false);
        });
      } catch (err) {
         setError('Not a valid Firebase Storage URL.');
         setLoading(false);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-[var(--surface-container-high)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--outline)]"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--outline)]">
            <h3 className="font-bold flex items-center gap-2 text-[var(--on-surface)]">
              <Info size={18} className="text-[var(--primary)]" /> Image Metadata
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
             {loading && (
               <div className="flex justify-center py-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
               </div>
             )}

             {error && !loading && (
               <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500 text-sm font-medium">
                 {error}
               </div>
             )}

             {metadata && !loading && (
               <div className="space-y-4">
                 <div className="flex items-center gap-3 p-3 bg-[var(--surface-container)] rounded-2xl">
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                     <FileType size={20} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] uppercase font-bold text-[var(--on-surface-variant)] mb-0.5">Content Type</p>
                     <p className="font-medium text-sm text-[var(--on-surface)] truncate">{metadata.contentType || 'Unknown'}</p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 p-3 bg-[var(--surface-container)] rounded-2xl">
                   <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                     <HardDrive size={20} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] uppercase font-bold text-[var(--on-surface-variant)] mb-0.5">File Size</p>
                     <p className="font-medium text-sm text-[var(--on-surface)] truncate">{formatBytes(Number(metadata.size))}</p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 p-3 bg-[var(--surface-container)] rounded-2xl">
                   <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                     <Calendar size={20} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] uppercase font-bold text-[var(--on-surface-variant)] mb-0.5">Created At</p>
                     <p className="font-medium text-sm text-[var(--on-surface)] truncate">
                        {metadata.timeCreated ? format(new Date(metadata.timeCreated), 'PPpp') : 'Unknown'}
                     </p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 p-3 bg-[var(--surface-container)] rounded-2xl">
                   <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                     <MapPin size={20} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] uppercase font-bold text-[var(--on-surface-variant)] mb-0.5">Storage Path</p>
                     <p className="font-medium text-[10px] leading-tight text-[var(--on-surface)] break-all">{metadata.fullPath}</p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 p-3 bg-[var(--surface-container)] rounded-2xl">
                   <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                     <Cloud size={20} />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] uppercase font-bold text-[var(--on-surface-variant)] mb-0.5">Bucket</p>
                     <p className="font-medium text-sm text-[var(--on-surface)] truncate">{metadata.bucket}</p>
                   </div>
                 </div>
               </div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
