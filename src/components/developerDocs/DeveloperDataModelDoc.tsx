import React from 'react';
import { Database, Share2, Boxes, Route as RouteIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeveloperDataModelDoc() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="text-[var(--primary)]" size={24} />
          Data Model Hub
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          The application uses a normalized Firestore data model focused on physical object tracking,
          immutable operational history, and deterministic identifier resolution. The data model is
          currently undergoing a phased non-destructive migration towards an Entity / Fact / Projection architecture.
        </p>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/developer/data-model/abstract" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Boxes size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Abstract Model</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Conceptual model covering Entity / Fact / Projection: Objects, Markers, Places, Associations, Observations, Measurements, Events, and Summaries.</p>
          </Link>

          <Link to="/developer/data-model/firestore" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Firestore Implementation</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Current runtime collections and target migration collections.</p>
          </Link>

          <Link to="/developer/data-model-graph" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Share2 size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Data Model Graph</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Visual representation of current and target collections, fields, and migration boundaries.</p>
          </Link>
        </div>
      </section>

      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] mt-8">
        <h3 className="text-lg font-bold mb-4 text-[var(--on-surface)]">Migration & Future Concepts</h3>
        <p className="text-[var(--on-surface-variant)] text-sm mb-4">
          The system is continuously evolving from its initial design (the "legacy `items` model") to a robust, distributed scanning framework. Key ongoing transitions include:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-[var(--on-surface-variant)]">
          <li><strong>Marker migration:</strong> Transitioning identifiers to globally addressable Markers. The earlier ownerless/global identifier work is now treated as part of the broader Marker identity model. The current runtime still uses identifiers, but the long-term conceptual term is Marker.</li>
          <li><strong>Association migration:</strong> Capturing connection state in explicit Association records instead of mutating the main object.</li>
          <li><strong>Observation / Measurement facts:</strong> Normalizing how user sightings, background scans, and telemetry enter the system securely as immutable Facts.</li>
          <li><strong>Projection summaries:</strong> Utilizing derived, easily queryable read models (like ObjectSummary or MarkerSummary) built from underlying Facts and Entities.</li>
        </ul>
      </section>
    </div>
  );
}
