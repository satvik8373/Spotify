/**
 * AudioFocusManager - Centralized audio focus and interruption handling
 * 
 * Handles:
 * - Phone call interruptions
 * - Bluetooth device connections/disconnections
 * - System audio focus changes
 * - Multiple audio source management
 * - Automatic pause/resume logic
 */

export type InterruptionReason = 'call' | 'bluetooth' | 'system' | 'notification' | null;
export type AudioContextState = 'running' | 'suspended' | 'closed' | 'interrupted';

export interface AudioFocusCallbacks {
    onAudioFocusLoss: (reason: InterruptionReason) => void;
    onAudioFocusGain: () => void;
    onAudioOutputChange?: (deviceId: string) => void;
}

class AudioFocusManager {
    private audioContext: AudioContext | null = null;
    private callbacks: AudioFocusCallbacks | null = null;
    private wasPlayingBeforeInterruption = false;
    private currentState: AudioContextState = 'running';
    private interruptionReason: InterruptionReason = null;
    private visibilityChangeHandler: (() => void) | null = null;
    private focusChangeHandler: (() => void) | null = null;
    private beforeUnloadHandler: (() => void) | null = null;
    private audioContextStateChangeHandler: (() => void) | null = null;
    private deviceCheckInterval: NodeJS.Timeout | null = null;
    private mediaDeviceChangeHandler: (() => void) | null = null;
    private previousAudioOutputs: MediaDeviceInfo[] = [];

    /**
     * Initialize the audio focus manager
     * Delays AudioContext creation until first user interaction
     */
    async initialize(callbacks: AudioFocusCallbacks): Promise<void> {
        this.callbacks = callbacks;

        // Don't create AudioContext immediately to avoid autoplay warnings
        // It will be created on first requestAudioFocus() call
        this.setupEventListeners();
    }

    /**
     * Ensure AudioContext exists (lazy initialization)
     */
    private async ensureAudioContext(): Promise<void> {
        if (this.audioContext) return;

        try {
            // @ts-ignore - AudioContext may need webkit prefix
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();

            // Set up state change listener
            if (this.audioContextStateChangeHandler) {
                this.audioContext.addEventListener('statechange', this.audioContextStateChangeHandler);
            }

            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Set up all event listeners for interruption detection
     */
    private setupEventListeners(): void {
        // AudioContext state change - primary interruption detection
        // Note: Listener will be attached when AudioContext is created
        this.audioContextStateChangeHandler = () => {
            if (!this.audioContext) return;

            const newState = this.audioContext.state;

            if (newState === 'suspended' && this.currentState === 'running') {
                this.handleInterruption('call');
            } else if (newState === 'running' && this.currentState === 'suspended') {
                this.handleResume();
            }

            this.currentState = newState as AudioContextState;
        };

        // Visibility change - detect app backgrounding
        this.visibilityChangeHandler = () => {
            if (document.hidden) {
                // App going to background - save state
                this.saveInterruptionState();
            } else {
                // App coming to foreground - check if we should resume
                this.checkResumePlayback();
            }
        };

        document.addEventListener('visibilitychange', this.visibilityChangeHandler);

        // Window focus change
        this.focusChangeHandler = () => {
            if (document.hasFocus()) {
                this.checkResumePlayback();
            }
        };

        window.addEventListener('focus', this.focusChangeHandler);

        // Before unload - save state
        this.beforeUnloadHandler = () => {
            this.saveInterruptionState();
        };

        window.addEventListener('beforeunload', this.beforeUnloadHandler);

        // Monitor audio output devices (Bluetooth headphones, etc.)
        this.setupAudioOutputMonitoring();
    }

    /**
     * Monitor audio output device changes (Bluetooth disconnect, etc.)
     */
    private setupAudioOutputMonitoring(): void {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return;
        }

        const checkDeviceChanges = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                if (this.previousAudioOutputs.length === 0) {
                    this.previousAudioOutputs = audioOutputs;
                    return;
                }

                // Check if audio output device was removed (Bluetooth disconnect)
                if (this.previousAudioOutputs.length > audioOutputs.length) {
                    const removedDevice = this.previousAudioOutputs.find(
                        prev => !audioOutputs.some(curr => curr.deviceId === prev.deviceId)
                    );

                    if (removedDevice) {
                        // Bluetooth or headphone disconnected
                        this.handleInterruption('bluetooth');
                    }
                }

                // Check if new device was added (Bluetooth connect)
                if (audioOutputs.length > this.previousAudioOutputs.length) {
                    const addedDevice = audioOutputs.find(
                        curr => !this.previousAudioOutputs.some(prev => prev.deviceId === curr.deviceId)
                    );

                    if (addedDevice && this.callbacks?.onAudioOutputChange) {
                        this.callbacks.onAudioOutputChange(addedDevice.deviceId);
                    }
                }

                this.previousAudioOutputs = audioOutputs;
            } catch (error) {
                // Silent error handling
            }
        };

