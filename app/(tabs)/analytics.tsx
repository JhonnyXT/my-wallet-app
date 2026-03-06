import { useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { scrollBottomPadding } from "@/src/constants/layout";
import type { TransactionRow } from "@/src/db/db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SectionData {
  title: string;
  total: number;
  data: TransactionRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getGroupKey(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const dDay = startOfDay(d);
  const todayDay = startOfDay(now);
  const diffDays = Math.round(
    (todayDay.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "HOY";
  if (diffDays === 1) return "AYER";
  if (diffDays <= 7) return "ESTA SEMANA";

  // Same calendar month (but more than 7 days ago)
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  ) {
    return "ESTE MES";
  }

  // Same calendar year (different month) → show month name
  if (d.getFullYear() === now.getFullYear()) {
    return d
      .toLocaleDateString("es-ES", { month: "long" })
      .toUpperCase();
  }

  // Older than this year → "MMM YYYY"
  return d
    .toLocaleDateString("es-ES", { month: "short", year: "numeric" })
    .toUpperCase()
    .replace(".", "");
}

// Defined order for standard period keys
const PERIOD_ORDER = ["HOY", "AYER", "ESTA SEMANA", "ESTE MES", "ESTE AÑO"];

function buildSections(transactions: TransactionRow[]): SectionData[] {
  const map = new Map<string, SectionData>();
  const order: string[] = [];

  for (const tx of transactions) {
    const key = getGroupKey(tx.date);
    if (!map.has(key)) {
      map.set(key, { title: key, total: 0, data: [] });
      order.push(key);
    }
    const section = map.get(key)!;
    section.data.push(tx);
    section.total += tx.amount;
  }

  return order.map((k) => map.get(k)!);
}

function formatTotal(amount: number): string {
  return `$ ${Math.round(Math.abs(amount)).toLocaleString("es-ES")}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const transactions = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  const sections = useMemo(
    () => buildSections(transactions),
    [transactions]
  );

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.navigate("/")}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.55 }]}
          hitSlop={12}
        >
          <ChevronLeft size={24} color="#0F172A" strokeWidth={2.5} />
        </Pressable>
        <Text style={s.headerTitle}>Historial</Text>
        {/* spacer */}
        <View style={s.backBtn} />
      </View>

      {/* ── Lista agrupada ─────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>💸</Text>
          <Text style={s.emptyTitle}>Sin transacciones aún</Text>
          <Text style={s.emptySubtitle}>
            Toca <Text style={{ fontWeight: "700" }}>+</Text> o el micrófono
            para registrar tu primer gasto.
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: "#F8F9FA",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
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
