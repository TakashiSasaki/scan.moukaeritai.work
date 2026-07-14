import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Book, ChevronLeft, ChevronRight, FileText, Code, Database, Shield, Package } from 'lucide-react';
import DeveloperDocsOverview from './DeveloperDocsOverview';

export default function DeveloperDocsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const sections = [
    { id: 'overview', label: 'Overview', icon: <Book size={18} />, path: '/dev' },
    { id: 'routing', label: 'Routing', icon: <FileText size={18} />, path: '/dev/routing' },
    { id: 'data-model', label: 'Data Model', icon: <Database size={18} />, path: '/dev/data-model' },
    { id: 'security', label: 'Security', icon: <Shield size={18} />, path: '/dev/security' },
  ];

  const currentSection = sections.find(s => s.path === location.pathname) || sections[0];

  return (
    <div className="min-h-screen bg-[var(--surface-container-high)] flex flex-col">
       <header className="sticky top-0 z-40 bg-[var(--surface-container)]/80 backdrop-blur-md border-b border-[var(--outline)] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500 p-2 rounded-xl text-white">
                <Package size={24} />
             </div>
             <div>
                <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                  <Package size={20} className="inline md:hidden text-white" />
                  Developer Docs
                </h1>
                <p className="text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">System Documentation • App Icon Included</p>
             </div>
          </div>
          <button 
            onClick={() => navigate('/app')}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] rounded-xl font-bold text-sm cursor-pointer hover:bg-[var(--surface-container-highest)] transition-colors"
          >
            🚪 Exit
          </button>
       </header>

       <div className="flex-1 flex overflow-hidden">
          <aside className="w-64 border-r border-[var(--outline)] bg-[var(--surface-container)] hidden lg:block overflow-y-auto">
             <div className="p-4 space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigate(section.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === section.path ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)]'}`}
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
             </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-6 lg:p-12">
             <div className="max-w-3xl mx-auto">
                <AnimatePresence mode="wait">
                   <Routes location={location}>
                      <Route path="/" element={<DeveloperDocsOverview />} />
                      <Route path="/routing" element={<div className="p-12 text-center opacity-50 italic">Routing documentation coming soon...</div>} />
                      <Route path="/data-model" element={<div className="p-12 text-center opacity-50 italic">Data model documentation coming soon...</div>} />
                      <Route path="/security" element={<div className="p-12 text-center opacity-50 italic">Security documentation coming soon...</div>} />
                   </Routes>
                </AnimatePresence>
             </div>
          </main>
       </div>
    </div>
  );
}
