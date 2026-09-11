import { create } from 'zustand';

interface ShellState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useShellState = create<ShellState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
