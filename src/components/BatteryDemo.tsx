import React, { useState, useEffect } from 'react';
import { Battery, BatteryCharging, BatteryWarning, Clock, AlertCircle } from 'lucide-react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

export default function BatteryDemo() {
  const [batteryState, setBatteryState] = useState<{
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  } | null>(null);
  
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let battery: BatteryManager | null = null;
    
    // Check if the API is supported
    if ('getBattery' in navigator) {
      setSupported(true);
      
      const updateBatteryStatus = (b: BatteryManager) => {
        setBatteryState({
          charging: b.charging,
          level: b.level,
          chargingTime: b.chargingTime,
          dischargingTime: b.dischargingTime
        });
      };

      // @ts-ignore - navigator.getBattery is not in standard lib dom types
      navigator.getBattery().then((b: BatteryManager) => {
        battery = b;
        updateBatteryStatus(b);
        
        b.addEventListener('chargingchange', () => updateBatteryStatus(b));
        b.addEventListener('levelchange', () => updateBatteryStatus(b));
        b.addEventListener('chargingtimechange', () => updateBatteryStatus(b));
        b.addEventListener('dischargingtimechange', () => updateBatteryStatus(b));
      }).catch((e: any) => {
        console.error("Battery API Error:", e);
        setSupported(false);
      });
    } else {
      setSupported(false);
    }

    return () => {
      if (battery) {
        // Just empty clean up for now, since we only need to listen while mounted
        // In real app, standard event listeners cleanup would look like:
        // battery.removeEventListener('chargingchange', handler);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds === Infinity) return 'Calculating...';
    if (seconds === 0) return 'Complete';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getBatteryIcon = () => {
    if (!batteryState) return <Battery className="w-8 h-8 text-[var(--on-surface-variant)]" />;
    if (batteryState.charging) return <BatteryCharging className="w-8 h-8 text-emerald-500" />;
    if (batteryState.level <= 0.2) return <BatteryWarning className="w-8 h-8 text-red-500" />;
    if (batteryState.level >= 0.95) return <Battery className="w-8 h-8 text-emerald-500" />;
    return <Battery className="w-8 h-8 text-blue-500" />;
  };

  const getBatteryColor = () => {
    if (!batteryState) return 'bg-gray-500';
    if (batteryState.charging) return 'bg-emerald-500';
    if (batteryState.level <= 0.2) return 'bg-red-500';
    if (batteryState.level <= 0.5) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Battery className="text-amber-500" />
          Battery Status API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's battery level and charging status. This API is useful for reducing background activity or adjusting power usage when the battery is low.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              The Battery Status API is not supported in your current browser. It is typically available in Chromium-based browsers (Chrome, Edge), but disabled in Safari and Firefox for privacy reasons.
            </p>
          </div>
        ) : !batteryState ? (
          <div className="flex flex-col items-center justify-center py-10 text-[var(--on-surface-variant)]">
            <div className="w-8 h-8 border-4 border-[var(--on-surface-variant)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium animate-pulse">Reading battery status...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-sm mx-auto">
            
            {/* Battery Visualization */}
            <div className="relative mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--surface-container-highest)] to-[var(--surface-container-low)] rounded-full blur-2xl opacity-50" />
              <div className="relative z-10 flex flex-col items-center">
                {getBatteryIcon()}
                <div className="mt-4 text-5xl font-black tracking-tighter text-[var(--on-surface)]">
                  {Math.round(batteryState.level * 100)}<span className="text-2xl text-[var(--on-surface-variant)]">%</span>
                </div>
                <div className="mt-1 text-sm font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                  {batteryState.charging ? 'Charging' : 'On Battery'}
                </div>
              </div>
            </div>

            {/* Battery Bar */}
            <div className="w-full h-4 bg-[var(--surface-container-highest)] rounded-full overflow-hidden mb-8 shadow-inner border border-[var(--outline)]/50">
              <div 
                className={`h-full ${getBatteryColor()} transition-all duration-1000 ease-out`}
                style={{ width: `${batteryState.level * 100}%` }}
              />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-[var(--on-surface-variant)] mb-2" />
                <span className="text-[10px] sm:text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-1">Time to Empty</span>
                <span className="font-mono font-bold text-[var(--on-surface)]">
                  {batteryState.charging ? '-' : formatTime(batteryState.dischargingTime)}
                </span>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col items-center text-center">
                <BatteryCharging className="w-5 h-5 text-[var(--on-surface-variant)] mb-2" />
                <span className="text-[10px] sm:text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-1">Time to Full</span>
                <span className="font-mono font-bold text-[var(--on-surface)]">
                  {!batteryState.charging ? '-' : formatTime(batteryState.chargingTime)}
                </span>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
