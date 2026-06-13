import React from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Book, GitMerge, Database, Share2, ArrowLeft, Boxes, AppWindow } from 'lucide-react';
import DeveloperDocsOverview from './DeveloperDocsOverview';
import DeveloperRoutesDoc from './DeveloperRoutesDoc';
import DeveloperDataModelDoc from './DeveloperDataModelDoc';
import DeveloperAbstractModelDoc from './DeveloperAbstractModelDoc';
import DeveloperFirestoreModelDoc from './DeveloperFirestoreModelDoc';
import DeveloperDataModelGraph from './DeveloperDataModelGraph';
import DeveloperPWADoc from './DeveloperPWADoc';

const navItems = [
  { path: '/developer', label: 'Overview', icon: <Book size={18} />, exact: true },
  { path: '/developer/pwa', label: 'PWA', icon: <AppWindow size={18} /> },
  { path: '/developer/routes', label: 'Routes', icon: <GitMerge size={18} /> },
  { path: '/developer/data-model', label: 'Data Hub', icon: <Database size={18} />, exact: true },
  { path: '/developer/data-model/abstract', label: 'Abstract Model', icon: <Boxes size={18} /> },
  { path: '/developer/data-model/firestore', label: 'Firestore Model', icon: <Database size={18} /> },
  { path: '/developer/data-model-graph', label: 'Data Graph', icon: <Share2 size={18} /> }
];

export default function DeveloperDocsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)] flex flex-col min-h-screen">
      <header className="bg-[var(--surface-container-lowest)]/80 backdrop-blur-md border-b border-[var(--outline)] px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] transition-colors flex items-center"
            title="Back to Landing"
            aria-label="Back to Landing"
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

                {/* Responsive Nav */}
        <div className="w-full md:w-auto mt-2 md:mt-0">
          <div className="md:hidden">
            <select
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
              className="w-full bg-[var(--surface-container)] text-[var(--on-surface)] border border-[var(--outline)] rounded-xl px-4 py-2 text-sm appearance-none"
            >
              {navItems.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <nav className="hidden md:flex flex-wrap items-center gap-2">
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
        </div>
      </header>

      <main className="flex-1 bg-[var(--surface-container-lowest)] relative">
        <Routes>
          <Route path="/" element={<DeveloperDocsOverview />} />
          <Route path="pwa" element={<DeveloperPWADoc />} />
          <Route path="routes" element={<DeveloperRoutesDoc />} />
          <Route path="data-model" element={<DeveloperDataModelDoc />} />
          <Route path="data-model/abstract" element={<DeveloperAbstractModelDoc />} />
          <Route path="data-model/firestore" element={<DeveloperFirestoreModelDoc />} />
          <Route path="data-model-graph" element={<DeveloperDataModelGraph />} />
        </Routes>
      </main>
    </div>
  );
}
