/**
 * Traer y subir los espacios compartidos dentro de la corrida del motor (Sync Fase 4, spec D6).
 * Decide qué cambió y lo devuelve; aplicarlo en el store y en SQLite es cosa de `engine.ts`, que
 * ya sabe hacerlo sin que los cambios aplicados se vuelvan a subir.
 */
import type { TransactionRow } from "@/src/db/db";
import type { WalletList } from "@/src/store/slices/listsSlice";
import type { SpaceListPatch } from "@/src/store/remoteSettings";
import { pickWinner } from "@/src/utils/syncMerge";
import type { RemoteTransaction } from "./mappers";
import { advanceCursor, forgetSpace, needsPush, spaceCursorKey, type SyncMeta } from "./meta";
import { withTimeout } from "./net";
import { classifySpaceError } from "./errors";
import {
  discoverSpaces,
  getConfig,
  getMembers,
  pullSpaceTransactions,
  pushConfig,
  pushGuest,
  pushSpaceTransactions,
} from "./spacesRemote";
import { membersToLocal, spaceDocToTransaction, transactionToSpaceDoc } from "./spaceMappers";

export interface SpacesPull {
  meta: SyncMeta;
  patches: SpaceListPatch[];
  transactions: RemoteTransaction[];
  /** Listas desconectadas en esta traída: sus movimientos pasan al respaldo personal (D8). */
  unlinked: string[];
}

const sameMembers = (a: WalletList["members"], b: WalletList["members"]) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * Trae los espacios del usuario. `lists` = las listas con los datos vivos de la activa. Los
 * espacios que ya no aparecen (salió en otro teléfono, lo quitaron, se eliminó) se desconectan.
 */
export async function pullSpaces(
  uid: string,
  meta: SyncMeta,
  lists: WalletList[],
  now: number,
): Promise<SpacesPull> {
  const remote = await withTimeout(discoverSpaces(uid));
  const alive = new Map(remote.filter((s) => s.deletedAt == null).map((s) => [s.id, s]));
  const patches: SpaceListPatch[] = [];
  const transactions: RemoteTransaction[] = [];
  const unlinked: string[] = [];

  const bySpace = new Map<string, WalletList>();
  for (const list of lists) {
    if (!list.space) continue;
    if (!alive.has(list.space.spaceId)) {
      patches.push({ kind: "unlink", listId: list.id, now });
      unlinked.push(list.id);
      meta = forgetSpace(meta, list.space.spaceId);
    } else {
      bySpace.set(list.space.spaceId, list);
    }
  }

  for (const space of alive.values()) {
    const list = bySpace.get(space.id);
    const members = await withTimeout(getMembers(space.id));
    const config = await withTimeout(getConfig(space.id));
    let listId: string;
    let selfMemberId: string;

    if (!list) {
      // Un espacio sin lista en este teléfono (restaurar, o unirse desde otro teléfono). Si aún
      // no tengo miembro (unión a medias) o el espacio no tiene lo compartido, se espera.
      const self = members.find((m) => m.data.uid === uid && m.data.leftAt == null);
      if (!self || !config) continue;
      if (lists.some((l) => l.id === space.id)) continue; // una copia desconectada con ese id
      listId = space.id;
      selfMemberId = self.id;
      meta = forgetSpace(meta, space.id);
      patches.push({
        kind: "create",
        list: {
          id: space.id,
          name: config.name,
          emoji: config.emoji,
          period: { type: "all" },
          categories: config.categories,
          budgets: {},
          showIncome: config.showIncome,
          members: membersToLocal(members, self.id),
          // 0: si el respaldo personal trae esta lista con su período, gana ese.
          updatedAt: 0,
          space: {
            spaceId: space.id,
            ownerUid: space.ownerUid,
            selfMemberId: self.id,
            sharedUpdatedAt: config.updatedAt,
          },
        },
      });
      meta = { ...meta, pushedSpaces: { ...meta.pushedSpaces, [space.id]: config.updatedAt } };
    } else {
      const link = list.space!;
      listId = list.id;
      selfMemberId = link.selfMemberId;
      const local = membersToLocal(members, selfMemberId);
      if (!sameMembers(local, list.members)) {
        patches.push({ kind: "members", listId, members: local });
      }
      if (
        config &&
        pickWinner({ updatedAt: link.sharedUpdatedAt }, { updatedAt: config.updatedAt }) ===
          "remote"
      ) {
        patches.push({
          kind: "config",
          listId,
          name: config.name,
          emoji: config.emoji,
          categories: config.categories,
          showIncome: config.showIncome,
          sharedUpdatedAt: config.updatedAt,
        });
        meta = { ...meta, pushedSpaces: { ...meta.pushedSpaces, [space.id]: config.updatedAt } };
      }
    }

    const key = spaceCursorKey(space.id);
    const docs = await withTimeout(pullSpaceTransactions(space.id, meta.cursors[key] ?? 0));
    if (docs.length > 0) {
      for (const d of docs) {
        transactions.push(spaceDocToTransaction(d.id, d.data, listId, selfMemberId));
      }
      meta = advanceCursor(meta, key, Math.max(...docs.map((d) => d.serverUpdatedAt)));
    }
  }

  return { meta, patches, transactions, unlinked };
}

