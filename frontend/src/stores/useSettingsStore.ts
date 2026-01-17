import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const EQUALIZER_PRESETS = {
    'Flat': { '60Hz': 0, '150Hz': 0, '400Hz': 0, '1KHz': 0, '2.4KHz': 0, '15KHz': 0 },
    'Bass Boost': { '60Hz': 6, '150Hz': 4, '400Hz': 0, '1KHz': 0, '2.4KHz': 0, '15KHz': 0 },
    'Classical': { '60Hz': 5, '150Hz': 3, '400Hz': -2, '1KHz': 0, '2.4KHz': 2, '15KHz': 4 },
    'Dance': { '60Hz': 4, '150Hz': 7, '400Hz': 0, '1KHz': 0, '2.4KHz': 2, '15KHz': 0 },
    'Pop': { '60Hz': -1, '150Hz': 2, '400Hz': 5, '1KHz': 1, '2.4KHz': -2, '15KHz': -1 },
    'Rock': { '60Hz': 5, '150Hz': 3, '400Hz': -1, '1KHz': 2, '2.4KHz': 3, '15KHz': 5 },
    'Vocal': { '60Hz': -3, '150Hz': -1, '400Hz': 4, '1KHz': 5, '2.4KHz': 3, '15KHz': -1 },
    'Electronic': { '60Hz': 6, '150Hz': 3, '400Hz': -2, '1KHz': -2, '2.4KHz': 4, '15KHz': 7 },
};

export type PresetName = keyof typeof EQUALIZER_PRESETS;

export interface SettingsState {
    // Account
    // (Account details are usually handled by auth store, but we might have some UI state here if needed)



    // Audio Quality
    streamingQuality: string;
    setStreamingQuality: (quality: string) => void;


    // Your Library
    compactLibraryLayout: boolean;
    setCompactLibraryLayout: (enabled: boolean) => void;





    // Playback (Equalizer)
    equalizer: {
        '60Hz': number;
        '150Hz': number;
        '400Hz': number;
        '1KHz': number;
        '2.4KHz': number;
        '15KHz': number;
    };
    setEqualizerBand: (band: keyof SettingsState['equalizer'], value: number) => void;
    setEqualizerPreset: (presetName: string) => void;
    resetEqualizer: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({


            streamingQuality: 'Automatic',
            setStreamingQuality: (streamingQuality) => set({ streamingQuality }),


            compactLibraryLayout: false,
            setCompactLibraryLayout: (compactLibraryLayout) => set({ compactLibraryLayout }),





            equalizer: {
                '60Hz': 0,
                '150Hz': 0,
                '400Hz': 0,
                '1KHz': 0,
                '2.4KHz': 0,
                '15KHz': 0,
            },
            setEqualizerBand: (band, value) =>
                set((state) => ({
                    equalizer: { ...state.equalizer, [band]: value },
                })),
            setEqualizerPreset: (presetName) => {
                const preset = EQUALIZER_PRESETS[presetName as PresetName];
                if (preset) {
                    set({ equalizer: { ...preset } });
                }
            },
            resetEqualizer: () =>
                set(() => ({
                    equalizer: {
                        '60Hz': 0,
                        '150Hz': 0,
                        '400Hz': 0,
                        '1KHz': 0,
                        '2.4KHz': 0,
                        '15KHz': 0,
                    },
                })),
        }),
        {
            name: 'settings-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
