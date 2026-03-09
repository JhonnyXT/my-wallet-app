import { create } from "zustand";

interface UIState {
  searchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  searchQuery: "",
  setSearchOpen: (open) => set({ searchOpen: open, searchQuery: open ? "" : "" }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  closeSearch: () => set({ searchOpen: false, searchQuery: "" }),
}));
