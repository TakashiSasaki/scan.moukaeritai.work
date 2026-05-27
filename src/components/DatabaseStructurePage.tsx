import React from 'react';
import { Database, ArrowLeft, ExternalLink, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DatabaseStructurePage() {
  const navigate = useNavigate();
  const GITHUB_DOCS_URL = 'https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/database-structure.md';

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
            Database Structure
          </h1>
          <p className="text-xs text-[var(--on-surface-variant)]">Schema documentation pointer</p>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center bg-[var(--surface-container-lowest)] overflow-y-auto">

        <div className="bg-[var(--surface-container)] rounded-[32px] p-8 max-w-lg w-full text-center border border-[var(--outline)] shadow-sm">
          <BookOpen size={48} className="text-[var(--primary)] mx-auto mb-6" />

          <h2 className="text-xl font-bold text-[var(--on-surface)] mb-4">Canonical Documentation Moved</h2>

          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-6">
            The canonical database structure documentation is now maintained centrally in the repository under <code className="bg-[var(--surface-container-highest)] px-1.5 py-0.5 rounded font-mono text-xs">docs/app/database-structure.md</code>.
          </p>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-8">
            This prevents documentation duplication and ensures you always see the most up-to-date schema details.
          </p>

          <div className="space-y-3 flex flex-col items-center">
            <a
              href={GITHUB_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-full hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              <ExternalLink size={18} />
              Database Structure
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
              href="https://github.com/TakashiSasaki/scan.moukaeritai.work/blob/scan.moukaeritai.work/docs/app/bluetooth-global-identity-data-model.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold rounded-full hover:bg-[var(--surface-container-highest)] transition-colors w-full sm:w-auto text-sm"
            >
              <ExternalLink size={18} />
              Bluetooth Identity Model
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
