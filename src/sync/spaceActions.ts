/**
 * Acciones de espacios compartidos que pide la UI (Sync Fase 4, spec D3/D4/D7). A diferencia del
 * motor, esperan la respuesta del servidor: compartir o unirse sin conexión no se puede hacer (no
 * hay otra forma de validar un código), y la UI lo dice (RF-04). Nada más de la app espera esto.
 *
 * Todas lanzan `SpaceError`. Corren sin ninguna sync a la vez (`runExclusive`); la que hace falta
 * después se pide al terminar, nunca adentro (esperarla adentro sería esperarse a sí misma).
 */
import { getAuth, type User } from "@react-native-firebase/auth";
import { getRandomBytes } from "expo-crypto";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { markListTransactionsPending } from "@/src/db/db";
import {
  withLiveActiveList,
  type ListMember,
  type WalletList,
} from "@/src/store/slices/listsSlice";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { applyRemoteSettings, useSettingsStore } from "@/src/store/useSettingsStore";
import { newId } from "@/src/utils/ids";
import { runExclusive, requestSync, syncNow } from "./engine";
import { classifySpaceError, SpaceError } from "./errors";
import { ensureFirebase } from "./firebase";
import { forgetSpace } from "./meta";
import { loadMeta, saveMeta } from "./metaStore";
import { withTimeout } from "./net";
import {
  claimableGuests,
  firstName,
  INVITE_TTL_MS,
  inviteCodeFromBytes,
  membersToLocal,
  normalizeInviteCode,
} from "./spaceMappers";
import {
  addSelfToSpace,
  claimMember,
  createInviteDoc,
  createSelfMember,
  createSpace,
  deleteSpaceData,
  deleteUserListTransactions,
  getConfig,
  getInvite,
  getMembers,
  getSpace,
  rejoinMember,
  removeFromSpace,
} from "./spacesRemote";

export interface Invite {
  code: string;
  /** epoch ms */
  expiresAt: number;
}

export type JoinResult =
  /** Ya es miembro: la lista quedó en el teléfono. */
  | { status: "joined"; listId: string }
  /** Hay personas sin app: preguntar "¿Quién eres?" y llamar a `completeJoin`. */
  | { status: "choose"; spaceId: string; guests: ListMember[] };

function requireUser(): User {
  ensureFirebase();
  const user = getAuth().currentUser;
  if (!user) throw new SpaceError("signed-out");
  return user;
}

function toSpaceError(e: unknown): SpaceError {
  return e instanceof SpaceError ? e : new SpaceError(classifySpaceError(e), e);
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await runExclusive(fn);
  } catch (e) {
    const err = toSpaceError(e);
    if (err.kind === "unknown") console.warn("[spaces] Error:", e);
    throw err;
  }
}

const isDenied = (e: unknown) => classifySpaceError(e) === "not-allowed";

function findList(listId: string): WalletList {
  const list = withLiveActiveList(useSettingsStore.getState()).find((l) => l.id === listId);
  if (!list) throw new SpaceError("unknown");
  return list;
}

// ─── Invitar ─────────────────────────────────────────────────────────────────

async function newInvite(spaceId: string, uid: string): Promise<Invite> {
  // Un código repetido lo rechazan las reglas (no se pisa): se prueba con otro.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = inviteCodeFromBytes(getRandomBytes(6));
    const expiresAt = Date.now() + INVITE_TTL_MS;
    try {
      await withTimeout(createInviteDoc(code, spaceId, uid, expiresAt));
      return { code, expiresAt };
    } catch (e) {
      if (!isDenied(e) || attempt === 4) throw e;
    }
  }
  throw new SpaceError("unknown");
}

/** Código nuevo para invitar a alguien a una lista ya compartida (cualquier miembro). */
export async function createInvite(listId: string): Promise<Invite> {
  const user = requireUser();
  return guarded(async () => {
    const link = findList(listId).space;
    if (!link) throw new SpaceError("unknown");
    return newInvite(link.spaceId, user.uid);
  });
}

// ─── Compartir ───────────────────────────────────────────────────────────────

/**
 * Convierte la lista en espacio (D3) y devuelve el primer código. Si ya lo era, solo un código.
 * Sus movimientos se suben al espacio en segundo plano y dejan el respaldo personal (RF-16).
 */
