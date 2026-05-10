import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface UserSettings {
  imageFormat: 'webp' | 'jpeg';
  compressionQuality: number;
  maxResolution: number;
}

export const defaultSettings: UserSettings = {
  imageFormat: 'webp',
  compressionQuality: 0.8,
  maxResolution: 1024,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().settings) {
        setSettings({ ...defaultSettings, ...docSnap.data().settings });
      } else {
        setSettings(defaultSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to load user settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    const updated = { ...settings, ...newSettings };
    await updateDoc(userRef, { settings: updated });
    // Optimistic update handled by onSnapshot
  };

  return { settings, updateSettings, loading };
}
