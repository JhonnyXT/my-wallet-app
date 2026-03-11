import { create } from "zustand";

interface UIState {
  searchOpen: boolean;
  searchQuery: string;
  activeTags: string[];
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  searchQuery: "",
  activeTags: [],
  setSearchOpen: (open) => set({ searchOpen: open, searchQuery: "", activeTags: [] }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  addTag: (tag) =>
    set((s) => {
      const clean = tag.toLowerCase().replace(/^#/, "");
      if (!clean || s.activeTags.includes(clean)) return s;
      return { activeTags: [...s.activeTags, clean], searchQuery: "" };
    }),
  removeTag: (tag) =>
    set((s) => ({ activeTags: s.activeTags.filter((t) => t !== tag) })),
  closeSearch: () => set({ searchOpen: false, searchQuery: "", activeTags: [] }),
}));
