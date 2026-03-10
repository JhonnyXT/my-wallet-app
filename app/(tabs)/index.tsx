import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, Search, X } from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding, DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useUIStore } from "@/src/store/useUIStore";
import { FilterChips, PERIODS } from "@/src/components/ui/FilterChips";
import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { COLORS, ALL_CATEGORY_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-ES")}`;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractTagsFromTx(tx: { description?: string | null; tags?: string | null }): string[] {
  if (tx.tags) {
    try {
      const parsed = JSON.parse(tx.tags);
      if (Array.isArray(parsed)) return parsed.map((t: string) => t.toLowerCase());
    } catch { /* fallback */ }
  }
  const desc = tx.description ?? "";
  const matches = desc.match(/#(\w+)/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];

function filterByPeriod(transactions: TxRow[], period: string): TxRow[] {
  const now = new Date();
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart  = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  return transactions.filter((tx) => {
    const d = new Date(tx.date);
    switch (period) {
      case "Hoy":         return d >= todayStart;
      case "Ayer":        return d >= yesterdayStart && d < todayStart;
      case "Esta semana": return d >= weekStart;
      case "Este mes":    return d >= monthStart;
      case "Este año":    return d >= yearStart;
      default:            return true;
    }
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme             = useTheme();
  const insets            = useSafeAreaInsets();
  const transactions      = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  // Settings
  const monthlyBudget    = useSettingsStore((s) => s.monthlyBudget);
  const budgetPeriod     = useSettingsStore((s) => s.budgetPeriod);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const savingsGoals     = useSettingsStore((s) => s.savingsGoals);

  // Expense store
  const resetExpense       = useExpenseStore((s) => s.reset);
  const setExpenseCategory = useExpenseStore((s) => s.setCategory);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Búsqueda inline
  const searchOpen    = useUIStore((s) => s.searchOpen);
  const searchQuery   = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const closeSearch   = useUIStore((s) => s.closeSearch);
  const searchInputRef = useRef<TextInput>(null);

  // Animación de la barra de búsqueda
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(searchBarAnim, {
      toValue: searchOpen ? 1 : 0,
      useNativeDriver: false,
      damping: 20,
      stiffness: 180,
    }).start();
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [searchOpen]);

  const searchBarHeight  = searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 54] });
  const searchBarOpacity = searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Filtros de período + categoría
  const [period,   setPeriod]   = useState(PERIODS[3]);
  const [category, setCategory] = useState<string | null>(null);

  // ── Filtro de tipo (pill toggle) ──────────────────────────────────────────
  type TypeFilter = "expense" | "income" | null;
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);

  async function handlePillPress(type: TypeFilter) {
    await Haptics.selectionAsync();
    setTypeFilter(prev => prev === type ? null : type);
  }

  // ── Transacciones filtradas por período + categoría ──────────────────────
  const filteredTransactions = useMemo(() => {
    let list = filterByPeriod(transactions, period);
    if (category) list = list.filter((t) => t.category_emoji === category);
    return list;
  }, [transactions, period, category]);

  // ── Filtro de tipo sobre la lista ─────────────────────────────────────────
  const typeFilteredTransactions = useMemo(() => {
    if (typeFilter === "expense") return filteredTransactions.filter(t => t.amount > 0);
    if (typeFilter === "income")  return filteredTransactions.filter(t => t.amount < 0);
    return filteredTransactions;
  }, [filteredTransactions, typeFilter]);

  // ── Búsqueda aplicada encima del filtro ──────────────────────────────────
  const activeQuery = searchQuery.trim();
  const searchedTransactions = useMemo(() => {
    if (!activeQuery) return typeFilteredTransactions;
    const q = normalize(activeQuery);

    if (q.startsWith("#")) {
      const tag = q.slice(1);
      return typeFilteredTransactions.filter((tx) =>
        extractTagsFromTx(tx).some((t) => t.includes(tag))
      );
    }

    return typeFilteredTransactions.filter((tx) => {
      const desc    = normalize(tx.description ?? "");
      const catName = normalize(EMOJI_TO_CATEGORY_NAME[tx.category_emoji] ?? "");
      return desc.includes(q) || catName.includes(q);
    });
  }, [typeFilteredTransactions, activeQuery]);

  // Transacciones a mostrar en la lista
  const displayedTransactions = searchOpen && activeQuery
    ? searchedTransactions
    : typeFilteredTransactions;

  // ── Inicio del período activo (mensual o quincenal) ──────────────────────
  const periodStart = useMemo(() => {
    const now = new Date();
    if (budgetPeriod === "biweekly") {
      const day = now.getDate();
      // Primera quincena: 1-15 / Segunda quincena: 16-fin de mes
      return day <= 15
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 16);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [budgetPeriod]);

  // ── Totales del período activo (base) ────────────────────────────────────
  const { monthlyExpense, monthlyIncome } = useMemo(() => {
    const inPeriod = transactions.filter(t => new Date(t.date) >= periodStart);
    const exp = inPeriod.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const inc = inPeriod.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { monthlyExpense: exp, monthlyIncome: inc };
  }, [transactions, periodStart]);

  // ── Totales reactivos a búsqueda ─────────────────────────────────────────
  const { expenseTotal, incomeTotal } = useMemo(() => {
    if (searchOpen && activeQuery) {
      const exp = searchedTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const inc = searchedTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { expenseTotal: exp, incomeTotal: inc };
    }
    return { expenseTotal: monthlyExpense, incomeTotal: monthlyIncome };
  }, [searchOpen, activeQuery, searchedTransactions, monthlyExpense, monthlyIncome]);

  const isSearching = searchOpen && !!activeQuery;
  const netBalance  = incomeTotal - expenseTotal;

  // Porcentaje de presupuesto
  const budgetPct = useMemo(() => {
    if (monthlyBudget <= 0) return 0;
    return Math.min(Math.round((monthlyExpense / monthlyBudget) * 100), 100);
  }, [monthlyExpense, monthlyBudget]);

  // ── Stats del chart (solo gastos del mes) ────────────────────────────────
  const categoryStats = useMemo(() => {
    const now      = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = transactions.filter(
      t => new Date(t.date) >= firstDay && t.amount > 0
    );
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of monthTxs) {
      if (!map[tx.category_emoji])
        map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += tx.amount;
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map)
      .map(([emoji, s]) => ({ emoji, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenses = useMemo(
    () => categoryStats.reduce((s, c) => s + c.total, 0),
    [categoryStats]
  );

  // Stats de ingresos por categoría (para el chart cuando filtro = income)
  const incomeStats = useMemo(() => {
    const now      = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = transactions.filter(
      t => new Date(t.date) >= firstDay && t.amount < 0
    );
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of monthTxs) {
      if (!map[tx.category_emoji])
        map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += Math.abs(tx.amount);
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map)
      .map(([emoji, s]) => ({ emoji, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalIncome = useMemo(
    () => incomeStats.reduce((s, c) => s + c.total, 0),
    [incomeStats]
  );

  // Chart activo según filtro
  const activeStats        = typeFilter === "income" ? incomeStats   : categoryStats;
  const activeTotalForChart = typeFilter === "income" ? totalIncome   : totalExpenses;
  const activeBudget       = typeFilter === "income" ? {}            : budgetByCategory;

  const allEmojis = useMemo(() => {
    const known = new Set(ALL_CATEGORY_EMOJIS);
    const extra = [...new Set(
      transactions.map(t => t.category_emoji).filter(e => !known.has(e))
    )];
    return [...ALL_CATEGORY_EMOJIS, ...extra];
  }, [transactions]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleNewTransactionFromChart(emoji: string, categoryName: string) {
    resetExpense();
    setExpenseCategory(emoji, categoryName);
    router.push("/active-expense");
  }

  // ── Scroll único + chart collapse proporcional ───────────────────────────
  const scrollY      = useRef(new Animated.Value(0)).current;
  const [chartHeight, setChartHeight] = useState(0);

  // inputRange dinámico basado en la altura real del chart
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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* ══════════════════════════════════════════════════════════════
          HEADER FIJO
          ══════════════════════════════════════════════════════════════ */}
      <View style={styles.staticHeader}>

        <View style={styles.headerOuter}>
          <View style={styles.headerLeft}>

            <View style={styles.balanceSection}>
              {/* Label — muestra conteo solo durante búsqueda */}
              <Text style={styles.balanceLabel}>
                {isSearching
                  ? `BÚSQUEDA  ·  ${searchedTransactions.length} resultado${searchedTransactions.length !== 1 ? "s" : ""}`
                  : "BALANCE NETO"}
              </Text>

              {/* Número principal — siempre el balance neto */}
              <Text style={[
                styles.balanceAmount,
                netBalance < 0 && styles.balanceNegative,
              ]}>
                {formatBalance(Math.abs(netBalance))}
              </Text>

              {/* Pills interactivos — filtro visual */}
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
                  <Text style={[
                    styles.pillGastoText,
                    typeFilter === "expense" && styles.pillGastoActiveText,
                  ]}>
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
                  <Text style={[
                    styles.pillIngresoText,
                    typeFilter === "income" && styles.pillIngresoActiveText,
                  ]}>
                    ↑  {formatBalance(incomeTotal)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Barra de presupuesto — solo en gastos o sin filtro */}
              {monthlyBudget > 0 && !isSearching && typeFilter === null && (
                <View style={styles.budgetBar}>
                  <View style={styles.budgetTrack}>
                    <View style={[
                      styles.budgetFill,
                      { width: `${budgetPct}%` as `${number}%` },
                    ]} />
                  </View>
                  <Text style={styles.budgetBarPct}>
                    {budgetPct}% de {formatBalance(monthlyBudget)}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Metas de ahorro — solo si hay alguna configurada ── */}
            {savingsGoals.length > 0 && (
              <View style={styles.goalsSection}>
                <Text style={styles.goalsLabel}>METAS DE AHORRO</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.goalsScroll}
                >
                  {savingsGoals.map((goal) => {
                    const pct = goal.targetAmount > 0
                      ? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100)
                      : 0;
                    const done = pct >= 100;
                    return (
                      <View key={goal.id} style={[styles.goalCard, done && styles.goalCardDone]}>
                        <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                        <View style={styles.goalTrack}>
                          <View style={[
                            styles.goalFill,
                            { width: `${pct}%` as `${number}%` },
                            done && styles.goalFillDone,
                          ]} />
                        </View>
                        <Text style={[styles.goalPct, done && styles.goalPctDone]}>
                          {done ? "✓ Completada" : `${pct}%  ·  $${Math.round(goal.savedAmount).toLocaleString("es-ES")}`}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <FilterChips
              period={period}
              onPeriodChange={setPeriod}
              category={category}
              onCategoryChange={setCategory}
            />
          </View>

          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
          >
            <Settings size={22} color={theme.text} strokeWidth={1.6} />
          </Pressable>
        </View>

      </View>

      {/* ══════════════════════════════════════════════════════════════
          SCROLL ÚNICO — chart + lista
          ══════════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        style={styles.txScrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        contentContainerStyle={[
          styles.txScrollContent,
          { paddingBottom: scrollBottomPadding(insets.bottom) },
        ]}
      >
        {/* Chart — visible en todos los modos excepto búsqueda */}
        {!isSearching && (
          <Animated.View style={[
            styles.chartWrapper,
            {
              maxHeight: chartHeight > 0 ? chartMaxHeight : undefined,
              opacity: chartOpacity,
              overflow: "hidden",
            },
          ]}>
            <View
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && h !== chartHeight) setChartHeight(h);
              }}
            >
              <CategoryChart
                stats={activeStats}
                allEmojis={allEmojis}
                totalExpenses={activeTotalForChart}
                budgetByCategory={activeBudget}
                onNewTransaction={handleNewTransactionFromChart}
                alertColors={typeFilter !== "income"}
              />
            </View>
          </Animated.View>
        )}

        {/* Lista de transacciones */}
        {displayedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{isSearching ? "🔍" : "💸"}</Text>
            <Text style={styles.emptyTitle}>
              {isSearching ? "Sin resultados" : "Sin gastos aún"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isSearching
                ? `No se encontró nada para "${searchQuery}"`
                : `Toca + o el micrófono para registrar tu primer gasto.`}
            </Text>
          </View>
        ) : (
          <View style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>
                {isSearching ? "RESULTADOS"
                  : typeFilter === "expense" ? "GASTOS"
                  : typeFilter === "income"  ? "INGRESOS"
                  : "RECIENTE"}
              </Text>
              <Text style={styles.dayLabelRight}>
                {isSearching
                  ? `${searchedTransactions.length} encontrados`
                  : period.toUpperCase()}
              </Text>
            </View>

            {displayedTransactions.map((tx, i) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                index={i}
                dimmed={false}
                onLongPress={deleteTransaction}
              />
            ))}

          </View>
        )}
      </Animated.ScrollView>
      {/* ══════════════════════════════════════════════════════════════
          BARRA DE BÚSQUEDA — overlay fijo encima del dock
          ══════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.searchBarOverlay,
          {
            bottom: Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 10,
            opacity: searchBarOpacity,
            transform: [{ translateY: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          },
        ]}
        pointerEvents={searchOpen ? "auto" : "none"}
      >
        <Search size={16} color="#9CA3AF" strokeWidth={2} style={{ marginLeft: 4 }} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Nombre, categoría o #tag..."
          placeholderTextColor="#C4C4C6"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchCancelBtn} onPress={closeSearch}>
          <X size={14} color="#555" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(t: AppTheme) { return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bg,
  },

  staticHeader: {},

  headerOuter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 20,
  },

  headerLeft: {
    flexDirection: "column",
    gap: 20,
    flex: 1,
  },

  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  balanceSection: {
    gap: 8,
  },

  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: t.textTertiary,
    letterSpacing: 2.0,
    textTransform: "uppercase",
  },

  balanceAmount: {
    fontSize: 44,
    fontWeight: "800",
    color: t.text,
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  balanceNegative: {
    color: "#DC2626",
  },

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
  pillGastoActive: {
    backgroundColor: "#FFE4E6",
  },
  pillGastoText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.text,
    letterSpacing: 0.1,
  },
  pillGastoActiveText: {
    color: "#DC2626",
    fontWeight: "700",
  },

  pillIngreso: {
    backgroundColor: t.pillNeutral,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillIngresoActive: {
    backgroundColor: "#DCFCE7",
  },
  pillIngresoText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.text,
    letterSpacing: 0.1,
  },
  pillIngresoActiveText: {
    color: "#16A34A",
    fontWeight: "700",
  },

  pillDimmed: {
    opacity: 0.4,
  },

  budgetBar: {
    gap: 5,
    width: "100%",
    marginTop: 8,
  },
  budgetBarPct: {
    fontSize: 11,
    fontWeight: "500",
    color: t.textSub,
    textAlign: "left",
    letterSpacing: 0.1,
  },
  budgetTrack: {
    height: 3,
    backgroundColor: t.border,
    borderRadius: 9999,
    overflow: "hidden",
    width: "100%",
  },
  budgetFill: {
    height: 3,
    borderRadius: 9999,
    backgroundColor: "#2D5BFF",
  },

  searchBarOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: t.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 90,
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

  chartWrapper: {
    marginBottom: 8,
  },

  txScrollView: {
    flex: 1,
  },

  txScrollContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  dayGroup: {
    marginBottom: 4,
    paddingHorizontal: 28,
    paddingTop: 4,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
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

  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: t.textSub,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: t.textTertiary,
    textAlign: "center",
    lineHeight: 21,
  },

  goalsSection: {
    gap: 8,
  },
  goalsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: t.textTertiary,
    letterSpacing: 2.0,
  },
  goalsScroll: {
    gap: 10,
    paddingRight: 4,
  },
  goalCard: {
    backgroundColor: t.surface,
    borderRadius: 16,
    padding: 14,
    width: 148,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  goalCardDone: {
    backgroundColor: t.isDark ? "#052e16" : "#F0FDF4",
  },
  goalEmoji: {
    fontSize: 22,
  },
  goalName: {
    fontSize: 13,
    fontWeight: "700",
    color: t.text,
    letterSpacing: -0.2,
  },
  goalTrack: {
    height: 4,
    backgroundColor: t.border,
    borderRadius: 9999,
    overflow: "hidden",
  },
  goalFill: {
    height: 4,
    backgroundColor: "#2D5BFF",
    borderRadius: 9999,
  },
  goalFillDone: {
    backgroundColor: "#16A34A",
  },
  goalPct: {
    fontSize: 11,
    fontWeight: "600",
    color: t.textSub,
  },
  goalPctDone: {
    color: "#16A34A",
  },
});}
