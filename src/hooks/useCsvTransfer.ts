// ─── Exportar / importar CSV de la lista activa ──────────────────────────────
// Exportar: escribe un .csv en caché y abre la hoja del sistema para enviarlo (WhatsApp,
// Drive, correo…). Importar: elige un .csv, lo lee y agrega sus movimientos a la lista
// activa, sin repetir los que ya están (misma fecha, monto y descripción).

import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { localISOString, SELF_PAYER } from "@/src/db/db";
import { useAllListCategories } from "@/src/hooks/useAllListCategories";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { duplicateKey, parseTransactionsCsv, transactionsToCsv } from "@/src/utils/csv";

const LEGACY_ACCOUNTS: Record<string, string> = {
  cash: "Efectivo",
  savings: "Ahorros",
  credit: "Tarjeta",
};

export interface ImportResult {
  recognized: boolean;
  imported: number;
  duplicates: number;
  invalid: number;
}

function fileSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return slug || "lista";
}

export function useCsvTransfer() {
  const categories = useAllListCategories();
  const paymentMethods = useSettingsStore((s) => s.paymentMethods);
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  const userName = useSettingsStore((s) => s.userName);
  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];

  const accountName = useCallback(
    (id: string) => paymentMethods.find((m) => m.id === id)?.name ?? LEGACY_ACCOUNTS[id] ?? id,
    [paymentMethods],
  );

  /** Devuelve false si falló (el llamador muestra el error). */
  const exportCsv = useCallback(async (): Promise<boolean> => {
    try {
      // Movimientos de la lista activa (en Personal: los suyos y lo que pagaste en otras).
      const { transactions } = useFinanceStore.getState();
      const memberName = new Map(
        lists.flatMap((l) => (l.members ?? []).map((m) => [m.id, m.name] as const)),
      );
      const csv = transactionsToCsv(transactions, {
        categoryName: (emoji) => categories.find((c) => c.emoji === emoji)?.name ?? "",
        accountName,
        payerName: (paidBy) => (paidBy === SELF_PAYER ? "" : (memberName.get(paidBy) ?? "")),
      });
      const day = localISOString().slice(0, 10);
      const file = new File(Paths.cache, `mywallet-${fileSlug(activeList.name)}-${day}.csv`);
      file.create({ overwrite: true });
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: `Exportar ${activeList.name}`,
        UTI: "public.comma-separated-values-text",
      });
      return true;
    } catch {
      return false;
    }
  }, [lists, categories, accountName, activeList]);

  /** null = el usuario canceló la elección del archivo. */
  const importCsv = useCallback(async (): Promise<ImportResult | null> => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return null;

    const text = await new File(picked.assets[0].uri).text();
    const { rows, invalid, recognized } = parseTransactionsCsv(text);
    if (!recognized) return { recognized, imported: 0, duplicates: 0, invalid };

    const { transactions, addTransactionBatch } = useFinanceStore.getState();
    const seen = new Set(
      transactions.filter((t) => t.list_id === activeListId).map((t) => duplicateKey(t)),
    );
    const members = activeList.members ?? [];
    const self = userName.trim().toLowerCase();
    const findAccount = (raw: string) => {
      const v = raw.toLowerCase();
      const m = paymentMethods.find((p) => p.id.toLowerCase() === v || p.name.toLowerCase() === v);
      if (m) return m.id;
      const legacy = Object.entries(LEGACY_ACCOUNTS).find(
        ([id, name]) => id === v || name.toLowerCase() === v,
      );
      return legacy ? legacy[0] : "cash";
    };
    const findPayer = (raw: string) => {
      const v = raw.toLowerCase();
      if (!v || v === "tú" || v === "tu" || v === "yo" || v === self) return SELF_PAYER;
      return members.find((m) => m.name.toLowerCase() === v)?.id ?? SELF_PAYER;
    };

    let duplicates = 0;
    const items = [];
    for (const r of rows) {
      const key = duplicateKey(r);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      items.push({
        amount: r.amount,
        description: r.description,
        categoryEmoji: r.categoryEmoji,
        tags: r.tags,
        // ISO local sin zona: `new Date` lo lee como hora local, igual que se guardó.
        date: new Date(r.date),
        paymentMethod: findAccount(r.account),
        paidBy: findPayer(r.payer),
      });
    }
    if (items.length > 0) await addTransactionBatch(items);
    return { recognized, imported: items.length, duplicates, invalid };
  }, [activeListId, activeList, userName, paymentMethods]);

  return { exportCsv, importCsv };
}
