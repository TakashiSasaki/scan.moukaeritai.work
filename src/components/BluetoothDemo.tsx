import React, { useState, useRef, useEffect } from 'react';
import { Bluetooth, Info, Search, Link2, Activity, Unlink, BookOpen } from 'lucide-react';

export default function BluetoothDemo() {
  const [log, setLog] = useState<{ type: 'info' | 'error' | 'success'; message: string }[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [filterNamePrefix, setFilterNamePrefix] = useState('');
  const [filterName, setFilterName] = useState('');
  const [hackFilterEnabled, setHackFilterEnabled] = useState(false);
  const [servicesInput, setServicesInput] = useState('battery_service, device_information');
  const [discoveredData, setDiscoveredData] = useState<any[]>([]);

  const deviceRef = useRef<any>(null);
  const charsRef = useRef<Record<string, any>>({});

  // Helper to parse DataView into human readable string where possible
  const parseDataView = (value: DataView) => {
    let isAscii = true;
    const chars = [];
    const hex = [];
    for (let i = 0; i < value.byteLength; i++) {
      const byte = value.getUint8(i);
      hex.push(byte.toString(16).padStart(2, '0'));
      if (byte < 32 || byte > 126) isAscii = false;
      chars.push(String.fromCharCode(byte));
    }
    if (value.byteLength === 0) return '(empty)';
    if (isAscii) return `"${chars.join('')}" (Text)`;
    if (value.byteLength === 1) return `0x${hex[0]} (${value.getUint8(0)})`; // simple number
    return `0x${hex.join('')}`;
  };

  const addLog = (type: 'info' | 'error' | 'success', message: string) => {
    setLog((prev) => [...prev, { type, message }]);
  };

  const parseServicesString = (str: string) => {
    return str.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        if (s.startsWith('0x')) return parseInt(s, 16);
        if (/^[0-9a-fA-F]{4}$/.test(s)) return parseInt(s, 16);
        return s; // 'battery_service' or generic UUID
      });
  };

  const testWebBluetooth = async () => {
    setIsRequesting(true);
    setLog([]);
    setDeviceInfo(null);
    setIsConnected(false);
    setDiscoveredData([]);
    deviceRef.current = null;
    charsRef.current = {};

    const optionalServices = parseServicesString(servicesInput);
    
    let options: any = {};
    let filters: any[] = [];
    
    if (hackFilterEnabled) {
      // 62 printable characters to force only devices with a name starting with A-Z, a-z, or 0-9
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
      filters = chars.map(char => ({ namePrefix: char }));
    } else {
      const filterObj: any = {};
      if (filterName) filterObj.name = filterName;
      if (filterNamePrefix) filterObj.namePrefix = filterNamePrefix;
      if (Object.keys(filterObj).length > 0) {
        filters.push(filterObj);
      }
    }
    
    if (filters.length > 0) {
      options.filters = filters;
      if (optionalServices.length > 0) options.optionalServices = optionalServices;
    } else {
      options.acceptAllDevices = true;
      if (optionalServices.length > 0) options.optionalServices = optionalServices;
    }

    addLog('info', `Calling: requestDevice(${JSON.stringify(options, null, 2)})`);

    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        throw new Error('Web Bluetooth API is not available/supported (requires HTTPS & User Gesture).');
      }

      const device = await nav.bluetooth.requestDevice(options);

      deviceRef.current = device;
      addLog('success', `Device selected: ${device.name || 'Unknown Device'}`);
      
      setDeviceInfo({
        id: device.id,
        name: device.name,
        gatt: device.gatt ? 'Available' : 'Not available',
      });

      device.addEventListener('gattserverdisconnected', () => {
         addLog('error', `Device disconnected unexpectedly.`);
         setIsConnected(false);
      });

    } catch (error: any) {
      addLog('error', `Error: ${error.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  const connectToGattAndDiscover = async () => {
    if (!deviceRef.current || !deviceRef.current.gatt) return;
    setIsConnecting(true);
    setDiscoveredData([]);
    charsRef.current = {};

    try {
      addLog('info', 'Connecting to GATT Server (device.gatt.connect())...');
      const server = await deviceRef.current.gatt.connect();
      setIsConnected(true);
      addLog('success', 'Connected! Fetching primary services...');

      const services = await server.getPrimaryServices();
      addLog('success', `Found ${services.length} accessible services.`);

      const parsedServices = [];

      for (const service of services) {
        addLog('info', `Querying characteristics for service: ${service.uuid}...`);
        try {
            const characteristics = await service.getCharacteristics();
            const parsedChars = characteristics.map((c: any) => {
              charsRef.current[c.uuid] = c; // Save reference for read/write
              return {
                uuid: c.uuid,
                properties: {
                  read: c.properties.read,
                  write: c.properties.write,
                  notify: c.properties.notify,
                  indicate: c.properties.indicate
                },
                value: null
              };
            });
            parsedServices.push({ uuid: service.uuid, characteristics: parsedChars });
            addLog('success', `  -> Found ${parsedChars.length} characteristics.`);
        } catch (e: any) {
            addLog('error', `Failed to get characteristics for ${service.uuid}: ${e.message}`);
            parsedServices.push({ uuid: service.uuid, characteristics: [], error: e.message });
        }
      }
      setDiscoveredData(parsedServices);
    } catch (e: any) {
      addLog('error', `GATT connection or discovery failed: ${e.message}`);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const readCharacteristicValue = async (serviceUuid: string, charUuid: string) => {
    try {
      const char = charsRef.current[charUuid];
      if (!char) throw new Error("Characteristic reference lost");
      
      addLog('info', `char.readValue() for ${charUuid}...`);
      const value: DataView = await char.readValue();
      const parsedValue = parseDataView(value);
      addLog('success', `Value: ${parsedValue}`);

      setDiscoveredData(prev => prev.map(s => s.uuid === serviceUuid ? {
          ...s,
          characteristics: s.characteristics.map((c: any) => c.uuid === charUuid ? { ...c, value: parsedValue } : c)
      } : s));

    } catch (e: any) {
      addLog('error', `Read failed for ${charUuid}: ${e.message}`);
    }
  };

  const disconnect = () => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
      addLog('info', 'Disconnected by user.');
      setIsConnected(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current && deviceRef.current.gatt && deviceRef.current.gatt.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--on-surface)]">
          <Bluetooth className="text-blue-500" /> Web Bluetooth Demo & Explorer
        </h3>
      </div>

      <div className="bg-[var(--surface)] p-4 sm:p-5 rounded-2xl border border-[var(--outline)] space-y-4">
        <div className="bg-[var(--surface-container-low)] p-4 rounded-xl border border-[var(--outline)] space-y-3">
          <h4 className="font-bold text-sm text-[var(--on-surface)] flex items-center gap-2">
            <Search size={16} className="text-blue-500" />
            Device Discovery Filters
          </h4>
          <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
            By default, all nearby BLE signals are shown (including nameless devices). By specifying a filter below, you can tell the OS to strictly show only matching devices.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
               <div>
                 <label className={`block text-xs font-bold text-[var(--on-surface-variant)] mb-1 ${hackFilterEnabled ? 'opacity-50' : ''}`}>Name Prefix (Starts with...)</label>
                 <input 
                   type="text" 
                   value={filterNamePrefix} 
                   onChange={e => setFilterNamePrefix(e.target.value)} 
                   placeholder="e.g. Air, Galaxy, Bose" 
                   disabled={isRequesting || isConnected || hackFilterEnabled}
                   className="w-full bg-[var(--surface-container)] border border-[var(--outline)] rounded-lg px-3 py-1.5 text-sm text-[var(--on-surface)] disabled:opacity-50" 
                 />
               </div>
               <div>
                 <label className={`block text-xs font-bold text-[var(--on-surface-variant)] mb-1 ${hackFilterEnabled ? 'opacity-50' : ''}`}>Exact Name</label>
                 <input 
                   type="text" 
                   value={filterName} 
                   onChange={e => setFilterName(e.target.value)} 
                   placeholder="e.g. AirPods Pro" 
                   disabled={isRequesting || isConnected || hackFilterEnabled}
                   className="w-full bg-[var(--surface-container)] border border-[var(--outline)] rounded-lg px-3 py-1.5 text-sm text-[var(--on-surface)] disabled:opacity-50" 
                 />
               </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--outline)]">
            <input 
              type="checkbox" 
              id="hackFilter" 
              checked={hackFilterEnabled}
              onChange={e => setHackFilterEnabled(e.target.checked)}
              disabled={isRequesting || isConnected}
              className="w-4 h-4 rounded text-blue-600 border-[var(--outline)] focus:ring-blue-500"
            />
            <label htmlFor="hackFilter" className="text-xs font-bold text-amber-600 dark:text-amber-400 select-none cursor-pointer">
              🧪 LAB: Force Show Only "Named" Devices (A-Z, a-z, 0-9 Array Prefix Hack)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">
            Optional Services (Comma separated Name or UUID)
          </label>
          <input 
            type="text" 
            value={servicesInput}
            onChange={(e) => setServicesInput(e.target.value)}
            className="w-full bg-[var(--surface-container)] border border-[var(--outline)] rounded-xl px-4 py-2 text-sm text-[var(--on-surface)]"
            placeholder="e.g. battery_service, 0x180f, device_information"
            disabled={isRequesting || isConnected}
          />
          <p className="text-xs text-[var(--on-surface-variant)] mt-2 flex items-start gap-2 leading-relaxed">
            <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
            <span>
              <strong>Crucial Web API Limit:</strong> Browsers deny access to any service that is not explicitly requested prior to connection via <code className="bg-black/10 dark:bg-white/10 px-1 rounded">optionalServices</code>. 
              To discover everything, you would theoretically need to know every UUID beforehand. Here, standard generic services are provided by default.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={testWebBluetooth}
            disabled={isRequesting || isConnected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRequesting ? <span className="animate-pulse">Waiting...</span> : <><Search size={16}/> Select Device</>}
          </button>
        </div>
      </div>

      {deviceInfo && (
        <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Target Device Granted</h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">ID: {deviceInfo.id}</p>
            </div>
            {isConnected ? (
              <button onClick={disconnect} className="px-4 py-2 bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 rounded-xl font-bold text-sm transition flex items-center gap-2">
                <Unlink size={16} /> Disconnect
              </button>
            ) : (
              <button 
                onClick={connectToGattAndDiscover} 
                disabled={isConnecting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? <span className="animate-pulse">Connecting...</span> : <><Link2 size={16} /> Connect GATT & Discover</>}
              </button>
            )}
          </div>

          {/* Discovered Services and Characteristics */}
          {discoveredData.length > 0 && (
            <div className="mt-4 space-y-4 border-t border-blue-500/20 pt-4">
              <h5 className="font-bold text-sm text-[var(--on-surface)]">Accessible Architecture (GATT)</h5>
              {discoveredData.map((svc) => (
                <div key={svc.uuid} className="bg-[var(--surface-container)] p-4 rounded-xl border border-[var(--outline)]">
                  <div className="font-bold text-xs text-[var(--on-surface)] flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-purple-500"/> Service: <span className="font-mono">{svc.uuid}</span>
                  </div>
                  {svc.error && <p className="text-red-500 text-xs">{svc.error}</p>}
                  
                  <div className="space-y-2">
                    {svc.characteristics.map((char: any) => (
                      <div key={char.uuid} className="bg-[var(--surface)] p-3 rounded-lg border border-[var(--outline)] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-medium text-[var(--on-surface-variant)] break-all">{char.uuid}</span>
                          <div className="flex gap-1 shrink-0 ml-2">
                            {char.properties.read && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[10px] font-bold uppercase">Read</span>}
                            {char.properties.write && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px] font-bold uppercase">Write</span>}
                            {char.properties.notify && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[10px] font-bold uppercase">Notify</span>}
                          </div>
                        </div>
                        {char.properties.read && (
                           <div className="flex items-center gap-3">
                              <button 
                                onClick={() => readCharacteristicValue(svc.uuid, char.uuid)} 
                                className="px-3 py-1.5 bg-[var(--surface-container-highest)] hover:bg-[var(--primary)] hover:text-white transition rounded-md text-xs font-bold border border-[var(--outline)] flex items-center gap-2"
                              >
                                Read Value
                              </button>
                              {char.value !== null && (
                                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded w-full overflow-x-auto whitespace-nowrap">
                                  {char.value}
                                </span>
                              )}
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Embedded Terminal Logger */}
      <div className="bg-[#0D1117] p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-3 shadow-inner">
        <h4 className="font-bold text-gray-400 text-xs flex items-center gap-2 tracking-widest uppercase mb-4">
           {'>'} Terminal Output
        </h4>
        <div className="font-mono text-[11px] space-y-2 max-h-64 overflow-y-auto w-full pr-2 pb-2">
            {log.length === 0 ? (
            <p className="text-gray-600 italic">... waiting for interaction ...</p>
            ) : (
            log.map((entry, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 ${
                  entry.type === 'error' ? 'text-rose-400' :
                  entry.type === 'success' ? 'text-emerald-400' :
                  'text-gray-300'
                }`}>
                  <span className="opacity-50 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                  <span className="break-words w-full leading-5">{entry.message}</span>
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
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">1. Device ID & Privacy</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              The <code className="bg-[var(--surface-container-highest)] px-1 rounded">device.id</code> is <strong>not the MAC address</strong>. 
              For privacy and security tracking prevention, browsers generate a unique, origin-specific identifier.
              Two different devices (or even two different browsers on the same device) connecting to the exact same BLE accessory will receive <strong>completely different Device IDs</strong>.
              The MAC address is deliberately withheld from web applications.
            </p>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">2. Classic vs. BLE</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              The Web Bluetooth API <strong>strictly supports Bluetooth Low Energy (BLE)</strong> via GATT (Generic Attribute Profile). 
              Classic Bluetooth devices (e.g., standard audio headsets, old serial SPP devices, Bluetooth keyboards using classic HID) 
              usually do not expose a GATT server and <strong>cannot be interacted with</strong> using this API.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">3. OS & Browser UI</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              When <code className="bg-[var(--surface-container-highest)] px-1 rounded">requestDevice()</code> is called, the browser yields control to a native OS-level device picker dialog. 
              This ensures websites cannot passively scan nearby devices in the background without explicit user selection. 
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">4. Services & Characteristics</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              BLE devices organize data into Services and sub-Characteristics. 
              You can only access services you explicitly whitelist in the initial connection request. 
              Characteristics define capabilities like <strong>Read</strong> (fetch state), <strong>Write</strong> (send command), or <strong>Notify</strong> (subscribe to live updates).
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">5. Filtering & "Unknown" Devices</h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              Many BLE devices broadcast purely random MACs or nameless payloads for background tasks (resulting in a list of "Unknown devices"). 
              While you cannot magically filter by "Has any name", you <strong>can</strong> apply a <code className="bg-[var(--surface-container-highest)] px-1 rounded">namePrefix</code> or <code className="bg-[var(--surface-container-highest)] px-1 rounded">name</code> filter. 
              Once a filter is applied, the OS dialog will <strong>hide all unknown devices</strong> and only show those matching the criteria.
            </p>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <h5 className="font-bold text-sm text-[var(--on-surface)] border-b border-[var(--outline)] pb-2 flex items-center gap-2">
               <span className="text-amber-500">🧪</span> 6. The "A-Z" Named Device Hack
            </h5>
            <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
              The <code className="bg-[var(--surface-container-highest)] px-1 rounded">filters</code> option accepts an array, acting as an <strong>OR condition</strong>. 
              If you want to filter out all nameless "Unknown" devices and only show devices with a readable name, you can pass an array of 62 filters, each checking for a <code className="bg-[var(--surface-container-highest)] px-1 rounded">namePrefix</code> of a single printable character (A-Z, a-z, 0-9). 
              Because at least one character must match, nameless devices are excluded. You can test this using the LAB toggle above!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
