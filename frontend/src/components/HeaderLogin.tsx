import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, Loader2 } from 'lucide-react';
import { signOut } from '@/services/hybridAuthService';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderLoginProps {
  className?: string;
}

const HeaderLogin = ({ className }: HeaderLoginProps) => {
  const { user, isAuthenticated, loading: contextLoading, refreshUserData } = useAuth();
  const { isAuthenticated: storeAuthenticated, userId } = useAuthStore();
  const [localLoading, setLocalLoading] = useState(true);
  const [cachedAuth, setCachedAuth] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Check for authentication from both sources
  const isActuallyAuthenticated = isAuthenticated || storeAuthenticated;

  // On initial load, check cached auth state
  useEffect(() => {
    try {
      const cachedAuthState = localStorage.getItem('cached_auth_state');
      if (cachedAuthState) {
        setCachedAuth(JSON.parse(cachedAuthState));
      }
    } catch (e) {
      console.error('Error loading cached auth state:', e);
    }
    
    // Attempt to refresh user data on component mount
    if (!contextLoading) {
      refreshUserData();
    }
    
    // After 500ms, stop showing loading state even if auth is still loading
    // This is to prevent prolonged loading states on slow connections
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [contextLoading, refreshUserData]);

  // Update cached auth state when it changes
  useEffect(() => {
    if (isActuallyAuthenticated !== cachedAuth && (user || userId)) {
      try {
        localStorage.setItem('cached_auth_state', JSON.stringify(isActuallyAuthenticated));
        setCachedAuth(isActuallyAuthenticated);
      } catch (e) {
        console.error('Error saving cached auth state:', e);
      }
    }
  }, [isActuallyAuthenticated, cachedAuth, user, userId]);

  const handleLogout = useCallback(async () => {
    try {
      setLocalLoading(true);
      
      // Clean up cached state before logout
      localStorage.removeItem('cached_auth_state');
      setCachedAuth(false);
      
      await signOut();
      
      // Force page reload to clean up any lingering state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setLocalLoading(false);
    }
  }, []);

  // Calculate what to display based on all authentication sources
  const showAuthenticatedUI = isActuallyAuthenticated || cachedAuth;
  const showLoading = contextLoading && localLoading;

  // If still in initial loading state, show nothing
  if (showLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAuthenticatedUI ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0 overflow-hidden hover:bg-rose-950/30">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // If image fails to load, show default user icon
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.className = 'h-full w-full flex items-center justify-center';
                      icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-white"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                      parent.appendChild(icon);
                    }
                  }}
                />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-zinc-400 font-normal">
              <div className="flex flex-col">
                <span className="text-white font-medium">{user?.name || 'User'}</span>
                <span className="text-xs text-zinc-500 truncate">{user?.email || userId}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800"
              onClick={() => window.location.href = '/account'}
            >
              <Settings className="mr-2 h-4 w-4 text-zinc-400" />
              <span>Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4 text-zinc-400" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button
              variant="ghost"
              className="text-white hover:text-white hover:bg-transparent"
            >
              Log In
            </Button>
          </Link>
          <Link to="/register">
            <Button
              className="bg-white hover:bg-white/90 text-black font-bold rounded-full text-sm px-6 py-2 h-auto"
            >
              Sign Up
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default HeaderLogin; 