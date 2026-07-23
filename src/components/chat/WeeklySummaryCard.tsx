import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line as SvgLine,
  Rect,
} from "react-native-svg";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import type { WeeklySummaryCard as WeeklySummaryCardType } from "@/src/features/chat/useLocalNLP";
import { CARD_W, BLUE_CHAT } from "@/src/components/chat/chatConstants";
import { smoothPath } from "@/src/utils/chatHelpers";

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    card: {
      width: CARD_W,
      backgroundColor: t.surface,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    cardLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: t.textSub,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeUp: { backgroundColor: "#FFF1F2" },
    badgeDown: { backgroundColor: "#ECFDF5" },
    badgeText: { fontSize: 11, fontWeight: "700" },
    badgeTextUp: { color: "#E11D48" },
    badgeTextDown: { color: "#059669" },
    cardTotal: {
      fontSize: 36,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.8,
      marginTop: 2,
    },
    dayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
      paddingHorizontal: 2,
    },
    dayCell: { alignItems: "center", gap: 2, flex: 1 },
    dayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: BLUE_CHAT,
      marginBottom: 1,
    },
    dayLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: t.textSub,
      textAlign: "center",
    },
    dayLabelToday: { color: BLUE_CHAT, fontWeight: "800" },
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  card: WeeklySummaryCardType;
}

export function WeeklySummaryCard({ card }: Props) {
  const theme = useTheme();
  const c = useMemo(() => buildStyles(theme), [theme]);

  const { total, prevTotal, weekData } = card;
  const changePercent = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const isUp = changePercent >= 0;
  const fmt = (n: number) =>
    `$\u00A0${Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const chartW = CARD_W - 32;
  const chartH = 96;
  const padTop = 8;
  const innerH = chartH - padTop;
  const maxAmt = Math.max(...weekData.map((d) => d.amount), 1);
  const pts = weekData.map((d, i) => ({
    x: weekData.length === 1 ? chartW / 2 : (i / (weekData.length - 1)) * chartW,
    y: padTop + innerH - (d.amount / maxAmt) * innerH,
  }));
  const { line: linePath, area: areaPath } = smoothPath(pts);
  const todayIdx = weekData.findIndex((d) => d.isToday);

  return (
    <View style={c.card}>
      <View style={c.cardTopRow}>
        <Text style={c.cardLabel}>RESUMEN SEMANAL</Text>
        <View style={[c.badge, isUp ? c.badgeUp : c.badgeDown]}>
          {isUp ? (
            <TrendingUp size={11} color="#E11D48" strokeWidth={2.5} />
          ) : (
            <TrendingDown size={11} color="#059669" strokeWidth={2.5} />
          )}
          <Text style={[c.badgeText, isUp ? c.badgeTextUp : c.badgeTextDown]}>
            {isUp ? "+" : ""}
            {changePercent}%
          </Text>
        </View>
      </View>

      <Text style={c.cardTotal}>{fmt(total)}</Text>

      <View style={{ marginTop: 16 }}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BLUE_CHAT} stopOpacity="0.15" />
              <Stop offset="1" stopColor={BLUE_CHAT} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          {areaPath ? <Path d={areaPath} fill="url(#grad)" /> : null}

          {todayIdx >= 0 && (
            <Rect
              x={(pts[todayIdx]?.x ?? 0) - 12}
              y={0}
              width={24}
              height={chartH}
              fill={BLUE_CHAT}
              fillOpacity={0.06}
              rx={4}
            />
          )}

          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={theme.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {todayIdx >= 0 && pts[todayIdx] && (
            <SvgLine
              x1={pts[todayIdx].x}
              y1={pts[todayIdx].y}
              x2={pts[todayIdx].x}
              y2={chartH}
              stroke={BLUE_CHAT}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}
        </Svg>

        <View style={c.dayRow}>
          {weekData.map((d, i) => (
            <View key={i} style={c.dayCell}>
              {d.isToday && <View style={c.dayDot} />}
              <Text style={[c.dayLabel, d.isToday && c.dayLabelToday]}>{d.day}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