/** Listas compartidas con lo compartido sin subir (para el contador de pendientes). */
export function pendingSpaceConfigs(meta: SyncMeta, lists: WalletList[]): WalletList[] {
  return lists.filter(
    (l) => l.space && needsPush(meta.pushedSpaces[l.space.spaceId], l.space.sharedUpdatedAt),
  );
}

const isDenied = (e: unknown) => classifySpaceError(e) === "not-allowed";

/**
 * Sube lo compartido (nombre, ícono, categorías, mostrar ingresos) y las personas sin app de las
 * listas que cambiaron. Devuelve las listas cuyo espacio ya no deja escribir (perdí el acceso).
 */
export async function pushSpaceConfigs(
  meta: SyncMeta,
  lists: WalletList[],
): Promise<{ meta: SyncMeta; lost: string[] }> {
  const lost: string[] = [];
  for (const list of pendingSpaceConfigs(meta, lists)) {
    const { spaceId, sharedUpdatedAt } = list.space!;
    try {
      await withTimeout(
        pushConfig(spaceId, {
          name: list.name,
          emoji: list.emoji,
          categories: list.categories ?? [],
          showIncome: list.showIncome ?? true,
          updatedAt: sharedUpdatedAt,
        }),
      );
    } catch (e) {
      if (!isDenied(e)) throw e;
      lost.push(list.id);
      continue;
    }
    // Personas sin app: una por documento. Si otra ya se ligó a ella, las reglas lo rechazan y
    // la próxima traída corrige lo local; no frena lo demás.
    for (const m of list.members ?? []) {
      if (m.uid) continue;
      await withTimeout(
        pushGuest(spaceId, m.id, {
          name: m.name,
          leftAt: m.status === "left" ? sharedUpdatedAt : null,
          updatedAt: sharedUpdatedAt,
        }),
      ).catch((e) => {
        if (!isDenied(e)) throw e;
      });
    }
    meta = { ...meta, pushedSpaces: { ...meta.pushedSpaces, [spaceId]: sharedUpdatedAt } };
  }
  return { meta, lost };
}

/**
 * Sube movimientos pendientes de una lista compartida a su espacio. Devuelve false si el espacio
 * ya no deja escribir (perdí el acceso): quien llama desconecta la lista y los movimientos van al
 * respaldo personal en la próxima vuelta.
 */
export async function pushSpaceRows(list: WalletList, rows: TransactionRow[]): Promise<boolean> {
  const link = list.space!;
  try {
    await withTimeout(
      pushSpaceTransactions(
        link.spaceId,
        rows.map((r) => ({ id: r.uid, data: transactionToSpaceDoc(r, link.selfMemberId) })),
      ),
    );
    return true;
  } catch (e) {
    if (isDenied(e)) return false;
    throw e;
  }
}
