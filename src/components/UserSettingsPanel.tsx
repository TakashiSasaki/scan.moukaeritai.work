import React from 'react';
import { useUserSettings } from '../hooks/useUserSettings';
import { Settings, Save, RefreshCw, X, Palette, Moon, Sun } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme, ThemeColor } from '../context/ThemeContext';

interface UserSettingsPanelProps {
  onClose: () => void;
}

export default function UserSettingsPanel({ onClose }: UserSettingsPanelProps) {
  const { settings, updateSettings, loading } = useUserSettings();
  const { themeColor, setThemeColor, themeMode, setThemeMode } = useTheme();
  
  const themeOptions: { color: ThemeColor, bg: string }[] = [
    { color: 'blue', bg: 'bg-blue-600' },
    { color: 'indigo', bg: 'bg-indigo-600' },
    { color: 'violet', bg: 'bg-violet-600' },
    { color: 'emerald', bg: 'bg-emerald-600' },
    { color: 'rose', bg: 'bg-rose-600' },
    { color: 'amber', bg: 'bg-amber-600' },
    { color: 'slate', bg: 'bg-slate-600' }
  ];
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
    <div className="w-full">
      {/* Sticky Top Navigation & Header */}
      <div className="sticky top-[57px] z-30 bg-[var(--surface-container-high)]/95 backdrop-blur-xl border-b border-[var(--outline)] px-4 sm:px-6 py-4 shadow-sm pb-4">
        <div className="flex flex-col gap-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-[var(--primary)] rounded-xl text-white shadow-sm">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-[var(--on-surface)]">User Settings</h2>
                <p className="text-[var(--on-surface-variant)] text-[10px] sm:text-xs font-medium uppercase tracking-wider">Account & Preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50 text-sm shadow-sm"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="hidden sm:inline">Save</span>
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--outline)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 pb-24 max-w-5xl mx-auto space-y-6">
        <div className="bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)] p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--on-surface-variant)] flex items-center gap-2 mb-4">
              <Palette size={16} /> Appearance
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-3">Theme Color</label>
                <div className="flex flex-wrap gap-4">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.color}
                      onClick={() => setThemeColor(opt.color)}
                      className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center border-4 transition-all scale-100 hover:scale-110 active:scale-95 ${themeColor === opt.color ? 'border-[var(--on-surface)] shadow-lg' : 'border-[var(--surface)] shadow-sm'}`}
                    >
                      {themeColor === opt.color && <div className="w-3 h-3 bg-white rounded-full shadow-sm" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--on-surface-variant)] font-medium mt-3">Select a theme color to personalize your photo.mw experience across all devices.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-3">Color Mode</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-bold transition-all flex-1 justify-center ${
                      themeMode === 'light' 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' 
                        : 'border-[var(--outline)] bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)]'
                    }`}
                  >
                    <Sun size={20} /> Light
                  </button>
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-bold transition-all flex-1 justify-center ${
                      themeMode === 'dark' 
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' 
                        : 'border-[var(--outline)] bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)]'
                    }`}
                  >
                    <Moon size={20} /> Dark
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-container)] rounded-3xl border border-[var(--outline)] p-6 space-y-6 shadow-sm">
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
      </div>
    </div>
  );
}
