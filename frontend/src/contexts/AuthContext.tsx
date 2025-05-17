import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/useAuthStore';

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
  isAdmin: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isAdmin: false,
  refreshUserData: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const initialLoadCompletedRef = useRef(false);
  const authStateCheckedRef = useRef(false);
  const tokenRefreshIntervalRef = useRef<number | null>(null);

  // Load user data from Firebase
  const loadUser = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent auth calls unless forced
    if (loadingRef.current && !forceRefresh) return;
    
    try {
      loadingRef.current = true;
      if (!authStateCheckedRef.current) setLoading(true);
      
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        try {
          // Get user's ID token for subsequent API requests
          const idToken = await getIdToken(firebaseUser, true);
          if (idToken) {
            console.log('Auth token refreshed successfully');
          }
          
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const userData = userDoc.data();
          
          // Only update state if user info has changed or forced refresh
          if (forceRefresh || !user || user.id !== firebaseUser.uid) {
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
            
            // Log success but not on every update
            if (!user || user.id !== firebaseUser.uid) {
              console.log("User authenticated:", userObj.name);
            }
          }
        } catch (firestoreError) {
          console.error("Error fetching user data from Firestore:", firestoreError);
          
          // Still set basic user data even if Firestore fails
          if (!user || user.id !== firebaseUser.uid) {
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
        if (user !== null) {
          setUser(null);
          // Reset auth store
          useAuthStore.getState().reset();
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setError(err instanceof Error ? err : new Error('Failed to load user'));
      
      // Only clear user if an actual error happened (not just no current user)
      setUser(null);
      // Reset auth store
      useAuthStore.getState().reset();
    } finally {
      setLoading(false);
      loadingRef.current = false;
      authStateCheckedRef.current = true;
      initialLoadCompletedRef.current = true;
    }
  }, [user]);

  // Set up periodic token refresh (every 55 minutes - token expires after 60)
  useEffect(() => {
    const setupTokenRefresh = () => {
      // Clear any existing interval
      if (tokenRefreshIntervalRef.current) {
        window.clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
      
      // Set up token refresh if user is authenticated
      if (user && auth.currentUser) {
        // Refresh token every 55 minutes (Firebase tokens expire after 60 min)
        tokenRefreshIntervalRef.current = window.setInterval(() => {
          console.log("Refreshing auth token...");
          loadUser(true);
        }, 55 * 60 * 1000);
      }
    };
    
    setupTokenRefresh();
    
    return () => {
      if (tokenRefreshIntervalRef.current) {
        window.clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [user, loadUser]);

  // Set up auth state listener
  useEffect(() => {
    // If cached user exists in auth store, use it immediately
    const authStore = useAuthStore.getState();
    if (authStore.isAuthenticated && authStore.userId && !user) {
      const cachedUser: User = {
        id: authStore.userId,
        email: '',
        name: authStore.user?.fullName || 'User',
        picture: authStore.user?.imageUrl || ''
      };
      
      setUser(cachedUser);
      console.log("Using cached user from auth store while waiting for Firebase");
    }

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Don't set loading to true if initial load is completed
      if (!initialLoadCompletedRef.current) setLoading(true);
      
      if (firebaseUser) {
        // User is signed in
        console.log("Firebase auth state changed: User is signed in");
        loadUser();
      } else {
        // User is signed out
        console.log("Firebase auth state changed: User is signed out");
        setUser(null);
        setLoading(false);
        // Reset auth store
        useAuthStore.getState().reset();
      }
      
      authStateCheckedRef.current = true;
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [loadUser, user]);

  // Force refresh if login state inconsistency detected
  useEffect(() => {
    // Check for potential login state inconsistency:
    // If auth store says user is authenticated but AuthContext doesn't have user data
    const checkInterval = setInterval(() => {
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated && authStore.userId && !user && initialLoadCompletedRef.current) {
        console.log('Auth inconsistency detected - forcing refresh');
        loadUser(true);
      } else if (!authStore.isAuthenticated && user) {
        // Also check the reverse inconsistency
        console.log('Reverse auth inconsistency detected - user in AuthContext but not in authStore');
        setUser(null);
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(checkInterval);
  }, [loadUser, user]);

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
      isAdmin: useAuthStore.getState().isAdmin,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 