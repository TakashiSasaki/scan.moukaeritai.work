/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { auth, db, signInWithPopup, googleProvider, onAuthStateChanged, User, signOut } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ThemeProvider, useTheme, ThemeColor, ThemeMode } from './context/ThemeContext';
import { Settings, LogIn, LogOut, Package, Search, PlusCircle, Scan, BarChart3, X, ShieldAlert, Beaker, PlaySquare, Route as RouteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import SearchScreen from './components/SearchScreen';
import CaptureForm from './components/CaptureForm';
import LibraryDemoScreen from './components/LibraryDemoScreen';
import Scanner from './components/Scanner';
import Overview from './components/Overview';
import AdminPanel from './components/AdminPanel';
import SitemapPage from './components/SitemapPage';
import UserSettingsPanel from './components/UserSettingsPanel';
import TestScreen from './components/TestScreen';
import DemoScreen from './components/DemoScreen';
import { AppStatusDialog } from './components/AppStatusDialog';
import { ImageMetadataDialog } from './components/ImageMetadataDialog';

type Screen = 'dashboard' | 'search' | 'capture' | 'scanner' | 'overview';

import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { sanitizeItemId, extractItemId } from './lib/utils';

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
      <ImageMetadataDialog />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppStatus, setShowAppStatus] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showProfile]);

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
    window.location.href = '/';
  };

  const handleDetected = (id: string) => {
    navigate(`/item/${extractItemId(id)}`);
  };

  const handleCancelScanner = () => {
    navigate('/');
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
              <h1 className="text-4xl font-black tracking-tighter italic whitespace-nowrap">scout.moukaeritai.work</h1>
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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowAppStatus(true)}>
          <div className="bg-[var(--primary)] p-1.5 rounded-lg text-[var(--primary-foreground)] transition-all">
            <Package size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">photo.mw</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={profileMenuRef}>
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
                <>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-56 bg-[var(--surface-container-high)] backdrop-blur-xl border border-[var(--outline)] shadow-2xl rounded-2xl overflow-hidden z-[51] origin-top-right"
                  >
                  <div className="p-4 border-b border-[var(--outline)] bg-[var(--surface)]/50 flex justify-between items-start">
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm text-[var(--on-surface)] truncate">{user.displayName || 'User'}</div>
                      {isAdmin && (
                        <div className="flex gap-2 mt-1">
                          <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 inline-block px-2 py-0.5 rounded-full">Admin</div>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowProfile(false)}
                      className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] p-1.5 -mr-1.5 -mt-1.5 rounded-full transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                             setShowProfile(false);
                             navigate('/admin');
                           }}
                           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                        >
                           <ShieldAlert size={16} className="text-amber-500" /> Admin Panel
                        </button>
                        <button
                          onClick={() => {
                             setShowProfile(false);
                             navigate('/admin/sitemap');
                           }}
                           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                        >
                           <RouteIcon size={16} className="text-amber-500" /> Route Map
                        </button>
                      </>
                    )}
                     <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate('/demo');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                     >
                        <PlaySquare size={16} className="text-blue-500" /> Browser API Demo
                     </button>
                     <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate('/library-demo');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                     >
                        <PlaySquare size={16} className="text-purple-500" /> Library API Demo
                     </button>
                     <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate('/test');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                     >
                        <Beaker size={16} className="text-purple-500" /> Beta Tests
                     </button>
                     <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors mb-1"
                     >
                        <Settings size={16} className="text-[var(--primary)]" /> Settings
                     </button>
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
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/admin" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            {isAdmin ? (
               <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <AdminPanel onClose={() => navigate('/')} />
               </motion.div>
            ) : (
               <div className="p-12 mt-4 text-center bg-[var(--surface)] border border-red-500/20 rounded-2xl mx-4">
                 <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                 <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
                 <p className="text-[var(--on-surface-variant)]">You do not have permission to view this page.</p>
               </div>
            )}
          </main>
        } />
        <Route path="/admin/sitemap" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            {isAdmin ? (
               <motion.div key="admin-sitemap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <SitemapPage onClose={() => navigate('/')} />
               </motion.div>
            ) : (
               <div className="p-12 mt-4 text-center bg-[var(--surface)] border border-red-500/20 rounded-2xl mx-4">
                 <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                 <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
                 <p className="text-[var(--on-surface-variant)]">You do not have permission to view this page.</p>
               </div>
            )}
          </main>
        } />
        <Route path="/settings" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <UserSettingsPanel onClose={() => navigate('/')} />
            </motion.div>
          </main>
        } />
        <Route path="/test" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            <motion.div key="test" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TestScreen />
            </motion.div>
          </main>
        } />
        <Route path="/demo" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            <motion.div key="demo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <DemoScreen />
            </motion.div>
          </main>
        } />
        <Route path="/library-demo" element={
          <main className="flex-1 max-w-4xl mx-auto w-full">
            <motion.div key="library-demo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <LibraryDemoScreen />
            </motion.div>
          </main>
        } />
        <Route path="*" element={
          <MainLayout
            onDetected={handleDetected}
            onCancelScanner={handleCancelScanner}
            showAppStatus={showAppStatus}
            setShowAppStatus={setShowAppStatus}
          />
        } />
      </Routes>
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


function ItemCaptureRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <CaptureForm
      itemId={id ? sanitizeItemId(id) : null}
      onClose={() => { navigate('/'); }}
    />
  );
}

function MainLayout({ onDetected, onCancelScanner, showAppStatus, setShowAppStatus }: any) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  return (
    <>
      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        <AnimatePresence mode="wait">
          {/* @ts-ignore */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Dashboard onSelectItem={(id) => { navigate(`/item/${encodeURIComponent(id)}`); }} />
              </motion.div>
            } />
            <Route path="/search" element={
              <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SearchScreen onSelectItem={(id) => { navigate(`/item/${encodeURIComponent(id)}`); }} />
              </motion.div>
            } />
            <Route path="/item/new" element={
              <motion.div key="capture-new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ItemCaptureRoute />
              </motion.div>
            } />
            <Route path="/item/:id" element={
              <motion.div key="capture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ItemCaptureRoute />
              </motion.div>
            } />
            <Route path="/scanner" element={
              <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Scanner
                  onDetected={onDetected}
                  onCancel={onCancelScanner}
                />
              </motion.div>
            } />
            <Route path="/overview" element={
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Overview />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      <nav className="sticky bottom-0 w-full bg-[var(--surface-container)]/90 backdrop-blur-lg border-t border-[var(--outline)] px-6 py-2 pb-safe flex justify-around items-center z-50">
        <NavButton active={currentPath === '/'} onClick={() => navigate('/')} icon={<Package size={24} />} label="Home" />
        <NavButton active={currentPath === '/search'} onClick={() => navigate('/search')} icon={<Search size={24} />} label="Search" />
        <div className="relative -top-6">
          <button
            onClick={() => navigate('/scanner')}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] p-4 rounded-[22px] shadow-xl shadow-[var(--primary)]/20 hover:scale-105 transition-all active:scale-95"
          >
            <Scan size={28} />
          </button>
        </div>
        <NavButton active={currentPath === '/overview'} onClick={() => navigate('/overview')} icon={<BarChart3 size={24} />} label="Stats" />
        <NavButton active={currentPath === '/item/new'} onClick={() => navigate('/item/new')} icon={<PlusCircle size={24} />} label="New" />
      </nav>

      <AppStatusDialog
        isOpen={showAppStatus}
        onClose={() => setShowAppStatus(false)}
      />
    </>
  );
}
