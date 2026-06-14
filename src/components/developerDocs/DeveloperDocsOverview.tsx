import React from 'react';
import { Book, Database, Share2, GitMerge } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeveloperDocsOverview() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Book className="text-[var(--primary)]" size={24} />
          Welcome to Developer Docs
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          This is the public developer documentation area for <strong>scan.moukaeritai.work</strong>.
          It provides a high-level overview of the application's architecture, routing, and data model.
          The application is a React/Vite/Firebase/Firestore application, designed to be an installable PWA.
        </p>
        <div className="bg-[var(--surface-container-high)] p-4 rounded-2xl border border-[var(--outline)] mb-4">
          <p className="text-sm font-medium text-[var(--on-surface)]">
            <strong>Note:</strong> These pages and graphs are static reference views. They do not inspect live production data, connect to the Firestore database, or expose sensitive environment details. For deeper canonical documents, please refer to the repository's <code>docs/</code> directory.
          </p>
        </div>
        <div className="bg-[var(--surface-container-high)] p-4 rounded-2xl border border-[var(--outline)]">
          <p className="text-sm font-medium text-[var(--on-surface)]">
            <strong>Development Workflow:</strong> The project strictly uses <code>pnpm</code> for package management and executing scripts.
            Do not use <code>npm</code> or <code>yarn</code>. Common validation commands include <code>pnpm run lint</code>, <code>pnpm run build</code>, and <code>pnpm run test</code>.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4 text-[var(--on-surface)]">Available Topics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/developer/routes" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <GitMerge size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Route Map</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Overview of public, authenticated, and admin routes.</p>
          </Link>

          <Link to="/developer/data-model" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Data Model</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Textual description of the core database schema and concepts.</p>
          </Link>

          <Link to="/developer/data-model-graph" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Share2 size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Data Model Graph</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Interactive visualization of collections, fields, and relationships.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
