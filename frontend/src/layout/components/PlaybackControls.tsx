import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Heart, Laptop2, ListMusic, Mic2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
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
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playerRef = useRef<HTMLDivElement>(null);
	const volumeControlRef = useRef<HTMLDivElement>(null);

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

	// Handle click outside volume control
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (volumeControlRef.current && !volumeControlRef.current.contains(e.target as Node)) {
				setShowVolumeSlider(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Handle seeking
	// const handleSeek = (value: number[]) => {
	// 	const newTime = value[0];
	// 	if (audioRef.current) {
	// 		audioRef.current.currentTime = newTime;
	// 		setCurrentTime(newTime);
	// 	}
	// };
	
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
				className="h-[90px] border-t border-border px-4 hidden sm:block transition-opacity duration-300 bg-background text-foreground"
				style={{ opacity: isTransitioning ? 0.95 : 1 }}
			>
				<div className="flex justify-between items-center h-full max-w-[1800px] mx-auto">
					{/* currently playing song */}
					<div className="flex items-center gap-4 min-w-[180px] w-[30%]">
						{currentSong && (
							<>
								<div className="relative group cursor-pointer" onClick={() => setShowSongDetails(true)}>
									<img
										src={currentSong.imageUrl}
										alt={currentSong.title}
										className="w-14 h-14 object-cover shadow-md"
									/>
								</div>
								<div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowSongDetails(true)}>
									<div className="font-medium truncate text-sm text-foreground hover:underline">
										{currentSong.title}
									</div>
									<div className="text-xs text-muted-foreground truncate hover:underline">
										{currentSong.artist}
									</div>
								</div>
								<Button
									size="icon"
									variant="ghost"
									className={`hover:text-foreground ${isLiked ? 'text-green-500' : 'text-muted-foreground'}`}
									onClick={(e) => handleLikeToggle(e)}
								>
									<Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
								</Button>
							</>
						)}
					</div>

					{/* player controls */}
					<div className="flex flex-col items-center gap-1 flex-1 max-w-[40%]">
						<div className="flex items-center justify-center gap-5 mb-1">
							<Button
								size="icon"
								variant="ghost"
								className={cn('hover:text-foreground h-8 w-8', isShuffled ? 'text-green-500' : 'text-muted-foreground')}
								onClick={toggleShuffle}
							>
								<Shuffle className="h-4 w-4" />
							</Button>

							<Button
								size="icon"
								variant="ghost"
								className="hover:text-foreground text-muted-foreground h-8 w-8"
								onClick={playPrevious}
								disabled={!currentSong}
							>
								<SkipBack className="h-4 w-4" />
							</Button>

							<Button
								size="icon"
								className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center transition-transform hover:scale-105"
								onClick={togglePlay}
								disabled={!currentSong}
							>
								{isPlaying ? 
									<Pause className="h-4 w-4" /> : 
									<Play className="h-4 w-4 ml-[1px]" />
								}
							</Button>
							
							<Button
								size="icon"
								variant="ghost"
								className="hover:text-foreground text-muted-foreground h-8 w-8"
								onClick={playNext}
								disabled={!currentSong}
							>
								<SkipForward className="h-4 w-4" />
							</Button>
							
							<Button
								size="icon"
								variant="ghost"
								className={cn('hover:text-foreground h-8 w-8', isRepeating ? 'text-green-500' : 'text-muted-foreground')}
								onClick={toggleRepeat}
							>
								<Repeat className="h-4 w-4" />
							</Button>
						</div>

						<div className="flex items-center gap-2 w-full">
							<div className="text-[11px] text-muted-foreground w-[35px] text-right">{formatTime(currentTime)}</div>
							<div className="w-full relative group">
								<Slider
									value={[currentTime]}
									max={duration || 100}
									step={1}
									className="w-full cursor-pointer"
									onValueChange={(value) => {
										setCurrentTime(value[0]);
									}}
								/>
								<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
							</div>
						</div>
					</div>
					
					{/* volume controls */}
					<div className="flex items-center gap-4 min-w-[180px] w-[30%] justify-end">
						<div className="flex items-center gap-2">
							<Button size="icon" variant="ghost" className="hover:text-foreground text-muted-foreground h-8 w-8">
								<Mic2 className="h-4 w-4" />
							</Button>
							<Button size="icon" variant="ghost" className="hover:text-foreground text-muted-foreground h-8 w-8">
								<ListMusic className="h-4 w-4" />
							</Button>
							<Button size="icon" variant="ghost" className="hover:text-foreground text-muted-foreground h-8 w-8">
								<Laptop2 className="h-4 w-4" />
							</Button>
						</div>

						<div 
							className="flex items-center gap-2 relative" 
							ref={volumeControlRef}
							onMouseEnter={() => setShowVolumeSlider(true)}
							onMouseLeave={() => setShowVolumeSlider(false)}
						>
							<Button 
								size="icon" 
								variant="ghost" 
								className="hover:text-foreground text-muted-foreground h-8 w-8"
								onClick={() => setVolume(volume === 0 ? 75 : 0)}
							>
								{volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
							</Button>

							<div className={cn(
								"transition-all duration-200 overflow-hidden", 
								showVolumeSlider ? "w-24 opacity-100" : "w-0 opacity-0"
							)}>
								<Slider
									value={[volume]}
									max={100}
									step={1}
									className="cursor-pointer"
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
				</div>
			</footer>

			{/* Mobile Player */}
			<div 
				className="fixed bottom-14 left-0 right-0 bg-background border-t border-border h-16 z-40 sm:hidden transition-all duration-300"
				style={{ opacity: isTransitioning ? 0.95 : 1 }}
				onClick={() => setShowSongDetails(true)}
			>
				<div className="relative h-full flex items-center justify-between px-3">
					{/* Song info / left side */}
					<div className="flex items-center gap-2 flex-1 min-w-0 max-w-[45%]">
						{currentSong && (
							<>
								<div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden cursor-pointer">
									<img
										src={currentSong.imageUrl}
										alt={currentSong.title}
										className="w-full h-full object-cover bg-muted"
										onError={(e) => {
											(e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
										}}
									/>
								</div>

								{/* Song info */}
								<div className="truncate min-w-0 flex-1">
									<h4 className="text-xs font-medium truncate">{currentSong.title || "Unknown Title"}</h4>
									<p className="text-[10px] text-muted-foreground truncate">{currentSong.artist || "Unknown Artist"}</p>
								</div>
							</>
						)}
					</div>

					{/* Playback controls / right side */}
					<div className="flex items-center gap-1.5">
						<Button
							size="icon"
							variant="ghost"
							className="h-9 w-9 text-foreground p-0"
							onClick={(e) => {
								e.stopPropagation();
								playPrevious();
							}}
						>
							<SkipBack className="h-4 w-4" />
						</Button>

						<Button
							size="icon"
							className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center p-0"
							onClick={(e) => {
								e.stopPropagation();
								togglePlay();
							}}
						>
							{isPlaying ? (
								<Pause className="h-3.5 w-3.5" />
							) : (
								<Play className="h-3.5 w-3.5 ml-[2px]" />
							)}
						</Button>

						<Button
							size="icon"
							variant="ghost"
							className="h-9 w-9 text-foreground p-0"
							onClick={(e) => {
								e.stopPropagation();
								playNext();
							}}
						>
							<SkipForward className="h-4 w-4" />
						</Button>
					</div>
				</div>
				
				{/* Progress bar for mobile */}
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
					<div 
						className="h-full bg-primary" 
						style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
					/>
				</div>
			</div>
		</>
	);
};

export default PlaybackControls;
