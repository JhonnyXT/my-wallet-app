// ─── Cuentas y "Compartir" de la lista activa ────────────────────────────────
// Lo usan el Dashboard (cuentas + compartir lo que se ve del período) y Ajustes (compartir
// todo el historial de la lista).

import { useCallback, useMemo } from "react";
import { Share } from "react-native";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { SELF_PAYER } from "@/src/db/db";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { buildListShareText } from "@/src/utils/listShareText";
import { computeSettlement } from "@/src/utils/settlement";

/** Quién pagó cuánto y quién le debe a quién, sobre todo el historial de la lista activa. */
export function useActiveListSettlement() {
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  const transactions = useFinanceStore((s) => s.transactions);
  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  const activeMembers = useMemo(() => activeList.members ?? [], [activeList.members]);

  const settlement = useMemo(
    () =>
      activeListId !== DEFAULT_LIST_ID && activeMembers.length > 0
        ? computeSettlement(transactions, [SELF_PAYER, ...activeMembers.map((m) => m.id)])
        : null,
    [activeListId, activeMembers, transactions],
  );
  const payerLabel = useCallback(
    (id: string) =>
      id === SELF_PAYER ? "Tú" : (activeMembers.find((m) => m.id === id)?.name ?? "Alguien"),
    [activeMembers],
  );

  return { activeList, settlement, payerLabel };
}

/**
 * Abre la hoja del sistema (WhatsApp, correo…) con el resumen de la lista activa. Sin `view`
 * resume todo el historial ("Todo el tiempo").
 */
export function useShareActiveList() {
  const { activeList, settlement, payerLabel } = useActiveListSettlement();
  const transactions = useFinanceStore((s) => s.transactions);
  const userName = useSettingsStore((s) => s.userName);

  return useCallback(
    (view?: { periodLabel: string; expense: number; income: number }) => {
      let expense = view?.expense ?? 0;
      let income = view?.income ?? 0;
      if (!view) {
        for (const t of transactions) {
          if (t.amount > 0) expense += t.amount;
          else income -= t.amount;
        }
      }
      const message = buildListShareText({
        emoji: activeList.emoji,
        name: activeList.name,
        periodLabel: view?.periodLabel ?? "Todo el tiempo",
        expense,
        income,
        settlement,
        // En el texto compartido "Tú" no tiene sentido para quien lo recibe.
        nameOf: (id) => (id === SELF_PAYER ? userName.trim() || "Yo" : payerLabel(id)),
      });
      Share.share({ message }, { dialogTitle: `Compartir ${activeList.name}` }).catch(() => {});
    },
    [activeList, settlement, transactions, userName, payerLabel],
  );
}
