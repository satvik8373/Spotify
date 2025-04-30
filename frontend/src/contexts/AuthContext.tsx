import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
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
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  refreshUserData: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);

  const loadUser = async () => {
    // Prevent concurrent auth calls
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        // Get additional user data from Firestore if needed
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();
        
        // Only update state if user info has changed
        if (!user || user.id !== firebaseUser.uid) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData?.fullName || firebaseUser.displayName || 'User',
            picture: userData?.imageUrl || firebaseUser.photoURL || ''
          });
          
          // Update auth store
          useAuthStore.getState().setAuthStatus(true, firebaseUser.uid);
          useAuthStore.getState().setUserProfile(
            userData?.fullName || firebaseUser.displayName || 'User',
            userData?.imageUrl || firebaseUser.photoURL || undefined
          );
          
          console.log("User authenticated:", userData?.fullName || firebaseUser.displayName);
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
      setUser(null);
      // Reset auth store
      useAuthStore.getState().reset();
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        loadUser();
      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
        // Reset auth store
        useAuthStore.getState().reset();
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      isAuthenticated: !!user,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 