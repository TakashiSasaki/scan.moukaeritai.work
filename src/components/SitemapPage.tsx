import React from 'react';
import { LogOut, Map } from 'lucide-react';
import { routeGroups } from '../lib/routeCatalog';

interface SitemapPageProps {
  onClose: () => void;
}

export default function SitemapPage({ onClose }: SitemapPageProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--outline)] rounded-2xl overflow-hidden shadow-sm mx-4 mt-4 flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b border-[var(--outline)] bg-[var(--surface-container-low)] flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 text-[var(--on-surface)]">
          <Map className="text-amber-500" size={20} />
          <h2 className="text-lg font-bold">Route Map</h2>
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full ml-2">Admin</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors flex items-center gap-2"
        >
          <LogOut size={16} /> <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-[var(--surface-container-lowest)]">
        <div className="mb-6 text-sm text-[var(--on-surface-variant)]">
          This is a human-readable routing overview for administrators and developers. It is not an SEO sitemap.xml.
        </div>

        {routeGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-4">
            <h3 className="text-md font-bold text-[var(--primary)] border-b border-[var(--outline)] pb-2">
              {group.groupName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.routes.map((route, routeIdx) => (
                <div key={routeIdx} className="bg-[var(--surface-container)] rounded-xl p-4 border border-[var(--outline-variant)] shadow-sm hover:shadow-md transition-shadow">
                  <div className="font-mono text-sm font-bold text-[var(--on-surface)] mb-2 bg-[var(--surface-container-high)] inline-block px-2 py-1 rounded">
                    {route.path}
                  </div>
                  <div className="space-y-1.5 text-xs text-[var(--on-surface-variant)]">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[70px] text-[var(--on-surface)]">Component:</span>
                      <span className="text-[var(--secondary)]">{route.component}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[70px] text-[var(--on-surface)]">Access:</span>
                      <span className={route.access.includes('admin') ? 'text-amber-500 font-medium' : ''}>
                        {route.access}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[70px] text-[var(--on-surface)]">Navigation:</span>
                      <span>{route.navigation}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[70px] text-[var(--on-surface)]">Purpose:</span>
                      <span>{route.purpose}</span>
                    </div>
                    {route.notes && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[var(--outline-variant)]">
                        <span className="font-semibold min-w-[70px] text-blue-400">Notes:</span>
                        <span className="italic text-blue-400/80">{route.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
