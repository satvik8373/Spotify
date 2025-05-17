import axiosInstance from '../lib/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncLikedSongsOnLogin } from '@/services/likedSongsService';
import { auth } from '@/lib/firebase';

// Admin email constant
const ADMIN_EMAIL = 'satvikpatel8373@gmail.com';

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
    email?: string;
  } | null;

  checkAdminStatus: () => Promise<void>;
  reset: () => void;
  setAuthStatus: (isAuthenticated: boolean, userId: string | null) => void;
  setUserProfile: (fullName?: string, imageUrl?: string, email?: string) => void;
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
          
          // First check if the user is logged in
          const currentUser = auth.currentUser;
          if (!currentUser || !currentUser.email) {
            set({ isAdmin: false, isLoading: false });
            return;
          }
          
          // Check if user's email matches the admin email
          const isAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          set({ isAdmin, isLoading: false });
          
          // Update user profile with email if we have it
          if (currentUser.email && get().user) {
            set({
              user: {
                ...get().user!,
                email: currentUser.email
              }
            });
          }
          
        } catch (error: any) {
          console.error('Failed to check admin status:', error);
          set({ 
            isLoading: false, 
            error: 'Failed to verify admin status',
            isAdmin: false 
          });
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
        set({ isAuthenticated, userId });
        
        // Check admin status whenever auth status changes
        if (isAuthenticated && userId) {
          get().checkAdminStatus();
        } else {
          set({ isAdmin: false });
        }
      },

      setUserProfile: (fullName, imageUrl, email) => {
        const currentUser = get().user || { id: get().userId || 'unknown' };
        
        set({
          user: {
            ...currentUser,
            fullName: fullName !== undefined ? fullName : currentUser.fullName,
            imageUrl: imageUrl !== undefined ? imageUrl : currentUser.imageUrl,
            email: email !== undefined ? email : currentUser.email
          }
        });
        
        // If we have an email, check admin status
        if (email) {
          const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          set({ isAdmin });
        }
      }
    }),
    {
      name: 'auth-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
