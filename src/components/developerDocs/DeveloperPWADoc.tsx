import React from 'react';
import { AppWindow, Download, Smartphone } from 'lucide-react';

export default function DeveloperPWADoc() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AppWindow className="text-[var(--primary)]" size={24} />
          PWA Architecture
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          This application is designed as an installable Progressive Web App (PWA). It utilizes <code>vite-plugin-pwa</code> to provide a native-like experience on mobile and desktop devices.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
              <Download size={24} />
            </div>
            <h3 className="text-lg font-bold text-[var(--on-surface)]">Installability</h3>
          </div>
          <p className="text-[var(--on-surface-variant)] text-sm">
            The entire site, including these developer documentation pages, is part of a single unified app shell.
            There is no separate "developer app" — when you install the app, the documentation is included and
            remains reachable (assuming network connectivity or proper caching is maintained).
          </p>
        </section>

        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-full text-green-500">
              <Smartphone size={24} />
            </div>
            <h3 className="text-lg font-bold text-[var(--on-surface)]">Configuration</h3>
          </div>
          <p className="text-[var(--on-surface-variant)] text-sm mb-2">
            The PWA configuration is managed in <code>vite.config.ts</code>. Key aspects include:
          </p>
          <ul className="list-disc list-inside text-xs text-[var(--on-surface-variant)] space-y-1">
            <li>Automatic update registration (<code>registerType: 'autoUpdate'</code>).</li>
            <li>Standalone display mode for a native feel.</li>
            <li>Runtime caching strategies for fonts and static assets.</li>
            <li>Pre-build script execution to dynamically generate requisite PWA icons (manifests, maskable icons) from a source SVG.</li>
          </ul>
        </section>
      </div>

      <section className="bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 mt-4">
        <p className="text-sm text-[var(--on-surface)] font-medium text-center">
          Note: This documentation page is static reference material and does not alter or re-configure the application's actual PWA service worker behavior.
        </p>
      </section>
    </div>
  );
}
