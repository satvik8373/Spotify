import { useEffect, useRef } from 'react';
import { audioFocusManager, InterruptionReason } from '@/utils/AudioFocusManager';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Handles phone/system/Bluetooth interruptions with resilient resume logic.
 */
export function usePhoneInterruption(audioRef: React.RefObject<HTMLAudioElement>) {
  const wasPlayingRef = useRef(false);
  const resumeTimerIdsRef = useRef<number[]>([]);
  const resumeInProgressRef = useRef(false);

  useEffect(() => {
    const clearResumeTimers = () => {
      for (const id of resumeTimerIdsRef.current) {
        window.clearTimeout(id);
      }
      resumeTimerIdsRef.current = [];
      resumeInProgressRef.current = false;
    };

    const setInterruptionState = (reason: InterruptionReason, wasPlaying: boolean) => {
      usePlayerStore.setState({
        wasPlayingBeforeInterruption: wasPlaying,
        interruptionReason: reason
      });
    };

    const markPlaybackRecovered = () => {
      usePlayerStore.setState({
        wasPlayingBeforeInterruption: false,
        interruptionReason: null
      });
      wasPlayingRef.current = false;
      resumeInProgressRef.current = false;
    };

    const attemptResumePlayback = async () => {
      const audio = audioRef.current;
      const store = usePlayerStore.getState();
      if (!audio) return false;

      const shouldResume = wasPlayingRef.current || store.wasPlayingBeforeInterruption;
      if (!shouldResume) return false;

      if (audio.ended && store.queue.length > 1) {
        store.setUserInteracted();
        store.playNext();
        return true;
      }

      try {
        // If browser supports sink selection, re-apply preferred output before resume.
        const preferredOutputId = store.audioOutputDevice;
        if (preferredOutputId && typeof (audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
          await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(preferredOutputId);
        }
      } catch {
        // Ignore sink restore failures; resume may still succeed on default route.
      }

      store.setUserInteracted();
      try {
        await audio.play();
        store.setIsPlaying(true);
        markPlaybackRecovered();
        return true;
      } catch {
        return false;
      }
    };

    const handleAudioFocusLoss = (reason: InterruptionReason) => {
      clearResumeTimers();

      const store = usePlayerStore.getState();
      const audio = audioRef.current;
      const isActuallyPlaying = !!audio && !audio.paused && !audio.ended;
      const wasPlaying = store.isPlaying || isActuallyPlaying;

      wasPlayingRef.current = wasPlaying;
      setInterruptionState(reason, wasPlaying);

      if (isActuallyPlaying && audio) {
        audio.pause();
      }
      store.setIsPlaying(false);
    };

    const handleAudioFocusGain = () => {
      clearResumeTimers();

      const store = usePlayerStore.getState();
      const shouldResume = wasPlayingRef.current || store.wasPlayingBeforeInterruption;
      if (!shouldResume) {
        setInterruptionState(null, false);
        return;
      }

      resumeInProgressRef.current = true;
      const retryDelays = [250, 700, 1500, 2600];

      retryDelays.forEach((delay, index) => {
        const timerId = window.setTimeout(async () => {
          if (!resumeInProgressRef.current) return;

          const ok = await attemptResumePlayback();
          if (ok) {
            clearResumeTimers();
            return;
          }

          // If all retries failed, keep paused but clear interruption state cleanly.
          if (index === retryDelays.length - 1) {
            const latestStore = usePlayerStore.getState();
            latestStore.setIsPlaying(false);
            setInterruptionState(null, false);
            wasPlayingRef.current = false;
            resumeInProgressRef.current = false;
          }
        }, delay);
        resumeTimerIdsRef.current.push(timerId);
      });
    };

    const handleAudioOutputChange = (deviceId: string) => {
      usePlayerStore.setState({ audioOutputDevice: deviceId });

      const store = usePlayerStore.getState();
      const shouldTryResume = store.isPlaying || store.wasPlayingBeforeInterruption || wasPlayingRef.current;
      if (!shouldTryResume) return;

      clearResumeTimers();
      const timerId = window.setTimeout(() => {
        void attemptResumePlayback();
      }, 350);
      resumeTimerIdsRef.current.push(timerId);
    };

    audioFocusManager.initialize({
      onAudioFocusLoss: handleAudioFocusLoss,
      onAudioFocusGain: handleAudioFocusGain,
      onAudioOutputChange: handleAudioOutputChange
    });

    return () => {
      clearResumeTimers();
      audioFocusManager.cleanup();
    };
  }, [audioRef]);

  return audioFocusManager.getCurrentState();
}

