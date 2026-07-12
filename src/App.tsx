import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { 
  Settings, 
  LogOut, 
  Package, 
  Search, 
  PlusCircle, 
  Scan, 
  BarChart3, 
  X, 
  ShieldAlert, 
  Beaker, 
  PlaySquare, 
  Route as RouteIcon, 
  Database, 
  Info, 
  Lock, 
  Menu, 
  BookOpen,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';

// Component imports
import Dashboard from './components/Dashboard';
import SearchScreen from './components/SearchScreen';
import Overview from './components/Overview';
import UnassignedIdentifierScreen from './components/UnassignedIdentifierScreen';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import DeveloperDocsPage from './components/developerDocs/DeveloperDocsPage';
import CaptureForm from './components/CaptureForm';
import SitemapPage from './components/SitemapPage';
import AppAboutPage from './components/AppAboutPage';
import DemoScreen from './components/DemoScreen';
import LibraryDemoScreen from './components/LibraryDemoScreen';
import TestScreen from './components/TestScreen';

// Declarations for Vite-injected global variables
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

// Helper hook for click outside pattern
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Wrapper for checking parameterized object routes
function CaptureFormWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return <CaptureForm objectId={id || null} onClose={() => navigate('/app')} />;
}

// Public Landing & Login page
function LandingPage() {
  const [utcTime, setUtcTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      toast.success(`Welcome, ${result.user.displayName || 'User'}!`);
      // Rule 3: If developer logs in, immediately move to developer docs.
      if (result.user.email === 'takashi316@gmail.com') {
        navigate('/developer');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.4';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#3b82f6]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#10b981]/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div id="main-card" className="w-full max-w-lg bg-[#1e293b]/60 backdrop-blur-xl border border-[#334155]/60 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* App Logo */}
        <div id="logo-badge" className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#10b981] p-[2px] mb-8 shadow-lg shadow-[#3b82f6]/20">
          <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center font-mono text-2xl font-bold tracking-tighter text-[#3b82f6]">
            sw
          </div>
        </div>

        {/* Title */}
        <h1 id="app-title" className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#cbd5e1] to-[#94a3b8] bg-clip-text text-transparent mb-3">
          scan.mw
        </h1>

        {/* Subtitle / Baseline description */}
        <p id="app-baseline" className="text-[#94a3b8] text-base md:text-lg font-medium mb-8">
          Contract-first EFP rebuild baseline
        </p>

        {/* Login Button or Dashboard shortcut */}
        <div className="w-full mb-8">
          {auth.currentUser ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/app')}
                className="w-full py-4 bg-gradient-to-r from-[#3b82f6] to-[#10b981] text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#3b82f6]/15"
              >
                Go to App
              </button>
              <button
                onClick={() => {
                  signOut(auth);
                  toast.success("Signed out");
                }}
                className="text-xs text-[#94a3b8] hover:text-white underline"
              >
                Sign out of {auth.currentUser.email}
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#3b82f6] to-[#10b981] text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#3b82f6]/15 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#334155] to-transparent mb-8" />

        {/* Metadata Details Grid */}
        <div id="meta-grid" className="w-full grid grid-cols-1 gap-4 text-left font-mono text-xs text-[#94a3b8] mb-4">
          <div className="bg-[#0f172a]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">APPLICATION VERSION:</span>
              <span className="text-[#3b82f6] font-semibold">{version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">BUILD TIME:</span>
              <span className="text-white">{buildTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">DATA MODEL SPEC:</span>
              <span className="text-[#10b981]">EFP v2.0.0</span>
            </div>
          </div>

          <div className="bg-[#0f172a]/40 border border-[#334155]/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">CURRENT TIME (UTC):</span>
              <span className="text-white font-medium">{utcTime || 'Loading...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Small aesthetic footer */}
      <div className="mt-8 text-center text-xs text-[#475569] font-mono z-10">
        scan.mw &bull; secure &bull; distributed &bull; timeless
      </div>
    </div>
  );
}

// Authenticated Application Shell
function AppShell() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'search' | 'overview' | 'unassigned' | 'about'>('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Click outside implementation for Profile Menu
  useClickOutside(profileMenuRef, () => {
    setShowProfileMenu(false);
  });

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } catch (err) {
        console.error("Error checking admin status:", err);
      }
    };
    checkAdmin();
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Render active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard onSelectItem={(id) => navigate(`/object/${id}`)} />;
      case 'search':
        return <SearchScreen onSelectItem={(id) => navigate(`/object/${id}`)} />;
      case 'overview':
        return <Overview />;
      case 'unassigned':
        return <UnassignedIdentifierScreen />;
      case 'about':
        return <AppAboutPage />;
      default:
        return <Dashboard onSelectItem={(id) => navigate(`/object/${id}`)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-container-low)] text-[var(--on-surface)] flex flex-col font-sans transition-colors duration-300">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[var(--surface-container)]/90 backdrop-blur-xl border-b border-[var(--outline)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#10b981] p-[1.5px]">
            <div className="w-full h-full bg-[var(--surface-container)] rounded-[10px] flex items-center justify-center font-mono text-base font-bold tracking-tighter text-[var(--primary)]">
              sw
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter">scan.mw</h1>
            <p className="text-[9px] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Cloud Inventory Platform</p>
          </div>
        </div>

        {/* User profile dropdown container */}
        <div className="relative" ref={profileMenuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 bg-[var(--surface-container-highest)] border border-[var(--outline)] rounded-full hover:bg-[var(--surface-container-high)] transition-all cursor-pointer"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-bold px-1 hidden md:inline-block max-w-[120px] truncate">{user.displayName || user.email}</span>
            <ChevronDown size={14} className="text-[var(--on-surface-variant)] mr-1 hidden md:inline-block" />
          </button>

          {/* Profile Menu Dropdown with Click Outside closure */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-60 bg-[var(--surface-container-high)] border border-[var(--outline)] rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1"
              >
                <div className="px-4 py-3 border-b border-[var(--outline)] mb-1">
                  <div className="font-bold text-sm truncate">{user.displayName || 'Anonymous User'}</div>
                  <div className="text-[10px] font-mono text-[var(--on-surface-variant)] truncate">{user.email}</div>
                </div>

                <button 
                  onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] rounded-xl transition-all"
                >
                  <Settings size={16} /> User Settings
                </button>

                {isAdmin && (
                  <button 
                    onClick={() => { setShowProfileMenu(false); navigate('/admin'); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-[var(--primary)] hover:bg-[var(--surface-container-highest)] rounded-xl transition-all"
                  >
                    <ShieldAlert size={16} /> Admin Panel
                  </button>
                )}

                <button 
                  onClick={() => { setShowProfileMenu(false); navigate('/developer'); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-emerald-500 hover:bg-[var(--surface-container-highest)] rounded-xl transition-all"
                >
                  <BookOpen size={16} /> Developer Docs
                </button>

                <button 
                  onClick={() => { setShowProfileMenu(false); navigate('/admin/sitemap'); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] rounded-xl transition-all"
                >
                  <RouteIcon size={16} /> Sitemap / Routes
                </button>

                <div className="border-t border-[var(--outline)] my-1 pt-1">
                  <button 
                    onClick={() => { setShowProfileMenu(false); signOut(auth); toast.success("Signed out"); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl w-full mx-auto pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Bottom Navigation optimized for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--surface-container)]/95 backdrop-blur-xl border-t border-[var(--outline)] px-4 py-2 md:py-3 flex justify-around items-center max-w-md mx-auto rounded-t-3xl shadow-2xl">
        <button 
          onClick={() => setActiveScreen('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${activeScreen === 'dashboard' ? 'text-[var(--primary)] font-black' : 'text-[var(--on-surface-variant)]'}`}
        >
          <Package size={20} className={activeScreen === 'dashboard' ? 'scale-110' : ''} />
          <span className="text-[10px] tracking-tight font-medium">Items</span>
        </button>

        <button 
          onClick={() => setActiveScreen('search')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${activeScreen === 'search' ? 'text-[var(--primary)] font-black' : 'text-[var(--on-surface-variant)]'}`}
        >
          <Search size={20} className={activeScreen === 'search' ? 'scale-110' : ''} />
          <span className="text-[10px] tracking-tight font-medium">Search</span>
        </button>

        {/* Dynamic add floating button shortcut */}
        <button 
          onClick={() => navigate('/object/new')}
          className="w-12 h-12 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/25 -translate-y-4 hover:scale-110 transition-transform cursor-pointer"
        >
          <PlusCircle size={24} />
        </button>

        <button 
          onClick={() => setActiveScreen('overview')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${activeScreen === 'overview' ? 'text-[var(--primary)] font-black' : 'text-[var(--on-surface-variant)]'}`}
        >
          <BarChart3 size={20} className={activeScreen === 'overview' ? 'scale-110' : ''} />
          <span className="text-[10px] tracking-tight font-medium">Stats</span>
        </button>

        <button 
          onClick={() => setActiveScreen('unassigned')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${activeScreen === 'unassigned' ? 'text-[var(--primary)] font-black' : 'text-[var(--on-surface-variant)]'}`}
        >
          <ShieldAlert size={20} className={activeScreen === 'unassigned' ? 'scale-110' : ''} />
          <span className="text-[10px] tracking-tight font-medium">Tags</span>
        </button>
      </nav>
    </div>
  );
}

// Protected Route Guard Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App Routing Orchestrator Component
function AppRoutes() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
      
      {/* Dedicated Sub-pages */}
      <Route path="/admin" element={<ProtectedRoute><AdminPanel onClose={() => window.location.href = '/app'} /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><UserSettingsPanel onClose={() => window.location.href = '/app'} /></ProtectedRoute>} />
      <Route path="/developer/*" element={<ProtectedRoute><DeveloperDocsPage /></ProtectedRoute>} />
      
      {/* Object management */}
      <Route path="/object/new" element={<ProtectedRoute><CaptureFormWrapper /></ProtectedRoute>} />
      <Route path="/object/:id" element={<ProtectedRoute><CaptureFormWrapper /></ProtectedRoute>} />
      
      {/* Redirects */}
      <Route path="/item/:id" element={<ProtectedRoute><Navigate to="/object/:id" replace /></ProtectedRoute>} />
      
      {/* Demos and beta tools */}
      <Route path="/demo" element={<ProtectedRoute><DemoScreen /></ProtectedRoute>} />
      <Route path="/library-demo" element={<ProtectedRoute><LibraryDemoScreen /></ProtectedRoute>} />
      <Route path="/test" element={<ProtectedRoute><TestScreen /></ProtectedRoute>} />
      <Route path="/admin/sitemap" element={<ProtectedRoute><SitemapPage onClose={() => window.location.href = '/app'} /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-center" />
      </BrowserRouter>
    </ThemeProvider>
  );
}
