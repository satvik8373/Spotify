import {
  signInWithPopup,
  FacebookAuthProvider,
  linkWithPopup,
  getAdditionalUserInfo
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { Timestamp } from "firebase/firestore";

interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  picture: string | null;
}

// Firebase Facebook Authentication
/**
 * Configuration Requirement:
 * To use Facebook Login, you must configure the Facebook Developer Console:
 * 1. App Domains: Add 'localhost' and your Firebase Auth domain (e.g., 'project-id.firebaseapp.com')
 * 2. Valid OAuth Redirect URIs in Facebook Login > Settings:
 *    Add 'https://<your-project-id>.firebaseapp.com/__/auth/handler'
 */
export const signInWithFacebook = async (): Promise<UserProfile> => {
  try {
    // Create Facebook Auth Provider
    const provider = new FacebookAuthProvider();

    // Request additional permissions
    provider.addScope('email');
    provider.addScope('public_profile');

    // Set custom parameters
    provider.setCustomParameters({
      display: 'popup'
    });

    console.log('🔐 Starting Facebook sign-in with Firebase...');

    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Get additional user info from Facebook
    const additionalUserInfo = getAdditionalUserInfo(result);
    const facebookProfile = additionalUserInfo?.profile as any;

    console.log('✅ Facebook sign-in successful:', user.email);
    console.log('📋 Facebook profile:', facebookProfile);

    // Create user profile object
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email,
      name: user.displayName || facebookProfile?.name || user.email?.split('@')[0] || 'User',
      picture: user.photoURL || facebookProfile?.picture?.data?.url || null,
    };

    // Update auth store immediately for faster UI response
    useAuthStore.getState().setAuthStatus(true, user.uid);
    useAuthStore.getState().setUserProfile(
      userProfile.name,
      userProfile.picture || undefined
    );

    // Handle Firestore operations in background
    handleFirestoreSync(user, facebookProfile);

    return userProfile;
  } catch (error: any) {
    console.error('Facebook login error:', error);

    // Handle specific Facebook auth errors
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with the same email address but different sign-in credentials. Please try signing in with a different method.');
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Facebook login was cancelled.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Facebook login popup was blocked by your browser. Please allow popups and try again.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Facebook login was cancelled by user.');
    } else {
      throw new Error(error.message || 'Failed to login with Facebook');
    }
  }
};

// Handle Firestore synchronization in background
const handleFirestoreSync = async (user: any, facebookProfile: any) => {
  try {
    // Check if user document exists in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || facebookProfile?.name || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || facebookProfile?.picture?.data?.url || null,
      provider: 'facebook',
      facebookId: facebookProfile?.id || null,
      updatedAt: Timestamp.now(),
    };

    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(doc(db, "users", user.uid), {
        ...userData,
        createdAt: Timestamp.now(),
      });
      console.log('✅ Created new user document in Firestore');
    } else {
      // Update existing user document
      await setDoc(doc(db, "users", user.uid), userData, { merge: true });
      console.log('✅ Updated existing user document in Firestore');
    }
  } catch (error) {
    console.error('❌ Firestore sync failed:', error);
    // Don't throw error as user is already authenticated
  }
};

// Link Facebook account to existing user
export const linkFacebookAccount = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');

    const result = await linkWithPopup(user, provider);
    const additionalUserInfo = getAdditionalUserInfo(result);
    const facebookProfile = additionalUserInfo?.profile as any;

    // Update user document with Facebook info
    await setDoc(doc(db, "users", user.uid), {
      facebookId: facebookProfile?.id || null,
      photoURL: user.photoURL || facebookProfile?.picture?.data?.url || null,
      updatedAt: Timestamp.now(),
    }, { merge: true });

    console.log('✅ Facebook account linked successfully');
  } catch (error: any) {
    console.error('❌ Failed to link Facebook account:', error);
    throw new Error(error.message || 'Failed to link Facebook account');
  }
};

// Initialize Facebook SDK (not needed for Firebase auth, but kept for compatibility)
export const initializeFacebookSDK = (): Promise<void> => {
  return Promise.resolve();
};