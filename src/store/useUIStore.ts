import { create } from "zustand";

interface UIState {
  // ─── Búsqueda global ────────────────────────────────────────────────────────
  searchOpen: boolean;
  searchQuery: string;
  activeTags: string[];
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  closeSearch: () => void;

  // ─── Filtro por categoría (tap corto en columna del chart) ────────────────
  categoryFilter: { emoji: string; name: string } | null;
  setCategoryFilter: (filter: { emoji: string; name: string } | null) => void;
  clearCategoryFilter: () => void;

  // ─── Overlay de entrada rápida NLP (FloatingInputOverlay) ──────────────────
  isExpenseInputOpen: boolean;
  prefillText: string;
  openExpenseInput: (prefill?: string) => void;
  closeExpenseInput: () => void;
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
  removeTag: (tag) => set((s) => ({ activeTags: s.activeTags.filter((t) => t !== tag) })),
  closeSearch: () => set({ searchOpen: false, searchQuery: "", activeTags: [] }),

  categoryFilter: null,
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
  clearCategoryFilter: () => set({ categoryFilter: null }),

  isExpenseInputOpen: false,
  prefillText: "",
  openExpenseInput: (prefill = "") => set({ isExpenseInputOpen: true, prefillText: prefill }),
  closeExpenseInput: () => set({ isExpenseInputOpen: false, prefillText: "" }),
}));
