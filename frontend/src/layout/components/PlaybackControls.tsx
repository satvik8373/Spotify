import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Laptop2, ListMusic, Mic2, Pause, Play, Repeat, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SongDetailsView from "@/components/SongDetailsView";
import { LikeButton } from "@/components/LikeButton";
import { ShuffleButton } from "@/components/ShuffleButton";
import { cn } from "@/lib/utils";
import { useLikedSongsStore } from "@/stores/useLikedSongsStore";
import QueueDrawer from "@/components/QueueDrawer";
import ElasticSlider from "@/components/ui/ElasticSlider";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { PingPongScroll } from "@/components/PingPongScroll";

const formatTime = (seconds: number) => {
	if (isNaN(seconds)) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const PlaybackControls = () => {
	const { togglePlay, playNext, playPrevious } = usePlayerStore();
	const { isPlaying, currentSong } = usePlayerSync();
	const { likedSongIds, toggleLikeSong } = useLikedSongsStore();

	const [volume, setVolume] = useState(75);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [showSongDetails, setShowSongDetails] = useState(false);
	const [isRepeating, setIsRepeating] = useState(false);
	const [isLiked, setIsLiked] = useState(false);
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);
	const [showQueue, setShowQueue] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playerRef = useRef<HTMLDivElement>(null);
	const volumeControlRef = useRef<HTMLDivElement>(null);

	// Desktop seek helper for custom progress bar
	const seekTo = (newTime: number) => {
		if (isNaN(newTime)) return;
		if (audioRef.current) {
			audioRef.current.currentTime = Math.max(0, Math.min(newTime, isNaN(duration) ? 0 : duration));
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	// Get liked state from the liked songs store if possible
	useEffect(() => {
		if (!currentSong) return;

		const id = (currentSong as any).id;
		const _id = currentSong._id;
		const isCurrentSongLiked = (id && likedSongIds?.has(id)) || (_id && likedSongIds?.has(_id));

		setIsLiked(!!isCurrentSongLiked);
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
				// Only call playNext once to avoid race conditions
				const store = usePlayerStore.getState();
				store.setUserInteracted();
				store.playNext();
				store.setIsPlaying(true);
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
			// Use requestAnimationFrame instead of setTimeout to avoid performance violations
			const animationId = requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setIsTransitioning(false);
				});
			});
			return () => cancelAnimationFrame(animationId);
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
			<QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />

			{/* Desktop Player */}
			<footer
				ref={playerRef}
				className="h-[90px] px-4 hidden sm:block transition-opacity duration-300 bg-black text-foreground border-t border-white/5"
				style={{ opacity: isTransitioning ? 0.95 : 1 }}
			>
				<div className="flex justify-between items-center h-full max-w-[1800px] mx-auto py-2">
					{/* currently playing song */}
					<div className="flex items-center gap-3 min-w-[180px] w-[30%]">
						{currentSong && (
							<>
								<div className="relative group cursor-pointer">
									<img
										src={currentSong.imageUrl}
										alt={currentSong.title}
										className="w-14 h-14 object-cover rounded-md"
									/>
								</div>
								<div className="flex-1 min-w-0 max-w-[200px]">
									<PingPongScroll
										text={currentSong.title}
										className="text-sm text-white hover:underline cursor-pointer leading-tight mb-0.5"
										velocity={30}
										delay={2}
									/>
									<PingPongScroll
										text={currentSong.artist}
										className="text-[11px] text-white/60 hover:underline hover:text-white cursor-pointer leading-tight"
										velocity={25}
										delay={2}
									/>
								</div>
								<LikeButton
									isLiked={isLiked}
									onToggle={(e) => handleLikeToggle(e)}
									className="hover:scale-110 transition-transform flex-shrink-0"
									iconSize={16}
								/>
							</>
						)}
					</div>

					{/* player controls */}
					<div className="flex flex-col items-center gap-2 flex-1 max-w-[40%]">
						<div className="flex items-center justify-center gap-4 mb-0">
							<ShuffleButton size="sm" />

							<Button
								size="icon"
								variant="ghost"
								className="hover:text-white text-white/70 h-8 w-8 hover:scale-105 transition-all"
								onClick={playPrevious}
								disabled={!currentSong}
							>
								<SkipBack className="h-4 w-4 fill-current" />
							</Button>

							<Button
								size="icon"
								className="bg-white hover:bg-white hover:scale-110 text-black rounded-full h-8 w-8 flex items-center justify-center transition-all"
								onClick={togglePlay}
								disabled={!currentSong}
							>
								{isPlaying ?
									<Pause className="h-4 w-4 fill-current" /> :
									<Play className="h-4 w-4 ml-[1px] fill-current" />
								}
							</Button>

							<Button
								size="icon"
								variant="ghost"
								className="hover:text-white text-white/70 h-8 w-8 hover:scale-105 transition-all"
								onClick={playNext}
								disabled={!currentSong}
							>
								<SkipForward className="h-4 w-4 fill-current" />
							</Button>

							<Button
								size="icon"
								variant="ghost"
								className={cn('hover:text-white h-8 w-8 hover:scale-105 transition-all', isRepeating ? 'text-[#1ed760]' : 'text-white/70')}
								onClick={toggleRepeat}
							>
								<Repeat className="h-4 w-4" />
							</Button>
						</div>

						<div className="flex items-center gap-2 w-full">
							<div className="text-[11px] text-white/70 w-[40px] text-right font-normal tabular-nums">{formatTime(currentTime)}</div>
							<div className="w-full relative group">
								<div
									className="relative w-full cursor-pointer py-1"
									onClick={(e) => {
										const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
										const offsetX = e.clientX - rect.left;
										const pct = Math.max(0, Math.min(1, offsetX / rect.width));
										seekTo(pct * (isNaN(duration) ? 0 : duration));
									}}
								>
									<div className="h-1 w-full rounded-full overflow-hidden bg-white/30 group-hover:bg-white/40 transition-colors">
										<div
											className="h-full bg-white rounded-full relative"
											style={{ width: `${(isNaN(duration) || duration === 0) ? 0 : (currentTime / duration) * 100}%` }}
										>
											<div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
										</div>
									</div>
								</div>
							</div>
							<div className="text-[11px] text-white/70 w-[40px] font-normal tabular-nums">{formatTime(duration)}</div>
						</div>
					</div>

					{/* volume controls */}
					<div className="flex items-center gap-4 min-w-[180px] w-[30%] justify-end">
						<div className="flex items-center gap-2">
							<Button size="icon" variant="ghost" className="hover:text-white text-white/70 h-8 w-8 hover:scale-105 transition-all">
								<Mic2 className="h-4 w-4" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="hover:text-white h-8 w-8 text-white/70 hover:scale-105 transition-all"
								onClick={() => {
									// Dispatch event to toggle queue in MainLayout
									window.dispatchEvent(new Event('toggleQueue'));
									// Also keep the mobile drawer for mobile devices
									if (window.innerWidth < 768) {
										setShowQueue(true);
									}
								}}
								data-queue-button
							>
								<ListMusic className="h-4 w-4" />
							</Button>
							<Button size="icon" variant="ghost" className="hover:text-white text-white/70 h-8 w-8 hover:scale-105 transition-all">
								<Laptop2 className="h-4 w-4" />
							</Button>
						</div>

						<div className="w-32 sm:w-48 ml-2">
							<ElasticSlider
								defaultValue={volume}
								maxValue={100}
								startingValue={0}
								onValueChange={(val) => {
									setVolume(val);
									if (audioRef.current) {
										audioRef.current.volume = val / 100;
									}
								}}
								className="w-full"
							/>
						</div>
					</div>
				</div>
			</footer>
		</>
	);
};

export default PlaybackControls;
