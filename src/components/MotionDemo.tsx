import React, { useState, useEffect } from 'react';
import { Compass, Rotate3d, Move3d, AlertCircle, Unlock } from 'lucide-react';

export default function MotionDemo() {
  const [orientation, setOrientation] = useState<{ alpha: number | null, beta: number | null, gamma: number | null } | null>(null);
  const [motion, setMotion] = useState<{ x: number | null, y: number | null, z: number | null } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if ('DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window) {
      setSupported(true);
      // Check if permission API exists (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
        setPermissionGranted(true);
      }
    } else {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setOrientation({ alpha: event.alpha, beta: event.beta, gamma: event.gamma });
      };

      const handleMotion = (event: DeviceMotionEvent) => {
        if (event.accelerationIncludingGravity) {
          setMotion({
            x: event.accelerationIncludingGravity.x,
            y: event.accelerationIncludingGravity.y,
            z: event.accelerationIncludingGravity.z,
          });
        }
      };

      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
      };
    }
  }, [permissionGranted]);

  const requestPermission = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
        } else {
          setPermissionGranted(false);
        }
      }
    } catch (error) {
      console.error(error);
      setPermissionGranted(false);
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '-';
    return num.toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Compass className="text-emerald-500" />
          Device Motion API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's accelerometer and gyroscope to detect movement and orientation in 3D space.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Device/Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              The Device Motion APIs are not supported. This is typically only available on mobile devices with physical sensors.
            </p>
          </div>
        ) : permissionGranted === null ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
            <div className="bg-[var(--surface)] p-6 rounded-full border border-[var(--outline)] shadow-inner">
              <Rotate3d className="w-16 h-16 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Sensor Access Required</h4>
              <p className="text-sm text-[var(--on-surface-variant)] max-w-sm mx-auto">
                Your browser requires explicit permission to access the device's motion sensors.
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Unlock size={18} />
              Grant Permission
            </button>
          </div>
        ) : permissionGranted === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Permission Denied</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              Sensor access was denied. You may need to restart the browser or reload the page to request access again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* Visualizer */}
            {orientation && (
              <div className="flex justify-center items-center h-48 bg-[var(--surface)] rounded-2xl border border-[var(--outline)] overflow-hidden perspective-1000">
                <div 
                  className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-xl transition-transform duration-75 flex items-center justify-center border-4 border-white/20"
                  style={{ 
                    transform: `rotateX(${(orientation.beta || 0)}deg) rotateY(${(orientation.gamma || 0)}deg) rotateZ(${(orientation.alpha || 0)}deg)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <Rotate3d className="w-10 h-10 text-white drop-shadow-md" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gyroscope */}
              <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
                <div className="flex items-center gap-2 mb-4 text-[var(--on-surface)]">
                  <Rotate3d className="text-emerald-500" size={20} />
                  <h4 className="font-bold">Orientation (Gyroscope)</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Alpha (z)</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(orientation?.alpha)}&deg;</div>
                  </div>
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Beta (x)</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(orientation?.beta)}&deg;</div>
                  </div>
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Gamma (y)</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(orientation?.gamma)}&deg;</div>
                  </div>
                </div>
              </div>

              {/* Accelerometer */}
              <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
                <div className="flex items-center gap-2 mb-4 text-[var(--on-surface)]">
                  <Move3d className="text-blue-500" size={20} />
                  <h4 className="font-bold">Acceleration (incl. Gravity)</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">X Axis</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(motion?.x)}</div>
                  </div>
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Y Axis</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(motion?.y)}</div>
                  </div>
                  <div className="bg-[var(--surface-container-highest)] p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Z Axis</div>
                    <div className="font-mono font-bold text-sm text-[var(--on-surface)]">{formatNumber(motion?.z)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
