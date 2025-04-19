import { PropsWithChildren, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useClerk } from "@clerk/clerk-react";

const AuthProvider = ({ children }: PropsWithChildren) => {
	const { signOut } = useClerk();
	const { isAuthenticated, reset } = useAuthStore();

	// Add global event listener for signout with proper cleanup
	useEffect(() => {
		const handleSignOut = () => {
			if (isAuthenticated) {
				reset(); // Reset store first
				signOut(); // Then sign out from Clerk
			}
		};

		window.addEventListener('custom:signout', handleSignOut);
		
		// Clean up function to prevent memory leaks
		return () => {
			window.removeEventListener('custom:signout', handleSignOut);
		};
	}, [isAuthenticated, reset, signOut]);

	return <>{children}</>;
};

export default AuthProvider;
