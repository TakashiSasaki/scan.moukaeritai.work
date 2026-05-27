import React from 'react';
import { Info, ExternalLink, Database, Link as LinkIcon, Activity, Lock, Smartphone } from 'lucide-react';

export default function AppAboutPage() {
  const GITHUB_DOCS_URL = 'https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/database-structure.md';

  return (
    <div className="min-h-screen bg-[var(--surface-container-lowest)] text-[var(--on-surface)] flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--surface-container-lowest)]/80 backdrop-blur-md border-b border-[var(--outline)] px-4 py-4 flex items-center justify-center shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Info size={24} className="text-[var(--primary)]" />
          About scan.moukaeritai.work
        </h1>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8 mt-4">

        {/* Core Explanation */}
        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-[32px] p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-[var(--primary)]">What is this app?</h2>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-4">
            scan.moukaeritai.work is an inventory tracking and observation application. It enables tracking of physical assets and objects using various scannable identifiers.
            The system focuses on creating immutable records of observations when tags are scanned, building a reliable history for each tracked item.
          </p>
        </section>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard
            icon={<Database className="text-blue-500" size={24} />}
            title="Objects & Assets"
            description="Core entities representing physical items. Each object can have metadata, relationships, images, and an event history."
          />
          <FeatureCard
            icon={<LinkIcon className="text-amber-500" size={24} />}
            title="Identifiers"
            description="Scannable tags linked to objects. Supported types include QR codes, NFC tags, barcodes, Bluetooth, and manual entry."
          />
          <FeatureCard
            icon={<Activity className="text-green-500" size={24} />}
            title="Observations & Events"
            description="Immutable evidence of scans and interactions. Observations record when and how an identifier was seen."
          />
          <FeatureCard
            icon={<Lock className="text-purple-500" size={24} />}
            title="Privacy & Ownership"
            description="Strong privacy controls. Users own their data (objects, identifiers, events) managed securely via Firebase rules."
          />
        </div>

        {/* Technical Overview */}
        <section className="bg-[var(--surface-container-low)] border border-[var(--outline)] rounded-[32px] p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-[var(--on-surface)] flex items-center gap-2">
            <Smartphone size={20} className="text-[var(--primary)]" />
            Backend & Architecture
          </h2>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-4">
            The application relies on Firebase Firestore for scalable, real-time data synchronization. Data is aggressively cached locally in the browser to enable robust offline support and fast UI responses. The backend enforces security rules to ensure you only access your own inventory.
          </p>

          <div className="mt-6 border-t border-[var(--outline-variant)] pt-6">
            <h3 className="text-sm font-bold text-[var(--on-surface)] mb-3">Future Extensions (Not Implemented)</h3>
            <ul className="space-y-2 text-sm text-[var(--on-surface-variant)] list-disc pl-5 marker:text-amber-500">
              <li>Grouping multiple observations via <span className="font-mono text-xs">observationSets</span>.</li>
              <li>Generic relationship bindings via <span className="font-mono text-xs">identifierTargetBindings</span>.</li>
              <li>Background scanning of Bluetooth Low Energy (BLE), Wi-Fi, and integration with dedicated sensor gateways.</li>
            </ul>
            <p className="mt-3 text-xs italic text-[var(--on-surface-variant)]">
              Note: Radio and sensor data are highly privacy-sensitive and will require rigorous security boundaries if fully implemented.
            </p>
          </div>
        </section>

        {/* Database Documentation Link */}
        <section className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <Database size={48} className="text-[var(--primary)] mb-4" />
          <h2 className="text-xl font-bold mb-2 text-[var(--on-surface)]">Database Structure Documentation</h2>
          <p className="text-sm text-[var(--on-surface-variant)] max-w-lg mb-6">
            Detailed, canonical documentation regarding the Firestore collections, schemas, fields, and relationships used by this application is maintained on GitHub.
          </p>

          <a
            href={GITHUB_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={18} />
            View database structure documentation
          </a>
        </section>

        <div className="pb-12"></div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-[var(--surface-container)] rounded-[24px] p-5 border border-[var(--outline)] shadow-sm">
      <div className="mb-3">{icon}</div>
      <h3 className="font-bold text-[var(--on-surface)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{description}</p>
    </div>
  );
}
