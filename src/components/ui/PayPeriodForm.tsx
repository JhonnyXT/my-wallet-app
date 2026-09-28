/**
 * PayPeriodForm — "cada cuánto y cuánto te pagan": frecuencia (semanal, cada 2 semanas,
 * varias veces al mes, mensual con día de inicio, todo el tiempo), sus ajustes y el pago
 * esperado. Cada ajuste abre una "página" dentro del mismo formulario (no una hoja encima
 * de otra: dos Modal apilados en Android se comportan mal).
 *
 * Lo usan la hoja "Pago y período" (DefaultPeriodSheet: Ajustes y menú del calendario) y
 * el paso del onboarding (app/pay-onboarding.tsx). Mantiene su propio borrador desde
 * `initial`: para reiniciarlo, el padre lo remonta con otra `key`.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, ChevronDown, ChevronLeft, Plus } from "lucide-react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { PeriodStrip } from "@/src/components/ui/PeriodStrip";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { buildCycleItems, earliestDate } from "@/src/hooks/useTransactionFilters";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useAppTokens } from "@/src/theme/tokens";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { formatBalance } from "@/src/utils/transactionFormatters";
import {
  cadenceLabel,
  cycleStartContaining,
  MONTH_SHORT,
  toYMD,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  type PeriodCadence,
} from "@/src/utils/periodCycles";

const PRIMARY = "#135BEC";

type Page = "main" | "frequency" | "weekday" | "anchor" | "offset" | "semiDays" | "pay";
type CadenceType = PeriodCadence["type"];

const FREQUENCIES: { type: CadenceType; title: string; description: string }[] = [
  { type: "weekly", title: "Semanal", description: "Intervalo fijo de 7 días" },
  { type: "biweekly", title: "Cada 2 semanas", description: "Intervalo fijo de 14 días" },
  {
    type: "semimonthly",
    title: "Varias veces al mes",
    description: "p. ej. quincenal, o los días que te paguen",
  },
  { type: "monthly", title: "Mensual", description: "Intervalo mensual con inicio flexible" },
  { type: "all", title: "Todo el tiempo", description: "Sin cortes: todo tu historial junto" },
];

// Lunes primero, como en el resto de calendarios de la app.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function weekStartDate(weekStartsOn: number, now: Date): Date {
  return cycleStartContaining({ type: "weekly", weekStartsOn }, now);
}

function shortDate(d: Date): string {
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** Pago del mes completo, si la frecuencia es mensual (mensual, todo el tiempo, quincenal). */
function monthlyPayOf(c: PeriodCadence): number | undefined {
  if (c.type === "monthly" || c.type === "all") return c.pay;
  if (c.type === "semimonthly" && c.pay) {
    const total = Object.values(c.pay).reduce((a, b) => a + b, 0);
    return total > 0 ? total : undefined;
  }
  return undefined;
}

/**
 * Valores por defecto al cambiar de frecuencia. El pago se conserva cuando la conversión
 * es exacta (mensual ↔ quincenal ↔ todo el tiempo, semanal ↔ cada 2 semanas); entre
 * frecuencias que no cuadran (mensual → semanal) se deja vacío para que lo escriban.
 */
function defaultsFor(type: CadenceType, prev: PeriodCadence, now: Date): PeriodCadence {
  if (type === prev.type) return prev;
  const monthly = monthlyPayOf(prev);
  switch (type) {
    case "weekly":
      return {
        type,
        weekStartsOn: 1,
        pay: prev.type === "biweekly" && prev.pay ? Math.round(prev.pay / 2) : undefined,
      };
    case "biweekly":
      return {
        type,
        weekStartsOn: 1,
        anchor: toYMD(weekStartDate(1, now)),
        pay: prev.type === "weekly" && prev.pay ? prev.pay * 2 : undefined,
      };
    case "semimonthly": {
      if (!monthly) return { type, days: [1, 16] };
      const half = Math.round(monthly / 2);
      return { type, days: [1, 16], pay: { "1": half, "16": monthly - half } };
    }
    case "monthly":
      return { type, startDay: 1, pay: monthly };
    case "all":
      return { type, pay: monthly };
  }
}