        // Use event listener primarily, with fallback polling
        if (navigator.mediaDevices.addEventListener) {
            this.mediaDeviceChangeHandler = checkDeviceChanges;
            navigator.mediaDevices.addEventListener('devicechange', this.mediaDeviceChangeHandler);
            // Prime previous output list once so first change is meaningful
            void checkDeviceChanges();
        } else {
            // Fallback: Check periodically only if event listener not supported
            this.deviceCheckInterval = setInterval(checkDeviceChanges, 5000);
            void checkDeviceChanges();
        }
    }

    /**
     * Handle audio interruption
     */
    private handleInterruption(reason: InterruptionReason): void {
        this.interruptionReason = reason;
        const audio = document.querySelector('audio') as HTMLAudioElement | null;
        this.wasPlayingBeforeInterruption = !!audio && !audio.paused && !audio.ended;

        if (this.callbacks?.onAudioFocusLoss) {
            this.callbacks.onAudioFocusLoss(reason);
        }
    }

    /**
     * Handle audio resume after interruption
     */
    private handleResume(): void {
        if (this.callbacks?.onAudioFocusGain) {
            this.callbacks.onAudioFocusGain();
        }

        this.wasPlayingBeforeInterruption = false;
        this.interruptionReason = null;
    }

    /**
     * Save interruption state to localStorage
     */
    private saveInterruptionState(): void {
        try {
            localStorage.setItem('audio_interruption_state', JSON.stringify({
                wasPlaying: this.wasPlayingBeforeInterruption,
                reason: this.interruptionReason,
                timestamp: Date.now()
            }));
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Check if we should resume playback
     */
    private checkResumePlayback(): void {
        try {
            const savedState = localStorage.getItem('audio_interruption_state');
            if (!savedState) return;

            const { wasPlaying, timestamp } = JSON.parse(savedState);
            const timeSinceInterruption = Date.now() - timestamp;

            // Only resume if interruption was recent (within 5 minutes)
            if (wasPlaying && timeSinceInterruption < 5 * 60 * 1000) {
                this.handleResume();
                localStorage.removeItem('audio_interruption_state');
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Request audio focus (call before playing audio)
     * Creates AudioContext on first call
     */
    async requestAudioFocus(): Promise<boolean> {
        // Lazy create AudioContext on first use
        await this.ensureAudioContext();
        
        if (!this.audioContext) {
            return false;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return this.audioContext.state === 'running';
        } catch (error) {
            return false;
        }
    }

    /**
     * Release audio focus (call when pausing)
     */
    async releaseAudioFocus(): Promise<void> {
        // Note: We don't actually suspend the AudioContext on pause
        // to allow for quick resume. Just mark state.
        this.wasPlayingBeforeInterruption = false;
    }

    /**
     * Get current audio focus state
     */
    getCurrentState(): {
        state: AudioContextState;
        isInterrupted: boolean;
        reason: InterruptionReason;
    } {
        return {
            state: this.currentState,
            isInterrupted: this.interruptionReason !== null,
            reason: this.interruptionReason
        };
    }

    /**
     * Clean up and remove all listeners
     */
    cleanup(): void {
        if (this.audioContextStateChangeHandler && this.audioContext) {
            this.audioContext.removeEventListener('statechange', this.audioContextStateChangeHandler);
        }

        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        }

        if (this.focusChangeHandler) {
            window.removeEventListener('focus', this.focusChangeHandler);
        }

        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }

        if (this.deviceCheckInterval) {
            clearInterval(this.deviceCheckInterval);
            this.deviceCheckInterval = null;
        }

        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener && this.mediaDeviceChangeHandler) {
            navigator.mediaDevices.removeEventListener('devicechange', this.mediaDeviceChangeHandler);
            this.mediaDeviceChangeHandler = null;
        }

        this.previousAudioOutputs = [];
        this.callbacks = null;
    }
}

// Export singleton instance
export const audioFocusManager = new AudioFocusManager();
