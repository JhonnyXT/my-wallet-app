/**
 * Acceso a Firestore de los espacios compartidos (Sync Fase 4, spec D1/D3/D4/D7). Solo lecturas y
 * escrituras: qué hacer con ellas lo deciden `spaces.ts` (motor) y `spaceActions.ts` (acciones).
 * Lo que se permite lo deciden las reglas (`firestore.rules`, D9).
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "@react-native-firebase/firestore";
import type { ListMember } from "@/src/store/slices/listsSlice";
import type { RemoteDoc } from "./mappers";
import { BATCH_SIZE, db, millis, pullPaged } from "./remote";
import type {
  SpaceConfigDoc,
  SpaceMemberDoc,
  SpaceTransactionDocOrTombstone,
} from "./spaceMappers";

export interface SpaceDoc {
  ownerUid: string;
  memberUids: string[];
  deletedAt: number | null;
}

function toSpace(data: DocumentData): SpaceDoc {
  return {
    ownerUid: String(data.ownerUid ?? ""),
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    deletedAt: typeof data.deletedAt === "number" ? data.deletedAt : null,
  };
}

const spaceRef = (spaceId: string) => doc(db(), "spaces", spaceId);
const membersRef = (spaceId: string) => collection(db(), "spaces", spaceId, "members");
const configRef = (spaceId: string) => doc(db(), "spaces", spaceId, "config", "list");
const txRef = (spaceId: string) => collection(db(), "spaces", spaceId, "transactions");

// ─── Crear y descubrir ───────────────────────────────────────────────────────

/**
 * Crea el espacio con su dueño, las personas sin app y lo compartido, en un solo lote atómico
 * (D3). Falla con permission-denied si ya existe un espacio con ese id.
 */
export async function createSpace(p: {
  spaceId: string;
  uid: string;
  ownerName: string;
  guests: ListMember[];
  config: SpaceConfigDoc;
  now: number;
}): Promise<void> {
  const firestore = db();
  const batch = writeBatch(firestore);
  const stamp = { serverUpdatedAt: serverTimestamp() };
  batch.set(spaceRef(p.spaceId), {
    ownerUid: p.uid,
    memberUids: [p.uid],
    deletedAt: null,
    createdAt: p.now,
    ...stamp,
  });
  batch.set(doc(membersRef(p.spaceId), p.uid), {
    name: p.ownerName,
    uid: p.uid,
    joinedAt: p.now,
    leftAt: null,
    updatedAt: p.now,
    ...stamp,
  });
  for (const g of p.guests) {
    batch.set(doc(membersRef(p.spaceId), g.id), {
      name: g.name,
      uid: null,
      leftAt: null,
      updatedAt: p.now,
      ...stamp,
    });
  }
  batch.set(configRef(p.spaceId), { ...p.config, ...stamp });
  await batch.commit();
}

/** Espacios donde soy miembro, eliminados incluidos (`deletedAt`): así se entera el teléfono. */
export async function discoverSpaces(uid: string): Promise<(SpaceDoc & { id: string })[]> {
  const snap = await getDocsFromServer(
    query(collection(db(), "spaces"), where("memberUids", "array-contains", uid)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...toSpace(d.data()) }));
}

/** El espacio, si soy miembro (si no, las reglas lo niegan: permission-denied). */
export async function getSpace(spaceId: string): Promise<SpaceDoc | null> {
  const snap = await getDocFromServer(spaceRef(spaceId));
  return snap.exists() ? toSpace(snap.data()) : null;
}

// ─── Códigos de invitación ───────────────────────────────────────────────────

/** Crea el código; falla con permission-denied si ya existe (las reglas no dejan pisarlo). */
export async function createInviteDoc(
  code: string,
  spaceId: string,
  uid: string,
  expiresAt: number,
): Promise<void> {
  await setDoc(doc(db(), "inviteCodes", code), {
    spaceId,
    createdBy: uid,
    expiresAt: Timestamp.fromMillis(expiresAt),
  });
}

export async function getInvite(
  code: string,
): Promise<{ spaceId: string; expiresAt: number } | null> {
  const snap = await getDocFromServer(doc(db(), "inviteCodes", code));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { spaceId: String(data.spaceId ?? ""), expiresAt: millis(data.expiresAt) };
}

// ─── Unirse, salir, quitar ───────────────────────────────────────────────────

/** Me agrego al espacio con el código (la regla lo valida, D9). */
export async function addSelfToSpace(spaceId: string, uid: string, code: string): Promise<void> {
  await updateDoc(spaceRef(spaceId), {
    memberUids: arrayUnion(uid),
    joinCode: code,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function getMembers(spaceId: string): Promise<{ id: string; data: SpaceMemberDoc }[]> {
  const snap = await getDocsFromServer(membersRef(spaceId));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as SpaceMemberDoc }));
}