export async function shareList(listId: string): Promise<Invite> {
  const user = requireUser();
  if (listId === DEFAULT_LIST_ID) throw new SpaceError("unknown");
  const invite = await guarded(async () => {
    const list = findList(listId);
    if (list.space) return newInvite(list.space.spaceId, user.uid);

    const now = Date.now();
    const guests = (list.members ?? []).filter((m) => m.status !== "left");
    const params = {
      uid: user.uid,
      ownerName: firstName(user.displayName),
      guests,
      config: {
        name: list.name,
        emoji: list.emoji,
        categories: list.categories ?? [],
        showIncome: list.showIncome ?? true,
        updatedAt: now,
      },
      now,
    };
    // El id del espacio es el de la lista; si ya existe uno así (ids viejos, o una lista que fue
    // de un espacio ajeno), las reglas lo rechazan y se usa uno nuevo.
    let spaceId = listId;
    try {
      await withTimeout(createSpace({ ...params, spaceId }));
    } catch (e) {
      if (!isDenied(e)) throw e;
      spaceId = newId();
      await withTimeout(createSpace({ ...params, spaceId }));
    }

    useSettingsStore.getState().linkSpace(
      listId,
      { spaceId, ownerUid: user.uid, selfMemberId: user.uid, sharedUpdatedAt: now },
      guests.map((g) => ({ id: g.id, name: g.name, uid: null, status: "guest" as const })),
    );
    const meta = forgetSpace(await loadMeta(), spaceId);
    await saveMeta({ ...meta, pushedSpaces: { ...meta.pushedSpaces, [spaceId]: now } });
    await markListTransactionsPending(listId);
    // Sin conexión a mitad: quedan copias viejas en el respaldo personal, inofensivas (mismo uid).
    await withTimeout(deleteUserListTransactions(user.uid, listId)).catch(() => undefined);
    return newInvite(spaceId, user.uid);
  });
  void requestSync({ pull: false });
  return invite;
}

// ─── Unirse ──────────────────────────────────────────────────────────────────

/**
 * Deja en el teléfono la lista del espacio (o liga la que ya estaba) con lo compartido, las
 * personas y mi id de miembro. Período y presupuestos arrancan como en una lista nueva.
 */
async function linkLocal(spaceId: string, selfMemberId: string): Promise<string> {
  const existing = useSettingsStore.getState().lists.find((l) => l.space?.spaceId === spaceId);
  if (existing) return existing.id;

  const space = await withTimeout(getSpace(spaceId));
  const config = await withTimeout(getConfig(spaceId));
  const members = await withTimeout(getMembers(spaceId));
  if (!space || !config) throw new SpaceError("invalid-code");
  const link = {
    spaceId,
    ownerUid: space.ownerUid,
    selfMemberId,
    sharedUpdatedAt: config.updatedAt,
  };
  const local = membersToLocal(members, selfMemberId);
  const now = Date.now();

  // Una copia desconectada de este mismo espacio (salí y vuelvo): se vuelve a ligar.
  const copy = useSettingsStore.getState().lists.find((l) => l.id === spaceId);
  applyRemoteSettings({
    spaces: copy
      ? []
      : [
          {
            kind: "create",
            list: {
              id: spaceId,
              name: config.name,
              emoji: config.emoji,
              period: { type: "all" },
              categories: config.categories,
              budgets: {},
              showIncome: config.showIncome,
              members: local,
              updatedAt: now,
              space: link,
            },
          },
        ],
  });
  if (copy) {
    // Sus movimientos se respaldaron en la cuenta al salir: vuelven a vivir solo en el espacio.
    // No se marcan pendientes: subirlos pisaría con copias viejas lo que otros editaron después.
    const uid = getAuth().currentUser?.uid;
    if (uid) await withTimeout(deleteUserListTransactions(uid, copy.id)).catch(() => undefined);
    useSettingsStore.getState().linkSpace(copy.id, link, local);
    applyRemoteSettings({
      spaces: [
        {
          kind: "config",
          listId: copy.id,
          name: config.name,
          emoji: config.emoji,
          categories: config.categories,
          showIncome: config.showIncome,
          sharedUpdatedAt: config.updatedAt,
        },
      ],
    });
  }
  const meta = forgetSpace(await loadMeta(), spaceId);
  await saveMeta({ ...meta, pushedSpaces: { ...meta.pushedSpaces, [spaceId]: config.updatedAt } });
  return spaceId;
}

/**
 * Paso 1 de unirse (D4): valida el código y me agrega al espacio. Si hay personas sin app,
 * devuelve "choose" para preguntar "¿Quién eres?"; si no, termina.
 */
