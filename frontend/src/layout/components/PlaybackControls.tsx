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
		
		console.log(`PlaybackControls - Song ID: ${songId}, Liked: ${isCurrentSongLiked}, LikedSongIds size: ${likedSongIds?.size}`);
		
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
				usePlayerStore.setState({ isPlaying: false });
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
	}, [currentSong, volume, isRepeating]);

	// Listen for like updates from other components
	useEffect(() => {
		const handleLikeUpdate = () => {
			if (!currentSong) return;
			
			// Re-check if the song is liked after an update event
			const songId = (currentSong as any).id || currentSong._id;
			setIsLiked(likedSongIds?.has(songId));
		};
		
		document.addEventListener('likedSongsUpdated', handleLikeUpdate);
		return () => {
			document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
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
		console.log(`Toggling like for song ID: ${songId}, current status: ${isLiked}`);
		
		// Optimistically update UI
		setIsLiked(!isLiked);
		
		// Actually toggle the like status
		toggleLikeSong(currentSong);
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
							<Button
								size='icon'
								variant='ghost'
								className={cn('hover:text-white h-8 w-8', isShuffled ? 'text-green-500' : 'text-zinc-400')}
								onClick={toggleShuffle}
							>
								<Shuffle className='h-4 w-4' />
							</Button>

							<Button
								size='icon'
								variant='ghost'
								className='hover:text-white text-zinc-400 h-8 w-8'
								onClick={playPrevious}
								disabled={!currentSong}
							>
								<SkipBack className='h-4 w-4' />
							</Button>

							<Button
								size='icon'
								className='bg-white hover:bg-white/90 text-black rounded-full h-9 w-9 transition-transform hover:scale-105'
								onClick={togglePlay}
								disabled={!currentSong}
							>
								{isPlaying ? 
									<Pause className='h-4 w-4' /> : 
									<Play className='h-4 w-4 ml-[2px]' />
								}
							</Button>
							
							<Button
								size='icon'
								variant='ghost'
								className='hover:text-white text-zinc-400 h-8 w-8'
								onClick={playNext}
								disabled={!currentSong}
							>
								<SkipForward className='h-4 w-4' />
							</Button>
							
							<Button
								size='icon'
								variant='ghost'
								className={cn('hover:text-white h-8 w-8', isRepeating ? 'text-green-500' : 'text-zinc-400')}
								onClick={toggleRepeat}
							>
								<Repeat className='h-4 w-4' />
							</Button>
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
					
					{/* volume controls */}
					<div className='flex items-center gap-4 min-w-[180px] w-[30%] justify-end'>
						<div className='flex items-center gap-3'>
							<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400 h-8 w-8'>
								<Mic2 className='h-4 w-4' />
							</Button>
							<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400 h-8 w-8'>
								<ListMusic className='h-4 w-4' />
							</Button>
							<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400 h-8 w-8'>
								<Laptop2 className='h-4 w-4' />
							</Button>
						</div>

						<div className='flex items-center gap-2 ml-2'>
							<Button size='icon' variant='ghost' className='hover:text-white text-zinc-400 h-8 w-8'>
								<Volume2 className='h-4 w-4' />
							</Button>

							<Slider
								value={[volume]}
								max={100}
								step={1}
								className='w-24 cursor-pointer'
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

			{/* Mobile Player */}
			<div 
				className="fixed bottom-14 left-0 right-0 bg-gradient-to-b from-zinc-900 to-black border-t border-zinc-800/50 h-16 backdrop-blur-md z-40 sm:hidden transition-all duration-300"
				style={{ opacity: isTransitioning ? 0.8 : 1 }}
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
										className="h-full w-full object-cover bg-zinc-800"
										onError={(e) => {
											(e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
										}}
									/>
								</div>

								{/* Song info */}
								<div className="truncate min-w-0 flex-1">
									<h4 className="text-xs font-medium truncate">{currentSong.title || "Unknown Title"}</h4>
									<p className="text-[10px] text-zinc-400 truncate">{currentSong.artist || "Unknown Artist"}</p>
								</div>
							</>
						)}
					</div>

					{/* Playback controls / right side */}
					<div className="flex items-center gap-1.5">
						<Button
							size="icon"
							variant="ghost"
							className="h-9 w-9 text-white p-0"
							onClick={(e) => {
								e.stopPropagation();
								playPrevious();
							}}
						>
							<SkipBack className="h-4 w-4" />
						</Button>

						<Button
							size="icon"
							className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center p-0"
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
							className="h-9 w-9 text-white p-0"
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
