import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Laptop2, ListMusic, Mic2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume1, X, ChevronDown, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadLikedSongs, addLikedSong, removeLikedSong } from "@/services/likedSongsService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSignIn } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";

const formatTime = (seconds: number) => {
	if (isNaN(seconds)) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const PlaybackControls = () => {
	const { currentSong, isPlaying, togglePlay, playNext, playPrevious, toggleShuffle, isShuffled } = usePlayerStore();
	const [fullScreenPlayer, setFullScreenPlayer] = useState(false);
	const [volume, setVolume] = useState(75);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
	const [isRepeat, setIsRepeat] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const { isAuthenticated } = useAuthStore();
	const [showLoginDialog, setShowLoginDialog] = useState(false);
	const { signIn, isLoaded: isClerkLoaded } = useSignIn();

	useEffect(() => {
		audioRef.current = document.querySelector("audio");

		const audio = audioRef.current;
		if (!audio) return;

		// Set initial volume
		audio.volume = volume / 100;

		const updateTime = () => setCurrentTime(audio.currentTime);
		const updateDuration = () => {
			if (!isNaN(audio.duration)) {
				setDuration(audio.duration);
			}
		};

		// Handle when song ends - play next song
		const handleEnded = () => {
			// If repeat is enabled, replay the current song
			if (isRepeat && audio) {
				audio.currentTime = 0;
				audio.play()
					.then(() => usePlayerStore.setState({ isPlaying: true }))
					.catch(err => console.error("Error replaying song:", err));
			} else {
				// Otherwise play the next song in queue
				playNext();
			}
		};

		// Handle playback errors
		const handleError = (e: ErrorEvent) => {
			console.error("Audio playback error:", e);
			// Try to play next song if current one fails
			setTimeout(playNext, 1000);
		};

		// Add event listeners
		audio.addEventListener("timeupdate", updateTime);
		audio.addEventListener("loadedmetadata", updateDuration);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError as EventListener);

		// Clean up event listeners
		return () => {
			audio.removeEventListener("timeupdate", updateTime);
			audio.removeEventListener("loadedmetadata", updateDuration);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError as EventListener);
		};
	}, [currentSong, playNext, isRepeat, volume]);

	// Effect to manage play/pause state
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			// Use promise to handle autoplay restrictions
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						// Playback started successfully
					})
					.catch(err => {
						console.error("Playback failed:", err);
						usePlayerStore.setState({ isPlaying: false });
					});
			}
		} else {
			audio.pause();
		}
	}, [isPlaying, currentSong]);

	// Load liked songs to check if current song is liked
	useEffect(() => {
		try {
			const likedSongs = loadLikedSongs();
			setLikedSongIds(new Set(likedSongs.map((song) => song.id)));
		} catch (error) {
			console.error("Error loading liked songs:", error);
		}
	}, []);

	const handleSeek = (value: number[]) => {
		if (audioRef.current) {
			audioRef.current.currentTime = value[0];
			setCurrentTime(value[0]);
		}
	};
	
	// Now use the store method instead of local state
	const handleToggleShuffle = () => {
		toggleShuffle();
	};
	
	// Toggle repeat mode
	const toggleRepeat = () => {
		setIsRepeat(!isRepeat);
	};
	
	// Handle Google sign-in
	const handleGoogleSignIn = async () => {
		if (!isClerkLoaded) {
			toast.error("Authentication system is loading. Please try again.");
			return;
		}
		
		try {
			console.log("Starting Google sign-in flow");
			await signIn.authenticateWithRedirect({
				strategy: "oauth_google",
				redirectUrl: "/auth-callback",
				redirectUrlComplete: "/",
			});
		} catch (error) {
			console.error("Google sign-in error:", error);
			toast.error("Failed to sign in with Google. Please try again.");
		}
	};
	
	// Handle liking/unliking the current song
	const toggleLikeSong = () => {
		if (!currentSong) return;
		
		// Check if user is authenticated
		if (!isAuthenticated) {
			// Show login dialog instead of liking the song
			setShowLoginDialog(true);
			return;
		}
		
		// Handle both song types (normal and Indian songs)
		const songId = (currentSong as any).id || (currentSong as any)._id;
		if (!songId) return;
		
		const isLiked = likedSongIds.has(songId);
		
		if (isLiked) {
			// Remove from liked songs
			removeLikedSong(songId);
			
			// Update state
			const newLikedIds = new Set(likedSongIds);
			newLikedIds.delete(songId);
			setLikedSongIds(newLikedIds);
		} else {
			// Ensure the song object has all required properties for the likedSongsService
			const songToSave = {
				id: songId,
				title: currentSong.title,
				artist: currentSong.artist || "Unknown Artist",
				album: (currentSong as any).album || "Unknown Album",
				imageUrl: currentSong.imageUrl,
				audioUrl: currentSong.audioUrl,
				duration: currentSong.duration || 0
			};
			
			// Add to liked songs
			addLikedSong(songToSave);
			
			// Update state
			const newLikedIds = new Set(likedSongIds);
			newLikedIds.add(songId);
			setLikedSongIds(newLikedIds);
		}

		// Refresh the liked songs list in case it's displayed elsewhere
		document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
	};
	
	if (!currentSong) return null;
	
	const isLiked = likedSongIds.has((currentSong as any).id || (currentSong as any)._id);

	return (
		<>
			{/* Login Dialog */}
			<Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
				<DialogContent className="bg-zinc-900 border-zinc-800 p-6 max-w-md">
					<div className="flex flex-col items-center">
						<Heart className="h-16 w-16 text-white mb-4" />
						<h2 className="text-xl font-bold mb-2">Sign in to like songs</h2>
						<p className="text-center text-zinc-400 mb-6">
							Sign in to save your liked songs to your library and access them from any device.
						</p>
						<button
							onClick={handleGoogleSignIn}
							className="w-full px-4 py-3 rounded-full font-medium bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2 mb-4"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
								<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
								fill="#4285F4" />
							</svg>
							Continue with Google
						</button>
						<button
							onClick={() => setShowLoginDialog(false)}
							className="text-zinc-400 hover:text-white"
						>
							Not now
						</button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Desktop Player */}
			<footer className='hidden md:block h-20 sm:h-24 bg-zinc-900 border-t border-zinc-800 px-4'>
				<div className='flex justify-between items-center h-full max-w-[1800px] mx-auto'>
					{/* currently playing song */}
					<div className='flex items-center gap-4 min-w-[180px] w-[30%]'>
						{currentSong && (
							<>
								<img
									src={currentSong.imageUrl}
									alt={currentSong.title}
									className='w-14 h-14 object-cover rounded-md'
								/>
								<div className='flex-1 min-w-0'>
									<div className='font-medium truncate hover:underline cursor-pointer'>
										{currentSong.title}
									</div>
									<div className='text-sm text-zinc-400 truncate hover:underline cursor-pointer'>
										{currentSong.artist}
									</div>
								</div>
								<Button
									onClick={toggleLikeSong}
									size='icon'
									variant='ghost'
									className='hover:text-white text-zinc-400 h-8 w-8 mr-2'
								>
									<Heart className={`h-4 w-4 ${isLiked ? 'fill-green-500 text-green-500' : ''}`} />
								</Button>
							</>
						)}
					</div>

					{/* player controls*/}
					<div className='flex flex-col items-center gap-2 flex-1 max-w-full sm:max-w-[45%]'>
						<div className='flex items-center gap-4 sm:gap-6'>
							<Button
								size='icon'
								variant='ghost'
								className={`hover:text-white ${isShuffled ? 'text-green-500' : 'text-zinc-400'}`}
								onClick={handleToggleShuffle}
							>
								<Shuffle className='h-4 w-4' />
							</Button>

							<Button
								size='icon'
								variant='ghost'
								className='hover:text-white text-zinc-400'
								onClick={playPrevious}
								disabled={!currentSong}
							>
								<SkipBack className='h-4 w-4' />
							</Button>

							<Button
								size='icon'
								className='bg-white hover:bg-white/80 text-black rounded-full h-8 w-8'
								onClick={togglePlay}
								disabled={!currentSong}
							>
								{isPlaying ? <Pause className='h-5 w-5' /> : <Play className='h-5 w-5' />}
							</Button>
							<Button
								size='icon'
								variant='ghost'
								className='hover:text-white text-zinc-400'
								onClick={playNext}
								disabled={!currentSong}
							>
								<SkipForward className='h-4 w-4' />
							</Button>
							<Button
								size='icon'
								variant='ghost'
								className={`hover:text-white ${isRepeat ? 'text-green-500' : 'text-zinc-400'}`}
								onClick={toggleRepeat}
							>
								<Repeat className='h-4 w-4' />
							</Button>
						</div>

						<div className='flex items-center gap-2 w-full'>
							<div className='text-xs text-zinc-400'>{formatTime(currentTime)}</div>
							<Slider
								value={[currentTime]}
								max={duration || 100}
								step={1}
								className='w-full hover:cursor-grab active:cursor-grabbing'
								onValueChange={handleSeek}
							/>
							<div className='text-xs text-zinc-400'>{formatTime(duration)}</div>
						</div>
					</div>
					{/* volume controls */}
					<div className='flex items-center gap-4 min-w-[180px] w-[30%] justify-end'>
						<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400'>
							<Mic2 className='h-4 w-4' />
						</Button>
						<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400'>
							<ListMusic className='h-4 w-4' />
						</Button>
						<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400'>
							<Laptop2 className='h-4 w-4' />
						</Button>

						<div className='flex items-center gap-2'>
							<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400'>
								<Volume1 className='h-4 w-4' />
							</Button>

							<Slider
								value={[volume]}
								max={100}
								step={1}
								className='w-24 hover:cursor-grab active:cursor-grabbing'
								onValueChange={(value) => {
									setVolume(value[0]);
									if (audioRef.current) {
										audioRef.current.volume = value[0] / 100;
									}
								}}
							/>
						</div>
					</div>
				</div>
			</footer>
			
			{/* Mobile Mini Player - positioned above the mobile nav */}
			<div 
				className="fixed bottom-16 left-0 right-0 md:hidden bg-gradient-to-r from-zinc-900 to-zinc-800 border-t border-zinc-800 h-16 px-3 flex items-center shadow-lg z-50 cursor-pointer"
				onClick={() => setFullScreenPlayer(true)}
			>
				<div className="flex items-center w-full">
					<img 
						src={currentSong.imageUrl} 
						alt={currentSong.title}
						className="h-12 w-12 rounded object-cover"
					/>
					<div className="flex-1 min-w-0 mx-3">
						<p className="font-medium text-sm text-white truncate">{currentSong.title}</p>
						<p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							onClick={(e) => {
								e.stopPropagation();
								togglePlay();
							}}
							size="icon"
							variant="ghost"
							className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90"
						>
							{isPlaying ? (
								<Pause className="h-5 w-5" />
							) : (
								<Play className="h-5 w-5 ml-0.5" />
							)}
						</Button>
						<Button
							onClick={(e) => {
								e.stopPropagation();
								usePlayerStore.setState({ currentSong: null });
							}}
							size="icon"
							variant="ghost"
							className="h-8 w-8 text-zinc-400 hover:text-white"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>
				{/* Progress bar */}
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
					<div 
						className="h-full bg-green-500"
						style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
					></div>
				</div>
			</div>
			
			{/* Mobile Full Screen Player */}
			<Dialog open={fullScreenPlayer} onOpenChange={setFullScreenPlayer}>
				<DialogContent className="p-0 w-full max-w-full h-full max-h-full rounded-none bg-gradient-to-b from-zinc-900/95 to-black md:hidden overflow-auto">
					<div className="relative h-full flex flex-col">
						{/* Header */}
						<div className="p-4 flex items-center justify-between">
							<Button 
								variant="ghost" 
								size="icon" 
								className="rounded-full" 
								onClick={() => setFullScreenPlayer(false)}
							>
								<ChevronDown className="h-6 w-6" />
							</Button>
							<div className="flex-1 text-center">
								<p className="text-sm font-medium text-zinc-400">Now Playing</p>
							</div>
							<Button 
								variant="ghost" 
								size="icon" 
								className="rounded-full opacity-0"
							>
								<ChevronDown className="h-6 w-6" />
							</Button>
						</div>
						
						{/* Album Art */}
						<div className="flex-1 flex items-center justify-center p-6">
							<div className="w-full max-w-[350px] aspect-square">
								<img 
									src={currentSong.imageUrl} 
									alt={currentSong.title} 
									className="w-full h-full object-cover rounded-lg shadow-2xl"
								/>
							</div>
						</div>
						
						{/* Song Info */}
						<div className="p-6 pt-0">
							<h2 className="text-2xl font-bold text-white">{currentSong.title}</h2>
							<p className="text-sm text-zinc-400">{currentSong.artist}</p>
							
							{/* Progress Bar */}
							<div className="mt-6">
								<Slider
									value={[currentTime]}
									max={duration || 100}
									step={1}
									className="w-full"
									onValueChange={handleSeek}
								/>
								<div className="flex justify-between text-xs text-zinc-400 mt-1">
									<span>{formatTime(currentTime)}</span>
									<span>{formatTime(duration)}</span>
								</div>
							</div>
							
							{/* Controls */}
							<div className="mt-8 flex items-center justify-center gap-6">
								<Button 
									variant="ghost" 
									size="icon" 
									className="text-zinc-400 hover:text-white h-12 w-12"
									onClick={toggleLikeSong}
								>
									<Heart className={`h-6 w-6 ${isLiked ? 'fill-green-500 text-green-500' : ''}`} />
								</Button>
								
								<Button 
									variant="ghost" 
									size="icon" 
									className="text-white h-12 w-12"
									onClick={playPrevious}
								>
									<SkipBack className="h-6 w-6" />
								</Button>
								
								<Button 
									className="bg-white hover:bg-white/90 text-black rounded-full h-16 w-16 flex items-center justify-center"
									onClick={togglePlay}
								>
									{isPlaying ? (
										<Pause className="h-8 w-8" />
									) : (
										<Play className="h-8 w-8 ml-1" />
									)}
								</Button>
								
								<Button 
									variant="ghost" 
									size="icon" 
									className="text-white h-12 w-12"
									onClick={playNext}
								>
									<SkipForward className="h-6 w-6" />
								</Button>
								
								<Button 
									variant="ghost" 
									size="icon" 
									className="text-zinc-400 hover:text-white h-12 w-12"
								>
									<ListMusic className="h-6 w-6" />
								</Button>
							</div>
							
							{/* Additional controls */}
							<div className="mt-8 flex items-center justify-center gap-4">
								<Button 
									variant="ghost" 
									size="icon" 
									className={`h-10 w-10 ${isShuffled ? 'text-green-500' : 'text-zinc-400 hover:text-white'}`}
									onClick={handleToggleShuffle}
								>
									<Shuffle className="h-5 w-5" />
								</Button>
								<Button 
									variant="ghost" 
									size="icon" 
									className={`h-10 w-10 ${isRepeat ? 'text-green-500' : 'text-zinc-400 hover:text-white'}`}
									onClick={toggleRepeat}
								>
									<Repeat className="h-5 w-5" />
								</Button>
							</div>
							
							{/* Safe area for iOS devices */}
							<div className="h-8"></div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
