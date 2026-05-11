import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, PlaySquare, Smartphone, FileText, Link as LinkIcon, Database, CheckCircle2 } from 'lucide-react';

export default function NfcDemo() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ id: string, type: 'info' | 'success' | 'warning' | 'error', message: string, timestamp: number }[]>([]);
  const [scanActive, setScanActive] = useState<boolean>(false);
  const [ndefReader, setNdefReader] = useState<any>(null);
  const [lastTag, setLastTag] = useState<{
    serialNumber?: string;
    recordCount?: number;
    records?: any[];
    time: Date;
  } | null>(null);

  const [writeMode, setWriteMode] = useState<boolean>(false);
  const [writePayloadType, setWritePayloadType] = useState<'text' | 'url'>('text');
  const [writePayload, setWritePayload] = useState<string>('Hello from NFC Demo!');

  useEffect(() => {
    // Check for standard Web NFC API
    if ('NDEFReader' in window) {
      setSupported(true);
      try {
        // @ts-ignore
        const reader = new window.NDEFReader();
        setNdefReader(reader);
      } catch (err: any) {
        addLog('error', `Failed to initialize NDEFReader: ${err.message}`);
      }
    } else {
      setSupported(false);
      setErrorMsg('Web NFC API is not supported on this device or browser. It is currently only available on Android Chrome.');
    }

    return () => {
      // Cleanup if needed when unmounting
      if (scanActive && ndefReader) {
        // AbortController could be used here if passed to scan, but for simplicity we ignore it unless strictly needed
      }
    };
  }, []);

  const addLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    setLogs(prev => [
      { id: Math.random().toString(36).substring(2, 9), type, message, timestamp: Date.now() },
      ...prev
    ].slice(0, 50));
  };

  const clearLogs = () => setLogs([]);

  const handleReadingError = (event: any) => {
    addLog('error', `NFC Reading Error: Cannot read data from the NFC tag. Try bringing it closer.`);
  };

  const handleReading = (event: any) => {
    const { message, serialNumber } = event;
    
    addLog('success', `NFC Tag Read Successfully! Serial Number: ${serialNumber}`);
    
    // Process records
    const processedRecords = [];
    for (const record of message.records) {
      const recData: any = {
        recordType: record.recordType,
        mediaType: record.mediaType,
        id: record.id,
        encoding: record.encoding,
        lang: record.lang,
        data: null
      };

      try {
        if (record.recordType === "text") {
          const textDecoder = new TextDecoder(record.encoding);
          recData.data = textDecoder.decode(record.data);
          addLog('info', `Text Record: ${recData.data} (${record.lang})`);
        } else if (record.recordType === "url") {
          const textDecoder = new TextDecoder();
          recData.data = textDecoder.decode(record.data);
          addLog('info', `URL Record: ${recData.data}`);
        } else if (record.recordType === "mime") {
          if (record.mediaType === "application/json") {
            const textDecoder = new TextDecoder();
            recData.data = JSON.parse(textDecoder.decode(record.data));
            addLog('info', `JSON Record: JSON object decoded.`);
          } else {
             addLog('info', `MIME Record: ${record.mediaType}`);
          }
        } else {
          addLog('info', `Record type: ${record.recordType}`);
        }
      } catch (err: any) {
        recData.data = `Error decoding data: ${err.message}`;
        addLog('warning', `Failed to decode record data: ${err.message}`);
      }
      processedRecords.push(recData);
    }

    setLastTag({
      serialNumber,
      recordCount: message.records.length,
      records: processedRecords,
      time: new Date()
    });
  };

  const startScan = async () => {
    if (!ndefReader) return;
    
    try {
      addLog('info', 'Requesting NFC scan permission...');
      await ndefReader.scan();
      addLog('success', 'NFC scan started. Please tap an NFC tag to the back of your device.');
      
      ndefReader.addEventListener("readingerror", handleReadingError);
      ndefReader.addEventListener("reading", handleReading);
      
      setScanActive(true);
      setWriteMode(false);
    } catch (error: any) {
      addLog('error', `Scan failed: ${error.message}`);
      setScanActive(false);
    }
  };

  const stopScan = () => {
    if (ndefReader) {
      ndefReader.removeEventListener("readingerror", handleReadingError);
      ndefReader.removeEventListener("reading", handleReading);
      addLog('info', 'NFC scan stopped.');
      setScanActive(false);
    }
  };

  const startWrite = async () => {
    if (!ndefReader) return;
    
    try {
      addLog('warning', 'NFC Write Mode Active - Tap an NFC tag to write data to it...');
      setWriteMode(true);
      
      // We will write as soon as we can
      let records: any[] = [];
      if (writePayloadType === 'text') {
        records.push({ recordType: "text", data: writePayload });
      } else if (writePayloadType === 'url') {
         records.push({ recordType: "url", data: writePayload });
      }

      await ndefReader.write({ records });
      addLog('success', `Successfully wrote ${writePayloadType} data to the NFC tag!`);
      setWriteMode(false);
    } catch (error: any) {
      addLog('error', `Write failed: ${error.message}`);
      setWriteMode(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--on-surface)] flex items-center gap-2">
          <Radio className="text-emerald-500" />
          Web NFC API (NDEF)
        </h3>
        <p className="text-sm text-[var(--on-surface-variant)] mt-1">
          Read and write NDEF data to NFC tags. View tag serial numbers, decode records, and identify tag properties.
        </p>
      </div>

      <div className="bg-[var(--surface-container)] rounded-3xl p-6 sm:p-8 border border-[var(--outline)] shadow-sm">
        {supported === false ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <h4 className="text-lg font-bold text-[var(--on-surface)] mb-2">Unsupported Device/Browser</h4>
            <p className="text-sm text-[var(--on-surface-variant)] max-w-sm">
              {errorMsg}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-wrap gap-4">
              {scanActive ? (
                <button
                  onClick={stopScan}
                  className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-colors"
                >
                  <AlertCircle size={20} />
                  Stop Reading
                </button>
              ) : (
                <button
                  onClick={startScan}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                >
                  <Radio size={20} />
                  {writeMode ? 'Cancel Selection' : 'Start Reading NFC'}
                </button>
              )}
            </div>

            {/* Write Section */}
            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
               <h4 className="font-bold text-[var(--on-surface)] mb-4">Write to NFC Tag</h4>
               <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <select 
                   value={writePayloadType} 
                   onChange={(e) => setWritePayloadType(e.target.value as 'text'|'url')}
                   className="bg-[var(--surface-container-highest)] border border-[var(--outline)] rounded-xl px-4 py-2 text-[var(--on-surface)]"
                 >
                   <option value="text">Text Record</option>
                   <option value="url">URL Record</option>
                 </select>
                 <input 
                   type="text" 
                   value={writePayload}
                   onChange={(e) => setWritePayload(e.target.value)}
                   placeholder={writePayloadType === 'url' ? 'https://example.com' : 'Text to write'}
                   className="flex-1 bg-[var(--surface-container-highest)] border border-[var(--outline)] rounded-xl px-4 py-2 text-[var(--on-surface)]"
                 />
               </div>
               <button
                  onClick={startWrite}
                  disabled={writeMode}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${
                    writeMode ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  }`}
                >
                  <Smartphone size={20} />
                  {writeMode ? 'Waiting for NFC Tag (Tap now)...' : 'Write Data to Tag'}
                </button>
            </div>

            {/* Read Data Dashboard */}
            {lastTag && (
              <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--outline)]">
                <div className="flex items-center gap-2 mb-4 text-[var(--on-surface)]">
                  <Database className="text-emerald-500" size={20} />
                  <h4 className="font-bold">Last Tag Read</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-[var(--surface-container-highest)] p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Serial Number (Tag ID)</div>
                    <div className="font-mono text-sm font-bold text-[var(--primary)] uppercase">
                      {lastTag.serialNumber || 'N/A (Not supported or masked)'}
                    </div>
                  </div>
                  <div className="bg-[var(--surface-container-highest)] p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase mb-1">Message Details</div>
                    <div className="text-sm font-medium text-[var(--on-surface)]">
                      {lastTag.recordCount} Record(s) found
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-sm text-[var(--on-surface-variant)]">Records:</h5>
                  {lastTag.records?.map((rec, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-[var(--surface-container)] p-4 rounded-xl border border-[var(--outline)]">
                      <div className="flex items-center gap-2">
                        {rec.recordType === 'url' ? <LinkIcon size={16} className="text-blue-500"/> : <FileText size={16} className="text-emerald-500"/>}
                        <span className="font-bold text-sm uppercase text-[var(--on-surface)]">{rec.recordType}</span>
                        {rec.lang && <span className="text-xs bg-[var(--surface-container-highest)] px-2 py-0.5 rounded-full">{rec.lang}</span>}
                        {rec.mediaType && <span className="text-xs bg-[var(--surface-container-highest)] px-2 py-0.5 rounded-full">{rec.mediaType}</span>}
                      </div>
                      <div className="font-mono text-sm bg-[var(--surface-container-highest)] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                        {typeof rec.data === 'object' ? (() => {
                          const seen = new WeakSet();
                          return JSON.stringify(rec.data, (k, v) => {
                            if (v !== null && typeof v === 'object') {
                              if (seen.has(v)) return '[Circular]';
                              seen.add(v);
                            }
                            return v;
                          }, 2);
                        })() : String(rec.data)}
                      </div>
                    </div>
                  ))}
                  {lastTag.records && lastTag.records.length === 0 && (
                     <div className="text-sm text-[var(--on-surface-variant)] italic">No records present on this tag, or tag is empty.</div>
                  )}
                </div>
              </div>
            )}

            {/* Event Log */}
            <div className="bg-black/90 p-4 rounded-2xl mt-4">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-white/70 font-mono text-xs uppercase tracking-wider">NFC Event Log</span>
                <button 
                  onClick={clearLogs}
                  className="text-white/50 hover:text-white/90 text-xs font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-[11px] sm:text-xs custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-white/30 italic text-center py-4">Waiting for NFC events...</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 border-b border-white/5 pb-2">
                      <span className="text-white/40 shrink-0">[{new Date(log.timestamp).toISOString().substring(11, 23)}]</span>
                      <span className={`shrink-0 ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warning' ? 'text-amber-400' :
                        'text-blue-400'
                      }`}>
                        {log.type === 'info' ? 'ℹ' : log.type === 'success' ? '✓' : log.type === 'warning' ? '⚠' : '✖'}
                      </span>
                      <span className="text-white/90 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
