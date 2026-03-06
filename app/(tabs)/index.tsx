import { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings } from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { FilterChips, PERIODS } from "@/src/components/ui/FilterChips";
import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { COLORS, ALL_CATEGORY_EMOJIS } from "@/src/constants/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-ES")}`;
}

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];

function filterByPeriod(transactions: TxRow[], period: string): TxRow[] {
  const now = new Date();
  const todayStart    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart     = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart     = new Date(now.getFullYear(), 0, 1);

  return transactions.filter((tx) => {
    const d = new Date(tx.date);
    switch (period) {
      case "Hoy":          return d >= todayStart;
      case "Ayer":         return d >= yesterdayStart && d < todayStart;
      case "Esta semana":  return d >= weekStart;
      case "Este mes":     return d >= monthStart;
      case "Este año":     return d >= yearStart;
      default:             return true; // "Todo"
    }
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets            = useSafeAreaInsets();
  const transactions      = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  // Estado del filtro de periodo — "Este mes" por defecto
  const [period,   setPeriod]   = useState(PERIODS[3]); // "Este mes"
  // Estado del filtro de categoría — null = Todas
  const [category, setCategory] = useState<string | null>(null);

  // ── Balance animado (Gastos / Ingresos) ──────────────────────────────────────
  const [showIncome, setShowIncome] = useState(false);
  const translateY  = useRef(new Animated.Value(0)).current;
  const balanceOpacity = useRef(new Animated.Value(1)).current;
  const swipeStartY = useRef(0);

  const { expenseTotal, incomeTotal } = useMemo(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = transactions.filter(t => new Date(t.date) >= start);
    const exp   = month.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const inc   = month.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { expenseTotal: exp, incomeTotal: inc };
  }, [transactions]);

  const doSwitchBalance = (toIncome: boolean) => {
    if (toIncome === showIncome) return;
    const outDir = toIncome ? -1 : 1; // swipe up = salir hacia arriba
    Animated.parallel([
      Animated.timing(translateY,    { toValue: outDir * 22, duration: 160, useNativeDriver: true }),
      Animated.timing(balanceOpacity, { toValue: 0,           duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setShowIncome(toIncome);
      translateY.setValue(-outDir * 22);
      balanceOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(balanceOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── Filtros de período + categoría ──────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let list = filterByPeriod(transactions, period);
    if (category) list = list.filter((t) => t.category_emoji === category);
    return list;
  }, [transactions, period, category]);
  const recentTransactions = filteredTransactions.slice(0, 3);

  // ── Stats del chart (solo gastos del mes actual) ─────────────────────────────
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

  // Todas las categorías conocidas + emojis custom que vengan de transacciones
  const allEmojis = useMemo(() => {
    const known = new Set(ALL_CATEGORY_EMOJIS);
    const extra = [...new Set(
      transactions.map(t => t.category_emoji).filter(e => !known.has(e))
    )];
    return [...ALL_CATEGORY_EMOJIS, ...extra];
  }, [transactions]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F4" />

      {/* ════════════════════════════════════════════════════════════════
          SECCIÓN ESTÁTICA — se queda fija mientras se hace scroll abajo
          ════════════════════════════════════════════════════════════════ */}
      <View style={styles.staticHeader}>

        {/* ── Header: [col izq: Balance + Chips] [der: Settings] ── */}
        <View style={styles.headerOuter}>
          <View style={styles.headerLeft}>

            {/* Balance animado — swipe ↑ para ingresos, ↓ para gastos */}
            <Animated.View
              style={[
                styles.balanceSwipeArea,
                { transform: [{ translateY }], opacity: balanceOpacity },
              ]}
              onTouchStart={(e) => { swipeStartY.current = e.nativeEvent.pageY; }}
              onTouchEnd={(e) => {
                const delta = e.nativeEvent.pageY - swipeStartY.current;
                if (delta < -25)      doSwitchBalance(true);
                else if (delta > 25)  doSwitchBalance(false);
              }}
            >
              <Text style={[
                styles.balanceTypeLabel,
                showIncome && styles.balanceTypeLabelIncome,
              ]}>
                {showIncome ? "▲  INGRESOS" : "▼  GASTOS"}
              </Text>
              <Text style={[
                styles.balanceAmount,
                showIncome && styles.balanceAmountIncome,
              ]}>
                {formatBalance(showIncome ? incomeTotal : expenseTotal)}
              </Text>
              <Text style={styles.balanceHint}>
                {showIncome ? "desliza ↓ para gastos" : "desliza ↑ para ingresos"}
              </Text>
            </Animated.View>

            <FilterChips
              period={period}
              onPeriodChange={setPeriod}
              category={category}
              onCategoryChange={setCategory}
            />
          </View>

          <Pressable style={styles.settingsBtn}>
            <Settings size={22} color="#000000" strokeWidth={1.6} />
          </Pressable>
        </View>

        {/* Gráfica de categorías — siempre visible */}
        <View style={styles.chartWrapper}>
          <CategoryChart
            stats={categoryStats}
            allEmojis={allEmojis}
            totalExpenses={totalExpenses}
          />
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          SECCIÓN SCROLL — lista reciente (máx 2) + Ver más
          ════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.txScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.txScrollContent,
          { paddingBottom: scrollBottomPadding(insets.bottom) },
        ]}
      >
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💸</Text>
            <Text style={styles.emptyTitle}>Sin gastos aún</Text>
            <Text style={styles.emptySubtitle}>
              Toca <Text style={{ fontWeight: "700" }}>+</Text> o el micrófono
              para registrar tu primer gasto.
            </Text>
          </View>
        ) : (
          <View style={styles.dayGroup}>
            {/* Header RECIENTE · período activo */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>RECIENTE</Text>
              <Text style={styles.dayLabelRight}>{period.toUpperCase()}</Text>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={styles.periodEmpty}>
                <Text style={styles.periodEmptyText}>
                  Sin registros para "{period}"
                </Text>
              </View>
            ) : (
              recentTransactions.map((tx, i) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  index={i}
                  dimmed={false}
                  onLongPress={deleteTransaction}
                />
              ))
            )}

            {/* Ver más — aparece siempre que haya transacciones */}
            {transactions.length > 0 && (
              <View style={styles.verMasRow}>
                <Pressable
                  onPress={() => router.push("/analytics")}
                  style={({ pressed }) => [
                    styles.verMasBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.verMasText}>Ver más</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Stitch JSX: background '#F2F2F4'
  screen: {
    flex: 1,
    backgroundColor: "#F2F2F4",
  },

  // ── Cabecera fija ────────────────────────────────────────────────────────────
  staticHeader: {},

  // Stitch JSX: flexRow, justifyContent space-between, alignItems flex-start
  // paddingH 28, paddingTop 16, paddingBottom 48
  headerOuter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Stitch JSX: flexColumn, gap 32
  headerLeft: {
    flexDirection: "column",
    gap: 32,
    flex: 1,
  },

  balanceSwipeArea: {
    // área táctil para el swipe
  },

  balanceTypeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  balanceTypeLabelIncome: {
    color: "#059669",
  },

  // Stitch JSX: fontSize 48, fontWeight 800, letterSpacing -1.2, lineHeight 48
  balanceAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: -1.2,
    lineHeight: 52,
  },
  balanceAmountIncome: {
    color: "#059669",
  },

  balanceHint: {
    fontSize: 11,
    color: "#C4C4C6",
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Stitch JSX: 40×40, solo icono, sin fondo ni sombra
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  chartWrapper: {
    marginBottom: 8,
  },

  // ── Lista con scroll ─────────────────────────────────────────────────────────
  txScrollView: {
    flex: 1,
  },

  txScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 4,
  },

  dayGroup: {
    marginBottom: 4,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  // Stitch JSX: fontSize 12, fontWeight 900, letterSpacing 2.4
  dayLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 2.4,
    lineHeight: 18,
  },

  dayLabelRight: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 1,
  },

  // "Ver más" — siempre a la derecha
  verMasRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  verMasBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  verMasText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: 0.1,
  },

  // Estado vacío para el período seleccionado
  periodEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  periodEmptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  // ── Estado vacío ─────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.slate700,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: COLORS.slate400,
    textAlign: "center",
    lineHeight: 21,
  },
});
