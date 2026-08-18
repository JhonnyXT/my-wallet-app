/**
 * app/reports.tsx — Modal de Reportes
 * Pantalla de un solo propósito: promedio de gasto/ingreso mensual histórico por categoría.
 * Sin filtro de período global — el promedio y el ranking siempre son sobre todo el
 * historial (más simple, más honesto: "promedio" implica todo el histórico, no un recorte).
 * El único control de período vive dentro de la tarjeta "Tendencia", acotando solo esa
 * gráfica de barras mensuales — patrón "Monthly ▾" dentro del propio gráfico, no chips
 * globales arriba de la pantalla.
 */
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Card, Divider } from "@/src/components/ui/Card";
import { DateRangeSheet } from "@/src/components/ui/DateRangeSheet";
import { Enter } from "@/src/components/ui/Enter";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { StackedScreenHeader } from "@/src/components/ui/StackedScreenHeader";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { getCategoryColor, getCategoryName } from "@/src/constants/theme";
import {
  queryCategoryMonthlyAverages,
  queryMonthlyTotalsInRange,
  type CategoryAverage,
  type MonthlyTotal,
} from "@/src/db/queries";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import { formatCOP } from "@/src/utils/formatMoney";

type ReportType = "expense" | "income";

const MONTH_ABBR = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function defaultTrendRange() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { start, end };
}

