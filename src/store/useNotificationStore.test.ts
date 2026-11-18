/**
 * Segundo piloto de tests (deuda técnica, AGENTS.md → Deuda técnica documentada): un store
 * Zustand "con efectos" (persist + AsyncStorage), a diferencia de las funciones puras que ya
 * cubre el resto de la suite. Cubre la deduplicación de `addPendingItem` (AGENTS.md →
 * "Gotchas críticos" → "Deep link desde notificación push": Android puede re-entregar la misma
 * notificación bancaria dos veces).
 */
import { useNotificationStore, getPendingItemAfterHydration } from "./useNotificationStore";
import type { ParsedTransaction } from "@/src/utils/notificationParser";

function makeItem(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    amount: 45000,
    isExpense: true,
    description: "Compra en RAPPI CO",
    bankName: "Bancolombia",
    packageName: "com.bancolombia.app",
    rawTitle: "Bancolombia le informa...",
    rawText: "Bancolombia le informa Compra por $45.000 en RAPPI CO",
    confidence: "high",
    detectedAt: "2026-11-18T09:00:00.000",
    ...overrides,
  };
}

beforeEach(() => {
  useNotificationStore.setState({ pendingItems: [] });
});

describe("useNotificationStore.addPendingItem", () => {
  it("agrega un item nuevo y lo deja primero en la cola", () => {
    const { id, isNew } = useNotificationStore.getState().addPendingItem(makeItem());
    expect(isNew).toBe(true);
    expect(useNotificationStore.getState().pendingItems).toHaveLength(1);
    expect(useNotificationStore.getState().pendingItems[0].id).toBe(id);
  });

  it("detecta un duplicado (mismo banco + monto, <2 min) y no lo vuelve a agregar", () => {
    const { id: firstId } = useNotificationStore
      .getState()
      .addPendingItem(makeItem({ detectedAt: "2026-11-18T09:00:00.000" }));

    const { id, isNew } = useNotificationStore
      .getState()
      .addPendingItem(makeItem({ detectedAt: "2026-11-18T09:01:30.000" }));

    expect(isNew).toBe(false);
    expect(id).toBe(firstId);
    expect(useNotificationStore.getState().pendingItems).toHaveLength(1);
  });

  it("no lo trata como duplicado si pasaron 2 minutos o más", () => {
    useNotificationStore.getState().addPendingItem(makeItem({ detectedAt: "2026-11-18T09:00:00.000" }));

    const { isNew } = useNotificationStore
      .getState()
      .addPendingItem(makeItem({ detectedAt: "2026-11-18T09:02:00.000" }));

    expect(isNew).toBe(true);
    expect(useNotificationStore.getState().pendingItems).toHaveLength(2);
  });

  it("no lo trata como duplicado si el monto es distinto", () => {
    useNotificationStore.getState().addPendingItem(makeItem({ amount: 45000 }));

    const { isNew } = useNotificationStore.getState().addPendingItem(makeItem({ amount: 45001 }));

    expect(isNew).toBe(true);
    expect(useNotificationStore.getState().pendingItems).toHaveLength(2);
  });

  it("no lo trata como duplicado si el banco (packageName) es distinto", () => {
    useNotificationStore.getState().addPendingItem(makeItem({ packageName: "com.bancolombia.app" }));

    const { isNew } = useNotificationStore
      .getState()
      .addPendingItem(makeItem({ packageName: "com.nequi.app" }));

    expect(isNew).toBe(true);
    expect(useNotificationStore.getState().pendingItems).toHaveLength(2);
  });
});

describe("useNotificationStore.removePendingItem / clearAll", () => {
  it("quita solo el item indicado", () => {
    const { id: id1 } = useNotificationStore.getState().addPendingItem(makeItem({ amount: 1 }));
    const { id: id2 } = useNotificationStore
      .getState()
      .addPendingItem(makeItem({ amount: 2, detectedAt: "2026-11-18T10:00:00.000" }));

    useNotificationStore.getState().removePendingItem(id1);

    const remaining = useNotificationStore.getState().pendingItems;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
  });

  it("clearAll vacía toda la cola", () => {
    useNotificationStore.getState().addPendingItem(makeItem());
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().pendingItems).toHaveLength(0);
  });
});

describe("getPendingItemAfterHydration", () => {
  it("devuelve el item si existe (persist ya hidratado en este proceso de test)", async () => {
    const { id } = useNotificationStore.getState().addPendingItem(makeItem());
    const found = await getPendingItemAfterHydration(id);
    expect(found?.id).toBe(id);
  });

  it("devuelve null si el id no existe", async () => {
    const found = await getPendingItemAfterHydration("no-existe");
    expect(found).toBeNull();
  });
});
