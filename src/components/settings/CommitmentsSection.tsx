/**
 * Compromisos — una sola hoja para Deudas y Metas de ahorro (antes dos secciones separadas en
 * Ajustes). Son estructuralmente lo mismo (nombre+emoji+monto, barra de progreso, abonar,
 * notificación al completar), solo cambia la dirección: debo vs. estoy ahorrando. Fusión de
 * presentación nada más — los datos, la sync y los recordatorios de deudas siguen separados
 * (DebtsSlice/GoalsSlice, sin cambios), para no arriesgar una migración de datos ya
 * sincronizados por una reorganización visual (auditoría de simplicidad, 2026-11-18).
 *
 * Un solo botón "+ Nuevo compromiso" (paso 2 de la fusión, 2026-11-18): abre un selector
 * Deuda/Meta (mismo patrón que Gasto/Ingreso en FloatingDock) que delega en el modal de creación
 * real de cada sección vía ref imperativo — ninguna de las dos pierde su propio flujo de alta,
 * solo dejan de mostrar su botón "+ Nueva X" individual.
 */
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { HandCoins, Target } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetAddButton, SheetHeader, SheetLabel } from "@/src/components/ui/SheetParts";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useAppTokens } from "@/src/theme/tokens";
import { DEBT_COLOR, DebtsSection, type DebtsSectionHandle } from "./DebtsSection";
import { SavingsGoalsSection, type GoalsSectionHandle } from "./GoalsSection";

const GOAL_COLOR = "#DB2777";

export function CommitmentsSection() {
  const tokens = useAppTokens();
  const debtsRef = useRef<DebtsSectionHandle>(null);
  const goalsRef = useRef<GoalsSectionHandle>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <SheetLabel first>DEBES</SheetLabel>
      <DebtsSection ref={debtsRef} showAddButton={false} />

      <SheetLabel>AHORRANDO PARA</SheetLabel>
      <SavingsGoalsSection ref={goalsRef} showAddButton={false} />

      <SheetAddButton
        label="Nuevo compromiso"
        onPress={() => setPickerOpen(true)}
        style={{ marginTop: 4 }}
      />

      {/* ── Selector Deuda/Meta — mismo patrón que Gasto/Ingreso del dock ── */}
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <SheetHeader title="Nuevo compromiso" subtitle="¿Qué querés registrar?" />
        <View style={{ gap: tokens.spacing.sm, marginTop: tokens.spacing.sm }}>
          <PickerOption
            label="Deuda"
            detail="Algo que debes y vas pagando"
            icon={<HandCoins size={18} color="#FFFFFF" strokeWidth={2} />}
            color={DEBT_COLOR}
            onPress={() => {
              setPickerOpen(false);
              debtsRef.current?.openCreate();
            }}
          />
          <PickerOption
            label="Meta de ahorro"
            detail="Algo para lo que estás ahorrando"
            icon={<Target size={18} color="#FFFFFF" strokeWidth={2} />}
            color={GOAL_COLOR}
            onPress={() => {
              setPickerOpen(false);
              goalsRef.current?.openCreate();
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

function PickerOption({
  label,
  detail,
  icon,
  color,
  onPress,
}: {
  label: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}) {
  const tokens = useAppTokens();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: tokens.colors.border.default }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm + 2,
        paddingHorizontal: tokens.spacing.md,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.colors.surface.secondary,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: tokens.radius.full,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.colors.text.primary, fontSize: 15, fontWeight: "600" }}>
          {label}
        </Text>
        <ThemedText variant="footnote" color="secondary">
          {detail}
        </ThemedText>
      </View>
    </Pressable>
  );
}
