import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Heart, Laptop2, ListMusic, Mic2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SongDetailsView from "@/components/SongDetailsView";
import { cn } from "@/lib/utils";
import { useLikedSongsStore } from "@/stores/useLikedSongsStore";

const formatTime = (seconds: number) => {
	if (isNaN(seconds)) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const PlaybackControls = () => {
	const { currentSong, isPlaying, togglePlay, playNext, playPrevious, toggleShuffle, isShuffled } = usePlayerStore();
	const { likedSongIds, toggleLikeSong } = useLikedSongsStore();

	const [volume, setVolume] = useState(75);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [showSongDetails, setShowSongDetails] = useState(false);
	const [isRepeating, setIsRepeating] = useState(false);
	const [isLiked, setIsLiked] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playerRef = useRef<HTMLDivElement>(null);

	// Get liked state from the liked songs store if possible
	useEffect(() => {
		if (!currentSong) return;
		
		const songId = (currentSong as any).id || currentSong._id;
		const isCurrentSongLiked = songId ? likedSongIds?.has(songId) : false;
		
		setIsLiked(isCurrentSongLiked);
	}, [currentSong, likedSongIds]);

	// Handle audio element events
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

		const handleEnded = () => {
			if (isRepeating && audio) {
				audio.currentTime = 0;
				audio.play();
			} else {
				playNext();
				
				setTimeout(() => {
					const store = usePlayerStore.getState();
					store.setUserInteracted();
					store.playNext();
					store.setIsPlaying(true);
				}, 50);
			}
		};

		audio.addEventListener("timeupdate", updateTime);
		audio.addEventListener("loadedmetadata", updateDuration);
		audio.addEventListener("ended", handleEnded);

		return () => {
			audio.removeEventListener("timeupdate", updateTime);
			audio.removeEventListener("loadedmetadata", updateDuration);
			audio.removeEventListener("ended", handleEnded);
		};
	}, [currentSong, volume, isRepeating, playNext]);

	// Listen for like updates from other components
	useEffect(() => {
		const handleLikeUpdate = (e: Event) => {
			if (!currentSong) return;
			
			const songId = (currentSong as any).id || currentSong._id;
			
			// Check if this event includes details about which song was updated
			if (e instanceof CustomEvent && e.detail) {
				// If we have details and it's not for our current song, ignore
				if (e.detail.songId && e.detail.songId !== songId) {
					return;
				}
				
				// If we have explicit like state in the event, use it
				if (typeof e.detail.isLiked === 'boolean') {
					setIsLiked(e.detail.isLiked);
					return;
				}
			}
			
			// Otherwise do a fresh check from the store
			const freshCheck = songId ? likedSongIds?.has(songId) : false;
			setIsLiked(freshCheck);
		};
		
		document.addEventListener('likedSongsUpdated', handleLikeUpdate);
		document.addEventListener('songLikeStateChanged', handleLikeUpdate);
		
		return () => {
			document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
			document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
		};
	}, [currentSong, likedSongIds]);

	// Smooth song changes and handle navigation
	useEffect(() => {
		if (currentSong) {
			setIsTransitioning(true);
			// Short delay to ensure smooth transition
			const timer = setTimeout(() => {
				setIsTransitioning(false);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [currentSong]);

	// Fix for layout issues after navigation
	useEffect(() => {
		const handleFocus = () => {
			if (playerRef.current) {
				playerRef.current.style.display = 'none';
				void playerRef.current.offsetHeight;
				playerRef.current.style.display = '';
			}
		};

		window.addEventListener('focus', handleFocus);
		window.addEventListener('pageshow', handleFocus);
		
		return () => {
			window.removeEventListener('focus', handleFocus);
			window.removeEventListener('pageshow', handleFocus);
		};
	}, []);

	const handleSeek = (value: number[]) => {
		if (audioRef.current) {
			audioRef.current.currentTime = value[0];
			setCurrentTime(value[0]);
		}
	};
	
	const handleLikeToggle = (e: React.MouseEvent) => {
		// Stop event propagation to prevent the song details view from opening
		e.stopPropagation();
		
		if (!currentSong) return;
		
		const songId = (currentSong as any).id || currentSong._id;
		
		// Optimistically update UI
		setIsLiked(!isLiked);
		
		// Actually toggle the like status
		toggleLikeSong(currentSong);
		
		// Also dispatch a direct event for immediate notification
		document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
			detail: {
				songId,
				song: currentSong,
				isLiked: !isLiked,
				timestamp: Date.now(),
				source: 'PlaybackControls'
			}
		}));
	};
	
	const toggleRepeat = () => {
		setIsRepeating(!isRepeating);
	};
	
	if (!currentSong) return null;
	
	return (
		<>
			<SongDetailsView isOpen={showSongDetails} onClose={() => setShowSongDetails(false)} />
			
			{/* Desktop Player */}
			<footer 
				ref={playerRef}
				className='h-20 sm:h-[90px] bg-gradient-to-b from-zinc-900 to-black border-t border-zinc-800/50 px-4 hidden sm:block transition-opacity duration-300'
				style={{ opacity: isTransitioning ? 0.8 : 1 }}
			>
				<div className='flex justify-between items-center h-full max-w-[1800px] mx-auto'>
					{/* currently playing song */}
					<div className='flex items-center gap-4 min-w-[180px] w-[30%]'>
						{currentSong && (
							<>
								<div className="relative group">
									<img
										src={currentSong.imageUrl}
										alt={currentSong.title}
										className='w-14 h-14 object-cover rounded-md shadow-md cursor-pointer group-hover:brightness-75 transition-all'
										onClick={() => setShowSongDetails(true)}
									/>
									<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
										<Play className="h-6 w-6 text-white" />
									</div>
								</div>
								<div className='flex-1 min-w-0 cursor-pointer' onClick={() => setShowSongDetails(true)}>
									<div className='font-medium truncate hover:underline text-sm text-white'>
										{currentSong.title}
									</div>
									<div className='text-xs text-zinc-400 truncate hover:underline'>
										{currentSong.artist}
									</div>
								</div>
								<Button
									size='icon'
									variant='ghost'
									className={`hover:text-white ${isLiked ? 'text-green-500' : 'text-zinc-400'}`}
									onClick={(e) => handleLikeToggle(e)}
								>
									<Heart className='h-4 w-4' fill={isLiked ? 'currentColor' : 'none'} />
								</Button>
							</>
						)}
					</div>

					{/* player controls*/}
					<div className='flex flex-col items-center gap-2 flex-1 max-w-[40%]'>
						<div className='flex items-center justify-center gap-4 sm:gap-5 mb-1'>
							<button
								className={cn(
									'control-button',
									isShuffled ? 'active active-animated' : ''
								)}
								onClick={toggleShuffle}
								aria-label={isShuffled ? "Disable shuffle" : "Enable shuffle"}
							>
								<Shuffle className='h-5 w-5' />
							</button>

							<button
								className="control-button"
								onClick={playPrevious}
								disabled={!currentSong}
								aria-label="Previous track"
							>
								<SkipBack className='h-5 w-5' />
							</button>

							<button
								className="control-button bg-white hover:bg-white/90 text-black"
								onClick={togglePlay}
								disabled={!currentSong}
								aria-label={isPlaying ? "Pause" : "Play"}
							>
								{isPlaying ? 
									<Pause className='h-6 w-6' /> : 
									<Play className='h-6 w-6 ml-[2px]' />
								}
							</button>
							
							<button
								className="control-button"
								onClick={playNext}
								disabled={!currentSong}
								aria-label="Next track"
							>
								<SkipForward className='h-5 w-5' />
							</button>
							
							<button
								className={cn(
									'control-button',
									isRepeating ? 'active active-animated' : ''
								)}
								onClick={toggleRepeat}
								aria-label={isRepeating ? "Disable repeat" : "Enable repeat"}
							>
								<Repeat className='h-5 w-5' />
							</button>
						</div>

						<div className='flex items-center gap-2 w-full'>
							<div className='text-[11px] text-zinc-400 w-10 text-right'>{formatTime(currentTime)}</div>
							<Slider
								value={[currentTime]}
								max={duration || 100}
								step={1}
								className='w-full cursor-pointer'
								onValueChange={handleSeek}
							/>
							<div className='text-[11px] text-zinc-400 w-10'>{formatTime(duration)}</div>
						</div>
					</div>

					{/* Volume and device controls */}
					<div className='flex items-center gap-2 min-w-[180px] w-[30%] justify-end'>
						<Button
							size='icon'
							variant='ghost'
							className='text-zinc-400 hover:text-white'
						>
							<Mic2 className='h-4 w-4' />
						</Button>
						<Button
							size='icon'
							variant='ghost'
							className='text-zinc-400 hover:text-white'
						>
							<ListMusic className='h-4 w-4' />
						</Button>
						<Button
							size='icon'
							variant='ghost'
							className='text-zinc-400 hover:text-white'
						>
							<Laptop2 className='h-4 w-4' />
						</Button>
						<div className='flex items-center gap-2 w-24'>
							<Button
								size='icon'
								variant='ghost'
								className='text-zinc-400 hover:text-white'
							>
								<Volume2 className='h-4 w-4' />
							</Button>
							<Slider
								value={[volume]}
								max={100}
								step={1}
								className='w-full cursor-pointer'
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

			{/* Mobile Player - Minimal version */}
			<div 
				className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-gradient-to-b from-zinc-900/70 to-zinc-900/90 backdrop-blur-lg sm:hidden border-t border-zinc-800/30"
				style={{ opacity: isTransitioning ? 0.8 : 1 }}
			>
				<div className="flex items-center justify-between h-full px-3">
					{/* Song info */}
					<div 
						className="flex items-center flex-1 min-w-0 h-full"
						onClick={() => setShowSongDetails(true)}
					>
						<img
							src={currentSong.imageUrl}
							alt={currentSong.title}
							className="h-10 w-10 rounded-md object-cover mr-3"
						/>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-medium text-white truncate">
								{currentSong.title}
							</div>
							<div className="text-xs text-zinc-400 truncate">
								{currentSong.artist}
							</div>
						</div>
					</div>

					{/* Controls */}
					<div className="flex items-center gap-1.5">
						<button
							className="control-button h-10 w-10"
							onClick={(e) => {
								e.stopPropagation();
								playPrevious();
							}}
							aria-label="Previous track"
						>
							<SkipBack className="h-4 w-4" />
						</button>

						<button
							className="control-button h-10 w-10 bg-white text-black"
							onClick={(e) => {
								e.stopPropagation();
								togglePlay();
							}}
							aria-label={isPlaying ? "Pause" : "Play"}
						>
							{isPlaying ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4 ml-[2px]" />
							)}
						</button>

						<button
							className="control-button h-10 w-10"
							onClick={(e) => {
								e.stopPropagation();
								playNext();
							}}
							aria-label="Next track"
						>
							<SkipForward className="h-4 w-4" />
						</button>
					</div>
				</div>
				
				{/* Progress bar for mobile */}
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
					<div 
						className="h-full bg-green-500" 
						style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
					/>
				</div>
			</div>
		</>
	);
};
