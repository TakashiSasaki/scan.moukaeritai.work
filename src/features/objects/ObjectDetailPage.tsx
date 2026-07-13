import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getObject } from './objectRepository';
import { ObjectRecord } from './objectTypes';
import { ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert, Package, Calendar } from 'lucide-react';

type DetailState = 'loading' | 'found' | 'not_found' | 'permission_denied' | 'error';

export default function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [obj, setObj] = useState<ObjectRecord | null>(null);
  const [state, setState] = useState<DetailState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!id) {
      setState('not_found');
      return;
    }

    async function fetchObject() {
      try {
        setState('loading');
        setErrorMessage('');
        const data = await getObject(id!);
        if (data) {
          setObj(data);
          setState('found');
        } else {
          setState('not_found');
        }
      } catch (err: any) {
        console.error('Failed to fetch object detail:', err);
        // Firebase permission-denied error pattern
        const isPermissionDenied = 
          err?.code === 'permission-denied' || 
          err?.message?.includes('permission-denied') ||
          err?.message?.includes('Missing or insufficient permissions');

        if (isPermissionDenied) {
          setState('permission_denied');
        } else {
          setState('error');
          setErrorMessage(err instanceof Error ? err.message : String(err));
        }
      }
    }

    fetchObject();
  }, [id]);

  const formatTimestamp = (ts: any) => {
    if (!ts) return null;
    try {
      if (typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleString();
      }
      if (ts.seconds) {
        return new Date(ts.seconds * 1000).toLocaleString();
      }
      if (typeof ts === 'string' || typeof ts === 'number') {
        return new Date(ts).toLocaleString();
      }
    } catch (e) {
      console.error('Failed to parse date:', e);
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'archived':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'lost':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'disposed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  // Back button UI
  const headerActions = (
    <div className="flex items-center gap-4">
      <button
        onClick={() => navigate('/app')}
        className="p-2.5 hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl transition-colors cursor-pointer text-[var(--on-surface)]"
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={18} />
      </button>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--on-surface)]">Object Detail</h2>
        <p className="text-xs text-[var(--on-surface-variant)]">View native tracking metadata for registered object.</p>
      </div>
    </div>
  );

  if (state === 'loading') {
    return (
      <div id="object-detail-loading" className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        {headerActions}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <RefreshCw className="animate-spin text-[var(--primary)]" size={36} />
          <p className="text-sm text-[var(--on-surface-variant)] font-medium">Retrieving Object Record...</p>
        </div>
      </div>
    );
  }

  if (state === 'permission_denied') {
    return (
      <div id="object-detail-permission-denied" className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        {headerActions}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
          <div className="p-4 bg-red-500/10 rounded-full text-red-500">
            <ShieldAlert size={36} />
          </div>
          <h3 className="text-lg font-bold text-[var(--on-surface)]">Access Restriction</h3>
          <p className="text-sm text-[var(--on-surface-variant)] max-w-md">
            This Object is not available.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div id="object-detail-not-found" className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        {headerActions}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
          <div className="p-4 bg-[var(--surface-container-high)] rounded-full text-[var(--on-surface-variant)]">
            <Package size={36} />
          </div>
          <h3 className="text-lg font-bold text-[var(--on-surface)]">Object Not Found</h3>
          <p className="text-sm text-[var(--on-surface-variant)] max-w-md">
            The requested Object record could not be found or has been removed from the registry.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div id="object-detail-error" className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        {headerActions}
        <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
          <div className="p-4 bg-red-500/10 rounded-full text-red-500">
            <AlertTriangle size={36} />
          </div>
          <h3 className="text-lg font-bold text-[var(--on-surface)]">Unexpected Query Error</h3>
          <p className="text-sm text-[var(--on-surface-variant)] max-w-md">
            An error occurred while loading this record: {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl text-xs font-bold hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Found state
  const createdAtFormatted = obj?._meta ? formatTimestamp(obj._meta.recordCreatedAt) : null;
  const updatedAtFormatted = obj?._meta ? formatTimestamp(obj._meta.recordUpdatedAt) : null;

  return (
    <div id="object-detail-found" className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {headerActions}

      {/* Main Info Card */}
      <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        {/* Title and Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--outline)]/40">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--on-surface)]">
              {obj?.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-[var(--on-surface-variant)] font-mono">
              <span className="bg-[var(--surface-container-high)] px-2 py-0.5 rounded-md">ID</span>
              <span className="truncate">{obj?.objectId}</span>
            </div>
          </div>
          <div className="shrink-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(obj?.status || 'active')}`}>
              {obj?.status}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
            Description
          </h3>
          <p className="text-sm text-[var(--on-surface)] leading-relaxed whitespace-pre-line bg-[var(--surface-container-high)] p-4 rounded-xl border border-[var(--outline)]/30">
            {obj?.description || 'No description provided for this Object.'}
          </p>
        </div>

        {/* Metadata Details */}
        {obj?._meta && (
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-[var(--outline)]/40">
            {createdAtFormatted && (
              <div className="bg-[var(--surface-container-high)] p-3.5 rounded-xl border border-[var(--outline)]/30 flex items-center gap-3">
                <Calendar className="text-[var(--primary)] shrink-0" size={18} />
                <div>
                  <span className="block text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Registered At</span>
                  <span className="text-xs font-semibold text-[var(--on-surface)]">{createdAtFormatted}</span>
                </div>
              </div>
            )}
            {updatedAtFormatted && (
              <div className="bg-[var(--surface-container-high)] p-3.5 rounded-xl border border-[var(--outline)]/30 flex items-center gap-3">
                <Calendar className="text-[var(--primary)] shrink-0" size={18} />
                <div>
                  <span className="block text-[10px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Last Sync Time</span>
                  <span className="text-xs font-semibold text-[var(--on-surface)]">{updatedAtFormatted}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