/** "Otra persona": mi propio miembro, con mi uid como id. */
export async function createSelfMember(
  spaceId: string,
  uid: string,
  name: string,
  now: number,
): Promise<void> {
  await setDoc(doc(membersRef(spaceId), uid), {
    name,
    uid,
    joinedAt: now,
    leftAt: null,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });
}

/** "Soy Ana": me ligo a una persona sin app (falla si otra ya se ligó, D4 paso 5). */
export async function claimMember(
  spaceId: string,
  memberId: string,
  uid: string,
  now: number,
): Promise<void> {
  await updateDoc(doc(membersRef(spaceId), memberId), {
    uid,
    joinedAt: now,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });
}

/** Volver a un espacio del que salí: el mismo miembro de antes, así lo que pagué sigue siendo mío. */
export async function rejoinMember(spaceId: string, memberId: string, now: number): Promise<void> {
  await updateDoc(doc(membersRef(spaceId), memberId), {
    leftAt: null,
    joinedAt: now,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });
}

/** Marca a alguien como salido (`leftAt`) y lo saca de `memberUids`, en un lote (salir o quitar). */
export async function removeFromSpace(
  spaceId: string,
  memberId: string,
  memberUid: string,
  now: number,
): Promise<void> {
  const batch = writeBatch(db());
  batch.update(doc(membersRef(spaceId), memberId), {
    leftAt: now,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });
  batch.update(spaceRef(spaceId), {
    memberUids: arrayRemove(memberUid),
    serverUpdatedAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── Eliminar ────────────────────────────────────────────────────────────────

async function deleteAll(ref: ReturnType<typeof collection>): Promise<void> {
  for (;;) {
    const snap = await getDocsFromServer(query(ref, limit(BATCH_SIZE)));
    if (snap.empty) return;
    const batch = writeBatch(db());
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}

/**
 * Elimina el espacio (dueño, D7): primero lo marca (los demás se enteran aunque el borrado se
 * corte), luego borra todo por lotes, mis códigos y el documento. Idempotente: se puede repetir.
 */
export async function deleteSpaceData(spaceId: string, uid: string, now: number): Promise<void> {
  const space = await getSpace(spaceId).catch(() => null);
  if (space && space.deletedAt == null) {
    await updateDoc(spaceRef(spaceId), { deletedAt: now, serverUpdatedAt: serverTimestamp() });
  }
  await deleteAll(txRef(spaceId));
  await deleteAll(membersRef(spaceId));
  await deleteAll(collection(db(), "spaces", spaceId, "config"));
  const codes = await getDocsFromServer(
    query(
      collection(db(), "inviteCodes"),
      where("createdBy", "==", uid),
      where("spaceId", "==", spaceId),
    ),
  );
  for (const d of codes.docs) await deleteDoc(d.ref);
  if (space) await deleteDoc(spaceRef(spaceId));
}

// ─── Lo compartido y los movimientos ─────────────────────────────────────────

export async function getConfig(
  spaceId: string,
): Promise<(SpaceConfigDoc & { serverUpdatedAt: number }) | undefined> {
  const snap = await getDocFromServer(configRef(spaceId));
  if (!snap.exists()) return undefined;
  const data = snap.data() as SpaceConfigDoc & { serverUpdatedAt: unknown };
  return { ...data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function pushConfig(spaceId: string, config: SpaceConfigDoc): Promise<void> {
  await setDoc(configRef(spaceId), { ...config, serverUpdatedAt: serverTimestamp() });
}

/**
 * Persona sin app agregada, renombrada o quitada (`leftAt`). Sin tocar `uid`: si otro ya se ligó
 * a ella, las reglas lo rechazan y quien llama lo ignora (la próxima traída corrige lo local).
 */
export async function pushGuest(
  spaceId: string,
  memberId: string,
  guest: { name: string; leftAt: number | null; updatedAt: number },
): Promise<void> {
  await setDoc(
    doc(membersRef(spaceId), memberId),
    { ...guest, serverUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function pullSpaceTransactions(
  spaceId: string,
  cursor: number,
): Promise<RemoteDoc<SpaceTransactionDocOrTombstone>[]> {
  return pullPaged<SpaceTransactionDocOrTombstone>(txRef(spaceId), cursor);
}

export async function pushSpaceTransactions(
  spaceId: string,
  ops: { id: string; data: SpaceTransactionDocOrTombstone }[],
): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db());
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(txRef(spaceId), op.id), { ...op.data, serverUpdatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

/**
 * Al compartir una lista, sus movimientos dejan el respaldo personal (RF-16): viven en el espacio.
 * Borrado físico, no tombstone (un tombstone más nuevo borraría el movimiento al restaurar).
 */
export async function deleteUserListTransactions(uid: string, listId: string): Promise<void> {
  const ref = collection(db(), "users", uid, "transactions");
  for (;;) {
    const snap = await getDocsFromServer(
      query(ref, where("list_id", "==", listId), limit(BATCH_SIZE)),
    );
    if (snap.empty) return;
    const batch = writeBatch(db());
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}
