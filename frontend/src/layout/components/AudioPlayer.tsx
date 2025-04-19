import { usePlayerStore } from "@/stores/usePlayerStore";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

// Helper function to validate URLs
const isValidUrl = (url: string): boolean => {
	if (!url) return false;
	
	try {
		new URL(url);
		return true;
	} catch (e) {
		return false;
	}
};

const AudioPlayer = () => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const prevSongRef = useRef<string | null>(null);

	const { currentSong, isPlaying, playNext } = usePlayerStore();

	// handle play/pause logic
	useEffect(() => {
		if (isPlaying) {
			const playPromise = audioRef.current?.play();
			if (playPromise) {
				playPromise.catch(error => {
					console.error("Error playing audio:", error);
					toast.error("Playback error: " + error.message);
				});
			}
		} else {
			audioRef.current?.pause();
		}
	}, [isPlaying]);

	// handle song ends
	useEffect(() => {
		const audio = audioRef.current;

		const handleEnded = () => {
			playNext();
		};

		audio?.addEventListener("ended", handleEnded);

		return () => audio?.removeEventListener("ended", handleEnded);
	}, [playNext]);

	// handle song changes
	useEffect(() => {
		if (!audioRef.current || !currentSong) return;

		const audio = audioRef.current;
		const songUrl = currentSong.audioUrl;

		// Validate the URL
		if (!isValidUrl(songUrl)) {
			console.error("Invalid audio URL:", songUrl);
			toast.error("Cannot play this song: Invalid audio source");
			return;
		}

		// check if this is actually a new song
		const isSongChange = prevSongRef.current !== songUrl;
		if (isSongChange) {
			console.log("Loading audio source:", songUrl);
			
			try {
				audio.src = songUrl;
				// reset the playback position
				audio.currentTime = 0;

				prevSongRef.current = songUrl;

				if (isPlaying) {
					const playPromise = audio.play();
					playPromise.catch(error => {
						console.error("Error playing audio:", error);
						toast.error(`Playback error: ${error.message}`);
					});
				}
			} catch (error) {
				console.error("Error setting audio source:", error);
				toast.error("Cannot play this song: Error loading audio");
			}
		}
	}, [currentSong, isPlaying]);

	// Handle audio errors
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleError = (e: ErrorEvent) => {
			console.error("Audio element error:", e);
			toast.error("Error playing song - please try another");
		};

		audio.addEventListener("error", handleError as any);
		return () => audio.removeEventListener("error", handleError as any);
	}, []);

	return <audio ref={audioRef} />;
};
export default AudioPlayer;
