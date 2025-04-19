import { create } from "zustand";
import { Song } from "@/types";

interface PlayerStore {
	currentSong: Song | null;
	isPlaying: boolean;
	queue: Song[];
	originalQueue: Song[]; // Store original queue order for unshuffling
	currentIndex: number;
	isShuffled: boolean;

	initializeQueue: (songs: Song[]) => void;
	playAlbum: (songs: Song[], startIndex?: number) => void;
	setCurrentSong: (song: Song | null) => void;
	togglePlay: () => void;
	playNext: () => void;
	playPrevious: () => void;
	toggleShuffle: () => void;
	clearQueue: () => void;
	addToQueue: (song: Song) => void;
	removeFromQueue: (index: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
	currentSong: null,
	isPlaying: false,
	queue: [],
	originalQueue: [],
	currentIndex: -1,
	isShuffled: false,

	initializeQueue: (songs: Song[]) => {
		set({
			queue: songs,
			originalQueue: [...songs], // Store original order
			currentSong: get().currentSong || songs[0],
			currentIndex: get().currentIndex === -1 ? 0 : get().currentIndex,
			isShuffled: false,
		});
	},

	playAlbum: (songs: Song[], startIndex = 0) => {
		if (songs.length === 0) return;

		const song = songs[startIndex];

		set({
			queue: songs,
			originalQueue: [...songs], // Store original order
			currentSong: song,
			currentIndex: startIndex,
			isPlaying: true,
			isShuffled: false,
		});
	},

	setCurrentSong: (song: Song | null) => {
		if (!song) return;

		const songIndex = get().queue.findIndex((s) => {
			// Handle both regular songs and Indian songs
			const songId = (s as any).id || s._id;
			const targetId = (song as any).id || song._id;
			return songId === targetId;
		});

		// If the song is not in the queue, add it
		if (songIndex === -1) {
			const updatedQueue = [...get().queue, song];
			set({
				queue: updatedQueue,
				originalQueue: [...updatedQueue], // Update original queue too
				currentSong: song,
				currentIndex: updatedQueue.length - 1,
				isPlaying: true,
			});
		} else {
			set({
				currentSong: song,
				isPlaying: true,
				currentIndex: songIndex,
			});
		}
	},

	togglePlay: () => {
		const willStartPlaying = !get().isPlaying;
		set({
			isPlaying: willStartPlaying,
		});
	},

	playNext: () => {
		const { currentIndex, queue } = get();
		const nextIndex = currentIndex + 1;

		// if there is a next song to play, let's play it
		if (nextIndex < queue.length) {
			const nextSong = queue[nextIndex];
			set({
				currentSong: nextSong,
				currentIndex: nextIndex,
				isPlaying: true,
			});
		} else if (queue.length > 0) {
			// Loop back to the first song if we're at the end
			const firstSong = queue[0];
			set({
				currentSong: firstSong,
				currentIndex: 0,
				isPlaying: true,
			});
		} else {
			// no songs in queue
			set({ isPlaying: false });
		}
	},
	
	playPrevious: () => {
		const { currentIndex, queue } = get();
		const prevIndex = currentIndex - 1;

		// If we're past the first few seconds of the song, restart it instead of going to previous
		const audio = document.querySelector("audio");
		if (audio && audio.currentTime > 3) {
			audio.currentTime = 0;
			return;
		}

		// theres a prev song
		if (prevIndex >= 0) {
			const prevSong = queue[prevIndex];
			set({
				currentSong: prevSong,
				currentIndex: prevIndex,
				isPlaying: true,
			});
		} else if (queue.length > 0) {
			// Loop to the last song if we're at the beginning
			const lastSong = queue[queue.length - 1];
			set({
				currentSong: lastSong,
				currentIndex: queue.length - 1,
				isPlaying: true,
			});
		} else {
			// no songs in queue
			set({ isPlaying: false });
		}
	},
	
	toggleShuffle: () => {
		const { isShuffled, queue, originalQueue, currentIndex, currentSong } = get();
		
		if (isShuffled) {
			// Restore original order
			const currentSongId = currentSong ? ((currentSong as any).id || currentSong._id) : null;
			// Find new index of current song in original queue
			const newIndex = currentSongId 
				? originalQueue.findIndex(s => ((s as any).id || s._id) === currentSongId)
				: 0;
				
			set({
				queue: [...originalQueue],
				currentIndex: newIndex >= 0 ? newIndex : 0,
				isShuffled: false,
			});
		} else {
			// Shuffle the queue but keep current song at current position
			const currentSongId = currentSong ? ((currentSong as any).id || currentSong._id) : null;
			
			// Remove current song from shuffle array
			const tempQueue = [...queue];
			if (currentIndex >= 0) {
				tempQueue.splice(currentIndex, 1);
			}
			
			// Shuffle the rest of the songs (Fisher-Yates algorithm)
			for (let i = tempQueue.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[tempQueue[i], tempQueue[j]] = [tempQueue[j], tempQueue[i]];
			}
			
			// Create new shuffled queue with current song in first position
			const shuffledQueue = currentSong ? [currentSong, ...tempQueue] : tempQueue;
			
			set({
				queue: shuffledQueue,
				currentIndex: currentSong ? 0 : -1,
				isShuffled: true,
			});
		}
	},
	
	clearQueue: () => {
		set({
			queue: [],
			originalQueue: [],
			currentSong: null,
			currentIndex: -1,
			isPlaying: false,
			isShuffled: false,
		});
	},
	
	addToQueue: (song: Song) => {
		const { queue, originalQueue } = get();
		const updatedQueue = [...queue, song];
		const updatedOriginalQueue = [...originalQueue, song];
		
		set({
			queue: updatedQueue,
			originalQueue: updatedOriginalQueue,
		});
	},
	
	removeFromQueue: (index: number) => {
		const { queue, originalQueue, currentIndex } = get();
		
		// Don't remove currently playing song
		if (index === currentIndex) {
			return;
		}
		
		const updatedQueue = [...queue];
		updatedQueue.splice(index, 1);
		
		// Handle removal from originalQueue too (find equivalent item to remove)
		const removedItemId = index < queue.length ? ((queue[index] as any).id || queue[index]._id) : null;
		let updatedOriginalQueue = [...originalQueue];
		
		if (removedItemId) {
			const originalIndex = updatedOriginalQueue.findIndex(
				s => ((s as any).id || s._id) === removedItemId
			);
			if (originalIndex >= 0) {
				updatedOriginalQueue.splice(originalIndex, 1);
			}
		}
		
		// Update current index if needed
		let newCurrentIndex = currentIndex;
		if (index < currentIndex) {
			newCurrentIndex -= 1;
		}
		
		set({
			queue: updatedQueue,
			originalQueue: updatedOriginalQueue,
			currentIndex: newCurrentIndex,
		});
	},
}));
