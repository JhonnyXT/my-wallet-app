// ─── Crear, editar y borrar listas ───────────────────────────────────────────
// Lo usan el menú de listas del Dashboard y "Tus listas" en Ajustes: estado del editor,
// guardar (nombre, emoji, personas y, al crear, categorías), no dejar quitar a quien ya tiene
// movimientos y confirmar el borrado. `element` va en el árbol del que lo usa.

import { useCallback, useMemo, useState } from "react";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ListEditorSheet } from "@/src/components/ui/ListEditorSheet";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore, type ListMember } from "@/src/store/useSettingsStore";
import { useUIStore } from "@/src/store/useUIStore";

// Dos Modal apilados en Android se comportan mal: lo siguiente se abre al terminar de cerrar.
const AFTER_CLOSE_MS = 220;

export function useListEditor({ onListChanged }: { onListChanged?: () => void } = {}) {
  const lists = useSettingsStore((s) => s.lists);
  const addList = useSettingsStore((s) => s.addList);
  const editList = useSettingsStore((s) => s.editList);
  const setMembers = useSettingsStore((s) => s.setMembers);
  const transactions = useFinanceStore((s) => s.transactions);
  const switchList = useFinanceStore((s) => s.switchList);
  const deleteList = useFinanceStore((s) => s.deleteList);

  // null = cerrado; "new" = crear; un id = editar esa lista.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = useCallback(() => setEditing("new"), []);
  const openEdit = useCallback((listId: string) => setEditing(listId), []);

  const goToList = useCallback(
    (id: string) => {
      // Un filtro de categoría de otra lista no significa nada en la nueva.
      useUIStore.getState().clearCategoryFilter();
      onListChanged?.();
      switchList(id);
    },
    [switchList, onListChanged],
  );

  const handleSave = useCallback(
    (name: string, emoji: string, members: ListMember[], categories: UserCategory[]) => {
      if (editing === "new") {
        const id = addList(name, emoji, categories);
        setMembers(id, members);
        goToList(id);
      } else if (editing) {
        editList(editing, name, emoji);
        setMembers(editing, members);
      }
      setEditing(null);
    },
    [editing, addList, editList, setMembers, goToList],
  );

  // Quien ya tiene movimientos no se puede quitar (quedarían huérfanos). El editor solo abre
  // la lista activa o una nueva, así que sus movimientos están en memoria.
  const lockedMemberIds = useMemo(() => {
    if (!editing || editing === "new") return new Set<string>();
    return new Set(transactions.filter((t) => t.list_id === editing).map((t) => t.paid_by));
  }, [editing, transactions]);

  const editingList =
    editing && editing !== "new" ? (lists.find((l) => l.id === editing) ?? null) : null;
  const deletingName = lists.find((l) => l.id === confirmDeleteId)?.name ?? "";

  const element = (
    <>
      <ListEditorSheet
        visible={editing !== null}
        list={editingList}
        lockedMemberIds={lockedMemberIds}
        onSave={handleSave}
        onDelete={() => {
          const id = editing;
          setEditing(null);
          if (id && id !== "new") setTimeout(() => setConfirmDeleteId(id), AFTER_CLOSE_MS);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        visible={confirmDeleteId !== null}
        variant="danger"
        title="Eliminar lista"
        message={`Se borrarán "${deletingName}" y todos sus movimientos. No se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          if (id) {
            useUIStore.getState().clearCategoryFilter();
            deleteList(id);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );

  return { openNew, openEdit, goToList, element };
}
