import { Database, ShieldAlert, BookOpen, GitMerge, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DatabaseStructurePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface)] text-[var(--on-surface)] pb-20">
      <header className="sticky top-0 z-10 bg-[var(--surface-container)]/90 backdrop-blur-md border-b border-[var(--outline)] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Database size={24} className="text-[var(--primary)]" />
            Database Structure
          </h1>
          <p className="text-xs text-[var(--on-surface-variant)]">Schema documentation</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8">

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-bold uppercase tracking-wider">
            <BookOpen size={14} /> Read-only documentation
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldAlert size={14} /> No live data shown
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider">
            Current
          </span>
        </div>

        {/* Overview */}
        <section className="bg-[var(--surface-container-lowest)] border border-[var(--outline)] rounded-[32px] p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-[var(--primary)]">Overview</h2>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-4">
            This application uses Firebase / Firestore to manage objects, identifiers, relationships, observations, events, and images.
            This page provides a static documentation view of the current database schema. It does not connect to the database or show live data.
          </p>
        </section>

        {/* Visual Relationship Diagram */}
        <section className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-[32px] p-6 shadow-sm overflow-x-auto">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--on-surface)]">
            <GitMerge size={20} className="text-indigo-500" />
            Visual Relationship Diagram
          </h2>
          <div className="bg-[var(--surface-container-highest)] p-4 rounded-2xl font-mono text-sm overflow-x-auto whitespace-pre text-[var(--on-surface)]">
{`users
  └─ owns ─ objects
              ├─ has images ─ objectImages
              ├─ has events ─ objectEvents
              └─ bound via ─ objectIdentifierBindings ─ identifiers
                                                     └─ observed by ─ identifierObservations
admins
  └─ grants admin capabilities`}
          </div>

          <div className="mt-6 border-t border-[var(--outline)] pt-4">
            <h3 className="text-sm font-bold text-[var(--on-surface-variant)] mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Future Extension Concepts (Not Implemented)
            </h3>
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre text-[var(--on-surface-variant)]">
{`identifiers
  ├─ grouped observations via observationSets
  └─ generic target relationships via identifierTargetBindings
       ├─ object
       ├─ location
       ├─ container
       ├─ group
       └─ gateway`}
            </div>
          </div>
        </section>

        {/* Core Collections */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold px-2">Core Collections</h2>

          <CollectionCard
            name="objects"
            purpose="Represents inventory objects/assets."
            fields={['objectId', 'ownerId', 'name', 'description', 'status', 'currentLocation', 'primaryImageId', 'primaryImageUrl', 'identifierSummary', 'legacy', 'createdAt', 'updatedAt']}
            relationships={[
              'One object can have many identifiers through bindings.',
              'One object can have many images.',
              'One object can have many events.'
            ]}
          />

          <CollectionCard
            name="identifiers"
            purpose="Represents observable identifiers or signal sources."
            fields={['identifierKey', 'ownerId', 'objectId', 'kind', 'scheme', 'rawValue', 'canonicalValue', 'status', 'label', 'firstObservedAt', 'lastObservedAt', 'discoveryState', 'createdAt', 'updatedAt']}
            notes="Current kinds: qr, nfc, manual, barcode, bluetooth. Future design may support Wi-Fi APs, BLE beacons, gateway/sensor identifiers, and richer signal-source semantics based on Phase 7D.2 design."
          />

          <CollectionCard
            name="objectIdentifierBindings"
            purpose="Represents the current relationship between an object and an identifier."
            fields={['bindingId', 'ownerId', 'objectId', 'identifierKey', 'status', 'attachedAt', 'attachedBy', 'detachedAt', 'detachedBy', 'createdAt', 'updatedAt']}
            notes="This is currently object-only. Future design may introduce more generic identifierTargetBindings for object/location/container/group/gateway targets."
          />

          <CollectionCard
            name="identifierObservations"
            purpose="Append-oriented evidence/log records for observed identifiers."
            fields={['observationId', 'identifierKey', 'ownerId', 'observerKind', 'observerUid', 'observedAt', 'receivedAt', 'source', 'observationType', 'objectId', 'location', 'metadata', 'visibility', 'schemaVersion', 'createdAt']}
            notes="This is evidence, not canonical object state. Future design may add observationSetId for grouping BLE/Wi-Fi/gateway scan batches."
          />

          <CollectionCard
            name="objectEvents"
            purpose="Object operational history and audit log."
            fields={['eventId', 'ownerId', 'objectId', 'identifierKey', 'type', 'occurredAt', 'actorUid', 'source', 'location', 'metadata']}
          />

          <CollectionCard
            name="objectImages"
            purpose="Image metadata for object photos."
            fields={['imageId', 'ownerId', 'objectId', 'role', 'storagePath', 'downloadUrl', 'contentType', 'sizeBytes', 'width', 'height', 'sortOrder', 'legacy', 'createdAt', 'createdBy']}
          />

          <CollectionCard
            name="users / admins"
            purpose="Basic user profile and admin marker collections."
            notes="Do not expose any actual user data."
          />

        </section>

        {/* Current vs Future */}
        <section className="bg-[var(--surface-container-low)] border border-[var(--outline)] rounded-[32px] p-6 shadow-sm mt-8">
          <h2 className="text-lg font-bold mb-4 text-[var(--on-surface)] flex items-center gap-2">
            Current model and future extension points
          </h2>
          <ul className="space-y-3 text-sm text-[var(--on-surface-variant)] list-disc pl-5 marker:text-[var(--primary)]">
            <li>Current model supports QR/NFC/manual/barcode/bluetooth identifiers.</li>
            <li>Current binding is object-only.</li>
            <li>Current observations are individual records.</li>
            <li>Future design may add observation sets for grouped BLE/Wi-Fi/gateway observations.</li>
            <li>Future design may add generic target bindings.</li>
            <li>Bluetooth/Wi-Fi radio data is privacy-sensitive and should default to private/trusted ingestion.</li>
          </ul>
        </section>

      </main>
    </div>
  );
}

function CollectionCard({ name, purpose, fields, relationships, notes }: { name: string, purpose: string, fields?: string[], relationships?: string[], notes?: string }) {
  return (
    <div className="bg-[var(--surface-container)] rounded-[24px] p-6 border border-[var(--outline)] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <Database size={18} className="text-[var(--primary)]" />
        <h3 className="font-mono text-lg font-bold text-[var(--on-surface)]">{name}</h3>
      </div>

      <p className="text-sm text-[var(--on-surface-variant)] mb-4">{purpose}</p>

      {fields && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-[var(--on-surface)] uppercase tracking-wider mb-2">Key Fields</h4>
          <div className="flex flex-wrap gap-1.5">
            {fields.map(field => (
              <span key={field} className="px-2 py-1 bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] text-[var(--on-surface)] rounded text-xs font-mono">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {relationships && relationships.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-[var(--on-surface)] uppercase tracking-wider mb-2">Relationships</h4>
          <ul className="space-y-1">
            {relationships.map((rel, idx) => (
              <li key={idx} className="text-sm text-[var(--on-surface-variant)] flex items-start gap-2">
                <span className="text-[var(--primary)] mt-1">•</span>
                {rel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && (
        <div className="mt-4 pt-4 border-t border-[var(--outline-variant)]">
          <p className="text-xs text-[var(--on-surface-variant)] italic leading-relaxed">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
