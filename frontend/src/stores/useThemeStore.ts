import { createWithEqualityFn as create } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f8fafc',
  dark: '#121212',
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark theme for Spotify-like experience
      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        applyTheme(newTheme);
      },
    }),
    {
      name: 'spotify-theme',
    }
  )
);

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

const syncThemeColor = (resolvedTheme: ResolvedTheme) => {
  const themeColor = THEME_COLORS[resolvedTheme];

  // PWA safe-area color used by notch/top inset styling.
  document.documentElement.style.setProperty('--app-theme-color', themeColor);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  }

  const msTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
  if (msTileColor) {
    msTileColor.setAttribute('content', themeColor);
  }
};

// Function to apply theme to document
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
  syncThemeColor(resolvedTheme);
};

// Initialize theme on app start
if (typeof window !== 'undefined') {
  const { theme } = useThemeStore.getState();
  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
