import React from 'react';
import { Database, AlertTriangle, Info } from 'lucide-react';

export default function DeveloperDataModelDoc() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="text-[var(--primary)]" size={24} />
          Data Model Overview
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          The application uses a normalized Firestore data model focused on physical object tracking,
          immutable operational history, and deterministic identifier resolution. This page outlines
          the core concepts and migration phases.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-sm">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-[var(--on-surface)]">
            This is a high-level conceptual summary. For the exact schema definitions and TypeScript interfaces, refer to <code>src/types.ts</code> in the source code.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Core Collections</h3>
          <ul className="space-y-4 text-sm">
            <li>
              <strong className="text-[var(--primary)] block mb-1">objects</strong>
              <p className="text-[var(--on-surface-variant)]">Represents the physical items being tracked. Contains descriptive metadata, categorization, and denormalized summaries (like active identifiers and primary images) for efficient querying.</p>
            </li>
            <li>
              <strong className="text-[var(--primary)] block mb-1">identifiers</strong>
              <p className="text-[var(--on-surface-variant)]">Lookup records representing scannable tags (QR, NFC, etc.). They map a deterministic payload to an internal identity. The model is moving towards "ownerless/global" identifiers where <code>objectId</code> is kept only for legacy compatibility.</p>
            </li>
            <li>
              <strong className="text-[var(--primary)] block mb-1">objectIdentifierBindings</strong>
              <p className="text-[var(--on-surface-variant)]">The canonical active relationship state between an <code>object</code> and an <code>identifier</code>. It represents currently active links, NOT a history log.</p>
            </li>
            <li>
              <strong className="text-[var(--primary)] block mb-1">identifierObservations</strong>
              <p className="text-[var(--on-surface-variant)]">Records of when and where an identifier was scanned. These do not strictly require an existing object (loose evidence without a formal custody model). Sighting and scan events flow through this collection.</p>
            </li>
            <li>
              <strong className="text-[var(--primary)] block mb-1">objectEvents</strong>
              <p className="text-[var(--on-surface-variant)]">An append-only operational history and audit log for objects. Binding creations, metadata updates, and other lifecycle events are recorded here.</p>
            </li>
            <li>
              <strong className="text-[var(--primary)] block mb-1">objectImages</strong>
              <p className="text-[var(--on-surface-variant)]">Normalized storage for images associated with objects.</p>
            </li>
             <li>
              <strong className="text-amber-500 block mb-1">items (legacy)</strong>
              <p className="text-[var(--on-surface-variant)]">The legacy flat data model. Migration to the normalized model is mostly complete, but certain paths are retained for backward compatibility.</p>
            </li>
          </ul>
        </section>

        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Semantic Identity Payload</h3>
          <p className="text-[var(--on-surface-variant)] text-sm mb-4">
            Deterministic IDs (<code>identifierKey</code>) are generated using UUIDv5 against a canonical JSON payload.
            The payload strictly includes the following fields:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--on-surface-variant)] space-y-1 mb-4 columns-1 sm:columns-2">
            <li><code>app</code></li>
            <li><code>idKind</code></li>
            <li><code>identitySchemaVersion</code></li>
            <li><code>canonicalizationVersion</code></li>
            <li><code>kind</code></li>
            <li><code>scheme</code></li>
            <li><code>canonicalValue</code></li>
          </ul>
          <p className="text-[var(--on-surface-variant)] text-sm mb-4">
            The payload strictly EXCLUDES mutable or interpretation-dependent fields such as:
          </p>
           <ul className="list-disc list-inside text-sm text-[var(--on-surface-variant)] space-y-1 columns-1 sm:columns-2">
            <li><code>ownerId</code></li>
            <li><code>objectId</code></li>
            <li><code>rawPayload</code></li>
            <li><code>rawValue</code></li>
            <li><code>status</code></li>
            <li><code>label</code></li>
            <li>Timestamps</li>
          </ul>
        </section>

        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 border-l-4 border-l-amber-500">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-2 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Migration & Constraints
          </h3>
          <ul className="space-y-3 text-sm text-[var(--on-surface-variant)]">
            <li><strong>Phase 7E Execution:</strong> Remains blocked unless explicitly approved.</li>
            <li><strong>Ownerless Direction:</strong> Identifiers are conceptually global. <code>ownerId</code> is used for scoping observations and access control, but not for determining the identifier's intrinsic identity.</li>
            <li><strong>rawPayload:</strong> In future v2 designs, an optional non-identifying <code>rawPayload</code> is preferred over <code>rawValue</code>.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
