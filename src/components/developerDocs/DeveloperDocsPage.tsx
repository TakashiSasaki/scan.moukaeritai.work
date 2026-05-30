import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Book, GitMerge, Database, Share2, ArrowLeft } from 'lucide-react';
import DeveloperDocsOverview from './DeveloperDocsOverview';
import DeveloperRoutesDoc from './DeveloperRoutesDoc';
import DeveloperDataModelDoc from './DeveloperDataModelDoc';
import DeveloperDataModelGraph from './DeveloperDataModelGraph';

const navItems = [
  { path: '/developer', label: 'Overview', icon: <Book size={18} />, exact: true },
  { path: '/developer/routes', label: 'Routes', icon: <GitMerge size={18} /> },
  { path: '/developer/data-model', label: 'Data Model', icon: <Database size={18} /> },
  { path: '/developer/data-model-graph', label: 'Data Model Graph', icon: <Share2 size={18} /> }
];

export default function DeveloperDocsPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)] flex flex-col h-[calc(100vh-8rem)] mt-4 mx-4 rounded-2xl border border-[var(--outline)] overflow-hidden shadow-sm">
      <header className="bg-[var(--surface-container-lowest)]/80 backdrop-blur-md border-b border-[var(--outline)] px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] transition-colors flex items-center"
            title="Back to Landing"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Book size={24} className="text-[var(--primary)]" />
              Developer Documentation
            </h1>
            <p className="text-xs text-[var(--on-surface-variant)]">Public developer reference</p>
          </div>
        </div>

        {/* Horizontal Nav for Mobile / Secondary Nav */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto bg-[var(--surface-container-lowest)] relative">
        <Routes>
          <Route path="/" element={<DeveloperDocsOverview />} />
          <Route path="routes" element={<DeveloperRoutesDoc />} />
          <Route path="data-model" element={<DeveloperDataModelDoc />} />
          <Route path="data-model-graph" element={<DeveloperDataModelGraph />} />
        </Routes>
      </main>
    </div>
  );
}
