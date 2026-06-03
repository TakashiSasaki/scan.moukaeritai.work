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
        <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Core Domain Entities</h3>
        <ul className="space-y-4 text-sm">
          <li>
            <strong className="text-[var(--primary)] block mb-1">Object</strong>
            <p className="text-[var(--on-surface-variant)]">The central entity representing a physical item or asset being tracked. Objects have an owner and carry descriptive metadata, state (active, archived, lost), and a unified location derived from observation history.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Identifier</strong>
            <p className="text-[var(--on-surface-variant)]">A scannable tag (e.g., QR, NFC, Bluetooth, barcode) attached to or associated with an Object. Crucially, identifiers identify things but are not themselves the object. Identifiers are moving towards a global/ownerless model.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Observation</strong>
            <p className="text-[var(--on-surface-variant)]">Evidence that an identifier was seen or scanned at a particular place and time. Observations do not strictly require an existing Object (loose evidence without a formal custody model). They capture sightings and scanner proximity events.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Binding</strong>
            <p className="text-[var(--on-surface-variant)]">The canonical relation establishing that a particular Identifier is currently attached to a particular Object. Objects and identifiers are related canonically through bindings, removing direct legacy associations.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Event</strong>
            <p className="text-[var(--on-surface-variant)]">An append-only record describing the object's lifecycle and operational history. Binding creations, metadata updates, status changes, and other important operations are recorded as events.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Image</strong>
            <p className="text-[var(--on-surface-variant)]">Media (photos) belonging to Objects, providing visual context or proof of state.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">Legacy Item</strong>
            <p className="text-[var(--on-surface-variant)]">The older, flat model where tags and history were embedded directly into the item object. Legacy items remain in the system purely as compatibility and migration source material.</p>
          </li>
          <li>
            <strong className="text-[var(--primary)] block mb-1">User/Admin</strong>
            <p className="text-[var(--on-surface-variant)]">Users own objects and create observations. Admins have system-wide access to dashboards, migration controls, and analytics.</p>
          </li>
        </ul>
      </section>

      <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4">Semantic Identifier Identity</h3>
        <p className="text-[var(--on-surface-variant)] text-sm mb-4">
          The concept of an identifier's "identity" is strictly controlled to ensure deterministic resolution. An identifier is uniquely known by a canonical payload, not simply its raw value.
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
