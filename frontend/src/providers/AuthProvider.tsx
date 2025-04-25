import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { getAuth, onAuthStateChanged, User } from '../services/auth-service';

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { setAuthStatus, setUserProfile } = useAuthStore();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const auth = getAuth();
		
		// Handler for auth state changes
		const handleAuthStateChange = (user: User | null) => {
			if (user) {
				// User is signed in, update auth store
				setAuthStatus(true, user.uid);

				// Update user profile if we have display name or photo URL
				if (user.displayName || user.photoURL) {
					setUserProfile(user.displayName, user.photoURL);
				}
			} else {
				// User is signed out
				setAuthStatus(false, null);
			}
			setLoading(false);
		};
		
		// Register for auth state changes
		const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

		// Cleanup subscription on unmount
		return () => unsubscribe();
	}, [setAuthStatus, setUserProfile]);

	if (loading) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-background">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
			</div>
		);
	}

	return <>{children}</>;
}
