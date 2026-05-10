import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, Compass, Route } from 'lucide-react';

export default function GeolocationDemo() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup watch on unmount
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const handleSuccess = (pos: GeolocationPosition) => {
    setPosition(pos);
    setErrorMsg(null);
  };

  const handleError = (err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setErrorMsg("User denied the request for Geolocation.");
        break;
      case err.POSITION_UNAVAILABLE:
        setErrorMsg("Location information is unavailable.");
        break;
      case err.TIMEOUT:
        setErrorMsg("The request to get user location timed out.");
        break;
      default:
        setErrorMsg("An unknown error occurred.");
    }
  };

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  };

  const toggleWatchPosition = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    if (isWatching && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setIsWatching(false);
      setWatchId(null);
    } else {
      setErrorMsg(null);
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      setWatchId(id);
      setIsWatching(true);
    }
  };

  const formatNumber = (num: number | null | undefined, decimals: number = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <MapPin className="text-blue-500" />
          Geolocation API
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Access the device's location, altitude, speed, and heading using the Geolocation API.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {errorMsg}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={getCurrentPosition}
            className="bg-[var(--primary)] text-[var(--on-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
            disabled={isWatching}
          >
            <MapPin size={20} />
            Get Current Position
          </button>

          <button
            onClick={toggleWatchPosition}
            className={`${
              isWatching 
                ? 'bg-red-500 text-white' 
                : 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
            } px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            {isWatching ? <AlertCircle size={20} /> : <Route size={20} />}
            {isWatching ? 'Stop Watching' : 'Watch Position'}
          </button>
        </div>

        {position ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)] col-span-1 md:col-span-2">
              <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Coordinates</div>
              <div className="font-mono text-lg text-[var(--on-surface)]">
                {position.coords.latitude.toFixed(6)}, {position.coords.longitude.toFixed(6)}
              </div>
              <div className="text-xs text-[var(--on-surface-variant)] mt-2">
                Last updated: {formatTimestamp(position.timestamp)}
              </div>
            </div>

            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
              <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Accuracy</div>
              <div className="font-mono text-xl font-bold text-[var(--on-surface)]">
                &plusmn;{formatNumber(position.coords.accuracy, 1)} <span className="text-sm font-normal">meters</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
              <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Altitude</div>
              <div className="font-mono text-xl font-bold text-[var(--on-surface)]">
                {position.coords.altitude !== null ? (
                  <>
                    {formatNumber(position.coords.altitude, 1)} <span className="text-sm font-normal">meters</span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
              <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Heading</div>
              <div className="font-mono text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
                {position.coords.heading !== null && !isNaN(position.coords.heading) ? (
                  <>
                    <Compass size={20} className="text-blue-500" style={{ transform: `rotate(${position.coords.heading}deg)` }} />
                    {formatNumber(position.coords.heading, 1)}&deg;
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
              <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Speed</div>
              <div className="font-mono text-xl font-bold text-[var(--on-surface)]">
                {position.coords.speed !== null ? (
                  <>
                    {formatNumber(position.coords.speed, 2)} <span className="text-sm font-normal">m/s</span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-[var(--surface)] rounded-2xl border border-[var(--outline)] border-dashed">
            <MapPin className="w-12 h-12 text-[var(--on-surface-variant)] opacity-50 mb-4" />
            <p className="text-[var(--on-surface-variant)] font-medium">Click a button above to request location data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
