// ─── Categorías de todas las listas ──────────────────────────────────────────
// `userCategories` son solo las de la lista activa. Personal muestra también movimientos de
// otras listas (lo que pagaste tú), cuyas categorías pueden no estar en las de Personal: para
// su nombre y color se busca en la unión, con prioridad para la lista activa.

import { useMemo } from "react";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { useSettingsStore } from "@/src/store/useSettingsStore";

export function mergeListCategories(
  active: UserCategory[],
  others: (UserCategory[] | undefined)[],
): UserCategory[] {
  const seen = new Set(active.map((c) => c.emoji));
  const merged = [...active];
  for (const cats of others) {
    for (const c of cats ?? []) {
      if (seen.has(c.emoji)) continue;
      seen.add(c.emoji);
      merged.push(c);
    }
  }
  return merged;
}

export function useAllListCategories(): UserCategory[] {
  const active = useSettingsStore((s) => s.userCategories);
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  return useMemo(
    () =>
      mergeListCategories(
        active,
        lists.filter((l) => l.id !== activeListId).map((l) => l.categories),
      ),
    [active, lists, activeListId],
  );
}
