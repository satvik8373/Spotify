import axiosInstance from '../lib/axios';
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserInfo, getAccessToken } from './auth.service';

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  clerkId?: string;
}

interface Auth {
  currentUser: User | null;
}

// Observer callbacks for auth state changes
type AuthStateObserver = (user: User | null) => void;
const observers: AuthStateObserver[] = [];

// Simple auth state
let _currentUser: User | null = null;

// Get Auth instance
export function getAuth(): Auth {
  return {
    get currentUser() {
      return _currentUser;
    }
  };
}

/**
 * Sign in user with Google OAuth
 * This will redirect to Google Auth
 */
export async function signInWithGoogle(): Promise<void> {
  window.location.href = getGoogleAuthUrl();
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(code: string): Promise<User> {
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Get user info from Google
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Update current user
    _currentUser = {
      uid: userInfo.sub,
      email: userInfo.email,
      displayName: userInfo.name,
      photoURL: userInfo.picture
    };
    
    // Store token in axios headers
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
    
    // Notify observers
    notifyObservers(_currentUser);
    
    // Dispatch auth state change event
    window.dispatchEvent(new Event('auth_state_changed'));
    
    return _currentUser;
  } catch (error) {
    console.error('Google callback failed:', error);
    throw error;
  }
}

/**
 * Sign in user with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const response = await axiosInstance.post('/api/auth/login', { email, password });
    const userData = response.data.user;
    
    // Update current user
    _currentUser = {
      uid: userData.id,
      clerkId: userData.clerkId || userData.id,
      email: userData.email,
      displayName: userData.name || userData.fullName || userData.username,
      photoURL: userData.profileImage || userData.imageUrl
    };
    
    // Store token
    localStorage.setItem('auth_token', response.data.token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    
    // Notify observers
    notifyObservers(_currentUser);
    
    // Dispatch auth state change event
    window.dispatchEvent(new Event('auth_state_changed'));
    
    return _currentUser;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  try {
    // Try to sign out through the API
    await axiosInstance.post('/api/auth/logout');
  } catch (error) {
    console.error('Sign out API call failed:', error);
    // Continue with local signout regardless of API call result
  } finally {
    // Clear local auth state
    _currentUser = null;
    
    // Clean up tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    
    // Clear authorization header
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Notify observers
    notifyObservers(null);
    
    // Dispatch auth state change event
    window.dispatchEvent(new Event('auth_state_changed'));
    
    // Redirect to homepage
    window.location.href = '/';
  }
}

/**
 * Check current auth state and restore if token exists
 */
export async function checkAuthState(): Promise<User | null> {
  // Try to get token from local storage
  const token = localStorage.getItem('auth_token');
  const googleToken = getAccessToken();
  
  if (token) {
    try {
      // Set token in axios headers
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch current user data
      const response = await axiosInstance.get('/api/auth/me');
      
      // Update current user
      _currentUser = {
        uid: response.data.id,
        clerkId: response.data.clerkId || response.data.id,
        email: response.data.email,
        displayName: response.data.name || response.data.fullName || response.data.username,
        photoURL: response.data.profileImage || response.data.imageUrl
      };
      
      // Notify observers
      notifyObservers(_currentUser);
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('auth_state_changed'));
      
      return _currentUser;
    } catch (error) {
      console.error('Token validation failed:', error);
      
      // Clear invalid token
      localStorage.removeItem('auth_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      _currentUser = null;
      notifyObservers(null);
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('auth_state_changed'));
      
      return null;
    }
  } else if (googleToken) {
    try {
      // Get user info from Google
      const userInfo = await getUserInfo(googleToken);
      
      // Update current user
      _currentUser = {
        uid: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name,
        photoURL: userInfo.picture
      };
      
      // Notify observers
      notifyObservers(_currentUser);
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('auth_state_changed'));
      
      return _currentUser;
    } catch (error) {
      console.error('Google token validation failed:', error);
      
      // Clear invalid token
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('id_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      _currentUser = null;
      notifyObservers(null);
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('auth_state_changed'));
      
      return null;
    }
  }
  
  return null;
}

/**
 * Register for auth state changes
 */
export function onAuthStateChanged(auth: Auth, callback: AuthStateObserver): () => void {
  observers.push(callback);
  
  // Immediately call with current state
  callback(_currentUser);
  
  // Check auth state on initialization
  checkAuthState();
  
  // Return unsubscribe function
  return () => {
    const index = observers.indexOf(callback);
    if (index > -1) {
      observers.splice(index, 1);
    }
  };
}

/**
 * Notify all observers of auth state change
 */
function notifyObservers(user: User | null): void {
  observers.forEach(callback => callback(user));
}

// Initialize auth state when module loads
checkAuthState().catch(error => {
  console.error('Failed to initialize auth state:', error);
}); 