function payLabel(c: PeriodCadence): string {
  if (c.type === "semimonthly") {
    const amounts = [...c.days].sort((a, b) => a - b).map((d) => c.pay?.[String(d)] ?? 0);
    if (amounts.every((a) => a <= 0)) return "Agregar";
    return amounts.length <= 2
      ? amounts.map((a) => formatBalance(a)).join(" + ")
      : `${amounts.length} montos`;
  }
  return c.pay ? formatBalance(c.pay) : "Agregar";
}

function payHint(c: PeriodCadence): string {
  switch (c.type) {
    case "weekly":
      return "Lo que recibes cada semana.";
    case "biweekly":
      return "Lo que recibes cada 2 semanas.";
    case "semimonthly":
      return "Lo que recibes en cada día de pago.";
    case "monthly":
      return c.startDay > 1
        ? `Lo que recibes cada mes, el día ${c.startDay}.`
        : "Lo que recibes cada mes.";
    case "all":
      return "Lo que recibes al mes.";
  }
}

function semiDaysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length <= 1) return `día ${sorted[0] ?? 1}`;
  return `días ${sorted.slice(0, -1).join(", ")} y ${sorted[sorted.length - 1]}`;
}

export function PayPeriodForm({
  initial,
  onApply,
  showHeader = true,
  showPreview = true,
  renderActions,
}: {
  initial: PeriodCadence;
  onApply: (cadence: PeriodCadence) => void;
  /** Título y descripción propios (la pantalla de onboarding trae los suyos). */
  showHeader?: boolean;
  /** Tira de vista previa con los ciclos reales (sin datos todavía no aporta). */
  showPreview?: boolean;
  /** Reemplaza el botón "Aplicar" de la página principal (ej. "Omitir" + "Continuar"). */
  renderActions?: (apply: () => void) => ReactNode;
}) {
  const tokens = useAppTokens();
  const reducedMotion = useReducedMotion();
  const transactions = useFinanceStore((s) => s.transactions);

  const [draft, setDraft] = useState<PeriodCadence>(initial);
  const [page, setPage] = useState<Page>("main");
  const [semiDraft, setSemiDraft] = useState<number[]>([1, 16]);
  // Montos escritos en la página "Cuánto te pagan", ya con puntos de miles. Clave "main"
  // para frecuencias de un solo monto; el día ("1", "16"…) en varias veces al mes.
  const [payDraft, setPayDraft] = useState<Record<string, string>>({});
  const now = useMemo(() => new Date(), []);

  const earliest = useMemo(() => earliestDate(transactions), [transactions]);
  const preview = useMemo(() => {
    if (!showPreview || draft.type === "all") return null;
    return buildCycleItems(draft, transactions, earliest, now, 1);
  }, [draft, transactions, earliest, now, showPreview]);

  const go = (p: Page) => {
    Haptics.selectionAsync();
    setPage(p);
  };

  const apply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply(draft);
  };

  // ─── Piezas ────────────────────────────────────────────────────────────────

  const settingRow = (label: string, value: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      android_ripple={{ color: tokens.colors.surface.elevated }}
      style={styles.settingRow}
    >
      <ThemedText variant="body" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <ThemedText variant="body" color="secondary" numberOfLines={1}>
        {value}
      </ThemedText>
      <ChevronDown size={16} color={tokens.colors.text.secondary} strokeWidth={2} />
    </Pressable>
  );

  const pageHeader = (title: string) => (
    <View style={styles.pageHeader}>
      <Pressable
        onPress={() => go("main")}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <ChevronLeft size={22} color={tokens.colors.text.primary} strokeWidth={2} />
      </Pressable>
      <ThemedText variant="headline" style={{ fontSize: 17 }}>
        {title}
      </ThemedText>
    </View>
  );

  const optionRow = (
    key: string,
    title: string,
    selected: boolean,
    onPress: () => void,
    description?: string,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      android_ripple={{ color: tokens.colors.surface.elevated }}
      style={[styles.optionRow, { borderRadius: tokens.radius.md }]}
    >
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" style={{ fontWeight: selected ? "700" : "500" }}>
          {title}
        </ThemedText>
        {description && (
          <ThemedText variant="footnote" color="secondary">
            {description}
          </ThemedText>
        )}
      </View>
      {selected && <Check size={18} color={tokens.colors.text.accent} strokeWidth={2.4} />}
    </Pressable>
  );

  const dayGrid = (selected: number[], onTap: (day: number) => void) => (
    <View style={styles.grid}>
      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
        const isSel = selected.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => onTap(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            accessibilityLabel={`Día ${day}`}
            style={styles.gridCell}
          >
            <View
              style={[
                styles.gridCircle,
                isSel && { backgroundColor: tokens.colors.accent.default },
              ]}
            >
              <ThemedText
                variant="body"
                style={[{ fontSize: 15 }, isSel && { color: "#FFFFFF", fontWeight: "700" }]}
              >
                {day}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  // ─── Páginas ───────────────────────────────────────────────────────────────

  let content: ReactNode;

  if (page === "frequency") {
    content = (
      <>
        {pageHeader("Frecuencia")}
        {FREQUENCIES.map((f) =>
          optionRow(
            f.type,
            f.title,
            draft.type === f.type,
            () => {
              Haptics.selectionAsync();
              setDraft((prev) => defaultsFor(f.type, prev, now));
              setPage("main");
            },
            f.description,
          ),
        )}
      </>
    );
  } else if (page === "weekday" && (draft.type === "weekly" || draft.type === "biweekly")) {
    content = (
      <>
        {pageHeader("Inicio de la semana")}
        {WEEK_ORDER.map((wd) =>
          optionRow(
            `wd-${wd}`,
            WEEKDAY_LONG[wd].charAt(0).toUpperCase() + WEEKDAY_LONG[wd].slice(1),
            draft.weekStartsOn === wd,
            () => {
              Haptics.selectionAsync();
              setDraft(
                draft.type === "weekly"
                  ? { ...draft, weekStartsOn: wd }
                  : { ...draft, weekStartsOn: wd, anchor: toYMD(weekStartDate(wd, now)) },
              );
              setPage("main");
            },
          ),
        )}
      </>
    );
  } else if (page === "anchor" && draft.type === "biweekly") {
    const thisWeek = weekStartDate(draft.weekStartsOn, now);
    const lastWeek = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7);
    content = (
      <>
        {pageHeader("El ciclo actual empieza")}
        {[thisWeek, lastWeek].map((d, i) =>
          optionRow(
            toYMD(d),
            shortDate(d),
            cycleStartContaining(draft, now).getTime() === d.getTime(),
            () => {
              Haptics.selectionAsync();
              setDraft({ ...draft, anchor: toYMD(d) });
              setPage("main");
            },
            i === 0 ? "Esta semana" : "La semana pasada",
          ),
        )}
      </>
    );
  } else if (page === "offset" && draft.type === "monthly") {
    content = (
      <>
        {pageHeader("Desfase")}
        <ThemedText
          variant="footnote"
          color="secondary"
          style={{ marginBottom: tokens.spacing.sm }}
        >
          El día en que empieza tu mes, por ejemplo el día que te pagan.
        </ThemedText>
        {dayGrid([draft.startDay], (day) => {
          Haptics.selectionAsync();
          setDraft({ ...draft, startDay: day });
          setPage("main");
        })}
      </>
    );
  } else if (page === "pay") {
    const slots =
      draft.type === "semimonthly"
        ? [...draft.days].sort((a, b) => a - b).map((d) => ({ key: String(d), label: `Día ${d}` }))
        : [{ key: "main", label: "" }];
    const savePay = () => {
      const parse = (k: string) => Number((payDraft[k] ?? "").replace(/\D/g, "")) || 0;
      if (draft.type === "semimonthly") {
        const pay: Record<string, number> = {};
        for (const { key } of slots) if (parse(key) > 0) pay[key] = parse(key);
        setDraft({ ...draft, pay });
      } else {
        setDraft({ ...draft, pay: parse("main") || undefined });
      }
      go("main");
    };
    content = (
      <>
        {pageHeader("Cuánto te pagan")}
        <ThemedText
          variant="footnote"
          color="secondary"
          style={{ marginBottom: tokens.spacing.md }}
        >
          {payHint(draft)} Lo comparamos con lo que gastas en cada período.
        </ThemedText>
        {slots.map(({ key, label }, i) => (
          <View
            key={key}
            style={[
              styles.payField,
              { backgroundColor: tokens.colors.surface.elevated, borderRadius: tokens.radius.lg },
            ]}
          >
            {label ? (
              <ThemedText variant="body" color="secondary" style={{ width: 64 }}>
                {label}
              </ThemedText>
            ) : null}
            <ThemedText variant="headline" style={{ fontSize: 22 }}>
              $
            </ThemedText>
            <TextInput
              value={payDraft[key] ?? ""}
              onChangeText={(t) => setPayDraft((prev) => ({ ...prev, [key]: formatMoneyInput(t) }))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={tokens.colors.text.secondary}
              autoFocus={i === 0}
              returnKeyType="done"
              onSubmitEditing={i === slots.length - 1 ? savePay : undefined}
              accessibilityLabel={label ? `Pago del ${label.toLowerCase()}` : "Pago"}
              style={[styles.payInput, { color: tokens.colors.text.primary }]}
            />
          </View>
        ))}
        <PressableScale
          onPress={savePay}
          style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
          accessibilityRole="button"
        >
          <ThemedText variant="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>
            Listo
          </ThemedText>
        </PressableScale>
      </>
    );
  } else if (page === "semiDays" && draft.type === "semimonthly") {
    const canSave = semiDraft.length >= 2;
    content = (
      <>
        {pageHeader("Días de inicio")}
        <ThemedText
          variant="footnote"
          color="secondary"
          style={{ marginBottom: tokens.spacing.sm }}
        >
          Toca los días en que te pagan. Cada uno empieza un período.
        </ThemedText>
        {dayGrid(semiDraft, (day) => {
          Haptics.selectionAsync();
          setSemiDraft((prev) =>
            prev.includes(day)
              ? prev.filter((d) => d !== day)
              : [...prev, day].sort((a, b) => a - b),
          );
        })}
        <PressableScale
          onPress={() => {
            if (!canSave) return;
            const kept: Record<string, number> = {};
            for (const d of semiDraft) {
              const v = draft.pay?.[String(d)];
              if (v) kept[String(d)] = v;
            }
            setDraft({ type: "semimonthly", days: semiDraft, pay: kept });
            go("main");
          }}
          disabled={!canSave}
          style={[
            styles.primaryBtn,
            { backgroundColor: canSave ? PRIMARY : tokens.colors.surface.elevated },
          ]}
        >
          <ThemedText
            variant="body"
            style={{ fontWeight: "700", color: canSave ? "#FFFFFF" : tokens.colors.text.secondary }}
          >
            {canSave ? "Listo" : "Elige al menos 2 días"}
          </ThemedText>
        </PressableScale>
      </>
    );
  } else {
    content = (
      <>
        {showHeader && (
          <>
            <ThemedText variant="headline" style={{ fontSize: 19 }}>
              Pago y período
            </ThemedText>
            <ThemedText variant="footnote" color="secondary" style={{ marginTop: 4 }}>
              Cada cuánto y cuánto te pagan. Así se agrupan tus movimientos al abrir la app y se
              compara lo que gastas con lo que recibes.
            </ThemedText>
          </>
        )}

        {preview && (
          <View style={{ marginTop: tokens.spacing.md, marginHorizontal: -20 }}>
            {/* Solo vista previa: siempre marca el ciclo actual, calculado junto con la lista.
                Se remonta al cambiar el conjunto de ciclos (otra frecuencia); un índice en
                estado aparte llegaba viejo y el resaltado quedaba en otro lado (visto en
                dispositivo). */}
            <PeriodStrip
              key={`${draft.type}-${preview.items[0]?.key}-${preview.items.length}`}
              items={preview.items}
              selectedIndex={preview.currentIndex}
              onSelect={() => {}}
            />
          </View>
        )}

        <View style={[styles.settings, { borderTopColor: tokens.colors.border.default }]}>
          {settingRow("Frecuencia", cadenceLabel(draft), () => go("frequency"))}
          {(draft.type === "weekly" || draft.type === "biweekly") &&
            settingRow("Inicio de la semana", WEEKDAY_LONG[draft.weekStartsOn], () =>
              go("weekday"),
            )}
          {draft.type === "biweekly" &&
            settingRow("El ciclo actual empieza", shortDate(cycleStartContaining(draft, now)), () =>
              go("anchor"),
            )}
          {draft.type === "semimonthly" &&
            settingRow("Días de inicio", semiDaysLabel(draft.days), () => {
              setSemiDraft(draft.days);
              go("semiDays");
            })}
          {draft.type === "monthly" &&
            (draft.startDay === 1 ? (
              <Pressable
                key="offset-add"
                onPress={() => go("offset")}
                accessibilityRole="button"
                android_ripple={{ color: tokens.colors.surface.elevated }}
                style={styles.settingRow}
              >
                <View style={[styles.plusCircle, { backgroundColor: tokens.colors.text.primary }]}>
                  <Plus size={14} color={tokens.colors.surface.secondary} strokeWidth={3} />
                </View>
                <ThemedText variant="body" style={{ fontWeight: "600" }}>
                  Añadir desfase de inicio de mes
                </ThemedText>
              </Pressable>
            ) : (
              settingRow("Inicio del mes", `día ${draft.startDay}`, () => go("offset"))
            ))}
          {settingRow("¿Cuánto te pagan?", payLabel(draft), () => {
            const initial: Record<string, string> = {};
            if (draft.type === "semimonthly") {
              for (const d of draft.days) {
                const v = draft.pay?.[String(d)];
                if (v) initial[String(d)] = formatMoneyInput(String(v));
              }
            } else if (draft.pay) {
              initial.main = formatMoneyInput(String(draft.pay));
            }
            setPayDraft(initial);
            go("pay");
          })}
        </View>

        {renderActions ? (
          renderActions(apply)
        ) : (
          <PressableScale
            onPress={apply}
            style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
            accessibilityRole="button"
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
            <ThemedText variant="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>
              Aplicar
            </ThemedText>
          </PressableScale>
        )}
        {draft.type === "monthly" && draft.startDay !== 1 && (
          <ThemedText
            variant="footnote"
            color="secondary"
            style={{ textAlign: "center", marginTop: tokens.spacing.sm }}
          >
            Tus presupuestos por categoría también se medirán del día {draft.startDay} al{" "}
            {draft.startDay - 1} del mes siguiente.
          </ThemedText>
        )}
      </>
    );
  }

  return (
    <Animated.View key={page} entering={reducedMotion ? undefined : FadeIn.duration(180)}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  settings: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCircle: {
    width: "80%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  payField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 10,
  },
  payInput: { flex: 1, fontSize: 22, fontWeight: "700", paddingVertical: 0 },
  plusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
