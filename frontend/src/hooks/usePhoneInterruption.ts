import { useEffect, useRef } from 'react';
import { audioFocusManager, InterruptionReason } from '@/utils/AudioFocusManager';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Custom hook to handle phone call and system audio interruptions
 * 
 * Automatically pauses audio during:
 * - Phone calls
 * - Bluetooth device disconnections
 * - System notifications (on supported platforms)
 * - Other audio focus losses
 * 
 * Automatically resumes audio when interruption ends
 */
export function usePhoneInterruption(audioRef: React.RefObject<HTMLAudioElement>) {
    const wasPlayingRef = useRef(false);
    const { isPlaying, setIsPlaying, setUserInteracted } = usePlayerStore();

    useEffect(() => {
        const handleAudioFocusLoss = (reason: InterruptionReason) => {
            // Save current playing state
            wasPlayingRef.current = isPlaying;

            // Only pause if actually playing
            if (isPlaying && audioRef.current && !audioRef.current.paused) {
                // Pause the audio
                audioRef.current.pause();
                setIsPlaying(false);

                // Store reason in player store
                usePlayerStore.setState({
                    wasPlayingBeforeInterruption: true,
                    interruptionReason: reason
                });

            }
        };

        const handleAudioFocusGain = () => {
            // Only resume if we were playing before
            if (wasPlayingRef.current) {
                // Mark user interaction to allow autoplay
                setUserInteracted();

                // Small delay to let system stabilize
                setTimeout(() => {
                    const state = usePlayerStore.getState();

                    // Double check we should resume
                    if (state.wasPlayingBeforeInterruption && audioRef.current) {
                        // Resume playback
                        const playPromise = audioRef.current.play();

                        if (playPromise !== undefined) {
                            playPromise
                                .then(() => {
                                    setIsPlaying(true);
                                })
                                .catch((error) => {

                                    // Retry after another delay
                                    setTimeout(() => {
                                        if (audioRef.current) {
                                            audioRef.current.play()
                                                .then(() => setIsPlaying(true))
                                                .catch(() => {
                                                    // Final failure - reset state
                                                    usePlayerStore.setState({
                                                        wasPlayingBeforeInterruption: false,
                                                        interruptionReason: null
                                                    });
                                                });
                                        }
                                    }, 500);
                                });
                        }

                        // Reset interruption state
                        usePlayerStore.setState({
                            wasPlayingBeforeInterruption: false,
                            interruptionReason: null
                        });
                    }
                }, 300);

                wasPlayingRef.current = false;
            }
        };

        const handleAudioOutputChange = (deviceId: string) => {
            // Store new device ID
            usePlayerStore.setState({
                audioOutputDevice: deviceId
            });

            // On iOS, sometimes we need to replay when output changes
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS && isPlaying && audioRef.current) {
                // Brief pause and resume to force audio routing update
                audioRef.current.pause();
                setTimeout(() => {
                    if (audioRef.current && isPlaying) {
                        audioRef.current.play().catch(() => { });
                    }
                }, 100);
            }
        };

        // Initialize audio focus manager
        audioFocusManager.initialize({
            onAudioFocusLoss: handleAudioFocusLoss,
            onAudioFocusGain: handleAudioFocusGain,
            onAudioOutputChange: handleAudioOutputChange
        });

        // Cleanup
        return () => {
            audioFocusManager.cleanup();
        };
    }, [audioRef, isPlaying, setIsPlaying, setUserInteracted]);

    // Return current focus state for debugging/UI
    return audioFocusManager.getCurrentState();
}