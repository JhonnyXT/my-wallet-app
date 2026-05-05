// ─── Hook: lógica de búsqueda y animaciones de la barra de búsqueda ──────────

import { useState, useRef, useEffect, useMemo } from "react";
import { Animated, Keyboard, TextInput } from "react-native";
import type { TransactionRow } from "@/src/db/db";
import { useUIStore } from "@/src/store/useUIStore";
import { EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import { extractTagsFromTx, normalize } from "@/src/utils/transactionFormatters";

export interface UseDashboardSearchReturn {
  // Ref de input
  searchInputRef:      React.RefObject<TextInput | null>;
  // Estado de dropdown
  tagDropdownOpen:     boolean;
  // Animaciones
  searchBarAnim:       Animated.Value;
  keyboardExtraAnim:   Animated.Value;
  searchBarOpacity:    Animated.AnimatedInterpolation<number>;
  // Tags
  allTags:             string[];
  tagSuggestions:      string[];
  isTypingTag:         boolean;
  // Handlers
  handleSelectTag:     (tag: string) => void;
  handleSearchTextChange: (text: string) => void;
  handleSearchSubmit:  () => void;
  // Resultados filtrados
  searchedTransactions:  TransactionRow[];
  displayedTransactions: TransactionRow[];
  isSearching:           boolean;
  hasActiveSearch:       boolean;
  // Valores del store (para renderizar la barra)
  searchOpen:   boolean;
  searchQuery:  string;
  activeTags:   string[];
  removeTag:    (tag: string) => void;
  closeSearch:  () => void;
}

interface UseDashboardSearchParams {
  transactions:             TransactionRow[];
  typeFilteredTransactions: TransactionRow[];
  baseSearchBottom:         number;
}

export function useDashboardSearch({
  transactions,
  typeFilteredTransactions,
  baseSearchBottom,
}: UseDashboardSearchParams): UseDashboardSearchReturn {
  const searchOpen     = useUIStore((s) => s.searchOpen);
  const searchQuery    = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const activeTags     = useUIStore((s) => s.activeTags);
  const addTag         = useUIStore((s) => s.addTag);
  const removeTag      = useUIStore((s) => s.removeTag);
  const closeSearch    = useUIStore((s) => s.closeSearch);

  const searchInputRef = useRef<TextInput>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // ── Animación de aparición de la barra ───────────────────────────────────
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(searchBarAnim, {
      toValue: searchOpen ? 1 : 0,
      useNativeDriver: false,
      damping: 20,
      stiffness: 180,
    }).start();
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 120);
  }, [searchOpen]);

  const searchBarOpacity = searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // ── Barra sube cuando aparece el teclado ─────────────────────────────────
  const keyboardExtraAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const onShow = Keyboard.addListener("keyboardDidShow", (e) => {
      const extra = Math.max(0, e.endCoordinates.height - baseSearchBottom + 10);
      Animated.timing(keyboardExtraAnim, { toValue: extra, duration: 180, useNativeDriver: false }).start();
    });
    const onHide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(keyboardExtraAnim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [baseSearchBottom]);

  // ── Tags únicos disponibles ───────────────────────────────────────────────
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tx of transactions) {
      for (const t of extractTagsFromTx(tx)) {
        tagSet.add(t.replace(/^#/, ""));
      }
    }
    return [...tagSet].sort();
  }, [transactions]);

  const isTypingTag  = searchQuery.startsWith("#");
  const tagFragment  = isTypingTag ? searchQuery.slice(1).toLowerCase() : "";

  const tagSuggestions = useMemo(() => {
    if (!isTypingTag) return [];
    return allTags
      .filter((t) => t.includes(tagFragment) && !activeTags.includes(t))
      .slice(0, 5);
  }, [isTypingTag, tagFragment, allTags, activeTags]);

  useEffect(() => {
    setTagDropdownOpen(tagSuggestions.length > 0);
  }, [tagSuggestions.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSelectTag(tag: string) {
    addTag(tag);
    setTagDropdownOpen(false);
    searchInputRef.current?.focus();
  }

  function handleSearchTextChange(text: string) {
    setSearchQuery(text);
  }

  function handleSearchSubmit() {
    if (isTypingTag && tagFragment) {
      const exact = allTags.find((t) => t === tagFragment);
      if (exact) addTag(exact);
      else if (tagSuggestions.length === 1) addTag(tagSuggestions[0]);
    }
  }

  // ── Pipeline de búsqueda ─────────────────────────────────────────────────
  const activeQuery     = searchQuery.trim();
  const hasActiveSearch = !!activeQuery || activeTags.length > 0;

  const searchedTransactions = useMemo(() => {
    let results = typeFilteredTransactions;

    // Filtrar por tags activos (AND lógico)
    if (activeTags.length > 0) {
      results = results.filter((tx) => {
        const txTags = extractTagsFromTx(tx).map((t) => t.replace(/^#/, ""));
        return activeTags.every((at) => txTags.some((tt) => tt.includes(at)));
      });
    }

    // Filtrar por texto libre (ignorar si empieza con # — eso es para buscar tag)
    if (activeQuery && !isTypingTag) {
      const q = normalize(activeQuery);
      results = results.filter((tx) => {
        const desc    = normalize(tx.description ?? "");
        const catName = normalize(EMOJI_TO_CATEGORY_NAME[tx.category_emoji] ?? "");
        return desc.includes(q) || catName.includes(q);
      });
    }

    return results;
  }, [typeFilteredTransactions, activeQuery, activeTags, isTypingTag]);

  const isSearching          = searchOpen && hasActiveSearch;
  const displayedTransactions = isSearching ? searchedTransactions : typeFilteredTransactions;

  return {
    searchInputRef,
    tagDropdownOpen,
    searchBarAnim,
    keyboardExtraAnim,
    searchBarOpacity,
    allTags,
    tagSuggestions,
    isTypingTag,
    handleSelectTag,
    handleSearchTextChange,
    handleSearchSubmit,
    searchedTransactions,
    displayedTransactions,
    isSearching,
    hasActiveSearch,
    searchOpen,
    searchQuery,
    activeTags,
    removeTag,
    closeSearch,
  };
}
