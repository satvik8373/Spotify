import axiosInstance from '../lib/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncLikedSongsOnLogin } from '@/services/likedSongsService';

interface AuthStore {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  lastAdminCheck: number | null; // timestamp of last admin check
  user: {
    id: string;
    fullName?: string;
    imageUrl?: string;
  } | null;

  checkAdminStatus: () => Promise<void>;
  reset: () => void;
  setAuthStatus: (isAuthenticated: boolean, userId: string | null) => void;
  setUserProfile: (fullName?: string, imageUrl?: string) => void;
}

const ADMIN_CHECK_THROTTLE_MS = 60000; // 1 minute

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      userId: null,
      lastAdminCheck: null,
      user: null,

      checkAdminStatus: async () => {
        const currentTime = Date.now();
        const lastCheck = get().lastAdminCheck;
        
        // Skip if last check was too recent (throttle)
        if (lastCheck && (currentTime - lastCheck < ADMIN_CHECK_THROTTLE_MS)) {
          console.log('Admin check throttled - last check was less than 1 minute ago');
          return;
        }
        
        try {
          set({ isLoading: true, error: null, lastAdminCheck: currentTime });
          const response = await axiosInstance.get('/api/users/admin/check');
          set({ isAdmin: response.data.isAdmin, isLoading: false });
        } catch (error: any) {
          console.error('Failed to check admin status:', error);
          
          // Handle 404 errors gracefully (API endpoint not found)
          if (error.response && error.response.status === 404) {
            console.log('Admin check endpoint not available, defaulting to non-admin');
            set({ 
              isLoading: false, 
              isAdmin: false 
            });
          } else {
            set({ 
              isLoading: false, 
              error: 'Failed to verify admin status',
              isAdmin: false 
            });
          }
        }
      },

      reset: () => {
        set({
          isAdmin: false,
          isLoading: false,
          error: null,
          isAuthenticated: false,
          userId: null,
          lastAdminCheck: null,
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

        // If user is authenticated, check if they are an admin and sync liked songs
        if (isAuthenticated && userId) {
          get().checkAdminStatus();
          
          // Sync liked songs across devices when user logs in
          syncLikedSongsOnLogin().catch(err => 
            console.error("Failed to sync liked songs on login:", err)
          );
        }
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
        isAdmin: state.isAdmin,
        user: state.user,
        lastAdminCheck: state.lastAdminCheck
      })
    }
  )
);
