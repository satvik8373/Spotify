import { SignedOut, UserButton, useSignIn } from "@clerk/clerk-react";
import { ChevronLeft, ChevronRight, LayoutDashboardIcon, Search, BellIcon, XCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SignInOAuthButtons from "./SignInOAuthButtons";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useMusicStore } from "@/stores/useMusicStore";

const Topbar = () => {
	const { isAdmin } = useAuthStore();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchQuery, setSearchQuery] = useState("");
	const { searchIndianSongs, isIndianMusicLoading } = useMusicStore();
	const { signIn, isLoaded: isClerkLoaded } = useSignIn();

	// Extract search query from URL when navigating to search page
	useEffect(() => {
		if (location.pathname === '/search') {
			const queryParams = new URLSearchParams(location.search);
			const q = queryParams.get('q');
			if (q) {
				setSearchQuery(q);
			}
		} else {
			// Clear search query when not on search page
			setSearchQuery("");
		}
	}, [location]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			try {
				// Search for Indian songs
				searchIndianSongs(searchQuery);
				// Navigate to search page with the query
				navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
			} catch (error) {
				console.error("Search error:", error);
			}
		}
	};

	const clearSearch = () => {
		setSearchQuery("");
		if (location.pathname === '/search') {
			navigate('/search');
			// Clear search results in the store
			useMusicStore.setState({ indianSearchResults: [] });
		}
	};

	const handleGoogleSignIn = async () => {
		if (!isClerkLoaded) return;
		try {
			console.log("Direct Google sign-in attempt");
			await signIn.authenticateWithRedirect({
				strategy: "oauth_google",
				redirectUrl: "/sso-callback",
				redirectUrlComplete: "/auth-callback",
			});
		} catch (error) {
			console.error("Direct Google sign-in error:", error);
		}
	};

	return (
		<div
			className='flex items-center justify-between p-2 md:p-4 sticky top-0 bg-zinc-900/90 
      backdrop-blur-md z-10 gap-2 md:gap-4
    '
		>
			{/* Navigation Controls */}
			<div className="flex items-center gap-2">
				<button 
					onClick={() => navigate(-1)} 
					className="bg-black/40 rounded-full p-1 hover:bg-black/60"
				>
					<ChevronLeft className="text-white size-5 md:size-6" />
				</button>
				<button 
					onClick={() => navigate(1)} 
					className="bg-black/40 rounded-full p-1 hover:bg-black/60"
				>
					<ChevronRight className="text-white size-5 md:size-6" />
				</button>
			</div>
			
			{/* Search Bar - Now visible on mobile too */}
			<div className="flex-1 max-w-md mx-auto">
				<div className="flex items-center bg-zinc-800 rounded-full overflow-hidden">
					<div className="flex items-center px-2 md:px-3 py-1 md:py-2 w-full">
						<Search className="size-4 text-zinc-400 mr-1 md:mr-2 flex-shrink-0" />
						<form onSubmit={handleSearch} className="w-full relative">
							<Input 
								type="text" 
								placeholder="Search songs, artists, or albums" 
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="bg-transparent border-none focus-visible:ring-0 w-full text-sm placeholder:text-zinc-500"
							/>
							{searchQuery && (
								<button 
									type="button"
									onClick={clearSearch}
									className="absolute right-0 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
								>
									<XCircle className="h-4 w-4" />
								</button>
							)}
						</form>
						{isIndianMusicLoading && (
							<div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mr-2"></div>
						)}
					</div>
				</div>
			</div>
			
			<div className='flex items-center gap-2 md:gap-4'>
				{isAdmin && (
					<Link to={"/admin"} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:flex")}>
						<LayoutDashboardIcon className='size-4 mr-2' />
						Admin
					</Link>
				)}

				<Button
					variant="default"
					size="sm"
					className="hidden md:inline-flex font-bold text-black rounded-full bg-white hover:bg-white/90"
				>
					Explore Premium
				</Button>

				<SignedOut>
					<div className="hidden md:block">
						<button 
							onClick={handleGoogleSignIn}
							className="px-4 py-2 rounded-full font-medium bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2"
							disabled={!isClerkLoaded}
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
								<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
								fill="#4285F4" />
							</svg>
							Sign in with Google
						</button>
					</div>
				</SignedOut>

				<div className="flex items-center gap-2">
					<button className="hidden md:block rounded-full p-2 bg-zinc-800 hover:bg-zinc-700">
						<BellIcon className="size-5" />
					</button>
					<UserButton />
				</div>
			</div>
		</div>
	);
};
export default Topbar;
