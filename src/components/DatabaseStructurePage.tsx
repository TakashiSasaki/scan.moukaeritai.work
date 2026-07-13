import React from 'react';
import { Database, Table, Key, Info } from 'lucide-react';
import blueprint from '../../firebase-blueprint.json';

export default function DatabaseStructurePage() {
  const collections = Object.entries(blueprint.firestore);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight italic">Database Schema</h1>
        <p className="text-[var(--on-surface-variant)] text-sm font-medium">Live documentation of the Cloud Firestore structure</p>
      </div>

      <div className="grid gap-6">
        {collections.map(([path, config]: [string, any]) => (
          <div key={path} className="bg-[var(--surface-container)] rounded-[32px] p-8 border border-[var(--outline)] space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[var(--primary)] p-3 rounded-2xl text-white">
                    <Table size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold italic">{path}</h3>
                    <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">{config.schema}</p>
                  </div>
                </div>
             </div>

             <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
               {config.description}
             </p>

             <div className="bg-[var(--surface)] border border-[var(--outline)] rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] text-xs font-bold uppercase tracking-widest mb-3">
                  <Key size={14} /> Fields
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                   {Object.keys((blueprint.entities as any)[config.schema]?.properties || {}).map(field => (
                     <div key={field} className="flex items-center justify-between py-1 border-b border-[var(--outline)] last:border-0">
                        <span className="text-sm font-mono text-[var(--on-surface)]">{field}</span>
                        <span className="text-[10px] text-[var(--on-surface-variant)] uppercase font-bold">{(blueprint.entities as any)[config.schema].properties[field].type}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
