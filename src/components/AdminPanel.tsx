import React, { useState, useEffect } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../lib/firebase';
import { Users, Database, Server, Activity, ShieldAlert, CloudCog, HardDrive, Cpu, Loader2, LayoutDashboard, Search, AlertCircle } from 'lucide-react';
import { runObservationDiagnostics, ObservationDiagnosticsResult } from '../lib/observationDiagnostics';

interface ServerMetrics {
  storageTotalMB: string;
  storageFileCount: number;
  firestoreReadsEstimated: string | number;
  geminiInvocations: string | number;
}

export default function AdminPanel({ onClose }: { onClose?: () => void }) {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<ObservationDiagnosticsResult | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    if (!auth.currentUser) return;
    setDiagnosticsRunning(true);
    setDiagnosticsError(null);
    setDiagnosticsResult(null);
    try {
      // Conservative default limits to avoid performance/read spikes
      const result = await runObservationDiagnostics(db, auth.currentUser.uid, {
        maxObservations: 50,
        maxIdentifiers: 50,
        maxObjects: 50,
        maxBindings: 50,
        maxSamplesPerIssue: 5
      });
      setDiagnosticsResult(result);
    } catch (err: any) {
      setDiagnosticsError(err.message || 'Failed to run diagnostics');
    } finally {
      setDiagnosticsRunning(false);
    }
  };



  useEffect(() => {
    async function fetchStats() {
      try {
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        setUserCount(usersSnapshot.data().count);

        const itemsSnapshot = await getCountFromServer(collection(db, 'items'));
        setItemCount(itemsSnapshot.data().count);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const functions = getFunctions();
        const getAppMetricsFn = httpsCallable(functions, 'getAppMetrics');
        const result = await getAppMetricsFn();
        const data = result.data as any;
        if (data.success && data.metrics) {
          setServerMetrics(data.metrics);
        }
      } catch (error: any) {
        console.error('Failed to fetch server metrics', error);
        setMetricsError(error?.message || 'Failed to authenticate to Google Cloud');
      } finally {
        setMetricsLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="w-full">
      {/* Sticky Top Navigation & Header */}
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-amber-500 rounded-xl text-white shadow-sm">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Admin Control Panel</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">System Settings & Metrics</p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                🚪 Exit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto space-y-6">
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Metrics from Firestore Counters */}
              <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] mb-4 font-bold">
                  <Users size={18} />
                  <h3>Active Users</h3>
                </div>
                <div className="text-5xl font-black text-[var(--primary)] mb-2">
                  {loading ? <span className="opacity-50">...</span> : userCount ?? '-'}
                </div>
                <p className="text-xs text-[var(--on-surface-variant)] font-medium">Unique authenticated users.</p>
              </div>

              <div className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm">
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] mb-4 font-bold">
                  <Database size={18} />
                  <h3>Total Tagged Items</h3>
                </div>
                <div className="text-5xl font-black text-[var(--primary)] mb-2">
                  {loading ? <span className="opacity-50">...</span> : itemCount ?? '-'}
                </div>
                <p className="text-xs text-[var(--on-surface-variant)] font-medium">Documents in 'items' collection.</p>
              </div>
            </div>

            <div className="bg-[var(--surface-container-high)] rounded-3xl p-6 lg:p-8">
              <h3 className="text-lg font-bold text-[var(--on-surface)] mb-4 flex items-center gap-2">
                <Activity size={20} className="text-rose-500" />
                Infrastructure Metrics (Live)
              </h3>
              <p className="text-sm text-[var(--on-surface-variant)] mb-6">
                These metrics are securely fetched from the backend using Firebase Cloud Functions, 
                calculating exact byte usage for Google Cloud Storage and providing an overview of resource consumption.
              </p>

              {metricsError ? (
                <div className="p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
                  Could not load metrics: {metricsError}
                </div>
              ) : metricsLoading ? (
                <div className="flex items-center gap-2 text-[var(--on-surface-variant)] p-4">
                  <Loader2 size={16} className="animate-spin" /> Fetching real-time statistics...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-xs">
                      <Server size={14} /> Total Images Stored
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.storageFileCount || 0}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Files in Storage Bucket</p>
                  </div>
                  
                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-xs">
                      <HardDrive size={14} /> Storage Size (Images)
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.storageTotalMB || '0.00'} MB
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1">Total physical byte size</p>
                  </div>

                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold text-xs">
                      <Activity size={14} /> Firestore Reads
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.firestoreReadsEstimated ?? 'N/A'}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1 leading-tight">
                      プロジェクト全体 (過去30日間)<br/>
                      <span className="text-amber-600/80">※他アプリと共有時は合算されます</span>
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-2xl">
                    <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-xs">
                      <Cpu size={14} /> Gemini Invocations
                    </div>
                    <div className="text-2xl font-black text-[var(--on-surface)]">
                      {serverMetrics?.geminiInvocations ?? 'N/A'}
                    </div>
                    <p className="text-[10px] text-[var(--on-surface-variant)] mt-1 leading-tight">
                      プロジェクト全体 (過去30日間)<br/>
                      <span className="text-purple-600/80">※他アプリと共有時は合算されます</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Observation Diagnostics Section */}
            <div className="bg-[var(--surface-container-high)] rounded-3xl p-6 lg:p-8 border border-[var(--outline)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--on-surface)] flex items-center gap-2">
                  <Search size={20} className="text-indigo-500" />
                  観測モデル診断 (Observation Diagnostics)
                </h3>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={diagnosticsRunning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  {diagnosticsRunning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  診断を実行 (Run)
                </button>
              </div>
              <p className="text-sm text-[var(--on-surface-variant)] mb-6">
                Read-only, bounded diagnostics for the current authenticated user’s owner-scoped records. This is not a full global database audit. Some referenced documents may be reported as inaccessible rather than missing if Firestore rules prevent reads.
                <br />
                <span className="block mt-2 text-[13px] text-[var(--on-surface-variant)]">
                  「現在のログインユーザーに紐づく範囲を対象とした、読み取り専用・件数制限付きの診断です。データベース全体の完全監査ではありません。Firestore ルールにより参照先を読めない場合は、欠落ではなくアクセス不能として報告されることがあります。」
                </span>
                <br />
                <span className="font-bold text-amber-600">Note:</span> This is a bounded/sampled scan (initially fetching max 50 top-level records per collection by default). Additional reads are performed for referenced documents, which will increase total read quota usage.
              </p>

              {diagnosticsError && (
                <div className="p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium mb-4">
                  {diagnosticsError}
                </div>
              )}

              {diagnosticsResult && (
                <div className="space-y-6">
                  {/* Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-[var(--surface)] border border-[var(--outline)] rounded-xl text-center">
                      <div className="text-xs text-[var(--on-surface-variant)] font-bold mb-1">Observations Checked</div>
                      <div className="text-xl font-black text-[var(--on-surface)]">{diagnosticsResult.counts.observationsChecked}</div>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--outline)] rounded-xl text-center">
                      <div className="text-xs text-[var(--on-surface-variant)] font-bold mb-1">Identifiers Checked</div>
                      <div className="text-xl font-black text-[var(--on-surface)]">{diagnosticsResult.counts.identifiersChecked}</div>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--outline)] rounded-xl text-center">
                      <div className="text-xs text-[var(--on-surface-variant)] font-bold mb-1">Bindings Checked</div>
                      <div className="text-xl font-black text-[var(--on-surface)]">{diagnosticsResult.counts.bindingsChecked}</div>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--outline)] rounded-xl text-center">
                      <div className="text-xs text-[var(--on-surface-variant)] font-bold mb-1">Objects Checked</div>
                      <div className="text-xl font-black text-[var(--on-surface)]">{diagnosticsResult.counts.objectsChecked}</div>
                    </div>
                  </div>

                  {/* Issues */}
                  <div>
                    <h4 className="text-md font-bold text-[var(--on-surface)] mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className={diagnosticsResult.issues.length > 0 ? "text-amber-500" : "text-emerald-500"} />
                      Issues Found: {diagnosticsResult.issues.length}
                    </h4>
                    {diagnosticsResult.issues.length === 0 ? (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
                        No issues detected in the sampled records.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {diagnosticsResult.issues.map((issue) => (
                          <div key={issue.type} className="p-4 bg-[var(--surface)] border border-[var(--outline)] rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 px-2 py-1 text-[10px] uppercase font-bold rounded-md ${issue.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {issue.severity}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-[var(--on-surface)]">{issue.type}</div>
                                <div className="text-xs text-[var(--on-surface-variant)] mt-1">{issue.description}</div>
                                <div className="mt-3 space-y-2">
                                  {issue.samples.map((sample, sIdx) => (
                                    <pre key={sIdx} className="text-[10px] bg-[var(--surface-container-highest)] p-2 rounded-lg overflow-x-auto text-[var(--on-surface)]">
                                      {JSON.stringify(sample, null, 2)}
                                    </pre>
                                  ))}
                                  {issue.samples.length >= diagnosticsResult.limits.maxSamplesPerIssue && (
                                    <div className="text-[10px] text-[var(--on-surface-variant)] italic">
                                      ...and possibly more (limited to {diagnosticsResult.limits.maxSamplesPerIssue} samples).
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  );
}
