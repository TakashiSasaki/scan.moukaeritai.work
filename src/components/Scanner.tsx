import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Zap, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScannerProps {
  onDetected: (id: string) => void;
  onCancel: () => void;
}

export default function Scanner({ onDetected, onCancel }: ScannerProps) {
  const [isNfcActive, setIsNfcActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [flashlight, setFlashlight] = useState(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        html5QrCode.stop().then(() => {
          onDetected(decodedText);
        });
      },
      (errorMessage) => {
        // Just ignore errors
      }
    ).catch((err) => {
      console.error("Scanner start error:", err);
      toast.error("Could not start camera");
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error("NFC not supported on this device/browser");
      return;
    }

    try {
      setIsNfcActive(true);
      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan();
      toast.success("NFC Scanning Active - Hold tag near device");

      ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
        onDetected(`nfc:${serialNumber}`);
      });
    } catch (error) {
      console.error("NFC error:", error);
      toast.error("Failed to start NFC scan");
      setIsNfcActive(false);
    }
  };

  const toggleFlashlight = async () => {
    if (!scannerRef.current) return;
    try {
      // @ts-ignore
      const track = scannerRef.current.getRunningTrack();
      if (track) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashlight }]
          });
          setFlashlight(!flashlight);
        } else {
          toast.error("Flashlight not supported");
        }
      }
    } catch (error) {
      console.error("Flashlight error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary)] p-2 rounded-xl text-white">
            <Camera size={24} />
          </div>
          <div>
            <h2 className="text-white font-bold tracking-tight">Scanner</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
        >
          <X size={24} />
        </button>
      </div>

      <div id="reader" className="flex-1 w-full bg-black"></div>

      <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-8 z-10 px-6">
        <div className="flex gap-4">
          <button 
            onClick={toggleFlashlight}
            className={`p-5 rounded-3xl transition-all active:scale-95 ${flashlight ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/10 backdrop-blur-md text-white'}`}
          >
            <Zap size={28} />
          </button>
          <button 
            onClick={handleNfcScan}
            className={`p-5 rounded-3xl transition-all active:scale-95 ${isNfcActive ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'bg-white/10 backdrop-blur-md text-white'}`}
          >
            <Smartphone size={28} />
          </button>
        </div>

        <p className="text-white/60 text-sm font-medium text-center">
          Point the camera at a QR code or barcode,<br />
          or tap the phone icon to start NFC scanning.
        </p>
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-64 h-64 border-2 border-[var(--primary)] rounded-[40px] relative">
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[var(--primary)] rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[var(--primary)] rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[var(--primary)] rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[var(--primary)] rounded-br-xl"></div>
          <motion.div 
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-[var(--primary)] shadow-[0_0_15px_var(--primary)] opacity-50"
          ></motion.div>
        </div>
      </div>
    </div>
  );
}
