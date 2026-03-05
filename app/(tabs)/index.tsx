import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings } from "lucide-react-native";
import { scrollBottomPadding } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { COLORS } from "@/src/constants/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-ES")}`;
}

function formatDayTotal(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString("es-ES")}`;
}

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];

function groupByDate(transactions: TxRow[]) {
  const groups: { label: string; total: number; items: TxRow[] }[] = [];
  const map = new Map<string, { label: string; total: number; items: TxRow[] }>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const tx of transactions) {
    const d = new Date(tx.date);
    let key: string;

    if (d.toDateString() === today.toDateString()) {
      key = "HOY";
    } else if (d.toDateString() === yesterday.toDateString()) {
      key = "AYER";
    } else {
      key = d
        .toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
        .toUpperCase()
        .replace(".", "");
    }

    if (!map.has(key)) {
      map.set(key, { label: key, total: 0, items: [] });
      groups.push(map.get(key)!);
    }
    const g = map.get(key)!;
    g.items.push(tx);
    g.total += tx.amount;
  }

  return groups;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const transactions = useFinanceStore((s) => s.transactions);
  const getTotalBalance = useFinanceStore((s) => s.getTotalBalance);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const budgetLimit = useFinanceStore((s) => s.budgetLimit);

  const total = getTotalBalance();
  const recentTransactions = transactions.slice(0, 30);

  const categoryStats = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = transactions.filter((t) => new Date(t.date) >= firstDay);

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

  const grouped = useMemo(
    () => groupByDate(recentTransactions),
    [recentTransactions]
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* ════════════════════════════════════════════════════════════════
          SECCIÓN ESTÁTICA — se queda fija mientras se hace scroll abajo
          ════════════════════════════════════════════════════════════════ */}
      <View style={styles.staticHeader}>
        {/* Balance + Settings */}
        <View style={styles.headerRow}>
          <Text style={styles.balanceAmount}>{formatBalance(total)}</Text>
          <Pressable style={styles.settingsBtn}>
            <Settings size={20} color={COLORS.slate700} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Chips de filtro */}
        <FilterChips />

        {/* Gráfica de categorías */}
        {categoryStats.length > 0 ? (
          <View style={styles.chartWrapper}>
            <CategoryChart stats={categoryStats} budgetLimit={budgetLimit} />
          </View>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Agrega gastos para ver tus categorías
            </Text>
          </View>
        )}
      </View>

      {/* ════════════════════════════════════════════════════════════════
          SECCIÓN SCROLL — solo la lista de transacciones se mueve
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
          grouped.map((group) => (
            <View key={group.label} style={styles.dayGroup}>
              {/* Cabecera de fecha */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{group.label}</Text>
                <Text style={styles.dayTotal}>{formatDayTotal(group.total)}</Text>
              </View>

              {/* Transacciones del día */}
              {group.items.map((tx, i) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  index={i}
                  dimmed={i > 0}
                  onLongPress={deleteTransaction}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // ── Cabecera fija ────────────────────────────────────────────────────────────
  staticHeader: {
    // Sin flex: toma solo el espacio que necesita y no hace scroll
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 8,
  },

  balanceAmount: {
    fontSize: 42,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: -1.05,
    lineHeight: 42,
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },

  chartWrapper: {
    marginBottom: 8,
  },

  chartPlaceholder: {
    marginHorizontal: 28,
    marginVertical: 20,
    height: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
  },

  chartPlaceholderText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // ── Lista con scroll ─────────────────────────────────────────────────────────
  txScrollView: {
    flex: 1, // ocupa todo el espacio restante
  },

  txScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 4,
  },

  dayGroup: {
    marginBottom: 8,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  dayLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(0,0,0,0.3)",
    letterSpacing: 1.65,
    lineHeight: 16.5,
  },

  dayTotal: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(0,0,0,0.3)",
    letterSpacing: -0.28,
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