const RING_SIZE = 116;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export default function ReportsScreen() {
  const tokens = useAppTokens();
  const styles = useMemo(() => buildStyles(), []);
  const transactions = useFinanceStore((s) => s.transactions);
  const userCategories = useSettingsStore((s) => s.userCategories);

  const [type, setType] = useState<ReportType>("expense");
  const [averages, setAverages] = useState<{ months: number; items: CategoryAverage[] } | null>(null);
  const [trendRange, setTrendRange] = useState(defaultTrendRange);
  const [trendSheetOpen, setTrendSheetOpen] = useState(false);
  const [trend, setTrend] = useState<MonthlyTotal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    queryCategoryMonthlyAverages(type).then((result) => {
      if (!cancelled) setAverages(result);
    });
    return () => {
      cancelled = true;
    };
  }, [type, transactions]);

  useEffect(() => {
    let cancelled = false;
    setTrend(null);
    queryMonthlyTotalsInRange(type, trendRange.start, trendRange.end).then((result) => {
      if (!cancelled) setTrend(result);
    });
    return () => {
      cancelled = true;
    };
  }, [type, trendRange, transactions]);

  const items = averages?.items ?? [];
  const hasData = items.length > 0;
  const months = averages?.months ?? 0;
  const topItem = items[0];
  const secondaryItems = items.slice(1, 3);
  const totalAvg = items.reduce((s, i) => s + i.avgMonthly, 0);
  const topSharePct = totalAvg > 0 && topItem ? topItem.avgMonthly / totalAvg : 0;
  const ringOffset = RING_CIRC * (1 - topSharePct);
  const maxItemAvg = topItem?.avgMonthly ?? 0;

  const maxTrend = trend ? Math.max(...trend.map((t) => t.total), 1) : 1;
  const trendRangeLabel = `${MONTH_ABBR[trendRange.start.getMonth()]} ${trendRange.start.getFullYear()} – ${MONTH_ABBR[trendRange.end.getMonth()]} ${trendRange.end.getFullYear()}`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.colors.surface.primary }]} edges={["top"]}>
      <StackedScreenHeader title="Promedios" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: tokens.spacing.md, gap: tokens.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Enter index={0}>
          <View
            style={[
              styles.typeToggle,
              {
                backgroundColor: tokens.colors.surface.secondary,
                borderRadius: tokens.radius.full,
                borderWidth: 1.5,
                borderColor: tokens.colors.border.default,
              },
            ]}
          >
            <TypeSegment
              label="Gastos"
              kind="expense"
              active={type === "expense"}
              onPress={() => setType("expense")}
            />
            <TypeSegment
              label="Ingresos"
              kind="income"
              active={type === "income"}
              onPress={() => setType("income")}
            />
          </View>
        </Enter>

        {hasData ? (
          <>
            {/* ── Hero: anillo + estadísticas ─────────────────────────────── */}
            <Enter index={1}>
              <Card style={{ borderRadius: tokens.radius.xl }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
                  <View style={{ flex: 1, gap: tokens.spacing.md }}>
                    <View>
                      <ThemedText variant="headline" style={{ fontSize: 17 }}>
                        Promedio mensual
                      </ThemedText>
                      <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                        {type === "expense" ? "Gastos generales" : "Ingresos generales"}
                      </ThemedText>
                    </View>

                    <HeroStatRow
                      icon={topItem.emoji}
                      label="Categoría top"
                      value={getCategoryName(topItem.emoji, userCategories)}
                    />
                    <HeroStatRow
                      icon="📅"
                      label="Analizados"
                      value={`${months} ${months === 1 ? "mes" : "meses"}`}
                    />
                  </View>

                  <View style={{ width: RING_SIZE, height: RING_SIZE }}>
                    <Svg width={RING_SIZE} height={RING_SIZE}>
                      <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RING_RADIUS}
                        stroke={tokens.colors.surface.elevated}
                        strokeWidth={RING_STROKE}
                        fill="none"
                      />
                      <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RING_RADIUS}
                        stroke={tokens.colors.accent.default}
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                        strokeDashoffset={ringOffset}
                        fill="none"
                        rotation={-90}
                        originX={RING_SIZE / 2}
                        originY={RING_SIZE / 2}
                      />
                    </Svg>
                    <View style={styles.ringCenter}>
                      <ThemedText
                        style={{ fontSize: 15, fontWeight: "800", textAlign: "center" }}
                        numberOfLines={1}
                      >
                        {formatCOP(totalAvg)}
                      </ThemedText>
                      <ThemedText variant="footnote" color="secondary" style={{ fontSize: 10 }}>
                        /mes
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </Card>
            </Enter>

            {/* ── Tarjetas secundarias: #2 y #3 ───────────────────────────── */}
            {secondaryItems.length > 0 ? (
              <Enter index={2}>
                <View style={{ flexDirection: "row", gap: tokens.spacing.sm }}>
                  {secondaryItems.map((item) => (
                    <SecondaryStatCard
                      key={item.emoji}
                      item={item}
                      maxAvg={maxItemAvg}
                      name={getCategoryName(item.emoji, userCategories)}
                    />
                  ))}
                </View>
              </Enter>
            ) : null}
          </>
        ) : null}

        {/* ── Tendencia: barras mensuales + selector interno ─────────────── */}
        <Enter index={3}>
          <Card style={{ borderRadius: tokens.radius.xl }}>
            <View style={styles.trendHeader}>
              <View>
                <ThemedText variant="headline" style={{ fontSize: 17 }}>
                  Tendencia
                </ThemedText>
                <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }} numberOfLines={1}>
                  {trendRangeLabel}
                </ThemedText>
              </View>
              <PressableScale
                onPress={() => setTrendSheetOpen(true)}
                style={[styles.trendChip, { backgroundColor: tokens.colors.surface.elevated }]}
              >
                <ThemedText variant="footnote" style={{ fontWeight: "600" }}>
                  {trend?.length ?? 0} {trend?.length === 1 ? "mes" : "meses"}
                </ThemedText>
                <ChevronDown size={13} color={tokens.colors.text.secondary} strokeWidth={2} />
              </PressableScale>
            </View>

            {trend ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.trendBars, { minWidth: "100%" }]}>
                  {trend.map((t, i) => {
                    const isLast = i === trend.length - 1;
                    const h = Math.max(Math.round((t.total / maxTrend) * 96), t.total > 0 ? 10 : 4);
                    return (
                      <View key={`${t.year}-${t.month}`} style={styles.trendCol}>
                        <View
                          style={{
                            width: 10,
                            height: h,
                            borderRadius: 999,
                            backgroundColor: isLast
                              ? tokens.colors.accent.default
                              : tokens.colors.surface.elevated,
                          }}
                        />
                        <ThemedText
                          variant="footnote"
                          color={isLast ? "primary" : "secondary"}
                          style={{ fontSize: 10, fontWeight: isLast ? "700" : "400", marginTop: 6 }}
                        >
                          {MONTH_ABBR[t.month - 1]}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </Card>
        </Enter>

        {/* ── Ranking completo ────────────────────────────────────────────── */}
        <Enter index={4}>
          <Card padded={false}>
            <View style={{ padding: tokens.spacing.md, paddingBottom: tokens.spacing.sm }}>
              <ThemedText variant="footnote" color="secondary" style={styles.eyebrow}>
                Ranking de categorías
              </ThemedText>
            </View>

            {!hasData ? (
              <View style={styles.emptyBox}>
                <ThemedText variant="body" color="secondary" style={{ textAlign: "center" }}>
                  Aún no hay suficiente historial para calcular promedios.
                </ThemedText>
              </View>
            ) : (
              <View>
                {items.map((item, i) => (
                  <View key={item.emoji}>
                    {i > 0 ? <Divider /> : null}
                    <AverageRow
                      item={item}
                      maxAvg={maxItemAvg}
                      name={getCategoryName(item.emoji, userCategories)}
                    />
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Enter>
      </ScrollView>

      {/* Calendario de rango: acota solo la tarjeta de tendencia */}
      <DateRangeSheet
        visible={trendSheetOpen}
        initialStart={trendRange.start}
        initialEnd={trendRange.end}
        onApply={(start, end) => {
          setTrendRange({ start: new Date(start.getFullYear(), start.getMonth(), 1), end: new Date(end.getFullYear(), end.getMonth(), 1) });
          setTrendSheetOpen(false);
        }}
        onClose={() => setTrendSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

// Mismos colores que los pills "↓ Gasto / ↑ Ingreso" del Dashboard (app/(tabs)/index.tsx) —
// rojo claro para gasto, verde claro para ingreso, iguales en light y dark.
const SEGMENT_COLORS = {
  expense: { bg: "#FEE2E2", text: "#E53E3E" },
  income: { bg: "#DCFCE7", text: "#16A34A" },
} as const;

function TypeSegment({
  label,
  kind,
  active,
  onPress,
}: {
  label: string;
  kind: "expense" | "income";
  active: boolean;
  onPress: () => void;
}) {
  const tokens = useAppTokens();
  const colors = SEGMENT_COLORS[kind];
  return (
    <PressableScale
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={{
        flex: 1,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.full,
        alignItems: "center",
        backgroundColor: active ? colors.bg : "transparent",
      }}
    >
      <ThemedText
        variant="subheadline"
        style={{
          fontWeight: "700",
          color: active ? colors.text : tokens.colors.text.secondary,
        }}
      >
        {label}
      </ThemedText>
    </PressableScale>
  );
}

function HeroStatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const tokens = useAppTokens();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.surface.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ThemedText style={{ fontSize: 14 }}>{icon}</ThemedText>
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <ThemedText variant="footnote" color="secondary" numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="body" style={{ fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function SecondaryStatCard({
  item,
  maxAvg,
  name,
}: {
  item: CategoryAverage;
  maxAvg: number;
  name: string;
}) {
  const tokens = useAppTokens();
  const pct = maxAvg > 0 ? Math.max(Math.round((item.avgMonthly / maxAvg) * 100), 4) : 0;
  return (
    <Card style={{ flex: 1, borderRadius: tokens.radius.xl, gap: tokens.spacing.xs }}>
      <ThemedText variant="body" style={{ fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
        {name}
      </ThemedText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.xs }}>
        <ThemedText style={{ fontSize: 16 }}>{item.emoji}</ThemedText>
        <ThemedText variant="headline" style={{ fontSize: 16 }} numberOfLines={1}>
          {formatCOP(item.avgMonthly)}
        </ThemedText>
      </View>
      <ThemedText variant="footnote" color="secondary" style={{ fontSize: 11 }}>
        Promedio mensual
      </ThemedText>
      <View
        style={{
          height: 5,
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.surface.elevated,
          overflow: "hidden",
          marginTop: 2,
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: tokens.radius.full,
            backgroundColor: tokens.colors.accent.default,
          }}
        />
      </View>
    </Card>
  );
}

function AverageRow({
  item,
  maxAvg,
  name,
}: {
  item: CategoryAverage;
  maxAvg: number;
  name: string;
}) {
  const tokens = useAppTokens();
  const colors = getCategoryColor(item.emoji);
  const pct = maxAvg > 0 ? Math.max(Math.round((item.avgMonthly / maxAvg) * 100), 4) : 0;
  return (
    <View style={{ gap: tokens.spacing.sm, padding: tokens.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: tokens.radius.full,
              backgroundColor: colors.bg,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ThemedText style={{ fontSize: 18 }}>{item.emoji}</ThemedText>
          </View>
          <ThemedText variant="body" numberOfLines={1}>
            {name}
          </ThemedText>
        </View>
        <ThemedText variant="body" numberOfLines={1}>
          <ThemedText variant="body" style={{ fontWeight: "700" }}>
            {formatCOP(item.avgMonthly)}
          </ThemedText>
          <ThemedText variant="footnote" color="secondary">
            /mes
          </ThemedText>
        </ThemedText>
      </View>
      <View
        style={{
          height: 6,
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.surface.elevated,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: tokens.radius.full,
            backgroundColor: tokens.colors.accent.default,
          }}
        />
      </View>
    </View>
  );
}

function buildStyles() {
  return StyleSheet.create({
    screen: { flex: 1 },
    typeToggle: {
      flexDirection: "row",
      padding: 4,
      gap: 4,
    },
    ringCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    trendHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    trendChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    trendBars: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-evenly",
      gap: 4,
    },
    trendCol: {
      alignItems: "center",
      width: 32,
    },
    eyebrow: {
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    emptyBox: {
      paddingVertical: 32,
      paddingHorizontal: 16,
      alignItems: "center",
    },
  });
}
