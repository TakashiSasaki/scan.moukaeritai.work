import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Database, FileText, HardDrive, Calendar } from 'lucide-react';

export function ImageMetadataDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    // Custom event bus listener for long-press trigger
    const handleTrigger = (e: any) => {
      setMetadata(e.detail);
      setIsOpen(true);
    };

    window.addEventListener('triggerImageMetadata', handleTrigger);
    return () => window.removeEventListener('triggerImageMetadata', handleTrigger);
  }, []);

  const onClose = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[var(--surface-container-high)] rounded-[40px] border border-[var(--outline)] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black italic tracking-tighter text-[var(--on-surface)]">Asset Metadata</h2>
                    <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Secure infrastructure data</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-[var(--surface-container-highest)] rounded-full transition-colors">
                    <X size={24} className="text-[var(--on-surface-variant)]" />
                  </button>
               </div>

               <div className="space-y-3">
                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                       <FileText size={18} className="text-[var(--primary)]" />
                       <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Content Type</div>
                         <div className="text-sm font-bold truncate">{metadata?.contentType || 'image/webp'}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <HardDrive size={18} className="text-[var(--primary)]" />
                       <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">File Size</div>
                         <div className="text-sm font-bold truncate">{metadata?.sizeFormatted || '128 KB'}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <Calendar size={18} className="text-[var(--primary)]" />
                       <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Created At</div>
                         <div className="text-sm font-bold truncate">{metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'Just now'}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-[var(--outline)]">
                       <Database size={18} className="text-blue-500" />
                       <div className="flex-1 min-w-0">
                         <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Storage Path</div>
                         <div className="text-[10px] font-mono break-all text-blue-500">{metadata?.storagePath || 'objects/null/image.webp'}</div>
                       </div>
                    </div>
                  </div>
               </div>

               <p className="text-[10px] text-[var(--on-surface-variant)] text-center font-bold uppercase tracking-widest">Read Only • Encrypted Storage</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
