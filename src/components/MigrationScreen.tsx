import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ShieldAlert, Play, CheckCircle, Database, Server, RefreshCw, X } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function MigrationScreen({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [hasDryRun, setHasDryRun] = useState(false);

  const handleMigrate = async (dryRun: boolean) => {
    if (!dryRun && !hasDryRun) {
      toast.error('Please run a Dry Run first to verify the impact.');
      return;
    }

    if (!dryRun) {
      if (!confirm('Are you sure you want to execute the migration? This will create new records in the database.')) {
        return;
      }
    }

    setLoading(true);
    setStats(null);
    try {
      const functions = getFunctions();
      const migrateFn = httpsCallable(functions, 'migrateInventoryModel');
      const result = await migrateFn({ dryRun, limit: 1000 });
      const data = result.data as any;

      if (data.success) {
        setStats(data.stats);
        if (dryRun) {
          setHasDryRun(true);
          toast.success('Dry run completed successfully.');
        } else {
          toast.success('Migration executed successfully.');
        }
      } else {
        toast.error('Migration failed. Check console.');
      }
    } catch (error: any) {
      console.error('Migration Error:', error);
      toast.error(error.message || 'Migration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-red-500 rounded-xl text-white shadow-sm">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">Database Migration</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">Migrate legacy "items" to normalized model</p>
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
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl p-4 text-sm font-medium">
          <ShieldAlert className="inline mr-2 mb-1" size={16} />
          <strong>Warning:</strong> This process will migrate existing records from the <code className="bg-amber-500/10 px-1 rounded">items</code> collection to the new normalized collections (<code className="bg-amber-500/10 px-1 rounded">objects</code>, <code className="bg-amber-500/10 px-1 rounded">identifiers</code>, etc.). Legacy data is not deleted. Please run a Dry Run first.
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleMigrate(true)}
            disabled={loading}
            className="flex-1 bg-[var(--surface-container-highest)] hover:bg-[var(--surface-variant)] text-[var(--on-surface)] font-bold py-4 rounded-2xl shadow-sm border border-[var(--outline)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
            Dry Run Migration
          </button>
          <button
            onClick={() => handleMigrate(false)}
            disabled={loading || !hasDryRun}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
            Execute Migration
          </button>
        </div>

        {stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--surface-container)] rounded-3xl p-6 border border-[var(--outline)] shadow-sm space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--on-surface)] border-b border-[var(--outline)] pb-2">
              <CheckCircle className="text-emerald-500" /> Migration Results
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)]">
                <div className="text-sm font-bold text-[var(--on-surface-variant)] mb-1">Legacy Items Processed</div>
                <div className="text-3xl font-black text-[var(--primary)]">{stats.processed}</div>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)]">
                <div className="text-sm font-bold text-[var(--on-surface-variant)] mb-1">Skipped (Already Migrated)</div>
                <div className="text-3xl font-black text-[var(--on-surface)]">{stats.skipped}</div>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)]">
                <div className="text-sm font-bold text-[var(--on-surface-variant)] mb-1">Errors</div>
                <div className="text-3xl font-black text-red-500">{stats.errors}</div>
              </div>
            </div>

            <h4 className="font-bold text-sm text-[var(--on-surface-variant)] uppercase tracking-widest mt-6">Records Created {hasDryRun && !stats.objectsCreated ? '(Planned)' : ''}</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--on-surface-variant)]">Objects</span>
                <span className="text-2xl font-black text-blue-500">{stats.objectsCreated}</span>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--on-surface-variant)]">Identifiers</span>
                <span className="text-2xl font-black text-emerald-500">{stats.identifiersCreated}</span>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--on-surface-variant)]">Bindings</span>
                <span className="text-2xl font-black text-cyan-500">{stats.bindingsCreated || 0}</span>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--on-surface-variant)]">Images</span>
                <span className="text-2xl font-black text-amber-500">{stats.imagesCreated}</span>
              </div>
              <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--outline)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--on-surface-variant)]">Events</span>
                <span className="text-2xl font-black text-purple-500">{stats.eventsCreated}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
