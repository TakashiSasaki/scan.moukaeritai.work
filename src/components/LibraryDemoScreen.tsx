import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, QrCode, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function LibraryDemoScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'qrcode'>('qrcode');

  return (
    <div className="w-full">
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-purple-600 rounded-xl text-white shadow-sm">
                <PlaySquare className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Library API Demo</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">3rd Party Libraries</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              🚪 Exit
            </button>
          </div>

          <div className="flex p-1 bg-[var(--surface-container)] rounded-2xl w-full overflow-x-auto no-scrollbar border border-[var(--surface-container-highest)] shadow-inner">
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'qrcode'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]'
              }`}
            >
              <QrCode size={18} />
              html5-qrcode
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
        {activeTab === 'qrcode' && <QrCodeDemo />}
      </div>
    </div>
  );
}

function QrCodeDemo() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanner = async () => {
    setIsScanning(true);
    setResult(null);
    setError(null);
    
    try {
      const html5QrCode = new Html5Qrcode("demo-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: true
      });
      qrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          setResult(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore frequent error callback
        }
      );
    } catch (err) {
      setError(String(err));
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrCodeRef.current?.isScanning) {
      try {
        await qrCodeRef.current.stop();
      } catch (e) {
        console.error("Stop failed", e);
      }
    }
    qrCodeRef.current?.clear();
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
        <h3 className="text-lg font-bold mb-2">QR Code Reader Test</h3>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6">
          This checks the raw behavior of <code>html5-qrcode</code> without strict application state mapping. Try scanning any QR code.
        </p>
        
        <div className="flex gap-3 mb-6">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold flex items-center gap-2"
            >
              <QrCode size={18} /> Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center gap-2"
            >
              Stop Scanner
            </button>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div 
            id="demo-reader" 
            className={`w-full max-w-[400px] overflow-hidden rounded-2xl bg-black/5 ${isScanning ? 'min-h-[300px]' : ''}`}
          ></div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              Scan Successful
            </h4>
            <div className="font-mono text-sm bg-[var(--surface-container-highest)] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
