import React, { useState, useEffect } from 'react';
import { Smartphone, Zap, BellRing, AlertTriangle, AlertCircle, StopCircle } from 'lucide-react';

export default function VibrationDemo() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if the API is supported in the current environment
    setSupported('vibrate' in navigator);
  }, []);

  const triggerVibration = (pattern: number | number[]) => {
    if (!navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  const stopVibration = () => {
    if (!navigator.vibrate) return;
    navigator.vibrate(0);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Smartphone className="text-pink-500" />
          Vibration API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's vibration hardware to provide tactile feedback to the user. Note that this typically only works on mobile devices or tablets, and may require user interaction first.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              The Vibration API is not supported in your current browser or device. It is typically available on mobile devices using Chrome, Edge, or Firefox. iOS Safari has limited to no support.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-lg mx-auto w-full">
            
            {/* Visual Indicator */}
            <div className="relative mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 rounded-full blur-3xl opacity-50" />
              <div className="relative z-10 bg-[var(--surface)] p-6 rounded-full border border-[var(--outline)] shadow-lg animate-pulse">
                <Smartphone className="w-12 h-12 text-pink-500" />
              </div>
            </div>

            {/* Pattern Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6">
              <button
                onClick={() => triggerVibration(200)}
                className="bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline)] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              >
                <Zap className="w-6 h-6 text-yellow-500" />
                <span className="font-bold text-[var(--on-surface)]">Short Pulse</span>
                <span className="text-[10px] sm:text-xs font-mono text-[var(--on-surface-variant)] bg-[var(--surface-container)] px-2 py-1 rounded-md">200ms</span>
              </button>

              <button
                onClick={() => triggerVibration([100, 50, 100, 50, 100])}
                className="bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline)] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              >
                <BellRing className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-[var(--on-surface)]">Notification</span>
                <span className="text-[10px] sm:text-xs font-mono text-[var(--on-surface-variant)] bg-[var(--surface-container)] px-2 py-1 rounded-md">[100, 50, 100...]</span>
              </button>

              <button
                onClick={() => triggerVibration(1000)}
                className="bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline)] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              >
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <span className="font-bold text-[var(--on-surface)]">Long Alert</span>
                <span className="text-[10px] sm:text-xs font-mono text-[var(--on-surface-variant)] bg-[var(--surface-container)] px-2 py-1 rounded-md">1000ms</span>
              </button>

              <button
                onClick={() => triggerVibration([100,30,100,30,100,200,300,30,300,30,300,200,100,30,100,30,100])}
                className="bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline)] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              >
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="font-bold text-[var(--on-surface)]">SOS Pattern</span>
                <span className="text-[10px] sm:text-xs font-mono text-[var(--on-surface-variant)] bg-[var(--surface-container)] px-2 py-1 rounded-md">... --- ...</span>
              </button>
            </div>

            {/* Stop Button */}
            <button
              onClick={stopVibration}
              className="w-full bg-[var(--surface-container-highest)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-[var(--on-surface)] border border-[var(--outline)] p-4 rounded-2xl flex justify-center items-center gap-2 transition-all font-bold active:scale-95"
            >
              <StopCircle className="w-5 h-5" />
              Stop Vibration
            </button>
            
          </div>
        )}
      </div>
    </div>
  );
}
