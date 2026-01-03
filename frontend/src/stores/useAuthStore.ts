import axiosInstance from '../lib/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  user: {
    id: string;
    fullName?: string;
    imageUrl?: string;
  } | null;

  reset: () => void;
  setAuthStatus: (isAuthenticated: boolean, userId: string | null) => void;
  setUserProfile: (fullName?: string, imageUrl?: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      userId: null,
      user: null,

      reset: () => {
        set({
          isLoading: false,
          error: null,
          isAuthenticated: false,
          userId: null,
          user: null
        });
      },

      setAuthStatus: (isAuthenticated, userId) => {
        // Skip update if nothing changed to prevent loops
        if (get().isAuthenticated === isAuthenticated && get().userId === userId) {
          return;
        }
        
        set({ 
          isAuthenticated, 
          userId,
          user: userId ? { id: userId } : null
        });

        // Note: Liked songs are now automatically synced via Firestore
        // No manual sync needed when user logs in
      },

      setUserProfile: (fullName, imageUrl) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              fullName: fullName || user.fullName,
              imageUrl: imageUrl || user.imageUrl
            }
          });
        }
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        user: state.user
      })
    }
  )
);
