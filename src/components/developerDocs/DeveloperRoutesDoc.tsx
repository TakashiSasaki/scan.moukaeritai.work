import React from 'react';
import { GitMerge, Layout, ShieldAlert, Globe } from 'lucide-react';
import { routeGroups } from '../../lib/routeCatalog';

export default function DeveloperRoutesDoc() {
  return (
    <div className="p-3 md:p-4 lg:p-6 w-full max-w-none mx-0 space-y-8 pb-24">
      <section className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <GitMerge className="text-[var(--primary)]" size={24} />
          Application Routes
        </h2>
        <p className="text-[var(--on-surface-variant)] text-sm leading-relaxed">
          The application follows a client-side routing architecture using React Router.
          Routes are categorized by their access levels: Public, Authenticated, and Admin.
          This page provides a static summary based on the internal route catalog.
        </p>
      </section>

      <div className="space-y-8">
        {routeGroups.map((group) => (
          <section key={group.groupName} className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--on-surface)] flex items-center gap-2 border-b border-[var(--outline)] pb-2">
              {group.groupName === 'Main App' ? <Layout size={20} className="text-blue-500" /> : null}
              {group.groupName === 'Admin & Settings' ? <ShieldAlert size={20} className="text-red-500" /> : null}
              {group.groupName === 'Documentation' ? <Globe size={20} className="text-green-500" /> : null}
              {group.groupName}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {group.routes.map((route) => (
                <div key={route.path} className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-4 flex flex-col md:flex-row gap-4 hover:bg-[var(--surface-container-high)] transition-colors">
                  <div className="md:w-1/3 flex flex-col gap-1">
                    <code className="text-sm font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded-md self-start">
                      {route.path}
                    </code>
                    <span className="text-xs text-[var(--on-surface-variant)] font-medium">
                      {route.component}
                    </span>
                  </div>
                  <div className="md:w-2/3 flex flex-col gap-2">
                    <p className="text-sm text-[var(--on-surface)]">{route.purpose}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        route.access === 'public' ? 'bg-green-500/10 text-green-500' :
                        route.access === 'admin only' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {route.access}
                      </span>
                      {route.navigation !== 'none' && (
                        <span className="bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] px-2 py-1 rounded-full">
                          Nav: {route.navigation}
                        </span>
                      )}
                    </div>
                    {route.notes && (
                      <p className="text-xs text-[var(--on-surface-variant)] italic mt-1 border-l-2 border-[var(--outline)] pl-2">
                        {route.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
