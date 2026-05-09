/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, signInWithPopup, googleProvider, onAuthStateChanged, User, signOut } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ThemeProvider, useTheme, ThemeColor, ThemeMode } from './context/ThemeContext';
import { Moon, Sun, Palette, Settings, LogIn, LogOut, Package, Search, PlusCircle, Scan, BarChart3, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import SearchScreen from './components/SearchScreen';
import CaptureForm from './components/CaptureForm';
import Scanner from './components/Scanner';
import Overview from './components/Overview';
import AdminPanel from './components/AdminPanel';
import { ConnectionStatus } from './components/ConnectionStatus';

type Screen = 'dashboard' | 'search' | 'capture' | 'scanner' | 'overview' | 'admin';

export default function App() {
  return (
    <ThemeProvider>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            borderRadius: '16px', 
            background: 'var(--surface-container-high)', 
            color: 'var(--on-surface)',
            border: '1px solid var(--outline)',
            fontWeight: 'bold',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
          } 
        }} 
      />
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { themeColor, setThemeColor, themeMode, setThemeMode } = useTheme();

  const themeOptions: { color: ThemeColor, bg: string }[] = [
    { color: 'blue', bg: 'bg-blue-600' },
    { color: 'indigo', bg: 'bg-indigo-600' },
    { color: 'violet', bg: 'bg-violet-600' },
    { color: 'emerald', bg: 'bg-emerald-600' },
    { color: 'rose', bg: 'bg-rose-600' },
    { color: 'amber', bg: 'bg-amber-600' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: u.uid,
              displayName: u.displayName || '',
              email: u.email || '',
              photoURL: u.photoURL || '',
              role: 'user'
            });
          }
          
          const adminDoc = await getDoc(doc(db, 'admins', u.uid));
          setIsAdmin(adminDoc.exists());
        } catch (error) {
          console.error("Failed to sync user or check admin status", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen('dashboard');
  };

  const handleDetected = (id: string) => {
    setSelectedItemId(id);
    setCurrentScreen('capture');
  };

  const handleCancelScanner = () => {
    setCurrentScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--surface)] text-[var(--on-surface-variant)]">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 p-6 text-white text-center selection:bg-[var(--primary)]/30">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12 max-w-sm w-full"
        >
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-[var(--primary)] rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-neutral-800 p-8 rounded-[40px] border border-neutral-700 shadow-2xl">
                <Package className="w-24 h-24 text-[var(--primary)] mx-auto" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter italic whitespace-nowrap">photo.moukaeritai.work</h1>
              <p className="text-neutral-400 font-medium">
                Smart Asset Tracking with<br />
                <span className="text-white">QR, NFC, and Gemini AI.</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="group relative flex items-center justify-center gap-3 bg-white text-neutral-900 px-8 py-5 rounded-[24px] font-bold shadow-xl hover:bg-neutral-100 transition-all w-full active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <LogIn size={22} />
              Continue with Google
            </button>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Enterprise Ready • Secure Cloud Sync</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-container-high)] flex justify-center selection:bg-[var(--primary)]/30">
      <div className="app-container flex flex-col w-full transition-colors duration-300">
        <div className="h-1 bg-[var(--primary)]/20 w-1/3 mx-auto mt-2 rounded-full mb-1 sm:block hidden"></div>
        <header className="sticky top-0 z-40 bg-[var(--surface-container)]/80 backdrop-blur-md border-b border-[var(--outline)] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
          <div className="bg-[var(--primary)] p-1.5 rounded-lg text-[var(--primary-foreground)] transition-all">
            <Package size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">photo.mw</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] rounded-full transition-colors"
            title="Toggle Dark Mode"
          >
            {themeMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] rounded-full transition-colors"
            title="Theme Settings"
          >
            <Palette size={20} />
          </button>
          
          <ConnectionStatus />

          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center outline-none ring-[var(--primary)] focus-visible:ring-2 rounded-full"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-[var(--outline)] shadow-sm transition-transform hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center border border-[var(--outline)] transition-transform hover:scale-105">
                  <span className="text-xs font-bold text-[var(--on-surface-variant)]">{user.displayName?.[0] || 'U'}</span>
                </div>
              )}
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-56 bg-[var(--surface-container-high)] backdrop-blur-xl border border-[var(--outline)] shadow-2xl rounded-2xl overflow-hidden z-50 origin-top-right"
                >
                  <div className="p-4 border-b border-[var(--outline)] bg-[var(--surface)]/50">
                    <div className="font-bold text-sm text-[var(--on-surface)] truncate">{user.displayName || 'User'}</div>
                    {isAdmin && (
                      <div className="flex gap-2 mt-1">
                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 inline-block px-2 py-0.5 rounded-full">Admin</div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    {isAdmin && (
                      <button
                         onClick={() => {
                           setShowProfile(false);
                           setCurrentScreen('admin');
                         }}
                         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                      >
                         <ShieldAlert size={16} className="text-amber-500" /> Admin Panel
                      </button>
                    )}
                     <button
                        onClick={() => {
                          setShowProfile(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                     >
                        <LogOut size={16} /> Log Out
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

  <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[var(--surface-container)] border-b border-[var(--outline)] overflow-hidden"
          >
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--on-surface-variant)] flex items-center gap-2">
                  <Palette size={14} /> Appearance
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.color}
                    onClick={() => setThemeColor(opt.color)}
                    className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center border-4 transition-all scale-100 hover:scale-110 active:scale-95 ${themeColor === opt.color ? 'border-[var(--on-surface)] shadow-lg' : 'border-[var(--surface)] shadow-sm'}`}
                  >
                    {themeColor === opt.color && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--on-surface-variant)] font-medium">Select a theme color to personalize your photo.mw experience across all devices.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        <AnimatePresence mode="wait">
          {currentScreen === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Dashboard onSelectItem={(id) => { setSelectedItemId(id); setCurrentScreen('capture'); }} />
            </motion.div>
          )}
          {currentScreen === 'search' && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <SearchScreen onSelectItem={(id) => { setSelectedItemId(id); setCurrentScreen('capture'); }} />
            </motion.div>
          )}
          {currentScreen === 'capture' && (
            <motion.div key="capture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <CaptureForm 
                itemId={selectedItemId} 
                onClose={() => { setSelectedItemId(null); setCurrentScreen('dashboard'); }} 
              />
            </motion.div>
          )}
          {currentScreen === 'scanner' && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Scanner 
                onDetected={handleDetected} 
                onCancel={handleCancelScanner}
              />
            </motion.div>
          )}
          {currentScreen === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Overview />
            </motion.div>
          )}
          {currentScreen === 'admin' && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="sticky bottom-0 w-full bg-[var(--surface-container)]/90 backdrop-blur-lg border-t border-[var(--outline)] px-6 py-2 pb-safe flex justify-around items-center z-50">
        <NavButton active={currentScreen === 'dashboard'} onClick={() => setCurrentScreen('dashboard')} icon={<Package size={24} />} label="Home" />
        <NavButton active={currentScreen === 'search'} onClick={() => setCurrentScreen('search')} icon={<Search size={24} />} label="Search" />
        <div className="relative -top-6">
          <button 
            onClick={() => setCurrentScreen('scanner')}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] p-4 rounded-[22px] shadow-xl shadow-[var(--primary)]/20 hover:scale-105 transition-all active:scale-95"
          >
            <Scan size={28} />
          </button>
        </div>
        <NavButton active={currentScreen === 'overview'} onClick={() => setCurrentScreen('overview')} icon={<BarChart3 size={24} />} label="Stats" />
        <NavButton active={currentScreen === 'capture' && !selectedItemId} onClick={() => { setSelectedItemId(null); setCurrentScreen('capture'); }} icon={<PlusCircle size={24} />} label="New" />
      </nav>
    </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-[var(--primary)] scale-110' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}
    >
      <div className={`p-2 rounded-[18px] transition-all duration-300 ${active ? 'bg-[var(--primary)]/15' : 'hover:bg-[var(--surface-container-high)]'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40 font-medium'}`}>{label}</span>
    </button>
  );
}

