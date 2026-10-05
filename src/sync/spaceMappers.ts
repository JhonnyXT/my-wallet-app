/**
 * Conversión local ↔ documentos de un espacio compartido (Sync Fase 4, spec D1/D2). Puras y sin
 * imports de Firebase: el `serverUpdatedAt` lo agrega quien escribe.
 *
 * Quién pagó: en la nube `paid_by` es el id de miembro del espacio; en el teléfono, uno mismo es
 * `SELF_PAYER` (`""`) como en cualquier lista. `selfMemberId` es el puente (mi uid, o el id de la
 * persona sin app que reclamé), así reclamar "soy Ana" no obliga a reescribir movimientos.
 */
import type { TransactionRow } from "@/src/db/db";
import type { UserCategory } from "@/src/constants/categoryPresets";
import type { ListMember } from "@/src/store/slices/listsSlice";
import type { RemoteTransaction, VersionedDoc } from "./mappers";

/** `SELF_PAYER` de `db.ts`, repetido para no arrastrar expo-sqlite a los tests. */
const SELF = "";

// ─── Código de invitación ────────────────────────────────────────────────────

/** Sin 0/O ni 1/I, que se confunden al dictarlos. 32 símbolos: un byte % 32 no tiene sesgo. */
export const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_LENGTH = 6;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Código a partir de bytes aleatorios (los da `expo-crypto` en la app). */
export function inviteCodeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < INVITE_LENGTH) throw new Error("Faltan bytes para el código");
  let code = "";
  for (let i = 0; i < INVITE_LENGTH; i++) code += INVITE_ALPHABET[bytes[i] % 32];
  return code;
}

/**
 * Lo que la persona escribió → código, o null si no puede ser uno. Acepta minúsculas, espacios y
 * guiones. No se corrige 0/O ni 1/I: el alfabeto no tiene ninguno, solo se valida.
 */
export function normalizeInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== INVITE_LENGTH) return null;
  for (const ch of code) if (!INVITE_ALPHABET.includes(ch)) return null;
  return code;
}

/** "K7Q2MX" → "K7Q 2MX", para mostrarlo y dictarlo. */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

// ─── Quién pagó ──────────────────────────────────────────────────────────────

export function paidByToRemote(paidBy: string, selfMemberId: string): string {
  return paidBy === SELF ? selfMemberId : paidBy;
}

export function paidByToLocal(paidBy: string, selfMemberId: string): string {
  return paidBy === selfMemberId ? SELF : paidBy;
}

// ─── Movimientos ─────────────────────────────────────────────────────────────

/** Movimiento en `spaces/{id}/transactions/{uid}`: sin `list_id` (la lista es el espacio). */
export interface SpaceTransactionDoc extends VersionedDoc {
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
  tags: string;
  payment_method: string;
  paid_by: string;
}

export function transactionToSpaceDoc(
  row: TransactionRow,
  selfMemberId: string,
): SpaceTransactionDoc {
  return {
    amount: row.amount,
    description: row.description,
    category_emoji: row.category_emoji,
    date: row.date,
    tags: row.tags,
    payment_method: row.payment_method,
    paid_by: paidByToRemote(row.paid_by, selfMemberId),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function spaceDocToTransaction(
  uid: string,
  doc: SpaceTransactionDoc,
  listId: string,
  selfMemberId: string,
): RemoteTransaction {
  return {
    uid,
    amount: doc.amount,
    description: doc.description,
    category_emoji: doc.category_emoji,
    date: doc.date,
    tags: doc.tags ?? "",
    payment_method: doc.payment_method,
    list_id: listId,
    paid_by: paidByToLocal(doc.paid_by ?? "", selfMemberId),
    updated_at: doc.updatedAt,
    deleted_at: doc.deletedAt ?? null,
  };
}

// ─── Miembros ────────────────────────────────────────────────────────────────

/** Persona en `spaces/{id}/members/{memberId}`; `uid` null = sin app. */
export interface SpaceMemberDoc {
  name: string;
  uid: string | null;
  joinedAt?: number | null;
  /** Salió o la quitaron: sigue aquí para que lo que pagó cuente en las cuentas. */
  leftAt?: number | null;
  updatedAt: number;
}

export function memberStatus(doc: SpaceMemberDoc): NonNullable<ListMember["status"]> {
  if (doc.leftAt != null) return "left";
  return doc.uid ? "joined" : "guest";
}

/**
 * Miembros del espacio → `members` de la lista local: todos menos uno mismo (que es "Tú"),
 * incluidos los que salieron. Ordenados: los que están (se unieron, luego sin app) y al final los
 * que salieron; dentro de cada grupo, por nombre.
 */
export function membersToLocal(
  docs: { id: string; data: SpaceMemberDoc }[],
  selfMemberId: string,
): ListMember[] {
  const rank = { joined: 0, guest: 1, left: 2 };
  return docs
    .filter((d) => d.id !== selfMemberId)
    .map((d) => ({
      id: d.id,
      name: d.data.name,
      uid: d.data.uid ?? null,
      status: memberStatus(d.data),
    }))
    .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, "es"));
}

/** Persona sin app agregada en el editor → su documento. */
export function guestToDoc(member: ListMember, now: number): SpaceMemberDoc {
  return { name: member.name, uid: null, leftAt: null, updatedAt: now };
}

/** Personas sin app que se pueden reclamar al unirse ("¿Quién eres?"). */
export function claimableGuests(docs: { id: string; data: SpaceMemberDoc }[]): ListMember[] {
  return docs
    .filter((d) => !d.data.uid && d.data.leftAt == null)
    .map((d) => ({ id: d.id, name: d.data.name, uid: null, status: "guest" as const }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Nombre con el que aparece quien se une: el de pila de su cuenta de Google. */
export function firstName(displayName: string | null | undefined): string {
  const name = (displayName ?? "").trim().split(/\s+/)[0];
  return name || "Sin nombre";
}

// ─── Lo compartido de la lista ───────────────────────────────────────────────

/** `spaces/{id}/config/list`: lo que define la lista (RF-13). Período y presupuestos no. */
export interface SpaceConfigDoc {
  name: string;
  emoji: string;
  categories: UserCategory[];
  showIncome: boolean;
  updatedAt: number;
}
