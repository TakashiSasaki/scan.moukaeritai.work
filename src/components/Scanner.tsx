import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Nfc, RefreshCw } from 'lucide-react';

interface ScannerProps {
  onDetected: (id: string) => void;
  onCancel: () => void;
}

export default function Scanner({ onDetected, onCancel }: ScannerProps) {
  const [useNfc, setUseNfc] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isMounted = true;
    let startPromise: Promise<any> | null = null;
    
    // Delay initialization slightly to prevent React StrictMode double-fire race conditions
    const initTimer = setTimeout(() => {
      if (!isMounted) return;

      const html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      qrCodeRef.current = html5QrCode;

      const startScanner = async () => {
        try {
          if (!isMounted) return;
          startPromise = html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (isMounted) onDetected(decodedText);
            },
            () => {
              // Error callback for non-scans (ignore)
            }
          );
          await startPromise;
          if (isMounted) setIsCameraReady(true);
        } catch (err) {
          if (isMounted) console.error("Camera start error:", err);
        }
      };

      startScanner();
    }, 100);

    // Ignore benign play() interruption errors globally when scanning
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason && 
        (event.reason.name === 'NotAllowedError' || 
         event.reason.message?.includes('The play() request was interrupted') ||
         event.reason.message?.includes('was removed from the document'))
      ) {
        event.preventDefault();
      }
    };
    
    const handleWindowError = (event: ErrorEvent) => {
      if (typeof event.message === 'string' && (event.message.includes('The play() request was interrupted') || event.message.includes('was removed from the document'))) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError, true);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError, true);
      const cleanup = async () => {
        try {
          if (startPromise) {
            await startPromise.catch(() => {}); // Wait for start to finish/fail
          }
          if (qrCodeRef.current?.isScanning) {
            await qrCodeRef.current.stop();
          }
          qrCodeRef.current?.clear();
        } catch (err) {
          console.warn("Scanner stop error:", err);
        }
      };
      // Adding a small delay to ensure DOM is available for video to handle its own cleanup internally
      setTimeout(cleanup, 100);
    };
  }, [onDetected]);

  const handleNfcScan = async () => {
    if ('NDEFReader' in window) {
      try {
        setUseNfc(true);
        // @ts-ignore
        const ndef = new NDEFReader();
        await ndef.scan();
        
        ndef.addEventListener("reading", ({ serialNumber }: any) => {
          onDetected(serialNumber);
          setUseNfc(false);
        });
      } catch (error) {
        console.error("NFC Error:", error);
        alert("NFC scan failed. Make sure you are on a mobile device and NFC is enabled.");
        setUseNfc(false);
      }
    } else {
      alert("NFC is not supported on this browser or device.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-black rounded-[40px] overflow-hidden relative shadow-2xl border-4 border-[var(--surface-container-high)]">
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={onCancel}
          className="bg-black/40 backdrop-blur-xl text-white p-3 rounded-full hover:bg-black/60 transition-colors border border-white/10"
        >
          <X size={24} />
        </button>
      </div>

      <div id="reader" className="w-full h-full object-cover [&>video]:object-cover" />
      
      {!isCameraReady && !useNfc && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4 text-white/80">
          <RefreshCw size={40} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Warming up camera...</p>
        </div>
      )}

      <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-center gap-4 z-20">
        <button 
          onClick={handleNfcScan}
          className={`flex items-center gap-3 px-8 py-4 rounded-[28px] font-bold transition-all shadow-2xl border-2 ${
            useNfc 
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] animate-pulse' 
            : 'bg-white/10 backdrop-blur-xl text-white border-white/20 hover:bg-white/20'
          }`}
        >
          <Nfc size={24} />
          <span>{useNfc ? 'Scanning NFC...' : 'Scan NFC'}</span>
        </button>
      </div>
      
      {/* Viewfinder overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-6 z-10">
        {!useNfc && isCameraReady && (
          <>
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full text-white text-sm font-bold shadow-2xl border border-white/10 flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
               Scanning for QR Code...
            </div>
            
            <div className="relative">
              <div className="border-2 border-white/20 w-64 h-64 rounded-[40px] overflow-hidden">
                {/* Simulated scan line */}
                <div className="w-full h-1 bg-green-500/50 shadow-[0_0_20px_rgba(34,197,94,1)] animate-bounce relative top-4"></div>
              </div>
              <div className="absolute inset-0 border-2 border-[var(--primary)] w-64 h-64 rounded-[40px] animate-pulse opacity-20"></div>
              
              {/* Corner decorations */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-[var(--primary)] rounded-tl-2xl"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-[var(--primary)] rounded-tr-2xl"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-[var(--primary)] rounded-bl-2xl"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-[var(--primary)] rounded-br-2xl"></div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Camera className="text-[var(--primary)]/20 w-12 h-12" />
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-white/80 text-xs font-bold uppercase tracking-widest text-center">
               Auto-detects QR codes
               <br />
               <span className="text-white/50 text-[10px]">No shutter button needed</span>
            </div>
          </>
        )}
      </div>

      {useNfc && (
        <div className="absolute inset-0 bg-[var(--primary)]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center text-[var(--primary-foreground)] p-8 text-center">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
            <Nfc size={64} />
          </div>
          <h3 className="text-3xl font-black italic mb-2">Ready to Scan</h3>
          <p className="opacity-80 font-medium">Hold your phone near an NFC tag to identify the item.</p>
          <button 
            onClick={() => setUseNfc(false)}
            className="mt-12 bg-white text-[var(--primary)] px-8 py-3 rounded-full font-bold shadow-lg"
          >
            Switch to Camera
          </button>
        </div>
      )}
    </div>
  );
}
