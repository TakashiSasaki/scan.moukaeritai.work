import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Settings, X, Save, Palette, Image as ImageIcon, Sliders } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';

export default function UserSettingsPanel({ onClose }: { onClose: () => void }) {
  const { mode, setMode, color, setColor } = useTheme();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    imageFormat: 'webp',
    compressionQuality: 0.8,
    maxResolution: 1024
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().settings) {
        setSettings(userDoc.data().settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        settings: settings
      });
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight italic">Settings</h1>
          <p className="text-[var(--on-surface-variant)] text-sm font-medium">Personalize your experience</p>
        </div>
        <button onClick={onClose} className="bg-[var(--surface-container-highest)] p-2 rounded-xl text-[var(--on-surface-variant)]">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-[var(--surface-container)] rounded-[32px] p-6 border border-[var(--outline)] space-y-6">
          <div className="flex items-center gap-3">
             <Palette className="text-[var(--primary)]" size={24} />
             <h3 className="text-xl font-bold italic">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest block mb-3">Theme Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 rounded-xl text-sm font-bold capitalize transition-all ${mode === m ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--surface)] border border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest block mb-3">Accent Color</label>
              <div className="flex gap-3">
                {(['default', 'blue', 'green', 'amber', 'purple'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full transition-all border-2 ${color === c ? 'border-[var(--on-surface)] scale-110 shadow-lg' : 'border-transparent'}`}
                    style={{ backgroundColor: c === 'default' ? 'var(--primary)' : c }}
                    aria-label={`Select ${c} color`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Image Capture Section */}
        <div className="bg-[var(--surface-container)] rounded-[32px] p-6 border border-[var(--outline)] space-y-6">
          <div className="flex items-center gap-3">
             <ImageIcon className="text-[var(--primary)]" size={24} />
             <h3 className="text-xl font-bold italic">Image Capture</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest block mb-2">Preferred Format</label>
              <select 
                value={settings.imageFormat}
                onChange={(e) => setSettings({...settings, imageFormat: e.target.value})}
                className="w-full bg-[var(--surface)] border border-[var(--outline)] rounded-xl py-3 px-4 text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
              >
                <option value="webp">WebP (Recommended)</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest block mb-2">Max Resolution</label>
              <select 
                value={settings.maxResolution}
                onChange={(e) => setSettings({...settings, maxResolution: Number(e.target.value)})}
                className="w-full bg-[var(--surface)] border border-[var(--outline)] rounded-xl py-3 px-4 text-[var(--on-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
              >
                <option value={512}>512px (Small/Fast)</option>
                <option value={1024}>1024px (Balanced)</option>
                <option value={2048}>2048px (High Detail)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Save size={20} />
              Save All Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
