import React, { useState, useEffect } from 'react';
import { Compass, AlertCircle, RefreshCcw, Navigation } from 'lucide-react';

export default function MagnetometerDemo() {
  const [sensorData, setSensorData] = useState<{ x: number, y: number, z: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Mobile Safari uses standard DeviceOrientationEvent but adds webkitCompassHeading
  const [useFallback, setUseFallback] = useState<boolean>(false);

  useEffect(() => {
    let sensor: any = null;

    const startSensor = async () => {
      try {
        // Try to use the modern Generic Sensor API if available
        if ('Magnetometer' in window) {
          // @ts-ignore - Magnetometer might not be in standard TS DOM lib
          sensor = new window.Magnetometer({ frequency: 10 });
          
          sensor.addEventListener('reading', () => {
            setSensorData({
              x: sensor.x,
              y: sensor.y,
              z: sensor.z
            });
            // Approximate heading from x and y (raw microteslas)
            // Note: This requires the phone to be flat on a table to be accurate
            let h = Math.atan2(sensor.y, sensor.x) * (180 / Math.PI);
            if (h < 0) h = 360 + h;
            setHeading(h);
          });

          sensor.addEventListener('error', (event: any) => {
            if (event.error.name === 'NotAllowedError') {
              setErrorMsg('Permission to access sensor was denied.');
            } else if (event.error.name === 'NotReadableError') {
              setErrorMsg('Cannot connect to the sensor.');
            } else {
              setErrorMsg(`Sensor error: ${event.error.message}`);
            }
            tryFallback();
          });

          sensor.start();
          setSupported(true);
        } else {
          tryFallback();
        }
      } catch (err: any) {
        console.error("Magnetometer API error:", err);
        tryFallback();
      }
    };

    startSensor();

    return () => {
      if (sensor) {
        sensor.stop();
      }
      if (useFallback) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation as any);
        window.removeEventListener('deviceorientation', handleOrientation as any);
      }
    };
  }, []);

  const handleOrientation = (event: any) => {
    // iOS provides webkitCompassHeading
    if (event.webkitCompassHeading !== undefined) {
      setHeading(event.webkitCompassHeading);
    } 
    // Android might provide absolute alpha via deviceorientationabsolute
    else if (event.absolute === true || event.type === 'deviceorientationabsolute') {
      let h = 360 - event.alpha; // Convert alpha to compass heading
      setHeading(h);
    }
  };

  const tryFallback = () => {
    // Fallback to Device Orientation if Magnetometer is absent/denied
    setUseFallback(true);
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as any);
      setSupported(true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation as any);
      setSupported(true);
    } else {
      setSupported(false);
      setErrorMsg('Geomagnetic/Orientation sensors are not supported on this device.');
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Compass className="text-indigo-500" />
          Magnetometer API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's geomagnetic sensor to measure the ambient magnetic field (compass).
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Device/Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              {errorMsg || 'The Magnetometer API is not supported. This is typically only available on mobile devices.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* Compass Visualizer */}
            <div className="flex flex-col justify-center items-center h-56 bg-[var(--surface)] rounded-2xl border border-[var(--outline)] overflow-hidden relative">
              {heading !== null ? (
                <>
                  <div className="absolute top-4 text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">North</div>
                  <div 
                    className="w-32 h-32 rounded-full border-4 border-[var(--surface-container-highest)] shadow-inner relative flex items-center justify-center transition-transform duration-100 ease-linear"
                    style={{ transform: `rotate(${-heading}deg)` }}
                  >
                    <div className="absolute -top-1 w-2 h-4 bg-red-500 rounded-full" />
                    <Navigation className="w-12 h-12 text-indigo-500" style={{ transform: 'rotate(45deg)' }} />
                  </div>
                  <div className="mt-6 font-mono font-bold text-xl text-[var(--on-surface)]">
                    {Math.round(heading)}&deg;
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-[var(--on-surface-variant)]">
                  <RefreshCcw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                  <span className="text-sm font-medium">Calibrating sensor...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sensorData && (
                <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
                  <div className="flex items-center gap-2 mb-4 text-[var(--on-surface)]">
                    <Compass className="text-indigo-500" size={20} />
                    <h4 className="font-bold">Raw Magnetic Field (&micro;T)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                      <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">X Axis</div>
                      <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(sensorData.x)}</div>
                    </div>
                    <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                      <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Y Axis</div>
                      <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(sensorData.y)}</div>
                    </div>
                    <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                      <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Z Axis</div>
                      <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(sensorData.z)}</div>
                    </div>
                  </div>
                </div>
              )}

              {useFallback && !sensorData && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-sm font-bold text-amber-700 dark:text-amber-400">Using Orientation Fallback</h5>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      Raw magnetometer data (&micro;T) is fully supported on your browser. Displaying derived compass heading instead.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
