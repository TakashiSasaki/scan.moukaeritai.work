import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authorizationLoading: boolean;
  authorizationError: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  const [authorizationError, setAuthorizationError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setAuthorizationLoading(true);
        setAuthorizationError(null);
        try {
          const adminDocRef = doc(db, 'admins', currentUser.uid);
          const adminDoc = await getDoc(adminDocRef);
          setIsAdmin(adminDoc.exists());
        } catch (err: any) {
          console.error("Failed to check admin status (fail closed):", err);
          setIsAdmin(false);
          setAuthorizationError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setAuthorizationLoading(false);
        }
      } else {
        setIsAdmin(false);
        setAuthorizationLoading(false);
        setAuthorizationError(null);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    authLoading,
    isAuthenticated: !!user,
    isAdmin,
    authorizationLoading: authLoading || authorizationLoading,
    authorizationError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
