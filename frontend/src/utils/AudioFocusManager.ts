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

    /**
     * Initialize the audio focus manager
     */
    async initialize(callbacks: AudioFocusCallbacks): Promise<void> {
        this.callbacks = callbacks;

        // Create or resume AudioContext for focus detection
        try {
            if (!this.audioContext) {
                // @ts-ignore - AudioContext may need webkit prefix
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }

            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.setupEventListeners();
        } catch (error) {
            // AudioContext initialization failed
        }
    }

    /**
     * Set up all event listeners for interruption detection
     */
    private setupEventListeners(): void {
        if (!this.audioContext) return;

        // AudioContext state change - primary interruption detection
        this.audioContextStateChangeHandler = () => {
            if (!this.audioContext) return;

            const newState = this.audioContext.state;

            if (newState === 'suspended' && this.currentState === 'running') {
                // Audio was interrupted - likely a phone call or system interruption
                this.handleInterruption('call');
            } else if (newState === 'running' && this.currentState === 'suspended') {
                // Audio focus regained
                this.handleResume();
            }

            this.currentState = newState as AudioContextState;
        };

        this.audioContext.addEventListener('statechange', this.audioContextStateChangeHandler);

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

        let previousDevices: MediaDeviceInfo[] = [];
        let deviceCheckInterval: NodeJS.Timeout | null = null;

        const checkDeviceChanges = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

                // Check if audio output device was removed (Bluetooth disconnect)
                if (previousDevices.length > audioOutputs.length) {
                    const removedDevice = previousDevices.find(
                        prev => !audioOutputs.some(curr => curr.deviceId === prev.deviceId)
                    );

                    if (removedDevice) {
                        // Bluetooth or headphone disconnected
                        this.handleInterruption('bluetooth');
                    }
                }

                // Check if new device was added (Bluetooth connect)
                if (audioOutputs.length > previousDevices.length) {
                    const addedDevice = audioOutputs.find(
                        curr => !previousDevices.some(prev => prev.deviceId === curr.deviceId)
                    );

                    if (addedDevice && this.callbacks?.onAudioOutputChange) {
                        this.callbacks.onAudioOutputChange(addedDevice.deviceId);
                    }
                }

                previousDevices = audioOutputs;
            } catch (error) {
                // Silent error handling
            }
        };

        // Use event listener primarily, with fallback polling
        if (navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', checkDeviceChanges);
        } else {
            // Fallback: Check periodically only if event listener not supported
            deviceCheckInterval = setInterval(checkDeviceChanges, 5000);
        }

        // Store interval reference for cleanup
        this.deviceCheckInterval = deviceCheckInterval;
    }

    /**
     * Handle audio interruption
     */
    private handleInterruption(reason: InterruptionReason): void {
        this.interruptionReason = reason;
        this.wasPlayingBeforeInterruption = true;

        if (this.callbacks?.onAudioFocusLoss) {
            this.callbacks.onAudioFocusLoss(reason);
        }
    }

    /**
     * Handle audio resume after interruption
     */
    private handleResume(): void {
        if (this.wasPlayingBeforeInterruption && this.callbacks?.onAudioFocusGain) {
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
     */
    async requestAudioFocus(): Promise<boolean> {
        if (!this.audioContext) {
            return false;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return this.audioContext.state === 'running';
        } catch (error) {
            // Failed to request audio focus
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

        // Clean up device change listener
        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            // Note: We can't remove the specific handler since we don't store it
            // This is a limitation of the current implementation
        }

        this.callbacks = null;
    }
}

// Export singleton instance
export const audioFocusManager = new AudioFocusManager();