export async function joinWithCode(input: string): Promise<JoinResult> {
  const user = requireUser();
  const code = normalizeInviteCode(input);
  if (!code) throw new SpaceError("invalid-code");
  const result = await guarded<JoinResult>(async () => {
    const invite = await withTimeout(getInvite(code));
    if (!invite || invite.expiresAt <= Date.now()) throw new SpaceError("invalid-code");
    const { spaceId } = invite;

    // ¿Ya soy miembro? (unirse dos veces, o una unión a medias). Si no, las reglas niegan leerlo.
    const space = await withTimeout(getSpace(spaceId)).catch((e) => {
      if (isDenied(e)) return null;
      throw e;
    });
    if (space?.deletedAt != null) throw new SpaceError("invalid-code");
    if (!space?.memberUids.includes(user.uid)) {
      await withTimeout(addSelfToSpace(spaceId, user.uid, code)).catch((e) => {
        throw isDenied(e) ? new SpaceError("invalid-code", e) : e;
      });
    }

    const members = await withTimeout(getMembers(spaceId));
    const mine = members.find((m) => m.data.uid === user.uid && m.data.leftAt == null);
    if (mine) return { status: "joined", listId: await linkLocal(spaceId, mine.id) };
    // Salí (o me quitaron) y vuelvo: soy el mismo miembro de antes, no uno nuevo; si no, lo que
    // pagué quedaría a nombre de "alguien que salió" y las cuentas no cuadrarían.
    const former = members.find((m) => m.data.uid === user.uid);
    if (former) {
      await withTimeout(rejoinMember(spaceId, former.id, Date.now()));
      return { status: "joined", listId: await linkLocal(spaceId, former.id) };
    }
    const guests = claimableGuests(members);
    if (guests.length > 0) return { status: "choose", spaceId, guests };
    await withTimeout(createSelfMember(spaceId, user.uid, firstName(user.displayName), Date.now()));
    return { status: "joined", listId: await linkLocal(spaceId, user.uid) };
  });
  if (result.status === "joined") void syncNow();
  return result;
}

/**
 * Paso 2 de unirse: `guestId` = "soy esa persona" (RF-06), null = "soy otra persona". Devuelve el
 * id de la lista. Si otro ya se ligó a esa persona, lanza "taken".
 */
export async function completeJoin(spaceId: string, guestId: string | null): Promise<string> {
  const user = requireUser();
  const listId = await guarded(async () => {
    const now = Date.now();
    if (guestId) {
      await withTimeout(claimMember(spaceId, guestId, user.uid, now)).catch((e) => {
        throw isDenied(e) ? new SpaceError("taken", e) : e;
      });
      return linkLocal(spaceId, guestId);
    }
    await withTimeout(createSelfMember(spaceId, user.uid, firstName(user.displayName), now));
    return linkLocal(spaceId, user.uid);
  });
  void syncNow();
  return listId;
}

// ─── Salir, quitar, eliminar ─────────────────────────────────────────────────

/** La lista queda como propia en el teléfono (D8). */
async function unlinkHere(listId: string, spaceId: string): Promise<void> {
  applyRemoteSettings({ spaces: [{ kind: "unlink", listId, now: Date.now() }] });
  await saveMeta(forgetSpace(await loadMeta(), spaceId));
  await markListTransactionsPending(listId);
  await useFinanceStore.getState().loadTransactions();
}

/** Salir de un espacio (no dueño, RF-19). La lista queda como propia. */
export async function leaveSpace(listId: string): Promise<void> {
  const user = requireUser();
  await guarded(async () => {
    const link = findList(listId).space;
    if (!link) return;
    if (link.ownerUid === user.uid) throw new SpaceError("not-allowed");
    await withTimeout(removeFromSpace(link.spaceId, link.selfMemberId, user.uid, Date.now())).catch(
      (e) => {
        // Ya me habían quitado: igual queda como propia.
        if (!isDenied(e)) throw e;
      },
    );
    await unlinkHere(listId, link.spaceId);
  });
  void requestSync({ pull: false });
}

/** Quitar a alguien que se unió (solo el dueño, RF-18). Lo que pagó sigue contando. */
export async function removeMember(listId: string, memberId: string): Promise<void> {
  const user = requireUser();
  await guarded(async () => {
    const list = findList(listId);
    const link = list.space;
    const member = list.members?.find((m) => m.id === memberId);
    if (!link || link.ownerUid !== user.uid) throw new SpaceError("not-allowed");
    if (!member?.uid) return;
    await withTimeout(removeFromSpace(link.spaceId, memberId, member.uid, Date.now()));
    const members = (list.members ?? []).map((m) =>
      m.id === memberId ? { ...m, status: "left" as const } : m,
    );
    applyRemoteSettings({ spaces: [{ kind: "members", listId, members }] });
  });
}

/**
 * Eliminar el espacio para todos (solo el dueño, RF-21): primero en la nube, después la lista y
 * sus movimientos en este teléfono (como cualquier "Eliminar lista").
 */
export async function deleteSpace(listId: string): Promise<void> {
  const user = requireUser();
  await guarded(async () => {
    const link = findList(listId).space;
    if (!link) return;
    if (link.ownerUid !== user.uid) throw new SpaceError("not-allowed");
    await withTimeout(deleteSpaceData(link.spaceId, user.uid, Date.now()));
    await saveMeta(forgetSpace(await loadMeta(), link.spaceId));
  });
  await useFinanceStore.getState().deleteList(listId);
}
