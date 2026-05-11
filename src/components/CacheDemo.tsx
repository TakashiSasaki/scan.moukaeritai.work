import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, HardDrive } from 'lucide-react';
import { formatSize } from '../lib/utils';

interface CacheItemDetails {
  url: string;
  size: number;
  type: string;
}

interface CacheCategoryData {
  name: string;
  items: CacheItemDetails[];
  totalSize: number;
}

export default function CacheDemo() {
  const [cachesData, setCachesData] = useState<CacheCategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const loadCacheData = async () => {
    setIsLoading(true);
    setError(null);
    setCachesData([]);

    if (!('caches' in window)) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    try {
      const cacheNames = await window.caches.keys();
      const allCaches: CacheCategoryData[] = [];

      for (const name of cacheNames) {
        const cache = await window.caches.open(name);
        const requests = await cache.keys();
        const items: CacheItemDetails[] = [];
        let totalSize = 0;

        for (const req of requests) {
          try {
            const res = await cache.match(req);
            if (res) {
              const contentLength = res.headers.get('Content-Length');
              const contentType = res.headers.get('Content-Type') || 'Unknown';
              const size = contentLength ? parseInt(contentLength, 10) : 0;
              
              items.push({
                url: req.url,
                size,
                type: contentType,
              });
              totalSize += size;
            }
          } catch (e) {
            console.warn(`Could not read cache item: ${req.url}`);
          }
        }

        // Sort items by size (largest first)
        items.sort((a, b) => b.size - a.size);

        allCaches.push({
          name,
          items,
          totalSize,
        });
      }

      setCachesData(allCaches);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCacheData();
  }, []);

  const totalAppCacheSize = cachesData.reduce((acc, c) => acc + c.totalSize, 0);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">CacheStorage API</h3>
          <button 
            onClick={loadCacheData}
            disabled={isLoading}
            className="p-2 bg-[var(--surface)] hover:bg-[var(--surface-container-highest)] rounded-full transition-colors disabled:opacity-50"
            title="Refresh cache data"
          >
            <RefreshCw size={18} className={`text-[var(--on-surface)] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-[var(--on-surface-variant)] mb-6 leading-relaxed">
          The CacheStorage API allows web applications to store network responses directly on the device. 
          This demo shows all named caches managed by this app via service workers or manual caching mechanisms, revealing what assets and models are stored offline.
        </p>

        {!isSupported && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl mb-6 border border-red-500/20">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">CacheStorage API is not supported in this browser.</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl mb-6 border border-red-500/20">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">Error loading cache data: {error}</p>
          </div>
        )}

        {isSupported && !isLoading && !error && (
          <div className="space-y-6">
            <div className="p-4 bg-[var(--surface-container-high)] rounded-2xl border border-[var(--outline)] flex items-center justify-between">
              <div className="flex items-center gap-3 text-[var(--on-surface-variant)]">
                <Database size={20} className="text-indigo-500" />
                <span className="font-medium text-sm">Total Cached Data Storage</span>
              </div>
              <span className="text-xl font-bold text-[var(--on-surface)]">{formatSize(totalAppCacheSize)}</span>
            </div>

            {cachesData.length === 0 ? (
              <div className="p-8 text-center bg-[var(--surface)] rounded-2xl border border-[var(--outline)]">
                <HardDrive size={32} className="mx-auto mb-3 text-[var(--on-surface-variant)] opacity-50" />
                <p className="text-[var(--on-surface-variant)] font-medium">No caches found for this application.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cachesData.map((cache, idx) => (
                  <div key={idx} className="bg-[var(--surface)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                    <div className="px-5 py-4 bg-[var(--surface-container-low)] border-b border-[var(--outline)] flex items-center justify-between">
                      <h4 className="font-bold text-[var(--on-surface)] flex items-center gap-2">
                        <HardDrive size={16} className="text-blue-500" />
                        {cache.name}
                      </h4>
                      <span className="text-sm font-bold bg-[var(--outline)]/30 px-3 py-1 rounded-full text-[var(--on-surface-variant)]">
                        {formatSize(cache.totalSize)}
                      </span>
                    </div>
                    <div className="p-0 max-h-[300px] overflow-y-auto no-scrollbar bg-[var(--surface)]">
                      {cache.items.length === 0 ? (
                        <p className="text-sm text-[var(--on-surface-variant)] p-5 text-center">Empty cache</p>
                      ) : (
                        <ul className="divide-y divide-[var(--outline)]/50">
                          {cache.items.map((item, i) => (
                            <li key={i} className="px-5 py-3 hover:bg-[var(--surface-container-highest)] transition-colors">
                              <div className="flex justify-between items-start gap-4 mb-1">
                                <span className="text-xs font-mono text-[var(--on-surface)] break-all flex-1 line-clamp-2" title={item.url}>
                                  {new URL(item.url).pathname.split('/').pop() || item.url}
                                </span>
                                <span className="text-xs font-semibold text-[var(--on-surface-variant)] whitespace-nowrap">
                                  {formatSize(item.size)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--on-surface-variant)] mt-1">
                                <span className="bg-[var(--surface-container-high)] px-2 py-0.5 rounded-md truncate max-w-[200px]" title={item.type}>
                                  {item.type}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="p-12 text-center">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--on-surface-variant)]">Scanning cache storage...</p>
          </div>
        )}
      </div>
    </div>
  );
}
