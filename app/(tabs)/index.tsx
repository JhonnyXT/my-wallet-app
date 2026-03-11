import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, Search, X, Hash } from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding, DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore, getEffectiveBudget, getEffectiveCategoryBudgets } from "@/src/store/useSettingsStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useUIStore } from "@/src/store/useUIStore";
import { FilterChips, PERIODS } from "@/src/components/ui/FilterChips";
import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { ALL_CATEGORY_EMOJIS, ALL_INCOME_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { MonthPickerModal } from "@/src/components/ui/MonthPickerModal";
import { GuidedTour, type TourStep } from "@/src/components/ui/GuidedTour";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";

// ─── Tipos y constantes ───────────────────────────────────────────────────────

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];

export type PeriodFilter =
  | { type: "quick"; label: string }
  | { type: "month"; year: number; month: number }
  | { type: "year";  year: number }
  | { type: "all" };

const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const DEFAULT_PERIOD: PeriodFilter = { type: "quick", label: PERIODS[3] }; // "Este mes"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(amount: number): string {
  return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extractTagsFromTx(tx: { description?: string | null; tags?: string | null }): string[] {
  if (tx.tags) {
    try {
      const parsed = JSON.parse(tx.tags);
      if (Array.isArray(parsed)) return parsed.map((t: string) => t.toLowerCase());
    } catch { /* fallback */ }
  }
  const matches = (tx.description ?? "").match(/#(\w+)/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

function periodFilterLabel(f: PeriodFilter): string {
  switch (f.type) {
    case "quick": return f.label;
    case "month": return `${MONTH_ABBR[f.month - 1]} ${f.year}`;
    case "year":  return `${f.year}`;
    case "all":   return "Todo";
  }
}

function applyPeriodFilter(transactions: TxRow[], f: PeriodFilter): TxRow[] {
  const now            = new Date();
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart  = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  switch (f.type) {
    case "all": return [...transactions];
    case "year": {
      const s = new Date(f.year, 0, 1);
      const e = new Date(f.year, 11, 31, 23, 59, 59);
      return transactions.filter(t => { const d = new Date(t.date); return d >= s && d <= e; });
    }
    case "month": {
      const s = new Date(f.year, f.month - 1, 1);
      const e = new Date(f.year, f.month, 0, 23, 59, 59);
      return transactions.filter(t => { const d = new Date(t.date); return d >= s && d <= e; });
    }
    case "quick":
      switch (f.label) {
        case "Hoy":         return transactions.filter(t => new Date(t.date) >= todayStart);
        case "Ayer":        return transactions.filter(t => { const d = new Date(t.date); return d >= yesterdayStart && d < todayStart; });
        case "Esta semana": return transactions.filter(t => new Date(t.date) >= weekStart);
        case "Este mes":    return transactions.filter(t => new Date(t.date) >= monthStart);
        case "Este año":    return transactions.filter(t => new Date(t.date) >= yearStart);
        default:            return [...transactions];
      }
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme             = useTheme();
  const insets            = useSafeAreaInsets();
  const transactions      = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const monthlyBudget     = useSettingsStore((s) => s.monthlyBudget);
  const budgetPeriod      = useSettingsStore((s) => s.budgetPeriod);
  const budgetByCategory  = useSettingsStore((s) => s.budgetByCategory);
  const resetExpense      = useExpenseStore((s) => s.reset);
  const setExpenseCategory = useExpenseStore((s) => s.setCategory);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const searchOpen     = useUIStore((s) => s.searchOpen);
  const searchQuery    = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const activeTags     = useUIStore((s) => s.activeTags);
  const addTag         = useUIStore((s) => s.addTag);
  const removeTag      = useUIStore((s) => s.removeTag);
  const closeSearch    = useUIStore((s) => s.closeSearch);
  const searchInputRef = useRef<TextInput>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

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

  // Barra de búsqueda sube cuando aparece el teclado
  const baseSearchBottom = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 10;
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

  // ── Tags únicos disponibles ─────────────────────────────────────────────
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const tx of transactions) {
      for (const t of extractTagsFromTx(tx)) {
        tagSet.add(t.replace(/^#/, ""));
      }
    }
    return [...tagSet].sort();
  }, [transactions]);

  const isTypingTag = searchQuery.startsWith("#");
  const tagFragment = isTypingTag ? searchQuery.slice(1).toLowerCase() : "";

  const tagSuggestions = useMemo(() => {
    if (!isTypingTag) return [];
    return allTags
      .filter((t) => t.includes(tagFragment) && !activeTags.includes(t))
      .slice(0, 5);
  }, [isTypingTag, tagFragment, allTags, activeTags]);

  useEffect(() => {
    setTagDropdownOpen(tagSuggestions.length > 0);
  }, [tagSuggestions.length]);

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

  // ── Estado de período unificado ───────────────────────────────────────────
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(DEFAULT_PERIOD);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const chipLabel = periodFilterLabel(periodFilter);
  const quickLabel = periodFilter.type === "quick" ? periodFilter.label : "";

  // ── Filtro de tipo (Gastos / Ingresos) ────────────────────────────────────
  type TypeFilter = "expense" | "income" | null;
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);

  async function handlePillPress(type: TypeFilter) {
    await Haptics.selectionAsync();
    setTypeFilter(prev => prev === type ? null : type);
  }

  // ── Pipeline de filtrado ──────────────────────────────────────────────────
  const filteredTransactions = useMemo(
    () => applyPeriodFilter(transactions, periodFilter),
    [transactions, periodFilter]
  );

  const typeFilteredTransactions = useMemo(() => {
    if (typeFilter === "expense") return filteredTransactions.filter(t => t.amount > 0);
    if (typeFilter === "income")  return filteredTransactions.filter(t => t.amount < 0);
    return filteredTransactions;
  }, [filteredTransactions, typeFilter]);

  const activeQuery = searchQuery.trim();
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

  const displayedTransactions = (searchOpen && hasActiveSearch) ? searchedTransactions : typeFilteredTransactions;
  const isSearching = searchOpen && hasActiveSearch;

  // ── Totales ───────────────────────────────────────────────────────────────
  const { expenseTotal, incomeTotal } = useMemo(() => {
    const source = isSearching ? searchedTransactions : typeFilteredTransactions;
    const exp = source.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const inc = source.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { expenseTotal: exp, incomeTotal: inc };
  }, [isSearching, searchedTransactions, typeFilteredTransactions]);

  const netBalance = incomeTotal - expenseTotal;

  // ── Presupuesto — solo visible en período actual ──────────────────────────
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (periodFilter.type === "quick") return true;
    if (periodFilter.type === "all")   return false;
    if (periodFilter.type === "year")  return periodFilter.year === now.getFullYear();
    return periodFilter.year === now.getFullYear() && periodFilter.month === now.getMonth() + 1;
  }, [periodFilter]);

  const effectiveBudget = useMemo(() => getEffectiveBudget(monthlyBudget, budgetPeriod), [monthlyBudget, budgetPeriod]);

  const budgetPct = useMemo(() => {
    if (effectiveBudget <= 0 || !isCurrentPeriod) return 0;
    const now = new Date();
    const start = budgetPeriod === "biweekly"
      ? (now.getDate() <= 15 ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 16))
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const exp = transactions.filter(t => new Date(t.date) >= start && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    return Math.min(Math.round((exp / effectiveBudget) * 100), 100);
  }, [transactions, effectiveBudget, budgetPeriod, isCurrentPeriod]);

  // ── Stats para la gráfica ─────────────────────────────────────────────────
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of filteredTransactions.filter(t => t.amount > 0)) {
      if (!map[tx.category_emoji]) map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += tx.amount;
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map).map(([emoji, s]) => ({ emoji, ...s })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const incomeStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of filteredTransactions.filter(t => t.amount < 0)) {
      if (!map[tx.category_emoji]) map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += Math.abs(tx.amount);
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map).map(([emoji, s]) => ({ emoji, ...s })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(() => categoryStats.reduce((s, c) => s + c.total, 0), [categoryStats]);
  const totalIncome   = useMemo(() => incomeStats.reduce((s, c) => s + c.total, 0),   [incomeStats]);

  const activeStats         = typeFilter === "income" ? incomeStats   : categoryStats;
  const activeTotalForChart = typeFilter === "income" ? totalIncome   : totalExpenses;
  const effectiveCatBudgets = useMemo(() => getEffectiveCategoryBudgets(budgetByCategory, budgetPeriod), [budgetByCategory, budgetPeriod]);
  const activeBudget        = typeFilter === "income" ? {}            : effectiveCatBudgets;

  const allEmojis = useMemo(() => {
    if (typeFilter === "income") return ALL_INCOME_EMOJIS;
    const known = new Set(ALL_CATEGORY_EMOJIS);
    const extra = [...new Set(transactions.map(t => t.category_emoji).filter(e => !known.has(e)))];
    return [...ALL_CATEGORY_EMOJIS, ...extra];
  }, [transactions, typeFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleNewTransactionFromChart(emoji: string, categoryName: string) {
    resetExpense();
    setExpenseCategory(emoji, categoryName);
    router.push("/active-expense");
  }

  // ── Animación de colapso del chart al hacer scroll ────────────────────────
  const scrollY     = useRef(new Animated.Value(0)).current;
  const [chartHeight, setChartHeight] = useState(0);
  const collapseEnd = chartHeight > 0 ? chartHeight : 300;

  const chartMaxHeight = scrollY.interpolate({
    inputRange: [0, collapseEnd],
    outputRange: [collapseEnd, 0],
    extrapolate: "clamp",
  });
  const chartOpacity = scrollY.interpolate({
    inputRange: [0, collapseEnd * 0.7],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // ── FlatList helpers ──────────────────────────────────────────────────────
  const keyExtractor = useCallback((item: TxRow) => item.id.toString(), []);

  const renderItem = useCallback(({ item, index }: { item: TxRow; index: number }) => (
    <View style={styles.txItem}>
      <TransactionItem
        transaction={item}
        index={index}
        dimmed={false}
        onLongPress={deleteTransaction}
      />
    </View>
  ), [deleteTransaction, styles.txItem]);

  // ── Onboarding tour ──────────────────────────────────────────────────────
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const onboardingStep         = useSettingsStore((s) => s.onboardingStep);
  const setOnboardingStep      = useSettingsStore((s) => s.setOnboardingStep);
  const completeOnboarding     = useSettingsStore((s) => s.completeOnboarding);

  const dashboardTourSteps: TourStep[] = useMemo(() => [
    {
      targetRef: getTourRef(TOUR_KEYS.SETTINGS_BTN),
      title: "¡Bienvenido a MyWallet!",
      message: "Primero, configura tu ingreso mensual para tener control de tus finanzas.",
      buttonLabel: "Ir a Ajustes",
      onAction: () => {
        setOnboardingStep(1);
        router.push("/settings");
      },
    },
    {
      targetRef: getTourRef(TOUR_KEYS.MIC_FAB),
      title: "Registro por voz",
      message: "Registra gastos e ingresos con tu voz. Solo di algo como: \"Almuerzo treinta mil\".",
      buttonLabel: "Entendido",
      onAction: () => setOnboardingStep(4),
    },
    {
      targetRef: getTourRef(TOUR_KEYS.PLUS_BTN),
      title: "Registro manual",
      message: "También puedes registrar tus movimientos manualmente con este botón.",
      buttonLabel: "¡Empezar!",
      onAction: () => completeOnboarding(),
    },
  ], []);

  const dashboardTourVisible = !hasCompletedOnboarding && (onboardingStep === 0 || onboardingStep === 3 || onboardingStep === 4);
  const dashboardTourIndex = onboardingStep === 0 ? 0 : onboardingStep === 3 ? 1 : 2;

  const isNewPeriod = filteredTransactions.length === 0 && isCurrentPeriod && !isSearching;
  const newPeriodMessage = budgetPeriod === "biweekly" ? "Nueva quincena, ¡comienza ahora!" : "Nuevo mes, ¡comienza ahora!";

  const listHeader = (
    <>
      {/* Gráfica — oculta durante búsqueda */}
      {!isSearching && (
        <Animated.View style={[
          styles.chartWrapper,
          { maxHeight: chartHeight > 0 ? chartMaxHeight : undefined, opacity: chartOpacity, overflow: "hidden" },
        ]}>
          <View onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== chartHeight) setChartHeight(h);
          }}>
            {isNewPeriod && (
              <View style={styles.newPeriodOverlay}>
                <Text style={styles.newPeriodText}>{newPeriodMessage}</Text>
                <Text style={styles.newPeriodSub}>Registra tu primer movimiento con + o el micrófono</Text>
              </View>
            )}
            <View style={isNewPeriod ? { opacity: 0.18 } : undefined}>
              <CategoryChart
                stats={activeStats}
                allEmojis={allEmojis}
                totalExpenses={activeTotalForChart}
                budgetByCategory={activeBudget}
                onNewTransaction={handleNewTransactionFromChart}
                alertColors={typeFilter !== "income"}
                isIncomeMode={typeFilter === "income"}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Cabecera de sección */}
      {displayedTransactions.length > 0 && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>
            {isSearching ? "RESULTADOS"
              : typeFilter === "expense" ? "GASTOS"
              : typeFilter === "income"  ? "INGRESOS"
              : "RECIENTE"}
          </Text>
          <Text style={styles.dayLabelRight}>
            {isSearching ? `${searchedTransactions.length} encontrados` : chipLabel.toUpperCase()}
          </Text>
        </View>
      )}
    </>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{isSearching ? "🔍" : isNewPeriod ? "" : "💸"}</Text>
      <Text style={styles.emptyTitle}>
        {isSearching
          ? "Sin resultados"
          : isNewPeriod
            ? ""
            : !isCurrentPeriod
              ? "Sin registros en este período"
              : "Sin movimientos aún"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isSearching
          ? activeTags.length > 0
            ? `No hay transacciones con ${activeTags.map(t => "#" + t).join(", ")}${activeQuery ? ` y "${activeQuery}"` : ""}`
            : `No se encontró nada para "${searchQuery}"`
          : isNewPeriod
            ? ""
            : !isCurrentPeriod
              ? "Usa el filtro de período para navegar a otro mes"
              : "Toca + o el micrófono para registrar tu primer gasto o ingreso."}
      </Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* ══════════════════════════════════════════════════════════════
          HEADER FIJO
          ══════════════════════════════════════════════════════════════ */}
      <View style={styles.headerOuter}>
        <View style={styles.headerLeft}>

          {/* Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>
              {isSearching
                ? `BÚSQUEDA  ·  ${searchedTransactions.length} resultado${searchedTransactions.length !== 1 ? "s" : ""}`
                : "BALANCE NETO"}
            </Text>
            <Text style={[styles.balanceAmount, netBalance < 0 && styles.balanceNegative]}>
              {formatBalance(Math.abs(netBalance))}
            </Text>

            {/* Pills Gastos / Ingresos */}
            <View style={styles.pillsRow}>
              <TouchableOpacity
                onPress={() => handlePillPress("expense")}
                activeOpacity={0.75}
                style={[
                  styles.pillGasto,
                  typeFilter === "expense" && styles.pillGastoActive,
                  typeFilter === "income"  && styles.pillDimmed,
                ]}
              >
                <Text style={[styles.pillGastoText, typeFilter === "expense" && styles.pillGastoActiveText]}>
                  ↓  {formatBalance(expenseTotal)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePillPress("income")}
                activeOpacity={0.75}
                style={[
                  styles.pillIngreso,
                  typeFilter === "income"  && styles.pillIngresoActive,
                  typeFilter === "expense" && styles.pillDimmed,
                ]}
              >
                <Text style={[styles.pillIngresoText, typeFilter === "income" && styles.pillIngresoActiveText]}>
                  ↑  {formatBalance(incomeTotal)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barra de presupuesto — solo período actual, sin filtro de tipo */}
            {effectiveBudget > 0 && !isSearching && typeFilter === null && isCurrentPeriod && (
              <View style={styles.budgetBar}>
                <View style={styles.budgetTrack}>
                  <View style={[styles.budgetFill, { width: `${budgetPct}%` as `${number}%` }]} />
                </View>
                <Text style={styles.budgetBarPct}>{budgetPct}% de {formatBalance(effectiveBudget)}</Text>
              </View>
            )}
          </View>

          {/* Chip de período */}
          <FilterChips
            period={quickLabel}
            periodLabel={chipLabel !== quickLabel ? chipLabel : undefined}
            onPeriodChange={(label) => setPeriodFilter({ type: "quick", label })}
            onOpenMonthPicker={() => setMonthPickerOpen(true)}
          />
        </View>

        <View ref={getTourRef(TOUR_KEYS.SETTINGS_BTN)} collapsable={false}>
          <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
            <Settings size={22} color={theme.text} strokeWidth={1.6} />
          </Pressable>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════
          LISTA (chart colapsable + transacciones)
          ══════════════════════════════════════════════════════════════ */}
      <FlatList
        data={displayedTransactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: scrollBottomPadding(insets.bottom) },
        ]}
        style={styles.list}
      />

      {/* ══════════════════════════════════════════════════════════════
          BARRA DE BÚSQUEDA — flotante encima del dock
          ══════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.searchWrapper,
          {
            bottom: Animated.add(baseSearchBottom, keyboardExtraAnim),
            opacity: searchBarOpacity,
            transform: [{ translateY: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
        pointerEvents={searchOpen ? "auto" : "none"}
      >
        {/* Dropdown de sugerencias — encima de la barra */}
        {tagDropdownOpen && (
          <Animated.View style={styles.tagDropdown}>
            {tagSuggestions.map((tag) => (
              <TouchableOpacity
                key={tag}
                activeOpacity={0.6}
                onPress={() => handleSelectTag(tag)}
                style={styles.tagSuggestionRow}
              >
                <Hash size={13} color={theme.textSub} strokeWidth={2.2} />
                <Text style={styles.tagSuggestionText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Barra principal */}
        <View style={styles.searchBarOverlay}>
          <Search size={16} color="#9CA3AF" strokeWidth={2} style={{ marginLeft: 2 }} />

          {/* Chips de tags activos */}
          {activeTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
              {activeTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                    <X size={12} color={theme.textSub} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, activeTags.length > 0 && { flex: 1, minWidth: 60 }]}
            placeholder={activeTags.length > 0 ? "Buscar..." : "Nombre, categoría o #tag..."}
            placeholderTextColor="#C4C4C6"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.searchCancelBtn} onPress={closeSearch}>
            <X size={14} color="#555" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Selector de mes/año */}
      <MonthPickerModal
        visible={monthPickerOpen}
        selectedYear={periodFilter.type === "month" ? periodFilter.year : periodFilter.type === "year" ? periodFilter.year : null}
        selectedMonth={periodFilter.type === "month" ? periodFilter.month : null}
        onApply={(year, month) => {
          if (year === null)       setPeriodFilter({ type: "all" });
          else if (month === null) setPeriodFilter({ type: "year", year });
          else                     setPeriodFilter({ type: "month", year, month });
          setMonthPickerOpen(false);
        }}
        onClose={() => setMonthPickerOpen(false)}
      />


      {/* Guided Tour — usa Modal interno, siempre encima de todo */}
      <GuidedTour
        steps={dashboardTourSteps}
        currentStep={dashboardTourIndex}
        globalStep={onboardingStep}
        totalSteps={5}
        visible={dashboardTourVisible}
        onSkip={completeOnboarding}
      />

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(t: AppTheme) { return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bg,
  },

  // ── Header ─────────────────────────────────────────────────────────────
  headerOuter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 14,
    flex: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Balance ─────────────────────────────────────────────────────────────
  balanceSection: {
    gap: 6,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: t.textTertiary,
    letterSpacing: 2.0,
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: "800",
    color: t.text,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  balanceNegative: {
    color: "#DC2626",
  },

  // ── Pills ───────────────────────────────────────────────────────────────
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillGasto: {
    backgroundColor: t.pillNeutral,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillGastoActive:     { backgroundColor: "#FFE4E6" },
  pillGastoText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.text,
    letterSpacing: 0.1,
  },
  pillGastoActiveText: { color: "#DC2626", fontWeight: "700" },
  pillIngreso: {
    backgroundColor: t.pillNeutral,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillIngresoActive:     { backgroundColor: "#DCFCE7" },
  pillIngresoText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.text,
    letterSpacing: 0.1,
  },
  pillIngresoActiveText: { color: "#16A34A", fontWeight: "700" },
  pillDimmed:            { opacity: 0.4 },

  // ── Presupuesto ─────────────────────────────────────────────────────────
  budgetBar: {
    gap: 5,
    width: "100%",
    marginTop: 6,
  },
  budgetBarPct: {
    fontSize: 11,
    fontWeight: "500",
    color: t.textSub,
    letterSpacing: 0.1,
  },
  budgetTrack: {
    height: 3,
    backgroundColor: t.border,
    borderRadius: 9999,
    overflow: "hidden",
  },
  budgetFill: {
    height: 3,
    borderRadius: 9999,
    backgroundColor: "#2D5BFF",
  },

  // ── Lista ───────────────────────────────────────────────────────────────
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 0,
  },
  chartWrapper: {
    marginBottom: 8,
  },
  newPeriodOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  newPeriodText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: t.textSub,
    textAlign: "center" as const,
  },
  newPeriodSub: {
    fontSize: 13,
    fontWeight: "400" as const,
    color: t.textTertiary ?? t.textSub,
    textAlign: "center" as const,
    marginTop: 6,
  },
  txItem: {
    paddingHorizontal: 28,
  },

  // ── Cabecera de sección ─────────────────────────────────────────────────
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 28,
    paddingTop: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: t.text,
    letterSpacing: 2.4,
    lineHeight: 18,
  },
  dayLabelRight: {
    fontSize: 12,
    fontWeight: "900",
    color: t.text,
    letterSpacing: 1,
  },

  // ── Estado vacío ────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { fontSize: 17, fontWeight: "700", color: t.textSub, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: t.textTertiary, textAlign: "center", lineHeight: 21 },

  // ── Barra de búsqueda ───────────────────────────────────────────────────
  searchWrapper: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 90,
  },
  searchBarOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: t.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "55%" as any,
  },
  chipsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: t.isDark ? "#1E3A5F" : "#EFF6FF",
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.isDark ? "#93C5FD" : "#1D4ED8",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: t.text,
    paddingVertical: 0,
  },
  searchCancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: t.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Dropdown de sugerencias de tags ─────────────────────────────────────
  tagDropdown: {
    backgroundColor: t.surface,
    borderRadius: 16,
    marginBottom: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tagSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tagSuggestionText: {
    fontSize: 14,
    fontWeight: "500",
    color: t.text,
  },
});}
