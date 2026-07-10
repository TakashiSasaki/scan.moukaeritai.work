import React from 'react';
import { Book, Database, Share2, GitMerge, Github, ExternalLink, Cloud, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeveloperDocsOverview() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="text-[var(--primary)]" size={24} />
          Welcome to Developer Docs
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          This is the public developer documentation area for <strong>scan.mw</strong>.
          It provides a high-level overview of the application's architecture, routing, and data model.
          The application is a React/Vite/Firebase/Firestore application, designed to be an installable PWA.
        </p>
        <div className="bg-[var(--surface-container-high)] p-4 rounded-2xl border border-[var(--outline)]">
          <p className="text-sm font-medium text-[var(--on-surface)]">
            <strong>Note:</strong> These pages and graphs are static reference views. They do not inspect live production data, connect to the Firestore database, or expose sensitive environment details. For deeper canonical documents, please refer to the repository's <code>docs/</code> directory.
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

      <section>
        <h3 className="text-lg font-bold mb-4 text-[var(--on-surface)]">Interactive Demos & Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/demo" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Hardware API Demos</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Test benches for device APIs like Bluetooth, Geolocation, NFC, etc. (Requires Login)</p>
          </Link>
          
          <Link to="/library-demo" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <Share2 size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Library & AI Demos</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">Demonstrations of browser-based capabilities using heavy libraries like TFJS. (Requires Login)</p>
          </Link>

          <Link to="/test" className="bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl p-6 transition-colors flex flex-col items-center text-center gap-3 group">
            <div className="p-3 bg-[var(--surface-container-highest)] rounded-full text-[var(--primary)] group-hover:scale-110 transition-transform">
              <GitMerge size={24} />
            </div>
            <h4 className="font-bold text-[var(--on-surface)]">Experimental Sandbox</h4>
            <p className="text-xs text-[var(--on-surface-variant)]">UI/UX tests and feature development playground. (Requires Login)</p>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4 text-[var(--on-surface)]">External Links & Resources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://jules.google.com/repo/github/TakashiSasaki/scan.moukaeritai.work/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-4 bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl transition-colors group justify-center"
          >
            <ExternalLink size={20} className="text-[var(--primary)] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-[var(--on-surface)]">Jules</span>
          </a>
          
          <a
            href="https://github.com/TakashiSasaki/scan.moukaeritai.work"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-4 bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl transition-colors group justify-center"
          >
            <Github size={20} className="text-[var(--primary)] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-[var(--on-surface)]">GitHub</span>
          </a>

          <a
            href="https://chatgpt.com/codex/cloud/settings/environment/6a1250d687a081919a9514acbfad12a5"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-4 bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl transition-colors group justify-center"
          >
            <Cloud size={20} className="text-[var(--primary)] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm text-[var(--on-surface)]">Codex Cloud</span>
          </a>
        </div>
      </section>

      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h3 className="text-lg font-bold mb-4 text-[var(--on-surface)]">Development Workflow</h3>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed mb-4">
          The project uses <code>npm</code> for package management and script execution. Do not use <code>pnpm</code> or <code>yarn</code>, as the CI workflows and lockfiles depend on <code>npm</code>.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-sm text-[var(--on-surface)]">Standard Validation Commands</h4>
            <ul className="list-disc list-inside text-xs text-[var(--on-surface-variant)] space-y-1 mt-2">
              <li><code>npm ci</code> - Install root dependencies deterministically (preferred over <code>npm install</code> unless updating lockfile).</li>
              <li><code>npm run lint</code> - Run TypeScript type checking and linting.</li>
              <li><code>npm run test</code> - Run unit tests via Vitest.</li>
              <li><code>npm run test:rules</code> - Run Firestore rules emulator tests (requires Java).</li>
              <li><code>npm run build</code> - Build the Vite application for production (includes PWA icon generation).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[var(--on-surface)]">Functions Validation Commands</h4>
            <ul className="list-disc list-inside text-xs text-[var(--on-surface-variant)] space-y-1 mt-2">
              <li><code>npm run test:functions-boundary</code> - Validate that functions do not illegally import from the root or packages.</li>
              <li><code>npm run prepare:functions-efp-model</code> - Prepare the local <code>@scan/efp-model</code> dependency inside functions.</li>
              <li><code>cd functions && npm ci</code> - Install functions dependencies using deterministic install (preferred over <code>npm install</code>).</li>
              <li><code>npm run test:functions-efp-model</code> - Validate that the functions model dependency works.</li>
              <li><code>cd functions && npm run build</code> - Build Firebase Functions.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[var(--on-surface)] mt-4">Operational Validation Commands</h4>
            <ul className="list-disc list-inside text-xs text-[var(--on-surface-variant)] space-y-1 mt-2">
              <li><code>npm run ops:validate-efp-drift-audit</code> - Validates the EFP structural drift documentation.</li>
              <li><code>npm run ops:validate-scanner-observation-dual-write-readiness</code> - Validates planning artifacts for the target implementation.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
