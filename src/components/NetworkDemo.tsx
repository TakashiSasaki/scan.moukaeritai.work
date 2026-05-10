import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, Globe, Info, BookOpen, Server, RefreshCw } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

export default function NetworkDemo() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [clientIpInfo, setClientIpInfo] = useState<{ ip: string; reverseDns: string[] } | null>(null);
  const [isFetchingIp, setIsFetchingIp] = useState(false);
  const [logs, setLogs] = useState<{ time: string, type: 'info' | 'error' | 'success', message: string }[]>([]);

  const addLog = (type: 'info' | 'error' | 'success', message: string) => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), type, message }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    addLog('info', `Component mounted. Initial Online Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);

    // 1. Core Online Status
    const handleOnlineStatus = () => {
      const isNowOnline = navigator.onLine;
      setIsOnline(isNowOnline);
      addLog(isNowOnline ? 'success' : 'error', `Window Status Event: Browser is now ${isNowOnline ? 'ONLINE' : 'OFFLINE'}`);
    };
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // 2. Network Information API
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (conn) {
      addLog('success', `Network Information API (navigator.connection) is supported.`);
    } else {
      addLog('error', `Network Information API is NOT supported in this browser.`);
    }

    const updateNetworkInfo = (e?: Event) => {
      const currentConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (currentConn) {
        setNetworkInfo({
          effectiveType: currentConn.effectiveType,
          downlink: currentConn.downlink,
          downlinkMax: currentConn.downlinkMax,
          rtt: currentConn.rtt,
          saveData: currentConn.saveData,
          type: currentConn.type, // Wi-Fi, cellular, etc. (mostly Chrome/Android only)
        });
        if (e) {
          addLog('info', `Network connection changed. Effective type: ${currentConn.effectiveType || 'unknown'}, Type: ${currentConn.type || 'unknown'}`);
        }
      } else {
        setNetworkInfo(null);
      }
    };

    updateNetworkInfo();

    if (conn) {
      conn.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      if (conn) {
        conn.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  const fetchClientIp = async () => {
    setIsFetchingIp(true);
    addLog('info', 'Fetching client IP address via Cloud Functions...');
    try {
      const functions = getFunctions(app, 'asia-east1'); // if the function is not deployed in asia-east1, change this or remove
      // Wait, let's just use getFunctions(app) because the region is default (us-central1) usually, unless specified.
      // Wait, let's use the same as the user's config. The instructions don't specify the region, so it might be default.
      const getIp = httpsCallable(getFunctions(app), 'getClientIp');
      const result = await getIp();
      const data = result.data as { ip: string; reverseDns: string[] };
      setClientIpInfo(data);
      addLog('success', `Fetched IP: ${data.ip}`);
    } catch (error: any) {
      console.error(error);
      addLog('error', `Failed to fetch client IP: ${error.message}`);
    } finally {
      setIsFetchingIp(false);
    }
  };

  useEffect(() => {
    fetchClientIp();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--on-surface)]">
          <Wifi className="text-blue-500" /> Web Network API & Wi-Fi Info
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Status Screen */}
        <div className={`p-4 sm:p-6 rounded-3xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
          <div className="flex items-center gap-3 mb-4">
            {isOnline ? (
              <div className="p-3 bg-emerald-500 rounded-full text-white">
                <Globe size={24} />
              </div>
            ) : (
              <div className="p-3 bg-rose-500 rounded-full text-white">
                <WifiOff size={24} />
              </div>
            )}
            <div>
              <h4 className="font-bold text-sm text-[var(--on-surface-variant)] uppercase tracking-wider">Browser Status</h4>
              <p className={`text-2xl font-black ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </p>
            </div>
          </div>
          <p className="text-xs font-mono opacity-70">
            API: <code className="bg-black/5 dark:bg-white/5 py-0.5 px-1 rounded">navigator.onLine</code>
          </p>
        </div>

        {/* Network Information Screen */}
        <div className="p-4 sm:p-6 bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)]">
          <h4 className="font-bold text-sm text-[var(--on-surface-variant)] flex items-center gap-2 mb-4">
            <Activity className="text-blue-500" size={18} />
            Network Information API
          </h4>

          {networkInfo ? (
            <div className="space-y-3">
               <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Effective Type</span>
                 <span className="font-mono text-sm px-2 py-1 bg-[var(--primary)] text-white rounded-lg">
                   {networkInfo.effectiveType || 'N/A'}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Downlink</span>
                 <span className="font-mono text-sm px-2 py-1 bg-[var(--surface-container-highest)] rounded-lg">
                   {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'N/A'}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Downlink Max</span>
                 <span className="font-mono text-sm px-2 py-1 bg-[var(--surface-container-highest)] rounded-lg">
                   {networkInfo.downlinkMax ? `${networkInfo.downlinkMax} Mbps` : 'N/A'}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Round-Trip Time (RTT)</span>
                 <span className="font-mono text-sm px-2 py-1 bg-[var(--surface-container-highest)] rounded-lg">
                   {networkInfo.rtt ? `${networkInfo.rtt} ms` : 'N/A'}
                 </span>
               </div>
               <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Data Saver Mode</span>
                 <span className="font-mono text-sm px-2 py-1 bg-[var(--surface-container-highest)] rounded-lg">
                   {networkInfo.saveData ? 'Enabled' : 'Disabled'}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-bold text-[var(--on-surface)]">Connection Type</span>
                 <span className={`font-mono text-sm px-2 py-1 rounded-lg ${networkInfo.type === 'wifi' ? 'bg-blue-500 text-white' : 'bg-[var(--surface-container-highest)]'}`}>
                   {networkInfo.type || 'Unknown'}
                 </span>
               </div>
            </div>
          ) : (
            <p className="text-sm text-rose-500 font-medium">
              Network Information API is not supported in this browser.
            </p>
          )}
        </div>
      </div>

      {/* Client IP Information */}
      <div className="p-4 sm:p-6 bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-sm text-[var(--on-surface-variant)] flex items-center gap-2">
            <Server className="text-emerald-500" size={18} />
            Client IP Information
          </h4>
          <button
            onClick={fetchClientIp}
            disabled={isFetchingIp}
            className="p-2 rounded-full hover:bg-[var(--surface-container-highest)] transition-colors disabled:opacity-50"
            title="Refresh IP Info"
          >
            <RefreshCw size={16} className={isFetchingIp ? "animate-spin text-emerald-500" : "text-[var(--on-surface-variant)]"} />
          </button>
        </div>

        {isFetchingIp && !clientIpInfo ? (
          <div className="flex items-center gap-3 text-[var(--on-surface-variant)]">
             <RefreshCw size={16} className="animate-spin" />
             <span className="text-sm">Fetching from Firebase Functions...</span>
          </div>
        ) : clientIpInfo ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--outline)] pb-2">
              <span className="text-sm font-bold text-[var(--on-surface)]">IP Address</span>
              <span className="font-mono text-sm px-2 py-1 bg-[var(--primary)] text-white rounded-lg">
                {clientIpInfo.ip}
              </span>
            </div>
            <div>
              <span className="text-sm font-bold text-[var(--on-surface)] block mb-2">Reverse DNS</span>
              {clientIpInfo.reverseDns && clientIpInfo.reverseDns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {clientIpInfo.reverseDns.map((dnsNode, idx) => (
                    <span key={idx} className="font-mono text-xs px-2 py-1 bg-[var(--surface-container-highest)] rounded-lg">
                      {dnsNode}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-[var(--on-surface-variant)] italic">
                  No PTR records found.
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-500 font-medium">Failed to load IP information.</p>
        )}
      </div>

       {/* Event logs / Terminal */}
       <div className="bg-[#0D1117] p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-3 shadow-inner">
        <h4 className="font-bold text-gray-400 text-xs flex items-center gap-2 tracking-widest uppercase mb-4">
           {'>'} Network Events Output
        </h4>
        <div className="font-mono text-[11px] space-y-2 max-h-64 overflow-y-auto w-full pr-2 pb-2">
            {logs.length === 0 ? (
              <p className="text-gray-600 italic">No events logged yet. Try toggling Wi-Fi or opening DevTools and changing network throttling.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-3 leading-relaxed break-all">
                  <span className="text-gray-500 whitespace-nowrap shrink-0">[{log.time}]</span>
                  <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-blue-300'}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
        </div>
      </div>

       {/* Technical Background Section */}
       <div className="bg-[var(--surface-container-low)] p-4 sm:p-6 rounded-2xl border border-[var(--outline)] space-y-4">
        <h4 className="font-bold text-[var(--on-surface)] flex items-center gap-2">
          <BookOpen className="text-purple-500" size={18} />
          Technical Background
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">1. The "Wi-Fi" Limitation</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              Native browser APIs <strong>cannot read the SSID (network name), BSSID, or password of the connected Wi-Fi</strong>. 
              This is a strict security and privacy measure. Allowing websites to read SSIDs would enable precise indoor location tracking without GPS consent.
            </p>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">2. Connection Type (<code className="text-[10px]">navigator.connection.type</code>)</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              If supported (primarily Chrome on Android), this field might literally return <code>wifi</code>, <code>cellular</code>, or <code>ethernet</code>. 
              However, on desktop platforms (Windows/macOS), it often returns exactly Desktop browsers often hide this to prevent fingerprinting or because the OS API abstraction doesn't cleanly expose it to the browser engine.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">3. Effective Type (<code className="text-[10px]">effectiveType</code>)</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              Instead of the physical connection (Wi-Fi vs 5G), browsers prefer to report the <strong>Effective Type</strong> (<code>4g</code>, <code>3g</code>, <code>2g</code>, <code>slow-2g</code>). 
              A terrible Wi-Fi connection might be reported as <code>3g</code>, while a great 4G cellular connection might report as <code>4g</code>. This helps developers optimize assets based on actual performance rather than hardware type.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">4. Fallback Strategies</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              If your application strictly requires connecting to a specific IoT device via Wi-Fi, you must instruct the user to go to their OS Settings, connect to the device's hotspot manually, and then return to the app to communicate via local IP addresses (if SSL/mixed-content rules permit).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
