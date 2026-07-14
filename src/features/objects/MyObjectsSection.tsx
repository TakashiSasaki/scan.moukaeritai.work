import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { listMyObjects } from './objectRepository';
import { ObjectRecord } from './objectTypes';
import { Plus, Package, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';

export default function MyObjectsSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [objects, setObjects] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchObjects() {
      try {
        setLoading(true);
        setError(null);
        const data = await listMyObjects(user!.uid);
        setObjects(data);
      } catch (err) {
        console.error('Failed to load my objects:', err);
        setError('Failed to retrieve your Objects. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchObjects();
  }, [user]);

  if (loading) {
    return (
      <div id="my-objects-loading" className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 min-h-[200px]">
        <RefreshCw className="animate-spin text-[var(--primary)]" size={32} />
        <p className="text-sm text-[var(--on-surface-variant)]">Retrieving your Objects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="my-objects-error" className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 text-center min-h-[200px]">
        <AlertTriangle className="text-red-500" size={32} />
        <h4 className="font-bold text-base text-[var(--on-surface)]">Error Loading Objects</h4>
        <p className="text-sm text-[var(--on-surface-variant)] max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl text-xs font-bold hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div id="my-objects-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="text-[var(--primary)]" size={20} />
          <h3 className="font-black text-xl tracking-tight text-[var(--on-surface)]">My Objects</h3>
        </div>
        <button
          id="btn-create-object"
          onClick={() => navigate('/object/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-xs hover:opacity-90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          Create Object
        </button>
      </div>

      {objects.length === 0 ? (
        <div id="my-objects-empty" className="bg-[var(--surface-container)] border border-[var(--outline)] border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
          <div className="p-4 bg-[var(--surface-container-high)] rounded-full text-[var(--on-surface-variant)]">
            <Package size={28} />
          </div>
          <h4 className="font-bold text-base text-[var(--on-surface)]">No Objects Found</h4>
          <p className="text-sm text-[var(--on-surface-variant)] max-w-md">
            You haven't created any Objects yet. Get started by creating your first tracked Object record.
          </p>
          <button
            onClick={() => navigate('/object/new')}
            className="px-4 py-2.5 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl text-xs font-bold hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
          >
            Create Your First Object
          </button>
        </div>
      ) : (
        <div id="my-objects-list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {objects.map((obj) => (
            <div
              key={obj.objectId}
              id={`object-card-${obj.objectId}`}
              onClick={() => navigate(`/object/${obj.objectId}`)}
              className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-5 hover:border-[var(--primary)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-base text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                    {obj.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {obj.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--on-surface-variant)] line-clamp-2 min-h-[2rem]">
                  {obj.description || 'No description provided.'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--outline)]/40 text-[10px] font-mono text-[var(--on-surface-variant)]">
                <span className="truncate max-w-[150px]">ID: {obj.objectId}</span>
                <ChevronRight size={12} className="text-[var(--on-surface-variant)] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
