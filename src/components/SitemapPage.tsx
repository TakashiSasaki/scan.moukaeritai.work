import React from 'react';
import { motion } from 'motion/react';
import { Route as RouteIcon, X, ExternalLink } from 'lucide-react';

export default function SitemapPage({ onClose }: { onClose: () => void }) {
  const routes = [
    { path: '/', label: 'Landing / Login', description: 'Public entry point' },
    { path: '/app', label: 'Home / Dashboard', description: 'Main authenticated home' },
    { path: '/search', label: 'Search', description: 'Search inventory' },
    { path: '/scanner', label: 'Scanner', description: 'QR/NFC Scanning' },
    { path: '/object/new', label: 'New Object', description: 'Create new item' },
    { path: '/object/:id', label: 'Edit Object', description: 'View/Edit item details' },
    { path: '/overview', label: 'Stats', description: 'Inventory statistics' },
    { path: '/unassigned', label: 'Unassigned', description: 'Manage scanned but unbound tags' },
    { path: '/admin', label: 'Admin Panel', description: 'System metrics and diagnostics' },
    { path: '/settings', label: 'User Settings', description: 'Profile and app preferences' },
    { path: '/about', label: 'About', description: 'App information' },
    { path: '/developer', label: 'Developer Docs', description: 'System documentation' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic">Route Map</h1>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">Internal application structure</p>
        </div>
        <button onClick={onClose} className="bg-[var(--surface-container-highest)] p-2 rounded-xl text-[var(--on-surface-variant)]">
          <X size={24} />
        </button>
      </div>

      <div className="grid gap-3">
        {routes.map((route) => (
          <div 
            key={route.path}
            className="flex items-center gap-4 p-4 bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl"
          >
            <div className="bg-[var(--primary)]/10 p-3 rounded-xl text-[var(--primary)]">
              <RouteIcon size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[var(--on-surface)]">{route.label}</div>
              <div className="text-xs font-mono text-[var(--on-surface-variant)]">{route.path}</div>
            </div>
            <div className="text-xs text-[var(--on-surface-variant)] font-medium italic">
              {route.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
