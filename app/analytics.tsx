import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  SectionList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Search, X } from "lucide-react-native";
import { router } from "expo-router";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { scrollBottomPadding } from "@/src/constants/layout";
import { ALL_CATEGORY_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import type { TransactionRow } from "@/src/db/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionData {
  title: string;
  total: number;
  data: TransactionRow[];
}

// ─── Filtros de categoría ─────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { key: "todos", label: "Todos" },
  ...ALL_CATEGORY_EMOJIS.map((emoji) => ({
    key: emoji,
    label: EMOJI_TO_CATEGORY_NAME[emoji] ?? emoji,
  })),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getGroupKey(dateStr: string): string {
  const now = new Date();
  const d   = new Date(dateStr);
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "HOY";
  if (diffDays === 1) return "AYER";
  if (diffDays <= 7)  return "ESTA SEMANA";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
    return "ESTE MES";
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("es-ES", { month: "long" }).toUpperCase();
  return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" })
    .toUpperCase().replace(".", "");
}

function buildSections(transactions: TransactionRow[]): SectionData[] {
  const map   = new Map<string, SectionData>();
  const order: string[] = [];
  for (const tx of transactions) {
    const key = getGroupKey(tx.date);
    if (!map.has(key)) { map.set(key, { title: key, total: 0, data: [] }); order.push(key); }
    const sec = map.get(key)!;
    sec.data.push(tx);
    sec.total += tx.amount;
  }
  return order.map((k) => map.get(k)!);
}

function formatTotal(amount: number): string {
  return `$ ${Math.round(Math.abs(amount)).toLocaleString("es-ES")}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistorialScreen() {
  const insets         = useSafeAreaInsets();
  const transactions   = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  const [activeCategory, setActiveCategory] = useState("todos");
  const [searchOpen,     setSearchOpen]      = useState(false);
  const [query,          setQuery]           = useState("");

  const inputRef    = useRef<TextInput>(null);
  const searchAnim  = useRef(new Animated.Value(0)).current;

  // Animación de apertura/cierre del campo de búsqueda
  function openSearch() {
    setSearchOpen(true);
    Animated.spring(searchAnim, {
      toValue: 1, useNativeDriver: false,
      tension: 280, friction: 22,
    }).start(() => inputRef.current?.focus());
  }

  function closeSearch() {
    inputRef.current?.blur();
    setQuery("");
    Animated.spring(searchAnim, {
      toValue: 0, useNativeDriver: false,
      tension: 280, friction: 22,
    }).start(() => setSearchOpen(false));
  }

  // Filtrado combinado: categoría + búsqueda
  const filtered = useMemo(() => {
    let list = activeCategory === "todos"
      ? transactions
      : transactions.filter((tx) => tx.category_emoji === activeCategory);

    if (query.trim()) {
      const q = normalize(query.trim());
      list = list.filter((tx) =>
        normalize(tx.description).includes(q) ||
        normalize(EMOJI_TO_CATEGORY_NAME[tx.category_emoji] ?? "").includes(q)
      );
    }
    return list;
  }, [transactions, activeCategory, query]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const searchBarHeight = searchAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 52],
  });
  const searchBarOpacity = searchAnim.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0, 0, 1],
  });

  const hasQuery  = query.trim().length > 0;
  const showEmpty = filtered.length === 0;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.55 }]}
          hitSlop={12}
        >
          <ChevronLeft size={24} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <Text style={s.headerTitle}>Historial</Text>

        {/* Lupa — esquina superior derecha */}
        <TouchableOpacity
          onPress={searchOpen ? closeSearch : openSearch}
          style={[s.searchIconBtn, searchOpen && s.searchIconBtnActive]}
          activeOpacity={0.7}
          hitSlop={10}
        >
          {searchOpen
            ? <X size={18} color="#2D5BFF" strokeWidth={2.5} />
            : <Search size={18} color="#0F172A" strokeWidth={2} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Campo de búsqueda inline (animado) ───────────────────── */}
      <Animated.View style={[s.searchBar, { height: searchBarHeight, opacity: searchBarOpacity }]}>
        <View style={s.searchInputPill}>
          <Search size={14} color="#94A3B8" strokeWidth={2} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Buscar en historial…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <X size={14} color="#94A3B8" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Chips de categoría ───────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsContent}
        style={s.chipsRow}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.7}
            >
              <View style={[s.chip, isActive && s.chipActive]}>
                <Text style={[s.chipLabel, isActive && s.chipLabelActive]}>
                  {cat.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Resumen de búsqueda ──────────────────────────────────── */}
      {searchOpen && hasQuery && !showEmpty && (
        <View style={s.searchSummary}>
          <Text style={s.searchSummaryText}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* ── Lista agrupada o vacío ───────────────────────────────── */}
      {showEmpty ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>
            {hasQuery ? "😶" : activeCategory === "todos" ? "💸" : activeCategory}
          </Text>
          <Text style={s.emptyTitle}>
            {hasQuery
              ? `Sin resultados para "${query}"`
              : activeCategory === "todos"
                ? "Sin transacciones aún"
                : "Sin registros en esta categoría"}
          </Text>
          <Text style={s.emptySubtitle}>
            {hasQuery
              ? "Intenta con otra palabra o cambia el filtro de categoría."
              : activeCategory === "todos"
                ? "Toca + o el micrófono para registrar tu primer gasto."
                : "Selecciona otra categoría o registra un gasto aquí."}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: scrollBottomPadding(insets.bottom) },
          ]}
          stickySectionHeadersEnabled={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>{section.title}</Text>
              <Text style={s.sectionTotal}>{formatTotal(section.total)}</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <TransactionItem
              transaction={item}
              index={index}
              dimmed={false}
              onLongPress={deleteTransaction}
            />
          )}
          SectionSeparatorComponent={() => <View style={s.sectionSep} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 14,
    backgroundColor: "#F8F9FA",
  },
  backBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchIconBtnActive: {
    backgroundColor: "#EEF2FF",
  },

  // Search bar inline
  searchBar: {
    overflow: "hidden",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchInputPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
    includeFontPadding: false,
  },

  // Search summary
  searchSummary: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  searchSummaryText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  // Category chips
  chipsRow: {
    backgroundColor: "#F8F9FA",
    maxHeight: 80,
  },
  chipsContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 9999,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#2D5BFF",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  chipLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // List
  listContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 2.4,
    lineHeight: 18,
  },
  sectionTotal: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
  },
  sectionSep: {
    height: 8,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 21,
  },
});
