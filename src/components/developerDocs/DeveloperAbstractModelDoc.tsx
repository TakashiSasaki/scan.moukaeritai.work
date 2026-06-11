import React from 'react';
import { Boxes, Info } from 'lucide-react';

export default function DeveloperAbstractModelDoc() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Boxes className="text-[var(--primary)]" size={24} />
          Abstract Data Model
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          This page outlines the conceptual domain model behind the application.
          Understanding these abstract concepts is critical before inspecting the concrete Firestore implementations.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-sm">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-[var(--on-surface)]">
            This is a high-level conceptual summary outlining how entities relate to one another logically.
          </p>
        </div>
      </section>

      <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Core Domain Model: Entity / Fact / Projection</h3>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex gap-3 text-sm mb-6">
          <Info className="text-green-500 shrink-0" size={20} />
          <p className="text-[var(--on-surface)]">
            <strong>Entity = timeless identity node. Fact = temporal node. Projection = derived read model.</strong><br/>
            Object / Marker / Place are independent Entities. Association / Observation / Measurement / Event are Facts.
            Summary records are derived and rebuildable from Facts.
          </p>
        </div>
        <ul className="space-y-4 text-sm">
          <li>
            <strong className="text-[var(--primary)] block mb-1">Object (Entity)</strong>
            <p className="text-[var(--on-surface-variant)]">The central entity representing a physical item or asset being tracked. Objects are timeless identity nodes without domain time.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Marker (Entity)</strong>
            <p className="text-[var(--on-surface-variant)]">A scannable tag (e.g., QR, NFC, Bluetooth, barcode) acting as a timeless identity node. Replaces the legacy "Identifier" concept.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Place (Entity)</strong>
            <p className="text-[var(--on-surface-variant)]">An independent entity representing a location. Replaces using ad-hoc location fields directly.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Association (Fact)</strong>
            <p className="text-[var(--on-surface-variant)]">A typed hyperedge connecting participants (e.g. Object and Marker). It contains domain time and replaces the legacy "Binding" concept.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Observation (Fact)</strong>
            <p className="text-[var(--on-surface-variant)]">Evidence that a Marker was seen or scanned at a particular place and time. Time-series evidence records.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Measurement (Fact)</strong>
            <p className="text-[var(--on-surface-variant)]">Quantitative evidence, such as GPS coordinates or Bluetooth RSSI values taken at a moment in time.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Event (Fact)</strong>
            <p className="text-[var(--on-surface-variant)]">An application-level or business-level occurrence, like an Object being created or archived.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Summary (Projection)</strong>
            <p className="text-[var(--on-surface-variant)]">Derived read models (ObjectSummary, MarkerSummary, PlaceSummary) used for application performance and UX. They are not the source of truth.</p>
          </li>
        </ul>
      </section>

      <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Legacy Concepts</h3>
        <p className="text-[var(--on-surface-variant)] text-sm mb-4">
          The current implementation is migrating away from older concepts. The following are kept for backward compatibility during the transition:
        </p>
        <ul className="space-y-4 text-sm mb-6">
          <li>
            <strong className="text-orange-500 block mb-1">Identifier & Binding</strong>
            <p className="text-[var(--on-surface-variant)]">Conceptually map to <strong>Marker</strong> and <strong>Association</strong>. The older logic treats bindings as the primary relation.</p>
          </li>
          <li>
            <strong className="text-orange-500 block mb-1">Legacy Item</strong>
            <p className="text-[var(--on-surface-variant)]">The Tag 1.0 flat model where tags and history were embedded directly into the item object.</p>
          </li>
        </ul>

        <h4 className="font-bold text-[var(--on-surface)] mb-2">Semantic Identifier Identity (Legacy)</h4>
        <p className="text-[var(--on-surface-variant)] text-sm mb-4">
          Formerly the center of the identity model, an identifier was uniquely known by a canonical payload, not simply its raw value. This is being replaced by the Marker entity.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-bold text-green-500 mb-2">Included in Identity</h4>
            <ul className="list-disc list-inside text-[var(--on-surface-variant)] space-y-1">
              <li>App Namespace (implicit/policy)</li>
              <li>Type/Kind of record (<code>identifier</code>)</li>
              <li><code>kind</code> (e.g., qr, nfc)</li>
              <li><code>scheme</code> (e.g., url, uid)</li>
              <li><code>canonicalValue</code></li>
              <li>Version Fields (<code>identitySchemaVersion</code>, <code>canonicalizationVersion</code>)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-red-500 mb-2">Excluded from Identity</h4>
            <ul className="list-disc list-inside text-[var(--on-surface-variant)] space-y-1">
              <li><code>ownerId</code></li>
              <li><code>objectId</code> (legacy/non-authoritative)</li>
              <li><code>rawPayload</code></li>
              <li><code>rawValue</code></li>
              <li><code>status</code> & <code>label</code></li>
              <li>Timestamps & Location</li>
              <li>Future Claims/ACL</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Future-Only Concepts</h3>
        <p className="text-[var(--on-surface-variant)] text-sm mb-4">
          Several concepts are part of the long-term domain model but are not yet fully implemented or are blocked:
        </p>
        <ul className="space-y-3 text-sm text-[var(--on-surface-variant)]">
          <li><strong>Global Ownerless Model:</strong> The conceptual shift where identifiers are inherently ownerless and globally discoverable, relying entirely on bindings and access control for security rather than a strict <code>ownerId</code> boundary.</li>
          <li><strong>Identifier Claims:</strong> Future mechanism to allow users to assert ownership or custody over a globally-resolved identifier without needing absolute database-level write locks.</li>
          <li><strong>Access Control Lists (ACL):</strong> Fine-grained permissions (<code>visibility</code>, <code>readers</code>, <code>writers</code>) on identifiers. Currently strictly forbidden.</li>
        </ul>
      </section>
    </div>
  );
}
