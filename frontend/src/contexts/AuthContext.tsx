import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getUserInfo, isAuthenticated, getAccessToken } from '../services/auth.service';

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
      
      if (isAuthenticated()) {
        const accessToken = getAccessToken();
        if (accessToken) {
          const userInfo = await getUserInfo(accessToken);
          
          // Only update state if user info has changed
          if (!user || user.id !== userInfo.sub) {
            setUser({
              id: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture
            });
            console.log("User authenticated:", userInfo.name);
          }
        }
      } else {
        if (user !== null) {
          setUser(null);
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      setError(err instanceof Error ? err : new Error('Failed to load user'));
      setUser(null);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    // Only load user data on initial mount
    loadUser();
    
    // Add listener for auth state changes
    const handleAuthChange = () => {
      loadUser();
    };
    
    window.addEventListener('auth_state_changed', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth_state_changed', handleAuthChange);
    };
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