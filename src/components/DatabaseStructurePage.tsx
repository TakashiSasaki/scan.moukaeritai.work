import React from 'react';
import { Database, ArrowLeft, ExternalLink, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DatabaseStructurePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)] flex flex-col h-[calc(100vh-8rem)] mt-4 mx-4 rounded-2xl border border-[var(--outline)] overflow-hidden shadow-sm">
      <header className="bg-[var(--surface-container-lowest)]/80 backdrop-blur-md border-b border-[var(--outline)] px-4 py-4 flex items-center gap-3">
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
            Database Structure & Architecture
          </h1>
          <p className="text-xs text-[var(--on-surface-variant)]">Documentation pointers</p>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center bg-[var(--surface-container-lowest)] overflow-y-auto">

        <div className="bg-[var(--surface-container)] rounded-[32px] p-8 max-w-lg w-full text-center border border-[var(--outline)] shadow-sm">
          <BookOpen size={48} className="text-[var(--primary)] mx-auto mb-6" />

          <h2 className="text-xl font-bold text-[var(--on-surface)] mb-4">Architecture Documentation</h2>

          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-6">
            The canonical data model and architectural documentation is maintained centrally in the repository under <code className="bg-[var(--surface-container-highest)] px-1.5 py-0.5 rounded font-mono text-xs">docs/</code>. These links are documentation pointers and do not provide a live database browser. No live data is fetched or displayed here.
          </p>

          <div className="space-y-3 flex flex-col items-center">
            <a
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/database-structure.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-full hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              <ExternalLink size={18} />
              Database Structure
            </a>

            <a
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/architecture/entity-fact-projection-data-model.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold rounded-full hover:bg-[var(--surface-container-highest)] transition-colors w-full sm:w-auto text-sm"
            >
              <ExternalLink size={18} />
              Entity / Fact / Projection Model
            </a>

            <a
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/migrations/entity-fact-projection-runtime-migration-plan.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold rounded-full hover:bg-[var(--surface-container-highest)] transition-colors w-full sm:w-auto text-sm"
            >
              <ExternalLink size={18} />
              Runtime Migration Plan
            </a>

            <a
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/database-design-decision-matrix.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold rounded-full hover:bg-[var(--surface-container-highest)] transition-colors w-full sm:w-auto text-sm"
            >
              <ExternalLink size={18} />
              Design Decision Matrix
            </a>

            <a
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/ownerless-global-identifier-model.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold rounded-full hover:bg-[var(--surface-container-highest)] transition-colors w-full sm:w-auto text-sm"
            >
              <ExternalLink size={18} />
              Legacy Ownerless Identifier Model
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
