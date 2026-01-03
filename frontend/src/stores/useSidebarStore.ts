import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  width: number;
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      width: DEFAULT_WIDTH,
      isCollapsed: false,
      setWidth: (width: number) => {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ width: clampedWidth, isCollapsed: false });
      },
      toggleCollapse: () => {
        const { isCollapsed } = get();
        set({ isCollapsed: !isCollapsed });
      },
      setCollapsed: (collapsed: boolean) => {
        set({ isCollapsed: collapsed });
      },
    }),
    {
      name: 'sidebar-store',
    }
  )
);

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH, COLLAPSED_WIDTH };

