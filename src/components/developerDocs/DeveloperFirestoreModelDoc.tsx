import React from 'react';
import { Database, Info } from 'lucide-react';

export default function DeveloperFirestoreModelDoc() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="text-[var(--primary)]" size={24} />
          Firestore Implementation
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          This page documents the concrete Firestore collections that realize the abstract domain model.
          It covers document ID semantics, rules/status, and migration compatibility.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-sm">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-[var(--on-surface)]">
            This page is purely static documentation and does not query or inspect live database environments.
          </p>
        </div>
      </section>

      <div className="space-y-6">
        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Active Core Collections</h3>
          <div className="space-y-6">

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">objects</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Generated UUIDv4 (matches <code>objectId</code> field).</p>
              <p className="text-sm text-[var(--on-surface)]">
                Stores the physical asset. Denormalizes related data like <code>identifierSummary</code> and <code>primaryImageUrl</code> for read efficiency.
                Fully active and governed by ownership-based rules.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">identifiers</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Deterministic UUIDv5 (matches <code>identifierKey</code> field).</p>
              <p className="text-sm text-[var(--on-surface)]">
                Lookup records for scanning. Recently updated in Phase 7D.10 to optionally allow <code>rawPayload</code> (as a map), <code>identityModelVersion</code>, <code>identitySchemaVersion</code>, and <code>canonicalizationVersion</code>.
                Currently, <code>ownerId</code> remains required for writes due to legacy rules, though moving towards ownerless conceptually.
                <code>objectId</code> is preserved as a legacy/non-authoritative reference.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">objectIdentifierBindings</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Deterministic composite (e.g. <code>ObjectId__IdentifierKey__active</code>).</p>
              <p className="text-sm text-[var(--on-surface)]">
                The canonical relation tying an object to an identifier. Prevents duplicate concurrent attachments. References <code>objectId</code> and <code>identifierKey</code>.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">identifierObservations</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> UUIDv7 for client-created (matches <code>observationId</code>).</p>
              <p className="text-sm text-[var(--on-surface)]">
                Time-series log of identifier sightings. Client rules heavily restrict writes to standard user scenarios (e.g. standard scanning via QR/NFC).
                System, imported, and device-level observations are reserved for backend and ingestion flows.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">objectEvents</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Generated UUIDv4 (matches <code>eventId</code>).</p>
              <p className="text-sm text-[var(--on-surface)]">
                Append-only operational log recording object lifecycle and modifications. Tied to an <code>objectId</code>.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">objectImages</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Generated UUIDv4 (matches <code>imageId</code>).</p>
              <p className="text-sm text-[var(--on-surface)]">
                Normalized image storage, referencing <code>objectId</code>.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-[var(--primary)] text-md">users & admins</h4>
              <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>ID:</strong> Firebase Auth UID.</p>
              <p className="text-sm text-[var(--on-surface)]">
                Standard identity tables for mapping authenticated user data and permissions.
              </p>
            </div>

          </div>
        </section>

        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4 text-amber-500">Legacy Collections</h3>
          <div className="border-l-4 border-amber-500 pl-4">
            <h4 className="font-bold text-amber-500 text-md">items</h4>
            <p className="text-xs text-[var(--on-surface-variant)] mb-2"><strong>Status:</strong> Legacy Compatibility</p>
            <p className="text-sm text-[var(--on-surface)]">
              The original flat structure containing embedded properties, tags, and images. While the migration to <code>objects</code> is substantially complete, this collection acts as a baseline fallback.
              <strong>Phase 7E Execution</strong> (final migration of observation logic) is currently blocked. No new legacy migrations are occurring.
            </p>
          </div>
        </section>

        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4 text-red-500">Blocked / Future-Only Rules</h3>
          <ul className="space-y-3 text-sm text-[var(--on-surface-variant)]">
            <li><strong>ACL Fields:</strong> Firestore rules actively reject <code>visibility</code>, <code>readers</code>, <code>writers</code>, <code>editors</code>, <code>allowedUserIds</code>, and <code>communityId</code> on identifiers.</li>
            <li><strong>Missing ownerId:</strong> Identifiers without an <code>ownerId</code> are still rejected by current write rules, despite the conceptual shift to ownerless tags.</li>
            <li><strong>Imported Observations:</strong> Direct client-created <code>identifierObservations</code> with <code>observationType: "imported"</code> are blocked.</li>
            <li><strong>Global Identifier Collections:</strong> Collections for <code>globalIdentifiers</code> or <code>identifierClaims</code> are not implemented in Firestore.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
