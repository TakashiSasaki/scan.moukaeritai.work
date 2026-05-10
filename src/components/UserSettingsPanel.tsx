import React from 'react';
import { useUserSettings } from '../hooks/useUserSettings';
import { Settings, Save, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserSettingsPanelProps {
  onClose: () => void;
}

export default function UserSettingsPanel({ onClose }: UserSettingsPanelProps) {
  const { settings, updateSettings, loading } = useUserSettings();
  const [localSettings, setLocalSettings] = React.useState(settings);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast.success('Settings saved successfully');
      onClose(); // Close after saving
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    localSettings.imageFormat !== settings.imageFormat ||
    localSettings.compressionQuality !== settings.compressionQuality ||
    localSettings.maxResolution !== settings.maxResolution;

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="animate-spin text-[var(--on-surface-variant)]" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-container)] rounded-[24px] border border-[var(--outline)] overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[var(--outline)] bg-[var(--surface)]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[var(--primary)]" />
          <h2 className="text-lg font-bold text-[var(--on-surface)]">User Settings</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-[var(--surface-container-highest)] rounded-full transition-colors"
        >
          <X size={20} className="text-[var(--on-surface-variant)]" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--on-surface-variant)] mb-4">Image Capture</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface)] mb-1">Image Format</label>
              <select 
                value={localSettings.imageFormat}
                onChange={(e) => setLocalSettings({...localSettings, imageFormat: e.target.value as 'webp' | 'jpeg'})}
                className="w-full bg-[var(--surface-container-high)] text-[var(--on-surface)] px-4 py-3 rounded-xl border border-[var(--outline)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
              >
                <option value="webp">WebP (Recommended, better compression)</option>
                <option value="jpeg">JPEG (Maximum compatibility)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--on-surface)] mb-1">Compression Quality</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.1"
                  value={localSettings.compressionQuality}
                  onChange={(e) => setLocalSettings({...localSettings, compressionQuality: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm font-bold text-[var(--on-surface-variant)] w-12 text-right">
                  {Math.round(localSettings.compressionQuality * 100)}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--on-surface)] mb-1">Max Resolution</label>
              <select 
                value={localSettings.maxResolution}
                onChange={(e) => setLocalSettings({...localSettings, maxResolution: parseInt(e.target.value)})}
                className="w-full bg-[var(--surface-container-high)] text-[var(--on-surface)] px-4 py-3 rounded-xl border border-[var(--outline)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
              >
                <option value={512}>512px (Fastest upload, lowest storage)</option>
                <option value={1024}>1024px (Balanced)</option>
                <option value={2048}>2048px (High detail, larger file size)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--outline)] bg-[var(--surface)]/50 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex items-center gap-2 bg-[var(--surface-container-high)] text-[var(--on-surface)] px-6 py-2.5 rounded-xl font-bold transition-all hover:bg-[var(--surface-container-highest)] active:scale-95 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2.5 rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
