import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { createObject } from './objectRepository';
import { ArrowLeft, RefreshCw, AlertCircle, Package } from 'lucide-react';

export default function ObjectCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation rules
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const isNameInvalid = trimmedName.length === 0 || name.length > 200;
  const isDescriptionInvalid = description.length > 1024;
  const isFormInvalid = isNameInvalid || isDescriptionInvalid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid || !user) return;

    try {
      setLoading(true);
      setError(null);
      const newObj = await createObject({
        name: trimmedName,
        description: trimmedDescription || undefined,
        ownerId: user.uid,
      });
      navigate(`/object/${newObj.objectId}`);
    } catch (err) {
      console.error('Failed to create object:', err);
      let userFriendlyMsg = 'An unexpected error occurred while saving the Object.';
      if (err instanceof Error) {
        if (err.message.includes('FirestoreErrorInfo') || err.message.startsWith('{')) {
          userFriendlyMsg = 'Failed to save Object record. Please verify your permissions and try again later.';
        } else {
          userFriendlyMsg = err.message;
        }
      }
      setError(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="object-create-page" className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app')}
          className="p-2.5 hover:bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl transition-colors cursor-pointer text-[var(--on-surface)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--on-surface)] flex items-center gap-2">
            <Package size={24} className="text-[var(--primary)]" />
            Create New Object
          </h2>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Register a physical object onto the EFP decentralized record scheme.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-[var(--surface-container)] border border-[var(--outline)] rounded-2xl p-6 shadow-sm">
        {error && (
          <div id="create-error-banner" className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Failed to Save Object</span>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Object Name */}
          <div className="space-y-2">
            <label htmlFor="object-name" className="block text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Object Name <span className="text-red-500">*</span>
            </label>
            <input
              id="object-name"
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Portable Calibration Unit A"
              className="w-full px-4 py-3 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none disabled:opacity-50 transition-all text-[var(--on-surface)]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--on-surface-variant)]">
              <span>Required for catalog lookup</span>
              <span className={name.length > 200 ? 'text-red-500 font-bold' : ''}>
                {name.length}/200
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="object-description" className="block text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Description
            </label>
            <textarea
              id="object-description"
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, physical markings, or storage requirements..."
              rows={4}
              className="w-full px-4 py-3 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-xl text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none disabled:opacity-50 transition-all text-[var(--on-surface)] resize-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--on-surface-variant)]">
              <span>Optional technical notes</span>
              <span className={description.length > 1024 ? 'text-red-500 font-bold' : ''}>
                {description.length}/1024
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--outline)]/40">
            <button
              id="btn-submit-object"
              type="submit"
              disabled={loading || isFormInvalid}
              className="flex-1 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Saving Object Record...
                </>
              ) : (
                'Create Object Record'
              )}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => navigate('/app')}
              className="px-6 py-3 bg-[var(--surface-container-highest)] border border-[var(--outline)] text-[var(--on-surface)] rounded-xl font-bold text-sm hover:bg-[var(--surface-container-high)] disabled:opacity-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
