import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/useAuthStore';
import { getLocalStorageJSON } from '@/utils/storageUtils';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refreshUserData: () => Promise<void>;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  refreshUserData: async () => { },
  isOnline: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check for cached auth immediately to avoid loading state
  const cachedAuthStore = (() => {
    try {
      const parsed = getLocalStorageJSON('auth-store', null);
      if (!parsed) return null;
      return parsed?.state || parsed;
    } catch {
      return null;
    }
  })();

  const [user, setUser] = useState<User | null>(() => {
    // Initialize with cached user if available for instant render
    if (cachedAuthStore?.isAuthenticated && cachedAuthStore?.userId) {
      return {
        id: cachedAuthStore.userId,
        email: '',
        name: cachedAuthStore.user?.fullName || 'User',
        picture: cachedAuthStore.user?.imageUrl || ''
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!cachedAuthStore?.isAuthenticated); // Don't show loading if we have cached auth
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const loadingRef = useRef(false);
  const initialLoadCompletedRef = useRef(false);
  const authStateCheckedRef = useRef(false);
  const tokenRefreshIntervalRef = useRef<number | null>(null);

  // Use ref to track current user to avoid dependency issues
  const userRef = useRef(user);
  const authStateCheckedOnceRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load user data from Firebase - NO dependencies to prevent loops
  const loadUser = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent auth calls unless forced
    if (loadingRef.current && !forceRefresh) return;

    // Only run once unless forced
    if (authStateCheckedOnceRef.current && !forceRefresh) return;

    try {
      loadingRef.current = true;
      // Never show loading state if we already have a user (prevents flickering)
      const currentUser = userRef.current;
      if (!currentUser && !authStateCheckedRef.current && !initialLoadCompletedRef.current) {
        setLoading(true);
      }

      const firebaseUser = auth.currentUser;

      if (firebaseUser) {
        try {
          // Get user's ID token - don't force refresh to avoid network errors
          await getIdToken(firebaseUser);

          // Get additional user data from Firestore with timeout
          const firestorePromise = getDoc(doc(db, "users", firebaseUser.uid));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );

          const userDoc = await Promise.race([firestorePromise, timeoutPromise]) as any;
          const userData = userDoc?.data?.();

          // Only update state if user info has changed or forced refresh
          const currentUser = userRef.current;
          if (forceRefresh || !currentUser || currentUser.id !== firebaseUser.uid) {
            const userObj = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData?.fullName || firebaseUser.displayName || 'User',
              picture: userData?.imageUrl || firebaseUser.photoURL || ''
            };

            setUser(userObj);

            // Update auth store only if user changed
            const authStore = useAuthStore.getState();
            if (!authStore.isAuthenticated || authStore.userId !== firebaseUser.uid) {
              useAuthStore.getState().setAuthStatus(true, firebaseUser.uid);
              useAuthStore.getState().setUserProfile(
                userObj.name,
                userObj.picture
              );
            }
          }
        } catch (firestoreError) {
          console.error("Error fetching user data from Firestore:", firestoreError);

          // Still set basic user data even if Firestore fails
          const currentUser = userRef.current;
          if (!currentUser || currentUser.id !== firebaseUser.uid) {
            const basicUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              picture: firebaseUser.photoURL || ''
            };

            setUser(basicUser);
            useAuthStore.getState().setAuthStatus(true, firebaseUser.uid);
          }
        }
      } else {
        const currentUser = userRef.current;
        // Only reset if we previously had a user AND we've confirmed auth state with Firebase
        if (currentUser !== null && authStateCheckedRef.current) {
          console.log("Logged out detected, clearing user");
          setUser(null);
          // Reset auth store
          useAuthStore.getState().reset();
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setError(err instanceof Error ? err : new Error('Failed to load user'));

      // CRITICAL FIX: Don't log out if we have a firebase user but just failed to load data
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        console.warn("Retaining session despite load error");
        // Ensure we have at least basic user data
        if (!userRef.current) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            picture: firebaseUser.photoURL || ''
          });
        }
      } else {
        // Only clear user if we truly have no firebase user
        setUser(null);
        // Reset auth store
        useAuthStore.getState().reset();
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
      authStateCheckedRef.current = true;
      initialLoadCompletedRef.current = true;
      authStateCheckedOnceRef.current = true; // Mark as checked
    }
  }, []); // EMPTY dependencies - prevents recreation and loops

  // Set up periodic token refresh (every 55 minutes - token expires after 60)
  useEffect(() => {
    // Clear any existing interval
    if (tokenRefreshIntervalRef.current) {
      window.clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }

    // Set up token refresh if user is authenticated
    if (user && auth.currentUser) {
      // Refresh token every 55 minutes (Firebase tokens expire after 60 min)
      tokenRefreshIntervalRef.current = window.setInterval(() => {
        loadUser(true);
      }, 55 * 60 * 1000);
    }

    return () => {
      if (tokenRefreshIntervalRef.current) {
        window.clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [user]); // Only depend on user, not loadUser

  // Set up auth state listener
  useEffect(() => {
    // Network status listeners
    const updateOnline = () => setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Initial load call - REMOVED to prevent race condition. 
    // onAuthStateChanged will trigger loadUser when ready.
    // loadUser(); 

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we have a user, ensure our local state matches
      if (firebaseUser) {
        await loadUser();
      } else {
        // Explicitly clear state on logout detection
        setUser(null);
        useAuthStore.getState().reset();
        setLoading(false);
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      unsubscribe();
    };
  }, [loadUser]);



  // Public method to manually refresh user data
  const refreshUserData = async () => {
    await loadUser(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated: !!user,
      refreshUserData,
      isOnline
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 