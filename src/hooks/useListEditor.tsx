// ─── Crear, editar, borrar y compartir listas ────────────────────────────────
// Lo usan el menú de listas del Dashboard y "Tus listas" en Ajustes: estado del editor,
// guardar (nombre, emoji, personas y, al crear, categorías), no dejar quitar a quien ya tiene
// movimientos y confirmar el borrado. Desde la Sync Fase 4 también compartir la lista (código de
// invitación), unirse con un código, salir, quitar a alguien y eliminar para todos.
// `element` va en el árbol del que lo usa.

import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { InviteSheet } from "@/src/components/ui/InviteSheet";
import { JoinSpaceSheet } from "@/src/components/ui/JoinSpaceSheet";
import { ListEditorSheet, type ListSharing } from "@/src/components/ui/ListEditorSheet";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore, type ListMember } from "@/src/store/useSettingsStore";
import { useUIStore } from "@/src/store/useUIStore";
import {
  createInvite,
  deleteSpace,
  leaveSpace,
  removeMember,
  shareList,
  SpaceError,
  spaceErrorMessage,
  useSession,
  type Invite,
} from "@/src/sync";

// Dos Modal apilados en Android se comportan mal: lo siguiente se abre al terminar de cerrar.
const AFTER_CLOSE_MS = 220;

const errorText = (e: unknown) => spaceErrorMessage(e instanceof SpaceError ? e.kind : "unknown");

export function useListEditor({ onListChanged }: { onListChanged?: () => void } = {}) {
  const lists = useSettingsStore((s) => s.lists);
  const addList = useSettingsStore((s) => s.addList);
  const editList = useSettingsStore((s) => s.editList);
  const setMembers = useSettingsStore((s) => s.setMembers);
  const transactions = useFinanceStore((s) => s.transactions);
  const switchList = useFinanceStore((s) => s.switchList);
  const deleteList = useFinanceStore((s) => s.deleteList);
  const uid = useSession().user?.uid ?? null;

  // null = cerrado; "new" = crear; un id = editar esa lista.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ member: ListMember; listId: string } | null>(
    null,
  );
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ invite: Invite; listId: string } | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  const openEditor = useCallback((target: "new" | string) => {
    setShareError(null);
    setEditing(target);
  }, []);
  const openNew = useCallback(() => openEditor("new"), [openEditor]);
  const openEdit = useCallback((listId: string) => openEditor(listId), [openEditor]);
  const openJoin = useCallback(() => setJoinOpen(true), []);

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
  const deletingList = lists.find((l) => l.id === confirmDeleteId);
  const deletingForAll = !!deletingList?.space && deletingList.space.ownerUid === uid;
  const leavingName = lists.find((l) => l.id === confirmLeaveId)?.name ?? "";
  const invitedList = lists.find((l) => l.id === invite?.listId);

  // Compartir (o un código nuevo si ya está compartida): el editor muestra la espera y el error;
  // con el código, se cierra y se abre la hoja de invitación.
  const handleShare = useCallback(async () => {
    const listId = editing;
    if (!listId || listId === "new" || shareBusy) return;
    setShareError(null);
    if (!uid) {
      setShareError(spaceErrorMessage("signed-out"));
      return;
    }
    setShareBusy(true);
    try {
      const shared = lists.find((l) => l.id === listId)?.space;
      const code = shared ? await createInvite(listId) : await shareList(listId);
      setEditing(null);
      setTimeout(() => setInvite({ invite: code, listId }), AFTER_CLOSE_MS);
    } catch (e) {
      setShareError(errorText(e));
    } finally {
      setShareBusy(false);
    }
  }, [editing, shareBusy, uid, lists]);

  const sharing: ListSharing = {
    uid,
    busy: shareBusy,
    error: shareError,
    onShare: handleShare,
    onLeave: () => {
      const id = editing;
      setEditing(null);
      if (id && id !== "new") setTimeout(() => setConfirmLeaveId(id), AFTER_CLOSE_MS);
    },
    onRemoveMember: (member) => {
      const listId = editing;
      setEditing(null);
      if (listId && listId !== "new") {
        setTimeout(() => setConfirmRemove({ member, listId }), AFTER_CLOSE_MS);
      }
    },
  };

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
        sharing={sharing}
      />
      <ConfirmDialog
        visible={confirmDeleteId !== null}
        variant="danger"
        title="Eliminar lista"
        message={
          deletingForAll
            ? `Se eliminará "${deletingList?.name ?? ""}" para todos los miembros, con todos sus movimientos. No se puede deshacer.`
            : `Se borrarán "${deletingList?.name ?? ""}" y todos sus movimientos. No se puede deshacer.`
        }
        confirmLabel="Eliminar"
        onConfirm={() => {
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          if (!id) return;
          useUIStore.getState().clearCategoryFilter();
          if (deletingForAll) {
            deleteSpace(id).catch((e) => Alert.alert("No se pudo eliminar", errorText(e)));
          } else {
            deleteList(id);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmDialog
        visible={confirmLeaveId !== null}
        variant="warning"
        title="Salir de la lista"
        message={`Dejarás de ver lo que registren los demás en "${leavingName}". La lista se queda en tu teléfono con lo que ya tenía, como una lista tuya.`}
        confirmLabel="Salir"
        onConfirm={() => {
          const id = confirmLeaveId;
          setConfirmLeaveId(null);
          if (id) leaveSpace(id).catch((e) => Alert.alert("No se pudo salir", errorText(e)));
        }}
        onCancel={() => setConfirmLeaveId(null)}
      />
      <ConfirmDialog
        visible={confirmRemove !== null}
        variant="danger"
        title={`Quitar a ${confirmRemove?.member.name ?? ""}`}
        message="Ya no podrá ver ni registrar en esta lista. Lo que pagó sigue contando en las cuentas."
        confirmLabel="Quitar"
        onConfirm={() => {
          const target = confirmRemove;
          setConfirmRemove(null);
          if (target) {
            removeMember(target.listId, target.member.id).catch((e) =>
              Alert.alert("No se pudo quitar", errorText(e)),
            );
          }
        }}
        onCancel={() => setConfirmRemove(null)}
      />
      <InviteSheet
        visible={invite !== null}
        invite={invite?.invite ?? null}
        emoji={invitedList?.emoji ?? ""}
        name={invitedList?.name ?? ""}
        onClose={() => setInvite(null)}
      />
      <JoinSpaceSheet
        visible={joinOpen}
        onJoined={(listId) => {
          setJoinOpen(false);
          setTimeout(() => goToList(listId), AFTER_CLOSE_MS);
        }}
        onClose={() => setJoinOpen(false)}
      />
    </>
  );

  return { openNew, openEdit, openJoin, goToList, element };
}
