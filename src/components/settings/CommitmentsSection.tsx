/**
 * Compromisos — una sola hoja para Deudas y Metas de ahorro (antes dos secciones separadas en
 * Ajustes). Son estructuralmente lo mismo (nombre+emoji+monto, barra de progreso, abonar,
 * notificación al completar), solo cambia la dirección: debo vs. estoy ahorrando. Fusión de
 * presentación nada más — los datos, la sync y los recordatorios de deudas siguen separados
 * (DebtsSlice/GoalsSlice, sin cambios), para no arriesgar una migración de datos ya
 * sincronizados por una reorganización visual (auditoría de simplicidad, 2026-11-18).
 */
import { SheetLabel } from "@/src/components/ui/SheetParts";
import { DebtsSection } from "./DebtsSection";
import { SavingsGoalsSection } from "./GoalsSection";

export function CommitmentsSection() {
  return (
    <>
      <SheetLabel first>DEBES</SheetLabel>
      <DebtsSection />

      <SheetLabel>AHORRANDO PARA</SheetLabel>
      <SavingsGoalsSection />
    </>
  );
}
