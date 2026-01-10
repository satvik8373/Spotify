import React, { useState, useEffect, memo } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { login, signInWithGoogle } from '@/services/hybridAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

// Lightweight inline SVG icons to avoid pulling icon libraries on this route
// Note: ArrowLeftIcon kept for possible header/back usage in other variants
const ArrowLeftIcon = memo(({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
));

const EyeIcon = memo(({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
));

const EyeOffIcon = memo(({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-3.22 4.19M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
));

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Fast path: if we have persisted auth in localStorage, redirect immediately
  const hasLocalAuth = (() => {
    try {
      const raw = localStorage.getItem('auth-store');
      if (!raw) return false;
      const parsed = JSON.parse(raw || '{}');
      return Boolean(parsed?.isAuthenticated && parsed?.userId);
    } catch {
      return false;
    }
  })();

  if (hasLocalAuth) {
    const redirectTo = (location.state as any)?.from || '/home';
    return <Navigate to={redirectTo} replace />;
  }

  // Redirect if already authenticated (when context is ready)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      
      // If we have a from location, use it, otherwise use home
      const redirectTo = location.state?.from || '/home';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location.state]);

  // Defer below-the-fold UI to idle time to improve LCP
  useEffect(() => {
    const idle = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: 1200 });
      } else {
        setTimeout(cb, 300);
      }
    };
    idle(() => setShowDeferred(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Logged in successfully');
      navigate(location.state?.from || '/home'); // Navigate to the return URL
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase error messages
      if (error.message.includes('user-not-found') || error.message.includes('wrong-password')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('too-many-requests')) {
        toast.error('Too many login attempts. Please try again later.');
      } else {
        toast.error(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Logged in with Google successfully');
      // Immediately navigate to the home page or return URL for faster perceived performance
      navigate(location.state?.from || '/home', { replace: true });
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      <div className="w-full max-w-md px-6 py-8">
        
        {/* Mavrixfy Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/mavrixfy.png"
            alt="Mavrixfy"
            className="h-16 w-16 object-contain"
          />
        </div>
        
        <div className="mb-6">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? 'Logging in...' : 'Continue with Google'}
          </Button>
        </div>
        
        {showDeferred && (
          <div className="relative mb-6" style={{ contentVisibility: 'auto' as any }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-2 text-zinc-400">OR</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-zinc-800 border-zinc-700 text-white"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </Button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        
        {showDeferred && (
          <>
            <div className="mt-6 text-center" style={{ contentVisibility: 'auto' as any }}>
              <Link to="/reset-password" className="text-white hover:underline text-sm">
                Forgot your password?
              </Link>
            </div>
            
            <div className="border-t border-zinc-800 my-8" style={{ contentVisibility: 'auto' as any }}></div>
            
            <div className="text-center" style={{ contentVisibility: 'auto' as any }}>
              <p className="text-zinc-400 mb-4">Don't have an account?</p>
              <Link 
                to="/register" 
                className="inline-block border border-zinc-700 text-white rounded-full px-8 py-3 font-bold hover:border-white transition-colors"
              >
                Sign up for Spotify
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login; 