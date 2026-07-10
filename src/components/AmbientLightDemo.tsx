import React, { useState, useEffect } from 'react';
import { Sun, AlertCircle } from 'lucide-react';

export default function AmbientLightDemo() {
  const [illuminance, setIlluminance] = useState<number | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let sensor: any = null;

    const startSensor = async () => {
      try {
        if ('AmbientLightSensor' in window) {
          // @ts-ignore
          sensor = new window.AmbientLightSensor({ frequency: 10 });
          
          sensor.addEventListener('reading', () => {
            setIlluminance(sensor.illuminance);
          });

          sensor.addEventListener('error', (event: any) => {
            if (event.error.name === 'NotAllowedError') {
              setErrorMsg('Permission to access sensor was denied.');
            } else if (event.error.name === 'NotReadableError') {
              setErrorMsg('Cannot connect to the sensor.');
            } else {
              setErrorMsg(`Sensor error: ${event.error.message}`);
            }
            setSupported(false);
          });

          sensor.start();
          setSupported(true);
        } else {
          setSupported(false);
          setErrorMsg('AmbientLightSensor API is not supported on this device/browser.');
        }
      } catch (err: any) {
        console.error("AmbientLightSensor API error:", err);
        setSupported(false);
        setErrorMsg(`Initialization error: ${err.message}`);
      }
    };

    startSensor();

    return () => {
      if (sensor) {
        sensor.stop();
      }
    };
  }, []);

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Math.round(num).toString();
  };

  // Calculate generic environment based on lux
  const getEnvironmentDescription = (lux: number | null) => {
    if (lux === null) return 'Unknown';
    if (lux < 50) return 'Dark room / Night';
    if (lux < 200) return 'Dimly lit room';
    if (lux < 500) return 'Office / Living room';
    if (lux < 1000) return 'Bright room / Supermarket';
    if (lux < 10000) return 'Overcast day / Indirect daylight';
    if (lux < 50000) return 'Full daylight';
    return 'Direct sunlight';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Sun className="text-yellow-500" />
          Ambient Light API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's ambient light sensor to measure illuminance level in lux.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Device/Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              {errorMsg || 'The AmbientLightSensor API is not supported. You might need to enable a flag like chrome://flags/#enable-generic-sensor-extra-classes on Chrome.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col justify-center items-center h-56 bg-[var(--surface)] rounded-2xl border border-[var(--outline)] overflow-hidden relative">
              {illuminance !== null ? (
                <>
                  <div className="absolute top-4 text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Illuminance</div>
                  <div className="relative flex items-center justify-center">
                    <Sun 
                      className="w-24 h-24 text-yellow-500 transition-opacity duration-300" 
                      style={{ opacity: Math.max(0.2, Math.min(1, illuminance / 1000)) }} 
                    />
                  </div>
                  <div className="mt-6 font-mono font-bold text-3xl text-[var(--on-surface)] flex items-end gap-1">
                    {formatNumber(illuminance)} <span className="text-sm text-[var(--on-surface-variant)] mb-1">lux</span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-[var(--primary)] bg-[var(--secondary-container)] px-3 py-1 rounded-full">
                    {getEnvironmentDescription(illuminance)}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-[var(--on-surface-variant)]">
                  <Sun className="w-8 h-8 animate-pulse mb-2 opacity-50" />
                  <span className="text-sm font-medium">Waiting for reading...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
